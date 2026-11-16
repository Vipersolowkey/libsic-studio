import { useCallback, useEffect, useRef } from 'react';

// How far the nearest layer may move, as a share of the scene width.
export const MAX_SHIFT = 0.025;

// How far to move one layer, in pixels. `pointer` is the mouse position inside the scene
// from 0 to 1 (0.5 = the middle). Far layers (depth near 0) hardly move, near layers (depth 1)
// move the most, and they move opposite to the mouse, which is what creates the feeling of depth.
export function layerOffset(pointer, depth, width) {
  const max = width * MAX_SHIFT;
  return {
    x: -(pointer.x - 0.5) * 2 * max * depth,
    y: -(pointer.y - 0.5) * 2 * max * depth,
  };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Gives a scene its mouse parallax. Use it like this:
//   const { stageRef, layerRef, handlers } = useParallax(depths, enabled);
//   <div ref={stageRef} {...handlers}> <div ref={layerRef(0)} /> ... </div>
// The layers are moved directly (not through React state), so moving the mouse stays smooth.
// While `enabled` is false the layers stay in the middle and ignore the mouse.
export function useParallax(depths, enabled = true) {
  const stageRef = useRef(null);
  const layerEls = useRef([]);

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

  const layerRef = useCallback(
    (i) => (el) => {
      layerEls.current[i] = el;
    },
    []
  );

  useEffect(() => {
    if (!enabled) moveTo({ x: 0.5, y: 0.5 });
  }, [enabled, moveTo]);

  const onPointerMove = useCallback(
    (e) => {
      if (!enabled || prefersReducedMotion()) return;
      const rect = stageRef.current.getBoundingClientRect();
      moveTo({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    },
    [enabled, moveTo]
  );

  const onPointerLeave = useCallback(() => moveTo({ x: 0.5, y: 0.5 }), [moveTo]);

  return { stageRef, layerRef, handlers: { onPointerMove, onPointerLeave } };
}
