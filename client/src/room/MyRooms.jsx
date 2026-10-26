import { useState } from 'react';
import { Link } from 'react-router-dom';

// The list of rooms this browser has saved. "Forget" only removes a room from this list;
// the room itself stays on the server and its share link keeps working.
export default function MyRooms({ rooms, scenes, currentCode, onForget }) {
  const [open, setOpen] = useState(false);
  const sceneName = (slug) => scenes.find((s) => s.slug === slug)?.name ?? slug;

  return (
    <div className="my-rooms">
      <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen(!open)}>
        My rooms ({rooms.length})
      </button>
      {open && (
        <div className="my-rooms-panel">
          {rooms.length === 0 ? (
            <p className="muted">No saved rooms yet. Save a room and it shows up here.</p>
          ) : (
            <ul>
              {rooms.map((room) => (
                <li key={room.code}>
                  <Link to={`/r/${room.code}`} aria-current={room.code === currentCode ? 'page' : undefined}>
                    {room.name}
                  </Link>
                  <span className="muted">{sceneName(room.sceneSlug)}</span>
                  <button type="button" className="link-button" title="Remove from this list (the room is not deleted)" onClick={() => onForget(room.code)}>
                    Forget
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link className="chip" to="/new" onClick={() => setOpen(false)}>
            New room
          </Link>
        </div>
      )}
    </div>
  );
}
