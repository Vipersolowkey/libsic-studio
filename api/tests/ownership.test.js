process.env.SCRYPT_COST = '1024';
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const Cd = require('../src/models/Cd');
const { fakeSceneModel, fakeTrackModel, installFakeUserStore, installFakeRoomStore, installFakeCdStore } = require('./helpers');

const SECRET = 'a-test-secret-that-is-long-enough-1234';
const PASSWORD = 'a good password';
const tracks = ['rain-1', 'rain-2'].map((id) => ({ _id: id, title: `Song ${id}`, artist: 'Studio', src: `/audio/${id}.mp3`, duration: 120, license: 'CC0' }));
const officialCd = { code: 'studio01', title: 'Studio CD', trackIds: ['rain-1'], links: [] };

let users;
let rooms;
let cds;
let app;
beforeEach(() => {
  users = installFakeUserStore(User);
  rooms = installFakeRoomStore(Room);
  cds = installFakeCdStore(Cd, { official: [officialCd] });
  app = createApp({ User, Room, Cd, Track: fakeTrackModel(tracks), Scene: fakeSceneModel([{ slug: 'loft', name: 'Loft' }]) }, { jwtSecret: SECRET });
});
afterEach(() => {
  users.restore();
  rooms.restore();
  cds.restore();
});

// Makes an account and returns the headers that sign requests in as that person.
async function person(username) {
  const res = await request(app).post('/api/auth/register').send({ username, password: PASSWORD });
  expect(res.status).toBe(201);
  return { Authorization: `Bearer ${res.body.token}` };
}
const makeRoom = async (headers = {}, name = 'My room') => {
  const res = await request(app).post('/api/rooms').set(headers).send({ sceneSlug: 'loft', name });
  expect(res.status).toBe(201);
  return res.body;
};
const makeCd = async (headers = {}, title = 'My mix') => {
  const res = await request(app).post('/api/cds').set(headers).send({ title, trackIds: ['rain-1'] });
  expect(res.status).toBe(201);
  return res.body;
};

