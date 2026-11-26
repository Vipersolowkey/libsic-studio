// Part of: Music: plays our own CDs (mp3 files).
// Used by: CdPage.jsx, ExternalMusic.jsx, RoomScreen.jsx.
import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME_KEY = 'libsic.volume';

function readVolume() {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    const value = saved === null ? NaN : Number(saved);
    return value >= 0 && value <= 1 ? value : 0.7;
  } catch {
    return 0.7; // storage can be blocked, then the player simply starts at the normal volume
  }
}

// Plays our own CD (hosted mp3 files) with one <audio> element. Loops back to track 1 after the last one.
//   cd  { title, tracks: [{ title, src }] }. IMPORTANT: pass a stable object (the effect restarts whenever `cd` changes identity).
// Returns { cd, track, index, count, playing, time, duration, volume, error, toggle, pause, next, prev, seek(seconds), setVolume(0-1) }.
// prev restarts the track first when more than 3 s in (like a real CD player). Volume is remembered ("libsic.volume").
// options: onEnd = called after the last track instead of looping; autoplay = a newly inserted CD starts by itself.
export function usePlayer(cd, options = {}) {
  // ===== STATE: which track, playing or paused, time, volume, error. The UI that reads it: HoloPlayer.jsx (hologram) =====
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const indexRef = useRef(0);
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(readVolume);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(0);
  indexRef.current = index;
  const countRef = useRef(cd.tracks.length);
  countRef.current = cd.tracks.length;
  const previousCd = useRef(cd);
  const changedCd = previousCd.current !== cd;

  const count = cd.tracks.length;
  const track = cd.tracks[index] ?? cd.tracks[0] ?? null;

  // ===== THE AUDIO ELEMENT: events update the numbers shown in the hologram; ended = next track =====
  // The audio element is made once, and its events keep the numbers on screen up to date.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onTime = () => setTime(audio.currentTime);
    const onLength = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      if (!countRef.current) return;
      if (optionsRef.current.onEnd && indexRef.current === countRef.current - 1) { optionsRef.current.onEnd(); return; }
      setIndex((i) => (i + 1) % countRef.current);
      setRestart((n) => n + 1); // also replays a one-track CD
    };
    const onError = () => { setPlaying(false); setError('This track could not be loaded. Try another track or press Play to retry.'); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onLength);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onLength);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []);

  // A new CD always starts at track 1 and waits for Play (unless options.autoplay).
  useEffect(() => {
    previousCd.current = cd;
    setIndex(0);
    setPlaying(Boolean(optionsRef.current.autoplay && cd.tracks.length));
    setError('');
    setTime(0);
    setDuration(0);
  }, [cd]);

  // New track (or restart): load its file. The effect below decides whether to play.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    if (track) audio.src = track.src;
    else audio.removeAttribute('src');
    setTime(0);
    setDuration(0);
    setError('');
  }, [track, restart]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    let cancelled = false;
    if (playing && !changedCd) {
      // Browsers refuse sound before the first click on the page; then we show "paused" and a hint.
      Promise.resolve(audio.play()).catch((err) => {
        if (cancelled) return;
        setPlaying(false);
        setError(err.name === 'NotAllowedError' ? 'Press Play to allow sound in this browser.' : 'Could not play this track. Press Play to retry.');
      });
    } else {
      audio.pause();
    }
    return () => { cancelled = true; };
  }, [playing, track, restart, changedCd]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // ===== BUTTONS: play/pause (toggle), next, prev, seek (progress bar), volume. HoloPlayer.jsx calls these =====
  const toggle = useCallback(() => {
    if (!count) return;
    if (error) setRestart((n) => n + 1);
    setError('');
    setPlaying((p) => !p);
  }, [count, error]);
  const pause = useCallback(() => setPlaying(false), []);
  const next = useCallback(() => { if (count) { setIndex((i) => (i + 1) % count); setRestart((n) => n + 1); } }, [count]);
  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setTime(0);
    } else {
      if (count) { setIndex((i) => (i - 1 + count) % count); setRestart((n) => n + 1); }
    }
  }, [count]);
  const seek = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
    setTime(seconds);
  }, []);
  const setVolume = useCallback((value) => {
    const v = Math.min(1, Math.max(0, value));
    setVolumeState(v);
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      // not remembered, that is fine
    }
  }, []);

  return { cd, track, index, count, playing, time, duration, volume, error, toggle, pause, next, prev, seek, setVolume };
}
