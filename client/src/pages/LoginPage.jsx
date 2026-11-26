// Part of: Sign in / create account page (/login). Accounts are optional: "Continue without an account" is always there.
// Uses: AuthContext.jsx, introRooms.js, login.css.
// Used by: App.jsx.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../account/AuthContext.jsx';
import { INTRO_ROOMS } from '../introRooms.js';
import '../account/login.css';

const LEAVE_MS = 800; // length of the dive after signing in; must match .login.leaving in login.css
const DRIFT_MS = 9000; // how long each room stays behind the card
const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// ?next=/some/page brings the person back after signing in. Only addresses inside this site are accepted (no //evil.com, no https://...).
export function safeNext(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) && !/[\u0000-\u001f]/.test(value) ? value : '/';
}

// The card takes the look of the room behind it (data-room, see login.css). The rooms drift by themselves, but stand
// still while someone is typing. The form never puts anything in the address: the password only travels in the request body.
export default function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState(params.get('mode') === 'create' ? 'up' : 'in');
  const [active, setActive] = useState(0);
  const [typing, setTyping] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const alreadyIn = useRef(Boolean(user)); // someone who is already signed in has nothing to do here
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (typing || reducedMotion()) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % INTRO_ROOMS.length), DRIFT_MS);
    return () => clearInterval(id);
  }, [typing]);

  if (alreadyIn.current) return <Navigate to={next} replace />;

  const creating = mode === 'up';
  const room = INTRO_ROOMS[active];

  async function submit(e) {
    e.preventDefault();
    if (busy || leaving) return;
    setError('');
    if (!username.trim() || !password) {
      setError('Type a username and a password.');
      return;
    }
    setBusy(true);
    try {
      await (creating ? signUp : signIn)(username.trim(), password);
      setLeaving(true);
      timer.current = setTimeout(() => navigate(next, { replace: true }), reducedMotion() ? 0 : LEAVE_MS);
    } catch (err) {
      setError(err.message);
      setPassword(''); // a wrong password is not kept around
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (nextMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
  };

  return (
    <main className={`login${leaving ? ' leaving' : ''}`} data-room={room.slug}>
      <div className="intro-bg" aria-hidden="true">
        {INTRO_ROOMS.map((r, i) => (
          <div key={r.slug} className={`intro-slide${i === active ? ' on' : ''}`}>
            <img src={`/scenes/${r.slug}/intro.webp`} alt="" draggable={false} style={{ '--kb': i }} onError={(e) => (e.target.style.visibility = 'hidden')} />
          </div>
        ))}
      </div>
      <div className="intro-shade" aria-hidden="true" />

      <section className="login-card" aria-labelledby="login-title">
        <Link className="login-brand" to="/" aria-label="Libsic Studio, back to the start page">
          <span className="login-disc" aria-hidden="true"><i /></span>
          <span>LIBSIC <small>STUDIO</small></span>
        </Link>

        <div className="login-tabs" role="tablist" aria-label="Sign in or create an account">
          <button type="button" role="tab" aria-selected={!creating} onClick={() => switchTo('in')}>Sign in</button>
          <button type="button" role="tab" aria-selected={creating} onClick={() => switchTo('up')}>Create account</button>
        </div>

        <h1 id="login-title">{creating ? 'Make your account' : 'Welcome back'}</h1>

        <form method="post" action="#" onSubmit={submit} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} noValidate>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {creating && <p className="login-hint">3 to 20 letters, numbers or underscores.</p>}

          <label htmlFor="login-password">Password</label>
          <div className="login-password">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={creating ? 'new-password' : 'current-password'}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {creating && <p className="login-hint">At least 8 characters. No email, so a lost password cannot be reset.</p>}

          <p className="login-error" role="alert">{error}</p>
          <button className="login-submit" type="submit" disabled={busy || leaving}>
            {busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <Link className="login-skip" to={next}>Continue without an account</Link>
      </section>
    </main>
  );
}
