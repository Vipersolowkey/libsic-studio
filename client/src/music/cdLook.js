// How each CD looks on the shelf: its spine, its front cover and the print on its disc.
// A few CDs are drawn by hand (the studio CDs and the two Chillhop playlists). Every other CD, including the ones people
// make themselves, gets a look worked out from its title, so the same title always looks the same and different titles
// look different. Nothing here is stored: it is only paint.

// Lettering styles for the spine. `ff` is the font, the rest tune it. The fonts come from index.html; if one fails to
// load the browser falls back to the page's normal font.
const LETTERING = [
  { ff: "'Playfair Display', Georgia, serif", fst: 'italic', fs: '13px' },
  { ff: "'Oswald', 'Arial Narrow', sans-serif", tt: 'uppercase', ls: '.14em', fs: '12px' },
  { ff: "'Caveat', cursive", fs: '17px' },
  { ff: "'Space Mono', ui-monospace, monospace", fs: '11px', ls: '0' },
  { ff: "'Oswald', 'Arial Narrow', sans-serif", tt: 'uppercase', ls: '.08em', fs: '11px' },
];

// Hand-drawn looks. The key is the CD code (studio CDs) or the playlist link (online ones).
const HANDMADE = {
  'night-study': {
    spine: 'linear-gradient(#2a3550, #0f1524)',
    art: 'radial-gradient(circle at 72% 28%, #f3d58c 0 9%, transparent 10%), linear-gradient(160deg, #2a3550, #0f1524)',
    face: 'conic-gradient(from 30deg, #2a3550, #6e8ac0, #f3d58c, #2a3550)',
    width: 32,
    lettering: LETTERING[0],
  },
  'clam-cove': {
    spine: 'linear-gradient(#2fa0a8, #06222c)',
    art: 'radial-gradient(circle at 50% 112%, #7ee0d0 0 32%, transparent 33%), linear-gradient(180deg, #0f4c5c, #06222c)',
    face: 'repeating-radial-gradient(circle, #0f4c5c 0 5px, #2fa0a8 5px 10px)',
    width: 34,
    lettering: LETTERING[1],
  },
  'golden-loft': {
    spine: 'linear-gradient(#e8a84a, #5a2f12)',
    art: 'radial-gradient(circle at 30% 68%, #ffe2a0 0 15%, transparent 16%), linear-gradient(200deg, #e8a84a, #5a2f12)',
    face: 'repeating-conic-gradient(#e8a84a 0 12deg, #fff0b0 12deg 24deg)',
    width: 30,
    lettering: LETTERING[2],
  },
  'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-fall-2024': {
    spine: 'repeating-linear-gradient(0deg, #d98a3d 0 12px, #b9692a 12px 24px)',
    art: 'repeating-linear-gradient(135deg, #d98a3d 0 10px, #b9692a 10px 20px)',
    face: 'conic-gradient(#6b3a1e, #d98a3d, #f2c14e, #6b3a1e)',
    width: 36,
    lettering: LETTERING[4],
  },
  'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-summer-2026': {
    spine: 'linear-gradient(#f2c14e, #e0762c)',
    art: 'radial-gradient(circle at 50% 38%, #fff0b0 0 20%, transparent 21%), linear-gradient(#f2c14e, #e0762c)',
    face: 'radial-gradient(circle, #fff0b0 0 30%, #f2c14e 31% 60%, #e0762c 61%)',
    width: 36,
    ink: '#3a1a08',
    lettering: LETTERING[4],
  },
};

