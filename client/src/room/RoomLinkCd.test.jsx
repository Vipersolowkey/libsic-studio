import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import { otherScene, scene } from '../test/fixtures.js';

// A stand-in for the provider players: it shows which link is loaded and lets the test say "this link is over".
vi.mock('../music/ExternalMusic.jsx', () => ({
  EMPTY_ONLINE_PLAYER: { cd: { title: 'Online music', tracks: [] }, track: null, playing: false, volume: 0.7, toggle() {}, next() {}, prev() {}, pause() {} },
  default: ({ source, onEnded, autoplay }) => (
    <div data-testid="link-player" data-url={source.url} data-autoplay={String(autoplay)}>
      <button onClick={onEnded}>link over</button>
    </div>
  ),
}));

const first = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const second = 'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-fall-2024';
const linkCd = { code: 'links123', title: 'Link mix', trackIds: [], tracks: [], official: false, look: { hue: 200, cover: 1, disc: 2, font: 3 }, links: [{ provider: 'youtube', url: first }, { provider: 'soundcloud', url: second }] };

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'getCds').mockResolvedValue([]);
  vi.spyOn(api, 'getCd').mockResolvedValue(linkCd);
  vi.spyOn(api, 'getScenes').mockResolvedValue([scene, otherScene]);
});
afterEach(() => vi.restoreAllMocks());

describe('a CD made of online links in a room', () => {
  it('plays its links one after the other, starts the next by itself, and starts again after the last', async () => {
    render(<MemoryRouter initialEntries={['/new?cd=links123']}><App /></MemoryRouter>);
    const player = await screen.findByTestId('link-player');
    expect(player).toHaveAttribute('data-url', first);
    expect(player).toHaveAttribute('data-autoplay', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'link over' }));
    expect(screen.getByTestId('link-player')).toHaveAttribute('data-url', second);
    expect(screen.getByTestId('link-player')).toHaveAttribute('data-autoplay', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'link over' }));
    expect(screen.getByTestId('link-player')).toHaveAttribute('data-url', first);
  });
});
