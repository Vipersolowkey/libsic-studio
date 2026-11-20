import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { deleteCd, getCd, updateCd } from '../api.js';
import CdEditor from '../music/CdEditor.jsx';
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
  const [cd, setCd] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
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
  async function save(input) {
    setBusy(true); setError('');
    try {
      const updated = await updateCd(code, key, input);
      setCd(updated); rememberCd({ code, title: updated.title, editKey: key }); setEditing(false); setStatus('CD changes saved.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try { await deleteCd(code, key); forgetCd(code); setDeleted(true); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setStatus('CD link copied.'); } catch { setStatus('Select the share link and copy it by hand.'); }
  }
  if (deleted) return <main className="message-page"><h1>CD deleted</h1><Link to="/music">Back to My CDs</Link></main>;
  if (!cd) return <main className="message-page"><h1>{notFound ? 'CD not found' : 'Libsic Studio'}</h1><p>{error || 'Loading CD…'}</p>{error && !notFound && <button className="chip" onClick={() => setAttempt((n) => n + 1)}>Retry CD</button>}<Link to="/music">Make a CD</Link></main>;
  return (
    <main className="music-page">
      <nav><Link to="/">Libsic Studio</Link><Link to="/music">Make a CD / My CDs</Link></nav>
      <p className="music-eyebrow">{cd.official ? 'Studio collection' : 'A personal mix'}</p><h1>{cd.title}</h1>
      <div className="music-columns"><section className="music-card cd-listening">
        <div className={`retro-disc${player.playing ? ' spinning' : ''}`} aria-hidden="true" /><HoloPlayer player={player} />
        <ol>{cd.tracks.map((track) => <li key={track.id}>{track.title} <small>{formatTime(track.duration)}</small></li>)}</ol>
        <Link className="chip" to={`/new?cd=${encodeURIComponent(code)}`}>Listen in a room</Link>
      </section><section className="music-card"><h2>Share this CD</h2>
        <label>Share link<input readOnly value={link} onFocus={(e) => e.target.select()} /></label><button className="chip" onClick={copy}>Copy CD link</button>
        {status && <p role="status">{status}</p>}
        {!cd.official && key && <details><summary>Back up edit key</summary><p>Keep this secret. Anyone with this key can change or delete the CD.</p><code>{key}</code></details>}
        {location.state?.recoveryKey && <p role="alert">Browser storage is unavailable. Save this edit key to keep control of the CD: <code>{key}</code></p>}
        {!cd.official && <><h2>Manage CD</h2>{key ? <><button className="chip" disabled={busy} onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit CD'}</button><button className="chip" disabled={busy} onClick={() => setDeleting(!deleting)}>Delete CD</button>{deleting && <div><p>Delete this CD and its share link?</p><button className="chip" disabled={busy} onClick={remove}>Confirm delete CD</button><button className="chip" onClick={() => setDeleting(false)}>Keep CD</button></div>}</> : <form onSubmit={(e) => { e.preventDefault(); setKey(restoreKey); setEditing(true); }}><p>Only its creator can edit. If you saved the edit key, enter it here.</p><label>Edit key<input type="password" autoComplete="off" required value={restoreKey} onChange={(e) => setRestoreKey(e.target.value)} /></label><button className="chip">Use edit key</button></form>}</>}
      </section></div>
      {error && <p role="alert">{error}</p>}
      {editing && <section className="music-card"><h2>Edit your mix</h2><CdEditor key={cd.updatedAt ?? cd.code} cd={cd} busy={busy} onSave={save} /></section>}
    </main>
  );
}
