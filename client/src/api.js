// Part of: The link to the API: every request goes through here (one function per endpoint, see api/src/routes).
// Used by: account/*.jsx, pages/*.jsx, CdEditor.jsx, CdPage.jsx, CdRow.jsx, ExternalMusic.jsx, MusicPage.jsx, RoomScreen.jsx.
// Every call to our API goes through here. API address: VITE_API_URL (live site), else http://localhost:4000.
import { clearSession, getToken } from './auth.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // HTTP status (404...), or 0 when the server could not be reached
  }
}

// Addresses where a 401 means "your login is no longer good" (elsewhere a 401 just means the edit key is missing).
const SIGN_IN_PATHS = ['/api/auth/me', '/api/me/', '/api/admin/'];

// Returns the JSON answer (null for 204). Throws ApiError with a readable message: the API's "details" first, then "error".
// When someone is signed in, their token goes along in the Authorization header (and nowhere else). A header whose value is empty is left out.
export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const sent = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers };
  for (const name of Object.keys(sent)) if (!sent[name]) delete sent[name];
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers: sent, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }
  if (!res.ok) {
    if (res.status === 401 && token && SIGN_IN_PATHS.some((p) => path.startsWith(p))) clearSession(); // expired token: sign out quietly
    const data = await res.json().catch(() => ({}));
    const details = data.details ? Object.values(data.details).join('. ') : '';
    throw new ApiError(details || data.error || `Request failed (${res.status})`, res.status);
  }
  return res.status === 204 ? null : res.json(); // 204 = success with nothing to send back
}

// The menu of scenes (slug, name, description), and one whole scene with its layers and objects.
export const getScenes = () => request('/api/scenes');
export const getScene = (slug) => request(`/api/scenes/${encodeURIComponent(slug)}`);

// Rooms. createRoom returns { room, editKey }: save the editKey at once, the API never shows it again.
// update/delete need that key (sent as the x-edit-key header).
export const getRoom = (code) => request(`/api/rooms/${encodeURIComponent(code)}`);
export const createRoom = (data) => request('/api/rooms', { method: 'POST', body: data });
export const updateRoom = (code, editKey, data) =>
  request(`/api/rooms/${encodeURIComponent(code)}`, { method: 'PUT', body: data, headers: { 'x-edit-key': editKey } });
export const deleteRoom = (code, editKey) =>
  request(`/api/rooms/${encodeURIComponent(code)}`, { method: 'DELETE', headers: { 'x-edit-key': editKey } });

// Music: our own tracks and CDs (createCd also returns a one-time editKey), plus helpers for online links.
export const getTracks = () => request('/api/tracks');
export const resolveMusicLink = (url) => request('/api/music/resolve', { method: 'POST', body: { url } });
export const getSoundcloudMetadata = (ids) => request('/api/music/soundcloud/metadata', { method: 'POST', body: { ids } });
export const getTrack = (id) => request(`/api/tracks/${encodeURIComponent(id)}`);
export const getCds = () => request('/api/cds');
export const getCd = (code) => request(`/api/cds/${encodeURIComponent(code)}`);
export const createCd = (data) => request('/api/cds', { method: 'POST', body: data });
export const updateCd = (code, editKey, data) =>
  request(`/api/cds/${encodeURIComponent(code)}`, { method: 'PUT', body: data, headers: { 'x-edit-key': editKey } });
export const deleteCd = (code, editKey) =>
  request(`/api/cds/${encodeURIComponent(code)}`, { method: 'DELETE', headers: { 'x-edit-key': editKey } });

// Accounts (optional). register and login answer { token, user }; auth.js keeps the token. Nothing here is ever logged.
export const register = (username, password) => request('/api/auth/register', { method: 'POST', body: { username, password } });
export const login = (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } });
export const getMe = () => request('/api/auth/me');
export const updateMe = (changes) => request('/api/auth/me', { method: 'PATCH', body: changes });
// The signed-in person's own rooms and CDs, and moving rooms saved as a guest onto the account (each needs its edit key).
export const getAccountRooms = () => request('/api/me/rooms');
export const getAccountCds = () => request('/api/me/cds');
export const claimMine = (rooms, cds) => request('/api/me/claim', { method: 'POST', body: { rooms, cds } });

// Admin only (the API answers 403 to anyone else). Search text and page number go in the address; never anything private.
export const adminStats = () => request('/api/admin/stats');
export const adminList = (what, { q = '', page = 1, scenes = [] } = {}) =>
  request(`/api/admin/${what}?${new URLSearchParams({ ...(q ? { q } : {}), ...(q && scenes.length ? { scenes: scenes.join(',') } : {}), page: String(page) })}`);
// Deletes a guest's room or CD (the API refuses ones that belong to an account).
export const adminDelete = (what, code) => request(`/api/admin/${what}/${encodeURIComponent(code)}`, { method: 'DELETE' });
// Deletes an account with all its rooms and CDs. The username is sent again as the confirmation. Returns { deletedRooms, deletedCds }.
export const adminDeleteUser = (username) => request(`/api/admin/users/${encodeURIComponent(username)}?${new URLSearchParams({ confirm: username })}`, { method: 'DELETE' });
// The studio's own music: the official CDs with their tracks, adding a track ({ title, artist, url, duration in seconds }), removing one.
export const adminMusic = () => request('/api/admin/music');
export const adminAddTrack = (code, track) => request(`/api/admin/music/${encodeURIComponent(code)}/tracks`, { method: 'POST', body: track });
export const adminRemoveTrack = (code, id) => request(`/api/admin/music/${encodeURIComponent(code)}/tracks/${encodeURIComponent(id)}`, { method: 'DELETE' });
