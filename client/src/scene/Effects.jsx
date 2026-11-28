// Part of: Room picture: rain, snow, fireflies and other effects.
// Uses: particles.js.
// Used by: SceneStage.jsx.
import { useMemo } from 'react';
import { makeParticles, between, mulberry32 } from './particles.js';

// Weather / ambient effects. Each is a set of small <i> elements animated by CSS (scene.css: .effect-<name>); the numbers
// below are per-particle CSS variables. Seeds are fixed so nothing jumps on redraw. To add an effect: add it here AND to
// EFFECTS in api/src/constants.js, scene.css, and the button label/icon in room/Controls.jsx.
const px = (n) => `${n.toFixed(1)}px`;
const pct = (n) => `${n.toFixed(2)}%`;
const sec = (n) => `${n.toFixed(2)}s`;

// ===== PARTICLE EFFECTS (snow, fireflies, dust, bubbles, plankton, glitter, stars): how many, where, how big, how fast =====
const BUILDERS = {
  snow: () =>
    makeParticles(320, 22, (r) => ({
      '--x': pct(between(r, 0, 100)),
      '--size': px(between(r, 3, 8)),
      '--dur': sec(between(r, 9, 18)),
      '--delay': sec(-between(r, 0, 18)),
      '--alpha': between(r, 0.5, 1).toFixed(2),
    })),
  fireflies: () =>
    makeParticles(40, 33, (r) => ({
      '--x': pct(between(r, 3, 97)),
      '--y': pct(between(r, 20, 92)),
      '--size': px(between(r, 3, 6)),
      '--dur': sec(between(r, 6, 12)),
      '--blink': sec(between(r, 2.5, 5)),
      '--delay': sec(-between(r, 0, 10)),
    })),
  // specks of dust floating in the sunlight: slow, small and soft
  dust: () =>
    makeParticles(48, 55, (r) => ({
      '--x': pct(between(r, 4, 72)),
      '--y': pct(between(r, 18, 86)),
      '--size': px(between(r, 2.2, 5.2)),
      '--dur': sec(between(r, 14, 26)),
      '--blink': sec(between(r, 4, 9)),
      '--delay': sec(-between(r, 0, 26)),
      '--dx': px(between(r, -46, 46)),
      '--dy': px(between(r, -60, 30)),
    })),
  // bubbles rising through water: they start low, wobble sideways and fade out near the top
  bubbles: () =>
    makeParticles(46, 66, (r) => ({
      '--x': pct(between(r, 3, 96)),
      '--size': px(between(r, 4, 15)),
      '--dur': sec(between(r, 8, 18)),
      '--delay': sec(-between(r, 0, 18)),
      '--wob': px(between(r, -16, 16)),
      '--wobdur': sec(between(r, 2.2, 4.6)),
    })),
  // tiny glowing specks drifting in dark water
  plankton: () =>
    makeParticles(90, 77, (r) => ({
      '--x': pct(between(r, 3, 96)),
      '--y': pct(between(r, 8, 90)),
      '--size': px(between(r, 1.6, 4)),
      '--dur': sec(between(r, 16, 30)),
      '--blink': sec(between(r, 3, 8)),
      '--delay': sec(-between(r, 0, 30)),
      '--dx': px(between(r, -34, 34)),
      '--dy': px(between(r, -48, 20)),
    })),
  // glitter: little four-pointed sparkles that flash on and off at night, like frost catching the light
  glitter: () =>
    makeParticles(60, 91, (r) => ({
      '--x': pct(between(r, 2, 98)),
      '--y': pct(between(r, 2, 94)),
      '--size': px(between(r, 6, 15)),
      '--dur': sec(between(r, 2.6, 6.5)),
      '--delay': sec(-between(r, 0, 6.5)),
      '--hue': Math.round(between(r, 165, 215)),
    })),
  stars: () =>
    makeParticles(70, 44, (r) => ({
      '--x': pct(between(r, 0, 100)),
      '--y': pct(between(r, 0, 62)),
      '--size': px(between(r, 1, 3.2)),
      '--dur': sec(between(r, 2.5, 6)),
      '--delay': sec(-between(r, 0, 6)),
    })),
};

// Rain is special (GPU cost): instead of hundreds of drop elements, streaks are painted once into 2 tiling SVG sheets that
// slide down forever. "back" = far fine rain, "near" = a few long bright streaks (falls faster, gives depth). Each sheet
// costs about one full-screen layer, so keep it to 2. 16 drops on the glass (rain-drop) run down now and then.
// ===== RAIN: drawn as 2 tiling sheets (see the note above) =====
const SHEETS = [
  {
    name: 'back',
    seed: 5,
    groups: [
      { count: 70, length: [6, 12], width: 0.5, alpha: [0.08, 0.2] },
      { count: 18, length: [16, 30], width: 0.8, alpha: [0.14, 0.3] },
    ],
  },
  { name: 'near', seed: 7, groups: [{ count: 11, length: [18, 34], width: 0.9, alpha: [0.16, 0.34] }] },
];
const TILE = 300; // the sheet is a repeating square of this size (SVG units)
const SLANT = 0.07; // sideways lean of a streak. Keep equal to --slant in scene.css.

// Returns a CSS url() of an SVG tile of slanted streaks (brighter toward the bottom end, like a falling drop).
export function rainTile({ seed, groups }) {
  const r = mulberry32(seed);
  let drawn = '';
  for (const { count, length, width, alpha } of groups) {
    let lines = '';
    for (let i = 0; i < count; i++) {
      const len = between(r, length[0], length[1]);
      const x = between(r, len * SLANT + 2, TILE - 2); // kept inside the square, so the repeat has no cut drops
      const y = between(r, 2, TILE - len - 2);
      lines += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - len * SLANT).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke-opacity="${between(r, alpha[0], alpha[1]).toFixed(2)}"/>`;
    }
    drawn += `<g stroke-width="${width}">${lines}</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ff" stop-opacity="0"/><stop offset="1" stop-color="#dbe8ff"/></linearGradient></defs><g stroke="url(#g)" stroke-linecap="round">${drawn}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function Rain() {
  const sheets = useMemo(() => SHEETS.map((sheet) => ({ name: sheet.name, image: rainTile(sheet) })), []);
  const drops = useMemo(
    () =>
      makeParticles(16, 12, (r) => ({
        '--x': pct(between(r, 3, 97)),
        '--y': pct(between(r, 4, 70)),
        '--size': px(between(r, 3, 6.5)),
        '--run': `${between(r, 10, 30).toFixed(0)}cqh`,
        '--dur': sec(between(r, 7, 16)),
        '--delay': sec(-between(r, 0, 16)),
      })),
    []
  );
  return (
    <div className="effect effect-rain" data-effect="rain" aria-hidden="true">
      {sheets.map((sheet) => (
        <i key={sheet.name} className={`rain-sheet rain-${sheet.name}`} style={{ backgroundImage: sheet.image }} />
      ))}
      {drops.map((style, i) => (
        <i key={i} className="rain-drop" style={style} />
      ))}
    </div>
  );
}

// Draws one effect by name. 'none' or an unknown name draws nothing.
// ===== ENTRY POINT: SceneStage.jsx renders <Effect name=...> inside layer scene.effectLayer =====
export default function Effect({ name }) {
  if (name === 'rain') return <Rain />;
  return <Particles name={name} />;
}

function Particles({ name }) {
  const particles = useMemo(() => (BUILDERS[name] ? BUILDERS[name]() : []), [name]);
  if (particles.length === 0) return null;
  return (
    <div className={`effect effect-${name}`} data-effect={name} aria-hidden="true">
      {particles.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  );
}
