// Part of: CD page (/cd/:code): listen, share, edit and delete a CD.
// Uses: CdEditor.jsx, CdPreview.jsx, Desk.jsx, HoloPlayer.jsx, api.js, cdLook.js, myCds.js, myLinks.js, usePlayer.js.
// Used by: App.jsx.
import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { deleteCd, getCd, updateCd } from '../api.js';
import CdEditor from '../music/CdEditor.jsx';
import CdPreview from '../music/CdPreview.jsx';
import { cdLook } from '../music/cdLook.js';
import Desk from '../music/Desk.jsx';
import { linkTitle, providerName } from '../music/myLinks.js';
import { forgetCd, getMyCds, rememberCd } from '../music/myCds.js';
import HoloPlayer, { formatTime } from '../room/HoloPlayer.jsx';
import { usePlayer } from '../room/usePlayer.js';

const EMPTY = { title: 'No CD', tracks: [] };
export default function CdPage() {
  const { code } = useParams();
  return <CdDetails key={code} code={code} />;
}
function CdDetails({ code }) {
  const location = useLocation();
  // ===== STATE: the CD (GET /api/cds/:code), edit key (from myCds.js or the URL), editing / deleting flags =====
  const [cd, setCd] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(() => new URLSearchParams(location.search).has('edit') && Boolean(location.state?.recoveryKey || getMyCds().find((e) => e.code === code)?.editKey)); // the shelf's Edit button opens the editor at once
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [status, setStatus] = useState(location.state?.justCreated ? 'CD created. Your share link is ready.' : '');
  const [key, setKey] = useState(() => location.state?.recoveryKey || getMyCds().find((e) => e.code === code)?.editKey || '');
  const [restoreKey, setRestoreKey] = useState('');
  const player = usePlayer(deleted ? EMPTY : cd ?? EMPTY);
  const link = `${window.location.origin}/cd/${encodeURIComponent(code)}`;
  useEffect(() => {
    let cancelled = false;
    setError(''); setNotFound(false);
    getCd(code).then((value) => { if (!cancelled) setCd(value); }).catch((err) => { if (!cancelled) { setError(err.message); setNotFound(err.status === 404); } });
    return () => { cancelled = true; };
  }, [code, attempt]);
  // ===== ACTIONS: save changes (PUT /api/cds/:code), delete (DELETE), copy the link. All three need the edit key =====
  async function save(input) {
    setBusy(true); setError('');
    try {
      const updated = await updateCd(code, key, input);
      setCd(updated); rememberCd({ code, title: updated.title, editKey: key, look: updated.look ?? undefined }); setEditing(false); setStatus('CD changes saved.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try { await deleteCd(code, key); forgetCd(code); setDeleted(true); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setStatus('CD link copied.'); } catch { setStatus('Select the share link and copy it by hand.'); }
  }
  if (deleted) return <Desk nav={<Link to="/music">Make a CD</Link>}><header className="mk-head"><h1>CD deleted</h1><p className="mk-lede"><Link to="/music">Back to the workshop</Link></p></header></Desk>;
  if (!cd) return <Desk nav={<Link to="/music">Make a CD</Link>}><header className="mk-head"><h1>{notFound ? 'CD not found' : 'Opening the case…'}</h1><p className="mk-lede">{error || 'Loading CD…'}</p>{error && !notFound && <button className="mk-brass" onClick={() => setAttempt((n) => n + 1)}>Retry CD</button>}<p className="mk-lede"><Link to="/music">Make a CD</Link></p></header></Desk>;
  const look = cdLook(code, cd.title, cd.look);
  const entries = cd.links?.length
    ? cd.links.map((link) => ({ id: link.url, title: linkTitle(link), meta: providerName(link.provider), href: link.url }))
    : cd.tracks.map((track) => ({ id: track.id, title: track.title, meta: formatTime(track.duration) }));
  return (
    <Desk nav={<Link to="/music">Make a CD / My CDs</Link>}>
      {/* PAGE TOP + LEFT: CD preview with its disc, the playlist, and the hologram player for our own tracks (usePlayer.js) */}
      <header className="mk-head">
        <p className="mk-eyebrow">{cd.official ? 'Studio collection' : 'A personal mix'}</p>
        <h1>{cd.title}</h1>
      </header>
      <div className="mk-listen">
        <section className="mk-sheet mk-sheet-center">
          <CdPreview look={look} title={cd.title} spinning={player.playing} caption={cd.official ? 'Libsic Studio' : 'a Libsic mix'} />
          <ol className="mk-playlist" aria-label={cd.links?.length ? 'Links on the CD' : 'Tracks on the CD'}>
            {entries.map((entry, index) => (
              <li key={entry.id}>
                <span className="mk-mark" aria-hidden="true">{index + 1}</span>
                <span className="mk-entry"><b>{entry.href ? <a href={entry.href} target="_blank" rel="noreferrer">{entry.title} ↗</a> : entry.title}</b></span>
                <small className="mk-time">{entry.meta}</small>
              </li>
            ))}
          </ol>
          {cd.links?.length ? <p className="mk-note">The links play one after the other when you put this CD in a room.</p> : <div className="mk-display"><HoloPlayer player={player} /></div>}
          <Link className="mk-press" to={`/new?cd=${encodeURIComponent(code)}`}>Listen in a room</Link>
        </section>
        {/* RIGHT: share link + back-up edit key, then Manage CD (only for custom CDs: edit opens CdEditor.jsx) */}
        <aside className="mk-stand mk-stand-plain">
          <section className="mk-sheet">
            <h2 className="mk-hand">Share this CD</h2>
            <label className="mk-field"><span className="mk-note">Share link</span><input readOnly value={link} onFocus={(e) => e.target.select()} /></label>
            <button className="mk-brass" onClick={copy}>Copy CD link</button>
            {status && <p role="status" className="mk-ok">{status}</p>}
            {!cd.official && key && <details><summary>Back up edit key</summary><p>Keep this secret. Anyone with this key can change or delete the CD.</p><code>{key}</code></details>}
            {location.state?.recoveryKey && <p role="alert" className="mk-warn">Browser storage is unavailable. Save this edit key to keep control of the CD: <code>{key}</code></p>}
          </section>
          {!cd.official && (
            <section className="mk-sheet">
              <h2 className="mk-hand">Manage CD</h2>
              {key ? (
                <>
                  <button className="mk-brass" disabled={busy} onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit CD'}</button>
                  <button className="mk-brass mk-danger" disabled={busy} onClick={() => setDeleting(!deleting)}>Delete CD</button>
                  {deleting && <div className="mk-confirm"><p>Delete this CD and its share link?</p><button className="mk-brass mk-danger" disabled={busy} onClick={remove}>Confirm delete CD</button><button className="mk-brass" onClick={() => setDeleting(false)}>Keep CD</button></div>}
                </>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setKey(restoreKey); setEditing(true); }}>
                  <p>Only its creator can edit. If you saved the edit key, enter it here.</p>
                  <label className="mk-field"><span className="mk-note">Edit key</span><input type="password" autoComplete="off" required value={restoreKey} onChange={(e) => setRestoreKey(e.target.value)} /></label>
                  <button className="mk-brass">Use edit key</button>
                </form>
              )}
            </section>
          )}
        </aside>
      </div>
      {error && <p role="alert" className="mk-warn mk-banner">{error}</p>}
      {editing && <section className="mk-edit"><h2 className="mk-hand">Edit your mix</h2><CdEditor key={cd.updatedAt ?? cd.code} cd={{ ...cd, code }} busy={busy} onSave={save} /></section>}
    </Desk>
  );
}
