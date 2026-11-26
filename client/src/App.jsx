// Part of: App routes: which page each address shows.
// Uses: AdminPage.jsx, CdPage.jsx, HomePage.jsx, LoginPage.jsx, MusicPage.jsx, ProfilePage.jsx, RoomPage.jsx, RoomScreen.jsx, music.css, workshop.css.
// Used by: main.jsx.
import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { trackPage } from './analytics.js';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import CdPage from './pages/CdPage.jsx';
import MusicPage from './pages/MusicPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import './music/music.css';
import './music/workshop.css';
import RoomScreen from './room/RoomScreen.jsx';

// Every address of the site and its page. /new and /r/:code both show RoomScreen (new vs saved room).
// Unknown addresses fall through to the "Page not found" route. music.css / workshop.css are loaded here because several pages share them.
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPage(pathname); // an anonymous page count, see analytics.js
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new" element={<RoomScreen />} />
      <Route path="/r/:code" element={<RoomPage />} />
      <Route path="/cd/:code" element={<CdPage />} />
      <Route path="/music" element={<MusicPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/me" element={<ProfilePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="*"
        element={
          <main className="message-page">
            <h1>Page not found</h1>
            <Link to="/">Back to the start page</Link>
          </main>
        }
      />
    </Routes>
  );
}
