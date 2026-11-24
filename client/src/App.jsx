import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import CdPage from './pages/CdPage.jsx';
import MusicPage from './pages/MusicPage.jsx';
import './music/music.css';
import './music/workshop.css';
import RoomScreen from './room/RoomScreen.jsx';

// Every address of the website and the page it shows.
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isWorkshop = pathname === '/music';
    document.title = isWorkshop ? 'Make a CD — Libsic Studio' : 'Libsic Studio — Your cozy music room';
    const description = isWorkshop
      ? 'Make and share a custom CD with music links or studio tracks in Libsic Studio.'
      : 'Create a cozy music room for studying, working or relaxing. Decorate your space, play ambient music and share your room with Libsic Studio.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (pathname === '/' || isWorkshop) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = `https://libsic.id.vn${isWorkshop ? '/music' : '/'}`;
    } else canonical?.remove();
  }, [pathname]);
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new" element={<RoomScreen />} />
      <Route path="/r/:code" element={<RoomPage />} />
      <Route path="/cd/:code" element={<CdPage />} />
      <Route path="/music" element={<MusicPage />} />
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
