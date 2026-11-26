// Part of: Hologram player: clock, track title and controls.
// Used by: CdEditor.jsx, CdPage.jsx, CdRow.jsx, RoomScreen.jsx.
import { useEffect, useState } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const two = (n) => String(n).padStart(2, '0');

// Seconds -> "01:05".
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${two(Math.floor(s / 60))}:${two(s % 60)}`;
}

// The three lines of the clock: "Tuesday", "10 November, 2026." and "16:19".
export function clockLines(date) {
  return {
    day: DAYS[date.getDay()],
    date: `${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}.`,
    time: `${two(date.getHours())}:${two(date.getMinutes())}`,
  };
}

// The outlined double arrow of the skip buttons (it points right; the "previous" button mirrors it).
const SkipIcon = () => (
  <svg viewBox="0 0 24 16" aria-hidden="true">
    <path d="M2 2.5 L11 8 L2 13.5 Z M12 2.5 L21 8 L12 13.5 Z" />
  </svg>
);

// The hologram's content: clock + player. Before music starts: day / date / time. After the first play: the big line is the
// track title, the small one "CD title . n / total"; the time of day stays.
//   player   the object from usePlayer, or from an online player (same shape). Optional flags turn controls off:
//            canSeek / canNavigate / canVolume === false (Spotify, for example)
//   now      fixed date for tests only
// ===== THE HOLOGRAM CONTENT: title lines, progress bar, buttons, volume. All values come from `player` (usePlayer.js or ExternalMusic.jsx) =====
export default function HoloPlayer({ player, now }) {
  const [clock, setClock] = useState(() => now ?? new Date());
  const [started, setStarted] = useState(false); // true once music has played: from then on the title is shown
  useEffect(() => {
    if (now) return undefined;
    const id = setInterval(() => setClock(new Date()), 10000);
    return () => clearInterval(id);
  }, [now]);
  useEffect(() => {
    if (player.playing) setStarted(true);
  }, [player.playing]);

  const { day, date, time } = clockLines(now ?? clock);
  const { track, playing, duration } = player;
  const left = Math.max(0, duration - player.time);

  return (
    <section className={`hp${playing ? ' hp-playing' : ''}`} aria-label="Music player">
      <p className={`hp-title${started && track ? ' hp-track' : ''}`}>{started && track ? track.title : day}</p>
      <p className="hp-sub">{started && track ? `${player.cd.title}${player.count ? ` · ${player.index + 1} / ${player.count}` : ''}` : date}</p>
      <p className="hp-time">
        <span aria-hidden="true">- </span>
        {time}
        <span aria-hidden="true"> -</span>
      </p>
      <div className="hp-progress">
        <span>{formatTime(player.time)}</span>
        <input
          type="range"
          aria-label="Track position"
          min="0"
          max={duration || 1}
          step="1"
          value={Math.min(player.time, duration || 1)}
          disabled={!duration || player.canSeek === false}
          style={{ '--done': `${duration ? (player.time / duration) * 100 : 0}%` }}
          onChange={(e) => player.seek(Number(e.target.value))}
        />
        <span>-{formatTime(left)}</span>
      </div>
      <div className="hp-controls">
        <span className="hp-bars" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <button type="button" className="hp-btn hp-prev" aria-label="Previous track" disabled={!track || player.canNavigate === false} onClick={player.prev}>
          <SkipIcon />
        </button>
        <button type="button" className="hp-btn hp-play" aria-label={playing ? 'Pause' : 'Play'} disabled={!track} onClick={player.toggle}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {playing ? <path d="M3.5 2.5 H6.5 V13.5 H3.5 Z M9.5 2.5 H12.5 V13.5 H9.5 Z" /> : <path d="M4 2.5 L13 8 L4 13.5 Z" />}
          </svg>
        </button>
        <button type="button" className="hp-btn" aria-label="Next track" disabled={!track || player.canNavigate === false} onClick={player.next}>
          <SkipIcon />
        </button>
        <input
          className="hp-volume"
          type="range"
          aria-label="Volume"
          disabled={player.canVolume === false}
          title={player.canVolume === false ? 'Use the source player for volume' : 'Volume'}
          min="0"
          max="1"
          step="0.05"
          value={player.volume}
          style={{ '--done': `${player.volume * 100}%` }}
          onChange={(e) => player.setVolume(Number(e.target.value))}
        />
      </div>
      {!track && <p className="hp-sub">Choose music from the library.</p>}
      {player.error && <p className="hp-sub" role="alert">{player.error}</p>}
    </section>
  );
}
