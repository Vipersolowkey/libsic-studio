// Part of: Admin page (/admin), the Music tab: the studio's own CDs, where an admin adds a track or removes one.
// This is the app's own library, not something a visitor made, so it is the one place an admin changes music.
// Uses: api.js, AdminIcon.jsx, admin.css.
// Used by: AdminPage.jsx.
import { useCallback, useEffect, useState } from 'react';
import { adminAddTrack, adminMusic, adminRemoveTrack } from '../api.js';
import { Ico } from '../account/AdminIcon.jsx';

const hueOf = (word = '') => [...String(word)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 17);
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// "3:25" becomes 205 seconds. Anything else is not a length (null).
export function lengthToSeconds(text) {
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(String(text).trim());
  if (!m) return null;
  const seconds = Number(m[1]) * 60 + Number(m[2]);
  return seconds > 0 ? seconds : null;
}

const EMPTY = { title: '', artist: '', url: '', length: '' };

// The small form under a CD: title, artist, the link to the audio file, and how long it is.
function AddTrack({ cd, onAdded, onError }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const duration = lengthToSeconds(form.length);
    if (!duration) return onError('Write the length like 3:25 (minutes and seconds)');
    setBusy(true);
    try {
      await adminAddTrack(cd.code, { title: form.title, artist: form.artist, url: form.url.trim(), duration });
      setForm(EMPTY);
      await onAdded(form.title.trim());
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-add" onSubmit={submit} aria-label={`Add a track to ${cd.title}`}>
      <label>
        <span>Title</span>
        <input required maxLength={80} value={form.title} onChange={set('title')} />
      </label>
      <label>
        <span>Artist</span>
        <input required maxLength={60} value={form.artist} onChange={set('artist')} />
      </label>
      <label className="wide">
        <span>Link to the audio file</span>
        <input required type="url" inputMode="url" placeholder="https://…/song.mp3" value={form.url} onChange={set('url')} />
      </label>
      <label>
        <span>Length</span>
        <input required placeholder="3:25" maxLength={6} value={form.length} onChange={set('length')} />
      </label>
      <button type="submit" className="adm-btn primary" disabled={busy}>Add track</button>
    </form>
  );
}

function CdBox({ cd, reload, tell, fail }) {
  const [opened, setOpened] = useState(false); // the add form
  const [asking, setAsking] = useState(null); // the track id waiting for "Yes, remove"

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setAsking(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function remove(track) {
    try {
      await adminRemoveTrack(cd.code, track.id);
      setAsking(null);
      tell(`Removed “${track.title}” from ${cd.title}.`);
      await reload();
    } catch (err) {
      fail(err.message);
    }
  }

  const only = cd.tracks.length <= 1;
  return (
    <section className="adm-cdbox" aria-label={cd.title} style={{ '--hue': hueOf(cd.title) }}>
      <header className="adm-cdbox-head">
        <span className="adm-tile" aria-hidden="true"><Ico n="disc" /></span>
        <h3>{cd.title}</h3>
        <span className="adm-total">{cd.tracks.length} {cd.tracks.length === 1 ? 'track' : 'tracks'}</span>
        <button type="button" className="adm-btn" aria-expanded={opened} onClick={() => setOpened(!opened)}>
          <Ico n="plus" />Add a track
        </button>
      </header>
      {opened && (
        <AddTrack
          cd={cd}
          onError={fail}
          onAdded={async (title) => {
            setOpened(false);
            tell(`Added “${title}” to ${cd.title}.`);
            await reload();
          }}
        />
      )}
      <div className="adm-list adm-list-tracks" role="table" aria-label={`Tracks on ${cd.title}`}>
        {cd.tracks.map((track, n) => {
          const armed = asking === track.id;
          return (
            <div key={track.id} className={`adm-row${armed ? ' armed' : ''}`} role="row" style={{ '--hue': hueOf(track.title) }}>
              <span role="cell" className="cell cell-num">{String(n + 1).padStart(2, '0')}</span>
              <span role="cell" className="cell cell-label" data-label="Title">
                <span className="adm-tile" aria-hidden="true"><Ico n="note" /></span>
                <span className="adm-name">{track.title}</span>
              </span>
              <span role="cell" className="cell cell-text" data-label="Artist">{track.artist}</span>
              <span role="cell" className="cell cell-mono" data-label="Length">{clock(track.duration)}</span>
              <span role="cell" className="cell cell-actions">
                {armed ? (
                  <>
                    <button type="button" className="adm-btn hot" onClick={() => remove(track)}>Yes, remove</button>
                    <button type="button" className="adm-btn" onClick={() => setAsking(null)}>Keep it</button>
                  </>
                ) : (
                  <button type="button" className="adm-btn del" disabled={only} title={only ? 'A CD needs at least one track' : undefined} onClick={() => setAsking(track.id)}>
                    Remove
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminMusic({ onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(() => adminMusic().then(setData).catch((err) => setError(err.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const reload = async () => {
    await load();
    onChanged?.();
  };
  const tell = (text) => {
    setError('');
    setNote(text);
  };
  const fail = (text) => {
    setNote('');
    setError(text);
  };

  return (
    <>
      <p className="adm-lead">The studio&rsquo;s own CDs. Add a track or take one off. Rooms and CDs that visitors make are theirs, so they are not here.</p>
      <p role="alert" className="adm-alert">{error}</p>
      <p role="status" className="adm-note">{note}</p>
      {!data && !error && <p className="adm-empty">Loading…</p>}
      {data?.cds.map((cd) => <CdBox key={cd.code} cd={cd} reload={reload} tell={tell} fail={fail} />)}
      {data && data.cds.length === 0 && <p className="adm-empty">There are no studio CDs yet.</p>}
    </>
  );
}
