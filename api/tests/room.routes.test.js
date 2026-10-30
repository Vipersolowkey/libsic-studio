const request = require('supertest');
const { createApp } = require('../src/app');
const Room = require('../src/models/Room');
const { hashEditKey } = require('../src/utils/editKey');
const { fakeSceneModel, installFakeRoomStore } = require('./helpers');

// Both scenes let a visitor place mugs on a desk; only the café also has a lamp that must stay unique.
const deskScene = (slug, name, extraEntries = []) => ({
  slug,
  name,
  surfaces: [{ key: 'desk', area: { x: 0, y: 60, width: 100, height: 40 } }],
  catalog: [
    { key: 'mug', surface: 'desk', flippable: true, unique: false, scale: { min: 0.5, max: 2 } },
    ...extraEntries,
  ],
});
const scenes = [
  deskScene('rainy-cafe', 'Rainy Café', [{ key: 'player', surface: 'desk', flippable: false, unique: true, scale: { min: 1, max: 1 } }]),
  deskScene('moon-base', 'Moon Base'),
  { slug: 'bare-room', name: 'Bare room' },
];
const mug = (overrides = {}) => ({ id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false, ...overrides });

let fake;
let app;

function setup(options) {
  fake = installFakeRoomStore(Room, options);
  app = createApp({ Scene: fakeSceneModel(scenes), Room });
}

beforeEach(() => setup());
afterEach(() => fake.restore());

// Creates a room through the API and returns { room, editKey }.
async function createRoom(body = { sceneSlug: 'rainy-cafe' }) {
  const res = await request(app).post('/api/rooms').send(body);
  expect(res.status).toBe(201);
  return res.body;
}

