import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCds, resolveMusicLink } from '../api.js';
import { DISCOVERY_PLAYLISTS } from './discovery.js';
import { getMyCds } from './myCds.js';
import { forgetLink, getMyLinks, linkTitle, providerName, rememberLink } from './myLinks.js';
import { parseMusicSource } from './musicSource.js';
import { cdLook, lookVars } from './cdLook.js';
import { formatTime } from '../room/HoloPlayer.jsx';
import { uiScaleFor } from '../room/useUiScale.js';

// The way into all the music: a wooden CD tower standing in the bottom-right corner of the room. The CDs lie in it one
// above the other with their spines to the front, like on the shelf at home. The tower rests below the edge of the
// window with only its paper tag showing (what is in the player), so it takes no room. Pointing at the tag lifts the whole
// tower; moving away lowers it again (see music.css). A CD that is pointed at slides out and shows its front;
// clicking it sends its disc to the CD player in the room and the music starts there.
//
//   source / cdCode   what is playing now (an online playlist, or a CD of ours); that CD's place in the row stays empty
//   player            the player that is active, only used for the list of tracks of an online playlist
//   loading / error   state of loading a CD of ours (the error stays visible even while the row is closed)
//   onChooseSource    an online playlist or pasted link was chosen: { provider, url }
//   onChooseCd        a CD of ours was chosen by its code
//   onEject           take whatever is playing out of the player
//   onRetry           try loading the same CD again
const SOURCE_MARK = { studio: 'LS', soundcloud: 'SC', mine: 'ME', link: 'LK' };
const isLink = (text) => /^(https?:\/\/|spotify:)/i.test(text);

// The front of a pulled-out CD is 118 px square with a small label under it (about 142 px in all, measured in the tower's own pixels).
const PULL_FRONT = 118;
const PULL_TOTAL = 142;
const SLOT = 52; // the width one CD takes on the wide shelf
// How many CDs fit on one plank of the wide shelf in a window this wide.
function slotsPerRow() {
  const ui = uiScaleFor(window.innerWidth, window.innerHeight);
  return Math.max(4, Math.floor((Math.min(1180, window.innerWidth / ui - 64) - 76) / SLOT));
}

// Sends a copy of the disc flying from the CD that was picked to the music object in the room, so the choice is seen.
// Only decoration: it does nothing when the browser cannot animate or the visitor asked for less motion.
function flyDisc(fromElement, face) {
  if (!fromElement?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  let start = fromElement.getBoundingClientRect();
  if (!start.width) return;
  if (start.width > 140 || start.height > start.width * 2) start = { left: start.left + start.width / 2 - 28, top: start.top + start.height / 2 - 28, width: 56, height: 56 }; // a whole case or a standing spine: fly from its middle
  const target = document.querySelector('.hotspot[data-action="nextTrack"]')?.getBoundingClientRect();
  const endX = target ? target.left + target.width / 2 : window.innerWidth / 2;
  const endY = target ? target.top + target.height / 2 : window.innerHeight / 2;
  const dx = endX - (start.left + start.width / 2);
  const dy = endY - (start.top + start.height / 2);
  const scale = 64 / start.width;
  const disc = document.createElement('div');
  disc.className = 'cdc-disc cdc-fly';
  disc.style.setProperty('--face', face);
  Object.assign(disc.style, { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px` });
  document.body.appendChild(disc);
  const flight = disc.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 90}px) scale(${(1 + scale) / 2}) rotate(200deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(360deg)`, opacity: 0 },
    ],
    { duration: 750, easing: 'cubic-bezier(.3, .7, .3, 1)' },
  );
  flight.onfinish = () => disc.remove();
  flight.oncancel = () => disc.remove();
}

