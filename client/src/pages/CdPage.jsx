import { useParams, Link } from 'react-router-dom';

// Placeholder: opening a shared CD by its code arrives with the CD player (Lane A).
export default function CdPage() {
  const { code } = useParams();
  return (
    <main className="message-page">
      <h1>CD {code}</h1>
      <p>Shared CDs are coming soon.</p>
      <Link to="/">Back to the room</Link>
    </main>
  );
}
