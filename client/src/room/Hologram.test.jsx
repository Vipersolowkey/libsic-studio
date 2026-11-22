import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultItems } from '../scene/placement.js';
import Hologram, { hologramSpot } from './Hologram.jsx';

const scene = (extra = {}) => ({
  slug: 'some-room',
  layers: [{ name: 'back' }, { name: 'player', box: { x: 40, y: 60, width: 20, height: 10 } }],
  objects: [{ key: 'player', layer: 1, action: { type: 'nextTrack' } }],
  ...extra,
});

// Listed room ('night-study') with a movable turntable on a perspective desk (scale 0.5 at y 60, 1 at y 80, 1.5 at y 100).
const movableStudy = {
  slug: 'night-study',
  layers: [
    { name: 'back' },
    { name: 'turntable', box: { x: 55, y: 63, width: 16, height: 17 }, item: 'turntable' },
  ],
  objects: [{ key: 'turntable', layer: 1, action: { type: 'nextTrack' } }],
  surfaces: [
    { key: 'desk', area: { x: 0, y: 60, width: 100, height: 40 }, drawAt: 1, perspective: { farY: 60, nearY: 100, farScale: 0.5, nearScale: 1.5 } },
  ],
  catalog: [
    { key: 'turntable', label: 'Turntable', surface: 'desk', home: { x: 63, y: 80 }, bounds: { x: 55, y: 63, width: 16, height: 17 }, inDefault: true, scale: { min: 0.5, max: 2 } },
  ],
};

describe('hologramSpot', () => {
  it('starts the beam at the top centre of the music object when the room is not listed', () => {
    expect(hologramSpot(scene())).toEqual({ x: 50, y: 60, hue: 188 });
  });

  it('has its own spot for each of the five rooms', () => {
    ['night-study', 'golden-loft', 'underwater-nook', 'clover-meadow', 'aurora-observatory'].forEach((slug) => {
      const spot = hologramSpot(scene({ slug }));
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.y).toBeGreaterThan(0);
      expect(spot.hue).not.toBe(188);
    });
    expect(hologramSpot(scene({ slug: 'clover-meadow' }))).toEqual({ x: 31.2, y: 46.6, hue: 98 });
    expect(hologramSpot(scene({ slug: 'aurora-observatory' }))).toEqual({ x: 70.3, y: 66, hue: 164 });
  });

  it('falls back to a safe place when the room has no music object', () => {
    expect(hologramSpot({ slug: 'x', layers: [], objects: [] }).x).toBe(72);
  });

  it('keeps exact SPOTS coordinates when items is null or at home', () => {
    expect(hologramSpot(movableStudy, null)).toEqual({ x: 62.9, y: 63, hue: 32 });
    expect(hologramSpot(movableStudy, defaultItems(movableStudy))).toEqual({ x: 62.9, y: 63, hue: 32 });
  });

  it('follows a moved and scaled player item across surface perspective', () => {
    // Dragged left along the same depth (s = 1): shifts x by -20, keeps y = 63
    const dragged = [{ id: 'turntable', key: 'turntable', x: 43, y: 80, scale: 1, flip: false }];
    expect(hologramSpot(movableStudy, dragged)).toEqual({ x: 42.9, y: 63, hue: 32 });

    // Moved forward to y = 100 (perspective 1.5x) with user scale 2 -> total scale s = 3 around contact point
    const scaledNear = [{ id: 'turntable', key: 'turntable', x: 50, y: 100, scale: 2, flip: false }];
    const spot = hologramSpot(movableStudy, scaledNear);
    expect(spot.x).toBeCloseTo(50 + (62.9 - 63) * 3);
    expect(spot.y).toBeCloseTo(100 + (63 - 80) * 3);
    expect(spot.hue).toBe(32);
  });

  it('falls back safely to the base spot when the player item was removed', () => {
    expect(hologramSpot(movableStudy, [])).toEqual({ x: 62.9, y: 63, hue: 32 });
    expect(hologramSpot(movableStudy, [{ id: 'mug', key: 'mug', x: 20, y: 80, scale: 1, flip: false }])).toEqual({ x: 62.9, y: 63, hue: 32 });
  });
});

describe('Hologram', () => {
  it('shows what it projects and places itself in percent of the picture', () => {
    const { container } = render(
      <Hologram scene={scene()}>
        <p>player</p>
      </Hologram>
    );
    expect(screen.getByText('player')).toBeInTheDocument();
    const holo = container.querySelector('.holo');
    expect(holo.style.getPropertyValue('--hx')).toBe('50%');
    expect(holo.style.getPropertyValue('--hy')).toBe('60%');
  });

  it('tracks a moved/scaled player item in items and falls back to SPOTS when at home or removed', () => {
    const { container, rerender } = render(<Hologram scene={movableStudy} items={defaultItems(movableStudy)}>x</Hologram>);
    const holo = container.querySelector('.holo');
    expect(holo.style.getPropertyValue('--hx')).toBe('62.9%');
    expect(holo.style.getPropertyValue('--hy')).toBe('63%');

    // Moved to x = 43, y = 100 (perspective 1.5x, user scale 1 -> s = 1.5; y = 100 + (63 - 80) * 1.5 = 74.5)
    rerender(
      <Hologram scene={movableStudy} items={[{ id: 'turntable', key: 'turntable', x: 43, y: 100, scale: 1, flip: false }]}>
        x
      </Hologram>
    );
    expect(parseFloat(holo.style.getPropertyValue('--hx'))).toBeCloseTo(43 + (62.9 - 63) * 1.5);
    expect(holo.style.getPropertyValue('--hy')).toBe('74.5%');

    // Player removed -> safe fallback to SPOTS
    rerender(<Hologram scene={movableStudy} items={[]}>x</Hologram>);
    expect(holo.style.getPropertyValue('--hx')).toBe('62.9%');
    expect(holo.style.getPropertyValue('--hy')).toBe('63%');
  });

  it('is switched on by default and can be switched off', () => {
    const { container, rerender } = render(<Hologram scene={scene()}>x</Hologram>);
    expect(container.querySelector('.holo')).toHaveClass('holo-open');
    rerender(<Hologram scene={scene()} open={false}>x</Hologram>);
    expect(container.querySelector('.holo')).not.toHaveClass('holo-open');
    expect(container.querySelector('.holo')).toHaveAttribute('aria-hidden', 'true');
  });
});
