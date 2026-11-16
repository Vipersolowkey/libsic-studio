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

  const count = cd.tracks.length;
  const track = cd.tracks[index] ?? null;

  // The audio element is made once, and its events keep the numbers on screen up to date.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onTime = () => setTime(audio.currentTime);
    const onLength = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => setIndex((i) => (i + 1) % count); // the next track starts by itself
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onLength);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onLength);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [count]);

  // Another track: load its file, and keep playing if music was playing.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.src;
    setTime(0);
    setDuration(0);
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      // A browser may refuse to start sound (for example before the first click on the page): then the player shows "paused".
      Promise.resolve(audio.play()).catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, track]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setTime(0);
    } else {
      setIndex((i) => (i - 1 + count) % count);
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

  return { cd, track, index, count, playing, time, duration, volume, toggle, next, prev, seek, setVolume };
}
