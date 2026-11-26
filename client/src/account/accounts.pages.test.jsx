import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { safeNext } from '../pages/LoginPage.jsx';
import { saveSession } from '../auth.js';
import { saveMyRoom } from '../myRooms.js';
import { rememberCd } from '../music/myCds.js';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const user = { username: 'tony', displayName: 'Tony', avatarHue: 200, role: 'user', createdAt: '2026-11-01T00:00:00Z' };
const admin = { ...user, username: 'boss', displayName: '', role: 'admin' };

// A pretend API: routes is { 'METHOD /path': (body) => [status, json] }. Every call is remembered in `calls`.
let calls;
function pretendApi(routes) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url, options = {}) => {
      const path = String(url).replace('http://localhost:4000', '').split('?')[0];
      const key = `${options.method ?? 'GET'} ${path}`;
      calls.push({ key, url: String(url), options });
      const handler = routes[key];
      if (!handler) return reply(404, { error: `no pretend answer for ${key}` });
      const [status, json] = handler(options.body ? JSON.parse(options.body) : undefined);
      return reply(status, json);
    })
  );
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the login page', () => {
  it('hides the password, never puts it in the address, and always offers to continue without an account', () => {
    renderAt('/login');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByRole('button', { name: 'Sign in', hidden: false, exact: true, selector: '[type="submit"]' }).closest('form')).toHaveAttribute('method', 'post');
    expect(screen.getByRole('link', { name: 'Continue without an account' })).toHaveAttribute('href', '/');
  });

  it('signs in, keeps the token in the browser and shows the signed-in start page', async () => {
    pretendApi({
      'POST /api/auth/login': () => [200, { token: 'aaa.bbb.ccc', user }],
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, []],
      'GET /api/me/cds': () => [200, []],
    });
    const u = userEvent.setup();
    renderAt('/login');
    await u.type(screen.getByLabelText('Username'), 'Tony');
    await u.type(screen.getByLabelText('Password'), 'a good password');
    await u.click(screen.getByRole('button', { name: 'Sign in', selector: '[type="submit"]' }));

    expect(await screen.findByRole('button', { name: /Tony/ }, { timeout: 3000 })).toBeInTheDocument(); // the pill on the start page
    expect(localStorage.getItem('libsic:token')).toBe('aaa.bbb.ccc');
    expect(calls.find((c) => c.key === 'POST /api/auth/login').options.body).toContain('a good password');
  });

  it('shows the API message for a wrong password, and empties the password field', async () => {
    pretendApi({ 'POST /api/auth/login': () => [401, { error: 'Wrong username or password' }] });
    const u = userEvent.setup();
    renderAt('/login');
    await u.type(screen.getByLabelText('Username'), 'tony');
    await u.type(screen.getByLabelText('Password'), 'not right at all');
    await u.click(screen.getByRole('button', { name: 'Sign in', selector: '[type="submit"]' }));

    expect(await screen.findByText('Wrong username or password')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(localStorage.getItem('libsic:token')).toBeNull();
  });

  it('creates an account from the other tab, and explains that there is no password reset', async () => {
    pretendApi({ 'POST /api/auth/register': () => [201, { token: 'x.y.z', user }], 'GET /api/auth/me': () => [200, user] });
    const u = userEvent.setup();
    renderAt('/login?mode=create');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText(/cannot be reset/)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Username'), 'tony');
    await u.type(screen.getByLabelText('Password'), 'a good password');
    await u.click(screen.getByRole('button', { name: 'Create account', selector: '[type="submit"]' }));
    await waitFor(() => expect(localStorage.getItem('libsic:token')).toBe('x.y.z'));
  });

  it('can show the password on request', async () => {
    renderAt('/login');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('sends someone who is already signed in away', async () => {
    saveSession({ token: 'a.b.c', user });
    pretendApi({ 'GET /api/auth/me': () => [200, user], 'GET /api/me/rooms': () => [200, []], 'GET /api/me/cds': () => [200, []] });
    renderAt('/login');
    expect(await screen.findByRole('button', { name: /Tony/ })).toBeInTheDocument();
  });

  it('only returns to addresses inside this site', () => {
    expect(safeNext('/me')).toBe('/me');
    expect(safeNext('/new?scene=golden-loft')).toBe('/new?scene=golden-loft');
    for (const bad of ['//evil.example', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined, '/a\nb']) {
      expect(safeNext(bad)).toBe('/');
    }
  });
});

describe('the start page when signed out', () => {
  it('has a Sign in link', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});

describe('the start page when signed in', () => {
  beforeEach(() => saveSession({ token: 'a.b.c', user }));

  it('shows the name at once, lists account rooms, and signs out from the menu', async () => {
    pretendApi({
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, [{ code: 'room1111', name: 'From my laptop', sceneSlug: 'golden-loft', updatedAt: '2026-11-20T00:00:00Z' }]],
      'GET /api/me/cds': () => [200, []],
    });
    const u = userEvent.setup();
    renderAt('/');
    expect(screen.getByRole('button', { name: /Tony/ })).toBeInTheDocument(); // before the API has answered
    await u.click(await screen.findByRole('button', { name: /My rooms \(1\)/ }));
    expect(screen.getByRole('link', { name: 'From my laptop' })).toHaveAttribute('href', '/r/room1111');
    expect(screen.queryByRole('button', { name: 'Forget' })).not.toBeInTheDocument(); // account rooms are not "forgotten"

    await u.click(screen.getByRole('button', { name: /Tony/ }));
    expect(screen.queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
    await u.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem('libsic:token')).toBeNull();
    expect(localStorage.getItem('libsic:user')).toBeNull();
  });

  it('signs out quietly when the saved token has expired', async () => {
    pretendApi({ 'GET /api/auth/me': () => [401, { error: 'Sign in first' }] });
    renderAt('/');
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem('libsic:token')).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stays signed in when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    renderAt('/');
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Tony/ })).toBeInTheDocument();
    expect(localStorage.getItem('libsic:token')).toBe('a.b.c');
  });

  it('offers to add the rooms and CDs saved in this browser, and does it when asked', async () => {
    saveMyRoom({ code: 'guest111', editKey: 'key-room', name: 'Old room', sceneSlug: 'night-study' });
    rememberCd({ code: 'cdguest1', editKey: 'key-cd', title: 'Old CD' });
    pretendApi({
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, []],
      'GET /api/me/cds': () => [200, []],
      'POST /api/me/claim': () => [200, { claimed: [{ type: 'room', code: 'guest111' }, { type: 'cd', code: 'cdguest1' }], skipped: [] }],
    });
    const u = userEvent.setup();
    renderAt('/');
    expect(await screen.findByText(/We found 1 room and 1 CD saved in this browser/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Add them' }));
    expect(await screen.findByText(/Added 1 room and 1 CD to your account/)).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'POST /api/me/claim').options.body)).toEqual({
      rooms: [{ code: 'guest111', editKey: 'key-room' }],
      cds: [{ code: 'cdguest1', editKey: 'key-cd' }],
    });
  });

  it('remembers "Not now" and does not ask again', async () => {
    saveMyRoom({ code: 'guest111', editKey: 'key-room', name: 'Old room', sceneSlug: 'night-study' });
    pretendApi({ 'GET /api/auth/me': () => [200, user], 'GET /api/me/rooms': () => [200, []], 'GET /api/me/cds': () => [200, []] });
    const first = renderAt('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByText(/We found/)).not.toBeInTheDocument();
    first.unmount();
    renderAt('/');
    await screen.findByRole('button', { name: /Tony/ });
    expect(screen.queryByText(/We found/)).not.toBeInTheDocument();
  });

  it('does not ask when everything is already on the account', async () => {
    saveMyRoom({ code: 'guest111', editKey: 'key-room', name: 'Old room', sceneSlug: 'night-study' });
    pretendApi({
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, [{ code: 'guest111', name: 'Old room', sceneSlug: 'night-study', updatedAt: '2026-11-01T00:00:00Z' }]],
      'GET /api/me/cds': () => [200, []],
    });
    renderAt('/');
    await waitFor(() => expect(calls.some((c) => c.key === 'GET /api/me/cds')).toBe(true));
    expect(screen.queryByText(/We found/)).not.toBeInTheDocument();
  });
});

