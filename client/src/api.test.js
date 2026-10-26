import { afterEach, describe, expect, it, vi } from 'vitest';
import { getScene, getScenes, request, ApiError } from './api.js';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('getScenes asks the API for /api/scenes and returns the list', async () => {
    const fetchMock = vi.fn(() => reply(200, [{ slug: 'a' }]));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getScenes()).toEqual([{ slug: 'a' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/scenes');
  });

  it('getScene puts the slug in the address', async () => {
    const fetchMock = vi.fn(() => reply(200, { slug: 'moon-base' }));
    vi.stubGlobal('fetch', fetchMock);

    await getScene('moon-base');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/scenes/moon-base');
  });

  it('throws an ApiError with the status and the message from the API', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(404, { error: 'Scene not found' })));

    const error = await getScene('nope').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe('Scene not found');
  });

  it('throws a readable error when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    await expect(request('/api/scenes')).rejects.toThrow('Cannot reach the server');
  });

  it('sends a JSON body with the right header', async () => {
    const fetchMock = vi.fn(() => reply(201, {}));
    vi.stubGlobal('fetch', fetchMock);

    await request('/api/rooms', { method: 'POST', body: { name: 'Mine' } });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe('{"name":"Mine"}');
  });
});
