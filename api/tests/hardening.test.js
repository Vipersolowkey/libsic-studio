const request = require('supertest');
const { createApp } = require('../src/app');
const Room = require('../src/models/Room');
const Cd = require('../src/models/Cd');
const { cleanText } = require('../src/utils/cleanText');
const { fakeSceneModel, fakeTrackModel, installFakeRoomStore, installFakeCdStore } = require('./helpers');

const scenes = [{ slug: 'rainy-cafe', name: 'Rainy Café' }];
let roomStore;
let cdStore;
beforeEach(() => {
  roomStore = installFakeRoomStore(Room);
  cdStore = installFakeCdStore(Cd);
});
afterEach(() => {
  roomStore.restore();
  cdStore.restore();
});
const appWith = (options) => createApp({ Scene: fakeSceneModel(scenes), Room, Cd, Track: fakeTrackModel([]) }, options);
const newRoom = { sceneSlug: 'rainy-cafe' };

describe('cleanText', () => {
  it('replaces control and invisible characters with a space and collapses spaces', () => {
    expect(cleanText('  My​   room‮\n\tname  ')).toBe('My room name');
    expect(cleanText('\u0000​')).toBe('');
  });
  it('leaves values that are not text alone, so the model reports them', () => {
    expect(cleanText(42)).toBe(42);
    expect(cleanText(null)).toBe(null);
    expect(cleanText(undefined)).toBe(undefined);
  });
});

describe('room names', () => {
  it('are cleaned when a room is saved and when it is renamed', async () => {
    const app = appWith();
    const created = await request(app).post('/api/rooms').send({ ...newRoom, name: ' Study​   time ' });
    expect(created.body.room.name).toBe('Study time');

    const renamed = await request(app).put(`/api/rooms/${created.body.room.code}`).set('x-edit-key', created.body.editKey).send({ name: 'A\u0000B' });
    expect(renamed.body.name).toBe('A B');
  });
});

describe('limits on saving', () => {
  it('stops one visitor from creating too many rooms, with a readable error', async () => {
    const app = appWith({ createsPerTenMinutes: 3 });
    for (let i = 0; i < 3; i++) expect((await request(app).post('/api/rooms').send(newRoom)).status).toBe(201);

    const res = await request(app).post('/api/rooms').send(newRoom);

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many new rooms or cds/i);
    expect(roomStore.store.size).toBe(3);
  });

  it('counts new rooms and new CDs in the same budget of the visitor, but reading never counts', async () => {
    const app = appWith({ createsPerTenMinutes: 2 });
    expect((await request(app).post('/api/rooms').send(newRoom)).status).toBe(201);
    expect((await request(app).post('/api/cds').send({ title: 'x' })).status).toBe(400); // still counts: the request was made
    for (let i = 0; i < 5; i++) expect((await request(app).get('/api/rooms/zzzzzzzz')).status).toBe(404);

    expect((await request(app).post('/api/rooms').send(newRoom)).status).toBe(429);
  });

  it('limits saves and deletes per minute, not reads', async () => {
    const app = appWith({ writesPerMinute: 2 });
    const { room, editKey } = (await request(app).post('/api/rooms').send(newRoom)).body;
    expect((await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ name: 'One' })).status).toBe(200);

    const blocked = await request(app).put(`/api/rooms/${room.code}`).set('x-edit-key', editKey).send({ name: 'Two' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/saving too fast/i);
    expect((await request(app).get(`/api/rooms/${room.code}`)).body.name).toBe('One'); // reads are free
    expect((await request(app).delete(`/api/rooms/${room.code}`).set('x-edit-key', editKey)).status).toBe(429);
  });

  it('also limits the music link lookups, which make our server visit other websites', async () => {
    const app = appWith({ writesPerMinute: 1 });
    expect((await request(app).post('/api/music/resolve').send({ url: 'https://example.com' })).status).toBe(400);
    expect((await request(app).post('/api/music/resolve').send({ url: 'https://example.com' })).status).toBe(429);
  });

  it('refuses new rooms with 503 when the database holds the most rooms it may', async () => {
    const app = appWith({ maxRooms: 1 });
    expect((await request(app).post('/api/rooms').send(newRoom)).status).toBe(201);

    const res = await request(app).post('/api/rooms').send(newRoom);
    expect(res.status).toBe(503);
    expect(roomStore.store.size).toBe(1);
  });
});

