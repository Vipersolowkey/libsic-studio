import { useEffect } from 'react';

// How many times per second the movements of a scene are redrawn. A screen normally redraws 60 times (or more)
// per second, and for every redraw the graphics card has to stack all the layers of the picture again. The movements
// in a room are slow (leaves, light, drifting fish), so half as many redraws look the same and cost half the work.
export const SCENE_FPS = 30;

// Sets the pace of every CSS animation inside the stage.
// Normally the browser moves each animation forward by itself on every redraw of the screen. Here the animations are
// held still (speed 0) and moved forward by hand, SCENE_FPS times per second. Between two steps nothing changes on
// screen, so the browser has nothing to redraw. Animations that CSS has paused (the record when the music stops)
// stay paused, and fades between day and night (transitions) are not touched: they stay perfectly smooth.
export function useFramePace(stageRef, fps = SCENE_FPS) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.getAnimations || typeof CSSAnimation === 'undefined') return undefined; // an old browser: leave everything as it is
    const step = 1000 / fps;
    let frame = 0;
    let last = performance.now();
    let listed = 0;
    let animations = [];

    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      const passed = now - last;
      if (passed < step - 2) return; // not time yet: skip this redraw
      last = now;
      // the list of animations changes rarely (another room, another effect), so it is looked up twice a second
      if (now - listed > 500) {
        listed = now;
        animations = stage.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation);
      }
      const forward = Math.min(passed, 250); // after a pause (another tab was open) the scene does not jump ahead
      for (const animation of animations) {
        if (animation.playState !== 'running') continue;
        if (animation.playbackRate !== 0) animation.playbackRate = 0;
        animation.currentTime += forward;
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      // hand the animations back to the browser at normal speed
      for (const animation of stage.getAnimations({ subtree: true })) {
        if (animation instanceof CSSAnimation && animation.playbackRate === 0) animation.playbackRate = 1;
      }
    };
  }, [stageRef, fps]);
}
