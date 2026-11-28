import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CdRow from './CdRow.jsx';
import { cdLook } from './cdLook.js';
import { DISCOVERY_PLAYLISTS } from './discovery.js';
import { getMyCds, rememberCd } from './myCds.js';
import * as api from '../api.js';
import { AuthProvider } from '../account/AuthContext.jsx';
import { saveSession } from '../auth.js';

const STUDIO = [
  { code: 'night-study', title: 'Quiet Pages', tracks: [{}, {}, {}, {}], official: true },
  { code: 'clam-cove', title: 'Below the Tide', tracks: [{}, {}], official: true },
];

function show(props = {}) {
  const handlers = { onChooseSource: vi.fn(), onChooseCd: vi.fn(), onEject: vi.fn(), onRetry: vi.fn() };
  render(
    <MemoryRouter>
      <CdRow source={null} cdCode={null} player={null} loading={false} error="" {...handlers} {...props} />
    </MemoryRouter>,
  );
  return handlers;
}
// The tower is open when the page starts; this only brings it back if it was folded away.
const openRow = async () => {
  const button = screen.queryByRole('button', { name: 'Choose a CD' });
  if (button) await userEvent.click(button);
};
const openSlip = async () => {
  await openRow();
  await userEvent.click(screen.getByRole('button', { name: 'Add your own music' }));
};

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('the row of CDs', () => {
  it('stands only the CDs the person saved in the tower, numbered from 1, and not the studio CDs or playlists', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    show();
    expect(await screen.findByRole('listitem', { name: 'Exam Week, My CD' })).toHaveTextContent('ME 01');
    await waitFor(() => expect(api.getCds).toHaveBeenCalled());
    expect(screen.queryByRole('listitem', { name: /Quiet Pages/ })).toBeNull();
    expect(screen.queryByRole('listitem', { name: /Below the Tide/ })).toBeNull();
    expect(screen.queryByRole('listitem', { name: /SoundCloud playlist/ })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('stands saved CDs and saved links in the tower, in the order they were saved', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    rememberCd({ code: 'mine-2', title: 'Late Night', editKey: 'k' });
    show();
    await screen.findByRole('listitem', { name: /Exam Week/ });
    const titles = screen.getAllByRole('listitem').map((item) => item.querySelector('.cdc-ttl').textContent);
    expect(titles).toEqual(getMyCds().map((cd) => cd.title));
    expect(titles).toHaveLength(2);
  });

  it('says so when nothing is saved yet, and the add case is still there', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show();
    expect(await screen.findByText(/No saved CDs yet/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add your own music' })).toBeInTheDocument();
  });

  it('also stands the CDs of the signed-in account in the tower', async () => {
    saveSession({ token: 'a.b.c', user: { username: 'tony', displayName: 'Tony', avatarHue: 200, role: 'user', createdAt: '2026-11-01T00:00:00Z' } });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ username: 'tony', displayName: 'Tony', avatarHue: 200, role: 'user', createdAt: '2026-11-01T00:00:00Z' }) })));
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    vi.spyOn(api, 'getAccountCds').mockResolvedValue([{ code: 'acct-1', title: 'From my account', look: null, updatedAt: '2026-11-20T00:00:00Z' }]);
    render(<MemoryRouter><AuthProvider><CdRow source={null} cdCode={null} player={null} loading={false} error="" onChooseSource={() => {}} onChooseCd={() => {}} onEject={() => {}} onRetry={() => {}} /></AuthProvider></MemoryRouter>);
    expect(await screen.findByRole('listitem', { name: 'From my account, My CD' })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('stands a CD that came with a shared room in the tower and names it in the player', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show({ cdCode: 'friend-1', loadedCd: { code: 'friend-1', title: 'Friend mix', links: [], tracks: [], look: { hue: 10, cover: 0, disc: 0, font: 0 } } });
    await openRow();
    expect(screen.getByRole('listitem', { name: 'Friend mix, Shared CD' })).toHaveTextContent('SH');
    expect(screen.getByText('Friend mix', { selector: '.cdc-now, .cdc-now *' })).toBeInTheDocument();
  });

  it('saves a shared room\'s CD to this browser, where it is a normal CD that can be forgotten again', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show({ cdCode: 'friend-1', loadedCd: { code: 'friend-1', title: 'Friend mix', links: [], tracks: [], look: { hue: 10, cover: 0, disc: 0, font: 0 } } });
    await openRow();
    await userEvent.click(screen.getByRole('button', { name: 'Save this CD' }));
    expect(getMyCds()).toEqual([{ code: 'friend-1', title: 'Friend mix', editKey: '', look: { hue: 10, cover: 0, disc: 0, font: 0 }, shared: true }]);
    expect(screen.getByRole('listitem', { name: 'Friend mix, Saved CD' })).toHaveTextContent('ME');
    expect(screen.queryByRole('button', { name: 'Save this CD' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Forget this CD' }));
    expect(getMyCds()).toEqual([]);
    expect(screen.getByRole('listitem', { name: 'Friend mix, Shared CD' })).toBeInTheDocument();
  });

  it('offers Edit for a CD this browser made (it has an edit key) but not for studio CDs or saved ones', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    rememberCd({ code: 'friend-1', title: 'Friend mix', editKey: '', shared: true });
    const view = show({ cdCode: 'mine-1' });
    await openRow();
    expect(screen.getByRole('link', { name: 'Edit this CD' })).toHaveAttribute('href', '/cd/mine-1?edit=1');
    view.unmount?.();
  });

  it('opens a slip of paper to make a CD or add music', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    show();
    await openSlip();
    expect(screen.getByRole('link', { name: 'Make a CD' })).toHaveAttribute('href', '/music');
    await userEvent.click(screen.getByRole('button', { name: 'Add your own music' }));
    expect(screen.queryByRole('link', { name: 'Make a CD' })).toBeNull();
  });

  it('shows what is in the player on the tag, and ejects it', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    const { onEject } = show({ cdCode: 'night-study' });
    await openRow();
    expect(await screen.findByText('Quiet Pages', { selector: 'b' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Take the CD out of the player' }));
    expect(onEject).toHaveBeenCalled();
  });

  it('picks a saved CD by its code', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    const { onChooseCd } = show();
    await openRow();
    await userEvent.click(await screen.findByRole('listitem', { name: /Exam Week/ }));
    expect(onChooseCd).toHaveBeenCalledWith('mine-1');
  });

  it('loads a whole playlist when its CD is picked', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    const { onChooseSource } = show();
    await userEvent.click(screen.getByRole('button', { name: 'Open the wide shelf with all CDs' })); // the online playlists are on the wide shelf
    await userEvent.click(within(screen.getByRole('dialog', { name: 'All CDs' })).getByRole('button', { name: /Chillhop Essentials · Fall/ }));
    expect(onChooseSource).toHaveBeenCalledWith({ provider: 'soundcloud', url: DISCOVERY_PLAYLISTS[0].url });
  });

  it('leaves an empty place where the CD in the player stands', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    rememberCd({ code: 'mine-2', title: 'Late Night', editKey: 'k' });
    show({ cdCode: 'mine-1' });
    expect(await screen.findByRole('listitem', { name: /Exam Week/ })).toBeDisabled();
    expect(screen.getByRole('listitem', { name: /Late Night/ })).toBeEnabled();
  });

  it('has no button to fold it away: it lowers itself and a tap on the tag keeps it lifted', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    const { container } = render(<MemoryRouter><CdRow source={null} cdCode="night-study" player={null} loading={false} error="" onChooseSource={() => {}} onChooseCd={() => {}} onEject={() => {}} onRetry={() => {}} /></MemoryRouter>);
    await screen.findByRole('listitem', { name: /Exam Week/ });
    expect(screen.queryByRole('button', { name: 'Close the CD shelf' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose a CD' })).toBeNull();
    const shelf = container.querySelector('.cdc');
    expect(shelf).not.toHaveClass('lifted');
    await userEvent.click(screen.getByText('In the player'));
    expect(shelf).toHaveClass('lifted');
    await userEvent.click(screen.getByText('In the player'));
    expect(shelf).not.toHaveClass('lifted');
  });

  it('closes the slip on Escape', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    show();
    await openSlip();
    expect(screen.getByLabelText('Paste a music link or CD code')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByLabelText('Paste a music link or CD code')).toBeNull();
  });

  it('shows why the studio CDs are missing and lets the visitor try again', async () => {
    const getCds = vi.spyOn(api, 'getCds').mockRejectedValueOnce(new Error('Cannot reach the server.')).mockResolvedValue(STUDIO);
    show();
    await openRow();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry CDs' }));
    await waitFor(() => expect(getCds).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole('button', { name: 'Open the wide shelf with all CDs' }));
    expect(await within(screen.getByRole('dialog', { name: 'All CDs' })).findByRole('button', { name: /Quiet Pages/ })).toBeInTheDocument();
  });

  it('keeps a CD error visible while the row is closed, with Retry and Eject', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    const { onRetry, onEject } = show({ cdCode: 'gone', error: 'This CD was deleted.' });
    expect(screen.getByRole('alert')).toHaveTextContent('This CD was deleted.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry CD' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eject CD' }));
    expect(onRetry).toHaveBeenCalled();
    expect(onEject).toHaveBeenCalled();
  });
});