describe('POST /api/rooms', () => {
  it('creates a room and returns it with a share code and a secret edit key', async () => {
    const res = await request(app).post('/api/rooms').send({ name: 'Study time', sceneSlug: 'moon-base', settings: { effect: 'stars', volume: 0.4 } });

    expect(res.status).toBe(201);
    expect(res.body.room).toMatchObject({
      name: 'Study time',
      sceneSlug: 'moon-base',
      cdCode: null,
      settings: { effect: 'stars', lightOn: true, volume: 0.4 },
    });
    expect(res.body.room.code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);
    expect(res.body.editKey).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('fills in the defaults when only the scene is sent', async () => {
    const { room } = await createRoom();
    expect(room).toMatchObject({ name: 'Untitled room', cdCode: null, settings: { effect: 'none', lightOn: true, volume: 0.7 } });
  });

  it('stores only a hash of the edit key and never sends the hash back', async () => {
    const { room, editKey } = await createRoom();
    const stored = fake.store.get(room.code);

    expect(stored.editKeyHash).toBe(hashEditKey(editKey));
    expect(stored.editKeyHash).not.toBe(editKey);
    expect(JSON.stringify(room)).not.toContain('editKeyHash');
    expect(JSON.stringify(room)).not.toContain(stored.editKeyHash);
  });

  it('ignores a code or edit key hash sent by the visitor', async () => {
    const { room } = await createRoom({ sceneSlug: 'rainy-cafe', code: 'hacked', editKeyHash: 'mine' });
    expect(room.code).not.toBe('hacked');
    expect(fake.store.get(room.code).editKeyHash).not.toBe('mine');
  });

  it('tries a new code when the first one is already taken', async () => {
    fake.restore();
    setup({ duplicateFirst: 2 });
    const res = await request(app).post('/api/rooms').send({ sceneSlug: 'rainy-cafe' });
    expect(res.status).toBe(201);
  });

  it('answers 500 when no free code can be found', async () => {
    fake.restore();
    setup({ duplicateFirst: 99 });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).post('/api/rooms').send({ sceneSlug: 'rainy-cafe' });
    expect(res.status).toBe(500);
    console.error.mockRestore();
  });

  it.each([
    ['no scene', {}, 'sceneSlug'],
    ['an unknown scene', { sceneSlug: 'atlantis' }, 'sceneSlug'],
    ['an unknown effect', { sceneSlug: 'rainy-cafe', settings: { effect: 'tornado' } }, 'settings.effect'],
    ['a volume above 1', { sceneSlug: 'rainy-cafe', settings: { volume: 3 } }, 'settings.volume'],
    ['a volume that is not a number', { sceneSlug: 'rainy-cafe', settings: { volume: 'loud' } }, 'settings.volume'],
    ['a name that is too long', { sceneSlug: 'rainy-cafe', name: 'x'.repeat(61) }, 'name'],
  ])('answers 400 and names the field for %s', async (label, body, field) => {
    const res = await request(app).post('/api/rooms').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details[field]).toEqual(expect.any(String));
    expect(fake.store.size).toBe(0);
  });

  it('answers 400 when the body is not valid JSON', async () => {
    const res = await request(app).post('/api/rooms').set('Content-Type', 'application/json').send('{"sceneSlug": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'The request body is not valid JSON' });
  });
});

describe('room items', () => {
  const put = (code, editKey, body) => request(app).put(`/api/rooms/${code}`).set('x-edit-key', editKey).send(body);

  it('returns items: null for a room created without items', async () => {
    const { room } = await createRoom();
    expect(room.items).toBeNull();
  });

  it('stores valid items, returns them and ignores fields it does not know', async () => {
    const items = [mug(), mug({ id: 'mug2', x: 60, y: 90, scale: 1.5, flip: true })];
    const { room } = await createRoom({ sceneSlug: 'rainy-cafe', items: [{ ...items[0], evil: true }, items[1]] });

    expect(room.items).toEqual(items);
    expect((await request(app).get(`/api/rooms/${room.code}`)).body.items).toEqual(items);
  });

  it('answers 400 and names the item field for an unknown key', async () => {
    const res = await request(app).post('/api/rooms').send({ sceneSlug: 'rainy-cafe', items: [mug({ key: 'teapot' })] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details['items[0].key']).toMatch(/teapot/);
    expect(fake.store.size).toBe(0);
  });

  it('answers 400 for items that are not a list', async () => {
    const res = await request(app).post('/api/rooms').send({ sceneSlug: 'rainy-cafe', items: 'mug' });
    expect(res.status).toBe(400);
    expect(res.body.details.items).toEqual(expect.any(String));
  });

  it('refuses items for a scene without a catalog', async () => {
    const res = await request(app).post('/api/rooms').send({ sceneSlug: 'bare-room', items: [mug()] });
    expect(res.status).toBe(400);
  });

  it('reports only the unknown scene when both the scene and the items are wrong', async () => {
    const res = await request(app).post('/api/rooms').send({ sceneSlug: 'atlantis', items: [mug({ key: 'teapot' })] });
    expect(Object.keys(res.body.details)).toEqual(['sceneSlug']);
  });

  it('replaces the whole list on PUT and goes back to the default arrangement with null', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'rainy-cafe', items: [mug()] });

    const replaced = await put(room.code, editKey, { items: [mug({ id: 'b', x: 70 })] });
    expect(replaced.body.items).toEqual([mug({ id: 'b', x: 70 })]);

    const reset = await put(room.code, editKey, { items: null });
    expect(reset.status).toBe(200);
    expect(reset.body.items).toBeNull();
    expect((await request(app).get(`/api/rooms/${room.code}`)).body.items).toBeNull();
  });

  it('keeps the items when a PUT sends other fields only', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'rainy-cafe', items: [mug()] });
    const res = await put(room.code, editKey, { name: 'Renamed' });
    expect(res.body.items).toEqual([mug()]);
  });

  it('checks the items of a PUT against the scene the room already has', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'moon-base' });
    const res = await put(room.code, editKey, { items: [mug({ key: 'player', id: 'p' })] });
    expect(res.status).toBe(400);
    expect(res.body.details['items[0].key']).toBeDefined();
  });

  it('resets the items when a PUT moves the room to another scene without new items', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'rainy-cafe', items: [mug()] });
    const res = await put(room.code, editKey, { sceneSlug: 'moon-base' });
    expect(res.body).toMatchObject({ sceneSlug: 'moon-base', items: null });
  });

  it('keeps the items sent with a scene change when they fit the new scene', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'rainy-cafe' });
    const res = await put(room.code, editKey, { sceneSlug: 'moon-base', items: [mug({ id: 'm' })] });
    expect(res.body.items).toEqual([mug({ id: 'm' })]);
  });

  it('does not reset the items when a PUT names the scene the room already has', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'rainy-cafe', items: [mug()] });
    const res = await put(room.code, editKey, { sceneSlug: 'rainy-cafe', name: 'Same scene' });
    expect(res.body.items).toEqual([mug()]);
  });

  it('answers 400 for invalid items and leaves the stored room unchanged', async () => {
    const { room, editKey } = await createRoom({ sceneSlug: 'rainy-cafe', items: [mug()] });

    const res = await put(room.code, editKey, { name: 'Changed', items: [mug({ y: 5 })] });

    expect(res.status).toBe(400);
    expect(res.body.details['items[0].y']).toBeDefined();
    const stored = (await request(app).get(`/api/rooms/${room.code}`)).body;
    expect(stored).toMatchObject({ name: 'Untitled room', items: [mug()] });
  });
});

