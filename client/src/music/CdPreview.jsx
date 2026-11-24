import { lookVars } from './cdLook.js';

// The lettering of a CD, as inline style (the same lettering that is printed on its spine on the shelf).
export function letteringStyle(look) {
  const l = look.lettering || {};
  return { fontFamily: l.ff, fontStyle: l.fst, textTransform: l.tt, letterSpacing: l.ls };
}

// A CD standing on the workshop desk: its spine, its front cover in a case and its printed disc.
// `look` comes from cdLook(). The same paint is used on the shelf in the rooms and on the disc that spins in the player.
export default function CdPreview({ look, title, spinning = false, caption = 'a Libsic mix' }) {
  const name = title?.trim() || 'Untitled CD';
  return (
    <div className="mk-preview" style={lookVars(look)} role="img" aria-label={`Preview of the CD ${name}`}>
      <div className="mk-spine" aria-hidden="true"><span style={letteringStyle(look)}>{name}</span></div>
      <div className="mk-case" aria-hidden="true">
        <div className="mk-art" />
        <div className="mk-label"><b style={letteringStyle(look)}>{name}</b><small>{caption}</small></div>
        <i className="mk-shine" />
      </div>
      <div className={`mk-disc${spinning ? ' spinning' : ''}`} aria-hidden="true"><span className="mk-hub" /></div>
    </div>
  );
}
