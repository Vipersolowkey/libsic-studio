// Part of: Accounts: offers to move rooms and CDs saved in this browser (as a guest) onto the signed-in account.
// Uses: AuthContext.jsx, api.js, myRooms.js, music/myCds.js, account.css.
// Used by: HomePage.jsx.
import { useEffect, useState } from 'react';
import { claimMine, getAccountCds, getAccountRooms } from '../api.js';
import { getMyCds } from '../music/myCds.js';
import { getMyRooms } from '../myRooms.js';
import { useAuth } from './AuthContext.jsx';
import './account.css';

const dismissedKey = (username) => `libsic:claimDismissed:${username}`;
const wasDismissed = (username) => {
  try {
    return window.localStorage.getItem(dismissedKey(username)) === '1';
  } catch {
    return false;
  }
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Each guest room or CD needs its edit key to be claimed, so only things this browser really made are offered.
// Nothing happens until the person says yes. "Not now" is remembered for that username.
export default function ClaimPrompt({ onClaimed }) {
  const { user } = useAuth();
  const [found, setFound] = useState(null); // { rooms: [{code, editKey}], cds: [...] }
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const who = user?.username;
  useEffect(() => {
    if (!who || wasDismissed(who)) return undefined;
    let cancelled = false;
    Promise.all([getAccountRooms(), getAccountCds()])
      .then(([rooms, cds]) => {
        if (cancelled) return;
        const haveRoom = new Set(rooms.map((r) => r.code));
        const haveCd = new Set(cds.map((c) => c.code));
        const mine = {
          rooms: getMyRooms().filter((r) => r.editKey && !haveRoom.has(r.code)).map((r) => ({ code: r.code, editKey: r.editKey })),
          cds: getMyCds().filter((c) => !haveCd.has(c.code)).map((c) => ({ code: c.code, editKey: c.editKey })),
        };
        setFound(mine.rooms.length + mine.cds.length > 0 ? mine : null);
      })
      .catch(() => {}); // no answer from the server: no prompt
    return () => {
      cancelled = true;
    };
  }, [who]);

  if (!who || (!found && !done)) return null;

  if (done) {
    return (
      <p className="intro-claim" role="status">
        {done} <button type="button" className="link-button" onClick={() => setDone('')}>OK</button>
      </p>
    );
  }

  async function add() {
    setBusy(true);
    try {
      const { claimed, skipped } = await claimMine(found.rooms, found.cds);
      const rooms = claimed.filter((c) => c.type === 'room').length;
      const cds = claimed.filter((c) => c.type === 'cd').length;
      setFound(null);
      setDone(`Added ${plural(rooms, 'room')} and ${plural(cds, 'CD')} to your account.${skipped.length ? ` ${plural(skipped.length, 'item')} could not be added.` : ''}`);
      onClaimed?.();
    } catch (err) {
      setDone(`Could not add them: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }
  const later = () => {
    try {
      window.localStorage.setItem(dismissedKey(who), '1');
    } catch {
      /* the question may come back next time */
    }
    setFound(null);
  };

  return (
    <div className="intro-claim" role="region" aria-label="Add rooms to your account">
      <p>
        We found {plural(found.rooms.length, 'room')} and {plural(found.cds.length, 'CD')} saved in this browser. Add them to your account?
      </p>
      <div>
        <button type="button" className="account-button" disabled={busy} onClick={add}>{busy ? 'Adding…' : 'Add them'}</button>
        <button type="button" className="account-button quiet" disabled={busy} onClick={later}>Not now</button>
      </div>
    </div>
  );
}
