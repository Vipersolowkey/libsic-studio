import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  it('hides the password, never puts it in the address, and always offers to continue without an account', async () => {
    renderAt('/login');
    expect(await screen.findByLabelText('Password')).toHaveAttribute('type', 'password');
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
    await u.click(screen.getByRole('button', { name: /Tony/ }));
    expect(screen.getByRole('menuitem', { name: /Studio/ })).toHaveAttribute('href', '/me'); // the account's rooms are on the studio page
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

  it('offers the same question on the studio page (/me) and loads the rooms again after adding them', async () => {
    saveMyRoom({ code: 'guest111', editKey: 'key-room', name: 'Old room', sceneSlug: 'night-study' });
    let added = false;
    pretendApi({
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, added ? [{ code: 'guest111', name: 'Old room', sceneSlug: 'night-study', updatedAt: null }] : []],
      'GET /api/me/cds': () => [200, []],
      'POST /api/me/claim': () => { added = true; return [200, { claimed: [{ type: 'room', code: 'guest111' }], skipped: [] }]; },
    });
    const u = userEvent.setup();
    renderAt('/me');
    expect(await screen.findByText(/We found 1 room and 0 CDs saved in this browser/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Add them' }));
    expect(await screen.findByText(/Added 1 room and 0 CDs to your account/)).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.key === 'GET /api/me/rooms').length).toBeGreaterThan(1)); // the list was fetched again
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

describe('the studio page (/me)', () => {
  it('opens for a visitor without an account on "New room", and each scene starts a room', async () => {
    renderAt('/me');
    expect(await screen.findByRole('heading', { name: 'Your studio' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument(); // nothing to edit without an account
    expect(await screen.findByRole('link', { name: 'Make a room in Clam Cove' })).toHaveAttribute('href', '/new?scene=underwater-nook');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=/me');
  });

  it('shows the rooms and CDs saved in this browser to a guest, and Forget only removes them from the list', async () => {
    saveMyRoom({ code: 'local111', editKey: 'k', name: 'Corner desk', sceneSlug: 'night-study' });
    rememberCd({ code: 'cdlocal1', editKey: 'k', title: 'Focus mix' });
    const u = userEvent.setup();
    renderAt('/me');
    expect(await screen.findByRole('link', { name: 'Corner desk' })).toHaveAttribute('href', '/r/local111');
    await u.click(screen.getByRole('link', { name: /My CDs/ }));
    expect(await screen.findByRole('link', { name: 'Focus mix' })).toHaveAttribute('href', '/cd/cdlocal1');
    for (const link of screen.getAllByRole('link', { name: 'Make a CD' })) expect(link).toHaveAttribute('href', '/music'); // CDs are made from here too (the menu and the button)
    await u.click(screen.getByRole('link', { name: /My rooms/ }));
    expect(screen.getByRole('link', { name: 'Make a room' })).toHaveAttribute('href', '/me?tab=new'); // rooms are made from here too
    await u.click(screen.getByRole('button', { name: 'Forget Corner desk' }));
    expect(screen.queryByRole('link', { name: 'Corner desk' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('libsic:myRooms'))).toEqual([]);
  });

  it('copies a room\'s share link from its card, and deletes it only after "Yes, delete"', async () => {
    saveMyRoom({ code: 'local111', editKey: 'secret', name: 'Corner desk', sceneSlug: 'night-study' });
    pretendApi({ 'DELETE /api/rooms/local111': () => [204, null] });
    const u = userEvent.setup();
    renderAt('/me');
    await screen.findByRole('link', { name: 'Corner desk' });

    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
    await u.click(screen.getByRole('button', { name: 'Copy link to Corner desk' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/r/local111`);
    expect(await screen.findByRole('button', { name: 'Copy link to Corner desk' })).toHaveTextContent('Link copied');

    await u.click(screen.getByRole('button', { name: 'Delete Corner desk' }));
    expect(calls.some((c) => c.key.startsWith('DELETE'))).toBe(false); // it asks once more first
    await u.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('link', { name: 'Corner desk' })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Delete Corner desk' }));
    await u.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Corner desk' })).not.toBeInTheDocument());
    const sent = calls.find((c) => c.key === 'DELETE /api/rooms/local111');
    expect(sent.options.headers['x-edit-key']).toBe('secret');
    expect(JSON.parse(localStorage.getItem('libsic:myRooms'))).toEqual([]);
  });

  it('the CD workshop and a CD page share the studio menu, and the menu links open the right page of the studio', async () => {
    pretendApi({
      'GET /api/tracks': () => [200, []],
      'GET /api/cds/cdabc123': () => [200, { code: 'cdabc123', title: 'Rainy mix', official: false, trackIds: [], tracks: [], links: [{ provider: 'youtube', url: 'https://www.youtube.com/watch?v=abcdefghijk' }], look: null, updatedAt: '2026-11-20T00:00:00Z' }],
    });
    const u = userEvent.setup();
    const first = renderAt('/music');
    expect(await screen.findByRole('heading', { name: 'Make a CD' })).toBeInTheDocument();
    const menu = within(screen.getByRole('complementary', { name: 'Studio menu' }));
    expect(menu.getByRole('link', { name: 'Make a CD' })).toHaveAttribute('aria-current', 'page');
    expect(menu.getByRole('link', { name: 'My CDs' })).toHaveAttribute('href', '/me?tab=cds');
    expect(menu.getByRole('link', { name: 'Sign in' })).toBeInTheDocument(); // the same menu for a visitor without an account
    first.unmount();

    renderAt('/cd/cdabc123');
    expect(await screen.findByRole('heading', { name: 'Rainy mix' })).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Studio menu' })).getByRole('link', { name: 'My CDs' })).toHaveAttribute('aria-current', 'page');
    await u.click(within(screen.getByRole('complementary', { name: 'Studio menu' })).getByRole('link', { name: 'New room' }));
    expect(await screen.findByRole('link', { name: 'Make a room in Clam Cove' })).toBeInTheDocument(); // /me?tab=new opens that page
  });

  it('a signed-in person with no rooms lands on "New room", and one with rooms on "My rooms"', async () => {
    saveSession({ token: 'a.b.c', user });
    pretendApi({ 'GET /api/auth/me': () => [200, user], 'GET /api/me/rooms': () => [200, []], 'GET /api/me/cds': () => [200, []] });
    renderAt('/me');
    expect(await screen.findByRole('link', { name: 'Make a room in Rainy Night Study' })).toBeInTheDocument();
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
    expect(await screen.findByRole('link', { name: 'Study' })).toHaveAttribute('href', '/r/room1111'); // "My rooms" is the first page
    await u.click(screen.getByRole('link', { name: 'Profile' })); // each item of the menu is its own page
    await u.clear(screen.getByLabelText('Display name'));
    await u.type(screen.getByLabelText('Display name'), 'Night Owl');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /api/auth/me').options.body)).toEqual({ displayName: 'Night Owl', avatarHue: 200 });
    expect(JSON.parse(localStorage.getItem('libsic:user')).displayName).toBe('Night Owl');
  });

  it('picks a disc colour from the swatches and shows the CDs on their own page', async () => {
    saveSession({ token: 'a.b.c', user });
    pretendApi({
      'GET /api/auth/me': () => [200, user],
      'GET /api/me/rooms': () => [200, []],
      'GET /api/me/cds': () => [200, [{ code: 'cd111111', title: 'Rainy mix', look: { hue: 210, cover: 0, disc: 0, font: 0 }, updatedAt: '2026-11-20T00:00:00Z' }]],
      'PATCH /api/auth/me': (body) => [200, { ...user, ...body }],
    });
    const u = userEvent.setup();
    renderAt('/me');
    await u.click(await screen.findByRole('link', { name: 'Profile' }));
    await u.click(await screen.findByRole('radio', { name: 'Colour 335' }));
    expect(screen.getByRole('radio', { name: 'Colour 335' })).toBeChecked();
    await u.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Saved.');
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /api/auth/me').options.body).avatarHue).toBe(335);
    await u.click(screen.getByRole('link', { name: /My CDs/ }));
    expect(await screen.findByRole('link', { name: 'Rainy mix' })).toHaveAttribute('href', '/cd/cd111111');
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    saveSession({ token: 'a.b.c', user });
    pretendApi({ 'GET /api/auth/me': () => [200, user] });
    renderAt('/admin');
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(screen.getAllByRole('heading', { name: 'Page not found' }).length).toBeGreaterThan(0);
    expect(calls.some((c) => c.key.includes('/api/admin/'))).toBe(false); // nothing is even asked
  });

  it('shows totals, finds rooms and deletes a guest room only after its code is typed', async () => {
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

    // Maya's room is private: there is only one Delete button on the page, and the other row shows a lock.
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
    expect(screen.getByText('Private')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Delete' }));
    expect(calls.some((c) => c.key.startsWith('DELETE'))).toBe(false); // the first click only asks
    const sure = screen.getByRole('button', { name: 'Yes, delete' });
    expect(sure).toBeDisabled(); // nothing is typed yet
    await u.type(screen.getByRole('textbox', { name: /Type spam1111/ }), 'spam111');
    expect(sure).toBeDisabled();
    await u.type(screen.getByRole('textbox', { name: /Type spam1111/ }), '1');
    await u.click(sure);
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Buy cheap pills' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Cozy study' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Deleted the room spam1111');
  });

  it('keeps an account\'s CDs private and lets a guest CD go', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/stats': () => [200, { accounts: 3, rooms: 2, roomsThisWeek: 2, customCds: 2, officialCds: 3, roomsPerScene: [] }],
      'GET /api/admin/rooms': () => [200, { total: 0, page: 1, pageSize: 20, items: [] }],
      'GET /api/admin/cds': () => [200, { total: 2, page: 1, pageSize: 20, items: [{ code: 'mine1111', title: 'Maya mix', owned: true, updatedAt: '2026-11-20T00:00:00Z' }, { code: 'free2222', title: 'Guest mix', owned: false, updatedAt: '2026-11-20T00:00:00Z' }] }],
    });
    const u = userEvent.setup();
    renderAt('/admin');
    await u.click(await screen.findByRole('tab', { name: /CDs/ }));
    expect(await screen.findByText('Maya mix')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('deletes an account only after its username is typed, says what went with it, and protects admins', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    let people = [
      { username: 'boss', displayName: '', role: 'admin', createdAt: '2026-11-01T00:00:00Z', rooms: 0 },
      { username: 'maya', displayName: 'Maya', role: 'user', createdAt: '2026-11-02T00:00:00Z', rooms: 3 },
    ];
    pretendApi({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/stats': () => [200, { accounts: 2, rooms: 3, roomsThisWeek: 0, customCds: 1, officialCds: 3, roomsPerScene: [] }],
      'GET /api/admin/rooms': () => [200, { total: 0, page: 1, pageSize: 20, items: [] }],
      'GET /api/admin/users': () => [200, { total: people.length, page: 1, pageSize: 20, items: people }],
      'DELETE /api/admin/users/maya': () => {
        people = people.filter((p) => p.username !== 'maya');
        return [200, { deletedRooms: 3, deletedCds: 1 }];
      },
    });
    const u = userEvent.setup();
    renderAt('/admin');
    await u.click(await screen.findByRole('tab', { name: /Accounts/ }));
    expect(await screen.findByText('maya')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1); // the admin row has none
    expect(screen.getByText('Protected')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/also deletes their 3 rooms and all their CDs/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('button', { name: 'Yes, delete' })).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeDisabled();
    await u.type(screen.getByRole('textbox', { name: /Type maya/ }), 'MAYA');
    await u.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Deleted maya, with 3 rooms and 1 CD.'));
    expect(calls.some((c) => c.key === 'DELETE /api/admin/users/maya' && new URL(c.url).searchParams.get('confirm') === 'maya')).toBe(true);
    expect(screen.queryByText('Maya')).not.toBeInTheDocument();
  });

  it('adds and removes tracks on the studio CDs in the Music tab', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    let tracks = [{ id: 'rain', title: 'Rain', artist: 'Studio', duration: 120 }, { id: 'dusk', title: 'Dusk', artist: 'Studio', duration: 90 }];
    pretendApi({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/stats': () => [200, { accounts: 2, rooms: 0, roomsThisWeek: 0, customCds: 0, officialCds: 1, roomsPerScene: [] }],
      'GET /api/admin/rooms': () => [200, { total: 0, page: 1, pageSize: 20, items: [] }],
      'GET /api/admin/music': () => [200, { cds: [{ code: 'studio01', title: 'Quiet Pages', tracks }] }],
      'POST /api/admin/music/studio01/tracks': (body) => {
        tracks = [...tracks, { id: 'added-1', title: body.title, artist: body.artist, duration: body.duration }];
        return [201, tracks[tracks.length - 1]];
      },
      'DELETE /api/admin/music/studio01/tracks/dusk': () => {
        tracks = tracks.filter((t) => t.id !== 'dusk');
        return [204, null];
      },
    });
    const u = userEvent.setup();
    renderAt('/admin');
    await u.click(await screen.findByRole('tab', { name: /Music/ }));
    expect(await screen.findByText('Rain')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument(); // nothing to search here

    await u.click(screen.getByRole('button', { name: /Add a track/ }));
    const form = screen.getByRole('form', { name: /Add a track to Quiet Pages/ });
    await u.type(within(form).getByLabelText('Title'), 'Slow Tide');
    await u.type(within(form).getByLabelText('Artist'), 'Studio');
    await u.type(within(form).getByLabelText('Link to the audio file'), 'https://cdn.example.com/slow-tide.mp3');
    await u.type(within(form).getByLabelText('Length'), 'long');
    await u.click(within(form).getByRole('button', { name: 'Add track' }));
    expect(await screen.findByText(/like 3:25/)).toBeInTheDocument(); // a bad length is explained, nothing is sent
    expect(calls.some((c) => c.key.startsWith('POST /api/admin/music'))).toBe(false);
    await u.clear(within(form).getByLabelText('Length'));
    await u.type(within(form).getByLabelText('Length'), '3:25');
    await u.click(within(form).getByRole('button', { name: 'Add track' }));
    expect(await screen.findByText('Slow Tide')).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key.startsWith('POST /api/admin/music')).options.body)).toMatchObject({ title: 'Slow Tide', duration: 205, url: 'https://cdn.example.com/slow-tide.mp3' });

    await u.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
    await u.click(screen.getByRole('button', { name: 'Yes, remove' }));
    await waitFor(() => expect(screen.queryByText('Dusk')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Removed “Dusk” from Quiet Pages.');
  });
});

describe('the admin page search', () => {
  const stats = { accounts: 3, rooms: 2, roomsThisWeek: 2, customCds: 1, officialCds: 3, roomsPerScene: [{ sceneSlug: 'golden-loft', rooms: 1 }] };
  const room = { code: 'good2222', name: 'Cozy study', sceneSlug: 'golden-loft', owner: 'maya', updatedAt: '2026-11-21T00:00:00Z' };
  const seen = (what) => calls.filter((c) => c.key === `GET /api/admin/${what}`).map((c) => new URL(c.url).searchParams.get('q'));
  const scenesSeen = (what) => calls.filter((c) => c.key === `GET /api/admin/${what}`).map((c) => new URL(c.url).searchParams.get('scenes'));

  it('a click on a scene card lists the rooms of that scene, and Clear search brings them all back', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/stats': () => [200, stats],
      'GET /api/admin/rooms': () => [200, { total: 1, page: 1, pageSize: 20, items: [room] }],
    });
    const u = userEvent.setup();
    renderAt('/admin');
    await u.click(await screen.findByRole('button', { name: 'Show the rooms in Golden Hour Loft' }));
    expect(await screen.findByText('Golden Hour Loft', { selector: 'b' })).toBeInTheDocument();
    await waitFor(() => expect(seen('rooms')).toContain('Golden Hour Loft'));
    expect(scenesSeen('rooms')).toContain('golden-loft'); // the room stores the slug, so the API gets it too
    expect(screen.getByRole('searchbox')).toHaveValue('Golden Hour Loft');
    await u.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect(screen.queryByText('Golden Hour Loft', { selector: 'b' })).not.toBeInTheDocument());
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('a part of a scene name finds its rooms while typing, and accounts can be searched too', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/stats': () => [200, stats],
      'GET /api/admin/rooms': () => [200, { total: 1, page: 1, pageSize: 20, items: [room] }],
      'GET /api/admin/users': () => [200, { total: 1, page: 1, pageSize: 20, items: [{ username: 'maya', displayName: 'Maya', role: 'user', createdAt: '2026-11-02T00:00:00Z', rooms: 1 }] }],
    });
    const u = userEvent.setup();
    renderAt('/admin');
    await u.type(await screen.findByRole('searchbox'), 'golden'); // no Enter: the list follows the typing
    await waitFor(() => expect(seen('rooms')).toContain('golden'));
    expect(scenesSeen('rooms')).toContain('golden-loft');
    await u.click(screen.getByRole('tab', { name: /Accounts/ }));
    await u.type(screen.getByRole('searchbox'), 'may{Enter}');
    await waitFor(() => expect(seen('users')).toContain('may'));
    expect(await screen.findByText('maya')).toBeInTheDocument();
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