// A pretend database for the visit counters.
function fakeStats() {
  const stats = new Map();
  const marks = new Set();
  const keyOf = (f) => `${f.day}|${f.page}|${f.scene}`;
  return {
    stats,
    DailyStat: {
      updateOne: async (filter, update) => {
        const row = stats.get(keyOf(filter)) || { ...filter, views: 0, visitors: 0 };
        for (const [k, v] of Object.entries(update.$inc)) row[k] += v;
        stats.set(keyOf(filter), row);
      },
      find: (filter) => ({ sort: () => ({ lean: async () => [...stats.values()].filter((r) => r.day >= filter.day.$gte) }) }),
    },
    DailyVisitor: {
      create: async ({ day, mark }) => {
        if (marks.has(`${day}|${mark}`)) throw Object.assign(new Error('E11000'), { code: 11000 });
        marks.add(`${day}|${mark}`);
      },
      marks,
    },
  };
}

describe('visit counter', () => {
  const day = '2026-11-26';
  const build = (extra = {}) => {
    const fake = fakeStats();
    const app = createApp({ Scene: fakeSceneModel(scenes), DailyStat: fake.DailyStat, DailyVisitor: fake.DailyVisitor }, { stats: { statsToken: 'secret', salt: 's', now: () => day, ...extra } });
    return { fake, app };
  };

  it('counts a page view and answers 204 with nothing to show', async () => {
    const { app, fake } = build();
    const res = await request(app).post('/api/visits').send({ page: 'home' });

    expect(res.status).toBe(204);
    expect(fake.stats.get(`${day}|home|`).views).toBe(1);
  });

  it('counts a visitor once a day, however many pages they open', async () => {
    const { app, fake } = build();
    for (const page of ['home', 'new', 'room']) await request(app).post('/api/visits').set('User-Agent', 'A').send({ page });
    await request(app).post('/api/visits').set('User-Agent', 'B').send({ page: 'home' });

    expect(fake.stats.get(`${day}|_all|`).visitors).toBe(2);
    expect(fake.stats.get(`${day}|home|`).views).toBe(2);
  });

  it('stores a scrambled mark, never the address or the browser name', async () => {
    const { app, fake } = build();
    await request(app).post('/api/visits').set('User-Agent', 'SecretBrowser').send({ page: 'home' });

    const [mark] = [...fake.DailyVisitor.marks];
    expect(mark).toMatch(/^2026-11-26\|[0-9a-f]{64}$/);
    expect(mark).not.toMatch(/127\.0\.0\.1|SecretBrowser/);
  });

  it('counts how often each scene is shown, and ignores scenes that do not exist', async () => {
    const { app, fake } = build();
    await request(app).post('/api/visits').send({ page: 'scene', scene: 'rainy-cafe' });
    const unknown = await request(app).post('/api/visits').send({ page: 'scene', scene: 'made-up-by-a-spammer' });

    expect(unknown.status).toBe(204);
    expect(fake.stats.get(`${day}|scene|rainy-cafe`).views).toBe(1);
    expect([...fake.stats.keys()].filter((k) => k.includes('made-up'))).toEqual([]);
  });

  it('counts nothing when the visitor says Do Not Track or Global Privacy Control', async () => {
    const { app, fake } = build();
    expect((await request(app).post('/api/visits').set('DNT', '1').send({ page: 'home' })).status).toBe(204);
    expect((await request(app).post('/api/visits').set('Sec-GPC', '1').send({ page: 'home' })).status).toBe(204);
    expect(fake.stats.size).toBe(0);
  });

  it.each([[{}], [{ page: 'admin' }], [{ page: ['home'] }]])('answers 400 for a page that is not on the list: %j', async (body) => {
    const { app } = build();
    const res = await request(app).post('/api/visits').send(body);
    expect(res.status).toBe(400);
    expect(res.body.details.page).toEqual(expect.any(String));
  });

  it('shows the totals only with the stats token', async () => {
    const { app } = build();
    await request(app).post('/api/visits').send({ page: 'home' });
    await request(app).post('/api/visits').send({ page: 'scene', scene: 'rainy-cafe' });

    expect((await request(app).get('/api/stats')).status).toBe(401);
    expect((await request(app).get('/api/stats').set('Authorization', 'Bearer wrong')).status).toBe(401);
    const res = await request(app).get('/api/stats').set('Authorization', 'Bearer secret');
    expect(res.status).toBe(200);
    expect(res.body.days).toEqual([{ day, visitors: 1, pages: { home: 1 }, scenes: { 'rainy-cafe': 1 } }]);
  });

  it('is switched off (404) when no stats token is set on the server', async () => {
    const { app } = build({ statsToken: undefined });
    expect((await request(app).get('/api/stats').set('Authorization', 'Bearer anything')).status).toBe(404);
  });

  it('serves the small page where the owner reads the numbers', async () => {
    const { app } = build();
    const res = await request(app).get('/stats');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
    expect(res.text).toContain('Libsic Studio visits');
  });
});

