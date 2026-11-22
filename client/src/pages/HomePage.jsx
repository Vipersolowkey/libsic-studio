import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearLastRoomCode, getLastRoomCode, getMyRooms, removeMyRoom } from '../myRooms.js';

// The five rooms of the intro. The pictures are stills of the real rooms: /scenes/<slug>/intro.webp.
// The intro does not need the API: "Enter" only opens /new?scene=<slug>, and the room loads itself.
const INTRO_ROOMS = [
  { slug: 'night-study', name: 'Rainy Night Study' },
  { slug: 'golden-loft', name: 'Golden Hour Loft' },
  { slug: 'underwater-nook', name: 'Clam Cove' },
  { slug: 'clover-meadow', name: 'Clover Hill Meadow' },
  { slug: 'aurora-observatory', name: 'Aurora Observatory' },
];
const LEAVE_MS = 900; // how long the "dive into the room" lasts before the room opens
const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 5) % 4),
  delay: -((i * 1.9) % 16),
  duration: 14 + ((i * 7) % 10),
}));

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// The start page (/): a short cinematic intro. The rooms drift past one by one; "Enter" dives into the one on screen.
// Share links (/r/<code>) skip it and open their room straight away.
export default function HomePage() {
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState(getMyRooms);
  const last = myRooms.find((r) => r.code === getLastRoomCode()) ?? myRooms[0];
  // the intro starts on the room of the last saved room, so "Your room" is what the first picture shows
  const [active, setActive] = useState(() => Math.max(0, INTRO_ROOMS.findIndex((r) => r.slug === last?.sceneSlug)));
  const [leaving, setLeaving] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const room = INTRO_ROOMS[active];
  const sceneName = (slug) => INTRO_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

  // Enter: the picture zooms in and fades to black, then the room opens (at once when the visitor prefers less motion).
  const enter = (e, to) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab etc.: let the link work normally
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(() => navigate(to), reducedMotion() ? 0 : LEAVE_MS);
  };

  const forget = (code) => {
    removeMyRoom(code);
    clearLastRoomCode(code);
    const rest = getMyRooms();
    setMyRooms(rest);
    if (rest.length === 0) setShowMine(false);
  };

  // One button. When this picture is the room you saved, it opens that room; otherwise it starts a new one here.
  const mine = last?.sceneSlug === room.slug ? last : myRooms.find((r) => r.sceneSlug === room.slug);
  const enterPath = mine ? `/r/${mine.code}` : `/new?scene=${room.slug}`;
  return (
    <main className={`intro${leaving ? ' leaving' : ''}`}>
      <div className="intro-bg" aria-hidden="true">
        {INTRO_ROOMS.map((r, i) => (
          <div key={r.slug} className={`intro-slide${i === active ? ' on' : ''}`}>
            <img src={`/scenes/${r.slug}/intro.webp`} alt="" draggable={false} style={{ '--kb': i }} onError={(e) => (e.target.style.visibility = 'hidden')} />
          </div>
        ))}
      </div>
      <div className="intro-shade" aria-hidden="true" />
      <div className="intro-dust" aria-hidden="true">
        {DUST.map((d, i) => (
          <span key={i} style={{ left: `${d.left}%`, width: d.size, height: d.size, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s` }} />
        ))}
      </div>

      <section className="intro-center">
        <span className="intro-disc" aria-hidden="true"><i /></span>
        <h1 aria-label="Libsic Studio">
          {'LIBSIC'.split('').map((ch, i) => (
            <span key={i} aria-hidden="true" style={{ animationDelay: `${0.25 + i * 0.07}s` }}>{ch}</span>
          ))}
          <small aria-hidden="true">STUDIO</small>
        </h1>
        <div className="intro-actions">
          <Link className="intro-enter" to={enterPath} onClick={(e) => enter(e, enterPath)}>
            {mine ? 'Your room' : 'Enter'}
          </Link>
        </div>
      </section>

      <nav className="intro-rooms" aria-label="Rooms">
        {INTRO_ROOMS.map((r, i) => (
          <button key={r.slug} type="button" className="intro-tab" aria-pressed={i === active} onClick={() => setActive(i)}>
            <span className="intro-tab-name">{r.name}</span>
            <span className="intro-tab-bar" aria-hidden="true">
              {i === active && <i key={active} onAnimationEnd={() => setActive((active + 1) % INTRO_ROOMS.length)} />}
            </span>
          </button>
        ))}
      </nav>

      {myRooms.length > 0 && (
        <div className="intro-mine">
          {showMine && (
            <ul className="intro-mine-panel">
              {myRooms.map((r) => (
                <li key={r.code}>
                  <Link to={`/r/${r.code}`} onClick={(e) => enter(e, `/r/${r.code}`)}>{r.name}</Link>
                  <span>{sceneName(r.sceneSlug)}</span>
                  <button type="button" className="link-button" title="Remove from this list (the room is not deleted)" onClick={() => forget(r.code)}>
                    Forget
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="intro-mine-toggle" aria-expanded={showMine} onClick={() => setShowMine(!showMine)}>
            My rooms ({myRooms.length})
          </button>
        </div>
      )}
    </main>
  );
}
