import { afterEach, describe, expect, it, vi } from 'vitest';
import { getScene, getScenes, getRoom, createRoom, updateRoom, deleteRoom, request, ApiError } from './api.js';

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

  it('returns null when the API answers 204 (nothing to send back)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error('no body')) })));
    expect(await request('/api/rooms/abc', { method: 'DELETE' })).toBeNull();
  });

  describe('rooms', () => {
    it('getRoom asks for the room by its code', async () => {
      const fetchMock = vi.fn(() => reply(200, { code: 'abc' }));
      vi.stubGlobal('fetch', fetchMock);
      await getRoom('abc');
      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/rooms/abc');
    });

    it('createRoom posts the room as JSON', async () => {
      const fetchMock = vi.fn(() => reply(201, { room: {}, editKey: 'k' }));
      vi.stubGlobal('fetch', fetchMock);
      await createRoom({ sceneSlug: 'moon-base' });
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:4000/api/rooms');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ sceneSlug: 'moon-base' });
    });

    it('updateRoom and deleteRoom send the edit key in the x-edit-key header', async () => {
      const fetchMock = vi.fn(() => reply(200, {}));
      vi.stubGlobal('fetch', fetchMock);
      await updateRoom('abc', 'secret', { name: 'New' });
      await deleteRoom('abc', 'secret');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', headers: expect.objectContaining({ 'x-edit-key': 'secret' }) });
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE', headers: { 'x-edit-key': 'secret' } });
    });
  });
});
