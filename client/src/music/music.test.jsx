import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import { getMyCds, rememberCd } from './myCds.js';

const tracks = [
  { id: 'lamp-light', title: 'Lamp Light', src: '/lamp.mp3', duration: 51, artist: 'Libsic Studio' },
  { id: 'slow-tide', title: 'Slow Tide', src: '/tide.mp3', duration: 59, artist: 'Libsic Studio' },
];
const cd = { code: 'mix12345', title: 'My mix', trackIds: ['slow-tide', 'lamp-light'], tracks: [tracks[1], tracks[0]], official: false };
const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'getTracks').mockResolvedValue(tracks);
  vi.spyOn(api, 'getCd').mockResolvedValue(cd);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

describe('CD creation and sharing', () => {
  it('creates an ordered mix, remembers its key and opens its share page', async () => {
    vi.spyOn(api, 'createCd').mockResolvedValue({ cd, editKey: 'creator-secret' });
    renderAt('/music');
    const create = screen.getByRole('button', { name: 'Create CD' });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText('CD name'), 'My mix');
    await userEvent.click(screen.getByRole('tab', { name: 'Our tracks' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Lamp Light/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Slow Tide/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Move slow-tide up' }));
    await userEvent.click(create);
    expect(api.createCd).toHaveBeenCalledWith({ title: 'My mix', trackIds: ['slow-tide', 'lamp-light'], links: [], look: expect.objectContaining({ hue: expect.any(Number) }) });
    expect(await screen.findByRole('heading', { name: 'My mix' })).toBeInTheDocument();
    expect(getMyCds()).toEqual([{ code: cd.code, title: cd.title, editKey: 'creator-secret' }]);
    expect(screen.getByLabelText('Share link')).toHaveValue(`${location.origin}/cd/${cd.code}`);
    expect(screen.getByRole('link', { name: 'Listen in a room' })).toHaveAttribute('href', `/new?cd=${cd.code}`);
  });

  it('keeps the form after validation errors and lets a track load be retried', async () => {
    api.getTracks.mockRejectedValueOnce(new Error('Server asleep'));
    vi.spyOn(api, 'createCd').mockRejectedValue(new Error('Unknown tracks'));
    renderAt('/music');
    await userEvent.click(screen.getByRole('tab', { name: 'Our tracks' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server asleep');
    await userEvent.click(screen.getByRole('button', { name: 'Retry tracks' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Lamp Light/ }));
    await userEvent.type(screen.getByLabelText('CD name'), 'Keep this');
    await userEvent.click(screen.getByRole('button', { name: 'Create CD' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown tracks');
    expect(screen.getByLabelText('CD name')).toHaveValue('Keep this');
  });

  it('shows a recovery key when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(api, 'createCd').mockResolvedValue({ cd, editKey: 'keep-this-key' });
    renderAt('/music');
    await userEvent.type(screen.getByLabelText('CD name'), 'My mix');
    await userEvent.click(screen.getByRole('tab', { name: 'Our tracks' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Lamp Light/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create CD' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('keep-this-key');
    expect(screen.getByRole('button', { name: 'Edit CD' })).toBeInTheDocument();
  });

  it('shows missing CDs as a friendly page', async () => {
    api.getCd.mockRejectedValue(new api.ApiError('CD not found', 404));
    renderAt('/cd/gone');
    expect(await screen.findByRole('heading', { name: 'CD not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
  });
});

describe('CD ownership', () => {
  it('updates and deletes with the stored edit key', async () => {
    rememberCd({ code: cd.code, title: cd.title, editKey: 'secret' });
    vi.spyOn(api, 'updateCd').mockResolvedValue({ ...cd, title: 'Renamed' });
    vi.spyOn(api, 'deleteCd').mockResolvedValue(null);
    renderAt(`/cd/${cd.code}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit CD' }));
    const title = screen.getByLabelText('CD name');
    await userEvent.clear(title); await userEvent.type(title, 'Renamed');
    await screen.findByRole('checkbox', { name: /Lamp Light/ });
    await userEvent.click(screen.getByRole('button', { name: 'Save CD changes' }));
    await screen.findByRole('heading', { name: 'Renamed' });
    expect(api.updateCd).toHaveBeenCalledWith(cd.code, 'secret', { title: 'Renamed', trackIds: cd.trackIds, links: [], look: expect.objectContaining({ hue: expect.any(Number) }) });
    await userEvent.click(screen.getByRole('button', { name: 'Delete CD', exact: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete CD' }));
    expect(await screen.findByRole('heading', { name: 'CD deleted' })).toBeInTheDocument();
    expect(api.deleteCd).toHaveBeenCalledWith(cd.code, 'secret');
    expect(getMyCds()).toEqual([]);
  });

  it('does not offer mutation buttons for official CDs', async () => {
    api.getCd.mockResolvedValue({ ...cd, official: true });
    renderAt(`/cd/${cd.code}`);
    await screen.findByRole('heading', { name: cd.title });
    expect(screen.queryByRole('button', { name: 'Edit CD' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete CD' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });
});

describe('CDs made of online links', () => {
  const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const soundcloud = 'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-fall-2024';
  const linkCd = { code: 'links123', title: 'Link mix', trackIds: [], tracks: [], official: false, look: { hue: 200, cover: 1, disc: 2, font: 3 }, links: [{ provider: 'youtube', url: youtube }, { provider: 'soundcloud', url: soundcloud }] };

  it('collects several pasted links in order, reports a bad one, and saves them with the chosen look', async () => {
    vi.spyOn(api, 'createCd').mockResolvedValue({ cd: linkCd, editKey: 'link-secret' });
    api.getCd.mockResolvedValue(linkCd);
    renderAt('/music');
    const create = screen.getByRole('button', { name: 'Create CD' });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText('CD name'), 'Link mix');
    await userEvent.type(screen.getByLabelText('Music links'), `${youtube} https://example.com/page ${soundcloud}`);
    await userEvent.click(screen.getByRole('button', { name: 'Add to the CD' }));
    const list = await screen.findByRole('list', { name: 'Links on the CD' });
    expect(list.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Use SoundCloud, Spotify, YouTube');
    expect(screen.getByLabelText('Music links')).toHaveValue('https://example.com/page');
    await userEvent.click(screen.getByRole('button', { name: 'Move link 2 up' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Cover: Stripe' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Lettering: Typewriter' }));
    await userEvent.click(create);
    expect(api.createCd).toHaveBeenCalledWith({ title: 'Link mix', trackIds: [], links: [soundcloud, youtube], look: expect.objectContaining({ cover: 2, font: 3 }) });
    expect(await screen.findByRole('heading', { name: 'Link mix' })).toBeInTheDocument();
    expect(getMyCds()).toEqual([{ code: linkCd.code, title: linkCd.title, editKey: 'link-secret', look: linkCd.look }]);
  });

  it('ignores a link that is already on the CD and lets a link be removed', async () => {
    renderAt('/music');
    await userEvent.type(screen.getByLabelText('Music links'), youtube);
    await userEvent.click(screen.getByRole('button', { name: 'Add to the CD' }));
    await screen.findByRole('list', { name: 'Links on the CD' });
    await userEvent.type(screen.getByLabelText('Music links'), 'https://youtu.be/dQw4w9WgXcQ');
    await userEvent.click(screen.getByRole('button', { name: 'Add to the CD' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already on the CD');
    await userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(screen.queryByRole('list', { name: 'Links on the CD' })?.querySelectorAll('li').length ?? 0).toBe(0);
    expect(screen.getByRole('button', { name: 'Create CD' })).toBeDisabled();
  });

  it('shows the links on the CD page and lets the owner rename it, repaint it and change its links', async () => {
    api.getCd.mockResolvedValue(linkCd);
    rememberCd({ code: linkCd.code, title: linkCd.title, editKey: 'link-secret' });
    vi.spyOn(api, 'updateCd').mockResolvedValue({ ...linkCd, title: 'Renamed mix' });
    renderAt(`/cd/${linkCd.code}`);
    const list = await screen.findByRole('list', { name: 'Links on the CD' });
    expect(list.querySelectorAll('li')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Edit CD' }));
    const title = screen.getByLabelText('CD name');
    expect(title).toHaveValue('Link mix');
    expect(screen.getByRole('radio', { name: 'Cover: Ripples' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.clear(title); await userEvent.type(title, 'Renamed mix');
    await userEvent.click(screen.getByRole('radio', { name: 'Disc: Target' }));
    await userEvent.click(within(screen.getByRole('main')).getAllByRole('button', { name: 'Remove link 2' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Save CD changes' }));
    await screen.findByRole('heading', { name: 'Renamed mix' });
    expect(api.updateCd).toHaveBeenCalledWith(linkCd.code, 'link-secret', { title: 'Renamed mix', trackIds: [], links: [youtube], look: { hue: 200, cover: 1, disc: 3, font: 3 } });
  });
});

describe('the Edit button of the shelf', () => {
  it('opens the editor at once for a CD whose edit key this browser holds', async () => {
    rememberCd({ code: cd.code, title: cd.title, editKey: 'secret' });
    renderAt(`/cd/${cd.code}?edit=1`);
    expect(await screen.findByLabelText('CD name')).toHaveValue('My mix');
    expect(screen.getByRole('button', { name: 'Save CD changes' })).toBeInTheDocument();
  });

  it('does not open the editor for someone else\'s CD', async () => {
    renderAt(`/cd/${cd.code}?edit=1`);
    await screen.findByRole('heading', { name: cd.title });
    expect(screen.queryByLabelText('CD name')).toBeNull();
  });
});
