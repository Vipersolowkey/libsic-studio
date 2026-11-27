// Part of: Start page (/): the intro with the room tabs. Its one button leads to the studio page (/me), where the person
// picks a room they already have or starts a new one.
// Uses: introRooms.js, AccountPill.jsx, ClaimPrompt.jsx.
// Used by: App.jsx.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AccountPill from '../account/AccountPill.jsx';
import ClaimPrompt from '../account/ClaimPrompt.jsx';
import { INTRO_ROOMS } from '../introRooms.js';

const LEAVE_MS = 900; // length of the "dive" animation; must match the CSS in styles.css (.intro.leaving)
// Fixed (not random) values for the floating dust specks, so the page looks the same on every render.
const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 5) % 4),
  delay: -((i * 1.9) % 16),
  duration: 14 + ((i * 7) % 10),
}));

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// The start page (/): rooms drift past one by one (the progress bar's animation end moves to the next); Enter dives on to the studio page.
// Share links (/r/<code>) skip this page.
export default function HomePage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Zoom + fade, then navigate. No wait when the visitor prefers reduced motion. Ctrl/Cmd/Shift-click opens a new tab as normal.
  const enter = (e, to) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(() => navigate(to), reducedMotion() ? 0 : LEAVE_MS);
  };

  // One button: it leads to the studio page, where rooms are picked or made.
  const enterPath = '/me';
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
      <ClaimPrompt />

      {/* Logo + the Enter button (goes to the studio page, /me) */}
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
            Enter
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
    </main>
  );
}
