import { useEffect, useState } from 'react';

// True once the visitor has not moved the mouse, touched the screen or pressed a key for `ms` milliseconds.
// The room uses it to fade the buttons away, so it can run on a second screen without clutter.
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
