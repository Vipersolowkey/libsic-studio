import { useState } from 'react';
import { DISCOVERY_PLAYLISTS } from './discovery.js';
import { parseMusicSource } from './musicSource.js';
import { resolveMusicLink } from '../api.js';
import { formatTime } from '../room/HoloPlayer.jsx';

export default function MusicLibrary({ source, player, onChoose }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(30);
  const tracks = player?.cd?.tracks || [];
  const filtered = tracks.map((track, index) => ({ track, index })).filter(({ track }) => `${track.title} ${track.artist || ''}`.toLowerCase().includes(search.toLowerCase()));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let value;
      const host = (() => { try { return new URL(link.trim()).hostname; } catch { return ''; } })();
      if (['on.soundcloud.com', 'spotify.link'].includes(host)) value = await resolveMusicLink(link.trim());
      else value = parseMusicSource(link);
      onChoose(value);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="side-section music-library" aria-label="Music library">
    <h2 className="side-title">Discover music</h2>
    <p>Whole SoundCloud playlists, ready to browse. Pick one and its current tracks load automatically.</p>
    <div className="cd-shelf-list">{DISCOVERY_PLAYLISTS.map((playlist) => <button type="button" className="cd-spine" key={playlist.url} aria-pressed={source?.url === playlist.url} onClick={() => { setSearch(''); setLimit(30); onChoose({ provider: playlist.provider, url: playlist.url }); }}><span>{playlist.title}<small>{playlist.caption}</small></span></button>)}</div>
    {source?.provider === 'soundcloud' && tracks.length > 0 && <>
      <label>Search this playlist<input value={search} onChange={(event) => { setSearch(event.target.value); setLimit(30); }} /></label>
      <p>{tracks.length} tracks from SoundCloud</p>
      <ol className="online-track-list">{filtered.slice(0, limit).map(({ track, index }) => <li key={track.id}><button type="button" data-track-id={track.id} aria-label={`Play ${track.title}`} aria-pressed={player.index === index} onClick={() => player.skip(index)}><span>{track.title}<small>{track.pending ? 'Title loads when selected' : track.artist}</small></span><small>{track.duration ? formatTime(track.duration) : ''}</small></button></li>)}</ol>
      {filtered.length > limit && <button className="chip" type="button" onClick={() => setLimit((value) => value + 30)}>Show more tracks</button>}
      {!filtered.length && <p>No matching tracks in this playlist.</p>}
    </>}
    <form className="cd-code-form" onSubmit={submit}>
      <label htmlFor="music-link">Or paste a music link</label>
      <input id="music-link" type="text" inputMode="url" maxLength={2048} value={link} onChange={(event) => setLink(event.target.value)} placeholder="SoundCloud, Spotify, YouTube, MP3…" />
      <button className="chip" disabled={!link.trim() || busy}>{busy ? 'Loading link…' : 'Load music link'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    <p className="provider-note">Supported: SoundCloud, Spotify, YouTube and direct HTTPS audio files.</p>
  </section>;
}