describe('error monitoring', () => {
  afterEach(() => jest.resetModules());

  it('does nothing without a SENTRY_DSN', () => {
    const { initMonitoring, reportError } = require('../src/monitoring');
    expect(initMonitoring({})).toBe(false);
    expect(() => reportError(new Error('x'), 'GET /')).not.toThrow();
  });

  it('starts Sentry without personal data and reports errors when a SENTRY_DSN is set', () => {
    const sentry = { init: jest.fn(), captureException: jest.fn(), flush: jest.fn().mockResolvedValue(true) };
    jest.doMock('@sentry/node', () => sentry);
    const { initMonitoring, reportError } = require('../src/monitoring');

    expect(initMonitoring({ SENTRY_DSN: 'https://key@example.ingest.sentry.io/1', NODE_ENV: 'production' })).toBe(true);
    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false, tracesSampleRate: 0, environment: 'production', beforeSend: expect.any(Function) }));
    const error = new Error('boom');
    reportError(error, 'GET /api/scenes');
    expect(sentry.captureException).toHaveBeenCalledWith(error, { tags: { where: 'GET /api/scenes' } });
    jest.dontMock('@sentry/node');
  });

  it('strips headers, cookies, the body, the query string and the user from every report', () => {
    const { scrub } = require('../src/monitoring');
    const event = {
      message: 'boom',
      user: { ip_address: '1.2.3.4' },
      request: { url: 'http://x/api/rooms', method: 'PUT', headers: { authorization: 'Bearer abc', 'x-edit-key': 'k' }, cookies: { a: 'b' }, data: { password: 'p' }, query_string: 'token=1' },
    };

    expect(scrub(event)).toEqual({ message: 'boom', request: { url: 'http://x/api/rooms', method: 'PUT' } });
    expect(scrub({ message: 'no request' })).toEqual({ message: 'no request' });
  });

  it('reports unexpected server errors (500) but not the visitor\'s mistakes (400)', async () => {
    const reported = jest.fn();
    jest.doMock('../src/monitoring', () => ({ reportError: reported }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { createApp: freshApp } = require('../src/app');
    const app = freshApp({ Scene: fakeSceneModel(scenes, { fail: true }), Room, Cd });

    expect((await request(app).get('/api/scenes')).status).toBe(500);
    expect(reported).toHaveBeenCalledWith(expect.objectContaining({ message: 'database is down' }), 'GET /api/scenes');
    reported.mockClear();
    expect((await request(app).get('/api/nothing-here')).status).toBe(404);
    expect((await request(app).post('/api/rooms').set('Content-Type', 'application/json').send('{bad')).status).toBe(400);
    expect(reported).not.toHaveBeenCalled();
    console.error.mockRestore();
    jest.dontMock('../src/monitoring');
  });
});
