// Part of: Room page, side bar: the "Go to" links. The studio page (rooms, CDs, profile), Sign in for a visitor, and the Admin page for an admin.
// Uses: AuthContext.jsx.
// Used by: Sidebar.jsx.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// Sign in brings the person back to this room afterwards; the admin page's "Back to app" brings an admin back here too (the address is passed along).
export default function GoTo() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  return (
    <nav className="side-go" aria-label="Go to">
      <Link to="/me">My studio</Link>
      {!user && <Link to={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>}
      {user?.role === 'admin' && (
        <Link to="/admin" state={{ from: pathname + search }}>Admin page</Link>
      )}
    </nav>
  );
}
