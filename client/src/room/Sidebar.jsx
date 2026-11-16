import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// The side bar at the left of the room. Everything a visitor can press lives in here and nowhere else:
// the logo, the list of rooms, the settings, saving and sharing.
//   open       false: the bar is tucked away and only the round logo button is left, so the whole picture shows
//   onToggle   called by the hide button and by the logo button
//   children   the sections of the bar (see Section below); they scroll when the window is low
//   footer     what stays pinned at the bottom of the bar (the room's name, saving)
export default function Sidebar({ open, onToggle, footer, children }) {
  if (!open) {
    return (
      <button type="button" className="side-open side-fade" aria-label="Show the side bar" aria-expanded="false" onClick={onToggle}>
        <span className="brand-disc" aria-hidden="true" />
      </button>
    );
  }
  return (
    <aside className="sidebar side-fade" aria-label="Room controls">
      <header className="side-head">
        <Link className="brand" to="/" aria-label="Libsic Studio, back to the start page">
          <span className="brand-disc" aria-hidden="true" />
          <span className="brand-text">
            <span className="brand-name">Libsic Studio</span>
            <span className="brand-tag">ambient music room</span>
          </span>
        </Link>
        <button type="button" className="side-hide" aria-label="Hide the side bar" aria-expanded="true" onClick={onToggle}>
          <span aria-hidden="true">&#8249;</span>
        </button>
      </header>
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

// A block that starts folded shut behind a small button, for the settings that are rarely needed.
export function More({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // The block opens at the bottom of a list that scrolls, so it is brought into view; otherwise nothing seems to happen.
  useEffect(() => {
    if (open) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [open]);
  return (
    <section className="side-section" ref={ref}>
      <button type="button" className="side-more" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label} <span aria-hidden="true">{open ? '\u2212' : '+'}</span>
      </button>
      {open && <div className="side-more-body">{children}</div>}
    </section>
  );
}
