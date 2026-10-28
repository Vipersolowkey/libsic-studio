import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import { getLastRoomCode, getMyRooms, saveMyRoom, setLastRoomCode } from '../myRooms.js';
import { otherScene, savedRoom, scene } from '../test/fixtures.js';

const notFound = () => new api.ApiError('Room not found', 404);

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

// Pretend this browser created the saved room, so it holds the edit key.
const ownRoom = () => saveMyRoom({ code: savedRoom.code, editKey: 'secret-key', name: savedRoom.name, sceneSlug: savedRoom.sceneSlug });

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'getScenes').mockResolvedValue([scene, otherScene]);
  vi.spyOn(api, 'getRoom').mockImplementation(async (code) => {
    if (code === savedRoom.code) return savedRoom;
    throw notFound();
  });
});
afterEach(() => vi.restoreAllMocks());

describe('a new room (/new)', () => {
  it('shows a loading message, then the first scene with its default effect', async () => {
    const { container } = renderAt('/new');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    expect(await screen.findByTestId('stage')).toBeInTheDocument();
    expect(container.querySelector('[data-effect="rain"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save room' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete room' })).toBeNull();
  });

  it('shows the error and lets the visitor try again', async () => {
    api.getScenes.mockRejectedValueOnce(new Error('Cannot reach the server. Is the API running?'));
    renderAt('/new');

    expect(await screen.findByText(/cannot reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('stage')).toBeInTheDocument();
  });

  it('tells the visitor when there are no scenes', async () => {
    api.getScenes.mockResolvedValue([]);
    renderAt('/new');
    expect(await screen.findByText(/no scenes yet/i)).toBeInTheDocument();
  });

  it('switching scene changes the picture and resets the effect to that scene default', async () => {
    const { container } = renderAt('/new');
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Other Room' }));
    expect(container.querySelector('[data-effect="stars"]')).not.toBeNull();
    expect(container.querySelector('[data-effect="rain"]')).toBeNull();
  });

  it('the effect buttons and the light button change the settings', async () => {
    const { container } = renderAt('/new');
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Snow' }));
    expect(container.querySelector('[data-effect="snow"]')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(container.querySelector('[data-effect]')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Light on' }));
    expect(screen.getByTestId('stage')).toHaveClass('lights-off');
  });
});

describe('saving a new room', () => {
  beforeEach(() => {
    vi.spyOn(api, 'createRoom').mockResolvedValue({ room: { ...savedRoom, name: 'My room' }, editKey: 'new-secret' });
  });

  it('sends the name, scene and settings, remembers the edit key and opens the room page', async () => {
    renderAt('/new');
    await screen.findByTestId('stage');

    await userEvent.type(screen.getByLabelText('Room name'), 'My room');
    await userEvent.click(screen.getByRole('button', { name: 'Other Room' }));
    await userEvent.click(screen.getByRole('button', { name: 'Light on' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));

    expect(api.createRoom).toHaveBeenCalledWith({ name: 'My room', sceneSlug: 'other', settings: { effect: 'stars', lightOn: false } });
    expect(getMyRooms()[0]).toMatchObject({ code: savedRoom.code, editKey: 'new-secret' });
    expect(getLastRoomCode()).toBe(savedRoom.code);

    // The page is now the saved room, and this browser can edit it.
    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/room saved/i);
    expect(screen.getByLabelText('Share link')).toHaveValue(`${window.location.origin}/r/${savedRoom.code}`);
  });

  it('uses "Untitled room" when the name is empty', async () => {
    renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));
    expect(api.createRoom.mock.calls[0][0].name).toBe('Untitled room');
  });

  it('shows the error from the API and stays on the page', async () => {
    api.createRoom.mockRejectedValue(new api.ApiError('Validation failed', 400));
    renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Validation failed');
    expect(screen.getByRole('button', { name: 'Save room' })).toBeEnabled();
    expect(getMyRooms()).toEqual([]);
  });

  it('shows the edit key when the browser cannot remember it', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));

    expect(await screen.findByRole('status')).toHaveTextContent('new-secret');
  });
});

