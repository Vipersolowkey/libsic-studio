import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createRoom, deleteRoom, getRoom, getScenes, updateRoom } from '../api.js';
import {
  clearLastRoomCode,
  getMyRooms,
  removeMyRoom,
  saveMyRoom,
  setLastRoomCode,
  updateMyRoom,
} from '../myRooms.js';
import SceneStage from '../scene/SceneStage.jsx';
import { defaultSettings } from '../scene/sceneSettings.js';
import Controls from './Controls.jsx';
import MyRooms from './MyRooms.jsx';
import SaveBar from './SaveBar.jsx';

// One room on screen. With a `code` it opens that saved room, without one it is a new, unsaved room.
export default function RoomScreen({ code }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [scenes, setScenes] = useState(null); // null = still loading
  const [saved, setSaved] = useState(null); // the room as stored on the server, null for a new room
  const [loadError, setLoadError] = useState(null); // { message } or { notFound: true }
  const [attempt, setAttempt] = useState(0); // bump to try loading again

  const [slug, setSlug] = useState('');
  const [settings, setSettings] = useState({ effect: 'none', lightOn: true });
  const [name, setName] = useState('');

  const [myRooms, setMyRooms] = useState(getMyRooms);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => statusAfterSave(location.state));

  const editKey = myRooms.find((r) => r.code === code)?.editKey ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    Promise.all([getScenes(), code ? getRoom(code) : Promise.resolve(null)])
      .then(([list, room]) => {
        if (cancelled) return;
        setScenes(list);
        if (room) {
          const scene = list.find((s) => s.slug === room.sceneSlug) || list[0];
          setSaved(room);
          setSlug(scene?.slug ?? '');
          setSettings({ effect: room.settings.effect, lightOn: room.settings.lightOn });
          setName(room.name);
          setLastRoomCode(room.code);
        } else if (list.length > 0) {
          setSlug(list[0].slug);
          setSettings(defaultSettings(list[0]));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (code && err.status === 404) {
          clearLastRoomCode(code);
          setLoadError({ notFound: true });
        } else {
          setLoadError({ message: err.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  if (loadError?.notFound) {
    return (
      <main className="message-page">
        <h1>Room not found</h1>
        <p>This room does not exist. It may have been deleted, or the link is wrong.</p>
        <Link to="/new">Start a new room</Link>
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="message-page">
        <h1>Libsic Studio</h1>
        <p>{loadError.message}</p>
        <button type="button" className="chip" onClick={() => setAttempt(attempt + 1)}>
          Try again
        </button>
      </main>
    );
  }
  if (scenes === null) {
    return (
      <main className="message-page">
        <p>Loading…</p>
      </main>
    );
  }
  if (scenes.length === 0) {
    return (
      <main className="message-page">
        <p>No scenes yet. Run "npm run seed:scenes" in the api folder.</p>
      </main>
    );
  }

  const scene = scenes.find((s) => s.slug === slug) || scenes[0];
  const isOwner = Boolean(saved && editKey);
  const dirty =
    saved !== null &&
    (name !== saved.name ||
      slug !== saved.sceneSlug ||
      settings.effect !== saved.settings.effect ||
      settings.lightOn !== saved.settings.lightOn);
  const link = saved ? `${window.location.origin}/r/${saved.code}` : '';

  const payload = () => ({ name: name.trim() || 'Untitled room', sceneSlug: scene.slug, settings });

  // Runs a save/delete action: blocks the buttons meanwhile and shows any error from the API.
  async function run(action) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (err) {
      setStatus({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const chooseScene = (next) => {
    setSlug(next.slug);
    setSettings(defaultSettings(next));
  };

  // Saves a new room (or a copy of someone else's), remembers its edit key in this browser and opens its page.
  const saveNew = () =>
    run(async () => {
      const { room, editKey: newKey } = await createRoom(payload());
      const remembered = saveMyRoom({ code: room.code, editKey: newKey, name: room.name, sceneSlug: room.sceneSlug });
      setLastRoomCode(room.code);
      navigate(`/r/${room.code}`, { replace: true, state: { justSaved: true, unsavedKey: remembered ? null : newKey } });
    });

  const saveChanges = () =>
    run(async () => {
      const room = await updateRoom(saved.code, editKey, payload());
      setSaved(room);
      updateMyRoom(room.code, { name: room.name, sceneSlug: room.sceneSlug });
      setMyRooms(getMyRooms());
      setStatus({ kind: 'ok', text: 'Changes saved.' });
    });

  const removeRoom = () => {
    if (!window.confirm('Delete this room for everyone? This cannot be undone.')) return;
    run(async () => {
      await deleteRoom(saved.code, editKey);
      removeMyRoom(saved.code);
      clearLastRoomCode(saved.code);
      navigate('/new');
    });
  };

  const forget = (roomCode) => {
    removeMyRoom(roomCode);
    clearLastRoomCode(roomCode);
    setMyRooms(getMyRooms());
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus({ kind: 'ok', text: 'Link copied.' });
    } catch {
      setStatus({ kind: 'error', text: 'Could not copy automatically. Select the link and copy it by hand.' });
    }
  }

  return (
    <div className="home">
      <SceneStage scene={scene} settings={settings} onSettingsChange={setSettings} />
      <Controls scenes={scenes} scene={scene} settings={settings} onChooseScene={chooseScene} onSettingsChange={setSettings} />
      <div className="room-bar">
        <SaveBar
          saved={saved}
          isOwner={isOwner}
          name={name}
          onNameChange={setName}
          dirty={dirty}
          busy={busy}
          status={status}
          link={link}
          onSaveNew={saveNew}
          onSaveChanges={saveChanges}
          onDelete={removeRoom}
          onCopy={copyLink}
        />
        <MyRooms rooms={myRooms} scenes={scenes} currentCode={code} onForget={forget} />
      </div>
    </div>
  );
}

// The message shown right after a room was saved (the page was opened with this note from the save button).
function statusAfterSave(state) {
  if (!state?.justSaved) return null;
  if (state.unsavedKey) {
    return {
      kind: 'error',
      text: `Room saved, but this browser cannot remember it. Write down your edit key, it is shown only once: ${state.unsavedKey}`,
    };
  }
  return { kind: 'ok', text: 'Room saved! Copy the link to share it. This browser can edit it later.' };
}
