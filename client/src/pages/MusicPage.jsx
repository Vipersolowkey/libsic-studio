import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCd } from '../api.js';
import CdEditor from '../music/CdEditor.jsx';
import Desk from '../music/Desk.jsx';
import { getMyCds, rememberCd } from '../music/myCds.js';

// The CD workshop (/music): make a CD from several online links or from our own tracks, and paint it.
export default function MusicPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(input) {
    setBusy(true); setError('');
    try {
      const { cd, editKey } = await createCd(input);
      const remembered = rememberCd({ code: cd.code, title: cd.title, editKey, look: cd.look ?? undefined });
      navigate(`/cd/${cd.code}`, { state: { justCreated: true, recoveryKey: remembered ? null : editKey } });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const mine = getMyCds();
  return (
    <Desk nav={<Link to="/new">Back to a room</Link>}>
      <header className="mk-head">
        <p className="mk-eyebrow">The CD workshop</p>
        <h1>Make a CD</h1>
        <p className="mk-lede">Gather links from YouTube, SoundCloud or Spotify into one playlist, give it a name and a look, and take it into any room. You get a share code to pass it on.</p>
      </header>
      {error && <p role="alert" className="mk-warn mk-banner">{error}</p>}
      <CdEditor busy={busy} onSave={save}>
        <section className="mk-mine">
          <h2 className="mk-hand">My CDs</h2>
          <p>Edit keys stay in this browser. Share links open on any device.</p>
          {mine.length ? <ul>{mine.map((cd) => <li key={cd.code}><Link to={`/cd/${cd.code}`}>{cd.title}</Link></li>)}</ul> : <p>Your first CD will appear here.</p>}
        </section>
      </CdEditor>
    </Desk>
  );
}
