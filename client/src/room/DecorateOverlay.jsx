import { useRef } from 'react';
import { entryOf, itemBounds } from '../scene/placement.js';

const NUDGE = 1; // percent moved by an arrow key
const NUDGE_SHIFT = 5; // ... and with shift held
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// A transparent layer over the picture while decorating. Every placed object gets a grab box over the area it
// covers. Pressing a box selects the object; pressing and dragging moves it.
//   items       the objects in the room
//   selectedId  the id of the selected object, or null
//   onSelect    called with an id, or null when the empty room is pressed
//   onMove      called with an id and the new place of the object's contact point, in percent of the scene
// It sits inside the stage, in the same stretched space as the layers (see .decorate-overlay), so the boxes line
// up with the objects and a pointer position becomes a scene position with one division.
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

  // Nearer objects (larger y) are drawn later, so they get their box on top as well.
  const placed = items
    .filter((item) => entryOf(scene, item.key))
    .sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));

  return (
    <div ref={overlayRef} className="decorate-overlay" data-testid="decorate-overlay" onPointerDown={(e) => e.target === e.currentTarget && onSelect(null)}>
      {placed.map((item) => {
        const { x, y, width, height } = itemBounds(scene, item);
        return (
          <button
            key={item.id}
            type="button"
            className={`hit${item.id === selectedId ? ' selected' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
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
