import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemToolbar from './ItemToolbar.jsx';
import { decorScene as scene } from '../test/fixtures.js';

const mugEntry = scene.catalog[0];
const playerEntry = scene.catalog[1];
const mug = { id: 'mug', key: 'mug', x: 40, y: 80, scale: 1.25, flip: false };
const player = { id: 'player', key: 'player', x: 60, y: 80, scale: 1, flip: false };

function setup(entry = mugEntry, item = mug) {
  const handlers = { onResize: vi.fn(), onFlip: vi.fn(), onRemove: vi.fn() };
  render(<ItemToolbar entry={entry} item={item} {...handlers} />);
  return handlers;
}

describe('ItemToolbar', () => {
  it('names the object it is for', () => {
    setup();
    expect(screen.getByText('Mug')).toBeInTheDocument();
  });

  it('has a size slider that covers the range of the object and starts at its size', () => {
    setup();
    const slider = screen.getByRole('slider', { name: 'Size' });
    expect(slider).toHaveAttribute('min', '0.5');
    expect(slider).toHaveAttribute('max', '2');
    expect(slider).toHaveValue('1.25');
  });

  it('sends the new size as a number when the slider moves', () => {
    const { onResize } = setup();
    fireEvent.change(screen.getByRole('slider', { name: 'Size' }), { target: { value: '1.6' } });
    expect(onResize).toHaveBeenCalledWith(1.6);
  });

  it('flips and removes', async () => {
    const { onFlip, onRemove } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Flip' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onFlip).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('has no flip button for an object that cannot be mirrored', () => {
    setup(playerEntry, player);
    expect(screen.queryByRole('button', { name: 'Flip' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});
