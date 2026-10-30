import { useCallback, useEffect, useRef, useState } from 'react';
import { clampZoom, MIN_ZOOM, panOffset, startZoom, ZOOM_STEP } from './view.js';

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

// How close the room is shown, and where the picture sits. This is a preference of the person looking, so it
// stays in their browser and is not saved with the room.
//   zoomIn, zoomOut, fit   change the zoom (the mouse wheel and the + and - keys do the same)
//   roomRef                put it on the element that holds the room: it receives --zoom and the pan shift
// With { panning: false } the picture stays in the middle instead of following the mouse (while decorating).
export function useRoomView({ panning = true } = {}) {
  const roomRef = useRef(null);
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
    shift({ x: 0.5, y: 0.5 });
    if (!panning) return undefined;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => shift({ x: e.clientX / size.width, y: e.clientY / size.height }));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, [zoom, size, panning]);

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
