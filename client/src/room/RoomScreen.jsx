import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createRoom, deleteRoom, getRoom, getScene, getScenes, updateRoom } from '../api.js';
import {
  clearLastRoomCode,
  getMyRooms,
  removeMyRoom,
  saveMyRoom,
  setLastRoomCode,
  updateMyRoom,
} from '../myRooms.js';
import { MOVE_MIN_ZOOM } from './view.js';
import SceneStage from '../scene/SceneStage.jsx';
import { itemsEqual } from '../scene/itemsEdit.js';
import { defaultSettings } from '../scene/sceneSettings.js';
import HoloPlayer from './HoloPlayer.jsx';
import Hologram, { HOLO_PLACES } from './Hologram.jsx';
import Controls from './Controls.jsx';
import DecorateHud from './DecorateHud.jsx';
import DecorateOverlay from './DecorateOverlay.jsx';
import MyRooms from './MyRooms.jsx';
import SaveBar, { RoomNameField } from './SaveBar.jsx';
import Sidebar, { More, Section } from './Sidebar.jsx';
import { useIdle } from './useIdle.js';
import { useItemsEditor } from './useItemsEditor.js';
import { TEST_CD } from './testCd.js';
import { usePlayer } from './usePlayer.js';
import { useRainSound } from './useRainSound.js';
import { useDrawnZoom, useRoomView } from './useRoomView.js';
import ZoomControls from './ZoomControls.jsx';

// How long the room waits without any movement before its buttons fade away.
const IDLE_MS = 4000;

// Stands in for the scene while the scenes are still loading, so the hooks below always have one.
const NO_SCENE = { slug: '', layers: [], catalog: [], surfaces: [] };

// The API's list of scenes is only a menu (slug, name, description). The layers of a scene are fetched when that
// scene is opened, and then kept in the list, so going back to a room that was already shown asks nothing.
const isWhole = (scene) => Array.isArray(scene?.layers);
const wholeScene = async (scene) => (!scene || isWhole(scene) ? scene : { ...scene, ...(await getScene(scene.slug)) });
const withScene = (list, whole) => list.map((s) => (s.slug === whole.slug ? whole : s));

