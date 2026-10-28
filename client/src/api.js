// All calls to our API go through this file, so the address lives in one place.
// While developing, the API runs on your own computer. For the live site, set VITE_API_URL.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // for example 404
  }
}

// Sends a request and returns the JSON answer. Throws an ApiError with a readable message when it fails.
export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return res.status === 204 ? null : res.json(); // 204 = success with nothing to send back
}

export const getScenes = () => request('/api/scenes');
export const getScene = (slug) => request(`/api/scenes/${encodeURIComponent(slug)}`);

// Rooms. Creating a room returns { room, editKey }; keep the editKey, it is shown only once.
export const getRoom = (code) => request(`/api/rooms/${encodeURIComponent(code)}`);
export const createRoom = (data) => request('/api/rooms', { method: 'POST', body: data });
export const updateRoom = (code, editKey, data) =>
  request(`/api/rooms/${encodeURIComponent(code)}`, { method: 'PUT', body: data, headers: { 'x-edit-key': editKey } });
export const deleteRoom = (code, editKey) =>
  request(`/api/rooms/${encodeURIComponent(code)}`, { method: 'DELETE', headers: { 'x-edit-key': editKey } });
