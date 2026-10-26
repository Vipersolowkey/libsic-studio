import { useMemo } from 'react';
import { makeParticles, between } from './particles.js';

// Each effect is a pile of small elements animated with CSS (see scene.css).
// The random numbers are fixed per effect, so nothing jumps when the page redraws.
const px = (n) => `${n.toFixed(1)}px`;
const pct = (n) => `${n.toFixed(2)}%`;
const sec = (n) => `${n.toFixed(2)}s`;

const BUILDERS = {
  rain: () =>
    makeParticles(280, 11, (r) => ({
      '--x': pct(between(r, -5, 105)),
      '--len': px(between(r, 14, 34)),
      '--dur': sec(between(r, 0.5, 0.95)),
      '--delay': sec(-between(r, 0, 2)),
      '--alpha': between(r, 0.25, 0.7).toFixed(2),
    })),
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
  stars: () =>
    makeParticles(70, 44, (r) => ({
      '--x': pct(between(r, 0, 100)),
      '--y': pct(between(r, 0, 62)),
      '--size': px(between(r, 1, 3.2)),
      '--dur': sec(between(r, 2.5, 6)),
      '--delay': sec(-between(r, 0, 6)),
    })),
};

// Draws one effect by name. 'none' (or an unknown name) draws nothing.
export default function Effect({ name }) {
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
