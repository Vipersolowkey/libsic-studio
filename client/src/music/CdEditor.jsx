// Part of: Music: the CD workshop form (make and edit a CD).
// Uses: CdPreview.jsx, HoloPlayer.jsx, api.js, cdLook.js, musicSource.js, myLinks.js.
// Used by: CdPage.jsx, MusicPage.jsx.
import { useEffect, useMemo, useState } from 'react';
import { getTracks, resolveMusicLink } from '../api.js';
import { formatTime } from '../room/HoloPlayer.jsx';
import CdPreview, { letteringStyle } from './CdPreview.jsx';
import { COVER_NAMES, DISC_NAMES, FONT_NAMES, HUES, cdLook, defaultChoice, randomChoice } from './cdLook.js';
import { linkTitle, providerName } from './myLinks.js';
import { parseMusicSource } from './musicSource.js';

const MAX_LINKS = 12; // keep equal to the API (routes/cds.js)
const MAX_TRACKS = 30;
const MARK = { youtube: 'YT', soundcloud: 'SC', spotify: 'SP', audio: '♪' };
// Short links (on.soundcloud.com, spotify.link) cannot be read in the browser: the API resolves them.
const SHORT_HOSTS = ['on.soundcloud.com', 'spotify.link'];
const hostOf = (text) => { try { return new URL(text).hostname; } catch { return ''; } };

