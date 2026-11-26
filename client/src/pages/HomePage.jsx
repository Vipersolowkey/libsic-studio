// Part of: Start page (/): the intro with the room tabs.
// Uses: myRooms.js, introRooms.js, AccountPill.jsx, ClaimPrompt.jsx, api.js (the signed-in person's rooms).
// Used by: App.jsx.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../account/AuthContext.jsx';
import AccountPill from '../account/AccountPill.jsx';
import ClaimPrompt from '../account/ClaimPrompt.jsx';
import { getAccountRooms } from '../api.js';
import { INTRO_ROOMS } from '../introRooms.js';
import { clearLastRoomCode, getLastRoomCode, getMyRooms, removeMyRoom } from '../myRooms.js';

const LEAVE_MS = 900; // length of the "dive" animation; must match the CSS in styles.css (.intro.leaving)
// Fixed (not random) values for the floating dust specks, so the page looks the same on every render.
const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 5) % 4),
  delay: -((i * 1.9) % 16),
  duration: 14 + ((i * 7) % 10),
}));

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// The start page (/): rooms drift past one by one (the progress bar's animation end moves to the next); Enter dives into the one on screen.
// Share links (/r/<code>) skip this page.
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [localRooms, setMyRooms] = useState(getMyRooms);
  // Rooms of the signed-in account (any device). They join the rooms saved in this browser; the page works without them.
  const [accountRooms, setAccountRooms] = useState([]);
  const who = user?.username;
  const loadAccountRooms = () => {
    if (!who) return setAccountRooms([]);
    return getAccountRooms().then(setAccountRooms).catch(() => {});
  };
  useEffect(() => {
    loadAccountRooms();
  }, [who]); // eslint-disable-line react-hooks/exhaustive-deps
  const onAccount = new Set(accountRooms.map((r) => r.code));
  const myRooms = [
    ...localRooms.map((r) => ({ ...r, onAccount: onAccount.has(r.code) })),
    ...accountRooms.filter((r) => !localRooms.some((l) => l.code === r.code)).map((r) => ({ ...r, onAccount: true })),
  ];
  const last = myRooms.find((r) => r.code === getLastRoomCode()) ?? myRooms[0];
  // Start on the scene of the last saved room, so the first picture is "Your room".
  const [active, setActive] = useState(() => Math.max(0, INTRO_ROOMS.findIndex((r) => r.slug === last?.sceneSlug)));
  const [leaving, setLeaving] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const room = INTRO_ROOMS[active];
  const sceneName = (slug) => INTRO_ROOMS.find((r) => r.slug === slug)?.name ?? slug;

  // Zoom + fade, then navigate. No wait when the visitor prefers reduced motion. Ctrl/Cmd/Shift-click opens a new tab as normal.
  const enter = (e, to) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(() => navigate(to), reducedMotion() ? 0 : LEAVE_MS);
  };

  // Removes the room from this browser's list only. The room itself stays online (and its edit key is lost).
  const forget = (code) => {
    removeMyRoom(code);
    clearLastRoomCode(code);
    const rest = getMyRooms();
    setMyRooms(rest);
    if (rest.length + accountRooms.length === 0) setShowMine(false);
  };

  // One button: opens your saved room for this picture if you have one, else starts a new room in this scene.
  const mine = last?.sceneSlug === room.slug ? last : myRooms.find((r) => r.sceneSlug === room.slug);
  const enterPath = mine ? `/r/${mine.code}` : `/new?scene=${room.slug}`;
  return (
    <main className={`intro${leaving ? ' leaving' : ''}`}>
      {/* Drifting background pictures: /scenes/<slug>/intro.webp */}
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

      {/* Sign in (or the signed-in name and its menu), and the offer to add this browser's rooms to the account */}
      <AccountPill />
      <ClaimPrompt onClaimed={loadAccountRooms} />

      {/* Logo + the Enter button (goes to /r/<code> if you saved a room in this scene, else /new?scene=<slug>) */}
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

      {/* Room tabs along the bottom; the progress bar moves to the next room by itself */}
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

      {/* My rooms (from myRooms.js): rooms saved in this browser */}
      {myRooms.length > 0 && (
        <div className="intro-mine">
          {showMine && (
            <ul className="intro-mine-panel">
              {myRooms.map((r) => (
                <li key={r.code}>
                  <Link to={`/r/${r.code}`} onClick={(e) => enter(e, `/r/${r.code}`)}>{r.name}</Link>
                  <span>{sceneName(r.sceneSlug)}</span>
                  {!r.onAccount && (
                    <button type="button" className="link-button" title="Remove from this list (the room is not deleted)" onClick={() => forget(r.code)}>
                      Forget
                    </button>
                  )}
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
