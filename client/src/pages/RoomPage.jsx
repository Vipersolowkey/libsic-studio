import { useParams, Link } from 'react-router-dom';

// Placeholder: opening a saved room by its share code arrives in Task 10b.
export default function RoomPage() {
  const { code } = useParams();
  return (
    <main className="message-page">
      <h1>Room {code}</h1>
      <p>Opening saved rooms is coming soon.</p>
      <Link to="/">Back to the room</Link>
    </main>
  );
}
