import { MAX_ITEMS } from '../scene/itemsEdit.js';

// The objects a visitor can add to the room, each with its picture. An object that may only be placed once
// is switched off while it is in the room, and everything is switched off when the room is full.
export default function DecorateTray({ scene, items, onAdd }) {
  const full = items.length >= MAX_ITEMS;

  return (
    <div className="tray" role="group" aria-label="Add objects">
      <ul>
        {scene.catalog.map((entry) => {
          const placed = entry.unique && items.some((item) => item.key === entry.key);
          return (
            <li key={entry.key}>
              <button type="button" className="tray-item" aria-label={`Add ${entry.label}`} disabled={full || placed} onClick={() => onAdd(entry.key)}>
                <img src={entry.thumb} alt="" draggable={false} />
                <span>{entry.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {full && <p className="tray-note">The room is full ({MAX_ITEMS} objects).</p>}
    </div>
  );
}
