import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CdRow from './CdRow.jsx';
import { cdLook } from './cdLook.js';
import { DISCOVERY_PLAYLISTS } from './discovery.js';
import { rememberCd } from './myCds.js';
import * as api from '../api.js';

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
  it('lists the studio CDs, the online playlists and the CDs made in this browser, each with its place number', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    show();
    expect(await screen.findByRole('listitem', { name: 'Quiet Pages, Studio · 4 tracks' })).toHaveTextContent('01');
    expect(screen.getByRole('listitem', { name: 'Below the Tide, Studio · 2 tracks' })).toHaveTextContent('02');
    expect(screen.getByRole('listitem', { name: 'Chillhop Essentials · Fall, SoundCloud playlist' })).toHaveTextContent('03');
    expect(screen.getByRole('listitem', { name: 'Exam Week, My CD' })).toHaveTextContent('05');
  });

  it('stands every CD in one tower, studio first, then the playlists, then your own', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    rememberCd({ code: 'mine-1', title: 'Exam Week', editKey: 'k' });
    show();
    await screen.findByRole('listitem', { name: /Quiet Pages/ });
    const titles = screen.getAllByRole('listitem').map((item) => item.querySelector('.cdc-ttl').textContent);
    expect(titles).toEqual(['Quiet Pages', 'Below the Tide', ...DISCOVERY_PLAYLISTS.map((p) => p.title), 'Exam Week']);
    expect(screen.getByRole('listitem', { name: 'Exam Week, My CD' })).toHaveTextContent('ME 05');
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

  it('picks a studio CD by its code', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    const { onChooseCd } = show();
    await openRow();
    await userEvent.click(await screen.findByRole('listitem', { name: /Below the Tide/ }));
    expect(onChooseCd).toHaveBeenCalledWith('clam-cove');
  });

  it('loads a whole playlist when its CD is picked', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue([]);
    const { onChooseSource } = show();
    await openRow();
    await userEvent.click(screen.getByRole('listitem', { name: /Chillhop Essentials · Fall/ }));
    expect(onChooseSource).toHaveBeenCalledWith({ provider: 'soundcloud', url: DISCOVERY_PLAYLISTS[0].url });
  });

  it('leaves an empty place where the CD in the player stands', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    show({ cdCode: 'night-study' });
    expect(await screen.findByRole('listitem', { name: /Quiet Pages/ })).toBeDisabled();
    expect(screen.getByRole('listitem', { name: /Below the Tide/ })).toBeEnabled();
  });

  it('has no button to fold it away: it lowers itself and a tap on the tag keeps it lifted', async () => {
    vi.spyOn(api, 'getCds').mockResolvedValue(STUDIO);
    const { container } = render(<MemoryRouter><CdRow source={null} cdCode="night-study" player={null} loading={false} error="" onChooseSource={() => {}} onChooseCd={() => {}} onEject={() => {}} onRetry={() => {}} /></MemoryRouter>);
    await screen.findByRole('listitem', { name: /Below the Tide/ });
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
    expect(await screen.findByRole('listitem', { name: /Quiet Pages/ })).toBeInTheDocument();
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
