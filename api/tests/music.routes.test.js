const request = require('supertest');
const fs = require('fs');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { createApp } = require('../src/app');
const Track = require('../src/models/Track');
const Cd = require('../src/models/Cd');
const { tracks, cds } = require('../src/seed/tracks');
const { hashEditKey } = require('../src/utils/editKey');
const { installFakeRoomStore, validationErrors } = require('./helpers');

let fake, app;
let spec;
beforeAll(async () => { spec = await SwaggerParser.dereference(path.join(__dirname, '../openapi.yaml')); });
const query = (value) => ({ sort() { return this; }, lean: async () => value });
const trackModel = {
  find: (filter) => query(filter?._id ? tracks.filter((t) => filter._id.$in.includes(t._id)) : tracks),
  findById: (id) => query(tracks.find((t) => t._id === id) || null),
};
beforeEach(() => {
  fake = installFakeRoomStore(Cd);
  Cd.find = (filter) => query([...fake.store.values()].filter((cd) => cd.official === filter.official));
  cds.forEach((cd) => fake.store.set(cd.code, new Cd({ ...cd, createdAt: new Date(), updatedAt: new Date() })));
  app = createApp({ Track: trackModel, Cd });
});
afterEach(() => { fake.restore(); delete Cd.find; });
const input = { title: 'Vinh’s mix', trackIds: ['slow-tide', 'lamp-light'] };
const create = (data = input) => request(app).post('/api/cds').send(data);

it('has 12 valid original tracks and 3 valid official CDs with playable local assets', async () => {
  expect(tracks).toHaveLength(12);
  expect(cds).toHaveLength(3);
  expect(new Set(tracks.map((t) => t._id)).size).toBe(12);
  for (const track of tracks) {
    expect(await validationErrors(new Track(track))).toEqual({});
    expect(fs.statSync(path.join(__dirname, '../../client/public', track.src)).size).toBeGreaterThan(10000);
  }
  for (const cd of cds) {
    expect(await validationErrors(new Cd(cd))).toEqual({});
    expect(cd.trackIds.every((id) => tracks.some((t) => t._id === id))).toBe(true);
  }
});

it('lists and opens tracks using stable ids; unknown ids return 404', async () => {
  const list = await request(app).get('/api/tracks');
  expect(list.status).toBe(200);
  expect(list.body).toHaveLength(12);
  expect(list.body[0]).toMatchObject({ id: tracks[0]._id, license: 'CC0-1.0' });
  expect(list.body[0]).not.toHaveProperty('_id');
  expect((await request(app).get('/api/tracks/slow-tide')).body.title).toBe('Slow Tide');
  expect((await request(app).get('/api/tracks/nope')).status).toBe(404);
});

it('creates a custom CD, preserves playback order and never exposes hashes on reads', async () => {
  const res = await create({ ...input, official: true, code: 'hacked', editKeyHash: 'hacked' });
  expect(res.status).toBe(201);
  const { cd, editKey } = res.body;
  expect(cd).toMatchObject({ title: input.title, trackIds: input.trackIds, official: false });
  expect(cd.code).not.toBe('hacked');
  expect(cd.tracks.map((t) => t.id)).toEqual(input.trackIds);
  expect(fake.store.get(cd.code).editKeyHash).toBe(hashEditKey(editKey));
  const read = await request(app).get(`/api/cds/${cd.code}`);
  expect(read.status).toBe(200);
  expect(read.body).not.toHaveProperty('editKeyHash');
  expect(read.body).not.toHaveProperty('editKey');
  expect((await request(app).get('/api/cds')).body).toHaveLength(3);
});

