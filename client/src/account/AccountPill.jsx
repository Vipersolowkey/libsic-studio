// Part of: Accounts: the Sign in button (or the signed-in name with its small menu) in the corner of the start page.
// Uses: AuthContext.jsx, discColor.js, account.css.
// Used by: HomePage.jsx.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { discColor } from './discColor.js';
import './account.css';

export default function AccountPill() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) {
    return (
      <div className="account-pill-wrap">
        <Link className="account-pill" to="/login">Sign in</Link>
      </div>
    );
  }
  return (
    <div className="account-pill-wrap">
      <button type="button" className="account-pill" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <i className="account-disc" style={{ '--disc': discColor(user.avatarHue) }} aria-hidden="true" />
        <span>{user.displayName || user.username}</span>
      </button>
      {open && (
        <ul className="account-menu" role="menu">
          <li role="none"><Link role="menuitem" to="/me">Profile and rooms</Link></li>
          {user.role === 'admin' && <li role="none"><Link role="menuitem" to="/admin">Admin</Link></li>}
          <li role="none">
            <button type="button" role="menuitem" onClick={() => { setOpen(false); signOut(); }}>Sign out</button>
          </li>
        </ul>
      )}
    </div>
  );
}
