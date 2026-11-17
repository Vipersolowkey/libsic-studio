import { useEffect, useState } from 'react';
import { getTracks } from '../api.js';
import { formatTime } from '../room/HoloPlayer.jsx';

export default function CdEditor({ cd, busy, onSave }) {
  const [tracks, setTracks] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [title, setTitle] = useState(cd?.title ?? '');
  const [ids, setIds] = useState(cd?.trackIds ?? []);
  useEffect(() => {
    let cancelled = false;
    setError('');
    getTracks().then((list) => { if (!cancelled) setTracks(list); }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [attempt]);
  function move(index, offset) {
    const next = [...ids];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setIds(next);
  }
  return (
    <form className="cd-editor" onSubmit={(e) => { e.preventDefault(); onSave({ title: title.trim(), trackIds: ids }); }}>
      <label>CD name<input required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} /></label>
      <fieldset disabled={busy}>
        <legend>Choose tracks ({ids.length}/30)</legend>
        {!tracks && !error && <p role="status">Loading tracks…</p>}
        {error && <p role="alert">{error} <button type="button" className="chip" onClick={() => setAttempt((n) => n + 1)}>Retry tracks</button></p>}
        <div className="track-picker">{tracks?.map((track) => (
          <label key={track.id}><input type="checkbox" checked={ids.includes(track.id)} onChange={(e) => setIds(e.target.checked ? [...ids, track.id] : ids.filter((id) => id !== track.id))} disabled={!ids.includes(track.id) && ids.length >= 30} /><span>{track.title}<small>{track.artist}</small></span><span>{formatTime(track.duration)}</span></label>
        ))}</div>
      </fieldset>
      <h3>Playback order</h3>
      {!ids.length && <p>Choose at least one track above.</p>}
      <ol className="track-order">{ids.map((id, index) => <li key={id}><span>{tracks?.find((t) => t.id === id)?.title ?? id}</span><button type="button" className="chip" aria-label={`Move ${id} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" className="chip" aria-label={`Move ${id} down`} disabled={busy || index === ids.length - 1} onClick={() => move(index, 1)}>↓</button></li>)}</ol>
      <button className="chip primary" disabled={busy || !title.trim() || !ids.length || !tracks}>{busy ? 'Saving…' : cd ? 'Save CD changes' : 'Create CD'}</button>
    </form>
  );
}
