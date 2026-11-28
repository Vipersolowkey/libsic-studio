// Part of: Decorate mode: selection and undo.
// Uses: itemsEdit.js, placement.js.
// Used by: RoomScreen.jsx.
import { useRef, useState } from 'react';
import { addItem, flipItem, moveItem, removeItem, scaleItem } from '../scene/itemsEdit.js';
import { defaultItems } from '../scene/placement.js';

const MAX_STEPS = 20; // how many edits "Undo" can take back

const fresh = (slug) => ({ slug, selectedId: null, history: [] });

// Decorate-mode state: the selected item and an Undo history (max 20 steps). The items list itself is owned by RoomScreen
// (it is saved with the room); each edit is sent up via onChange. items === null = the scene's default arrangement.
// Many edits of one kind on one item in a row (a drag, the size slider) count as ONE undo step (the `join` key).
export function useItemsEditor(scene, items, onChange) {
  const [state, setState] = useState(() => fresh(scene.slug));
  if (state.slug !== scene.slug) setState(fresh(scene.slug)); // another scene: start over
  const current = items ?? defaultItems(scene);
  const lastEdit = useRef(null);

  const remember = (history) => [...history, items].slice(-MAX_STEPS);

  // Sends the new list up, unless the edit changed nothing. `selectedId` (optional) selects an object with it.
  function edit(next, { join, selectedId } = {}) {
    if (next === current) return;
    const step = join && `${scene.slug}:${join}`;
    const sameStep = step && lastEdit.current === step;
    lastEdit.current = step || null;
    setState((prev) => ({
      ...prev,
      history: sameStep ? prev.history : remember(prev.history),
      selectedId: selectedId ?? prev.selectedId,
    }));
    onChange(next);
  }

  return {
    items: current, // the list being edited: the default arrangement until the first edit
    // Only an object that is still in the room counts as selected (it may have been removed or undone).
    selectedId: current.some((item) => item.id === state.selectedId) ? state.selectedId : null,
    canUndo: state.history.length > 0,
    select(id) {
      lastEdit.current = null;
      setState((prev) => ({ ...prev, selectedId: id }));
    },
    move: (id, point) => edit(moveItem(scene, current, id, point), { join: `move:${id}` }),
    resize: (id, scale) => edit(scaleItem(scene, current, id, scale), { join: `resize:${id}` }),
    flip: (id) => edit(flipItem(scene, current, id)),
    remove: (id) => edit(removeItem(current, id)),
    add(key) {
      const next = addItem(scene, current, key);
      edit(next, { selectedId: next.at(-1)?.id });
    },
    undo() {
      if (!state.history.length) return;
      lastEdit.current = null;
      setState((prev) => ({ ...prev, history: prev.history.slice(0, -1) }));
      onChange(state.history.at(-1));
    },
    // Back to the scene's default arrangement. Undo brings the old arrangement back.
    reset() {
      if (items === null) return;
      lastEdit.current = null;
      setState((prev) => ({ ...prev, history: remember(prev.history) }));
      onChange(null);
    },
  };
}