// The CD workshop form: makes a new CD, or edits one when `cd` is passed.
// A CD holds online links OR our own tracks, never both (the "kind" switch; the API rejects a mix).
// onSave({ title, trackIds, links, look }) gets what the visitor made (the unused list is empty). `children` shows under the preview.
// Limits match the API: 12 links, 30 tracks, name up to 60 characters.
export default function CdEditor({ cd, busy, onSave, children }) {
  // ===== STATE: name, links or tracks (only one kind), and the look (colour, cover, disc, lettering) =====
  const [title, setTitle] = useState(cd?.title ?? '');
  const [kind, setKind] = useState(cd && !cd.links?.length && cd.trackIds?.length ? 'tracks' : 'links');
  const [links, setLinks] = useState(cd?.links ?? []);
  const [draft, setDraft] = useState('');
  const [checking, setChecking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [ids, setIds] = useState(cd?.trackIds ?? []);
  const [tracks, setTracks] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  // New CD: random look. Old CD: keeps its look (older CDs without one get a default made from the code), so editing never repaints it.
  const [choice, setChoice] = useState(() => cd?.look ?? (cd ? defaultChoice(cd.code) : randomChoice()));
  const key = cd?.code ?? 'new-cd';
  const look = useMemo(() => cdLook(key, title, choice), [key, title, choice]);

  useEffect(() => {
    if (kind !== 'tracks' || tracks) return undefined;
    let cancelled = false;
    setError('');
    getTracks().then((list) => { if (!cancelled) setTracks(list); }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [kind, attempt, tracks]);

  // ===== ACTIONS: change the look, reorder a list, add pasted links =====
  const paint = (change) => setChoice((old) => ({ ...old, ...change }));
  const swap = (list, set, index, offset) => {
    const next = [...list];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    set(next);
  };

  // Several links can be pasted at once (spaces, commas or new lines). Good ones are added; failed ones stay in the box with the reason.
  async function addLinks(event) {
    event.preventDefault();
    const words = draft.split(/[\s,]+/).filter(Boolean);
    if (!words.length) return;
    setChecking(true);
    setLinkError('');
    const next = [...links];
    const failed = [];
    const reasons = [];
    for (const word of words) {
      try {
        if (next.length >= MAX_LINKS) throw new Error(`A CD holds up to ${MAX_LINKS} links`);
        const source = SHORT_HOSTS.includes(hostOf(word)) ? await resolveMusicLink(word) : parseMusicSource(word);
        if (next.some((l) => l.url === source.url)) throw new Error('This link is already on the CD');
        next.push(source);
      } catch (err) {
        failed.push(word);
        reasons.push(err.message);
      }
    }
    setLinks(next);
    setDraft(failed.join('\n'));
    setLinkError([...new Set(reasons)].join(' '));
    setChecking(false);
  }

  // Save is allowed only with a name and at least one item (and the track list loaded, for tracks).
  const ready = title.trim() && (kind === 'links' ? links.length > 0 : ids.length > 0 && tracks);
  function submit(event) {
    event.preventDefault();
    onSave({
      title: title.trim(),
      trackIds: kind === 'tracks' ? ids : [],
      links: kind === 'links' ? links.map((l) => l.url) : [],
      look: choice,
    });
  }
  const trackName = (id) => tracks?.find((t) => t.id === id)?.title ?? id;
  const count = kind === 'links' ? links.length : ids.length;

  return (
    // ===== THE FORM (CSS: workshop.css .mk-*). Left: name + step 1 (what is on it) + step 2 (look). Right: live CD preview + save button =====
    <form className="mk-form" onSubmit={submit}>
      <div className="mk-sheet">
        <label className="mk-field">
          <span className="mk-hand">CD name</span>
          <input required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} placeholder="Rainy sunday, slow focus…" />
        </label>

        {/* STEP 1: what is on the CD. Online links (API resolves short links) or our tracks (api.js getTracks) */}
        <fieldset className="mk-block" disabled={busy}>
          <legend><span className="mk-step">1</span> What is on it</legend>
          <div className="mk-switch" role="tablist" aria-label="Where the music comes from">
            <button type="button" role="tab" aria-selected={kind === 'links'} onClick={() => setKind('links')}>Online links</button>
            <button type="button" role="tab" aria-selected={kind === 'tracks'} onClick={() => setKind('tracks')}>Our tracks</button>
          </div>

          {kind === 'links' ? (
            <div className="mk-links">
              <label className="mk-field">
                <span className="mk-note">Paste YouTube, SoundCloud or Spotify links, or a link to an audio file. One or many, they play in this order.</span>
                <textarea rows={2} aria-label="Music links" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" maxLength={MAX_LINKS * 2100} />
              </label>
              <button type="button" className="mk-brass" disabled={!draft.trim() || checking || links.length >= MAX_LINKS} onClick={addLinks}>{checking ? 'Checking…' : 'Add to the CD'}</button>
              {linkError && <p role="alert" className="mk-warn">{linkError}</p>}
              {!links.length && !linkError && <p className="mk-empty">No links yet. Add the first one above.</p>}
              <ol className="mk-playlist" aria-label="Links on the CD">
                {links.map((link, index) => (
                  <li key={link.url}>
                    <span className={`mk-mark mk-mark-${link.provider}`} aria-hidden="true">{MARK[link.provider]}</span>
                    <span className="mk-entry"><b>{linkTitle(link)}</b><small>{providerName(link.provider)} · {link.url.replace(/^https:\/\/(www\.)?/, '')}</small></span>
                    <span className="mk-tools">
                      <button type="button" aria-label={`Move link ${index + 1} up`} disabled={index === 0} onClick={() => swap(links, setLinks, index, -1)}>↑</button>
                      <button type="button" aria-label={`Move link ${index + 1} down`} disabled={index === links.length - 1} onClick={() => swap(links, setLinks, index, 1)}>↓</button>
                      <button type="button" aria-label={`Remove link ${index + 1}`} onClick={() => setLinks(links.filter((l) => l.url !== link.url))}>✕</button>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="mk-tracks">
              <span className="mk-note">Quiet tracks from our own library ({ids.length}/{MAX_TRACKS}).</span>
              {!tracks && !error && <p role="status">Loading tracks…</p>}
              {error && <p role="alert" className="mk-warn">{error} <button type="button" className="mk-brass" onClick={() => { setError(''); setAttempt((n) => n + 1); }}>Retry tracks</button></p>}
              <div className="mk-picker" role="group" aria-label="Choose tracks">
                {tracks?.map((track) => (
                  <label key={track.id}>
                    <input type="checkbox" checked={ids.includes(track.id)} onChange={(e) => setIds(e.target.checked ? [...ids, track.id] : ids.filter((id) => id !== track.id))} disabled={!ids.includes(track.id) && ids.length >= MAX_TRACKS} />
                    <span>{track.title}<small>{track.artist}</small></span>
                    <span className="mk-time">{formatTime(track.duration)}</span>
                  </label>
                ))}
              </div>
              <h3 className="mk-hand">Playback order</h3>
              {!ids.length && <p className="mk-empty">Choose at least one track above.</p>}
              <ol className="mk-playlist">
                {ids.map((id, index) => (
                  <li key={id}>
                    <span className="mk-mark" aria-hidden="true">{index + 1}</span>
                    <span className="mk-entry"><b>{trackName(id)}</b></span>
                    <span className="mk-tools">
                      <button type="button" aria-label={`Move ${id} up`} disabled={index === 0} onClick={() => swap(ids, setIds, index, -1)}>↑</button>
                      <button type="button" aria-label={`Move ${id} down`} disabled={index === ids.length - 1} onClick={() => swap(ids, setIds, index, 1)}>↓</button>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </fieldset>

        {/* STEP 2: the look; music/cdLook.js turns the choice into the picture shown in the preview */}
        <fieldset className="mk-block" disabled={busy}>
          <legend><span className="mk-step">2</span> How it looks</legend>
          <div className="mk-look">
            <div className="mk-row">
              <span className="mk-hand">Colour</span>
              <div className="mk-swatches" role="radiogroup" aria-label="Colour">
                {HUES.map((hue) => (
                  <button type="button" key={hue} role="radio" aria-checked={choice.hue === hue} aria-label={`Colour ${hue}`} style={{ '--c': `hsl(${hue} 52% 42%)`, '--c2': `hsl(${hue} 45% 14%)` }} onClick={() => paint({ hue })} />
                ))}
                <label className="mk-hue">
                  <span className="mk-sr">Pick any colour</span>
                  <input type="range" min="0" max="359" value={choice.hue} onChange={(e) => paint({ hue: Number(e.target.value) })} />
                </label>
              </div>
            </div>
            <Options label="Cover" names={COVER_NAMES} value={choice.cover} onPick={(cover) => paint({ cover })} sample={(i) => <i className="mk-mini" style={{ background: cdLook(key, '', { ...choice, cover: i }).art }} />} />
            <Options label="Disc" names={DISC_NAMES} value={choice.disc} onPick={(disc) => paint({ disc })} sample={(i) => <i className="mk-mini round" style={{ background: cdLook(key, '', { ...choice, disc: i }).face }} />} />
            <Options label="Lettering" names={FONT_NAMES} value={choice.font} onPick={(font) => paint({ font })} sample={(i) => <i className="mk-aa" style={letteringStyle(cdLook(key, '', { ...choice, font: i }))}>Aa</i>} />
            <button type="button" className="mk-link" onClick={() => setChoice(randomChoice())}>Surprise me</button>
          </div>
        </fieldset>
      </div>

      {/* RIGHT: live preview (CdPreview.jsx), item count and the save button (calls onSave: MusicPage creates, CdPage updates) */}
      <aside className="mk-stand">
        <CdPreview look={look} title={title} spinning />
        <p className="mk-count">{count ? `${count} ${kind === 'links' ? (count === 1 ? 'link' : 'links') : (count === 1 ? 'track' : 'tracks')} on the CD` : 'Nothing on the CD yet'}</p>
        <button className="mk-press" disabled={busy || !ready}>{busy ? 'Saving…' : cd ? 'Save CD changes' : 'Create CD'}</button>
        {!ready && !busy && <p className="mk-hint">{!title.trim() ? 'Give your CD a name' : kind === 'links' ? 'Add at least one link' : 'Choose at least one track'} to press it.</p>}
        {children}
      </aside>
    </form>
  );
}

// A row of small pictures to pick from (cover, disc print or lettering). `sample(i)` draws option i.
function Options({ label, names, value, onPick, sample }) {
  return (
    <div className="mk-row">
      <span className="mk-hand">{label}</span>
      <div className="mk-options" role="radiogroup" aria-label={label}>
        {names.map((name, i) => (
          <button type="button" key={name} role="radio" aria-checked={value === i} aria-label={`${label}: ${name}`} onClick={() => onPick(i)}>
            {sample(i)}
            <small>{name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
