import { useEffect, useState } from 'react';

// How much bigger the side bar and the CD tower are drawn on a big screen. They are made for a window about 1280 pixels
// wide; on a wider (or taller) window they would look small, so they grow with it, up to 1.7 times.
// The value is rounded to steps of 0.05 so that dragging the window edge does not redraw them all the time.
const BASE_W = 1280;
const BASE_H = 760;
const MAX = 1.7;

export function uiScaleFor(width, height) {
  const raw = Math.min(width / BASE_W, height / BASE_H);
  return Math.min(MAX, Math.max(1, Math.round(raw * 20) / 20));
}

export function useUiScale() {
  const read = () => uiScaleFor(window.innerWidth, window.innerHeight);
  const [scale, setScale] = useState(read);
  useEffect(() => {
    const onResize = () => setScale(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}
