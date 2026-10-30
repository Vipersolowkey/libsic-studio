import { entryOf } from '../scene/placement.js';
import DecorateTray from './DecorateTray.jsx';
import ItemToolbar from './ItemToolbar.jsx';

// The buttons of decorate mode: Undo, Reset room and Done at the top right, the objects to add along the top
// (the desk is below, so the tray never covers a place an object can stand), and the settings of the selected
// object on the right.
//   editor   what useItemsEditor returns
export default function DecorateHud({ scene, editor, onDone }) {
  const selected = editor.items.find((item) => item.id === editor.selectedId);
  const entry = selected && entryOf(scene, selected.key);

  return (
    <>
      <div className="hud-tr hud-fade">
        <div className="savebar">
          <button type="button" className="chip" disabled={!editor.canUndo} onClick={editor.undo}>
            Undo
          </button>
          <button type="button" className="chip" onClick={editor.reset}>
            Reset room
          </button>
          <button type="button" className="chip primary" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
      <div className="hud-tc hud-fade">
        <DecorateTray scene={scene} items={editor.items} onAdd={editor.add} />
      </div>
      {entry && (
        <div className="hud-mr hud-fade">
          <ItemToolbar
            entry={entry}
            item={selected}
            onResize={(scale) => editor.resize(selected.id, scale)}
            onFlip={() => editor.flip(selected.id)}
            onRemove={() => editor.remove(selected.id)}
          />
        </div>
      )}
    </>
  );
}
