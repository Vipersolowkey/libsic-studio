// Part of: Accounts: remembers who is signed in, in this browser.
// Used by: api.js, account/AuthContext.jsx.
// The login token and a small copy of the profile live in localStorage. The token is only ever sent in the
// Authorization header of requests to our own API (api.js), never in an address, never to analytics or the console.
// Every function survives blocked storage (it acts as if nobody is signed in).
const TOKEN_KEY = 'libsic:token';
const USER_KEY = 'libsic:user';
export const SIGNED_OUT_EVENT = 'libsic:signed-out';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage is optional: the person is then signed in until they close the tab */
  }
}
function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

export const getToken = () => read(TOKEN_KEY) || null;

// The copy of the profile kept for a fast first paint. Only counts when a token is saved with it, and is picked field by field.
export function getCachedUser() {
  if (!getToken()) return null;
  try {
    const user = JSON.parse(read(USER_KEY));
    if (!user || typeof user.username !== 'string') return null;
    return {
      username: user.username,
      displayName: typeof user.displayName === 'string' ? user.displayName : '',
      avatarHue: Number.isInteger(user.avatarHue) ? user.avatarHue : 38,
      role: user.role === 'admin' ? 'admin' : 'user',
    };
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  write(USER_KEY, JSON.stringify({ username: user.username, displayName: user.displayName, avatarHue: user.avatarHue, role: user.role }));
}

// Called after sign up or sign in with the API's answer { token, user }.
export function saveSession({ token, user }) {
  write(TOKEN_KEY, token);
  setCachedUser(user);
}

// Sign out: forgets the token and the profile copy. Tells the app (this tab) so the buttons change at once.
export function clearSession() {
  const was = Boolean(read(TOKEN_KEY));
  remove(TOKEN_KEY);
  remove(USER_KEY);
  if (was) window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
}