describe('GET /api/rooms/:code', () => {
  it('returns the saved room', async () => {
    const { room } = await createRoom({ name: 'Mine', sceneSlug: 'moon-base' });
    const res = await request(app).get(`/api/rooms/${room.code}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(room);
  });

  it('never includes the edit key or its hash', async () => {
    const { room, editKey } = await createRoom();
    const res = await request(app).get(`/api/rooms/${room.code}`);
    expect(res.text).not.toContain(editKey);
    expect(res.text).not.toContain('editKeyHash');
  });

  it('answers 404 for a code that does not exist', async () => {
    const res = await request(app).get('/api/rooms/nope1234');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Room not found' });
  });
});

describe('PUT /api/rooms/:code', () => {
  it('changes only the fields that are sent', async () => {
    const { room, editKey } = await createRoom({ name: 'Before', sceneSlug: 'rainy-cafe', settings: { effect: 'rain', volume: 0.2 } });

    const res = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ name: 'After', settings: { lightOn: false } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: room.code,
      name: 'After',
      sceneSlug: 'rainy-cafe',
      settings: { effect: 'rain', lightOn: false, volume: 0.2 },
    });
    expect((await request(app).get(`/api/rooms/${room.code}`)).body.name).toBe('After');
  });

  it('can move the room to another scene or CD', async () => {
    const { room, editKey } = await createRoom();
    const res = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ sceneSlug: 'moon-base', cdCode: 'chill01' });
    expect(res.body).toMatchObject({ sceneSlug: 'moon-base', cdCode: 'chill01' });
  });

  it('cannot change the code or the edit key', async () => {
    const { room, editKey } = await createRoom();
    const res = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ code: 'other', editKeyHash: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(room.code);
    expect(fake.store.get(room.code).editKeyHash).toBe(hashEditKey(editKey));
  });

  it('answers 401 when no edit key is sent', async () => {
    const { room } = await createRoom();
    const res = await request(app).put(`/api/rooms/${room.code}`).send({ name: 'Hacked' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/x-edit-key/);
    expect(fake.store.get(room.code).name).toBe('Untitled room');
  });

  it('answers 403 for a wrong edit key, including the key of another room', async () => {
    const first = await createRoom();
    const second = await createRoom();

    for (const key of ['wrong', second.editKey]) {
      const res = await request(app).put(`/api/rooms/${first.room.code}`).set('x-edit-key', key).send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    }
    expect(fake.store.get(first.room.code).name).toBe('Untitled room');
  });

  it('answers 404 for a room that does not exist', async () => {
    const res = await request(app).put('/api/rooms/nope1234').set('x-edit-key', 'anything').send({ name: 'x' });
    expect(res.status).toBe(404);
  });

  it('answers 400 for invalid changes and keeps the saved room as it was', async () => {
    const { room, editKey } = await createRoom();

    const badEffect = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ settings: { effect: 'tornado' } });
    const badScene = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ sceneSlug: 'atlantis' });

    expect(badEffect.status).toBe(400);
    expect(badScene.status).toBe(400);
    expect(badScene.body.details.sceneSlug).toEqual(expect.any(String));

    const noScene = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ sceneSlug: null });
    expect(noScene.status).toBe(400);
  });
});

describe('DELETE /api/rooms/:code', () => {
  it('deletes the room when the edit key is right', async () => {
    const { room, editKey } = await createRoom();
    const res = await request(app).delete(`/api/rooms/${room.code}`).set('x-edit-key', editKey);

    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/rooms/${room.code}`)).status).toBe(404);
  });

  it('answers 401 without a key and 403 with a wrong key, and keeps the room', async () => {
    const { room } = await createRoom();

    expect((await request(app).delete(`/api/rooms/${room.code}`)).status).toBe(401);
    expect((await request(app).delete(`/api/rooms/${room.code}`).set('x-edit-key', 'wrong')).status).toBe(403);
    expect((await request(app).get(`/api/rooms/${room.code}`)).status).toBe(200);
  });

  it('answers 404 for a room that does not exist', async () => {
    const res = await request(app).delete('/api/rooms/nope1234').set('x-edit-key', 'x');
    expect(res.status).toBe(404);
  });
});
