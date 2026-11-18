import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layerOffset, MAX_SHIFT, useParallax } from './parallax.js';

describe('layerOffset', () => {
  it('does not move anything when the mouse is in the middle', () => {
    expect(layerOffset({ x: 0.5, y: 0.5 }, 1, 1000)).toEqual({ x: -0, y: -0 });
  });

  it('moves the nearest layer the most, opposite to the mouse', () => {
    const { x } = layerOffset({ x: 1, y: 0.5 }, 1, 1000);
    expect(x).toBeCloseTo(-1000 * MAX_SHIFT);
  });

  it('moves far layers less than near layers', () => {
    const far = layerOffset({ x: 1, y: 1 }, 0.1, 1000);
    const near = layerOffset({ x: 1, y: 1 }, 0.9, 1000);
    expect(Math.abs(far.x)).toBeLessThan(Math.abs(near.x));
    expect(Math.abs(far.y)).toBeLessThan(Math.abs(near.y));
  });

  it('a layer with depth 0 stays still', () => {
    expect(layerOffset({ x: 0, y: 0 }, 0, 1000).x).toBeCloseTo(0);
  });
});

function Stage({ depths = [0.2, 1], enabled = true }) {
  const { stageRef, layerRef, handlers } = useParallax(depths, enabled);
  return createElement(
    'div',
    { ref: stageRef, 'data-testid': 'stage', ...handlers },
    depths.map((_, i) => createElement('div', { key: i, ref: layerRef(i), className: 'layer' }))
  );
}

const shiftOf = (el) => {
  const match = el.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
  return { x: Number(match[1]), y: Number(match[2]) };
};

describe('useParallax', () => {
  let frames;
  let nextFrameId;

  beforeEach(() => {
    frames = new Map();
    nextFrameId = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = nextFrameId++;
      frames.set(id, cb);
      return id;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushNextFrame() {
    const batch = [...frames.entries()];
    frames.clear();
    for (const [, cb] of batch) cb(16);
  }

  function mountStage(props) {
    const view = render(createElement(Stage, props));
    const stage = screen.getByTestId('stage');
    Object.defineProperty(stage, 'clientWidth', { value: 1000 });
    const getRect = vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 500 }));
    stage.getBoundingClientRect = getRect;
    const layers = [...view.container.querySelectorAll('.layer')];
    return { ...view, stage, layers, getRect };
  }

  it('moves immediately on the first pointerMove and coalesces rapid follow-up moves into one animation frame', () => {
    const { stage, layers, getRect } = mountStage();

    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 250 });
    expect(getRect).toHaveBeenCalledTimes(1);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(shiftOf(layers[1]).x).toBeCloseTo(-1000 * MAX_SHIFT);

    fireEvent.pointerMove(stage, { clientX: 500, clientY: 250 });
    fireEvent.pointerMove(stage, { clientX: 0, clientY: 0 });
    expect(getRect).toHaveBeenCalledTimes(1);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(shiftOf(layers[1]).x).toBeCloseTo(-1000 * MAX_SHIFT);

    flushNextFrame();
    expect(getRect).toHaveBeenCalledTimes(2);
    expect(shiftOf(layers[1]).x).toBeCloseTo(1000 * MAX_SHIFT);
    expect(shiftOf(layers[1]).y).toBeCloseTo(1000 * MAX_SHIFT);

    // A single move in the next frame needs no trailing layout read when the frame fires.
    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 500 });
    expect(getRect).toHaveBeenCalledTimes(3);
    flushNextFrame();
    expect(getRect).toHaveBeenCalledTimes(3);
  });

  it('resets the layers to the middle and cancels any pending frame on pointerLeave', () => {
    const { stage, layers, getRect } = mountStage();

    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 500 });
    fireEvent.pointerMove(stage, { clientX: 0, clientY: 0 });
    expect(frames.size).toBe(1);

    fireEvent.pointerLeave(stage);
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(shiftOf(layers[1]).x).toBeCloseTo(0);
    expect(shiftOf(layers[1]).y).toBeCloseTo(0);

    flushNextFrame();
    expect(getRect).toHaveBeenCalledTimes(1);
    expect(shiftOf(layers[1]).x).toBeCloseTo(0);
  });

  it('cancels any pending frame and resets the layers when disabled', () => {
    const { stage, layers, rerender } = mountStage({ enabled: true });

    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 500 });
    fireEvent.pointerMove(stage, { clientX: 0, clientY: 0 });
    expect(frames.size).toBe(1);

    rerender(createElement(Stage, { enabled: false }));
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(shiftOf(layers[1]).x).toBeCloseTo(0);
    expect(shiftOf(layers[1]).y).toBeCloseTo(0);
  });

  it('cancels any pending animation frame on unmount', () => {
    const { stage, getRect, unmount } = mountStage();

    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 500 });
    fireEvent.pointerMove(stage, { clientX: 0, clientY: 0 });
    expect(frames.size).toBe(1);

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    flushNextFrame();
    expect(getRect).toHaveBeenCalledTimes(1);
  });
});
