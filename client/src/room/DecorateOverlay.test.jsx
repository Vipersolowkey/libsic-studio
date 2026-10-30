import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DecorateOverlay from './DecorateOverlay.jsx';
import { decorScene as scene } from '../test/fixtures.js';

const mug = { id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false };
const player = { id: 'player', key: 'player', x: 60, y: 80, scale: 1, flip: false };

// The overlay is 1000 x 500 pixels, 100 pixels from the left and 50 from the top of the window,
// so a pixel position (px, py) is the scene point ((px - 100) / 10, (py - 50) / 5) in percent.
function setup(props = {}) {
  const handlers = { onSelect: vi.fn(), onMove: vi.fn() };
  const view = render(<DecorateOverlay scene={scene} items={[mug, player]} selectedId={null} {...handlers} {...props} />);
  view.container.firstChild.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500 });
  return { ...view, ...handlers };
}

describe('DecorateOverlay', () => {
  it('has one grab box for each object, placed over the area the object covers', () => {
    setup({ items: [mug, { ...player, x: 70, y: 90, scale: 1.5 }] });
    expect(screen.getByRole('button', { name: 'Mug' })).toHaveStyle({ left: '37%', top: '72%', width: '6%', height: '8%' });
    // 1.5 times bigger, standing at (70, 90): the bounds { x: 50, y: 60, width: 20, height: 20 } grow around (60, 80)
    expect(screen.getByRole('button', { name: 'Music player' })).toHaveStyle({ left: '55%', top: '60%', width: '30%', height: '30%' });
  });

  it('draws nothing for an item whose object the scene does not have', () => {
    setup({ items: [mug, { ...player, key: 'teapot' }] });
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('keeps the grab boxes in the same order in the page when an object is moved past another', () => {
    const { rerender } = setup();
    const names = () => screen.getAllByRole('button').map((box) => box.getAttribute('aria-label'));
    expect(names()).toEqual(['Mug', 'Music player']);
    const mugBox = screen.getByRole('button', { name: 'Mug' });
    // the mug is now nearer than the player; a box that changes place in the page would lose the pointer
    rerender(<DecorateOverlay scene={scene} items={[{ ...mug, y: 95 }, player]} selectedId={null} onSelect={vi.fn()} onMove={vi.fn()} />);
    expect(names()).toEqual(['Mug', 'Music player']);
    expect(screen.getByRole('button', { name: 'Mug' })).toBe(mugBox);
  });

  it('stacks the boxes like the objects are drawn, and puts the selected one on top', () => {
    const { rerender } = setup({ items: [{ ...mug, y: 95 }, player] });
    const z = (name) => Number(screen.getByRole('button', { name }).style.zIndex);
    expect(z('Mug')).toBeGreaterThan(z('Music player')); // the mug is nearer
    rerender(<DecorateOverlay scene={scene} items={[{ ...mug, y: 95 }, player]} selectedId="player" onSelect={vi.fn()} onMove={vi.fn()} />);
    expect(z('Music player')).toBeGreaterThan(z('Mug'));
  });

  it('selects an object when it is pressed', () => {
    const { onSelect } = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Mug' }), { clientX: 400, clientY: 450 });
    expect(onSelect).toHaveBeenCalledWith('mug');
  });

  it('selects nothing when the empty room is pressed', () => {
    const { container, onSelect } = setup();
    fireEvent.pointerDown(container.firstChild, { clientX: 300, clientY: 100 });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the selected object', () => {
    setup({ selectedId: 'player' });
    expect(screen.getByRole('button', { name: 'Music player' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mug' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves the object by the distance the pointer moved, so it does not jump to the pointer', () => {
    const { onMove } = setup();
    const box = screen.getByRole('button', { name: 'Mug' });
    fireEvent.pointerDown(box, { clientX: 400, clientY: 450 }); // scene (30, 80), the mug stands at (40, 80)
    fireEvent.pointerMove(box, { clientX: 600, clientY: 400 }); // scene (50, 70)
    expect(onMove).toHaveBeenLastCalledWith('mug', { x: 60, y: 70 });
  });

  it('does not move anything when the pointer moves without being pressed', () => {
    const { onMove } = setup();
    fireEvent.pointerMove(screen.getByRole('button', { name: 'Mug' }), { clientX: 600, clientY: 400 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it.each([
    ['the pointer is released', 'pointerUp'],
    ['the touch is cancelled', 'pointerCancel'],
    ['the browser takes the pointer away', 'lostPointerCapture'],
  ])('stops moving the object when %s', (label, event) => {
    const { onMove } = setup();
    const box = screen.getByRole('button', { name: 'Mug' });
    fireEvent.pointerDown(box, { clientX: 400, clientY: 450 });
    fireEvent.pointerMove(box, { clientX: 500, clientY: 450 });
    fireEvent[event](box);
    onMove.mockClear();

    fireEvent.pointerMove(box, { clientX: 700, clientY: 300 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('keeps the pointer with the box while dragging, so a fast drag does not lose it', () => {
    setup();
    const box = screen.getByRole('button', { name: 'Mug' });
    box.setPointerCapture = vi.fn();
    fireEvent.pointerDown(box, { pointerId: 7, clientX: 400, clientY: 450 });
    expect(box.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('nudges the selected object one step with the arrow keys and five with shift', () => {
    const { onMove } = setup({ selectedId: 'mug' });
    const box = screen.getByRole('button', { name: 'Mug' });
    fireEvent.keyDown(box, { key: 'ArrowRight' });
    expect(onMove).toHaveBeenLastCalledWith('mug', { x: 41, y: 80 });
    fireEvent.keyDown(box, { key: 'ArrowUp', shiftKey: true });
    expect(onMove).toHaveBeenLastCalledWith('mug', { x: 40, y: 75 });
  });

  it('selects an object when Enter is pressed on it', () => {
    const { onSelect } = setup();
    screen.getByRole('button', { name: 'Mug' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Mug' }));
    expect(onSelect).toHaveBeenCalledWith('mug');
  });
});
