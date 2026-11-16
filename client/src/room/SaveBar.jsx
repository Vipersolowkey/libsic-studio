import { useState } from 'react';
import { Link } from 'react-router-dom';

// The room's name, edited in place at the top of the room.
export function RoomNameField({ name, onNameChange }) {
  return (
    <input
      className="room-name"
      type="text"
      aria-label="Room name"
      value={name}
      maxLength={60}
      placeholder="Untitled room"
      onChange={(e) => onNameChange(e.target.value)}
    />
  );
}

// Saving and sharing. What it shows depends on the situation:
//   new room                 -> "Save room"
//   saved room, our own      -> "Save changes" and "Delete room" (this browser holds the edit key)
//   saved room, someone else -> "Save my own copy" (without the edit key nobody can change it)
// Deleting asks once more inside the bar itself ("Delete for everyone?"), because it cannot be undone.
// A note about what just happened (saved, copied, an error) pops up at the bottom of the screen; see .status.
export default function SaveBar({ saved, isOwner, dirty, busy, status, link, onSaveNew, onSaveChanges, onDelete, onCopy, onDismissStatus }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="savebar">
      {!saved && (
        <button type="button" className="chip primary" disabled={busy} onClick={onSaveNew}>
          Save room
        </button>
      )}
      {saved && isOwner && (
        <>
          <button type="button" className="chip primary" disabled={busy || !dirty} onClick={onSaveChanges}>
            Save changes
          </button>
          {!confirming && (
            <button type="button" className="chip danger" disabled={busy} onClick={() => setConfirming(true)}>
              Delete room
            </button>
          )}
          {confirming && (
            <div className="confirm" role="group" aria-label="Delete this room?">
              <p>Delete this room for everyone? This cannot be undone.</p>
              <button
                type="button"
                className="chip danger solid"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  onDelete();
                }}
              >
                Yes, delete
              </button>
              <button type="button" className="chip" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </div>
          )}
        </>
      )}
      {saved && !isOwner && (
        <button type="button" className="chip primary" disabled={busy} onClick={onSaveNew}>
          Save my own copy
        </button>
      )}

      {saved && (
        <div className="link-field">
          <input type="text" readOnly aria-label="Share link" value={link} onFocus={(e) => e.target.select()} />
          <button type="button" className="chip" onClick={onCopy}>
            Copy link
          </button>
        </div>
      )}
      {saved && (
        <Link className="chip" to="/new">
          New room
        </Link>
      )}

      {status && (
        <p key={status.text} className={`status ${status.kind}`} role="status">
          <span className="status-mark" aria-hidden="true">
            {status.kind === 'error' ? '!' : '\u2713'}
          </span>
          <span>{status.text}</span>
          {status.kind === 'error' && onDismissStatus && (
            <button type="button" className="status-close" aria-label="Close this message" onClick={onDismissStatus}>
              &times;
            </button>
          )}
        </p>
      )}
    </div>
  );
}
