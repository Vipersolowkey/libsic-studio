// Part of: The studio page (/me): where the start page leads. Pick a room you already have, start a new one in any scene,
// open your CDs, and (signed in) change your name and disc colour. It works without an account too: a guest sees the rooms and
// CDs saved in this browser. It wears the same look as the admin page (a menu down the left, one page for each item), see
// account/admin.css and profile.css.
// Uses: AuthContext.jsx, AdminIcon.jsx, api.js, myRooms.js, music/myCds.js, introRooms.js, account.css, admin.css, profile.css.
// Used by: App.jsx.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../account/AuthContext.jsx';
import { Ico } from '../account/AdminIcon.jsx';
import { discColor } from '../account/discColor.js';
import { deleteRoom, getAccountCds, getAccountRooms } from '../api.js';
import { INTRO_ROOMS } from '../introRooms.js';
import { getMyCds, forgetCd } from '../music/myCds.js';
import { clearLastRoomCode, getMyRooms, removeMyRoom } from '../myRooms.js';
import StudioShell from '../account/StudioShell.jsx';

const sceneName = (slug) => INTRO_ROOMS.find((r) => r.slug === slug)?.name ?? slug;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');
const hideBroken = (e) => { e.currentTarget.style.visibility = 'hidden'; };
// The colours a person can pick for their disc. A colour saved earlier that is not in this list is shown first.
const SWATCHES = [38, 0, 18, 55, 95, 150, 180, 205, 235, 270, 305, 335];
// A steady colour for a word, used when an old CD has no saved look.
const hueOf = (word = '') => [...String(word)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 17);

const PAGES = ['rooms', 'new', 'cds', 'profile']; // the pages of the menu; the address can name one (/me?tab=cds)

// A list that may still be loading, may have failed, or may be empty.
function Lists({ items, empty, children }) {
  if (items === null) return <p className="adm-empty">Loading…</p>;
  if (items === 'error') return <p className="adm-empty">Could not load this list. Try again in a moment.</p>;
  if (items.length === 0 && empty !== null) return <p className="adm-empty">{empty}</p>;
  return children;
}

