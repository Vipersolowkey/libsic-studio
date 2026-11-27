// Part of: Room page, side bar: the name, the Save button and the share link.
// Used by: RoomScreen.jsx.

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
//   new room -> "Save room" | saved + owner (has the edit key, or the signed-in account owns it) -> "Save changes" (only when dirty)
//   saved + not owner -> "Save my own copy" (a new room; nobody can edit without the key)
// The share link and its Copy button show once the room is saved. Deleting a room is done on the studio page (/me).
// `status` = { kind: 'ok' | 'error', text }, shown as a toast (.status in CSS).
export default function SaveBar({ saved, isOwner, dirty, busy, status, link, onSaveNew, onSaveChanges, onCopy, onDismissStatus }) {
  return (
    <div className="savebar">
      {!saved && (
        <button type="button" className="chip primary" disabled={busy} onClick={onSaveNew}>
          Save room
        </button>
      )}
      {saved && isOwner && (
        <button type="button" className="chip primary" disabled={busy || !dirty} onClick={onSaveChanges}>
          Save changes
        </button>
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
