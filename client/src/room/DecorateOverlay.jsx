// Part of: Decorate mode: drag boxes over the picture.
// Uses: placement.js.
// Used by: RoomScreen.jsx.
import { useRef } from 'react';
import { drawOrder, entryOf, itemBounds } from '../scene/placement.js';

const NUDGE = 1; // percent of the scene moved by an arrow key
const NUDGE_SHIFT = 5; // ... and with shift held
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// Invisible layer over the picture in Decorate mode: one grab box per placed object. Click = select, drag = move,
// arrow keys = nudge (Shift = 5x). Lives inside the stage, so pointer position / box size = scene percent directly.
//   onSelect(id | null)   onMove(id, { x, y })  the new contact point, in percent of the scene (clamping is done in itemsEdit.js)
export default function DecorateOverlay({ scene, items, selectedId, onSelect, onMove }) {
  const overlayRef = useRef(null);
  const drag = useRef(null); // while an object is held: { id, dx, dy } = where it stands compared with the pointer

  // The pointer position in percent of the scene.
  function scenePoint(e) {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  }

  function startDrag(e, item) {
    const pointer = scenePoint(e);
    drag.current = { id: item.id, dx: item.x - pointer.x, dy: item.y - pointer.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onSelect(item.id);
  }

  function dragTo(e) {
    if (!drag.current) return;
    const pointer = scenePoint(e);
    onMove(drag.current.id, { x: pointer.x + drag.current.dx, y: pointer.y + drag.current.dy });
  }

  const endDrag = () => {
    drag.current = null;
  };

  function nudge(e, item) {
    const arrow = ARROWS[e.key];
    if (!arrow) return;
    e.preventDefault();
    const step = e.shiftKey ? NUDGE_SHIFT : NUDGE;
    onMove(item.id, { x: item.x + arrow[0] * step, y: item.y + arrow[1] * step });
  }

  // Boxes must keep their DOM order (reordering would drop the pointer capture during a drag), so stacking uses z-index instead:
  // drawing order, with the selected object on top.
  const placed = items.filter((item) => entryOf(scene, item.key));
  const order = drawOrder(scene, placed);
  const stack = (item) => (item.id === selectedId ? order.length + 1 : order.indexOf(item.id) + 1);

  return (
    <div ref={overlayRef} className="decorate-overlay" data-testid="decorate-overlay" onPointerDown={(e) => e.target === e.currentTarget && onSelect(null)}>
      {placed.map((item) => {
        const { x, y, width, height } = itemBounds(scene, item);
        return (
          <button
            key={item.id}
            type="button"
            className={`hit${item.id === selectedId ? ' selected' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`, zIndex: stack(item) }}
            aria-label={entryOf(scene, item.key).label}
            aria-pressed={item.id === selectedId}
            onPointerDown={(e) => startDrag(e, item)}
            onPointerMove={dragTo}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => nudge(e, item)}
          />
        );
      })}
    </div>
  );
}
