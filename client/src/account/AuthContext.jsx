// Part of: Accounts: who is signed in, shared by every page.
// Uses: auth.js, api.js.
// Used by: main.jsx (the provider), LoginPage.jsx, ProfilePage.jsx, AdminPage.jsx, HomePage.jsx, GoTo.jsx.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login, register, updateMe } from '../api.js';
import { SIGNED_OUT_EVENT, clearSession, getCachedUser, getToken, saveSession, setCachedUser } from '../auth.js';

// Without a provider (small tests) everybody is simply signed out.
const SIGNED_OUT = {
  user: null,
  checking: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
  saveProfile: async () => {},
};
const AuthContext = createContext(SIGNED_OUT);

// user = { username, displayName, avatarHue, role } or null. It is shown at once from the copy kept in the browser;
// the API is asked in the background whether the token is still good (checking = true meanwhile). A token that has
// expired signs out quietly; a server that cannot be reached keeps the person signed in.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCachedUser);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setChecking(false);
      return undefined;
    }
    getMe()
      .then((me) => {
        if (cancelled) return;
        setCachedUser(me);
        setUser(me);
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) clearSession();
      })
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // clearSession() (sign out, or an expired token seen by api.js) announces itself so every screen updates.
  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener(SIGNED_OUT_EVENT, out);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, out);
  }, []);

  const start = useCallback(async (call, username, password) => {
    const session = await call(username, password);
    saveSession(session);
    setUser(session.user);
    return session.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      checking,
      signIn: (username, password) => start(login, username, password),
      signUp: (username, password) => start(register, username, password),
      signOut: () => {
        clearSession();
        setUser(null);
      },
      saveProfile: async (changes) => {
        const me = await updateMe(changes);
        setCachedUser(me);
        setUser(me);
        return me;
      },
    }),
    [user, checking, start]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
