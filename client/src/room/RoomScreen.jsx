// Part of: Room page: the main screen that holds all state and puts every piece together.
// Uses: CdRow.jsx, Controls.jsx, DecorateHud.jsx, DecorateOverlay.jsx, ExternalMusic.jsx, HoloPlayer.jsx, Hologram.jsx,
//   SaveBar.jsx, +18 more.
// Used by: App.jsx, RoomPage.jsx.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createRoom, getRoom, getScene, getScenes, getCd, updateRoom } from '../api.js';
import CdRow from '../music/CdRow.jsx';
import ExternalMusic, { EMPTY_ONLINE_PLAYER } from '../music/ExternalMusic.jsx';
import { DEFAULT_MUSIC_SOURCE } from '../music/discovery.js';
import {
  clearLastRoomCode,
  getMyRooms,
  saveMyRoom,
  setLastRoomCode,
  updateMyRoom,
} from '../myRooms.js';
import { MOVE_MIN_ZOOM } from './view.js';
import SceneStage from '../scene/SceneStage.jsx';
import { trackScene } from '../analytics.js';
import { itemsEqual } from '../scene/itemsEdit.js';
import { defaultSettings } from '../scene/sceneSettings.js';
import HoloPlayer from './HoloPlayer.jsx';
import Hologram, { HOLO_PLACES } from './Hologram.jsx';
import Controls from './Controls.jsx';
import DecorateHud from './DecorateHud.jsx';
import DecorateOverlay from './DecorateOverlay.jsx';
import SaveBar, { RoomNameField } from './SaveBar.jsx';
import './kit.css';
import './sidebarThemes.css'; // a different look for the side bar in each room (keyed by data-skin below)
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

// Milliseconds without movement before the buttons fade away.
const IDLE_MS = 4000;

// Placeholder scene while loading, so the hooks (which cannot be skipped) always get an object.
const NO_SCENE = { slug: '', layers: [], catalog: [], surfaces: [] };
const NO_CD = { title: 'No CD', tracks: [] };

// The scene list from the API holds only slug, name, description. The scene a room opens in is fetched whole (layers...)
// and put in the list. isWhole = has layers; wholeScene fetches if needed.
const isWhole = (scene) => Array.isArray(scene?.layers);
const wholeScene = async (scene) => (!scene || isWhole(scene) ? scene : { ...scene, ...(await getScene(scene.slug)) });
const withScene = (list, whole) => list.map((s) => (s.slug === whole.slug ? whole : s));

