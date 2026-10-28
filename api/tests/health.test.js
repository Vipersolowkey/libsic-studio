const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /api/health', () => {
  it('returns 200 and { status: "ok" }', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
