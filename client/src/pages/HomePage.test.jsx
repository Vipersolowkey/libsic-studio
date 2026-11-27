import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import userEvent from '@testing-library/user-event';
import { saveMyRoom, setLastRoomCode } from '../myRooms.js';
import { otherScene, savedRoom, scene } from '../test/fixtures.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'getScenes').mockResolvedValue([scene, otherScene]);
  vi.spyOn(api, 'getRoom').mockResolvedValue(savedRoom);
});
afterEach(() => vi.restoreAllMocks());

describe('the start page (/)', () => {
  it('is a short intro with an Enter button that leads to the studio page', async () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Libsic Studio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/me');
    expect(api.getRoom).not.toHaveBeenCalled();
  });

  it('has one button whichever picture is on screen, and no room list of its own', async () => {
    saveMyRoom({ code: savedRoom.code, editKey: 'k', name: 'Study', sceneSlug: 'golden-loft' });
    setLastRoomCode(savedRoom.code);
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: 'Golden Hour Loft' }));
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/me');
    expect(screen.queryByRole('link', { name: 'Your room' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /My rooms/ })).not.toBeInTheDocument();
  });

  it('opens the studio page after the dive when Enter is clicked, where saved rooms are listed', async () => {
    saveMyRoom({ code: savedRoom.code, editKey: 'k', name: 'Study', sceneSlug: 'golden-loft' });
    renderAt('/');

    await userEvent.click(screen.getByRole('link', { name: 'Enter' }));
    expect(await screen.findByRole('link', { name: 'Study' }, { timeout: 3000 })).toHaveAttribute('href', `/r/${savedRoom.code}`);
  });
});

describe('a new room (/new)', () => {
  it('starts in the scene picked with ?scene=', async () => {
    renderAt('/new?scene=other');
    expect(await screen.findByRole('button', { name: 'Save room' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Effects' })).getByRole('button', { name: 'Stars' })).toHaveAttribute('aria-pressed', 'true'); // the scene picked with ?scene= (its own effect)
  });
});
