const request = require('supertest');
const { createApp } = require('../src/app');
const Cd = require('../src/models/Cd');
const { installFakeCdStore, fakeTrackModel } = require('./helpers');

const tracks = ['rain-1', 'rain-2', 'rain-3'].map((id) => ({ _id: id, title: `Song ${id}`, artist: 'Studio', src: `/audio/${id}.mp3`, duration: 120, license: 'CC0' }));
const officialCd = { code: 'studio01', title: 'Studio CD', trackIds: ['rain-1'], links: [] };
const SOUNDCLOUD = 'https://soundcloud.com/some-artist/some-track';

let fake;
let app;
beforeEach(() => {
  fake = installFakeCdStore(Cd, { official: [officialCd] });
  app = createApp({ Cd, Track: fakeTrackModel(tracks), Scene: {} });
});
afterEach(() => fake.restore());

async function createCd(body = { title: 'Rainy mix', trackIds: ['rain-1', 'rain-2'] }) {
  const res = await request(app).post('/api/cds').send(body);
  expect(res.status).toBe(201);
  return res.body;
}

describe('POST /api/cds', () => {
  it('saves a CD of our tracks and returns its share code, its tracks and the secret edit key once', async () => {
    const { cd, editKey } = await createCd();

    expect(cd.code).toMatch(/^[a-z2-9]{8}$/);
    expect(cd.title).toBe('Rainy mix');
    expect(cd.official).toBe(false);
    expect(cd.tracks.map((t) => t.id)).toEqual(['rain-1', 'rain-2']);
    expect(editKey).toHaveLength(32);
    expect(JSON.stringify(cd)).not.toContain(editKey);
    expect(fake.store.get(cd.code).editKeyHash).not.toBe(editKey); // only a hash is kept
  });

  it('saves a CD of online links in their canonical form, plus its look', async () => {
    const { cd } = await createCd({ title: 'Links', links: [`${SOUNDCLOUD}/`], look: { hue: 200, cover: 1, disc: 2, font: 3 } });

    expect(cd.links).toEqual([{ provider: 'soundcloud', url: SOUNDCLOUD }]);
    expect(cd.look).toEqual({ hue: 200, cover: 1, disc: 2, font: 3 });
    expect(cd.trackIds).toEqual([]);
  });

  it('cleans the title: invisible characters and extra spaces are removed', async () => {
    const { cd } = await createCd({ title: '  Late​   night\u0007  mix ', trackIds: ['rain-1'] });
    expect(cd.title).toBe('Late night mix');
  });

  it('ignores a code, the official flag or an edit key hash sent by the visitor', async () => {
    const { cd } = await createCd({ title: 'Sneaky', trackIds: ['rain-1'], code: 'mine', official: true, editKeyHash: 'abc' });
    expect(cd.code).not.toBe('mine');
    expect(cd.official).toBe(false);
  });

  it.each([
    ['no title', { trackIds: ['rain-1'] }, 'title'],
    ['a blank title', { title: '   ', trackIds: ['rain-1'] }, 'title'],
    ['a title over 60 characters', { title: 'x'.repeat(61), trackIds: ['rain-1'] }, 'title'],
    ['a title that is not text', { title: { a: 1 }, trackIds: ['rain-1'] }, 'title'],
    ['no tracks and no links', { title: 'Empty' }, 'trackIds'],
    ['an unknown track', { title: 'Odd', trackIds: ['nope'] }, 'trackIds'],
    ['the same track twice', { title: 'Twice', trackIds: ['rain-1', 'rain-1'] }, 'trackIds'],
    ['more than 30 tracks', { title: 'Long', trackIds: Array.from({ length: 31 }, (_, i) => `t${i}`) }, 'trackIds'],
    ['track ids that are not text', { title: 'Odd', trackIds: [1, 2] }, 'trackIds'],
    ['a link that is not a music link', { title: 'Bad', links: ['https://example.com/page'] }, 'links'],
    ['the same link twice', { title: 'Dupe', links: [SOUNDCLOUD, `${SOUNDCLOUD}/`] }, 'links'],
    ['more than 12 links', { title: 'Many', links: Array.from({ length: 13 }, (_, i) => `https://soundcloud.com/a/t${i}`) }, 'links'],
    ['tracks and links together', { title: 'Both', trackIds: ['rain-1'], links: [SOUNDCLOUD] }, 'links'],
    ['a look outside its range', { title: 'Look', trackIds: ['rain-1'], look: { hue: 400, cover: 0, disc: 0, font: 0 } }, 'look'],
    ['a look with a missing part', { title: 'Look', trackIds: ['rain-1'], look: { hue: 10 } }, 'look'],
  ])('answers 400 and names the field for %s', async (label, body, field) => {
    const res = await request(app).post('/api/cds').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details[field]).toEqual(expect.any(String));
    expect(fake.store.size).toBe(1); // only the official CD
  });

  it('answers 400 for a body that is not an object, and for broken JSON', async () => {
    expect((await request(app).post('/api/cds').send([1, 2])).status).toBe(400);
    const broken = await request(app).post('/api/cds').set('Content-Type', 'application/json').send('{"title":');
    expect(broken.status).toBe(400);
    expect(broken.body.error).toBe('The request body is not valid JSON');
  });

  it('tries another code when the first is taken, and answers 500 when none is free', async () => {
    const realSave = Cd.prototype.save;
    let failures = 2;
    Cd.prototype.save = async function save() {
      if (failures-- > 0) throw Object.assign(new Error('E11000'), { code: 11000 });
      return realSave.call(this);
    };
    expect((await request(app).post('/api/cds').send({ title: 'Retry', trackIds: ['rain-1'] })).status).toBe(201);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    failures = 99;
    expect((await request(app).post('/api/cds').send({ title: 'Never', trackIds: ['rain-1'] })).status).toBe(500);
    console.error.mockRestore();
  });

  it('stops accepting new CDs when the database is full, but still answers other requests', async () => {
    const small = createApp({ Cd, Track: fakeTrackModel(tracks), Scene: {} }, { maxCds: 1 });

    const res = await request(small).post('/api/cds').send({ title: 'One too many', trackIds: ['rain-1'] });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/full/i);
    expect((await request(small).get('/api/cds/studio01')).status).toBe(200);
  });
});

