import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import GoTo from './GoTo.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { saveSession } from '../auth.js';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const admin = { username: 'boss', displayName: '', avatarHue: 38, role: 'admin', createdAt: '2026-11-01T00:00:00Z' };
const normal = { ...admin, username: 'maya', role: 'user' };

function pretendApi(me) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url, options = {}) => {
      const path = String(url).replace('http://localhost:4000', '').split('?')[0];
      if (path === '/api/auth/me') return reply(200, me);
      if (path === '/api/admin/stats') return reply(200, { accounts: 1, rooms: 2, roomsThisWeek: 0, customCds: 0, officialCds: 3, roomsPerScene: [] });
      if (path.startsWith('/api/admin/')) return reply(200, { total: 0, page: 1, pageSize: 20, items: [] });
      if (path.startsWith('/api/me/')) return reply(200, []);
      return reply(404, { error: 'nothing here' });
    })
  );
}
const renderAt = (path, ui = <App />) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('getting to the admin page and back', () => {
  it('the start page shows an Admin button to admins, which opens the admin page, and Back to app returns', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi(admin);
    const u = userEvent.setup();
    renderAt('/');
    await u.click(screen.getByRole('link', { name: 'Admin' }));
    expect(await screen.findByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: /Back to app/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Libsic Studio' })).toBeInTheDocument();
  });

  it('a normal account sees no Admin button', async () => {
    saveSession({ token: 'a.b.c', user: normal });
    pretendApi(normal);
    renderAt('/');
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('the room side bar chip offers an Admin page button to admins only', () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi(admin);
    const first = renderAt('/r/abc12345', <GoTo />);
    expect(screen.getByRole('link', { name: 'Admin page' })).toHaveAttribute('href', '/admin');
    first.unmount();
    localStorage.clear();
    saveSession({ token: 'a.b.c', user: normal });
    renderAt('/r/abc12345', <GoTo />);
    expect(screen.queryByRole('link', { name: 'Admin page' })).not.toBeInTheDocument();
  });

  it('Back to app ignores a from-address that leads outside this site', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi(admin);
    render(
      <MemoryRouter initialEntries={[{ pathname: '/admin', state: { from: '//evil.example' } }]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByRole('link', { name: /Back to app/ })).toHaveAttribute('href', '/');
  });

  it('Back to app goes to the room the admin came from', async () => {
    saveSession({ token: 'a.b.c', user: admin });
    pretendApi(admin);
    render(
      <MemoryRouter initialEntries={[{ pathname: '/admin', state: { from: '/r/abc12345?x=1' } }]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByRole('link', { name: /Back to app/ })).toHaveAttribute('href', '/r/abc12345?x=1');
  });
});
