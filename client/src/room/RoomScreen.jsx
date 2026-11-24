import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createRoom, deleteRoom, getRoom, getScene, getScenes, getCd, updateRoom } from '../api.js';
import CdRow from '../music/CdRow.jsx';
import ExternalMusic, { EMPTY_ONLINE_PLAYER } from '../music/ExternalMusic.jsx';
import { DEFAULT_MUSIC_SOURCE } from '../music/discovery.js';
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
import './kit.css';
import Sidebar, { Section } from './Sidebar.jsx';
import { skinOf } from './skins.js';
import { cdLook } from '../music/cdLook.js';
import { useIdle } from './useIdle.js';
import { useUiScale } from './useUiScale.js';
import { useItemsEditor } from './useItemsEditor.js';
import { usePlayer } from './usePlayer.js';
import { useRainSound } from './useRainSound.js';
import { useDrawnZoom, useRoomView } from './useRoomView.js';
import ZoomControls from './ZoomControls.jsx';

// How long the room waits without any movement before its buttons fade away.
const IDLE_MS = 4000;

// Stands in for the scene while the scenes are still loading, so the hooks below always have one.
const NO_SCENE = { slug: '', layers: [], catalog: [], surfaces: [] };
const NO_CD = { title: 'No CD', tracks: [] };

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
  const [cdCode, setCdCode] = useState(null);
  const [cd, setCd] = useState(NO_CD);
  const [musicSource, setMusicSource] = useState(() => code || new URLSearchParams(location.search).has('cd') ? null : DEFAULT_MUSIC_SOURCE);
  const [onlinePlayer, setOnlinePlayer] = useState(EMPTY_ONLINE_PLAYER);
  const [musicError, setMusicError] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicAttempt, setMusicAttempt] = useState(0);
  const cdPlayer = usePlayer(cd);
  // A CD made of online links plays them one after the other: `linkIndex` is the link now in the player. `queueRound` counts
  // the steps, so a one-link CD starts again when it ends. `queueAutoplay` is true when the next link should start by itself.
  const [linkIndex, setLinkIndex] = useState(0);
  const [queueRound, setQueueRound] = useState(0);
  const [queueAutoplay, setQueueAutoplay] = useState(false);
  const linkCd = cdCode && cd.code === cdCode && cd.links?.length ? cd : null;
  const linkCount = linkCd?.links.length ?? 0;
  const queueSource = linkCd ? linkCd.links[linkIndex % linkCount] : null;
  const activeSource = musicSource ?? queueSource;
  const stepLink = useCallback((step, play) => {
    setLinkIndex((i) => (i + step + linkCount) % linkCount);
    setQueueRound((n) => n + 1);
    setQueueAutoplay(Boolean(play));
    setOnlinePlayer(EMPTY_ONLINE_PLAYER);
  }, [linkCount]);
  const queuePlayer = useMemo(() => {
    if (!linkCd) return null;
    const inside = onlinePlayer.canNavigate !== false && onlinePlayer.count > 1;
    return {
      ...onlinePlayer,
      cd: { ...onlinePlayer.cd, title: linkCd.title },
      index: linkIndex % linkCount,
      count: linkCount,
      canNavigate: linkCount > 1 || inside,
      // inside a playlist link the buttons move between its tracks; at its edges they move to the next link
      next: () => (inside && onlinePlayer.index < onlinePlayer.count - 1 ? onlinePlayer.next() : stepLink(1, onlinePlayer.playing)),
      prev: () => {
        if (onlinePlayer.time > 3) onlinePlayer.seek?.(0);
        else if (inside && onlinePlayer.index > 0) onlinePlayer.prev();
        else stepLink(-1, onlinePlayer.playing);
      },
    };
  }, [linkCd, linkIndex, linkCount, onlinePlayer, stepLink]);
  const player = activeSource ? queuePlayer ?? onlinePlayer : cdPlayer;
  const chooseSource = (source) => {
    if (source && musicSource?.url === source.url) { setPlayerOpen(true); return; }
    cdPlayer.pause();
    setCdCode(null);
    setOnlinePlayer(EMPTY_ONLINE_PLAYER);
    setMusicSource(source);
    if (source) setPlayerOpen(true);
  };
  const chooseCd = (nextCode) => {
    setMusicSource(null);
    setLinkIndex(0);
    setQueueAutoplay(false);
    setOnlinePlayer(EMPTY_ONLINE_PLAYER);
    setCdCode(nextCode);
    setMusicAttempt((n) => n + 1);
    if (nextCode) setPlayerOpen(true);
  };
  useEffect(() => {
    let cancelled = false;
    setCd(NO_CD);
    setMusicError('');
    setMusicLoading(Boolean(cdCode));
    if (cdCode) getCd(cdCode).then((value) => {
      if (!cancelled) { setCd(value); setMusicLoading(false); }
    }).catch((err) => {
      if (!cancelled) { setMusicLoading(false); setMusicError(err.status === 404 ? 'This CD was deleted or its code is wrong. Choose another CD.' : err.message); }
    });
    return () => { cancelled = true; };
  }, [cdCode, musicAttempt]);
  useEffect(() => {
    try {
      localStorage.setItem(PLAYER_OPEN_KEY, playerOpen ? '1' : '');
    } catch {
      // not remembered, that is fine
    }
  }, [playerOpen]);
  usePlayerShortcuts(player, setPlayerOpen);
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
  // Keep YouTube video visible whenever it is playing. The phone's open menu covers the player.
  useEffect(() => {
    const pauseCoveredVideo = () => {
      if (activeSource?.provider === 'youtube' && sidebarOpen && window.innerWidth < 700 && player.playing) player.pause();
    };
    pauseCoveredVideo();
    window.addEventListener('resize', pauseCoveredVideo);
    return () => window.removeEventListener('resize', pauseCoveredVideo);
  }, [activeSource, sidebarOpen, player.playing, player.pause]);
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

  const ui = useUiScale();
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
          setCdCode(room.cdCode ?? null);
          setOnlinePlayer(EMPTY_ONLINE_PLAYER);
          setMusicSource(room.musicSource ?? null);
          setItems(room.items ?? null);
          setLastRoomCode(room.code);
        } else if (list.length > 0) {
          const start = list.find((s) => s.slug === wanted) || list[0];
          setSlug(start.slug);
          setSettings(defaultSettings(start));
          setCdCode(new URLSearchParams(location.search).get('cd'));
          setMusicSource(new URLSearchParams(location.search).has('cd') ? null : DEFAULT_MUSIC_SOURCE);
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
      cdCode !== (saved.cdCode ?? null) ||
      JSON.stringify(musicSource) !== JSON.stringify(saved.musicSource ?? null) ||
      settings.effect !== saved.settings.effect ||
      settings.lightOn !== saved.settings.lightOn ||
      settings.curtainsClosed !== Boolean(saved.settings.curtainsClosed) ||
      !itemsEqual(items, saved.items));
  const link = saved ? `${window.location.origin}/r/${saved.code}` : '';

  const payload = () => ({ name: name.trim() || 'Untitled room', sceneSlug: scene.slug, cdCode, musicSource, settings, items });

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

  // Sends this room's changes to the API (the owner's edit key is the proof). Used by "Save changes" and by "Copy link".
  async function persistChanges() {
    const room = await updateRoom(saved.code, editKey, payload());
    setSaved(room);
    updateMyRoom(room.code, { name: room.name, sceneSlug: room.sceneSlug });
    setMyRooms(getMyRooms());
  }
  const saveChanges = () =>
    run(async () => {
      await persistChanges();
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

  // The link opens the SAVED room, so an owner's unsaved changes (a new CD, another scene...) are saved first. Otherwise
  // the person who opens the link would see the old room, for example without the CD.
  async function copyLink() {
    let saving = false;
    if (isOwner && dirty) {
      setBusy(true);
      try {
        await persistChanges();
        saving = true;
      } catch (err) {
        setStatus({ kind: 'error', text: `Your changes are not saved yet, so the link would show the old room. ${err.message}` });
        return;
      } finally {
        setBusy(false);
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus({ kind: 'ok', text: saving ? 'Changes saved. Link copied.' : 'Link copied.' });
    } catch {
      setStatus({ kind: 'error', text: 'Could not copy automatically. Select the link and copy it by hand.' });
    }
  }

  const hologram = !decorating && (
    <Hologram scene={scene} items={items} open={playerOpen} place={playerPlace}>
      <HoloPlayer player={player} />
    </Hologram>
  );

  // The disc that turns on the player is the printed face of the chosen CD (the same paint as its case on the shelf).
  const discKey = musicSource ? musicSource.url : cdCode;
  const discFace = discKey ? cdLook(discKey, '', cdCode && !musicSource && cd.code === cdCode ? cd.look : null).face : null;

  const zoomButtons = <ZoomControls zoom={view.zoom} onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onFit={view.fit} />;

  // The room fills the whole window. Every control is in the side bar at the left.
  return (
    <div ref={view.roomRef} className={`room${idle ? ' idle' : ''}${decorating ? ' decorating' : ''}${sidebarOpen ? ' side-on' : ''}`} style={{ ...skinOf(scene.slug).vars, '--ui': ui, '--zoom': view.zoom, '--drawn-zoom': drawnZoom }} onWheel={view.onWheel}>
      <SceneStage scene={scene} settings={settings} onSettingsChange={setSettings} items={items} frozen={decorating} onNextTrack={togglePlayer} playing={player.playing} still={view.zoom < MOVE_MIN_ZOOM} calm={lowPower && !decorating} disc={discFace}>
        {playerPlace === 'object' && hologram /* above the music object: part of the picture, it zooms with it */}
        {decorating && (
          <DecorateOverlay scene={scene} items={editor.items} selectedId={editor.selectedId} onSelect={editor.select} onMove={editor.move} />
        )}
      </SceneStage>
      {playerPlace !== 'object' && hologram /* in the middle or at the top of the window */}
      <Sidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        settings={
          !decorating && (
            <>
              <h2 className="side-title">Player position</h2>
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
            </>
          )
        }
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
          </>
        )}
      </Sidebar>
      {!decorating && (
        <CdRow
          source={musicSource}
          cdCode={cdCode}
          loadedCd={cd}
          player={player}
          loading={musicLoading}
          error={musicError}
          onChooseSource={chooseSource}
          onChooseCd={chooseCd}
          onEject={() => chooseSource(null)}
          onRetry={() => chooseCd(cdCode)}
        />
      )}
      {activeSource && (
        <ExternalMusic
          key={`${activeSource.provider}:${activeSource.url}:${musicSource ? 0 : queueRound}`}
          source={activeSource}
          onPlayer={setOnlinePlayer}
          onClose={() => chooseSource(null)}
          onEnded={linkCd && !musicSource ? () => stepLink(1, true) : undefined}
          autoplay={Boolean(linkCd && !musicSource && queueAutoplay)}
        />
      )}
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
//   Escape         closes the hologram (clicking the music object again does too; nothing else does)
// Keys are left alone while the visitor types in a field or has a button or slider selected, because those use the same keys.
function usePlayerShortcuts(player, setOpen) {
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
