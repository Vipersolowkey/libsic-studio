import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../room/usePlayer.js';
import { embedUrl, PROVIDER_NAMES, sourceName } from './discovery.js';
import { loadProviderSdk } from './providerSdk.js';
import { getSoundcloudMetadata } from '../api.js';

const noop = () => {};
const safely = (action) => { try { action(); } catch { /* A provider iframe can already be detached during React cleanup. */ } };
export const EMPTY_ONLINE_PLAYER = {
  cd: { title: 'Online music', tracks: [] }, track: null, index: 0, count: 0,
  playing: false, time: 0, duration: 0, volume: 0.7,
  toggle: noop, pause: noop, next: noop, prev: noop, seek: noop, setVolume: noop,
};

// The provider's own player stays visible. It also drives the room's hologram.
export default function ExternalMusic({ source, onPlayer, onClose }) {
  const [attempt, setAttempt] = useState(0);
  // The provider's own player is only needed to read, to sign in or to see the video, so SoundCloud starts folded
  // (its title bar shows, the player keeps running). A person can unfold it with the button.
  const [folded, setFolded] = useState(source.provider === 'soundcloud');
  return (
    <aside className={`online-player${folded ? ' folded' : ''}`} aria-label="Online music player">
      <header>
        <span>{PROVIDER_NAMES[source.provider]}</span>
        <span>
          <button className="chip" type="button" aria-expanded={!folded} onClick={() => setFolded(!folded)}>{folded ? 'Show' : 'Hide'}</button>
          <button className="chip" type="button" onClick={onClose} aria-label="Eject online music">Eject</button>
        </span>
      </header>
      {source.provider === 'audio' ? <DirectAudio key={source.url} source={source} onPlayer={onPlayer} /> : <EmbeddedMusic key={`${source.url}:${attempt}`} source={source} onPlayer={onPlayer} onRetry={() => setAttempt((n) => n + 1)} />}
      <a href={source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
    </aside>
  );
}

function DirectAudio({ source, onPlayer }) {
  const cd = useMemo(() => {
    const filename = new URL(source.url).pathname.split('/').pop();
    let title = filename;
    try { title = decodeURIComponent(filename); } catch { /* keep the filename */ }
    return { title: 'Audio link', tracks: [{ title, src: source.url }] };
  }, [source.url]);
  const player = usePlayer(cd);
  useEffect(() => { onPlayer(player); }, [onPlayer, cd, player.index, player.playing, player.time, player.duration, player.volume, player.error, player.toggle]);
  return <div className="direct-audio"><p>{player.track?.title}</p><button className="chip" onClick={player.toggle}>{player.playing ? 'Pause audio' : 'Play audio'}</button>{player.error && <p role="alert">{player.error}</p>}</div>;
}

function EmbeddedMusic({ source, onPlayer, onRetry }) {
  const frame = useRef(null);
  const spotifyHost = useRef(null);
  const controls = useRef(null);
  const [state, setState] = useState(() => ({ tracks: [], track: null, index: 0, playing: false, time: 0, duration: 0, volume: 0.7, ready: false, error: '' }));
  const title = sourceName(source);
  const methods = useMemo(() => Object.fromEntries(['toggle', 'pause', 'next', 'prev', 'seek', 'setVolume', 'skip'].map((key) => [key, (...args) => controls.current?.[key]?.(...args)])), []);
  const player = useMemo(() => ({
    ...state, ...methods, cd: { title, tracks: state.tracks }, count: state.tracks.length,
    canNavigate: source.provider !== 'spotify' && (source.provider === 'soundcloud' || state.tracks.length > 1),
    canSeek: source.provider !== 'spotify' || source.url.includes('/episode/'),
    canVolume: source.provider !== 'spotify',
  }), [state, methods, title, source.provider, source.url]);
  useEffect(() => { onPlayer(player); }, [onPlayer, player]);

  useEffect(() => {
    let active = true;
    let dispose = noop;
    let timer;
    // The providers report the play time several times a second, and every report redraws the whole room page (the
    // hologram shows whole seconds only). A report that only moves the time by less than a second is ignored.
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
      timer = setTimeout(() => fail(`${PROVIDER_NAMES[source.provider]} is taking too long. Retry or choose another source.`), 20000);
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
        // SoundCloud may return id-only placeholders while playlist metadata is loading.
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
          },
          [events.PLAY]: () => { playing = true; patch({ playing: true, error: '' }); readTrack(); },
          [events.PAUSE]: () => { playing = false; patch({ playing: false }); },
          [events.PLAY_PROGRESS]: (event) => patch({ time: event.currentPosition / 1000 }),
          [events.FINISH]: () => { if (tracks.length && index === tracks.length - 1) { widget.skip(0); widget.play(); } },
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
      } else if (source.provider === 'spotify') {
        let controller;
        api.createController(spotifyHost.current, { url: source.url, width: '100%', height: 352 }, (value) => {
          if (!active) { value.destroy(); return; }
          controller = value;
          value.addListener('ready', () => { ready(); patch({ track: { title: 'Spotify' } }); });
          value.addListener('playback_update', (event) => patch({ playing: !event.data.isPaused && !event.data.isBuffering, duration: event.data.duration / 1000, time: event.data.position / 1000 }));
          controls.current = { toggle: () => value.togglePlay(), pause: () => value.pause(), seek: (seconds) => value.seek(seconds) };
        });
        dispose = () => controller?.destroy();
      } else if (source.provider === 'youtube') {
        const controller = new api.Player(frame.current, { events: {
          onReady: () => { ready(); controller.setVolume(70); update(); },
          onStateChange: (event) => { patch({ playing: event.data === 1, ...(event.data === 1 ? { error: '' } : {}) }); update(); },
          onError: () => fail('This YouTube video cannot play here. It may be unavailable or embedding is disabled.'),
          onAutoplayBlocked: () => fail('Press Play in the YouTube player to allow sound.'),
        } });
        function update() {
          if (!active || !controller.getVideoData) return;
          const data = controller.getVideoData();
          const playlist = controller.getPlaylist?.() || [];
          patch({ track: { title: data.title || 'YouTube' }, tracks: playlist.length ? playlist.map((id) => ({ id, title: id })) : [{ id: data.video_id, title: data.title || 'YouTube' }], index: Math.max(0, controller.getPlaylistIndex?.() || 0), time: controller.getCurrentTime?.() || 0, duration: controller.getDuration?.() || 0 });
        }
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
