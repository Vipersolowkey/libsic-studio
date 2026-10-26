import { describe, expect, it } from 'vitest';
import { layerOffset, MAX_SHIFT } from './parallax.js';

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