describe('rooms and the account that owns them', () => {
  it('belong to the account at once when saved while signed in, and still return an edit key', async () => {
    const tony = await person('tony');
    const { room, editKey } = await makeRoom(tony);
    expect(room.mine).toBe(true);
    expect(editKey).toHaveLength(32);
    expect(String(rooms.store.get(room.code).owner)).toBe(String(users.store.get('tony')._id));
  });

  it('stay guest rooms when saved without an account', async () => {
    const { room } = await makeRoom();
    expect(room.mine).toBe(false);
    expect(rooms.store.get(room.code).owner).toBeNull();
  });

  it('tell each caller whether the room is theirs, and never show an owner', async () => {
    const tony = await person('tony');
    const maya = await person('maya');
    const { room } = await makeRoom(tony);
    const read = async (headers) => (await request(app).get(`/api/rooms/${room.code}`).set(headers)).body;
    expect((await read(tony)).mine).toBe(true);
    expect((await read(maya)).mine).toBe(false);
    expect((await read({})).mine).toBe(false);
    expect(Object.keys(await read(tony))).not.toContain('owner');
  });

  it('can be changed and deleted by the owner without the edit key', async () => {
    const tony = await person('tony');
    const { room } = await makeRoom(tony);
    const put = await request(app).put(`/api/rooms/${room.code}`).set(tony).send({ name: 'Renamed' });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ name: 'Renamed', mine: true });
    expect((await request(app).delete(`/api/rooms/${room.code}`).set(tony)).status).toBe(204);
  });

  it('cannot be changed by another account without the key, and a wrong key is still refused', async () => {
    const tony = await person('tony');
    const maya = await person('maya');
    const { room } = await makeRoom(tony);
    expect((await request(app).put(`/api/rooms/${room.code}`).set(maya).send({ name: 'Mine now' })).status).toBe(401);
    expect((await request(app).put(`/api/rooms/${room.code}`).set(maya).set('x-edit-key', 'not-the-key').send({ name: 'Mine now' })).status).toBe(403);
    expect((await request(app).delete(`/api/rooms/${room.code}`).set(maya)).status).toBe(401);
    expect(rooms.store.get(room.code).name).toBe('My room');
  });

  it('can still be changed with the edit key, signed in or not', async () => {
    const maya = await person('maya');
    const { room, editKey } = await makeRoom();
    expect((await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ name: 'Guest edit' })).status).toBe(200);
    expect((await request(app).put(`/api/rooms/${room.code}`).set(maya).set('x-edit-key', editKey).send({ name: 'Signed-in edit' })).status).toBe(200);
  });

  it('ignores a token that is not good, as if the visitor were a guest', async () => {
    const { room } = await makeRoom(await person('tony'));
    const res = await request(app).put(`/api/rooms/${room.code}`).set({ Authorization: 'Bearer nonsense' }).send({ name: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('CDs and the account that owns them', () => {
  it('belong to the account when made signed in, and the owner can change them without the key', async () => {
    const tony = await person('tony');
    const maya = await person('maya');
    const { cd } = await makeCd(tony);
    expect(cd.mine).toBe(true);
    expect((await request(app).get(`/api/cds/${cd.code}`).set(maya)).body.mine).toBe(false);
    expect((await request(app).put(`/api/cds/${cd.code}`).set(tony).send({ title: 'Renamed' })).status).toBe(200);
    expect((await request(app).put(`/api/cds/${cd.code}`).set(maya).send({ title: 'Stolen' })).status).toBe(401);
    expect((await request(app).delete(`/api/cds/${cd.code}`).set(tony)).status).toBe(204);
  });

  it('keep official CDs locked for everybody', async () => {
    const tony = await person('tony');
    expect((await request(app).put('/api/cds/studio01').set(tony).send({ title: 'x' })).status).toBe(403);
    expect((await request(app).delete('/api/cds/studio01').set(tony)).status).toBe(403);
  });
});

describe('GET /api/me/rooms and /api/me/cds', () => {
  it('need a login', async () => {
    expect((await request(app).get('/api/me/rooms')).status).toBe(401);
    expect((await request(app).get('/api/me/cds')).status).toBe(401);
  });

  it('list only the caller\'s own, as short summaries', async () => {
    const tony = await person('tony');
    const maya = await person('maya');
    const first = (await makeRoom(tony, 'First')).room;
    await makeRoom(maya, 'Maya room');
    await makeRoom({}, 'Guest room');
    const res = await request(app).get('/api/me/rooms').set(tony);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual(['First']);
    expect(Object.keys(res.body[0]).sort()).toEqual(['code', 'name', 'sceneSlug', 'updatedAt']);
    expect(res.body[0].code).toBe(first.code);

    await makeCd(tony, 'Tony CD');
    await makeCd(maya, 'Maya CD');
    const cdList = await request(app).get('/api/me/cds').set(tony);
    expect(cdList.body.map((c) => c.title)).toEqual(['Tony CD']);
  });
});

describe('POST /api/me/claim', () => {
  it('needs a login', async () => {
    expect((await request(app).post('/api/me/claim').send({ rooms: [] })).status).toBe(401);
  });

  it('puts guest rooms and CDs on the account when the keys are right', async () => {
    const tony = await person('tony');
    const { room, editKey } = await makeRoom();
    const { cd, editKey: cdKey } = await makeCd();
    const res = await request(app).post('/api/me/claim').set(tony).send({ rooms: [{ code: room.code, editKey }], cds: [{ code: cd.code, editKey: cdKey }] });
    expect(res.status).toBe(200);
    expect(res.body.claimed).toEqual([{ type: 'room', code: room.code }, { type: 'cd', code: cd.code }]);
    expect(res.body.skipped).toEqual([]);
    expect((await request(app).get(`/api/rooms/${room.code}`).set(tony)).body.mine).toBe(true);
    expect((await request(app).put(`/api/rooms/${room.code}`).set(tony).send({ name: 'Now mine' })).status).toBe(200); // no key needed any more
  });

  it('skips, with a reason, whatever it cannot claim, and changes nothing for those', async () => {
    const tony = await person('tony');
    const maya = await person('maya');
    const taken = await makeRoom(maya);
    const guest = await makeRoom();
    const res = await request(app)
      .post('/api/me/claim')
      .set(tony)
      .send({
        rooms: [
          { code: guest.room.code, editKey: 'the wrong key' },
          { code: taken.room.code, editKey: taken.editKey },
          { code: 'nosuchroom', editKey: 'x' },
          { code: '../etc', editKey: 'x' },
          { code: guest.room.code },
        ],
        cds: [{ code: 'studio01', editKey: 'x' }],
      });
    expect(res.body.claimed).toEqual([]);
    expect(res.body.skipped.map((s) => s.reason)).toEqual(['wrong edit key', 'already on another account', 'not found', 'invalid entry', 'invalid entry', 'official CDs cannot be claimed']);
    expect(rooms.store.get(guest.room.code).owner).toBeNull();
    expect(String(rooms.store.get(taken.room.code).owner)).toBe(String(users.store.get('maya')._id));
  });

  it('is safe to repeat', async () => {
    const tony = await person('tony');
    const { room, editKey } = await makeRoom();
    const body = { rooms: [{ code: room.code, editKey }] };
    expect((await request(app).post('/api/me/claim').set(tony).send(body)).body.claimed).toHaveLength(1);
    expect((await request(app).post('/api/me/claim').set(tony).send(body)).body.claimed).toHaveLength(1);
  });

  it('refuses more than 50 at a time and bodies of the wrong shape', async () => {
    const tony = await person('tony');
    const many = Array.from({ length: 51 }, (_, i) => ({ code: `room${i}`, editKey: 'x' }));
    expect((await request(app).post('/api/me/claim').set(tony).send({ rooms: many })).status).toBe(400);
    expect((await request(app).post('/api/me/claim').set(tony).send([])).status).toBe(400);
    expect((await request(app).post('/api/me/claim').set(tony).send({ rooms: 'nope' })).status).toBe(200); // not a list: treated as empty
  });
});
