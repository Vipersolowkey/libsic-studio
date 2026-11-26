// Part of: Music: the wooden desk frame of the CD pages.
// Uses: skins.js.
// Used by: CdPage.jsx, MusicPage.jsx.
import { Link } from 'react-router-dom';
import { skinOf } from '../room/skins.js';

// Page frame for /music and /cd/:code: a wooden desk using the Golden Hour Loft colours. `nav` = extra link top right.
export default function Desk({ nav, children }) {
  return (
    <main className="mk-desk" style={skinOf('golden-loft').vars}>
      <div className="mk-wrap">
        <nav className="mk-nav">
          <Link to="/" className="mk-brand"><i aria-hidden="true" />Libsic Studio</Link>
          <span>{nav}</span>
        </nav>
        {children}
      </div>
    </main>
  );
}