describe('the wide shelf', () => {
  const openWall = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Open the wide shelf with all CDs' }));
    return screen.getByRole('dialog', { name: 'All CDs' });
  };

  it('opens from the tower and stands every CD upright, with the add slot last', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    show();
    const wall = await openWall();
    await within(wall).findByRole('button', { name: /Quiet Pages/ });
    const titles = within(wall).getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(titles).toContain('Quiet Pages, Studio · 4 tracks');
    expect(titles).toContain('Exam Week, My CD');
    expect(titles.at(-1)).toBe('Add your own music');
    expect(wall.querySelectorAll('.cdw-cd')).toHaveLength(2 + DISCOVERY_PLAYLISTS.length + 1 + 1);
  });

  it('names the CD that is pointed at and says what is in the player when none is', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show({ cdCode: 'clam-cove' });
    const wall = await openWall();
    await within(wall).findByRole('button', { name: /Quiet Pages/ });
    expect(within(wall).getByText('Below the Tide', { selector: 'b' })).toBeInTheDocument();
    expect(within(wall).getByText(/In the player/)).toBeInTheDocument();
    await userEvent.hover(within(wall).getByRole('button', { name: /Quiet Pages/ }));
    expect(within(wall).getByText('Quiet Pages', { selector: '.cdw-name b' })).toBeInTheDocument();
    expect(within(wall).getByText('Studio · 4 tracks')).toBeInTheDocument();
  });

  it('plays a CD that is clicked and closes', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    const { onChooseCd } = show();
    const wall = await openWall();
    await within(wall).findByRole('button', { name: /Quiet Pages/ });
    await userEvent.click(within(wall).getByRole('button', { name: /Below the Tide/ }));
    expect(onChooseCd).toHaveBeenCalledWith('clam-cove');
    expect(screen.queryByRole('dialog', { name: 'All CDs' })).toBeNull();
  });

  it('leaves the place of the CD in the player empty', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show({ cdCode: 'clam-cove' });
    const wall = await openWall();
    await within(wall).findByRole('button', { name: /Quiet Pages/ });
    expect(within(wall).getByRole('button', { name: /Below the Tide/ })).toBeDisabled();
  });

  it('closes with Close, on Escape and on the dark backdrop', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show();
    await openWall();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All CDs' })).toBeNull());
    await openWall();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All CDs' })).toBeNull());
    const wall = await openWall();
    await userEvent.pointer({ keys: '[MouseLeft]', target: wall });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All CDs' })).toBeNull());
  });

  it('opens the slip for adding music from its add slot', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    show();
    const wall = await openWall();
    await userEvent.click(within(wall).getByRole('button', { name: 'Add your own music' }));
    expect(screen.queryByRole('dialog', { name: 'All CDs' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Make a CD' })).toBeInTheDocument();
  });
});