// The whole room page, and the "brain" that holds all state; the files it imports each draw one part.
//   code given  -> opens that saved room (/r/:code). No code -> a new, unsaved room (/new, optional ?scene=<slug> or ?cd=<code>).
//   Owner = this browser holds the room's edit key (myRooms.js). Anyone else can look, and "Save my own copy" makes a new room.
//   Music: exactly one of three sources plays: a CD of ours (cdCode + usePlayer), an online source (musicSource), or the
//   links of a CD (queue). `player` is whichever is active and has the same shape for the hologram.
//   Visitor-only preferences (player position, side bar, low power, zoom) live in localStorage, not in the saved room.
export default function RoomScreen({ code }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ===== 1. ROOM DATA: scenes, the saved room, name, settings, placed items. Save stores exactly this (API: routes/rooms.js, routes/scenes.js) =====
  const [scenes, setScenes] = useState(null); // null = still loading
  const [saved, setSaved] = useState(null); // the room as stored on the server, null for a new room
  const [loadError, setLoadError] = useState(null); // { message } or { notFound: true }
  const [attempt, setAttempt] = useState(0); // bump to try loading again

  const [slug, setSlug] = useState('');
  const [settings, setSettings] = useState({ effect: 'none', lightOn: true, curtainsClosed: false });
  const [name, setName] = useState('');
  const [items, setItems] = useState(null); // decorations the visitor placed; null = the scene's default arrangement ([] = none)
  const [decorating, setDecorating] = useState(false);
  // The hologram player toggles when the music object in the picture is clicked. Remembered in this browser.
  const [playerOpen, setPlayerOpen] = useState(readPlayerOpen);
  const togglePlayer = useCallback(() => setPlayerOpen((open) => !open), []);
  // ===== 2. MUSIC: a CD of ours (cdCode + usePlayer.js), an online source (musicSource, ExternalMusic.jsx) or a CD of links (queue).
  //   Picked in CdRow.jsx (tower); shown by HoloPlayer.jsx (hologram). `player` below is whichever one is active. =====
  const [cdCode, setCdCode] = useState(null);
  const [cd, setCd] = useState(NO_CD);
  const [musicSource, setMusicSource] = useState(() => code || new URLSearchParams(location.search).has('cd') ? null : DEFAULT_MUSIC_SOURCE);
  const [onlinePlayer, setOnlinePlayer] = useState(EMPTY_ONLINE_PLAYER);
  const [musicError, setMusicError] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicAttempt, setMusicAttempt] = useState(0);
  const cdPlayer = usePlayer(cd);
  // A CD of online links plays them in turn. linkIndex = the link now playing. queueRound changes on every step (it is part
  // of the player's key, so a one-link CD restarts). queueAutoplay = start the next link by itself.
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
  // Makes the online player look like one CD: next/prev move inside a playlist link, and jump to the next link at its edges.
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
  // Switching music always stops the other kind first. chooseSource(null) = eject.
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
  // ===== 3. VIEWER PREFERENCES (kept in this browser, NOT saved with the room): player position, low power, side bar open =====
  // Where the hologram floats: a viewer preference, kept in this browser.
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

  // Low power stops all picture animation (music keeps playing). Viewer preference, kept in this browser.
  const [lowPower, setLowPower] = useState(readLowPower);
  const toggleLowPower = () => {
    setLowPower(!lowPower);
    try {
      localStorage.setItem(LOW_POWER_KEY, lowPower ? '' : '1');
    } catch {
      // not remembered, that is fine
    }
  };

  // Side bar open/closed, remembered; first visit on a narrow screen (<700 px) starts closed.
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  // YouTube must stay visible while playing, so on a phone the open side bar (which covers it) pauses it.
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

  // ===== 4. DERIVED PIECES: current scene, Decorate editor (useItemsEditor.js), zoom (useRoomView.js), idle fade (useIdle.js) =====
  const scene = scenes?.find((s) => s.slug === slug) || scenes?.[0] || NO_SCENE;
  const editor = useItemsEditor(scene, items, setItems);
  const canDecorate = Boolean(scene.catalog?.length); // Decorate needs a catalog in the scene

  const ui = useUiScale();
  const idle = useIdle(IDLE_MS); // the buttons fade away when nobody is using the room
  const view = useRoomView({ panning: !decorating }); // zoom and pan of the picture (no panning while decorating: dragging moves items)
  const drawnZoom = useDrawnZoom(view.zoom, scene.slug);
  useEffect(() => {
    if (scene.slug) trackScene(scene.slug); // an anonymous count of which rooms are shown, see analytics.js
  }, [scene.slug]);

  const [myRooms, setMyRooms] = useState(getMyRooms);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => statusAfterSave(location.state));

  // Edit key of this room if this browser saved it (null for anyone else).
  const editKey = myRooms.find((r) => r.code === code)?.editKey ?? null;

  useEffect(() => {
    let cancelled = false;
    // ===== 5. LOADING (effect runs when the page opens): GET /api/scenes + GET /api/rooms/:code, then fills the state above =====
    setLoadError(null);
    // /new?scene=<slug> (from the intro page) starts a new room in that scene
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

  // ===== 6. SCREENS INSTEAD OF THE ROOM: room not found, error with Try again, loading, no scenes =====
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

  // ===== 7. SAVE / SHARE: buttons are in SaveBar.jsx (side bar footer). isOwner = this browser has the edit key =====
  // dirty = something differs from the saved room (the Save changes button lights up).
  // Owner = this browser holds the edit key, or the signed-in account owns the room (the API says so with `mine`).
  const isOwner = Boolean(saved && (editKey || saved.mine));
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

  // What is sent to the API on save.
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

  // Saves a new room (or a copy of someone else's), remembers its edit key in this browser and opens its page.
  // ----- POST /api/rooms (SaveBar: Save room / Save my own copy). The edit key is kept by myRooms.js -----
  const saveNew = () =>
    run(async () => {
      const { room, editKey: newKey } = await createRoom(payload());
      const remembered = saveMyRoom({ code: room.code, editKey: newKey, name: room.name, sceneSlug: room.sceneSlug });
      setLastRoomCode(room.code);
      navigate(`/r/${room.code}`, { replace: true, state: { justSaved: true, unsavedKey: remembered ? null : newKey } });
    });

  // Sends this room's changes to the API (the owner's edit key is the proof). Used by "Save changes" and by "Copy link".
  // ----- PUT /api/rooms/:code (SaveBar: Save changes, also used by Copy link) -----
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

  // ===== 8. WHAT IS DRAWN (JSX): picture -> side bar -> CD tower -> online player. =====
  const hologram = !decorating && (
    <Hologram scene={scene} items={items} open={playerOpen} place={playerPlace}>
      <HoloPlayer player={player} />
    </Hologram>
  );

  // The spinning disc on the music object uses the chosen CD's printed face.
  const discKey = musicSource ? musicSource.url : cdCode;
  const discFace = discKey ? cdLook(discKey, '', cdCode && !musicSource && cd.code === cdCode ? cd.look : null).face : null;

  const zoomButtons = <ZoomControls zoom={view.zoom} onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onFit={view.fit} />;

  // Layout: SceneStage (the picture) + Sidebar (every control) + CdRow (CD tower) + ExternalMusic (online player). CSS variables
  // --ui (UI scale), --zoom and --drawn-zoom are read by the stylesheets.
  return (
    <div ref={view.roomRef} data-skin={scene.slug} className={`room${idle ? ' idle' : ''}${decorating ? ' decorating' : ''}${sidebarOpen ? ' side-on' : ''}`} style={{ ...skinOf(scene.slug).vars, '--ui': ui, '--zoom': view.zoom, '--drawn-zoom': drawnZoom }} onWheel={view.onWheel}>
      {/* THE PICTURE (scene/SceneStage.jsx). Its children go inside the stage: the hologram (if placed on the object) and the Decorate drag boxes. */}
      <SceneStage scene={scene} settings={settings} onSettingsChange={setSettings} items={items} frozen={decorating} onNextTrack={togglePlayer} playing={player.playing} still={view.zoom < MOVE_MIN_ZOOM} calm={lowPower && !decorating} disc={discFace}>
        {playerPlace === 'object' && hologram /* above the music object: part of the picture, it zooms with it */}
        {decorating && (
          <DecorateOverlay scene={scene} items={editor.items} selectedId={editor.selectedId} onSelect={editor.select} onMove={editor.move} />
        )}
      </SceneStage>
      {playerPlace !== 'object' && hologram /* in the middle or at the top of the window */}
      {/* LEFT SIDE BAR (Sidebar.jsx = frame). settings = View settings note; footer = name + SaveBar (the Share part); children = Controls.jsx (mood, Decorate) or DecorateHud.jsx while decorating. */}
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
                onCopy={copyLink}
                onDismissStatus={() => setStatus(null)}
              />
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
              scene={scene}
              settings={settings}
              onSettingsChange={setSettings}
              onDecorate={canDecorate ? () => setDecorating(true) : undefined}
            />
          </>
        )}
      </Sidebar>
      {/* CD TOWER in the bottom-right corner (music/CdRow.jsx): picking a CD calls chooseCd / chooseSource above. */}
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
      {/* ONLINE PLAYER (music/ExternalMusic.jsx): only when an online source or a CD of links is playing; it reports its state back through onPlayer. */}
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

// localStorage keys of viewer preferences. Each read* function below returns a default if storage is blocked.
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

// Keyboard shortcuts: Space play/pause, Left/Right previous/next, Escape closes the hologram.
// Ignored while typing or when a button, link or select has focus (they use the same keys). Ctrl/Cmd/Alt combinations are left alone.
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

// Note shown after saving (passed through the router state). If storage was blocked, the edit key is shown ONCE so it is not lost.
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
