import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// The side bar at the left of the room: a page of paper pinned over the picture. Everything a visitor can press lives
// in here and nowhere else: the logo, the rooms, the mood of the room, saving and sharing.
//   open       false: the bar is tucked away and only the round logo button is left, so the whole picture shows
//   onToggle   called by the hide button and by the logo button
//   settings   the rarely used view settings (zoom, where the player floats, low power). They are not in the page
//              itself: a small button at the top opens them in a little note next to the bar.
//   footer     what stays pinned at the bottom of the page (naming and keeping the room)
//   children   the sections of the page (see Section below); they scroll when the window is low
export default function Sidebar({ open, onToggle, footer, settings, children }) {
  const [notes, setNotes] = useState(false); // the settings note is shown
  useEffect(() => {
    if (!notes) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNotes(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notes]);

  if (!open) {
    return (
      <button type="button" className="side-open side-fade" aria-label="Show the side bar" aria-expanded="false" onClick={onToggle}>
        <span className="brand-disc" aria-hidden="true" />
      </button>
    );
  }
  return (
    <aside className="sidebar paper side-fade" aria-label="Room controls">
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
      <div className="side-body">{children}</div>
      {footer && <footer className="side-foot">{footer}</footer>}
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
