// Music links a visitor pasted (or opened with a shared room) are kept in this browser, so they stay on the shelf and can
// be played again later. Only the provider and the link are kept, at most 12 of them, the newest first.
const KEY = 'libsic.links';
const MAX = 12;
const PROVIDER = { soundcloud: 'SoundCloud', spotify: 'Spotify', youtube: 'YouTube', audio: 'Audio' };

export function getMyLinks() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((l) => l && typeof l.url === 'string' && typeof l.provider === 'string') : [];
  } catch {
    return [];
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* the shelf just forgets it next time */ }
  return list;
}

// Puts a link first in the list (a link that is already there moves up). Returns the new list.
export function rememberLink(source) {
  if (!source?.url || !source.provider) return getMyLinks();
  const rest = getMyLinks().filter((l) => l.url !== source.url);
  return save([{ provider: source.provider, url: source.url }, ...rest].slice(0, MAX));
}

export function forgetLink(url) {
  return save(getMyLinks().filter((l) => l.url !== url));
}

const nice = (text) => decodeURIComponent(text).replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

// A readable name for a link, worked out from the link itself.
export function linkTitle({ provider, url }) {
  const name = PROVIDER[provider] || 'Music';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (provider === 'soundcloud' && parts.length) return nice(parts[parts.length - 1]).slice(0, 40) || name;
    if (provider === 'spotify') return `Spotify ${['playlist', 'album', 'track', 'artist', 'show', 'episode'].find((k) => parts.includes(k)) || 'music'}`;
    if (provider === 'youtube') return u.searchParams.has('list') ? 'YouTube playlist' : 'YouTube video';
    if (provider === 'audio' && parts.length) return nice(parts[parts.length - 1].replace(/\.[a-z0-9]{2,4}$/i, '')).slice(0, 40) || name;
    return u.hostname || name;
  } catch {
    return name;
  }
}

export const providerName = (provider) => PROVIDER[provider] || 'Music';
