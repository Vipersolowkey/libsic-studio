import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useItemsEditor } from './useItemsEditor.js';
import { decorScene as scene } from '../test/fixtures.js';

const defaults = [
  { id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false },
  { id: 'player', key: 'player', x: 60, y: 80, scale: 1, flip: false },
];

// Keeps the items like the room page does and records every change that is sent up.
function useHarness({ initial = null, activeScene = scene } = {}) {
  const [items, setItems] = useState(initial);
  const editor = useItemsEditor(activeScene, items, setItems);
  return { items, editor };
}

const setup = (options) => renderHook((props) => useHarness({ ...options, ...props }));

describe('useItemsEditor', () => {
  it('shows the list being edited: the default arrangement until the first edit', () => {
    const { result } = setup();
    expect(result.current.editor.items).toEqual(defaults);
    act(() => result.current.editor.flip('mug'));
    expect(result.current.editor.items).toBe(result.current.items);
  });

  it('starts the first edit from the default arrangement', () => {
    const { result } = setup();
    act(() => result.current.editor.move('mug', { x: 10, y: 90 }));
    expect(result.current.items).toEqual([{ ...defaults[0], x: 10, y: 90 }, defaults[1]]);
  });

  it('tells the parent about each change and keeps nothing itself', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useItemsEditor(scene, null, onChange));
    act(() => result.current.flip('mug'));
    expect(onChange).toHaveBeenCalledWith([{ ...defaults[0], flip: true }, defaults[1]]);
  });

  it('resizes, flips, removes and adds', () => {
    const { result } = setup();
    act(() => result.current.editor.resize('mug', 1.5));
    act(() => result.current.editor.flip('mug'));
    expect(result.current.items[0]).toMatchObject({ scale: 1.5, flip: true });
    act(() => result.current.editor.add('mug'));
    expect(result.current.items.map((i) => i.id)).toEqual(['mug', 'player', 'mug2']);
    act(() => result.current.editor.remove('player'));
    expect(result.current.items.map((i) => i.id)).toEqual(['mug', 'mug2']);
  });

  it('selects the object it just added and clears the selection when that object is removed', () => {
    const { result } = setup();
    act(() => result.current.editor.add('mug'));
    expect(result.current.editor.selectedId).toBe('mug2');
    act(() => result.current.editor.remove('mug2'));
    expect(result.current.editor.selectedId).toBeNull();
  });

  it('lets the visitor select an object and select nothing', () => {
    const { result } = setup();
    act(() => result.current.editor.select('mug'));
    expect(result.current.editor.selectedId).toBe('mug');
    act(() => result.current.editor.select(null));
    expect(result.current.editor.selectedId).toBeNull();
  });

  it('undo goes back one step at a time, down to the default arrangement', () => {
    const { result } = setup();
    expect(result.current.editor.canUndo).toBe(false);
    act(() => result.current.editor.move('mug', { x: 10, y: 90 }));
    act(() => result.current.editor.move('player', { x: 70, y: 70 }));
    expect(result.current.editor.canUndo).toBe(true);

    act(() => result.current.editor.undo());
    expect(result.current.items).toEqual([{ ...defaults[0], x: 10, y: 90 }, defaults[1]]);
    act(() => result.current.editor.undo());
    expect(result.current.items).toBeNull();
    expect(result.current.editor.canUndo).toBe(false);
  });

  it('counts a whole drag as one step', () => {
    const { result } = setup();
    act(() => result.current.editor.select('mug'));
    act(() => result.current.editor.move('mug', { x: 41, y: 80 }));
    act(() => result.current.editor.move('mug', { x: 45, y: 82 }));
    act(() => result.current.editor.move('mug', { x: 50, y: 85 }));

    act(() => result.current.editor.undo());
    expect(result.current.items).toBeNull();
  });

  it('counts a second drag of the same object as a new step', () => {
    const { result } = setup();
    act(() => result.current.editor.select('mug'));
    act(() => result.current.editor.move('mug', { x: 50, y: 85 }));
    act(() => result.current.editor.select('mug'));
    act(() => result.current.editor.move('mug', { x: 60, y: 90 }));

    act(() => result.current.editor.undo());
    expect(result.current.items[0]).toMatchObject({ x: 50, y: 85 });
  });

  it('does nothing when an edit changes nothing', () => {
    const { result } = setup();
    act(() => result.current.editor.flip('player')); // cannot be flipped
    act(() => result.current.editor.add('player')); // already placed
    expect(result.current.items).toBeNull();
    expect(result.current.editor.canUndo).toBe(false);
  });

  it('reset goes back to the default arrangement and undo brings the old room back', () => {
    const { result } = setup();
    act(() => result.current.editor.move('mug', { x: 10, y: 90 }));
    act(() => result.current.editor.reset());
    expect(result.current.items).toBeNull();

    act(() => result.current.editor.undo());
    expect(result.current.items[0]).toMatchObject({ x: 10, y: 90 });
  });

  it('reset on the default arrangement is not a step', () => {
    const { result } = setup();
    act(() => result.current.editor.reset());
    expect(result.current.editor.canUndo).toBe(false);
  });

  it('keeps the last 20 steps only', () => {
    const { result } = setup();
    for (let i = 0; i < 25; i++) {
      act(() => result.current.editor.select(null)); // a new gesture each time
      act(() => result.current.editor.flip('mug'));
    }
    for (let i = 0; i < 20; i++) act(() => result.current.editor.undo());
    expect(result.current.editor.canUndo).toBe(false);
  });

  it('clears the selection and the steps when the scene changes', () => {
    const { result, rerender } = setup();
    act(() => result.current.editor.add('mug'));
    expect(result.current.editor.canUndo).toBe(true);

    rerender({ activeScene: { ...scene, slug: 'other-room' } });
    expect(result.current.editor.selectedId).toBeNull();
    expect(result.current.editor.canUndo).toBe(false);
  });
});
