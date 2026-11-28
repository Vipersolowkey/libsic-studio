// Part of: Hologram player: where it floats and its beam.
// Uses: placement.js.
// Used by: RoomScreen.jsx.
import { entryOf, placeBox, surfaceOf } from '../scene/placement.js';

// The floating hologram that shows the music player (children = <HoloPlayer>).
//   scene   where the beam starts and its colour come from SPOTS below (hand-tuned per room). A new scene falls back to its
//           music object's box and plain cyan; add a SPOTS entry and a .holo-<slug> rule in styles.css for its own look.
//   items   placed decorations (null = default), so the beam follows a moved player
//   open    switched on/off by clicking the music object
//   place   'object' = in the picture above the music object (zooms with it, has a beam); 'center' / 'top' = fixed on the window, bigger
const DEFAULT_HUE = 188; // cyan

// Beam start (x, y) in percent of the picture and colour hue per scene slug.
const SPOTS = {
  'night-study': { x: 62.9, y: 63, hue: 32 }, // above the turntable
  'golden-loft': { x: 73.4, y: 66, hue: 40 }, // above the CD player, a sunlit golden card
  'underwater-nook': { x: 22, y: 61, hue: 176 }, // above the giant clam
  'clover-meadow': { x: 31.2, y: 46.6, hue: 98 }, // above the porch radio
  'aurora-observatory': { x: 70.3, y: 66, hue: 164 }, // above the retro CD player
};

// Where the beam starts before any decoration moves it.
function baseSpot(scene, music) {
  if (SPOTS[scene.slug]) return SPOTS[scene.slug];
  const box = music ? scene.layers?.[music.layer]?.box : null;
  if (!box) return { x: 72, y: 64, hue: DEFAULT_HUE };
  return { x: box.x + box.width / 2, y: box.y, hue: DEFAULT_HUE };
}

// If the visitor moved the music object (Decorate), the beam start moves with it, using the same perspective maths as placement.js.
export function hologramSpot(scene, items = null) {
  const music = scene.objects?.find((o) => o.action?.type === 'nextTrack');
  const base = baseSpot(scene, music);
  if (items !== null) {
    const itemKey = music && scene.layers?.[music.layer]?.item;
    if (itemKey) {
      const entry = entryOf(scene, itemKey);
      const surface = entry && surfaceOf(scene, entry);
      const placed = items.find((it) => it.key === itemKey);
      if (placed && entry && surface) {
        const moved = placeBox({ x: base.x, y: base.y, width: 0, height: 0 }, placed, entry, surface);
        return { x: moved.x, y: moved.y, hue: base.hue };
      }
    }
  }
  return base;
}

// Where the player can float (menu order). `key` is saved in localStorage ("libsic.playerPlace").
export const HOLO_PLACES = [
  { key: 'center', label: 'Middle of the screen', short: 'Middle' },
  { key: 'top', label: 'Top of the screen', short: 'Top' },
  { key: 'object', label: 'Above the player', short: 'On player' },
];

// ===== THE HOLOGRAM FRAME: positions HoloPlayer (children) at the beam spot, or in the middle / top of the window. CSS: styles.css .holo-* =====
export default function Hologram({ scene, items = null, open = true, place = 'object', children }) {
  const { x, y, hue } = hologramSpot(scene, items);
  const skin = SPOTS[scene.slug] ? ` holo-${scene.slug}` : '';
  const onObject = place === 'object';
  return (
    <div className={`holo holo-at-${place}${skin}${open ? ' holo-open' : ''}`} aria-hidden={!open} inert={!open} style={{ '--hx': `${x}%`, '--hy': `${y}%`, '--holo-h': hue }}>
      <div className="holo-panel">{children}</div>
      {onObject && <div className="holo-beam" aria-hidden="true" />}
      {onObject && <div className="holo-emitter" aria-hidden="true" />}
    </div>
  );
}
