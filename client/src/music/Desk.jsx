import { Link } from 'react-router-dom';
import { skinOf } from '../room/skins.js';

// The wooden desk that the CD pages stand on. It uses the paper, wood and brass of the Golden Hour Loft, like the CD tower in the rooms.
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
