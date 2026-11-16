import { entryOf } from '../scene/placement.js';
import DecorateTray from './DecorateTray.jsx';
import ItemToolbar from './ItemToolbar.jsx';
import { Section } from './Sidebar.jsx';

// What the side bar shows in decorate mode: Undo, Reset room and Done, the objects to add,
// and the settings of the selected object.
//   editor   what useItemsEditor returns
export default function DecorateHud({ scene, editor, onDone }) {
  const selected = editor.items.find((item) => item.id === editor.selectedId);
  const entry = selected && entryOf(scene, selected.key);

  return (
    <>
      <Section title="Decorate">
        <p className="muted">Drag an object in the room to move it. Click one to change it.</p>
        <div className="chip-row">
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
      </Section>
      {entry && (
        <Section title="Selected object">
          <ItemToolbar
            entry={entry}
            item={selected}
            onResize={(scale) => editor.resize(selected.id, scale)}
            onFlip={() => editor.flip(selected.id)}
            onRemove={() => editor.remove(selected.id)}
          />
        </Section>
      )}
      <Section title="Add objects">
        <DecorateTray scene={scene} items={editor.items} onAdd={editor.add} />
      </Section>
    </>
  );
}