describe('the profile page', () => {
  it('sends a signed-out visitor to the login page', async () => {
    renderAt('/me');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('shows the profile and saves a new display name and colour', async () => {
    saveSession({ token: 'a.b.c', user });
    pretendApi({
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, [{ code: 'room1111', name: 'Study', sceneSlug: 'night-study', updatedAt: '2026-11-20T00:00:00Z' }]],
      'GET /api/me/cds': () => [200, []],
      'PATCH /api/auth/me': (body) => [200, { ...user, ...body }],
    });
    const u = userEvent.setup();
    renderAt('/me');
    expect(await screen.findByRole('link', { name: 'Study' })).toHaveAttribute('href', '/r/room1111');
    await u.clear(screen.getByLabelText('Display name'));
    await u.type(screen.getByLabelText('Display name'), 'Night Owl');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /api/auth/me').options.body)).toEqual({ displayName: 'Night Owl', avatarHue: 200 });
    expect(JSON.parse(localStorage.getItem('libsic:user')).displayName).toBe('Night Owl');
  });

  it('Sign out clears the browser and goes to the start page', async () => {
    saveSession({ token: 'a.b.c', user });
    pretendApi({ 'GET /api/auth/me': () => [200, user], 'GET /api/me/rooms': () => [200, []], 'GET /api/me/cds': () => [200, []] });
    renderAt('/me');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem('libsic:token')).toBeNull();
    expect(localStorage.getItem('libsic:user')).toBeNull();
  });
});

