import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCd } from '../api.js';
import CdEditor from '../music/CdEditor.jsx';
import { getMyCds, rememberCd } from '../music/myCds.js';

export default function MusicPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(input) {
    setBusy(true); setError('');
    try {
      const { cd, editKey } = await createCd(input);
      const remembered = rememberCd({ code: cd.code, title: cd.title, editKey });
      navigate(`/cd/${cd.code}`, { state: { justCreated: true, recoveryKey: remembered ? null : editKey } });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <main className="music-page">
      <nav><Link to="/">Libsic Studio</Link><Link to="/new">Back to a room</Link></nav>
      <p className="music-eyebrow">Your listening collection</p><h1>Make a CD</h1>
      <p>Pick a few quiet tracks, put them in order, and take your CD into any room.</p>
      <div className="music-columns"><section className="music-card"><h2>A mix of your own</h2>{error && <p role="alert">{error}</p>}<CdEditor busy={busy} onSave={save} /></section>
        <aside className="music-card"><h2>My CDs</h2><p>Editing keys stay in this browser. Share links open on any device.</p>{getMyCds().length ? <ul>{getMyCds().map((cd) => <li key={cd.code}><Link to={`/cd/${cd.code}`}>{cd.title}</Link></li>)}</ul> : <p>Your first CD will appear here.</p>}</aside></div>
    </main>
  );
}
