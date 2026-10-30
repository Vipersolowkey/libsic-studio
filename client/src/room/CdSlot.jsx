// A stand-in for the retro CD player. The real player (tracks, CDs, play and pause) is the music side of the
// project; until it is connected this only shows where it will sit and that nothing is playing yet.
export default function CdSlot() {
  return (
    <section className="cd-slot" aria-label="CD player (coming soon)">
      <div className="cd-disc" aria-hidden="true" />
      <div className="cd-display" aria-hidden="true">
        <span>NO DISC</span>
        <span className="cd-track">--:--</span>
      </div>
      <div className="cd-buttons">
        <button type="button" className="cd-btn" disabled aria-label="Previous track">&#9198;</button>
        <button type="button" className="cd-btn cd-play" disabled aria-label="Play">&#9654;</button>
        <button type="button" className="cd-btn" disabled aria-label="Next track">&#9197;</button>
      </div>
    </section>
  );
}
