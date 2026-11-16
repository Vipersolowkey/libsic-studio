const request = require('supertest');
const { createApp } = require('../src/app');
const { fakeSceneModel } = require('./helpers');

// A scene with many layers, so its answer is long enough to be worth compressing.
const big = {
  slug: 'big-room',
  name: 'Big Room',
  layers: Array.from({ length: 80 }, (_, i) => ({ name: `layer ${i}`, image: `/scenes/big-room/layer-${i}.webp`, depth: 0.5 })),
  objects: [],
};
const appWith = (options) => createApp({ Scene: fakeSceneModel([big]) }, options);

describe('protection and speed of the API', () => {
  it('adds safety headers to every answer', async () => {
    const res = await request(appWith()).get('/api/scenes');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined(); // does not tell which server software is used
    expect(res.headers['access-control-allow-origin']).toBe('*'); // the React site may still call it
  });

  it('sends a long answer compressed when the browser accepts gzip', async () => {
    const res = await request(appWith()).get('/api/scenes/big-room').set('Accept-Encoding', 'gzip');

    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.body.layers).toHaveLength(80); // and it still unpacks to the same scene
  });

  it('answers 429 once a visitor passes the request limit, with a readable error', async () => {
    const app = appWith({ requestsPerMinute: 3 });
    for (let i = 0; i < 3; i++) expect((await request(app).get('/api/scenes')).status).toBe(200);

    const res = await request(app).get('/api/scenes');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Too many requests. Please wait a minute and try again.' });
  });

  it('never limits the health check', async () => {
    const app = appWith({ requestsPerMinute: 1 });
    for (let i = 0; i < 3; i++) expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