it.each([
  {}, { title: '', trackIds: ['lamp-light'] }, { ...input, title: ' '.repeat(8) },
  { ...input, title: 'a'.repeat(61) }, { ...input, title: 42 },
  { ...input, trackIds: [] }, { ...input, trackIds: null },
  { ...input, trackIds: ['missing'] }, { ...input, trackIds: [null] },
  { ...input, trackIds: ['lamp-light', 'lamp-light'] },
  { ...input, trackIds: Array.from({ length: 31 }, (_, n) => `id-${n}`) },
])('rejects invalid CDs: %j', async (body) => {
  const res = await create(body);
  expect(res.status).toBe(400);
  expect(res.body.details).toBeDefined();
  expect(fake.store.size).toBe(3);
});

it('trims names and accepts a one-track CD', async () => {
  const res = await create({ title: '  Solo  ', trackIds: ['lamp-light'] });
  expect(res.status).toBe(201);
  expect(res.body.cd.title).toBe('Solo');
});

it('changes and deletes only with the matching edit key; invalid updates preserve the CD', async () => {
  const { cd, editKey } = (await create()).body;
  const url = `/api/cds/${cd.code}`;
  for (const method of ['put', 'delete']) {
    expect((await request(app)[method](url).send({ title: 'Stolen' })).status).toBe(401);
    expect((await request(app)[method](url).set('x-edit-key', 'wrong').send({ title: 'Stolen' })).status).toBe(403);
  }
  expect((await request(app).put(url).set('x-edit-key', editKey).send({ trackIds: ['nope'] })).status).toBe(400);
  expect((await request(app).get(url)).body.trackIds).toEqual(input.trackIds);
  const updated = await request(app).put(url).set('x-edit-key', editKey).send({ title: 'Changed', trackIds: ['lamp-light'], official: true, code: 'hacked' });
  expect(updated.status).toBe(200);
  expect(updated.body).toMatchObject({ title: 'Changed', trackIds: ['lamp-light'], official: false, code: cd.code });
  expect((await request(app).delete(url).set('x-edit-key', editKey)).status).toBe(204);
  expect((await request(app).get(url)).status).toBe(404);
});

it('protects official CDs and gives 404 for missing codes', async () => {
  for (const method of ['put', 'delete']) {
    expect((await request(app)[method]('/api/cds/night-study').set('x-edit-key', 'anything').send(input)).status).toBe(403);
    expect((await request(app)[method]('/api/cds/missing').set('x-edit-key', 'anything').send(input)).status).toBe(404);
  }
});

it('retries share-code collisions and stops after five attempts', async () => {
  fake.restore();
  fake = installFakeRoomStore(Cd, { duplicateFirst: 2 });
  expect((await create()).status).toBe(201);
  fake.restore();
  fake = installFakeRoomStore(Cd, { duplicateFirst: 5 });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect((await create()).status).toBe(500);
  log.mockRestore();
});

it('matches the documented schemas throughout the track and CD lifecycle', async () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  function documented(res, path, method) {
    const response = spec.paths[path][method].responses[String(res.status)];
    expect(response).toBeDefined();
    const schema = response.content?.['application/json']?.schema;
    if (schema) {
      const validate = ajv.compile(schema);
      if (!validate(res.body)) throw new Error(ajv.errorsText(validate.errors));
    }
  }
  documented(await request(app).get('/api/tracks'), '/api/tracks', 'get');
  documented(await request(app).get('/api/tracks/lamp-light'), '/api/tracks/{id}', 'get');
  documented(await request(app).get('/api/cds'), '/api/cds', 'get');
  const created = await create();
  documented(created, '/api/cds', 'post');
  const { cd, editKey } = created.body;
  const url = `/api/cds/${cd.code}`;
  documented(await request(app).get(url), '/api/cds/{code}', 'get');
  documented(await request(app).put(url).set('x-edit-key', editKey).send({ title: 'Docs' }), '/api/cds/{code}', 'put');
  documented(await request(app).delete(url).set('x-edit-key', editKey), '/api/cds/{code}', 'delete');
  documented(await create({ title: 'Empty', trackIds: [] }), '/api/cds', 'post');
});
