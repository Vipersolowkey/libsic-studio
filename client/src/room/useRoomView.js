// Part of: Room page: zoom and mouse panning of the picture.
// Uses: view.js.
// Used by: RoomScreen.jsx.
import { useCallback, useEffect, useRef, useState } from 'react';
import { clampZoom, MIN_ZOOM, MOVE_MIN_ZOOM, panOffset, startZoom, ZOOM_STEP } from './view.js';

const STORAGE_KEY = 'libsic.zoom';

const windowSize = () => ({ width: window.innerWidth, height: window.innerHeight });

function readSavedZoom() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return value > 0 ? clampZoom(value) : null;
  } catch {
    return null; // storage can be blocked, then the room simply starts at the normal zoom
  }
}

function saveZoom(zoom) {
  try {
    localStorage.setItem(STORAGE_KEY, String(zoom));
  } catch {
    // not remembered, that is fine
  }
}

// Zoom and pan of the picture. A viewer preference: saved in localStorage ("libsic.zoom"), not with the room.
// Returns { roomRef, zoom, zoomIn, zoomOut, fit, onWheel }. Put roomRef on the room element: it gets --pan-x / --pan-y
// (the picture follows the mouse, only when zoom >= MOVE_MIN_ZOOM). { panning: false } keeps it centred (used while decorating).
export function useRoomView({ panning = true } = {}) {
  // ===== STATE: window size, the zoom the visitor chose (or the start zoom for this window) =====
  const roomRef = useRef(null);
  const lastPointer = useRef({ x: 0.5, y: 0.5 }); // where the mouse was last, from 0 to 1 across the window
  const [size, setSize] = useState(windowSize);
  const [chosen, setChosen] = useState(readSavedZoom); // null until the visitor picks a zoom
  const zoom = chosen ?? startZoom(size.width, size.height);

  const setZoom = useCallback((next) => {
    const value = clampZoom(next);
    setChosen(value);
    saveZoom(value);
  }, []);

  const zoomIn = () => setZoom(zoom * ZOOM_STEP);
  const zoomOut = () => setZoom(zoom / ZOOM_STEP);
  const fit = () => setZoom(MIN_ZOOM);

  useEffect(() => {
    const onResize = () => setSize(windowSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ===== MOUSE PANNING: sets --pan-x / --pan-y on the room element; styles.css .room uses them to shift the picture =====
  // The mouse looks around the picture when it is bigger than the window.
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return undefined;
    let frame = 0;
    const shift = (pointer) => {
      const { x, y } = panOffset(pointer, zoom, size.width, size.height);
      room.style.setProperty('--pan-x', `${x}px`);
      room.style.setProperty('--pan-y', `${y}px`);
    };
    const follows = panning && zoom >= MOVE_MIN_ZOOM;
    // Keep the pan where the mouse is looking after a zoom step (centring first made the picture shake).
    shift(follows ? lastPointer.current : { x: 0.5, y: 0.5 });
    // Track the mouse at every zoom, even before panning starts, so the first panning step does not use a stale position and jump.
    // Moves over the side bar, CD tower or hologram are ignored (the mouse is using those, not looking around).
    const onMove = (e) => {
      if (e.pointerType === 'touch' || e.target?.closest?.('.sidebar, .side-note, .cdc, .holo')) return;
      lastPointer.current = { x: e.clientX / size.width, y: e.clientY / size.height };
      if (!follows) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => shift(lastPointer.current));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, [zoom, size, panning]);

  // ===== KEYS (+ - 0) and WHEEL: the same as ZoomControls.jsx buttons =====
  // Plus and minus keys, unless the visitor is typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '+' || e.key === '=') setZoom(zoom * ZOOM_STEP);
      else if (e.key === '-' || e.key === '_') setZoom(zoom / ZOOM_STEP);
      else if (e.key === '0') setZoom(MIN_ZOOM);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, setZoom]);

  const onWheel = (e) => setZoom(e.deltaY < 0 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP);

  return { roomRef, zoom, zoomIn, zoomOut, fit, onWheel };
}

// GPU-memory workaround: a newly opened room is drawn at zoom 1 for two frames, then at the chosen zoom. The GPU keeps each
// layer's texture at the size it was first drawn, so starting big would use too much graphics memory (layers then turn black).
// key = the scene slug; a new key restarts the two-frame wait.
export function useDrawnZoom(zoom, key) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    if (typeof requestAnimationFrame !== 'function') return undefined;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [key]);
  return ready ? zoom : 1;
}
