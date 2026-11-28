import { afterEach, describe, expect, it, vi } from 'vitest';
import { getScenes, getScene, getRoom, createRoom, updateRoom, deleteRoom, createCd, updateCd, deleteCd, request, ApiError } from './api.js';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('getScenes asks the API for /api/scenes and returns the list', async () => {
    const fetchMock = vi.fn(() => reply(200, [{ slug: 'a' }]));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getScenes()).toEqual([{ slug: 'a' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/scenes');
  });

  it('getScene asks for one whole scene by its slug', async () => {
    const fetchMock = vi.fn(() => reply(200, { slug: 'night-study', layers: [] }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getScene('night-study')).toEqual({ slug: 'night-study', layers: [] });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/scenes/night-study');
  });

  it('throws an ApiError with the status and the message from the API', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(404, { error: 'Room not found' })));

    const error = await getRoom('nope').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe('Room not found');
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

  describe('saving CDs and the limits of the API', () => {
    it('createCd posts the CD; updateCd and deleteCd send the edit key', async () => {
      const fetchMock = vi.fn(() => reply(200, {}));
      vi.stubGlobal('fetch', fetchMock);
      await createCd({ title: 'Mix', trackIds: ['a'] });
      await updateCd('abc', 'secret', { title: 'Renamed' });
      await deleteCd('abc', 'secret');

      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/cds');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: 'Mix', trackIds: ['a'] });
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', headers: expect.objectContaining({ 'x-edit-key': 'secret' }) });
      expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'DELETE', headers: { 'x-edit-key': 'secret' } });
    });

    it('turns the field errors of a refused CD into one readable message', async () => {
      vi.stubGlobal('fetch', vi.fn(() => reply(400, { error: 'Validation failed', details: { title: 'Give the CD a name', links: 'Use a SoundCloud link' } })));
      const error = await createCd({}).catch((e) => e);
      expect(error.status).toBe(400);
      expect(error.message).toBe('Give the CD a name. Use a SoundCloud link');
    });

    it.each([
      [429, 'You are saving too fast. Please wait a minute and try again.'],
      [503, 'The server is full right now. Please try again later.'],
    ])('keeps the status %s and the message of the API, so the page can show it', async (status, message) => {
      vi.stubGlobal('fetch', vi.fn(() => reply(status, { error: message })));
      const error = await createRoom({ sceneSlug: 'x' }).catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(status);
      expect(error.message).toBe(message);
    });

    it('falls back to a generic message when the answer is not JSON (for example a proxy error page)', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new Error('html')) })));
      await expect(createRoom({})).rejects.toThrow('Request failed (502)');
    });
  });
});