export default function ProfilePage() {
  const { user, checking, saveProfile } = useAuth();
  const [params] = useSearchParams();
  const asked = PAGES.includes(params.get('tab')) ? params.get('tab') : null; // the menu links to /me?tab=...
  const [localRooms, setLocalRooms] = useState(getMyRooms); // rooms saved in this browser (with their edit keys)
  const [localCds, setLocalCds] = useState(getMyCds);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [hue, setHue] = useState(user?.avatarHue ?? 38);
  const [note, setNote] = useState(null); // { kind: 'ok' | 'error', text }
  const [rooms, setRooms] = useState(null); // null = loading, 'error' = could not load
  const [cds, setCds] = useState(null);

  // The account's rooms and CDs (any device). A guest has none, only what this browser saved.
  const who = user?.username;
  useEffect(() => {
    if (!who) {
      setRooms([]);
      setCds([]);
      return undefined;
    }
    let cancelled = false;
    getAccountRooms().then((list) => !cancelled && setRooms(list)).catch(() => !cancelled && setRooms('error'));
    getAccountCds().then((list) => !cancelled && setCds(list)).catch(() => !cancelled && setCds('error'));
    return () => {
      cancelled = true;
    };
  }, [who]);

  // Rooms and CDs of the account, then the ones only this browser knows (they stay until they are added to an account or forgotten).
  const roomList = rooms === 'error' ? 'error' : rooms === null ? null : [
    ...rooms.map((r) => ({ ...r, onAccount: true })),
    ...localRooms.filter((l) => !rooms.some((r) => r.code === l.code)).map((r) => ({ ...r, name: r.name || 'Untitled room', onAccount: false })),
  ];
  const cdList = cds === 'error' ? 'error' : cds === null ? null : [
    ...cds.map((c) => ({ ...c, onAccount: true })),
    ...localCds.filter((l) => !cds.some((c) => c.code === l.code)).map((c) => ({ ...c, title: c.title || 'CD', onAccount: false })),
  ];
  // A person with no rooms yet lands on "New room" instead of an empty list (unless the address names a page).
  const noRooms = Array.isArray(roomList) && roomList.length === 0;
  const tab = asked ?? (noRooms ? 'new' : 'rooms');

  async function save(e) {
    e.preventDefault();
    setNote(null);
    try {
      await saveProfile({ displayName: displayName.trim(), avatarHue: hue });
      setNote({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      setNote({ kind: 'error', text: err.message });
    }
  }
  // Forgets a room or CD saved only in this browser. The room itself stays online; only the edit key kept here is lost.
  const forgetRoom = (code) => {
    removeMyRoom(code);
    clearLastRoomCode(code);
    setLocalRooms(getMyRooms());
  };
  // Copies a room's share link (the same address the room's side bar shares).
  const [copied, setCopied] = useState(null); // the code of the room whose link was just copied
  async function copyLink(code) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
      setCopied(code);
      setRoomError('');
    } catch {
      setRoomError('Could not copy automatically. Open the room and copy its link from the address bar.');
    }
  }
  // Deleting a room for good. It asks once more inside the card (asking = the code waiting for "Yes, delete").
  const [asking, setAsking] = useState(null);
  const [roomError, setRoomError] = useState('');
  async function removeRoom(room) {
    setRoomError('');
    try {
      await deleteRoom(room.code, room.editKey ?? null);
    } catch (err) {
      setRoomError(err.message);
      return;
    }
    setAsking(null);
    forgetRoom(room.code);
    setRooms((list) => (Array.isArray(list) ? list.filter((r) => r.code !== room.code) : list));
  }
  const forgetLocalCd = (code) => {
    forgetCd(code);
    setLocalCds(getMyCds());
  };

  const count = (items) => (Array.isArray(items) ? items.length : null);
  const counts = { rooms: count(roomList), cds: count(cdList) };
  const swatches = SWATCHES.includes(hue) ? SWATCHES : [hue, ...SWATCHES];
  const guest = !user;
  const shownName = guest ? 'Your studio' : user.displayName || user.username;

  const here = guest && tab === 'profile' ? 'rooms' : tab;

  return (
    <StudioShell current={here} counts={counts}>
      <header className="adm-topbar">
        <h1 className="adm-h1">{shownName}</h1>
      </header>

      {here === 'rooms' && (
        <section className="adm-sec" aria-labelledby="rooms-h">
          <h2 className="adm-title" id="rooms-h"><Ico n="room" />My rooms</h2>
          <div className="pf-actions">
            <Link className="adm-btn primary" to="/me?tab=new"><Ico n="plus" />Make a room</Link>
            {guest && roomList?.length > 0 && <span className="adm-lead">These rooms are saved in this browser. <Link to="/login?next=/me">Sign in</Link> to keep them on every device.</span>}
          </div>
          {roomError && <p role="alert" className="adm-alert">{roomError}</p>}
          <Lists items={roomList} empty={null}>
            {roomList?.length === 0 ? (
              <div className="pf-empty">
                <p>No rooms yet. Pick a scene and make your first one.</p>
                <Link className="adm-btn primary" to="/me?tab=new">New room</Link>
              </div>
            ) : (
              <ul className="pf-rooms">
                {roomList?.map((r) => (
                  <li key={r.code} className="pf-room">
                    <img src={`/scenes/${r.sceneSlug}/preview.webp`} alt="" loading="lazy" draggable={false} onError={hideBroken} />
                    <div className="pf-room-text">
                      <Link to={`/r/${r.code}`}>{r.name}</Link>
                      <span>{sceneName(r.sceneSlug)}</span>
                      <small>{day(r.updatedAt)}</small>
                    </div>
                    {asking === r.code ? (
                      <div className="pf-tools pf-sure" role="group" aria-label={`Delete ${r.name}?`}>
                        <p>Delete this room for everyone? This cannot be undone.</p>
                        <button type="button" className="pf-tool hot" onClick={() => removeRoom(r)}>Yes, delete</button>
                        <button type="button" className="pf-tool" onClick={() => setAsking(null)}>Keep it</button>
                      </div>
                    ) : (
                      <div className="pf-tools">
                        <button type="button" className="pf-tool" aria-label={`Copy link to ${r.name}`} onClick={() => copyLink(r.code)}>
                          {copied === r.code ? 'Link copied' : 'Copy link'}
                        </button>
                        {!r.onAccount && (
                          <button type="button" className="pf-tool" title="Remove from this list. The room is not deleted." aria-label={`Forget ${r.name}`} onClick={() => forgetRoom(r.code)}>Forget</button>
                        )}
                        {(r.onAccount || r.editKey) && (
                          <button type="button" className="pf-tool del" aria-label={`Delete ${r.name}`} onClick={() => setAsking(r.code)}>Delete</button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Lists>
        </section>
      )}

      {here === 'new' && (
        <section className="adm-sec" aria-labelledby="new-h">
          <h2 className="adm-title" id="new-h"><Ico n="plus" />New room</h2>
          <p className="adm-lead">Choose a scene. You can change its mood and decorate it inside.</p>
          <ul className="pf-rooms pf-scenes">
            {INTRO_ROOMS.map((r) => (
              <li key={r.slug} className="pf-room">
                <img src={`/scenes/${r.slug}/preview.webp`} alt="" loading="lazy" draggable={false} onError={hideBroken} />
                <div className="pf-room-text">
                  <Link to={`/new?scene=${r.slug}`} aria-label={`Make a room in ${r.name}`}>{r.name}</Link>
                  <span>Start a room here</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {here === 'cds' && (
        <section className="adm-sec" aria-labelledby="cds-h">
          <h2 className="adm-title" id="cds-h"><Ico n="disc" />My CDs</h2>
          <div className="pf-actions">
            <Link className="adm-btn primary" to="/music"><Ico n="plus" />Make a CD</Link>
            {guest && cdList?.length > 0 && <span className="adm-lead">These CDs are saved in this browser. <Link to="/login?next=/me">Sign in</Link> to keep them on every device.</span>}
          </div>
          <Lists items={cdList} empty="No CDs yet. Make one from several links or our own tracks, and give it a share code.">
            <ul className="pf-cds">
              {cdList?.map((c) => (
                <li key={c.code} className="pf-cd">
                  <i className="pf-cd-disc" style={{ '--h': c.look?.hue ?? hueOf(c.title) }} aria-hidden="true" />
                  <div className="pf-room-text">
                    <Link to={`/cd/${c.code}`}>{c.title}</Link>
                    <small>{day(c.updatedAt)}</small>
                  </div>
                  {!c.onAccount && (
                    <button type="button" className="pf-forget" title="Remove from this list. The CD is not deleted." aria-label={`Forget ${c.title}`} onClick={() => forgetLocalCd(c.code)}>Forget</button>
                  )}
                </li>
              ))}
            </ul>
          </Lists>
        </section>
      )}

      {here === 'profile' && !guest && (
        <>
          <section className="adm-sec" aria-labelledby="profile-h">
            <h2 className="adm-title" id="profile-h"><Ico n="user" />Profile</h2>
            <form className="pf-form" onSubmit={save}>
              <i className="account-disc big pf-preview" style={{ '--disc': discColor(hue) }} aria-hidden="true" />
              <div className="pf-fields">
                <label htmlFor="profile-name">Display name</label>
                <input id="profile-name" type="text" maxLength={30} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={user.username} />
                <span className="pf-label" id="hue-label">Disc colour</span>
                <div className="pf-swatches" role="radiogroup" aria-labelledby="hue-label">
                  {swatches.map((h) => (
                    <button key={h} type="button" role="radio" aria-checked={hue === h} aria-label={`Colour ${h}`} className="pf-swatch" style={{ '--disc': discColor(h) }} onClick={() => setHue(h)} />
                  ))}
                </div>
                <div className="pf-save">
                  <button type="submit" className="adm-btn primary">Save</button>
                  {note && <span role="status" className={`pf-note ${note.kind}`}>{note.text}</span>}
                </div>
              </div>
            </form>
          </section>
        </>
      )}
    </StudioShell>
  );
}
