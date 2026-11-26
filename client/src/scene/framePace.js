// Part of: Room picture: runs animations at 30 fps to save the graphics card.
// Used by: SceneStage.jsx.
import { useEffect } from 'react';

// Animation rate of a scene. Every redraw makes the GPU re-stack ~100 layers; the movements are slow, so 30 fps looks the same at half the cost.
export const SCENE_FPS = 30;

// Paces every CSS animation inside the stage: sets playbackRate 0 and advances currentTime by hand `fps` times a second.
// CSS-paused animations stay paused and transitions (day/night fades) are untouched. enabled = false hands everything back.
// Does nothing in browsers without CSSAnimation.
export function useFramePace(stageRef, fps = SCENE_FPS, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
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
      if (passed < step - 2) return; // not time for a step yet
      last = now;
      // The animation list changes rarely, so refresh it only twice a second.
      if (now - listed > 500) {
        listed = now;
        animations = stage.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation);
      }
      const forward = Math.min(passed, 250); // capped, so returning from another tab does not jump the scene ahead
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
  }, [stageRef, fps, enabled]);
}
