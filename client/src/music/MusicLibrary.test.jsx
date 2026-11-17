import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MusicLibrary from './MusicLibrary.jsx';
import { DISCOVERY_PLAYLISTS } from './discovery.js';
import { parseMusicSource } from './musicSource.js';
import * as api from '../api.js';

afterEach(() => vi.restoreAllMocks());
describe('automatic playlist library', () => {
  it('loads an entire preset without asking for track links', async () => {
    const choose = vi.fn();
    render(<MusicLibrary onChoose={choose} />);
    await userEvent.click(screen.getByRole('button', { name: /Chillhop Essentials · Fall/ }));
    expect(choose).toHaveBeenCalledWith({ provider: 'soundcloud', url: DISCOVERY_PLAYLISTS[0].url });
  });
  it('browses and searches the tracks returned by SoundCloud', async () => {
    const skip = vi.fn();
    const source = DISCOVERY_PLAYLISTS[0];
    const player = { index: 0, skip, cd: { tracks: [{ id: 'a', title: 'First Song', artist: 'First Artist', duration: 120 }, { id: 'b', title: 'Second Song', artist: 'Other Artist', duration: 180 }] } };
    render(<MusicLibrary source={source} player={player} onChoose={vi.fn()} />);
    expect(screen.getByText('2 tracks from SoundCloud')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search this playlist'), 'Other Artist');
    expect(screen.queryByRole('button', { name: 'Play First Song' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Play Second Song' }));
    expect(skip).toHaveBeenCalledWith(1);
  });
  it('recognizes Spotify links and reports unsupported websites', async () => {
    const choose = vi.fn();
    render(<MusicLibrary onChoose={choose} />);
    const field = screen.getByLabelText('Or paste a music link');
    await userEvent.type(field, 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d?si=abc');
    await userEvent.click(screen.getByRole('button', { name: 'Load music link' }));
    expect(choose).toHaveBeenCalledWith({ provider: 'spotify', url: 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d' });
    await userEvent.clear(field); await userEvent.type(field, 'https://example.org/page');
    await userEvent.click(screen.getByRole('button', { name: 'Load music link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('direct https audio');
    expect(choose).toHaveBeenCalledTimes(1);
  });
  it('resolves provider short links through the API', async () => {
    const choose = vi.fn();
    vi.spyOn(api, 'resolveMusicLink').mockResolvedValue({ provider: 'soundcloud', url: DISCOVERY_PLAYLISTS[0].url });
    render(<MusicLibrary onChoose={choose} />);
    await userEvent.type(screen.getByLabelText('Or paste a music link'), 'https://on.soundcloud.com/example');
    await userEvent.click(screen.getByRole('button', { name: 'Load music link' }));
    expect(api.resolveMusicLink).toHaveBeenCalledWith('https://on.soundcloud.com/example');
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({ provider: 'soundcloud' }));
  });
});

it.each(['javascript:alert(1)', 'https://soundcloud.com.evil.test/a/b', 'https://example.org/a', 'http://example.org/a.mp3', 'https://user:secret@cdn.example.org/a.mp3'])('rejects unsafe or unsupported link %s', (url) => {
  expect(() => parseMusicSource(url)).toThrow();
});