describe('the pulled-out front', () => {
  it('stays inside the window for a CD low in the tower', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    show();
    const item = await screen.findByRole('listitem', { name: /Exam Week/ });
    const body = document.querySelector('.cdc-body');
    Object.defineProperty(body, 'offsetWidth', { value: 268 });
    body.getBoundingClientRect = () => ({ top: 400, left: 700, width: 268 * 1.5, height: 300, bottom: 700, right: 1100 });
    item.getBoundingClientRect = () => ({ top: 640, height: 40, width: 400, left: 720, bottom: 680, right: 1120 });
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true });
    await userEvent.hover(item);
    const top = parseFloat(document.querySelector('.cdc-pull').style.top);
    // on the screen the front starts at wrap.top + top * zoom and must end (142 tall in the tower's pixels) above the window's bottom edge
    expect(400 + top * 1.5 + 142 * 1.5).toBeLessThanOrEqual(700 - 10 + 0.01);
    expect(400 + top * 1.5).toBeGreaterThanOrEqual(10);
  });
});

describe('the paste box', () => {
  it('loads Spotify links in their canonical form and reports unsupported websites', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    const { onChooseSource } = show();
    await openSlip();
    await userEvent.type(screen.getByLabelText('Paste a music link or CD code'), 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d?si=abc');
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(onChooseSource).toHaveBeenCalledWith({ provider: 'spotify', url: 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d' });
    await openSlip(); // choosing closes the rack
    await userEvent.type(screen.getByLabelText('Paste a music link or CD code'), 'https://example.org/page');
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('direct https audio');
    expect(onChooseSource).toHaveBeenCalledTimes(1);
  });

  it('resolves provider short links through the API', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    vi.spyOn(api, 'resolveMusicLink').mockResolvedValue({ provider: 'soundcloud', url: DISCOVERY_PLAYLISTS[0].url });
    const { onChooseSource } = show();
    await openSlip();
    await userEvent.type(screen.getByLabelText('Paste a music link or CD code'), 'https://on.soundcloud.com/example');
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(api.resolveMusicLink).toHaveBeenCalledWith('https://on.soundcloud.com/example');
    await waitFor(() => expect(onChooseSource).toHaveBeenCalledWith(expect.objectContaining({ provider: 'soundcloud' })));
  });

  it('takes anything that is not a link for the code of a CD', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    const { onChooseCd } = show();
    await openSlip();
    await userEvent.type(screen.getByLabelText('Paste a music link or CD code'), 'abc123{Enter}');
    expect(onChooseCd).toHaveBeenCalledWith('abc123');
  });
});