describe('the admin page', () => {
  it('looks like a page that does not exist for visitors and normal accounts', async () => {
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    saveSession({ token: 'a.b.c', user });
    pretendApi({ 'GET /api/auth/me': () => [200, user] });
    renderAt('/admin');
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.getAllByRole('heading', { name: 'Page not found' }).length).toBeGreaterThan(0);
    expect(calls.some((c) => c.key.includes('/api/admin/'))).toBe(false); // nothing is even asked
  });

  it('shows totals, finds rooms and deletes one after a second click', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    let rooms = [
      { code: 'spam1111', name: 'Buy cheap pills', sceneSlug: 'night-study', owner: null, updatedAt: '2026-11-20T00:00:00Z' },
      { code: 'good2222', name: 'Cozy study', sceneSlug: 'golden-loft', owner: 'maya', updatedAt: '2026-11-21T00:00:00Z' },
    ];
    pretendApi({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/stats': () => [200, { accounts: 3, rooms: 2, roomsThisWeek: 2, customCds: 1, officialCds: 3, roomsPerScene: [] }],
      'GET /api/admin/rooms': () => [200, { total: rooms.length, page: 1, pageSize: 20, items: rooms }],
      'DELETE /api/admin/rooms/spam1111': () => {
        rooms = rooms.filter((r) => r.code !== 'spam1111');
        return [204, null];
      },
    });
    const u = userEvent.setup();
    renderAt('/admin');
    expect(await screen.findByText('New rooms this week')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Buy cheap pills' })).toBeInTheDocument();

    await u.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(calls.some((c) => c.key.startsWith('DELETE'))).toBe(false); // the first click only asks
    await u.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Buy cheap pills' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Cozy study' })).toBeInTheDocument();
  });
});

describe('privacy', () => {
  it('the password and the token reach only the login request body and the Authorization header', async () => {
    const logged = [];
    for (const method of ['log', 'info', 'warn', 'error', 'debug']) vi.spyOn(console, method).mockImplementation((...a) => logged.push(a.map(String).join(' ')));
    pretendApi({
      'POST /api/auth/login': () => [200, { token: 'tok.tok.tok', user }],
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, []],
      'GET /api/me/cds': () => [200, []],
    });
    const u = userEvent.setup();
    renderAt('/login?next=/me');
    await u.type(screen.getByLabelText('Username'), 'tony');
    await u.type(screen.getByLabelText('Password'), 'very private words');
    await u.click(screen.getByRole('button', { name: 'Sign in', selector: '[type="submit"]' }));
    await screen.findByRole('heading', { name: 'Tony' }, { timeout: 3000 });

    for (const call of calls) {
      expect(call.url).not.toContain('very private words');
      expect(call.url).not.toContain('tok.tok.tok');
      if (call.key !== 'POST /api/auth/login') expect(call.options.body ?? '').not.toContain('very private words');
    }
    expect(JSON.stringify({ ...localStorage })).not.toContain('very private words');
    expect(logged.join('\n')).not.toContain('very private words');
    expect(logged.join('\n')).not.toContain('tok.tok.tok');
    expect(document.body.innerHTML).not.toContain('very private words');
    expect(document.body.innerHTML).not.toContain('tok.tok.tok');
  });
});
