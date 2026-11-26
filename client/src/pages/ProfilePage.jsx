// Part of: Profile page (/me): the person's name and disc colour, their rooms and CDs on any device, and Sign out.
// Uses: AuthContext.jsx, api.js, introRooms.js, account.css.
// Used by: App.jsx.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../account/AuthContext.jsx';
import { discColor } from '../account/discColor.js';
import { getAccountCds, getAccountRooms } from '../api.js';
import { INTRO_ROOMS } from '../introRooms.js';
import '../account/account.css';

const sceneName = (slug) => INTRO_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

export default function ProfilePage() {
  const { user, checking, saveProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [hue, setHue] = useState(user?.avatarHue ?? 38);
  const [note, setNote] = useState(null); // { kind: 'ok' | 'error', text }
  const [rooms, setRooms] = useState(null); // null = loading, 'error' = could not load
  const [cds, setCds] = useState(null);
  const leaving = useRef(false); // true after "Sign out": the page must not send the person on to the login page

  const who = user?.username;
  useEffect(() => {
    if (!who) return undefined;
    let cancelled = false;
    getAccountRooms().then((list) => !cancelled && setRooms(list)).catch(() => !cancelled && setRooms('error'));
    getAccountCds().then((list) => !cancelled && setCds(list)).catch(() => !cancelled && setCds('error'));
    return () => {
      cancelled = true;
    };
  }, [who]);

  if (!user && leaving.current) return null;
  if (!user) return checking ? <main className="account-page"><p className="account-muted">One moment…</p></main> : <Navigate to="/login?next=/me" replace />;

  async function save(e) {
    e.preventDefault();
    setNote(null);
    try {
      await saveProfile({ displayName: displayName.trim(), avatarHue: hue });
      setNote({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      setNote({ kind: 'error', text: err.message });
    }
  }
  const leave = () => {
    leaving.current = true;
    signOut();
    navigate('/');
  };
  const list = (items, link, label) =>
    items === null ? <p className="account-muted">Loading…</p>
    : items === 'error' ? <p className="account-muted">Could not load this list. Try again in a moment.</p>
    : items.length === 0 ? <p className="account-muted">{label}</p>
    : (
      <ul className="account-list">
        {items.map((item) => (
          <li key={item.code}>
            <Link to={link(item)}>{item.name ?? item.title}</Link>
            {item.sceneSlug && <span>{sceneName(item.sceneSlug)}</span>}
          </li>
        ))}
      </ul>
    );

  return (
    <main className="account-page">
      <Link className="account-back" to="/">← Libsic Studio</Link>
      <header className="account-head">
        <i className="account-disc big" style={{ '--disc': discColor(hue) }} aria-hidden="true" />
        <div>
          <h1>{user.displayName || user.username}</h1>
          <p className="account-muted">@{user.username}{user.role === 'admin' && <> · <Link to="/admin">Admin</Link></>}</p>
        </div>
      </header>

      <section aria-labelledby="profile-h">
        <h2 id="profile-h">Profile</h2>
        <form className="account-form" onSubmit={save}>
          <label htmlFor="profile-name">Display name</label>
          <input id="profile-name" type="text" maxLength={30} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={user.username} />
          <label htmlFor="profile-hue">Disc colour</label>
          <input id="profile-hue" className="account-hue" type="range" min="0" max="359" value={hue} onChange={(e) => setHue(Number(e.target.value))} />
          <div className="account-row">
            <button type="submit" className="account-button">Save</button>
            {note && <span role="status" className={`account-note ${note.kind}`}>{note.text}</span>}
          </div>
        </form>
      </section>

      <section aria-labelledby="rooms-h">
        <h2 id="rooms-h">My rooms</h2>
        {list(rooms, (r) => `/r/${r.code}`, 'No rooms on this account yet. Save a room while signed in and it appears here.')}
      </section>
      <section aria-labelledby="cds-h">
        <h2 id="cds-h">My CDs</h2>
        {list(cds, (c) => `/cd/${c.code}`, 'No CDs on this account yet.')}
      </section>

      <button type="button" className="account-button quiet" onClick={leave}>Sign out</button>
    </main>
  );
}
