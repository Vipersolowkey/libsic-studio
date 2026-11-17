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

// Plays the tracks of one CD, one after the other, and starts again at the first track after the last one.
// The sound itself comes from one <audio> element of the browser, which this hook creates and controls.
//   cd        { title, tracks: [{ title, src }] }
// It returns what the player shows and the actions of its buttons:
//   track, index, count   the current track, its position on the CD and how many tracks there are
//   playing               true while music plays
//   time, duration        seconds played and the length of the track (0 until the browser knows it)
//   volume                0 to 1, remembered in this browser
//   toggle, next, prev    the three buttons (prev goes back to the start of the track first, like a real CD player)
//   seek(seconds), setVolume(0 to 1)
export function usePlayer(cd) {
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(readVolume);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(0);
  const countRef = useRef(cd.tracks.length);
  countRef.current = cd.tracks.length;
  const previousCd = useRef(cd);
  const changedCd = previousCd.current !== cd;

  const count = cd.tracks.length;
  const track = cd.tracks[index] ?? cd.tracks[0] ?? null;

  // The audio element is made once, and its events keep the numbers on screen up to date.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onTime = () => setTime(audio.currentTime);
    const onLength = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      if (!countRef.current) return;
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

  // Inserting a CD always starts at its first track and waits for a click before playing.
  useEffect(() => {
    previousCd.current = cd;
    setIndex(0);
    setPlaying(false);
    setError('');
    setTime(0);
    setDuration(0);
  }, [cd]);

  // Another track: load its file, and keep playing if music was playing.
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
      // A browser may refuse to start sound (for example before the first click on the page): then the player shows "paused".
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
