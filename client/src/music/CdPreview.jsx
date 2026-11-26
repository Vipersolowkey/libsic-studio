// Part of: Music: a CD drawn in its case.
// Uses: cdLook.js.
// Used by: CdEditor.jsx, CdPage.jsx.
import { lookVars } from './cdLook.js';

// Inline style for a CD's lettering (the same on the case, the spine and the shelf).
export function letteringStyle(look) {
  const l = look.lettering || {};
  return { fontFamily: l.ff, fontStyle: l.fst, textTransform: l.tt, letterSpacing: l.ls };
}

// A CD in its case: spine, cover and printed disc. `look` comes from cdLook(). `spinning` turns the disc.
// ===== THE CD DRAWING. Used by CdEditor (live preview) and CdPage. CSS: workshop.css .mk-preview, .mk-case, .mk-disc =====
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
