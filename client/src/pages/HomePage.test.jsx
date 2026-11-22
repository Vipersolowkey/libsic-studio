import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('is a short intro with an Enter button that leads into a room', async () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Libsic Studio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/new?scene=night-study');
    expect(api.getRoom).not.toHaveBeenCalled();
  });

  it('enters the room that is on screen', async () => {
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: 'Golden Hour Loft' }));
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/new?scene=golden-loft');

    await userEvent.click(screen.getByRole('button', { name: 'Clover Hill Meadow' }));
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/new?scene=clover-meadow');

    await userEvent.click(screen.getByRole('button', { name: 'Aurora Observatory' }));
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/new?scene=aurora-observatory');
  });

  it('opens the room after the dive when Enter is clicked', async () => {
    renderAt('/');

    await userEvent.click(screen.getByRole('link', { name: 'Enter' }));
    expect(await screen.findByRole('button', { name: 'Save room' }, { timeout: 3000 })).toBeInTheDocument();
  });

  it('shows one button: "Your room" on the saved room\'s picture, "Enter" on the others', async () => {
    saveMyRoom({ code: savedRoom.code, editKey: 'k', name: 'Study', sceneSlug: 'golden-loft' });
    setLastRoomCode(savedRoom.code);
    renderAt('/');

    // the intro starts on the saved room's picture
    expect(screen.getByRole('link', { name: 'Your room' })).toHaveAttribute('href', `/r/${savedRoom.code}`);
    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clam Cove' }));
    expect(screen.getByRole('link', { name: 'Enter' })).toHaveAttribute('href', '/new?scene=underwater-nook');
    await userEvent.click(screen.getByRole('button', { name: /My rooms \(1\)/ }));
    expect(screen.getByRole('link', { name: 'Study' })).toHaveAttribute('href', `/r/${savedRoom.code}`);
    expect(api.getRoom).not.toHaveBeenCalled();
  });

  it('forgets a saved room from the list', async () => {
    saveMyRoom({ code: savedRoom.code, editKey: 'k', name: 'Study', sceneSlug: 'other' });
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: /My rooms/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Forget' }));
    expect(screen.queryByRole('link', { name: 'Study' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /My rooms/ })).not.toBeInTheDocument();
  });
});

describe('a new room (/new)', () => {
  it('starts in the scene picked with ?scene=', async () => {
    renderAt('/new?scene=other');
    expect(await screen.findByRole('button', { name: 'Save room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Other Room/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
