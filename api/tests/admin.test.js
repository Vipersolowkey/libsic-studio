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
let trackList;
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
  trackList = [
    { _id: 'rain', title: 'Rain', artist: 'Studio', src: '/audio/rain.mp3', duration: 120 },
    { _id: 'dusk', title: 'Dusk', artist: 'Studio', src: '/audio/dusk.mp3', duration: 90 },
  ];
  cdList = [
    { code: 'cccc3333', title: 'Maya mix', official: false, owner: USER_ID, updatedAt: dateOf(5) },
    { code: 'studio01', title: 'Studio CD', official: true, owner: null, trackIds: ['rain', 'dusk'], updatedAt: dateOf(5) },
    { code: 'dddd4444', title: 'Guest spam CD', official: false, owner: null, updatedAt: dateOf(6) },
  ];
  // Does one row match one clause of a filter ($or entries: a pattern on a field, or an $in list)?
  const hit = (row, clause) => Object.entries(clause).every(([field, want]) => (want && want.$in ? want.$in.includes(row[field]) : want instanceof RegExp ? want.test(row[field] ?? '') : row[field] === want));
  const pick = (list, filter) => (filter?.$or ? list.filter((row) => filter.$or.some((clause) => hit(row, clause))) : list);
  const User = {
    findById: (id) => ({ select: () => ({ lean: async () => people.find((p) => p._id === id) || null }) }),
    findOne: (filter) => ({ select: () => ({ lean: async () => people.find((p) => p.username === filter.username) || null }) }),
    deleteOne: async ({ _id, role }) => {
      const before = people.length;
      people = people.filter((p) => !(p._id === _id && p.role === role));
      return { deletedCount: before - people.length };
    },
    countDocuments: async (filter = {}) => (filter.createdAt ? people.filter((p) => p.createdAt >= filter.createdAt.$gte).length : pick(people, filter).length),
    find: (filter) => chain(filter?._id?.$in ? people.filter((p) => filter._id.$in.includes(p._id)) : filter?.username instanceof RegExp ? people.filter((p) => filter.username.test(p.username)) : pick(people, filter)),
  };
  const Room = {
    countDocuments: async (filter = {}) => (filter.createdAt ? roomList.filter((r) => r.createdAt >= filter.createdAt.$gte).length : pick(roomList, filter).length),
    find: (filter = {}) => chain(pick(roomList, filter)),
    aggregate: async (pipeline) => (pipeline[0].$match ? [{ _id: USER_ID, rooms: 1 }] : [{ _id: 'night-study', rooms: 1 }, { _id: 'golden-loft', rooms: 1 }]),
    findOne: ({ code }) => ({ select: () => ({ lean: async () => roomList.find((r) => r.code === code) || null }) }),
    deleteOne: async ({ code, owner }) => {
      const before = roomList.length;
      roomList = roomList.filter((r) => !(r.code === code && r.owner === owner));
      return { deletedCount: before - roomList.length };
    },
    deleteMany: async ({ owner }) => {
      const before = roomList.length;
      roomList = roomList.filter((r) => r.owner !== owner);
      return { deletedCount: before - roomList.length };
    },
  };
  const Cd = {
    countDocuments: async (filter) => (filter.trackIds ? cdList.filter((c) => (c.trackIds || []).includes(filter.trackIds)).length : cdList.filter((c) => c.official === filter.official).length),
    find: (filter) => chain(cdList.filter((c) => c.official === filter.official)),
    findOne: ({ code, official }) => {
      const found = cdList.find((c) => c.code === code && c.official === official) || null;
      return { select: () => ({ lean: async () => found }), lean: async () => found };
    },
    deleteOne: async ({ code, official, owner }) => {
      const before = cdList.length;
      cdList = cdList.filter((c) => !(c.code === code && c.official === official && (owner === undefined || c.owner === owner)));
      return { deletedCount: before - cdList.length };
    },
    deleteMany: async ({ owner }) => {
      const before = cdList.length;
      cdList = cdList.filter((c) => c.official || c.owner !== owner);
      return { deletedCount: before - cdList.length };
    },
    updateOne: async ({ code }, change) => {
      const cd = cdList.find((c) => c.code === code);
      if (change.$push) cd.trackIds = [...cd.trackIds, change.$push.trackIds];
      if (change.$pull) cd.trackIds = cd.trackIds.filter((id) => id !== change.$pull.trackIds);
    },
  };
  const Track = {
    find: (filter) => chain(trackList.filter((t) => filter._id.$in.includes(t._id))),
    create: async (doc) => {
      trackList.push(doc);
      return doc;
    },
    deleteOne: async ({ _id }) => {
      trackList = trackList.filter((t) => t._id !== _id);
    },
  };
  app = createApp({ User, Room, Cd, Track, Scene: {} }, { jwtSecret: SECRET });
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
    expect((await request(app).get('/api/admin/stats').set(bearer('c'.repeat(24)))).status).toBe(401);
  });

  it('show the totals', async () => {
    const res = await request(app).get('/api/admin/stats').set(bearer(ADMIN_ID));
    expect(res.body).toMatchObject({ accounts: 2, rooms: 2, customCds: 2, officialCds: 1 });
    expect(Number.isInteger(res.body.accountsThisWeek)).toBe(true);
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

  it('search rooms by scene and by the owner\'s username too', async () => {
    const byScene = await request(app).get('/api/admin/rooms?q=golden-loft').set(bearer(ADMIN_ID));
    expect(byScene.body.items.map((r) => r.code)).toEqual(['bbbb2222']);
    const byOwner = await request(app).get('/api/admin/rooms?q=MAYA').set(bearer(ADMIN_ID));
    expect(byOwner.body.items.map((r) => r.code)).toEqual(['aaaa1111']);
    expect(byOwner.body.total).toBe(1);
  });

  it('finds a room from a part of a word, and from a part of its scene\'s name sent as ?scenes=', async () => {
    const part = await request(app).get('/api/admin/rooms?q=spa').set(bearer(ADMIN_ID));
    expect(part.body.items.map((r) => r.code)).toEqual(['bbbb2222']);
    const byName = await request(app).get('/api/admin/rooms?q=gol&scenes=golden-loft').set(bearer(ADMIN_ID));
    expect(byName.body.items.map((r) => r.code)).toEqual(['bbbb2222']);
    const none = await request(app).get('/api/admin/rooms?q=zzz&scenes=golden-loft,$where').set(bearer(ADMIN_ID)); // a slug with odd characters is dropped
    expect(none.body.items.map((r) => r.code)).toEqual(['bbbb2222']);
    const ignored = await request(app).get('/api/admin/rooms?scenes=golden-loft').set(bearer(ADMIN_ID)); // scenes only widens a search; with no q it does nothing
    expect(ignored.body.total).toBe(2);
  });

  it('search accounts by username or display name, with no password data', async () => {
    const all = await request(app).get('/api/admin/users').set(bearer(ADMIN_ID));
    expect(all.body.items.map((u) => u.username)).toEqual(['boss', 'maya']);
    const found = await request(app).get('/api/admin/users?q=may').set(bearer(ADMIN_ID));
    expect(found.body.items.map((u) => u.username)).toEqual(['maya']);
    expect(found.body.total).toBe(1);
    expect(JSON.stringify(found.body)).not.toContain('secret-hash');
    expect((await request(app).get('/api/admin/users?q=(.*').set(bearer(ADMIN_ID))).status).toBe(200);
  });

  it('delete a guest room, once, and refuse odd codes', async () => {
    const headers = bearer(ADMIN_ID);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect((await request(app).delete('/api/admin/rooms/bbbb2222').set(headers)).status).toBe(204);
    expect((await request(app).delete('/api/admin/rooms/bbbb2222').set(headers)).status).toBe(404);
    expect((await request(app).delete('/api/admin/rooms/..%2F..%2Fx').set(headers)).status).toBe(404);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('deleted room bbbb2222'));
    log.mockRestore();
  });

  it('never delete a room that belongs to an account', async () => {
    const res = await request(app).delete('/api/admin/rooms/aaaa1111').set(bearer(ADMIN_ID));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/account/i);
    expect(roomList.map((r) => r.code)).toContain('aaaa1111');
  });

  it('list custom CDs only, and delete only guest CDs (never official ones or an account\'s)', async () => {
    const headers = bearer(ADMIN_ID);
    const list = await request(app).get('/api/admin/cds').set(headers);
    expect(list.body.items.map((c) => c.code)).toEqual(['cccc3333', 'dddd4444']);
    expect((await request(app).delete('/api/admin/cds/studio01').set(headers)).status).toBe(404);
    expect((await request(app).delete('/api/admin/cds/cccc3333').set(headers)).status).toBe(403);
    expect(cdList.map((c) => c.code)).toContain('cccc3333');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    expect((await request(app).delete('/api/admin/cds/dddd4444').set(headers)).status).toBe(204);
    console.log.mockRestore();
    expect(cdList.map((c) => c.code)).not.toContain('dddd4444');
  });

  describe('deleting an account', () => {
    const del = (name, confirm, who = ADMIN_ID) => request(app).delete(`/api/admin/users/${name}${confirm === undefined ? '' : `?confirm=${confirm}`}`).set(bearer(who));
    beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
    afterEach(() => console.log.mockRestore());

    it('removes the account with its rooms and CDs, but not the guests\' things or the official CDs', async () => {
      const res = await del('maya', 'maya');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deletedRooms: 1, deletedCds: 1 });
      expect(console.log).toHaveBeenCalledWith(expect.not.stringContaining('maya')); // the log never names the person
      expect(people.map((p) => p.username)).toEqual(['boss']);
      expect(roomList.map((r) => r.code)).toEqual(['bbbb2222']);
      expect(cdList.map((c) => c.code)).toEqual(['studio01', 'dddd4444']);
    });

    it('needs the username typed again, in any letter case', async () => {
      expect((await del('maya')).status).toBe(400);
      expect((await del('maya', 'someone')).status).toBe(400);
      expect(people).toHaveLength(2);
      expect((await del('MAYA', 'Maya')).status).toBe(200);
    });

    it('refuses yourself and other admins, and says 404 for an unknown or odd name', async () => {
      expect((await del('boss', 'boss')).status).toBe(403);
      people.push({ _id: 'd'.repeat(24), username: 'second', role: 'admin', createdAt: dateOf(3) });
      expect((await del('second', 'second')).status).toBe(403);
      expect((await del('nobody', 'nobody')).status).toBe(404);
      expect((await del('..%2Fx', 'x')).status).toBe(404);
      expect(people).toHaveLength(3);
    });

    it('is closed to normal accounts', async () => {
      expect((await del('maya', 'maya', USER_ID)).status).toBe(403);
      expect(people).toHaveLength(2);
    });
  });

  describe('the studio music', () => {
    const headers = () => bearer(ADMIN_ID);
    const track = { title: 'New song', artist: 'Someone', url: 'https://cdn.example.com/new-song.mp3', duration: 150 };
    beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
    afterEach(() => console.log.mockRestore());

    it('lists the official CDs with their tracks in play order', async () => {
      const res = await request(app).get('/api/admin/music').set(headers());
      expect(res.body.cds).toEqual([{ code: 'studio01', title: 'Studio CD', tracks: [{ id: 'rain', title: 'Rain', artist: 'Studio', duration: 120 }, { id: 'dusk', title: 'Dusk', artist: 'Studio', duration: 90 }] }]);
      expect((await request(app).get('/api/admin/music').set(bearer(USER_ID))).status).toBe(403);
    });

    it('adds a track at the end of an official CD', async () => {
      const res = await request(app).post('/api/admin/music/studio01/tracks').set(headers()).send(track);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'New song', artist: 'Someone', duration: 150 });
      expect(cdList.find((c) => c.code === 'studio01').trackIds).toEqual(['rain', 'dusk', res.body.id]);
      expect(trackList.find((t) => t._id === res.body.id)).toMatchObject({ src: 'https://cdn.example.com/new-song.mp3', license: 'Added by an admin' });
    });

    it('checks what was typed', async () => {
      const send = (body, code = 'studio01') => request(app).post(`/api/admin/music/${code}/tracks`).set(headers()).send(body);
      expect((await send({ ...track, title: '' })).status).toBe(400);
      expect((await send({ ...track, artist: '  ' })).status).toBe(400);
      expect((await send({ ...track, duration: 0 })).status).toBe(400);
      expect((await send({ ...track, duration: 'long' })).status).toBe(400);
      expect((await send({ ...track, url: 'http://cdn.example.com/a.mp3' })).status).toBe(400);
      expect((await send({ ...track, url: 'https://soundcloud.com/a/b' })).body.details.url).toMatch(/audio file/i);
      expect((await send(track, 'cccc3333')).status).toBe(404); // not an official CD
      expect((await send(track, 'nothere')).status).toBe(404);
      expect(trackList).toHaveLength(2);
    });

    it('removes a track from a CD, and deletes it when no other CD uses it', async () => {
      expect((await request(app).delete('/api/admin/music/studio01/tracks/dusk').set(headers())).status).toBe(204);
      expect(cdList.find((c) => c.code === 'studio01').trackIds).toEqual(['rain']);
      expect(trackList.map((t) => t._id)).toEqual(['rain']);
    });

    it('keeps a track that another CD still uses, and always leaves one track on the CD', async () => {
      cdList.push({ code: 'eeee5555', title: 'Other', official: true, owner: null, trackIds: ['dusk'] });
      expect((await request(app).delete('/api/admin/music/studio01/tracks/dusk').set(headers())).status).toBe(204);
      expect(trackList.map((t) => t._id)).toEqual(['rain', 'dusk']);
      const last = await request(app).delete('/api/admin/music/studio01/tracks/rain').set(headers());
      expect(last.status).toBe(400);
      expect((await request(app).delete('/api/admin/music/studio01/tracks/ghost').set(headers())).status).toBe(404);
    });
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
