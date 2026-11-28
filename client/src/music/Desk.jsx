// Part of: Music: the frame of the CD pages (/music and /cd/:code): the studio menu down the left, the page next to it.
// Uses: StudioShell.jsx.
// Used by: CdPage.jsx, MusicPage.jsx.
import StudioShell from '../account/StudioShell.jsx';

// `current` says which item of the studio menu is lit: music (Make a CD) or cds (the page of one CD). The look of what is inside
// (the .mk-* classes of workshop.css) is turned to the studio's dark colours by account/profile.css.
export default function Desk({ current, children }) {
  return (
    <StudioShell current={current}>
      <div className="mk-desk mk-work">
        <div className="mk-wrap">{children}</div>
      </div>
    </StudioShell>
  );
}