// One room on screen. With a `code` it opens that saved room, without one it is a new, unsaved room.
export default function RoomScreen({ code }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [scenes, setScenes] = useState(null); // null = still loading
  const [saved, setSaved] = useState(null); // the room as stored on the server, null for a new room
  const [loadError, setLoadError] = useState(null); // { message } or { notFound: true }
  const [attempt, setAttempt] = useState(0); // bump to try loading again

  const [slug, setSlug] = useState('');
  const [settings, setSettings] = useState({ effect: 'none', lightOn: true, curtainsClosed: false });
  const [name, setName] = useState('');
  const [items, setItems] = useState(null); // the objects the visitor placed; null = the scene's default arrangement
  const [decorating, setDecorating] = useState(false);
  // The hologram player is hidden at first. Clicking the music object in the room shows it, and clicking again hides it.
  // The browser remembers whether it was left open.
  const [playerOpen, setPlayerOpen] = useState(readPlayerOpen);
  const togglePlayer = useCallback(() => setPlayerOpen((open) => !open), []);
  const player = usePlayer(TEST_CD); // the real CDs will come from the API (the music side); until then a small test CD
  useEffect(() => {
    try {
      localStorage.setItem(PLAYER_OPEN_KEY, playerOpen ? '1' : '');
    } catch {
      // not remembered, that is fine
    }
  }, [playerOpen]);
  usePlayerShortcuts(player, playerOpen, setPlayerOpen);
  useRainSound(settings.effect === 'rain', player.volume, player.playing); // the rain also sounds, softly, under the music
  // Where the hologram floats is a preference of the person looking, like the zoom: it stays in their browser.
  const [playerPlace, setPlayerPlace] = useState(readPlayerPlace);
  const choosePlayerPlace = (place) => {
    setPlayerPlace(place);
    setPlayerOpen(true); // show it, so the change can be seen
    try {
      localStorage.setItem(PLAYER_PLACE_KEY, place);
    } catch {
      // not remembered, that is fine
    }
  };

  // Low power mode stops every movement of the picture (the music keeps playing). It is a preference of the person
  // looking, for a weak laptop or a long session on battery, so it stays in their browser.
  const [lowPower, setLowPower] = useState(readLowPower);
  const toggleLowPower = () => {
    setLowPower(!lowPower);
    try {
      localStorage.setItem(LOW_POWER_KEY, lowPower ? '' : '1');
    } catch {
      // not remembered, that is fine
    }
  };

  // The side bar can be tucked away to see the whole picture. The browser remembers it; a phone starts with it closed.
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? 'closed' : 'open');
    } catch {
      // not remembered, that is fine
    }
  };

  const scene = scenes?.find((s) => s.slug === slug) || scenes?.[0] || NO_SCENE;
  const editor = useItemsEditor(scene, items, setItems);
  const canDecorate = Boolean(scene.catalog?.length); // older scenes have no catalog

  const idle = useIdle(IDLE_MS); // the buttons fade away when nobody is using the room
  const view = useRoomView({ panning: !decorating }); // zoom level and panning of the picture
  const drawnZoom = useDrawnZoom(view.zoom, scene.slug);

  const [myRooms, setMyRooms] = useState(getMyRooms);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => statusAfterSave(location.state));

  const editKey = myRooms.find((r) => r.code === code)?.editKey ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    // /new?scene=<slug> (a card on the landing page) starts a new room in that scene
    const wanted = code ? null : new URLSearchParams(location.search).get('scene');
    Promise.all([getScenes(), code ? getRoom(code) : Promise.resolve(null)])
      .then(async ([menu, room]) => {
        // the one scene that is shown first is fetched whole; the others stay menu lines until they are picked
        const first = await wholeScene((room && menu.find((s) => s.slug === room.sceneSlug)) || menu.find((s) => s.slug === wanted) || menu[0]);
        return [first ? withScene(menu, first) : menu, room];
      })
      .then(([list, room]) => {
        if (cancelled) return;
        setScenes(list);
        setDecorating(false);
        if (room) {
          const scene = list.find((s) => s.slug === room.sceneSlug) || list[0];
          setSaved(room);
          setSlug(scene?.slug ?? '');
          setSettings({ effect: room.settings.effect, lightOn: room.settings.lightOn, curtainsClosed: Boolean(room.settings.curtainsClosed) });
          setName(room.name);
          setItems(room.items ?? null);
          setLastRoomCode(room.code);
        } else if (list.length > 0) {
          const start = list.find((s) => s.slug === wanted) || list[0];
          setSlug(start.slug);
          setSettings(defaultSettings(start));
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

  const isOwner = Boolean(saved && editKey);
  const dirty =
    saved !== null &&
    (name !== saved.name ||
      slug !== saved.sceneSlug ||
      settings.effect !== saved.settings.effect ||
      settings.lightOn !== saved.settings.lightOn ||
      settings.curtainsClosed !== Boolean(saved.settings.curtainsClosed) ||
      !itemsEqual(items, saved.items));
  const link = saved ? `${window.location.origin}/r/${saved.code}` : '';

  const payload = () => ({ name: name.trim() || 'Untitled room', sceneSlug: scene.slug, settings, items });

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

  const showScene = (next) => {
    setSlug(next.slug);
    setSettings(defaultSettings(next));
    setItems(null); // the old objects belong to the old scene
  };
  // A scene picked for the first time is fetched whole before it is shown; the room on screen stays until then.
  const chooseScene = (next) => {
    if (isWhole(next)) return showScene(next);
    return run(async () => {
      const whole = await wholeScene(next);
      setScenes((list) => withScene(list, whole));
      showScene(whole);
    });
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

  const hologram = !decorating && (
    <Hologram scene={scene} items={items} open={playerOpen} place={playerPlace}>
      <HoloPlayer player={player} />
    </Hologram>
  );

  const zoomButtons = <ZoomControls zoom={view.zoom} onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onFit={view.fit} />;

  // The room fills the whole window. Every control is in the side bar at the left.
  return (
    <div ref={view.roomRef} className={`room${idle ? ' idle' : ''}${decorating ? ' decorating' : ''}${sidebarOpen ? ' side-on' : ''}`} style={{ '--zoom': view.zoom, '--drawn-zoom': drawnZoom }} onWheel={view.onWheel}>
      <SceneStage scene={scene} settings={settings} onSettingsChange={setSettings} items={items} frozen={decorating} onNextTrack={togglePlayer} playing={player.playing} still={view.zoom < MOVE_MIN_ZOOM} calm={lowPower && !decorating}>
        {playerPlace === 'object' && hologram /* above the music object: part of the picture, it zooms with it */}
        {decorating && (
          <DecorateOverlay scene={scene} items={editor.items} selectedId={editor.selectedId} onSelect={editor.select} onMove={editor.move} />
        )}
      </SceneStage>
      {playerPlace !== 'object' && hologram /* in the middle or at the top of the window */}
      <Sidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        footer={
          !decorating && (
            <>
              <RoomNameField name={name} onNameChange={setName} />
              <SaveBar
                saved={saved}
                isOwner={isOwner}
                dirty={dirty}
                busy={busy}
                status={status}
                link={link}
                onSaveNew={saveNew}
                onSaveChanges={saveChanges}
                onDelete={removeRoom}
                onCopy={copyLink}
                onDismissStatus={() => setStatus(null)}
              />
              <MyRooms rooms={myRooms} scenes={scenes} currentCode={code} onForget={forget} />
            </>
          )
        }
      >
        {decorating ? (
          <>
            <DecorateHud scene={scene} editor={editor} onDone={() => setDecorating(false)} />
            <Section title="Zoom">{zoomButtons}</Section>
          </>
        ) : (
          <>
            <Controls
              scenes={scenes}
              scene={scene}
              settings={settings}
              onChooseScene={chooseScene}
              onSettingsChange={setSettings}
              onDecorate={canDecorate ? () => setDecorating(true) : undefined}
            />
            <More label="More settings">
              <h2 className="side-title">Music player position</h2>
              <div className="chip-row" role="group" aria-label="Player place">
                {HOLO_PLACES.map((place) => (
                  <button key={place.key} type="button" className="chip" title={place.label} aria-label={place.label} aria-pressed={place.key === playerPlace} onClick={() => choosePlayerPlace(place.key)}>
                    {place.short}
                  </button>
                ))}
              </div>
              <h2 className="side-title">Zoom</h2>
              {zoomButtons}
              <h2 className="side-title">Power</h2>
              <div className="chip-row">
                <button type="button" className="chip" aria-pressed={lowPower} title="Stops every movement of the picture, so a weak laptop stays cool. The music keeps playing." onClick={toggleLowPower}>
                  Low power {lowPower ? 'on' : 'off'}
                </button>
              </div>
            </More>
          </>
        )}
      </Sidebar>
    </div>
  );
}

const PLAYER_OPEN_KEY = 'libsic.playerOpen';
const PLAYER_PLACE_KEY = 'libsic.playerPlace';
const SIDEBAR_KEY = 'libsic.sidebar';
const LOW_POWER_KEY = 'libsic.lowPower';

function readLowPower() {
  try {
    return localStorage.getItem(LOW_POWER_KEY) === '1';
  } catch {
    return false;
  }
}

function readSidebarOpen() {
  try {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved) return saved === 'open';
  } catch {
    // fall through to the default
  }
  return window.innerWidth >= 700;
}

function readPlayerPlace() {
  try {
    const saved = localStorage.getItem(PLAYER_PLACE_KEY);
    return HOLO_PLACES.some((p) => p.key === saved) ? saved : 'center';
  } catch {
    return 'center';
  }
}

function readPlayerOpen() {
  try {
    return localStorage.getItem(PLAYER_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

// Keyboard and mouse shortcuts of the player:
//   Space          play or pause
//   Left, Right    previous or next track
//   Escape, or a click on an empty part of the picture   closes the hologram
// Keys are left alone while the visitor types in a field or has a button or slider selected, because those use the same keys.
function usePlayerShortcuts(player, open, setOpen) {
  const { toggle, next, prev } = player;
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') return setOpen(false);
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(e.target?.tagName)) return;
      if (e.key === ' ') {
        e.preventDefault(); // the page must not scroll
        toggle();
      } else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, next, prev, setOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      // the hologram itself, the clickable objects and the side bar do not close it
      if (e.target.closest?.('.holo, .hotspot, .sidebar, .side-open')) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, setOpen]);
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
