const request = require('supertest');
const { createApp } = require('../src/app');
const { signToken } = require('../src/utils/token');

const SECRET = 'a-test-secret-that-is-long-enough-1234';
const ADMIN_ID = 'a'.repeat(24);
const USER_ID = 'b'.repeat(24);
const bearer = (id) => ({ Authorization: `Bearer ${signToken(id, SECRET)}` });

// Small pretend models: just the calls the admin routes make.
const chain = (list) => {
  let rows = [...list];
  const q = {
    select: () => q,
    sort: () => q,
    skip: (n) => ((rows = rows.slice(n)), q),
    limit: (n) => ((rows = rows.slice(0, n)), q),
    lean: async () => rows,
  };
  return q;
};
const dateOf = (n) => new Date(Date.UTC(2026, 10, n));

let people;
let roomList;
let cdList;
let app;
beforeEach(() => {
  people = [
    { _id: ADMIN_ID, username: 'boss', role: 'admin', displayName: '', createdAt: dateOf(1), passwordHash: 'secret-hash' },
    { _id: USER_ID, username: 'maya', role: 'user', displayName: 'Maya', createdAt: dateOf(2), passwordHash: 'secret-hash' },
  ];
  roomList = [
    { code: 'aaaa1111', name: 'Cozy study', sceneSlug: 'night-study', owner: USER_ID, createdAt: dateOf(20), updatedAt: dateOf(21), editKeyHash: 'hidden' },
    { code: 'bbbb2222', name: 'Spam room', sceneSlug: 'golden-loft', owner: null, createdAt: dateOf(1), updatedAt: dateOf(2), editKeyHash: 'hidden' },
  ];
  cdList = [
    { code: 'cccc3333', title: 'Maya mix', official: false, owner: USER_ID, updatedAt: dateOf(5) },
    { code: 'studio01', title: 'Studio CD', official: true, owner: null, updatedAt: dateOf(5) },
  ];
  const User = {
    findById: (id) => ({ select: () => ({ lean: async () => people.find((p) => p._id === id) || null }) }),
    countDocuments: async () => people.length,
    find: (filter) => chain(filter?._id?.$in ? people.filter((p) => filter._id.$in.includes(p._id)) : people),
  };
  const Room = {
    countDocuments: async (filter = {}) => (filter.createdAt ? roomList.filter((r) => r.createdAt >= filter.createdAt.$gte).length : filter.$or ? roomList.filter((r) => filter.$or[0].name.test(r.name)).length : roomList.length),
    find: (filter = {}) => chain(filter.$or ? roomList.filter((r) => filter.$or[0].name.test(r.name)) : roomList),
    aggregate: async (pipeline) => (pipeline[0].$match ? [{ _id: USER_ID, rooms: 1 }] : [{ _id: 'night-study', rooms: 1 }, { _id: 'golden-loft', rooms: 1 }]),
    deleteOne: async ({ code }) => {
      const before = roomList.length;
      roomList = roomList.filter((r) => r.code !== code);
      return { deletedCount: before - roomList.length };
    },
  };
  const Cd = {
    countDocuments: async (filter) => cdList.filter((c) => c.official === filter.official).length,
    find: (filter) => chain(cdList.filter((c) => c.official === filter.official)),
    deleteOne: async ({ code, official }) => {
      const before = cdList.length;
      cdList = cdList.filter((c) => !(c.code === code && c.official === official));
      return { deletedCount: before - cdList.length };
    },
  };
  app = createApp({ User, Room, Cd, Scene: {} }, { jwtSecret: SECRET });
});

describe('admin addresses', () => {
  it('say 401 without a login and 403 to a normal account', async () => {
    for (const path of ['/api/admin/stats', '/api/admin/rooms', '/api/admin/cds', '/api/admin/users']) {
      expect((await request(app).get(path)).status).toBe(401);
      expect((await request(app).get(path).set(bearer(USER_ID))).status).toBe(403);
      expect((await request(app).get(path).set(bearer(ADMIN_ID))).status).toBe(200);
    }
    expect((await request(app).delete('/api/admin/rooms/bbbb2222').set(bearer(USER_ID))).status).toBe(403);
    expect(roomList).toHaveLength(2);
  });

  it('read the role from the database every time, so removing it works at once', async () => {
    const headers = bearer(ADMIN_ID);
    expect((await request(app).get('/api/admin/stats').set(headers)).status).toBe(200);
    people[0].role = 'user';
    expect((await request(app).get('/api/admin/stats').set(headers)).status).toBe(403);
  });

  it('refuse a token for an account that no longer exists', async () => {
    expect((await request(app).get('/api/admin/stats').set(bearer('c'.repeat(24)))).status).toBe(403);
  });

  it('show the totals', async () => {
    const res = await request(app).get('/api/admin/stats').set(bearer(ADMIN_ID));
    expect(res.body).toMatchObject({ accounts: 2, rooms: 2, customCds: 1, officialCds: 1 });
    expect(res.body.roomsPerScene).toEqual([{ sceneSlug: 'night-study', rooms: 1 }, { sceneSlug: 'golden-loft', rooms: 1 }]);
  });

  it('list rooms with the owner\'s username and search them as plain text', async () => {
    const res = await request(app).get('/api/admin/rooms').set(bearer(ADMIN_ID));
    expect(res.body.items).toEqual([
      { code: 'aaaa1111', name: 'Cozy study', sceneSlug: 'night-study', owner: 'maya', updatedAt: dateOf(21).toISOString() },
      { code: 'bbbb2222', name: 'Spam room', sceneSlug: 'golden-loft', owner: null, updatedAt: dateOf(2).toISOString() },
    ]);
    const found = await request(app).get('/api/admin/rooms?q=spam').set(bearer(ADMIN_ID));
    expect(found.body.items.map((r) => r.code)).toEqual(['bbbb2222']);
    expect((await request(app).get('/api/admin/rooms?q=(.*').set(bearer(ADMIN_ID))).status).toBe(200); // not taken as a pattern
  });

  it('delete a room, once, and refuse odd codes', async () => {
    const headers = bearer(ADMIN_ID);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect((await request(app).delete('/api/admin/rooms/bbbb2222').set(headers)).status).toBe(204);
    expect((await request(app).delete('/api/admin/rooms/bbbb2222').set(headers)).status).toBe(404);
    expect((await request(app).delete('/api/admin/rooms/..%2F..%2Fx').set(headers)).status).toBe(404);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('deleted room bbbb2222'));
    log.mockRestore();
  });

  it('list and delete custom CDs only, never the official ones', async () => {
    const headers = bearer(ADMIN_ID);
    const list = await request(app).get('/api/admin/cds').set(headers);
    expect(list.body.items.map((c) => c.code)).toEqual(['cccc3333']);
    expect((await request(app).delete('/api/admin/cds/studio01').set(headers)).status).toBe(404);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    expect((await request(app).delete('/api/admin/cds/cccc3333').set(headers)).status).toBe(204);
    console.log.mockRestore();
  });

  it('list accounts with their room counts and no password data at all', async () => {
    const res = await request(app).get('/api/admin/users').set(bearer(ADMIN_ID));
    expect(res.body.items).toEqual([
      { username: 'boss', displayName: '', role: 'admin', createdAt: dateOf(1).toISOString(), rooms: 0 },
      { username: 'maya', displayName: 'Maya', role: 'user', createdAt: dateOf(2).toISOString(), rooms: 1 },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/hash|secret/i);
  });
});
