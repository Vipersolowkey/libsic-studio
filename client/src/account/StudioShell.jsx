// Part of: The studio's page frame: the menu down the left (brand, who you are, the pages, "Go to") and the page next to it.
// Shared by the studio page (/me), the CD workshop (/music) and the page of one CD (/cd/:code), so they all look alike, with or
// without an account. Look: account/admin.css (the shell) and account/profile.css.
//   current   which menu item is lit: rooms, new, cds, music or profile
//   counts    optional { rooms, cds } shown beside the items
// "New room" sits under "My rooms" and "Make a CD" under "My CDs", as indented sub-items. Every item is a link: the pages of the
// studio are /me?tab=rooms|new|cds|profile, and Make a CD is /music.
// Uses: AuthContext.jsx, AdminIcon.jsx, discColor.js.
// Used by: ProfilePage.jsx, MusicPage.jsx, CdPage.jsx (through Desk.jsx).
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Ico } from './AdminIcon.jsx';
import { discColor } from './discColor.js';
import './account.css';
import './admin.css';
import './profile.css';

const ITEMS = [
  { key: 'rooms', label: 'My rooms', icon: 'room', to: '/me?tab=rooms' },
  { key: 'new', label: 'New room', icon: 'plus', to: '/me?tab=new', sub: true },
  { key: 'cds', label: 'My CDs', icon: 'disc', to: '/me?tab=cds' },
  { key: 'music', label: 'Make a CD', icon: 'discPlus', to: '/music', sub: true },
  { key: 'profile', label: 'Profile', icon: 'user', to: '/me?tab=profile', signedIn: true },
];

export default function StudioShell({ current, counts = {}, children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const guest = !user;
  const items = ITEMS.filter((i) => !i.signedIn || !guest);
  const shownName = guest ? 'Your studio' : user.displayName || user.username;
  const count = (key) => (counts[key] === undefined || counts[key] === null ? null : <span className="adm-menu-count" aria-hidden="true">{counts[key]}</span>);
  const leave = () => {
    signOut();
    navigate('/');
  };

  return (
    <main className="adm pf">
      <aside className="adm-nav" aria-label="Studio menu">
        <Link className="adm-brand" to="/" aria-label="Libsic Studio, back to the start page">
          <span className="adm-disc" aria-hidden="true" />
          <span className="adm-brand-name">Libsic Studio</span>
        </Link>

        <div className="adm-me">
          <i className="account-disc pf-mini" style={{ '--disc': discColor(guest ? 38 : user.avatarHue) }} aria-hidden="true" />
          <span className="adm-me-text">
            <span className="adm-me-name">{shownName}</span>
            <span className="adm-me-role">{guest ? 'Not signed in' : `@${user.username}${user.role === 'admin' ? ' · Admin' : ''}`}</span>
          </span>
        </div>

        <p className="adm-nav-title">Menu</p>
        <nav className="adm-menu" aria-label="Your studio">
          {items.map((i) => (
            <Link key={i.key} to={i.to} className={i.sub ? 'adm-sub' : undefined} aria-current={current === i.key ? 'page' : undefined}>
              <Ico n={i.icon} />
              <span className="adm-menu-label">{i.label}</span>
              {count(i.key)}
            </Link>
          ))}
        </nav>

        <div className="adm-goto">
          <p className="adm-nav-title">Go to</p>
          <div className="adm-menu">
            <Link to="/"><Ico n="back" /><span className="adm-menu-label">Start page</span></Link>
            {!guest && user.role === 'admin' && <Link to="/admin" state={{ from: '/me' }}><Ico n="shield" /><span className="adm-menu-label">Admin page</span></Link>}
            {guest ? (
              <Link to="/login?next=/me"><Ico n="user" /><span className="adm-menu-label">Sign in</span></Link>
            ) : (
              <button type="button" onClick={leave}><Ico n="out" /><span className="adm-menu-label">Sign out</span></button>
            )}
          </div>
        </div>
      </aside>

      <div className="adm-main">{children}</div>
    </main>
  );
}
