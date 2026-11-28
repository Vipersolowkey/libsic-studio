// Part of: Music: online players (SoundCloud, Spotify, YouTube, audio link).
// Uses: api.js, discovery.js, providerSdk.js, usePlayer.js.
// Used by: RoomScreen.jsx.
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../room/usePlayer.js';
import { embedUrl, PROVIDER_NAMES, sourceName } from './discovery.js';
import { loadProviderSdk } from './providerSdk.js';
import { getSoundcloudMetadata } from '../api.js';

// Plays music from a provider's own embedded player (SoundCloud, YouTube, Spotify) or a direct audio link, and reports its
// state through onPlayer in the same shape as usePlayer, so the hologram can show it. We never get the audio itself.
const noop = () => {};
const safely = (action) => { try { action(); } catch { /* A provider iframe can already be detached during React cleanup. */ } };
// Stand-in player (same shape as usePlayer) used before an online player has reported anything.
export const EMPTY_ONLINE_PLAYER = {
  cd: { title: 'Online music', tracks: [] }, track: null, index: 0, count: 0,
  playing: false, time: 0, duration: 0, volume: 0.7,
  toggle: noop, pause: noop, next: noop, prev: noop, seek: noop, setVolume: noop,
};

// Props: source { provider, url }; onPlayer(player) = latest state for the hologram; onClose = eject;
// onEnded = the source finished (a CD of several links moves to the next link); autoplay = start by itself.
// The provider's own player must stay visible (their terms), so it can only be folded, never removed.
export default function ExternalMusic({ source, onPlayer, onClose, onEnded, autoplay = false }) {
  const [attempt, setAttempt] = useState(0);
  // SoundCloud and YouTube start folded. YouTube's rules need its player visible and at least 200 x 200, so folded it is a small tile, never hidden.
  const [folded, setFolded] = useState(source.provider === 'soundcloud' || source.provider === 'youtube');
  return (
    <aside className={`online-player online-${source.provider}${folded ? ' folded' : ''}`} aria-label="Online music player">
      <header>
        <span>{PROVIDER_NAMES[source.provider]}</span>
        <span>
          <button className="chip" type="button" aria-expanded={!folded} onClick={() => setFolded(!folded)}>{folded ? 'Show' : 'Hide'}</button>
          <button className="chip" type="button" onClick={onClose} aria-label="Eject online music">Eject</button>
        </span>
      </header>
      {source.provider === 'audio' ? <DirectAudio key={source.url} source={source} onPlayer={onPlayer} onEnded={onEnded} autoplay={autoplay} /> : <EmbeddedMusic key={`${source.url}:${attempt}`} source={source} onPlayer={onPlayer} onEnded={onEnded} autoplay={autoplay} onRetry={() => setAttempt((n) => n + 1)} />}
      <a href={source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
    </aside>
  );
}

// A plain https audio file played with our own usePlayer (a one-track CD).
// ===== CASE 1: a direct audio link (own player, usePlayer.js) =====
function DirectAudio({ source, onPlayer, onEnded, autoplay }) {
  const cd = useMemo(() => {
    const filename = new URL(source.url).pathname.split('/').pop();
    let title = filename;
    try { title = decodeURIComponent(filename); } catch { /* keep the filename */ }
    return { title: 'Audio link', tracks: [{ title, src: source.url }] };
  }, [source.url]);
  const player = usePlayer(cd, { autoplay, onEnd: onEnded });
  useEffect(() => { onPlayer(player); }, [onPlayer, cd, player.index, player.playing, player.time, player.duration, player.volume, player.error, player.toggle]);
  return <div className="direct-audio"><p>{player.track?.title}</p><button className="chip" onClick={player.toggle}>{player.playing ? 'Pause audio' : 'Play audio'}</button>{player.error && <p role="alert">{player.error}</p>}</div>;
}

// Wraps one provider SDK. Each branch inside the big effect below does the same 3 jobs: listen to the provider's events
// -> patch(state), fill controls.current with play/pause/next/seek/volume, and set dispose() to clean up.
function EmbeddedMusic({ source, onPlayer, onRetry, onEnded, autoplay }) {
  const frame = useRef(null);
  // Refs keep the latest onEnded/autoplay without restarting the provider player. onEnded is how a multi-link CD moves on.
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const autoplayRef = useRef(autoplay);
  const spotifyHost = useRef(null);
  const controls = useRef(null);
  // ===== CASE 2: SoundCloud / Spotify / YouTube. STATE below is reported to RoomScreen (onPlayer) in the same shape as usePlayer.js =====
  const [state, setState] = useState(() => ({ tracks: [], track: null, index: 0, playing: false, time: 0, duration: 0, volume: 0.7, ready: false, error: '' }));
  const title = sourceName(source);
  const methods = useMemo(() => Object.fromEntries(['toggle', 'pause', 'next', 'prev', 'seek', 'setVolume', 'skip'].map((key) => [key, (...args) => controls.current?.[key]?.(...args)])), []);
  const player = useMemo(() => ({
    ...state, ...methods, cd: { title, tracks: state.tracks }, count: state.tracks.length,
    // What the hologram may offer. Spotify allows only play/pause; seeking only for podcast episodes.
    canNavigate: source.provider !== 'spotify' && (source.provider === 'soundcloud' || state.tracks.length > 1),
    canSeek: source.provider !== 'spotify' || source.url.includes('/episode/'),
    canVolume: source.provider !== 'spotify',
  }), [state, methods, title, source.provider, source.url]);
  // ===== THE BIG EFFECT: connects to the provider's player and wires events + controls. One branch per provider =====
  useEffect(() => { onPlayer(player); }, [onPlayer, player]);

  useEffect(() => {
    let active = true;
    let dispose = noop;
    let timer;
    // Providers report time several times a second and each report redraws the room, so a time change under 1 s is ignored.
    const patch = (changes) => {
      if (!active) return;
      setState((old) => {
        const onlyTime = Object.keys(changes).length === 1 && 'time' in changes;
        if (onlyTime && changes.time >= old.time && changes.time - old.time < 1) return old;
        return { ...old, ...changes };
      });
    };
    const ready = () => { clearTimeout(timer); patch({ ready: true, error: '' }); };
    const fail = (message) => { clearTimeout(timer); patch({ playing: false, error: message }); };
    const setup = async () => {
      const api = await loadProviderSdk(source.provider);
      if (!active) return;
      // Gives up if the player is not ready after 20 s.
      timer = setTimeout(() => fail(`${PROVIDER_NAMES[source.provider]} is taking too long. Retry or choose another source.`), 20000);
      // ----- SoundCloud: widget events, track list, titles from our API (api.js getSoundcloudMetadata) -----
      if (source.provider === 'soundcloud') {
        const widget = api.Widget(frame.current);
        const events = api.Widget.Events;
        let tracks = [];
        let index = 0;
        let playing = false;
        let metadataReads = 0;
        const metadataRequested = new Set();
        const enrichMetadata = () => {
          const ids = tracks.filter((track) => track.pending && /^\d{1,20}$/.test(track.id) && !metadataRequested.has(track.id)).slice(0, 50).map((track) => track.id);
          if (!ids.length) return;
          ids.forEach((id) => metadataRequested.add(id));
          getSoundcloudMetadata(ids).then((metadata) => {
            if (!active) return;
            const byId = new Map(metadata.map((entry) => [entry.id, entry]));
            tracks = tracks.map((track) => byId.has(track.id) ? { ...track, ...byId.get(track.id), pending: false } : track);
            patch({ tracks });
          }).catch(() => { /* Widget titles still load as tracks are selected. */ });
        };
        const syncTracks = () => widget.getSounds((sounds) => {
          const known = new Map(tracks.map((track) => [track.id, track]));
          const next = (sounds || []).map((sound, position) => {
            const id = String(sound.id || sound.urn || position);
            const previous = known.get(id);
            return {
              id, title: sound.title || previous?.title || `Track ${position + 1}`,
              artist: sound.user?.username || previous?.artist,
              duration: Number.isFinite(sound.duration) ? sound.duration / 1000 : previous?.duration || 0,
              url: sound.permalink_url || previous?.url,
              pending: !sound.title && (!previous || previous.pending),
            };
          });
          if (JSON.stringify(next) !== JSON.stringify(tracks)) { tracks = next; patch({ tracks }); }
          enrichMetadata();
          if (!tracks.length) fail('This SoundCloud playlist has no playable tracks. Choose another playlist.');
        });
        // SoundCloud first returns id-only tracks; re-ask every 1.5 s (max 10 times) until titles arrive. Titles also come from our API (enrichMetadata).
        const metadataPoll = setInterval(() => {
          metadataReads++;
          if (metadataReads > 10 || tracks.length && tracks.every((track) => !track.pending)) clearInterval(metadataPoll);
          else syncTracks();
        }, 1500);
        const readTrack = () => {
          syncTracks();
          widget.getCurrentSound((sound) => {
            if (!sound) return;
            const track = { id: String(sound.id), title: sound.title, artist: sound.user?.username, duration: sound.duration / 1000, url: sound.permalink_url };
            const position = tracks.findIndex((entry) => entry.id === track.id);
            if (position >= 0) {
              tracks = tracks.map((entry, at) => at === position ? { ...entry, ...track, pending: false } : entry);
              patch({ tracks });
            }
            patch({ track, duration: track.duration });
          });
          widget.getCurrentSoundIndex((value) => { index = value; patch({ index: value }); });
        };
        const listeners = {
          [events.READY]: () => {
            ready();
            widget.setVolume(70);
            readTrack();
            if (autoplayRef.current) widget.play();
          },
          [events.PLAY]: () => { playing = true; patch({ playing: true, error: '' }); readTrack(); },
          [events.PAUSE]: () => { playing = false; patch({ playing: false }); },
          [events.PLAY_PROGRESS]: (event) => patch({ time: event.currentPosition / 1000 }),
          // End of the LAST track = the source is over: move on (CD) or loop the playlist.
          [events.FINISH]: () => {
            if (!tracks.length || index !== tracks.length - 1) return;
            if (endedRef.current) endedRef.current();
            else { widget.skip(0); widget.play(); }
          },
          [events.ERROR]: () => fail('SoundCloud could not play this source. Try another playlist or open the original link.'),
        };
        Object.entries(listeners).forEach(([event, listener]) => widget.bind(event, listener));
        controls.current = {
          toggle: () => widget.toggle(), pause: () => widget.pause(),
          next: () => { if (tracks.length) { widget.skip((index + 1) % tracks.length); if (!playing) widget.pause(); } },
          prev: () => { if (tracks.length) { widget.skip((index - 1 + tracks.length) % tracks.length); if (!playing) widget.pause(); } },
          skip: (value) => { if (Number.isInteger(value) && value >= 0 && value < tracks.length) { widget.skip(value); widget.play(); } },
          seek: (seconds) => widget.seekTo(Math.max(0, seconds) * 1000),
          setVolume: (volume) => { const value = Math.min(1, Math.max(0, volume)); widget.setVolume(value * 100); patch({ volume: value }); },
        };
        dispose = () => { clearInterval(metadataPoll); safely(() => widget.pause()); Object.keys(listeners).forEach((event) => safely(() => widget.unbind(event))); };
      // ----- Spotify: only play/pause/seek, no track list -----
      } else if (source.provider === 'spotify') {
        // Spotify gives no track list and no next/prev here, so those controls are off (canNavigate / canVolume below).
        let controller;
        api.createController(spotifyHost.current, { url: source.url, width: '100%', height: 352 }, (value) => {
          if (!active) { value.destroy(); return; }
          controller = value;
          value.addListener('ready', () => { ready(); patch({ track: { title: 'Spotify' } }); });
          let finished = false;
          value.addListener('playback_update', (event) => {
            const { isPaused, isBuffering, duration, position } = event.data;
            // Spotify has no "finished" event: a paused player at the very end of its length is a finished one.
            if (!isPaused && !isBuffering) finished = false;
            else if (isPaused && duration > 0 && position >= duration - 500 && !finished) { finished = true; endedRef.current?.(); }
          });
          value.addListener('playback_update', (event) => patch({ playing: !event.data.isPaused && !event.data.isBuffering, duration: event.data.duration / 1000, time: event.data.position / 1000 }));
          controls.current = { toggle: () => value.togglePlay(), pause: () => value.pause(), seek: (seconds) => value.seek(seconds) };
        });
        dispose = () => controller?.destroy();
      // ----- YouTube: no time events, so it is polled once a second -----
      } else if (source.provider === 'youtube') {
        const controller = new api.Player(frame.current, { events: {
          onReady: () => { ready(); controller.setVolume(70); update(); if (autoplayRef.current) controller.playVideo(); },
          onStateChange: (event) => {
            if (event.data === 0) {
              const list = controller.getPlaylist?.() || [];
              if (!list.length || (controller.getPlaylistIndex?.() ?? 0) >= list.length - 1) endedRef.current?.();
            }
            patch({ playing: event.data === 1, ...(event.data === 1 ? { error: '' } : {}) }); update(); },
          onError: () => fail('This YouTube video cannot play here. It may be unavailable or embedding is disabled.'),
          onAutoplayBlocked: () => fail('Press Play in the YouTube player to allow sound.'),
        } });
        function update() {
          if (!active || !controller.getVideoData) return;
          const data = controller.getVideoData();
          const playlist = controller.getPlaylist?.() || [];
          patch({ track: { title: data.title || 'YouTube' }, tracks: playlist.length ? playlist.map((id) => ({ id, title: id })) : [{ id: data.video_id, title: data.title || 'YouTube' }], index: Math.max(0, controller.getPlaylistIndex?.() || 0), time: controller.getCurrentTime?.() || 0, duration: controller.getDuration?.() || 0 });
        }
        // YouTube has no time or title events, so ask once a second.
        const poll = setInterval(update, 1000);
        controls.current = {
          toggle: () => controller.getPlayerState() === 1 ? controller.pauseVideo() : controller.playVideo(), pause: () => controller.pauseVideo(),
          next: () => controller.nextVideo(), prev: () => controller.previousVideo(), seek: (seconds) => controller.seekTo(seconds, true),
          setVolume: (volume) => { const value = Math.min(1, Math.max(0, volume)); controller.setVolume(value * 100); patch({ volume: value }); },
        };
        dispose = () => { clearInterval(poll); controller.destroy(); };
      }
    };
    setup().catch((error) => fail(error.message));
    return () => { active = false; clearTimeout(timer); controls.current = null; safely(dispose); };
  }, [source.provider, source.url]);

  return <>
    {source.provider === 'spotify' ? <div ref={spotifyHost} className="provider-frame spotify-host" /> : <iframe ref={frame} className={`provider-frame provider-${source.provider}`} title={`${PROVIDER_NAMES[source.provider]} player`} src={embedUrl(source)} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
    {!state.ready && !state.error && <p aria-live="polite">Loading {PROVIDER_NAMES[source.provider]}…</p>}
    {source.provider === 'spotify' && <p className="provider-note">Spotify may offer a preview. Use its player for track selection and volume.</p>}
    {state.error && <p role="alert">{state.error} <button className="chip" onClick={onRetry}>Retry source</button></p>}
  </>;
}
