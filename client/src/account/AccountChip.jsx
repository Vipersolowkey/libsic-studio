// Part of: Accounts: a small "who am I" button for the room's side bar.
// Uses: AuthContext.jsx, account.css.
// Used by: (to be placed by the side bar) the footer of Sidebar.jsx.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { discColor } from './discColor.js';
import './account.css';

// Signed out: a "Sign in" link that brings the person back to this room afterwards. Signed in: their disc and name, linking to the profile.
export default function AccountChip() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) {
    return (
      <Link className="account-chip" to={`/login?next=${encodeURIComponent(pathname)}`}>
        Sign in
      </Link>
    );
  }
  return (
    <Link className="account-chip signed-in" to="/me" title="Your profile">
      <i className="account-disc" style={{ '--disc': discColor(user.avatarHue) }} aria-hidden="true" />
      <span>{user.displayName || user.username}</span>
    </Link>
  );
}
