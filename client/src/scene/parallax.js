// Part of: Room picture: layers moving with the mouse.
// Used by: SceneStage.jsx.
import { useCallback, useEffect, useRef } from 'react';

// How far the nearest layer may move, as a share of the scene width.
export const MAX_SHIFT = 0.025;

// Pixels to shift one layer. pointer = mouse position 0-1 in the scene. Far layers (depth ~0) barely move, near ones (1) move
// most, opposite to the mouse: that is what makes the depth.
export function layerOffset(pointer, depth, width) {
  const max = width * MAX_SHIFT;
  return {
    x: -(pointer.x - 0.5) * 2 * max * depth,
    y: -(pointer.y - 0.5) * 2 * max * depth,
  };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Mouse parallax:  const { stageRef, layerRef, handlers } = useParallax(depths, enabled);
//   <div ref={stageRef} {...handlers}> <div ref={layerRef(0)} /> ...
// Layers are moved by writing style.transform directly (no React state) to stay smooth, batched to one move per frame.
// scale(1.06) hides the edges when layers shift. enabled = false (or reduced motion): layers stay centred.
export function useParallax(depths, enabled = true) {
  const stageRef = useRef(null);
  const layerEls = useRef([]);
  const frameRef = useRef(0);
  const pendingRef = useRef(null);

  const moveTo = useCallback(
    (pointer) => {
      const stage = stageRef.current;
      if (!stage) return;
      const width = stage.clientWidth;
      layerEls.current.forEach((el, i) => {
        if (!el) return;
        const { x, y } = layerOffset(pointer, depths[i] ?? 0, width);
        el.style.transform = `translate(${x}px, ${y}px) scale(1.06)`;
      });
    },
    [depths]
  );

  const moveAt = useCallback(
    (clientX, clientY) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      moveTo({ x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height });
    },
    [moveTo]
  );

  const moveAtRef = useRef(moveAt);
  moveAtRef.current = moveAt;

  const cancelPending = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    pendingRef.current = null;
  }, []);

  const layerRef = useCallback(
    (i) => (el) => {
      layerEls.current[i] = el;
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      cancelPending();
      moveTo({ x: 0.5, y: 0.5 });
    }
  }, [enabled, cancelPending, moveTo]);

  useEffect(() => cancelPending, [cancelPending]);

  // Move right away on the first event of a frame, then batch any further events until the animation frame.
  const onPointerMove = useCallback(
    (e) => {
      if (!enabled || prefersReducedMotion()) return;
      if (frameRef.current) {
        pendingRef.current = { clientX: e.clientX, clientY: e.clientY };
        return;
      }
      moveAt(e.clientX, e.clientY);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        const pending = pendingRef.current;
        if (pending) {
          pendingRef.current = null;
          moveAtRef.current(pending.clientX, pending.clientY);
        }
      });
    },
    [enabled, moveAt]
  );

  const onPointerLeave = useCallback(() => {
    cancelPending();
    moveTo({ x: 0.5, y: 0.5 });
  }, [cancelPending, moveTo]);

  return { stageRef, layerRef, handlers: { onPointerMove, onPointerLeave } };
}
