import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminDelete, adminList, claimMine, deleteRoom, getAccountRooms, getRoom, login, updateRoom } from './api.js';
import { SIGNED_OUT_EVENT, getToken, saveSession } from './auth.js';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const sentHeaders = (fetchMock, n = 0) => fetchMock.mock.calls[n][1].headers;

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('the token in requests', () => {
  it('goes in the Authorization header, and nowhere else', async () => {
    saveSession({ token: 'aaa.bbb.ccc', user: { username: 'tony', displayName: '', avatarHue: 38, role: 'user' } });
    const fetchMock = vi.fn(() => reply(200, []));
    vi.stubGlobal('fetch', fetchMock);
    await getAccountRooms();
    await getRoom('abc12345');

    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).not.toContain('aaa.bbb.ccc');
      expect(options.body ?? '').not.toContain('aaa.bbb.ccc');
      expect(options.headers.Authorization).toBe('Bearer aaa.bbb.ccc');
    }
  });

  it('is left out when nobody is signed in', async () => {
    const fetchMock = vi.fn(() => reply(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    await getRoom('abc12345');
    expect(sentHeaders(fetchMock)).not.toHaveProperty('Authorization');
  });

  it('does not send an empty edit key (an account owner has none)', async () => {
    const fetchMock = vi.fn(() => reply(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    await updateRoom('abc12345', null, { name: 'x' });
    expect(sentHeaders(fetchMock)).not.toHaveProperty('x-edit-key');
    await updateRoom('abc12345', 'real-key', { name: 'x' });
    expect(sentHeaders(fetchMock, 1)['x-edit-key']).toBe('real-key');
  });
});

describe('an expired login', () => {
  it('signs out quietly when the account addresses say 401', async () => {
    saveSession({ token: 'old.old.old', user: { username: 'tony', displayName: '', avatarHue: 38, role: 'user' } });
    vi.stubGlobal('fetch', vi.fn(() => reply(401, { error: 'Sign in first' })));
    const heard = vi.fn();
    window.addEventListener(SIGNED_OUT_EVENT, heard);
    await expect(getAccountRooms()).rejects.toMatchObject({ status: 401 });
    window.removeEventListener(SIGNED_OUT_EVENT, heard);
    expect(getToken()).toBeNull();
    expect(heard).toHaveBeenCalled();
  });

  it('keeps the login when a room says "send the edit key" (that is not about the login)', async () => {
    saveSession({ token: 'good.good.good', user: { username: 'tony', displayName: '', avatarHue: 38, role: 'user' } });
    vi.stubGlobal('fetch', vi.fn(() => reply(401, { error: 'Send the edit key in the x-edit-key header' })));
    await expect(deleteRoom('abc12345', null)).rejects.toMatchObject({ status: 401 });
    expect(getToken()).toBe('good.good.good');
  });

  it('keeps the login when the server cannot be reached', async () => {
    saveSession({ token: 'good.good.good', user: { username: 'tony', displayName: '', avatarHue: 38, role: 'user' } });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    await expect(getAccountRooms()).rejects.toMatchObject({ status: 0 });
    expect(getToken()).toBe('good.good.good');
  });
});

describe('the account calls', () => {
  it('login sends the password only in the body', async () => {
    const fetchMock = vi.fn(() => reply(200, { token: 't', user: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await login('tony', 'my secret words');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/auth/login');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ username: 'tony', password: 'my secret words' });
    expect(url).not.toContain('secret');
  });

  it('claimMine sends the edit keys in the body', async () => {
    const fetchMock = vi.fn(() => reply(200, { claimed: [], skipped: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await claimMine([{ code: 'abc12345', editKey: 'k' }], []);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ rooms: [{ code: 'abc12345', editKey: 'k' }], cds: [] });
    expect(fetchMock.mock.calls[0][0]).not.toContain('k=');
  });

  it('the admin calls put only a search and a page in the address', async () => {
    const fetchMock = vi.fn(() => reply(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    await adminList('rooms', { q: 'cozy room', page: 2 });
    await adminDelete('cds', 'abc 123');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/admin/rooms?q=cozy+room&page=2');
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:4000/api/admin/cds/abc%20123');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });
});
