import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCds } from '../api.js';
import { getMyCds } from './myCds.js';

export default function CdShelf({ code, onChoose, loading, error }) {
  const [cds, setCds] = useState(null);
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [shared, setShared] = useState('');
  useEffect(() => {
    let cancelled = false;
    setFailure('');
    getCds().then((list) => { if (!cancelled) setCds(list); }).catch((err) => { if (!cancelled) setFailure(err.message); });
    return () => { cancelled = true; };
  }, [attempt]);
  return (
    <section className="side-section music-shelf" aria-label="CD shelf">
      <h2 className="side-title">CD shelf</h2>
      {cds === null && !failure && <p role="status">Loading CDs…</p>}
      {failure && <p role="alert">{failure} <button className="chip" onClick={() => setAttempt((n) => n + 1)}>Retry CDs</button></p>}
      {cds?.length === 0 && <p>No official CDs yet.</p>}
      <div className="cd-shelf-list">
        {cds?.map((cd) => <button className="cd-spine" type="button" key={cd.code} aria-pressed={code === cd.code} onClick={() => onChoose(cd.code)}><span className="mini-disc" aria-hidden="true" />{cd.title}<small>{cd.tracks.length} tracks</small></button>)}
        {getMyCds().map((cd) => <button className="cd-spine" type="button" key={cd.code} aria-pressed={code === cd.code} onClick={() => onChoose(cd.code)}>{cd.title}<small>My CD</small></button>)}
      </div>
      <form className="cd-code-form" onSubmit={(e) => { e.preventDefault(); if (shared.trim()) onChoose(shared.trim()); }}>
        <label htmlFor="shared-cd-code">Open a CD code</label>
        <div className="chip-row"><input id="shared-cd-code" value={shared} maxLength={80} onChange={(e) => setShared(e.target.value)} /><button className="chip" disabled={!shared.trim()}>Load CD</button></div>
      </form>
      {loading && <p role="status">Loading selected CD…</p>}
      {error && <p role="alert">{error} <button className="chip" onClick={() => onChoose(code)}>Retry CD</button></p>}
      {code && <div className="chip-row"><Link to={`/cd/${encodeURIComponent(code)}`}>View / share CD</Link><button className="chip" onClick={() => onChoose(null)}>Eject CD</button></div>}
      <Link to="/music">Make a CD / My CDs</Link>
    </section>
  );
}
