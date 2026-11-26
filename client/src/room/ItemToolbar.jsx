// Part of: Decorate mode: size, flip and remove of the selected object.
// Used by: DecorateHud.jsx.
// Size slider (range from the catalog entry), Flip (only if the object is flippable) and Remove for the selected object.
export default function ItemToolbar({ entry, item, onResize, onFlip, onRemove }) {
  return (
    <div className="item-toolbar" role="group" aria-label={`${entry.label} settings`}>
      <strong>{entry.label}</strong>
      <label>
        Size
        <input
          type="range"
          min={entry.scale.min}
          max={entry.scale.max}
          step="0.05"
          value={item.scale}
          onChange={(e) => onResize(Number(e.target.value))}
        />
      </label>
      {entry.flippable && (
        <button type="button" className="chip" onClick={onFlip}>
          Flip
        </button>
      )}
      <button type="button" className="chip danger" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