export default function CdRow({ source, cdCode, player, loading, error, onChooseSource, onChooseCd, onEject, onRetry }) {
  const [links, setLinks] = useState(getMyLinks); // links pasted earlier, kept in this browser
  const [pinned, setPinned] = useState(false); // a tap on the tag keeps the tower lifted (for screens without a mouse)
  const [hovered, setHovered] = useState(null); // { item, top }: the CD that is pulled out, and where its front is shown
  const wrapRef = useRef(null);
    const [studio, setStudio] = useState(null); // the studio CDs from the API; null = still loading
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [slip, setSlip] = useState(false); // the paper slip for adding music is shown
  const [wall, setWall] = useState('closed'); // the wide shelf: 'closed', 'open', or 'closing' while it slides away
  const [aim, setAim] = useState(null); // the CD pointed at on the wide shelf
  const [perRow, setPerRow] = useState(slotsPerRow);

  useEffect(() => {
    let cancelled = false;
    setFailure('');
    getCds().then((list) => { if (!cancelled) setStudio(list); }).catch((err) => { if (!cancelled) { setStudio([]); setFailure(err.message); } });
    return () => { cancelled = true; };
  }, [attempt]);

  // Escape closes the slip or the list of tracks. It is caught before the room sees it, because the room uses Escape to close the hologram.
  useEffect(() => {
    if (!slip && !tracksOpen && wall !== 'open') return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setSlip(false);
      setTracksOpen(false);
      if (wall === 'open') closeWall();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [slip, tracksOpen, wall]);

  // The wide shelf is as wide as the window allows, so the planks are filled again when the window changes size.
  useEffect(() => {
    const onResize = () => setPerRow(slotsPerRow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function openWall() {
    setHovered(null);
    setSlip(false);
    setTracksOpen(false);
    setAim(null);
    setWall('open');
  }
  // It slides away first and is removed when that is done.
  function closeWall(quick) {
    setAim(null);
    if (quick || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setWall('closed'); return; }
    setWall('closing');
    setTimeout(() => setWall((now) => (now === 'closing' ? 'closed' : now)), 260);
  }

  // Every CD in one list: ours, then the online playlists, then the ones this browser made. The number on a spine is its place.
  const [mine, setMine] = useState(getMyCds);
  useEffect(() => { setMine(getMyCds()); }, []); // read again when the tower is drawn, so a CD made a moment ago is there
  const items = useMemo(() => {
    const own = (studio || []).map((cd) => ({ kind: 'studio', key: cd.code, title: cd.title, sub: `Studio · ${cd.tracks?.length ?? 0} tracks` }));
    const online = DISCOVERY_PLAYLISTS.map((p) => ({ kind: 'soundcloud', key: p.url, title: p.title, sub: 'SoundCloud playlist' }));
    const made = mine.map((cd) => ({ kind: 'mine', key: cd.code, title: cd.title, sub: 'My CD' }));
    const known = new Set(online.map((item) => item.key));
    // pasted links stay on the shelf; a link that is playing but not saved yet (a shared room) is shown too
    const saved = links.filter((link) => !known.has(link.url)).map((link) => ({ kind: 'link', key: link.url, provider: link.provider, title: linkTitle(link), sub: `${providerName(link.provider)} link`, saved: true }));
    const playing = source && !known.has(source.url) && !saved.some((item) => item.key === source.url)
      ? [{ kind: 'link', key: source.url, provider: source.provider, title: linkTitle(source), sub: `${providerName(source.provider)} link`, saved: false }]
      : [];
    return [...own, ...online, ...made, ...saved, ...playing].map((item, index) => ({ ...item, number: index + 1, look: cdLook(item.key, item.title) }));
  }, [studio, mine, links, source]);
  // A link that arrives another way (a shared room) is kept as well. Only a change of the link counts, so "Forget" sticks.
  const sourceUrl = source?.url;
  const sourceProvider = source?.provider;
  useEffect(() => {
    if (sourceUrl && !DISCOVERY_PLAYLISTS.some((p) => p.url === sourceUrl)) setLinks(rememberLink({ provider: sourceProvider, url: sourceUrl }));
  }, [sourceUrl, sourceProvider]);

  const current = items.find((item) => (item.kind === 'soundcloud' || item.kind === 'link' ? source?.url === item.key : !source && cdCode === item.key));
  const isPlaying = (item) => (item.kind === 'soundcloud' || item.kind === 'link' ? source?.url === item.key : !source && cdCode === item.key);
  const loaded = Boolean(source || cdCode);

  function pick(item, discElement) {
    flyDisc(discElement, item.look.face);
    if (item.kind === 'soundcloud') onChooseSource({ provider: 'soundcloud', url: item.key });
    else if (item.kind === 'link') onChooseSource({ provider: item.provider, url: item.key });
    else onChooseCd(item.key);
    setHovered(null);
    if (wall !== 'closed') closeWall(true);
  }

  async function submit(event) {
    event.preventDefault();
    const text = link.trim();
    if (!text) return;
    setBusy(true);
    setLinkError('');
    try {
      if (!isLink(text)) onChooseCd(text); // not a link: it is the code of a CD
      else {
        const host = (() => { try { return new URL(text).hostname; } catch { return ''; } })();
        const chosen = ['on.soundcloud.com', 'spotify.link'].includes(host) ? await resolveMusicLink(text) : parseMusicSource(text);
        setLinks(rememberLink(chosen)); // the link stays on the shelf, so it can be played again later
        onChooseSource(chosen);
      }
      setLink('');
      setSlip(false);
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const tracks = source?.provider === 'soundcloud' ? player?.cd?.tracks || [] : [];

  const nowTitle = current?.title || (source ? 'Online music' : cdCode ? 'Loading…' : 'Nothing yet');
  const nowFace = current ? current.look.face : source || cdCode ? cdLook(source ? source.url : cdCode).face : null;

  // Pointing at a case slides it out and shows its front next to the tower. The front sits level with the case.
  // The tower is drawn bigger on big screens (CSS zoom), so the distances on the screen are divided by that zoom to get the
  // tower's own pixels. The front is kept inside the window: for a CD low in the tower it moves up instead of being cut off.
  function point(item, button) {
    const body = wrapRef.current;
    if (!body) { setHovered({ item, top: 0 }); return; }
    const wrap = body.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    const zoom = body.offsetWidth && wrap.width ? wrap.width / body.offsetWidth : 1;
    const edge = 10;
    const wanted = box.top + box.height / 2 - (PULL_FRONT / 2) * zoom;
    const lowest = Math.max(edge, window.innerHeight - edge - PULL_TOTAL * zoom);
    const screenTop = Math.min(Math.max(wanted, edge), lowest);
    setHovered({ item, top: (screenTop - wrap.top) / zoom });
  }

  const caseFor = (item) => {
    const inPlayer = isPlaying(item);
    return (
      <button
        type="button"
        role="listitem"
        key={`${item.kind}:${item.key}`}
        className={`cdc-cd cdc-kind-${item.kind}${inPlayer ? ' cdc-empty' : ''}`}
        style={{ ...lookVars(item.look), '--n': item.number }}
        aria-label={`${item.title}, ${item.sub}`}
        disabled={inPlayer}
        onMouseEnter={(event) => point(item, event.currentTarget)}
        onFocus={(event) => point(item, event.currentTarget)}
        onMouseLeave={() => setHovered(null)}
        onBlur={() => setHovered(null)}
        onClick={(event) => pick(item, wrapRef.current?.querySelector('.cdc-face') || event.currentTarget)}
      >
        <span className="cdc-spine">
          <span className="cdc-paper">
            <span className="cdc-ttl">{item.title}</span>
            <b className="cdc-num">{SOURCE_MARK[item.kind]} {String(item.number).padStart(2, '0')}</b>
          </span>
        </span>
      </button>
    );
  };

  const shown = aim || current;
  const slots = [...items, { add: true, key: 'add', number: items.length + 1 }];
  const columns = Math.min(Math.max(slots.length, 6), perRow);
  const rows = [];
  for (let i = 0; i < slots.length; i += columns) rows.push(slots.slice(i, i + columns));

  return (
    <>
    <section className={`cdc side-fade${pinned || slip || tracksOpen || loading || error || failure ? ' lifted' : ''}${player?.playing ? ' cdc-playing' : ''}`} aria-label="CD shelf">
      {loading && <p className="cdc-note" role="status">Loading the CD…</p>}
      {error && (
        <p className="cdc-note cdc-error" role="alert">
          {error}
          <button type="button" className="cdc-chip" onClick={onRetry}>Retry CD</button>
          <button type="button" className="cdc-chip" onClick={onEject}>Eject CD</button>
        </p>
      )}
      {failure && <p className="cdc-note cdc-error" role="alert">{failure} <button type="button" className="cdc-chip" onClick={() => setAttempt((n) => n + 1)}>Retry CDs</button></p>}
      {tracksOpen && tracks.length > 0 && <TrackList tracks={tracks} player={player} />}
      {slip && (
        <form className="cdc-slip" onSubmit={submit}>
          <b>Add your own music</b>
          <div className="cdc-slip-row">
            <label htmlFor="cdc-link">Paste a music link or CD code</label>
            <input id="cdc-link" type="text" maxLength={2048} value={link} onChange={(event) => setLink(event.target.value)} placeholder="SoundCloud, Spotify, YouTube link or CD code" autoFocus />
            <button type="submit" className="cdc-brass" disabled={!link.trim() || busy}>{busy ? 'Loading…' : 'Load'}</button>
          </div>
          {linkError && <p className="cdc-board-note" role="alert">{linkError}</p>}
          <small>Or <Link to="/music" aria-label="Make a CD">make a CD</Link> from our tracks and get a share code.</small>
        </form>
      )}

      {(
        <div className="cdc-body" ref={wrapRef}>
          <div className="cdc-tag">
            <span className="cdc-mini" style={nowFace ? { '--face': nowFace } : undefined} aria-hidden="true" />
            <span className="cdc-now" onClick={() => setPinned(!pinned)}><small>In the player</small><b key={nowTitle}>{nowTitle}</b></span>
            <span className="cdc-eq" aria-hidden="true"><i /><i /><i /></span>
            <button type="button" className="cdc-brass cdc-all" aria-label="Open the wide shelf with all CDs" onClick={openWall}>All CDs</button>
            {tracks.length > 0 && <button type="button" className="cdc-brass" aria-pressed={tracksOpen} onClick={() => { setTracksOpen(!tracksOpen); setSlip(false); }}>Tracks</button>}
            {current?.saved && <button type="button" className="cdc-brass" aria-label="Forget this link" onClick={() => setLinks(forgetLink(current.key))}>Forget</button>}
            {(source || cdCode) && <button type="button" className="cdc-brass" aria-label="Take the CD out of the player" onClick={onEject}>Eject</button>}
          </div>
          <div className="cdc-tower">
            <div className="cdc-cap" />
            <div className="cdc-stack" role="list" aria-label="CDs">
              {items.map(caseFor)}
              <button type="button" className="cdc-cd cdc-add" aria-label="Add your own music" aria-expanded={slip} onClick={() => { setSlip(!slip); setTracksOpen(false); }}>
                <span className="cdc-spine"><span className="cdc-paper"><span className="cdc-ttl">+ Add your own music</span></span></span>
              </button>
            </div>
            <div className="cdc-foot" />
          </div>
          {hovered && (
            <div className="cdc-pull" style={{ top: hovered.top, ...lookVars(hovered.item.look) }} aria-hidden="true">
              <span className="cdc-front">
                <span className="cdc-disc cdc-face" />
                <span className="cdc-name">{hovered.item.title}</span>
              </span>
              <span className="cdc-psub">{hovered.item.sub}</span>
            </div>
          )}
        </div>
      )}
    </section>
    {wall !== 'closed' && (
      <div className={`cdw${wall === 'closing' ? ' cdw-out' : ''}`} role="dialog" aria-modal="true" aria-label="All CDs" onMouseDown={(event) => { if (event.target === event.currentTarget) closeWall(); }}>
        <div className="cdw-panel" style={{ '--cols': columns }}>
          <header className="cdw-head">
            <b>The CD shelf</b>
            <small>{items.length} {items.length === 1 ? 'CD' : 'CDs'}</small>
            <button type="button" className="cdc-brass" onClick={() => closeWall()} autoFocus>Close</button>
          </header>
          <div className="cdw-rows">
            {rows.map((row, r) => (
              <div className="cdw-row" key={r}>
                {row.map((item) => (item.add ? (
                  <button type="button" key="add" className="cdw-cd cdw-add" style={{ '--n': item.number, '--w': '30px' }} aria-label="Add your own music" onClick={() => { closeWall(true); setSlip(true); setTracksOpen(false); }}>
                    <span className="cdw-body"><span className="cdw-flip"><span className="cdc-spine"><span className="cdc-paper"><span className="cdc-ttl">+ Add music</span></span></span></span></span>
                  </button>
                ) : (
                  <button
                    type="button"
                    key={`${item.kind}:${item.key}`}
                    className={`cdw-cd cdc-kind-${item.kind}${isPlaying(item) ? ' cdc-empty' : ''}`}
                    style={{ ...lookVars(item.look), '--n': item.number }}
                    aria-label={`${item.title}, ${item.sub}`}
                    disabled={isPlaying(item)}
                    onMouseEnter={() => setAim(item)}
                    onFocus={() => setAim(item)}
                    onMouseLeave={() => setAim(null)}
                    onBlur={() => setAim(null)}
                    onClick={(event) => pick(item, event.currentTarget)}
                  >
                    <span className="cdw-body">
                      <span className="cdw-flip">
                        <span className="cdc-spine">
                          <span className="cdc-paper">
                            <span className="cdc-ttl">{item.title}</span>
                            <b className="cdc-num">{SOURCE_MARK[item.kind]} {String(item.number).padStart(2, '0')}</b>
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                )))}
              </div>
            ))}
          </div>
          <p className="cdw-label" style={shown ? lookVars(shown.look) : undefined} aria-live="polite">
            <span className="cdc-disc cdw-disc" aria-hidden="true" />
            <span className="cdw-name" key={shown ? shown.key : 'none'}>
              <b>{shown ? shown.title : loaded ? 'Online music' : 'Pick a CD'}</b>
              <small>{aim ? aim.sub : shown ? `In the player · ${shown.sub}` : 'Point at a CD, click to play it'}</small>
            </span>
          </p>
        </div>
      </div>
    )}
    </>
  );
}

// The tracks of the playlist that is playing, with a search box. A track is played by clicking it.
function TrackList({ tracks, player }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(30);
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: 'nearest' }); }, []);
  const matching = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => `${track.title} ${track.artist || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="cdc-tracks" ref={ref}>
      <label>Search this playlist<input value={search} onChange={(event) => { setSearch(event.target.value); setLimit(30); }} /></label>
      <p>{tracks.length} tracks from SoundCloud</p>
      <ol className="online-track-list">
        {matching.slice(0, limit).map(({ track, index }) => (
          <li key={track.id}>
            <button type="button" data-track-id={track.id} aria-label={`Play ${track.title}`} aria-pressed={player.index === index} onClick={() => player.skip(index)}>
              <span>{track.title}<small>{track.pending ? 'Title loads when selected' : track.artist}</small></span>
              <small>{track.duration ? formatTime(track.duration) : ''}</small>
            </button>
          </li>
        ))}
      </ol>
      {matching.length > limit && <button className="cdc-chip" type="button" onClick={() => setLimit((value) => value + 30)}>Show more tracks</button>}
      {!matching.length && <p>No matching tracks in this playlist.</p>}
    </div>
  );
}
