// Part of: Admin page (/admin): totals, looking things up, deleting accounts and guests' spam, and the studio's music. Only accounts with the admin role can see it.
// What people make is private to them: an admin only looks at rooms and CDs that belong to an account (the way to remove them is to delete the account,
// which asks for the username to be typed). Rooms and CDs made by guests can be deleted, after typing their code. The Music tab is the studio's own library.
// The page is laid out like a music app: a menu down the left (with an icon for each item and the current one lit), a search bar
// on top, the rooms of the app as picture cards, and a numbered list with small pictures. It wears the colours and fonts of the
// room side bar (see account/admin.css). Every function is the same as before; only the look is new.
// Uses: AuthContext.jsx, api.js, admin.css.
// Used by: App.jsx.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../account/AuthContext.jsx';
import { adminDelete, adminDeleteUser, adminList, adminStats } from '../api.js';
import { INTRO_ROOMS } from '../introRooms.js';
import { Ico } from '../account/AdminIcon.jsx';
import AdminMusic from './AdminMusic.jsx';
import '../account/admin.css';

// Everybody else (signed out, or a normal account) is shown the same page as for an address that does not exist.
const NotFound = () => (
  <main className="message-page">
    <h1>Page not found</h1>
    <Link to="/">Back to the start page</Link>
  </main>
);

// The friendly name of a scene, from the start page's list (an old scene that is not in it keeps its slug).
const SCENE_NAME = Object.fromEntries(INTRO_ROOMS.map((r) => [r.slug, r.name]));
const sceneName = (slug) => SCENE_NAME[slug] ?? slug;
// The slug of the scene a search text names in full ("Clam Cove", or a slug), to light its card; '' when it names none.
const slugOfName = (text) => Object.keys(SCENE_NAME).find((slug) => SCENE_NAME[slug].toLowerCase() === text.trim().toLowerCase() || slug === text.trim()) ?? (text.trim() ? text.trim() : '');
// A scene's small picture. A picture that is missing just hides itself.
const hideBroken = (e) => { e.currentTarget.style.visibility = 'hidden'; };

// What is counted in "3 CDs in total", for one and for many.
const TOTAL_NOUN = { rooms: ['room', 'rooms'], cds: ['CD', 'CDs'], users: ['account', 'accounts'] };

const day = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');

// A steady colour for a word (a scene, a CD title, a username), so its coloured dot always stays the same.
const hueOf = (word = '') => [...String(word)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 17);

// What each tab shows. "kinds" says how each column is printed: label = the name (followed by a dotted line),
// chip = a coloured scene name, who = an owner, mono = a number or date, text = plain.
const TABS = {
  rooms: {
    label: 'Rooms',
    icon: 'room',
    columns: ['Name', 'Scene', 'Owner', 'Updated'],
    kinds: ['label', 'chip', 'who', 'mono'],
    row: (r) => [r.name, sceneName(r.sceneSlug), r.owner ?? 'guest', day(r.updatedAt)],
    hue: (r) => hueOf(r.sceneSlug),
    link: (r) => `/r/${r.code}`,
  },
  cds: {
    label: 'CDs',
    icon: 'disc',
    columns: ['Title', 'Owner', 'Updated'],
    kinds: ['label', 'who', 'mono'],
    row: (c) => [c.title, c.owned ? 'account' : 'guest', day(c.updatedAt)],
    hue: (c) => hueOf(c.title),
    link: (c) => `/cd/${c.code}`,
  },
  users: {
    label: 'Accounts',
    icon: 'user',
    columns: ['Username', 'Name', 'Rooms', 'Joined'],
    kinds: ['label', 'text', 'mono', 'mono'],
    row: (u) => [u.username, u.displayName, String(u.rooms), day(u.createdAt)],
    hue: (u) => hueOf(u.username),
  },
  music: { label: 'Music', icon: 'note' }, // not a list: it has its own panel (AdminMusic.jsx)
};