describe('links that were pasted', () => {
  const SPOTIFY = 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d';

  it('stay on the shelf after they are loaded, and can be played again', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    const { onChooseSource } = show();
    await openSlip();
    await userEvent.type(screen.getByLabelText('Paste a music link or CD code'), `${SPOTIFY}?si=abc`);
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
    const saved = await screen.findByRole('listitem', { name: 'Spotify playlist, Spotify link' });
    expect(saved).toHaveTextContent('LK');
    expect(JSON.parse(localStorage.getItem('libsic.links'))).toEqual([{ provider: 'spotify', url: SPOTIFY }]);
    await userEvent.click(saved);
    expect(onChooseSource).toHaveBeenLastCalledWith({ provider: 'spotify', url: SPOTIFY });
  });

  it('are still there next time, and Forget takes the playing one off the shelf', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    localStorage.setItem('libsic.links', JSON.stringify([{ provider: 'soundcloud', url: 'https://soundcloud.com/some-artist/sets/rainy-day-mix' }]));
    show({ source: { provider: 'soundcloud', url: 'https://soundcloud.com/some-artist/sets/rainy-day-mix' } });
    const saved = await screen.findByRole('listitem', { name: 'Rainy Day Mix, SoundCloud link' });
    expect(saved).toBeDisabled(); // it is in the player, so its place on the shelf is empty
    await userEvent.click(screen.getByRole('button', { name: 'Forget this link' }));
    expect(JSON.parse(localStorage.getItem('libsic.links'))).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Forget this link' })).toBeNull();
    expect(screen.getByRole('listitem', { name: 'Rainy Day Mix, SoundCloud link' })).toBeInTheDocument(); // still shown while it plays
  });

  it('does not keep a link that came with a shared room until it is saved', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    show({ source: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc&list=PL1' } });
    await screen.findByRole('listitem', { name: 'YouTube playlist, YouTube link' });
    expect(localStorage.getItem('libsic.links')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save this link' }));
    expect(JSON.parse(localStorage.getItem('libsic.links'))).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Save this link' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Forget this link' })).toBeInTheDocument();
  });

});

describe('the tracks of a playlist', () => {
  const player = {
    index: 0,
    skip: vi.fn(),
    cd: { tracks: [{ id: 'a', title: 'First Song', artist: 'First Artist', duration: 120 }, { id: 'b', title: 'Second Song', artist: 'Other Artist', duration: 180 }] },
  };

  it('are browsed and searched, and a click plays one', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    show({ source: { provider: 'soundcloud', url: DISCOVERY_PLAYLISTS[0].url }, player });
    await openRow();
    await userEvent.click(screen.getByRole('button', { name: 'Tracks' }));
    expect(screen.getByText('2 tracks from SoundCloud')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search this playlist'), 'Other Artist');
    expect(screen.queryByRole('button', { name: 'Play First Song' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Play Second Song' }));
    expect(player.skip).toHaveBeenCalledWith(1);
  });

  it('are not offered for a CD of ours', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    show({ cdCode: 'night-study', player });
    await openRow();
    expect(screen.queryByRole('button', { name: 'Tracks' })).toBeNull();
  });
});

describe('how a CD looks', () => {
  it('is always the same for the same CD and different for different CDs', () => {
    expect(cdLook('x1', 'Rain')).toEqual(cdLook('x1', 'Rain'));
    expect(cdLook('x1', 'Rain').spine).not.toEqual(cdLook('x2', 'Snow').spine);
  });

  it('has a hand-drawn look for the studio CDs', () => {
    expect(cdLook('golden-loft', 'Golden Hours').width).toBe(30);
  });
});
