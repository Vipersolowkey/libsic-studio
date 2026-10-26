import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import CdPage from './pages/CdPage.jsx';

// Every address of the website and the page it shows.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/r/:code" element={<RoomPage />} />
      <Route path="/cd/:code" element={<CdPage />} />
      <Route
        path="*"
        element={
          <main className="message-page">
            <h1>Page not found</h1>
            <Link to="/">Back to the room</Link>
          </main>
        }
      />
    </Routes>
  );
}
