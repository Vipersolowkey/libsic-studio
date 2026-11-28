// Part of: Room page: fades the buttons when nothing moves.
// Used by: RoomScreen.jsx.
import { useEffect, useState } from 'react';

// True after `ms` milliseconds with no mouse, touch or key. The room fades its buttons out then (for a clean second screen).
export function useIdle(ms) {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, wake, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, wake));
    };
  }, [ms]);

  return idle;
}
