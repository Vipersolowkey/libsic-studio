import { Link } from 'react-router-dom';

// Saving and sharing. What it shows depends on the situation:
//   new room                 -> "Save room"
//   saved room, our own      -> "Save changes" and "Delete room" (this browser holds the edit key)
//   saved room, someone else -> "Save my own copy" (without the edit key nobody can change it)
export default function SaveBar({ saved, isOwner, name, onNameChange, dirty, busy, status, link, onSaveNew, onSaveChanges, onDelete, onCopy }) {
  return (
    <div className="savebar">
      <label className="name-field">
        <span>Room name</span>
        <input type="text" value={name} maxLength={60} placeholder="Untitled room" onChange={(e) => onNameChange(e.target.value)} />
      </label>

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
          <button type="button" className="chip danger" disabled={busy} onClick={onDelete}>
            Delete room
          </button>
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
        <p className={`status ${status.kind}`} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}
