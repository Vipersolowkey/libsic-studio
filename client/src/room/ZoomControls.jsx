import { MAX_ZOOM, MIN_ZOOM } from './view.js';

// Zoom in, zoom out, and "Fit" to see the whole room.
export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit }) {
  return (
    <div className="zoom" role="group" aria-label="Zoom">
      <button type="button" className="chip" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={onZoomIn}>
        +
      </button>
      <button type="button" className="chip" aria-label="Show the whole room" aria-pressed={zoom <= MIN_ZOOM} onClick={onFit}>
        Fit
      </button>
      <button type="button" className="chip" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={onZoomOut}>
        &minus;
      </button>
    </div>
  );
}
