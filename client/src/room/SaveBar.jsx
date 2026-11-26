// Part of: Room page, side bar: save, share and delete buttons.
// Used by: RoomScreen.jsx.
import { useState } from 'react';
import { Link } from 'react-router-dom';

// The room name input (max 60 characters, same as the API).
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

// Save / share buttons; which ones show depends on the case:
//   new room -> "Save room" | saved + owner (has the edit key) -> "Save changes" (only when dirty) and "Delete room"
//   saved + not owner -> "Save my own copy" (a new room; nobody can edit without the key)
// Delete asks again inline (it cannot be undone). `status` = { kind: 'ok' | 'error', text }, shown as a toast (.status in CSS).
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
          <button type="button" className="chip" aria-label="Copy link" onClick={onCopy}>
            Copy
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
