const request = require('supertest');
const { createApp } = require('../src/app');
const { fakeSceneModel } = require('./helpers');

const cafe = { slug: 'rainy-cafe', name: 'Rainy Café', layers: [{ name: 'sky', image: '/scenes/rainy-cafe/layer-1.svg', depth: 0.05 }], objects: [] };
const cabin = { slug: 'cozy-cabin', name: 'Cozy Cabin', layers: [{ name: 'sky', image: '/scenes/cozy-cabin/layer-1.svg', depth: 0.05 }], objects: [] };

const appWith = (scenes, options) => createApp({ Scene: fakeSceneModel(scenes, options) });

describe('GET /api/scenes', () => {
  it('returns every scene as a list', async () => {
    const res = await request(appWith([cabin, cafe])).get('/api/scenes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([cabin, cafe]);
  });

  it('returns an empty list when there are no scenes yet', async () => {
    const res = await request(appWith([])).get('/api/scenes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 with a JSON error when the database fails', async () => {
    const res = await request(appWith([cafe], { fail: true })).get('/api/scenes');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong on the server' });
  });
});

describe('GET /api/scenes/:slug', () => {
  it('returns the scene with that slug', async () => {
    const res = await request(appWith([cabin, cafe])).get('/api/scenes/rainy-cafe');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(cafe);
  });

  it('returns 404 with a JSON error for a slug that does not exist', async () => {
    const res = await request(appWith([cabin, cafe])).get('/api/scenes/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Scene not found' });
  });

  it('returns 500 with a JSON error when the database fails', async () => {
    const res = await request(appWith([cafe], { fail: true })).get('/api/scenes/rainy-cafe');

    expect(res.status).toBe(500);
  });
});

describe('unknown API addresses', () => {
  it('return 404 with a JSON error', async () => {
    const res = await request(appWith([])).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