// Who may be deleted from the lists, what is typed to confirm, and what the question says.
const RULES = {
  rooms: {
    allowed: (r) => !r.owner,
    word: (r) => r.code,
    lockedWhy: 'Made by an account, so it is private. Delete the account to remove it.',
    ask: (r) => <>This guest room has no account. Type its code <code>{r.code}</code> to delete it. This cannot be undone.</>,
  },
  cds: {
    allowed: (c) => !c.owned,
    word: (c) => c.code,
    lockedWhy: 'Made by an account, so it is private. Delete the account to remove it.',
    ask: (c) => <>This guest CD has no account. Type its code <code>{c.code}</code> to delete it. This cannot be undone.</>,
  },
  users: {
    allowed: (u) => u.role !== 'admin',
    word: (u) => u.username,
    lockedWhy: 'Admin accounts cannot be deleted here.',
    ask: (u) => <>Deleting <b>{u.username}</b> also deletes their {u.rooms === 1 ? '1 room' : `${u.rooms} rooms`} and all their CDs. Type <code>{u.username}</code> to confirm. This cannot be undone.</>,
  },
};
const LOCK_WORD = { rooms: 'Private', cds: 'Private', users: 'Protected' };

// The scenes whose name contains what was typed ("clam" gives Clam Cove). A room stores only the slug of its scene, so the API needs it.
const scenesNamed = (text) => {
  const part = text.trim().toLowerCase();
  return part.length < 2 ? [] : INTRO_ROOMS.filter((r) => r.name.toLowerCase().includes(part)).map((r) => r.slug);
};