describe('GET /api/cds', () => {
  it('lists only the official CDs, never the custom ones', async () => {
    await createCd();
    const res = await request(app).get('/api/cds');

    expect(res.status).toBe(200);
    expect(res.body.map((cd) => cd.code)).toEqual(['studio01']);
  });

  it('opens any CD by its code, and answers 404 for an unknown code', async () => {
    const { cd } = await createCd();
    const found = await request(app).get(`/api/cds/${cd.code}`);

    expect(found.status).toBe(200);
    expect(found.body.title).toBe('Rainy mix');
    expect(JSON.stringify(found.body)).not.toMatch(/editKey/i);
    expect((await request(app).get('/api/cds/zzzzzzzz')).status).toBe(404);
  });
});

describe('PUT /api/cds/:code', () => {
  it('changes the title and keeps the rest when the edit key is right', async () => {
    const { cd, editKey } = await createCd();
    const res = await request(app).put(`/api/cds/${cd.code}`).set('x-edit-key', editKey).send({ title: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Renamed');
    expect(res.body.tracks.map((t) => t.id)).toEqual(['rain-1', 'rain-2']);
  });

  it('can swap our tracks for links (and the reverse) in one save', async () => {
    const { cd, editKey } = await createCd();
    const res = await request(app).put(`/api/cds/${cd.code}`).set('x-edit-key', editKey).send({ trackIds: [], links: [SOUNDCLOUD] });

    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(1);
    expect(res.body.trackIds).toEqual([]);
  });

  it('answers 401 without a key and 403 with a wrong key, and changes nothing', async () => {
    const { cd, editKey } = await createCd();
    const other = await createCd({ title: 'Other', trackIds: ['rain-3'] });

    expect((await request(app).put(`/api/cds/${cd.code}`).send({ title: 'X' })).status).toBe(401);
    expect((await request(app).put(`/api/cds/${cd.code}`).set('x-edit-key', 'wrong').send({ title: 'X' })).status).toBe(403);
    expect((await request(app).put(`/api/cds/${cd.code}`).set('x-edit-key', other.editKey).send({ title: 'X' })).status).toBe(403);
    expect((await request(app).get(`/api/cds/${cd.code}`)).body.title).toBe('Rainy mix');
    expect(editKey).not.toBe(other.editKey);
  });

  it('answers 400 for invalid changes and keeps the saved CD as it was', async () => {
    const { cd, editKey } = await createCd();
    const res = await request(app).put(`/api/cds/${cd.code}`).set('x-edit-key', editKey).send({ title: '', trackIds: ['rain-1'] });

    expect(res.status).toBe(400);
    expect((await request(app).get(`/api/cds/${cd.code}`)).body.title).toBe('Rainy mix');
  });

  it('answers 404 for an unknown CD', async () => {
    expect((await request(app).put('/api/cds/zzzzzzzz').set('x-edit-key', 'k').send({ title: 'X' })).status).toBe(404);
  });

  it('never lets an official CD be changed', async () => {
    const res = await request(app).put('/api/cds/studio01').set('x-edit-key', 'anything').send({ title: 'Hacked' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/official/i);
  });
});

describe('DELETE /api/cds/:code', () => {
  it('deletes the CD when the edit key is right', async () => {
    const { cd, editKey } = await createCd();
    expect((await request(app).delete(`/api/cds/${cd.code}`).set('x-edit-key', editKey)).status).toBe(204);
    expect((await request(app).get(`/api/cds/${cd.code}`)).status).toBe(404);
  });

  it('keeps the CD without the key or with a wrong key', async () => {
    const { cd } = await createCd();
    expect((await request(app).delete(`/api/cds/${cd.code}`)).status).toBe(401);
    expect((await request(app).delete(`/api/cds/${cd.code}`).set('x-edit-key', 'nope')).status).toBe(403);
    expect((await request(app).get(`/api/cds/${cd.code}`)).status).toBe(200);
  });

  it('never deletes an official CD, and answers 404 for an unknown one', async () => {
    expect((await request(app).delete('/api/cds/studio01').set('x-edit-key', 'k')).status).toBe(403);
    expect((await request(app).delete('/api/cds/zzzzzzzz').set('x-edit-key', 'k')).status).toBe(404);
    expect(fake.store.has('studio01')).toBe(true);
  });
});
