import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DecorateTray from './DecorateTray.jsx';
import { MAX_ITEMS } from '../scene/itemsEdit.js';
import { decorScene as scene } from '../test/fixtures.js';

const mug = { id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false };
const player = { id: 'player', key: 'player', x: 60, y: 80, scale: 1, flip: false };

describe('DecorateTray', () => {
  it('lists every object of the scene with its picture and name', () => {
    render(<DecorateTray scene={scene} items={[]} onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: 'Add Mug' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Music player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Mug' }).querySelector('img')).toHaveAttribute('src', '/scenes/decor-room/mug.webp');
  });

  it('adds the object that was pressed', async () => {
    const onAdd = vi.fn();
    render(<DecorateTray scene={scene} items={[]} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Mug' }));
    expect(onAdd).toHaveBeenCalledWith('mug');
  });

  it('keeps adding more of an object that may be placed many times', () => {
    render(<DecorateTray scene={scene} items={[mug, { ...mug, id: 'mug2' }]} onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: 'Add Mug' })).toBeEnabled();
  });

  it('switches off an object that may only be placed once when it is already in the room', () => {
    render(<DecorateTray scene={scene} items={[player]} onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: 'Add Music player' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Mug' })).toBeEnabled();
  });

  it('switches everything off when the room is full', () => {
    const full = Array.from({ length: MAX_ITEMS }, (_, i) => ({ ...mug, id: `m${i}` }));
    render(<DecorateTray scene={scene} items={full} onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: 'Add Mug' })).toBeDisabled();
    expect(screen.getByText(/room is full/i)).toBeInTheDocument();
  });
});
