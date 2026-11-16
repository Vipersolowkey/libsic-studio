// Lets the music player appear as a small hologram that floats above the player object in the scene.
// It sits inside the stage and is placed with percentages, so it moves and scales with the picture.
//   scene     the scene from the API. Where the beam starts (the top of the player, in percent of the picture) and its colour
//             come from SPOTS below; a scene that is not listed starts the beam at the top of its music object.
//             Each listed room also gets its own colours (the .holo-<slug> rules in styles.css). Other rooms get plain cyan.
//   open      false: the hologram is switched off (clicking the music object switches it on and off)
//   place     where it floats: 'object' above the music object (with the light beam), or 'center' / 'top' of the window.
//             In the middle or at the top it is not part of the picture: it is bigger and stays put while the picture is zoomed.
//   children  what is projected (the CD player)
const DEFAULT_HUE = 188; // cyan

// Beam start (x, y) in percent of the picture, and the colour hue, for each room.
const SPOTS = {
  'night-study': { x: 62.9, y: 63, hue: 32 }, // above the turntable
  'golden-loft': { x: 73.4, y: 66, hue: 40 }, // above the CD player, a sunlit golden card
  'underwater-nook': { x: 22, y: 61, hue: 176 }, // above the giant clam
};

export function hologramSpot(scene) {
  if (SPOTS[scene.slug]) return SPOTS[scene.slug];
  const music = scene.objects?.find((o) => o.action?.type === 'nextTrack');
  const box = music ? scene.layers?.[music.layer]?.box : null;
  if (!box) return { x: 72, y: 64, hue: DEFAULT_HUE };
  return { x: box.x + box.width / 2, y: box.y, hue: DEFAULT_HUE };
}

// The places a visitor can choose from, in the order of the menu (see Controls.jsx).
export const HOLO_PLACES = [
  { key: 'center', label: 'Middle of the screen', short: 'Middle' },
  { key: 'top', label: 'Top of the screen', short: 'Top' },
  { key: 'object', label: 'Above the player', short: 'On player' },
];

export default function Hologram({ scene, open = true, place = 'object', children }) {
  const { x, y, hue } = hologramSpot(scene);
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