describe('opening a saved room (/r/:code)', () => {
  it('loads its scene, effect, light and name, and remembers it as the last room', async () => {
    renderAt(`/r/${savedRoom.code}`);
    const stage = await screen.findByTestId('stage');

    expect(screen.getByRole('button', { name: 'Other Room' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Stars' })).toHaveAttribute('aria-pressed', 'true');
    expect(stage).toHaveClass('lights-off');
    expect(screen.getByLabelText('Room name')).toHaveValue('Study');
    expect(getLastRoomCode()).toBe(savedRoom.code);
  });

  it('shows a friendly page when the room does not exist and forgets it as the last room', async () => {
    setLastRoomCode('gone1234');
    renderAt('/r/gone1234');

    expect(await screen.findByText(/room not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start a new room/i })).toHaveAttribute('href', '/new');
    expect(getLastRoomCode()).toBeNull();
  });

  it('offers only "Save my own copy" to a visitor without the edit key', async () => {
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    expect(screen.getByRole('button', { name: 'Save my own copy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete room' })).toBeNull();
  });

  it('copies the share link', async () => {
    const user = userEvent.setup();
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/r/${savedRoom.code}`);
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
  });
});

describe('editing your own room', () => {
  beforeEach(() => {
    ownRoom();
  });

  it('enables "Save changes" only after something changed, then sends only that room with its edit key', async () => {
    vi.spyOn(api, 'updateRoom').mockResolvedValue({ ...savedRoom, name: 'Study 2' });
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Room name'), ' 2');
    expect(save).toBeEnabled();
    await userEvent.click(save);

    expect(api.updateRoom).toHaveBeenCalledWith(savedRoom.code, 'secret-key', {
      name: 'Study 2',
      sceneSlug: 'other',
      settings: { effect: 'stars', lightOn: false },
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Changes saved');
    expect(getMyRooms()[0].name).toBe('Study 2');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('shows the error when the API refuses the change', async () => {
    vi.spyOn(api, 'updateRoom').mockRejectedValue(new api.ApiError('Wrong edit key', 403));
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Light off' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Wrong edit key');
  });

  it('deletes the room after the visitor confirms, then starts a new room', async () => {
    vi.spyOn(api, 'deleteRoom').mockResolvedValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Delete room' }));

    expect(api.deleteRoom).toHaveBeenCalledWith(savedRoom.code, 'secret-key');
    expect(await screen.findByRole('button', { name: 'Save room' })).toBeInTheDocument();
    expect(getMyRooms()).toEqual([]);
    expect(getLastRoomCode()).toBeNull();
  });

  it('does nothing when the visitor cancels the delete', async () => {
    vi.spyOn(api, 'deleteRoom').mockResolvedValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Delete room' }));

    expect(api.deleteRoom).not.toHaveBeenCalled();
    expect(getMyRooms()).toHaveLength(1);
  });
});

describe('My rooms', () => {
  it('lists the rooms saved in this browser and opens one when clicked', async () => {
    saveMyRoom({ code: 'zzz99999', editKey: 'k', name: 'Other one', sceneSlug: 'rainy-cafe' });
    ownRoom();
    renderAt('/new');
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: /my rooms \(2\)/i }));
    expect(screen.getByRole('link', { name: 'Study' })).toHaveAttribute('href', `/r/${savedRoom.code}`);

    await userEvent.click(screen.getByRole('link', { name: 'Study' }));
    expect(await screen.findByLabelText('Room name')).toHaveValue('Study');
  });

  it('says so when nothing is saved yet', async () => {
    renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: /my rooms \(0\)/i }));
    expect(screen.getByText(/no saved rooms yet/i)).toBeInTheDocument();
  });

  it('Forget removes a room from the list without deleting it on the server', async () => {
    vi.spyOn(api, 'deleteRoom');
    ownRoom();
    renderAt('/new');
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: /my rooms \(1\)/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Forget' }));

    expect(getMyRooms()).toEqual([]);
    expect(screen.getByRole('button', { name: /my rooms \(0\)/i })).toBeInTheDocument();
    expect(api.deleteRoom).not.toHaveBeenCalled();
  });
});