// A small number worked out from a text: the same text always gives the same number.
function hash(text) {
  let h = 7;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Four ways to draw the front cover, four for the disc. The colours come from one hue, so a CD looks like one object.
function cover(i, dark, mid, light, faint) {
  const base = `linear-gradient(160deg, ${mid}, ${dark})`;
  return [
    `radial-gradient(circle at 70% 30%, ${light} 0 10%, transparent 11%), ${base}`,
    `repeating-radial-gradient(circle at 50% 50%, ${mid} 0 6px, ${dark} 6px 14px)`,
    `linear-gradient(90deg, transparent 0 42%, ${faint} 42% 46%, transparent 46%), ${base}`,
    `radial-gradient(circle at 50% 112%, ${light} 0 30%, transparent 31%), ${base}`,
  ][i % 4];
}
function printedDisc(i, dark, mid, light) {
  return [
    `conic-gradient(${dark}, ${mid}, ${light}, ${dark})`,
    `repeating-radial-gradient(circle, ${dark} 0 4px, ${mid} 4px 8px)`,
    `repeating-conic-gradient(${mid} 0 12deg, ${light} 12deg 24deg)`,
    `radial-gradient(circle, ${light} 0 30%, ${mid} 31% 60%, ${dark} 61%)`,
  ][i % 4];
}

// What a person can choose when they make or edit a CD (it is saved with the CD as { hue, cover, disc, font }).
export const HUES = [8, 28, 42, 78, 140, 172, 200, 222, 262, 300, 330];
export const COVER_NAMES = ['Sun', 'Ripples', 'Stripe', 'Horizon'];
export const DISC_NAMES = ['Rainbow', 'Grooves', 'Rays', 'Target'];
export const FONT_NAMES = ['Serif', 'Poster', 'Hand-written', 'Typewriter', 'Block'];

const isChoice = (look) => look && typeof look === 'object' && [['hue', 359], ['cover', 3], ['disc', 3], ['font', 4]].every(([key, max]) => Number.isInteger(look[key]) && look[key] >= 0 && look[key] <= max);

// The choice a CD gets when nobody painted it: worked out from its key, so it is the same one that is drawn on the shelf.
// An editor starts from it, so editing an old CD does not change how it looks until a person picks something.
export function defaultChoice(key) {
  const h = hash(String(key));
  return { hue: h % 360, cover: (h >>> 3) % 4, disc: (h >>> 5) % 4, font: (h >>> 9) % LETTERING.length };
}

// A random look for a new CD.
export function randomChoice() {
  return { hue: HUES[Math.floor(Math.random() * HUES.length)], cover: Math.floor(Math.random() * 4), disc: Math.floor(Math.random() * 4), font: Math.floor(Math.random() * LETTERING.length) };
}

// The look of one CD. `key` is what makes it unique (its code or link). `custom` is the choice a person made for a CD of
// their own ({ hue, cover, disc, font }); without one, the look is worked out from the key, so a CD looks the same on the
// shelf and in the player. `title` is not used for the look.
export function cdLook(key, title, custom) {
  const hand = HANDMADE[key];
  if (hand) return { ink: '#fff', ...hand };
  const h = hash(String(key));
  const choice = isChoice(custom) ? custom : defaultChoice(key);
  const { hue } = choice;
  const dark = `hsl(${hue} 45% 14%)`;
  const mid = `hsl(${hue} 52% 42%)`;
  const light = `hsl(${(hue + 30) % 360} 75% 72%)`;
  return {
    spine: `linear-gradient(${mid}, ${dark})`,
    art: cover(choice.cover, dark, mid, light, `hsl(${(hue + 30) % 360} 75% 72% / .25)`),
    face: printedDisc(choice.disc, dark, mid, light),
    width: 28 + ((h >>> 7) % 4) * 2,
    ink: '#fff',
    lettering: LETTERING[choice.font],
  };
}

// The CSS variables that carry a look to the styles in music.css.
export function lookVars(look) {
  const vars = { '--sp': look.spine, '--art': look.art, '--face': look.face, '--ink2': look.ink, '--w': `${look.width}px` };
  const l = look.lettering || {};
  if (l.ff) vars['--ff'] = l.ff;
  if (l.fs) vars['--fs'] = l.fs;
  if (l.fst) vars['--fst'] = l.fst;
  if (l.ls) vars['--ls'] = l.ls;
  if (l.tt) vars['--tt'] = l.tt;
  return vars;
}
