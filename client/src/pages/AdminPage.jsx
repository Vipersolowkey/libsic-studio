// Part of: Admin page (/admin): totals, and removing spam rooms and CDs. Only accounts with the admin role can see it.
// Uses: AuthContext.jsx, api.js, account.css.
// Used by: App.jsx.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../account/AuthContext.jsx';
import { adminDelete, adminList, adminStats } from '../api.js';
import '../account/account.css';

// Everybody else (signed out, or a normal account) is shown the same page as for an address that does not exist.
const NotFound = () => (
  <main className="message-page">
    <h1>Page not found</h1>
    <Link to="/">Back to the start page</Link>
  </main>
);

const day = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');

const TABS = {
  rooms: { label: 'Rooms', columns: ['Name', 'Scene', 'Owner', 'Updated'], row: (r) => [r.name, r.sceneSlug, r.owner ?? 'guest', day(r.updatedAt)], link: (r) => `/r/${r.code}` },
  cds: { label: 'CDs', columns: ['Title', 'Owner', 'Updated'], row: (c) => [c.title, c.owned ? 'account' : 'guest', day(c.updatedAt)], link: (c) => `/cd/${c.code}` },
  users: { label: 'Accounts', columns: ['Username', 'Name', 'Rooms', 'Joined'], row: (u) => [u.username + (u.role === 'admin' ? ' (admin)' : ''), u.displayName, String(u.rooms), day(u.createdAt)] },
};

function Table({ what }) {
  const tab = TABS[what];
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(null); // the code that is waiting for "Yes, delete"

  const load = useCallback(() => {
    setError('');
    return adminList(what, { q: search, page }).then(setData).catch((err) => setError(err.message));
  }, [what, search, page]);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(code) {
    try {
      await adminDelete(what, code);
      setAsking(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div>
      {what !== 'users' && (
        <form className="account-search" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
          <label className="sr-only" htmlFor={`search-${what}`}>Search {tab.label}</label>
          <input id={`search-${what}`} type="search" maxLength={60} placeholder={`Search ${tab.label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="account-button quiet">Search</button>
        </form>
      )}
      <p role="alert" className="account-note error">{error}</p>
      {data && (
        <>
          <table className="account-table">
            <thead>
              <tr>{tab.columns.map((c) => <th key={c}>{c}</th>)}<th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.code ?? item.username}>
                  {tab.row(item).map((cell, i) => (
                    <td key={i}>{i === 0 && tab.link ? <Link to={tab.link(item)}>{cell}</Link> : cell}</td>
                  ))}
                  <td className="account-actions">
                    {what !== 'users' && (asking === item.code ? (
                      <>
                        <button type="button" className="account-button danger" onClick={() => remove(item.code)}>Yes, delete</button>
                        <button type="button" className="account-button quiet" onClick={() => setAsking(null)}>Keep it</button>
                      </>
                    ) : (
                      <button type="button" className="account-button quiet" onClick={() => setAsking(item.code)}>Delete</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <p className="account-muted">Nothing found.</p>}
          <div className="account-row">
            <button type="button" className="account-button quiet" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="account-muted">Page {page} of {pages} ({data.total})</span>
            <button type="button" className="account-button quiet" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, checking } = useAuth();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('rooms');
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    adminStats().then((s) => !cancelled && setStats(s)).catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) return checking && user ? <main className="account-page"><p className="account-muted">One moment…</p></main> : <NotFound />;

  const tiles = stats && [
    ['Accounts', stats.accounts],
    ['Rooms', stats.rooms],
    ['New rooms this week', stats.roomsThisWeek],
    ['Custom CDs', stats.customCds],
    ['Official CDs', stats.officialCds],
  ];
  return (
    <main className="account-page wide">
      <Link className="account-back" to="/">← Libsic Studio</Link>
      <h1>Admin</h1>
      <p role="alert" className="account-note error">{error}</p>
      {tiles && (
        <ul className="account-tiles">
          {tiles.map(([label, value]) => (
            <li key={label}><strong>{value}</strong><span>{label}</span></li>
          ))}
        </ul>
      )}
      <div className="account-tabs" role="tablist" aria-label="What to look at">
        {Object.entries(TABS).map(([key, t]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{t.label}</button>
        ))}
      </div>
      <Table key={tab} what={tab} />
    </main>
  );
}
