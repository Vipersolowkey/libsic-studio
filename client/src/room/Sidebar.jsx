// Part of: Room page: the left side bar frame.
// Used by: Controls.jsx, DecorateHud.jsx, RoomScreen.jsx.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AccountChip from '../account/AccountChip.jsx';

// The left side bar (a wheel turn over it only scrolls it and never zooms the picture): ALL controls live here (logo, rooms, mood, save/share).
//   open       false = tucked away (it slides out), only the round logo button remains
//   onToggle   hide / show
//   settings   rarely used view settings; shown in a small note opened by the top button (Esc closes it)
//   footer     the last section of the list (room name, save, My rooms) and, under it, the account button
//   children   the scrolling sections (use <Section>)
const EXIT_MS = 220; // same as the side-out animation in sidebarThemes.css
const canAnimate = () => typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Sidebar({ open, onToggle, footer, settings, children }) {
  const [notes, setNotes] = useState(false); // the settings note is shown
  useEffect(() => {
    if (!notes) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNotes(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notes]);

  // Tucking the bar away: keep it on screen for the length of its exit animation, then show the round logo.
  // (No exit when the person prefers reduced motion, or where the browser cannot tell, as in the tests.)
  const [wasOpen, setWasOpen] = useState(open);
  const [leaving, setLeaving] = useState(false);
  if (wasOpen !== open) {
    setWasOpen(open);
    setLeaving(wasOpen && !open && canAnimate());
  }
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!open && !leaving) {
    return (
      <button type="button" className="side-open side-fade" aria-label="Show the side bar" aria-expanded="false" onClick={onToggle} onWheel={(e) => e.stopPropagation()}>
        <span className="brand-disc" aria-hidden="true" />
      </button>
    );
  }
  return (
    <aside className={`sidebar paper side-fade${leaving ? ' leaving' : ''}`} aria-label="Room controls" aria-hidden={leaving || undefined} onWheel={(e) => e.stopPropagation()}>
      <header className="side-head">
        <Link className="brand" to="/" aria-label="Libsic Studio, back to the start page">
          <span className="brand-disc" aria-hidden="true" />
          <span className="brand-text">
            <span className="brand-name">Libsic Studio</span>
            <span className="brand-tag">ambient music room</span>
          </span>
        </Link>
        <span className="side-tools">
          {settings && (
            <button type="button" className="side-icon" aria-label="View settings" aria-expanded={notes} onClick={() => setNotes(!notes)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
            </button>
          )}
          <button type="button" className="side-icon side-hide" aria-label="Hide the side bar" aria-expanded="true" onClick={onToggle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </span>
      </header>
      {settings && notes && <div className="side-note paper" role="group" aria-label="View settings">{settings}</div>}
      <div className="side-body">
        {children}
        {footer && (
          <section className="side-section side-foot">
            <h2 className="side-title">Keep this room</h2>
            {footer}
            <div className="side-account"><AccountChip /></div>
          </section>
        )}
      </div>
    </aside>
  );
}

// One titled block of the side bar.
export function Section({ title, children }) {
  return (
    <section className="side-section">
      {title && <h2 className="side-title">{title}</h2>}
      {children}
    </section>
  );
}
