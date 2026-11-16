// The controls for the selected object: its size, mirroring it and taking it out of the room.
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
