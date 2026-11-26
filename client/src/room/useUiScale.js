// Part of: Room page: scales the side bar and CD tower on big screens.
// Used by: CdRow.jsx, RoomScreen.jsx.
import { useEffect, useState } from 'react';

// Scale of the side bar and CD tower (sent as the CSS variable --ui). Designed for a 1280 x 760 window; bigger windows
// scale them up to 1.7x. Rounded to steps of 0.05 so resizing does not redraw constantly.
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
