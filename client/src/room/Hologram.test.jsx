import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Hologram, { hologramSpot } from './Hologram.jsx';

const scene = (extra = {}) => ({
  slug: 'some-room',
  layers: [{ name: 'back' }, { name: 'player', box: { x: 40, y: 60, width: 20, height: 10 } }],
  objects: [{ key: 'player', layer: 1, action: { type: 'nextTrack' } }],
  ...extra,
});

describe('hologramSpot', () => {
  it('starts the beam at the top centre of the music object when the room is not listed', () => {
    expect(hologramSpot(scene())).toEqual({ x: 50, y: 60, hue: 188 });
  });

  it('has its own spot for each of the three rooms', () => {
    ['night-study', 'golden-loft', 'underwater-nook'].forEach((slug) => {
      const spot = hologramSpot(scene({ slug }));
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.y).toBeGreaterThan(0);
    });
  });

  it('falls back to a safe place when the room has no music object', () => {
    expect(hologramSpot({ slug: 'x', layers: [], objects: [] }).x).toBe(72);
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

  it('is switched on by default and can be switched off', () => {
    const { container, rerender } = render(<Hologram scene={scene()}>x</Hologram>);
    expect(container.querySelector('.holo')).toHaveClass('holo-open');
    rerender(<Hologram scene={scene()} open={false}>x</Hologram>);
    expect(container.querySelector('.holo')).not.toHaveClass('holo-open');
    expect(container.querySelector('.holo')).toHaveAttribute('aria-hidden', 'true');
  });
});
