import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExternalMusic from './ExternalMusic.jsx';
import { DISCOVERY_PLAYLISTS } from './discovery.js';
import { loadProviderSdk } from './providerSdk.js';
import * as apiCalls from '../api.js';

vi.mock('./providerSdk.js', () => ({ loadProviderSdk: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());
const source = DISCOVERY_PLAYLISTS[0];
const latest = (callback) => callback.mock.calls.at(-1)[0];
function soundcloud() {
  const listeners = {};
  const sounds = [
    { id: 1, title: 'One', duration: 120000, user: { username: 'Artist' }, permalink_url: 'https://soundcloud.com/artist/one' },
    { id: 2, title: 'Two', duration: 180000, user: { username: 'Other' }, permalink_url: 'https://soundcloud.com/artist/two' },
  ];
  const widget = {
    bind: vi.fn((event, fn) => { listeners[event] = fn; }), unbind: vi.fn(),
    getSounds: vi.fn((fn) => fn(sounds)), getCurrentSound: vi.fn((fn) => fn(sounds[0])), getCurrentSoundIndex: vi.fn((fn) => fn(0)),
    setVolume: vi.fn(), pause: vi.fn(), play: vi.fn(), toggle: vi.fn(), skip: vi.fn(), seekTo: vi.fn(),
  };
  const events = Object.fromEntries(['READY','PLAY','PAUSE','PLAY_PROGRESS','FINISH','ERROR'].map((key) => [key,key]));
  const Widget = Object.assign(vi.fn(() => widget), { Events: events });
  return { api: { Widget }, widget, listeners };
}

describe('SoundCloud integration', () => {
  it('loads the whole playlist and controls the provider without starting sound on mount', async () => {
    const { api, widget, listeners } = soundcloud();
    loadProviderSdk.mockResolvedValue(api);
    const onPlayer = vi.fn();
    const { unmount } = render(<ExternalMusic source={source} onPlayer={onPlayer} onClose={vi.fn()} />);
    await waitFor(() => expect(api.Widget).toHaveBeenCalledTimes(1));
    act(() => listeners.READY());
    await waitFor(() => expect(latest(onPlayer).count).toBe(2));
    expect(latest(onPlayer).cd.tracks[1]).toMatchObject({ title: 'Two', duration: 180, artist: 'Other' });
    expect(widget.play).not.toHaveBeenCalled();
    act(() => latest(onPlayer).skip(1));
    expect(widget.skip).toHaveBeenCalledWith(1);
    expect(widget.play).toHaveBeenCalledOnce();
    act(() => listeners.PLAY());
    expect(latest(onPlayer).playing).toBe(true);
    act(() => listeners.PLAY_PROGRESS({ currentPosition: 12500 }));
    expect(latest(onPlayer).time).toBe(12.5);
    act(() => latest(onPlayer).seek(20));
    expect(widget.seekTo).toHaveBeenCalledWith(20000);
    act(() => latest(onPlayer).setVolume(0.25));
    expect(widget.setVolume).toHaveBeenLastCalledWith(25);
    expect(latest(onPlayer).volume).toBe(0.25);
    unmount();
    expect(widget.pause).toHaveBeenCalled();
    expect(widget.unbind).toHaveBeenCalledTimes(Object.keys(listeners).length);
  });

  it('shows provider failures and reloads the integration on retry', async () => {
    const { api, listeners } = soundcloud();
    loadProviderSdk.mockResolvedValue(api);
    render(<ExternalMusic source={source} onPlayer={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(api.Widget).toHaveBeenCalled());
    act(() => listeners.ERROR());
    expect(screen.getByRole('alert')).toHaveTextContent('SoundCloud could not play');
    await userEvent.click(screen.getByRole('button', { name: 'Retry source' }));
    await waitFor(() => expect(api.Widget).toHaveBeenCalledTimes(2));
  });

  it('hydrates id-only playlist entries without requiring a link or playing every track', async () => {
    const { api, widget, listeners } = soundcloud();
    widget.getSounds.mockImplementation((fn) => fn([{ id: 1, title: 'One', duration: 120000 }, { id: 2 }]));
    vi.spyOn(apiCalls, 'getSoundcloudMetadata').mockResolvedValue([{ id: '2', title: 'Full title', artist: 'Artist' }]);
    loadProviderSdk.mockResolvedValue(api);
    const onPlayer = vi.fn();
    render(<ExternalMusic source={source} onPlayer={onPlayer} onClose={vi.fn()} />);
    await waitFor(() => expect(api.Widget).toHaveBeenCalledOnce());
    act(() => listeners.READY());
    await waitFor(() => expect(latest(onPlayer).cd.tracks[1].title).toBe('Full title'));
    expect(apiCalls.getSoundcloudMetadata).toHaveBeenCalledWith(['2']);
    expect(latest(onPlayer).cd.tracks[1].pending).toBe(false);
    expect(widget.play).not.toHaveBeenCalled();
    expect(widget.skip).not.toHaveBeenCalled();
  });

  it('does not create a player after being unmounted while the SDK is loading', async () => {
    let resolve;
    loadProviderSdk.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { api } = soundcloud();
    const { unmount } = render(<ExternalMusic source={source} onPlayer={vi.fn()} onClose={vi.fn()} />);
    unmount();
    await act(async () => resolve(api));
    expect(api.Widget).not.toHaveBeenCalled();
  });

  it('can navigate away even when the provider iframe was already detached', async () => {
    const { api, widget } = soundcloud();
    widget.pause.mockImplementation(() => { throw new TypeError('contentWindow is null'); });
    loadProviderSdk.mockResolvedValue(api);
    const { unmount } = render(<ExternalMusic source={source} onPlayer={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(api.Widget).toHaveBeenCalledOnce());
    expect(() => unmount()).not.toThrow();
    expect(widget.unbind).toHaveBeenCalled();
  });
});

it('uses Spotify playback events and keeps unsupported controls disabled', async () => {
  const listeners = {};
  const controller = { addListener: vi.fn((event, fn) => { listeners[event] = fn; }), togglePlay: vi.fn(), pause: vi.fn(), seek: vi.fn(), destroy: vi.fn() };
  const api = { createController: vi.fn((element, options, callback) => callback(controller)) };
  loadProviderSdk.mockResolvedValue(api);
  const onPlayer = vi.fn();
  const { unmount } = render(<ExternalMusic source={{ provider: 'spotify', url: 'https://open.spotify.com/playlist/0CFuMybe6s77w6QQrJjW7d' }} onPlayer={onPlayer} onClose={vi.fn()} />);
  await waitFor(() => expect(api.createController).toHaveBeenCalledOnce());
  act(() => listeners.ready());
  act(() => listeners.playback_update({ data: { isPaused: false, isBuffering: false, duration: 120000, position: 10000 } }));
  expect(latest(onPlayer)).toMatchObject({ playing: true, duration: 120, time: 10, canNavigate: false, canVolume: false, canSeek: false });
  act(() => latest(onPlayer).toggle());
  expect(controller.togglePlay).toHaveBeenCalledOnce();
  unmount();
  expect(controller.destroy).toHaveBeenCalledOnce();
});

it('controls a visible YouTube player and stops polling on unmount', async () => {
  let events;
  const controller = { setVolume: vi.fn(), getVideoData: () => ({ title: 'Video title', video_id: 'M7lc1UVf-VE' }), getPlaylist: () => [], getPlaylistIndex: () => -1, getCurrentTime: () => 12, getDuration: () => 100, getPlayerState: () => 2, playVideo: vi.fn(), pauseVideo: vi.fn(), nextVideo: vi.fn(), previousVideo: vi.fn(), seekTo: vi.fn(), destroy: vi.fn() };
  const Player = vi.fn(function (iframe, options) { events = options.events; return controller; });
  loadProviderSdk.mockResolvedValue({ Player });
  const onPlayer = vi.fn();
  const { unmount } = render(<ExternalMusic source={{ provider: 'youtube', url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE' }} onPlayer={onPlayer} onClose={vi.fn()} />);
  await waitFor(() => expect(Player).toHaveBeenCalledOnce());
  act(() => events.onReady());
  expect(latest(onPlayer)).toMatchObject({ track: { title: 'Video title' }, time: 12, duration: 100 });
  act(() => latest(onPlayer).toggle());
  expect(controller.playVideo).toHaveBeenCalledOnce();
  expect(screen.getByTitle('YouTube player')).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com/embed/M7lc1UVf-VE'));
  unmount();
  expect(controller.destroy).toHaveBeenCalledOnce();
});
