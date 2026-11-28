// Anonymous visit counting. There are no cookies and nothing is stored in the browser: each call sends one small
// message to our own API (POST /api/visits), which only adds one to a daily total. See the API docs, "Visits".
// Nothing is sent when the visitor has "Do Not Track" or "Global Privacy Control" switched on, or while testing.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

// Which kind of page an address is (room codes and CD codes are never sent).
export function pageKind(pathname) {
  if (pathname === '/') return 'home';
  if (pathname === '/new') return 'new';
  if (pathname.startsWith('/r/')) return 'room';
  if (pathname.startsWith('/cd/')) return 'cd';
  if (pathname === '/music') return 'music';
  return 'other';
}

export function sendVisit(payload, { enabled = import.meta.env.MODE !== 'test', fetcher = globalThis.fetch, nav = globalThis.navigator } = {}) {
  if (!enabled || typeof fetcher !== 'function') return false;
  if (nav?.doNotTrack === '1' || nav?.globalPrivacyControl === true) return false;
  try {
    fetcher(`${API_URL}/api/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {}); // counting must never get in the way of the page
  } catch {
    return false;
  }
  return true;
}

export const trackPage = (pathname, options) => sendVisit({ page: pageKind(pathname) }, options);
export const trackScene = (slug, options) => sendVisit({ page: 'scene', scene: slug }, options);