function Table({ what, search, onChanged }) {
  const tab = TABS[what];
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(null); // the code (or username) waiting for its typed confirmation
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const rule = RULES[what];
  const idOf = (item) => item.code ?? item.username;

  // Esc cancels a delete question.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setAsking(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(() => {
    setError('');
    return adminList(what, { q: search, page, scenes: what === 'rooms' ? scenesNamed(search) : [] }).then(setData).catch((err) => setError(err.message));
  }, [what, search, page]);
  useEffect(() => {
    load();
  }, [load]);

  const ask = (item) => {
    setTyped('');
    setAsking(idOf(item));
  };

  async function remove(item) {
    try {
      if (what === 'users') {
        const gone = await adminDeleteUser(item.username);
        const rooms = gone?.deletedRooms ?? 0;
        const cds = gone?.deletedCds ?? 0;
        setNote(`Deleted ${item.username}, with ${rooms} ${rooms === 1 ? 'room' : 'rooms'} and ${cds} ${cds === 1 ? 'CD' : 'CDs'}.`);
      } else {
        await adminDelete(what, item.code);
        setNote(`Deleted ${what === 'rooms' ? 'the room' : 'the CD'} ${item.code}.`);
      }
      setAsking(null);
      await load();
      onChanged?.();
    } catch (err) {
      setNote('');
      setError(err.message);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <p role="alert" className="adm-alert">{error}</p>
      <p role="status" className="adm-note">{note}</p>
      {!data && !error && <p className="adm-empty">Loading…</p>}
      {data && (
        <>
          <div className={`adm-list adm-list-${what}`} role="table" aria-label={tab.label}>
            <div role="rowgroup">
              <div className="adm-row adm-thead" role="row">
                <span role="columnheader">#</span>
                {tab.columns.map((c) => <span key={c} role="columnheader">{c}</span>)}
                <span role="columnheader"><span className="sr-only">Actions</span></span>
              </div>
            </div>
            <div role="rowgroup">
              {data.items.map((item, n) => {
                const cells = tab.row(item);
                const armed = asking === idOf(item);
                const matches = armed && typed.trim().toLowerCase() === rule.word(item).toLowerCase();
                return (
                  <div key={idOf(item)} className={`adm-row${armed ? ' armed' : ''}`} role="row" style={{ '--hue': tab.hue(item) }}>
                    <span role="cell" className="cell cell-num">{String((page - 1) * data.pageSize + n + 1).padStart(2, '0')}</span>
                    {cells.map((cell, i) => {
                      const kind = tab.kinds[i];
                      let inner = cell || '—';
                      if (kind === 'label') {
                        inner = (
                          <>
                            <span className={`adm-tile${what === 'rooms' ? ' adm-thumb' : ''}`} aria-hidden="true">
                              <Ico n={tab.icon} />
                              {what === 'rooms' && <img src={`/scenes/${item.sceneSlug}/preview.webp`} alt="" loading="lazy" draggable={false} onError={hideBroken} />}
                            </span>
                            <span className="adm-name">{i === 0 && tab.link ? <Link to={tab.link(item)}>{cell}</Link> : cell}</span>
                            {item.role === 'admin' && <em className="adm-badge">admin</em>}
                          </>
                        );
                      } else if (kind === 'chip') inner = <span className="adm-chip-dot">{cell}</span>;
                      else if (kind === 'who') inner = <span className={`adm-who${cell === 'guest' ? ' guest' : ''}`}>{cell}</span>;
                      return (
                        <span key={i} role="cell" className={`cell cell-${kind}`} data-label={tab.columns[i]}>
                          {inner}
                        </span>
                      );
                    })}
                    <span role="cell" className="cell cell-actions">
                      {!rule.allowed(item) ? (
                        <span className="adm-locked" title={rule.lockedWhy}><Ico n="lock" />{LOCK_WORD[what]}</span>
                      ) : (
                        !armed && <button type="button" className="adm-btn del" onClick={() => ask(item)}>Delete</button>
                      )}
                    </span>
                    {armed && (
                      <form className="adm-confirm" role="cell" onSubmit={(e) => { e.preventDefault(); if (matches) remove(item); }}>
                        <label>
                          <span>{rule.ask(item)}</span>
                          <input autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={`Type ${rule.word(item)} to confirm`} />
                        </label>
                        <span className="adm-confirm-btns">
                          <button type="submit" className="adm-btn hot" disabled={!matches}>Yes, delete</button>
                          <button type="button" className="adm-btn" onClick={() => setAsking(null)}>Keep it</button>
                        </span>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {data.items.length === 0 && <p className="adm-empty">Nothing found.</p>}
          <div className="adm-pager">
            <button type="button" className="adm-btn adm-page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}><Ico n="prev" />Previous</button>
            <span className="adm-info">Page <b>{page}</b> of <b>{pages}</b></span>
            <button type="button" className="adm-btn adm-page-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next<Ico n="next" /></button>
            <span className="adm-total">{data.total} {data.total === 1 ? TOTAL_NOUN[what][0] : TOTAL_NOUN[what][1]} in total</span>
          </div>
        </>
      )}
    </>
  );
}

// ----- The totals: the icon of the thing it counts, its name, and the number ----- //
// One number: an icon on the left, the name, the number, and (when there is one) a short line that puts it in context.
function Stat({ label, value, icon, note }) {
  return (
    <li className="adm-stat">
      <span className="adm-stat-icon" aria-hidden="true"><Ico n={icon} /></span>
      <span className="adm-stat-body">
        <span className="adm-stat-name">{label}</span>
        <strong className="adm-stat-value">{value ?? '–'}</strong>
        {note && <span className="adm-stat-note">{note}</span>}
      </span>
    </li>
  );
}

// The rooms of the app as picture cards: each scene with its own picture, its name, how many rooms use it and its share of all rooms.
// Every scene of the start page is shown (a scene nobody uses shows 0); an old scene that is not in that list is added at the end.
function SceneChips({ scenes, current, onPick }) {
  const counts = new Map(scenes.map((s) => [s.sceneSlug, s.rooms]));
  const slugs = [...INTRO_ROOMS.map((r) => r.slug), ...scenes.map((s) => s.sceneSlug).filter((slug) => !SCENE_NAME[slug])];
  const total = Math.max(1, scenes.reduce((sum, s) => sum + s.rooms, 0));
  return (
    <ul className="adm-scenes" aria-label="Rooms per scene" style={{ '--n': slugs.length }}>
      {slugs.map((slug) => {
        const rooms = counts.get(slug) ?? 0;
        return (
          <li key={slug} className={`${rooms === 0 ? 'empty ' : ''}${current === slug ? 'current' : ''}`} style={{ '--hue': hueOf(slug) }}>
            <button type="button" className="adm-card" aria-label={`Show the rooms in ${sceneName(slug)}`} aria-pressed={current === slug} onClick={() => onPick(slug)}>
              <img src={`/scenes/${slug}/preview.webp`} alt="" loading="lazy" draggable={false} onError={hideBroken} />
              <span className="adm-card-plate">
                <span className="adm-card-text">
                  <span className="adm-scene-name">{sceneName(slug)}</span>
                  <span className="adm-pct">{Math.round((100 * rooms) / total)}% of rooms</span>
                </span>
                <b className="adm-count">{rooms}</b>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Where "Back to app" goes: the page the admin came from (passed along by the Admin buttons), else the start page.
// Only addresses inside this site are accepted.
const backTo = (from) => (typeof from === 'string' && /^\/(?![/\\])/.test(from) ? from : '/');

export default function AdminPage() {
  const { user, checking } = useAuth();
  const { state } = useLocation();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('rooms');
  const [q, setQ] = useState(''); // what is typed in the search bar
  const [search, setSearch] = useState(''); // what was searched for
  const [error, setError] = useState('');
  const searchBox = useRef(null);
  const isAdmin = user?.role === 'admin';

  // The list follows what is typed (a moment after the last key), so a part of a word is enough. Enter and the button search at once.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    adminStats().then((s) => !cancelled && setStats(s)).catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // "/" jumps to the search bar (unless you are already typing somewhere).
  useEffect(() => {
    if (!isAdmin) return undefined;
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '') || e.target?.isContentEditable;
      if (e.key === '/' && !typing && searchBox.current) {
        e.preventDefault();
        searchBox.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdmin]);

  if (!isAdmin) return checking && user ? <main className="account-page"><p className="account-muted">One moment…</p></main> : <NotFound />;

  // Every page of the menu shows its own numbers, so Rooms, CDs, Accounts and Music do not look alike.
  const share = (part, whole, noun) => (whole ? `${Math.round((100 * part) / whole)}% of all ${noun}` : '');
  const sceneCount = stats?.roomsPerScene?.length ?? 0;
  const tilesOf = {
    rooms: [['Rooms', stats?.rooms, 'room', `in ${sceneCount} ${sceneCount === 1 ? 'scene' : 'scenes'}`], ['New rooms this week', stats?.roomsThisWeek, 'spark', share(stats?.roomsThisWeek, stats?.rooms, 'rooms')]],
    cds: [['CDs made by visitors', stats?.customCds, 'discPlus', 'account CDs stay private'], ['Studio CDs', stats?.officialCds, 'discTick', 'managed in the Music tab']],
    users: [['Accounts', stats?.accounts, 'user', 'admins included'], ['New accounts this week', stats?.accountsThisWeek ?? 0, 'spark', share(stats?.accountsThisWeek ?? 0, stats?.accounts, 'accounts')]],
    music: [['Studio CDs', stats?.officialCds, 'discTick', 'add or remove their tracks below']],
  };
  const tiles = stats && tilesOf[tab];
  const LEAD = {
    rooms: 'Every room people have made. Rooms that belong to an account are private, so you can look at them but not remove them.',
    cds: 'CDs that visitors made. Account CDs are private. Only a guest CD, which has no owner, can be deleted here.',
    users: 'Everybody who signed up. Deleting an account also deletes everything it made.',
  };
  const counts = stats && { rooms: stats.rooms, cds: stats.customCds, users: stats.accounts, music: stats.officialCds };
  const scenes = stats?.roomsPerScene ?? [];
  const hint = { rooms: 'Type part of a room name, scene or owner', cds: 'Type part of a CD title', users: 'Type part of a username' }[tab];
  const refreshStats = () => adminStats().then(setStats).catch((err) => setError(err.message));
  const pick = (key) => {
    setTab(key);
    setQ('');
    setSearch('');
  };
  const find = (text) => {
    setQ(text);
    setSearch(text.trim());
  };
  // A click on a scene card lists the rooms of that scene (its name is put in the search box).
  const showScene = (slug) => {
    setTab('rooms');
    setQ(sceneName(slug));
    setSearch(sceneName(slug));
    document.getElementById('adm-list')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  return (
    <main className="adm">
      <aside className="adm-nav" aria-label="Admin menu">
        <Link className="adm-brand" to="/" aria-label="Libsic Studio, back to the start page">
          <span className="adm-disc" aria-hidden="true" />
          <span className="adm-brand-name">Libsic Studio</span>
        </Link>

        <div className="adm-me">
          <span className="adm-avatar" style={{ '--h': user.avatarHue ?? 38 }} aria-hidden="true">{(user.displayName || user.username).slice(0, 1).toUpperCase()}</span>
          <span className="adm-me-text">
            <span className="adm-me-name">{user.displayName || user.username}</span>
            <span className="adm-me-role">Admin · @{user.username}</span>
          </span>
        </div>

        <p className="adm-nav-title">Menu</p>
        <div className="adm-menu" role="tablist" aria-orientation="vertical" aria-label="What to look at">
          {Object.entries(TABS).map(([key, t]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => pick(key)}>
              <Ico n={t.icon} />
              <span className="adm-menu-label">{t.label}</span>
              {counts && <span className="adm-menu-count" aria-hidden="true">{counts[key]}</span>}
            </button>
          ))}
        </div>

        <div className="adm-goto">
          <p className="adm-nav-title">Go to</p>
          <div className="adm-menu">
            <Link to={backTo(state?.from)}><Ico n="back" /><span className="adm-menu-label">Back to app</span></Link>
            <Link to="/me"><Ico n="user" /><span className="adm-menu-label">My profile</span></Link>
          </div>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <h1 className="adm-h1">Admin</h1>
        </header>

        <p role="alert" className="adm-alert">{error}</p>

        {tiles && (
          <section className="adm-sec" aria-label="Totals">
            <h2 className="adm-title"><Ico n="bars" />Totals</h2>
            <ul className="adm-stats">
              {tiles.map(([label, value, icon, note]) => <Stat key={label} label={label} value={value} icon={icon} note={note} />)}
            </ul>
          </section>
        )}

        {stats && tab === 'rooms' && (
          <section className="adm-sec">
            <h2 className="adm-title"><Ico n="scenes" />Rooms per scene</h2>
            <SceneChips scenes={scenes} current={tab === 'rooms' ? slugOfName(search) : ''} onPick={showScene} />
          </section>
        )}

        <section className="adm-sec" id="adm-list" aria-label="Look things up">
          <h2 className="adm-title"><Ico n={TABS[tab].icon} />{TABS[tab].label}</h2>
          {LEAD[tab] && <p className="adm-lead">{LEAD[tab]}</p>}
          {hint && (
            <form className="adm-find" role="search" onSubmit={(e) => { e.preventDefault(); find(q); }}>
              <label className="adm-field" htmlFor={`search-${tab}`}>
                <span className="sr-only">Search {TABS[tab].label}</span>
                <Ico n="search" />
                <input ref={searchBox} id={`search-${tab}`} type="search" maxLength={60} placeholder={hint} title="Press / to jump here" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <button type="submit" className="adm-btn primary">Search</button>
            </form>
          )}
          {search && tab !== 'music' && (
            <p className="adm-filter">
              <span>Showing results for <b>{search}</b></span>
              <button type="button" className="adm-btn" onClick={() => { setQ(''); setSearch(''); }}>Clear search</button>
            </p>
          )}
          {tab === 'music' ? <AdminMusic onChanged={refreshStats} /> : <Table key={`${tab}|${search}`} what={tab} search={search} onChanged={refreshStats} />}
        </section>
      </div>
    </main>
  );
}
