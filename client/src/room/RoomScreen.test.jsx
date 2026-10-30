import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import { getLastRoomCode, getMyRooms, saveMyRoom, setLastRoomCode } from '../myRooms.js';
import { decorScene, otherScene, savedRoom, scene } from '../test/fixtures.js';

// The room and effect lists are menus: open one by its button, then pick an item from it.
async function openMenu(name) {
  await userEvent.click(screen.getByRole('button', { name }));
}
async function pick(menu, item) {
  await openMenu(menu);
  await userEvent.click(screen.getByRole('button', { name: item }));
}

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

    await pick('Switch room', 'Other Room');
    expect(container.querySelector('[data-effect="stars"]')).not.toBeNull();
    expect(container.querySelector('[data-effect="rain"]')).toBeNull();
  });

  it('the effect buttons and the light button change the settings', async () => {
    const { container } = renderAt('/new');
    await screen.findByTestId('stage');

    await pick('Effects', 'Snow');
    expect(container.querySelector('[data-effect="snow"]')).not.toBeNull();
    await pick('Effects', 'None');
    expect(container.querySelector('[data-effect]')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Light on' }));
    expect(screen.getByTestId('stage')).toHaveClass('lights-off');
  });
});

describe('the room and effect menus', () => {
  it('open on click and close after a pick, on Escape and on a click elsewhere', async () => {
    renderAt('/new');
    await screen.findByTestId('stage');
    const roomMenu = () => screen.queryByRole('group', { name: 'Switch room' });

    expect(roomMenu()).toBeNull();
    await openMenu('Switch room');
    expect(roomMenu()).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(roomMenu()).toBeNull();

    await openMenu('Switch room');
    await userEvent.click(screen.getByTestId('stage'));
    expect(roomMenu()).toBeNull();

    await openMenu('Switch room');
    await userEvent.click(screen.getByRole('button', { name: 'Test Room' }));
    expect(roomMenu()).toBeNull();
  });
});

describe('zoom', () => {
  const zoomOf = (container) => Number(container.querySelector('.room').style.getPropertyValue('--zoom'));

  it('the buttons zoom in and out, and Fit shows the whole room', async () => {
    const { container } = renderAt('/new');
    await screen.findByTestId('stage');
    const start = zoomOf(container);

    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(zoomOf(container)).toBeGreaterThan(start);

    await userEvent.click(screen.getByRole('button', { name: 'Show the whole room' }));
    expect(zoomOf(container)).toBe(1);
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  });

  it('the plus and minus keys zoom, and the choice is remembered in this browser', async () => {
    const { container, unmount } = renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Show the whole room' }));

    await userEvent.keyboard('+');
    const zoomed = zoomOf(container);
    expect(zoomed).toBeGreaterThan(1);
    unmount();

    const again = renderAt('/new');
    await screen.findByTestId('stage');
    expect(zoomOf(again.container)).toBeCloseTo(zoomed);
  });

  it('does not zoom while the visitor types in the room name', async () => {
    const { container } = renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Show the whole room' }));

    await userEvent.type(screen.getByLabelText('Room name'), '++');
    expect(zoomOf(container)).toBe(1);
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
    await pick('Switch room', 'Other Room');
    await userEvent.click(screen.getByRole('button', { name: 'Light on' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));

    expect(api.createRoom).toHaveBeenCalledWith({ name: 'My room', sceneSlug: 'other', settings: { effect: 'stars', lightOn: false }, items: null });
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

    await openMenu('Switch room');
    expect(screen.getByRole('button', { name: 'Other Room' })).toHaveAttribute('aria-pressed', 'true');
    await openMenu('Effects');
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
      items: null,
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

describe('decorating the room', () => {
  // Only the pictures in the room itself, not the thumbnail in the tray.
  const mugImage = (container) => container.querySelector('.layer img[src="/scenes/decor-room/mug.webp"]');
  const mugLayer = (container) => mugImage(container).closest('.layer');
  const decorRoom = { ...savedRoom, sceneSlug: 'decor-room', items: null };
  const roomWith = (items) => ({ ...decorRoom, items });

  // Starts decorating, as the visitor would, and waits for the room.
  async function decorate(path = '/new') {
    const view = renderAt(path);
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Decorate' }));
    return view;
  }
  // Moves the mug one step to the right (a pointer drag does the same, see DecorateOverlay).
  async function nudgeMug() {
    screen.getByRole('button', { name: 'Mug' }).focus();
    await userEvent.keyboard('{ArrowRight}');
  }
  const done = () => userEvent.click(screen.getByRole('button', { name: 'Done' }));

  beforeEach(() => {
    api.getScenes.mockResolvedValue([decorScene, scene, otherScene]);
    api.getRoom.mockImplementation(async (code) => {
      if (code === savedRoom.code) return decorRoom;
      throw notFound();
    });
    vi.spyOn(api, 'createRoom').mockResolvedValue({ room: decorRoom, editKey: 'new-secret' });
  });

  it('offers Decorate only in a room whose scene has objects to move', async () => {
    renderAt('/new');
    await screen.findByTestId('stage');
    expect(screen.getByRole('button', { name: 'Decorate' })).toBeInTheDocument();

    await pick('Switch room', 'Test Room');
    expect(screen.queryByRole('button', { name: 'Decorate' })).toBeNull();
  });

  it('swaps the usual buttons for Undo, Reset room and Done, and lists the objects to add', async () => {
    await decorate();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Mug' })).toBeInTheDocument();
    for (const name of ['Switch room', 'Save room', 'Zoom in', 'Decorate']) expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('keeps the click areas of the room switched off while decorating', async () => {
    await decorate();
    const hotspots = [...document.querySelectorAll('.hotspot')];
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots.every((button) => button.disabled)).toBe(true);
  });

  it('moves an object, and Done keeps the new arrangement', async () => {
    const { container } = await decorate();
    await nudgeMug();
    expect(mugLayer(container)).toHaveStyle({ left: '38%' });

    await done();
    expect(mugLayer(container)).toHaveStyle({ left: '38%' });
    expect(screen.getByRole('button', { name: 'Save room' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  it('Undo takes the last move back', async () => {
    const { container } = await decorate();
    await nudgeMug();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(mugLayer(container)).toHaveStyle({ left: '37%' });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('adds a second mug from the tray and selects it', async () => {
    const { container } = await decorate();
    await userEvent.click(screen.getByRole('button', { name: 'Add Mug' }));
    expect(container.querySelectorAll('.layer img[src="/scenes/decor-room/mug.webp"]')).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Mug settings' })).toBeInTheDocument();
  });

  it('shows the settings of the selected object and takes it out of the room with Remove', async () => {
    const { container } = await decorate();
    expect(screen.queryByRole('group', { name: 'Mug settings' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Mug' }));
    expect(screen.getByRole('group', { name: 'Mug settings' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(mugImage(container)).toBeNull();
    expect(screen.queryByRole('group', { name: 'Mug settings' })).toBeNull();
  });

  it('Reset room puts every object back where it started', async () => {
    const { container } = await decorate();
    await nudgeMug();
    await userEvent.click(screen.getByRole('button', { name: 'Reset room' }));
    expect(mugLayer(container)).toHaveStyle({ left: '37%' });
  });

  it('Save room sends the arrangement of a new room', async () => {
    await decorate();
    await nudgeMug();
    await done();
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));

    const { items } = api.createRoom.mock.calls[0][0];
    expect(items).toEqual([
      { id: 'mug', key: 'mug', x: 41, y: 80, scale: 1, flip: false },
      { id: 'player', key: 'player', x: 60, y: 80, scale: 1, flip: false },
    ]);
  });

  it('sends items: null for a room that was never decorated', async () => {
    renderAt('/new');
    await screen.findByTestId('stage');
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }));
    expect(api.createRoom.mock.calls[0][0].items).toBeNull();
  });

  describe('in a saved room of this browser', () => {
    beforeEach(() => ownRoom());

    it('enables Save changes after a move and disables it again after undoing it', async () => {
      await decorate(`/r/${savedRoom.code}`);
      await nudgeMug();
      await done();
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();

      await userEvent.click(screen.getByRole('button', { name: 'Decorate' }));
      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      await done();
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    });

    it('opens with the objects where they were saved', async () => {
      const saved = roomWith([{ id: 'mug', key: 'mug', x: 70, y: 90, scale: 1, flip: false }]);
      api.getRoom.mockResolvedValue(saved);
      const { container } = renderAt(`/r/${savedRoom.code}`);
      await screen.findByTestId('stage');
      expect(mugLayer(container)).toHaveStyle({ left: '67%', top: '82%' });
      expect(container.querySelector('img[src="/scenes/decor-room/player.webp"]')).toBeNull();
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    });

    it('saves Reset room as items: null', async () => {
      api.getRoom.mockResolvedValue(roomWith([{ id: 'mug', key: 'mug', x: 70, y: 90, scale: 1, flip: false }]));
      vi.spyOn(api, 'updateRoom').mockResolvedValue(decorRoom);
      renderAt(`/r/${savedRoom.code}`);
      await screen.findByTestId('stage');

      await userEvent.click(screen.getByRole('button', { name: 'Decorate' }));
      await userEvent.click(screen.getByRole('button', { name: 'Reset room' }));
      await done();
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(api.updateRoom.mock.calls[0][2].items).toBeNull();
    });
  });

  it('forgets the arrangement when the visitor switches to another room and back', async () => {
    const { container } = await decorate();
    await nudgeMug();
    await done();

    await pick('Switch room', 'Test Room');
    await pick('Switch room', 'Decor Room');
    expect(mugLayer(container)).toHaveStyle({ left: '37%' });
  });

  describe('looking around a zoomed room', () => {
    const panX = (container) => container.querySelector('.room').style.getPropertyValue('--pan-x');
    const lookLeft = () => fireEvent.pointerMove(window, { clientX: 0, clientY: 300 });

    it('follows the mouse normally', async () => {
      const { container } = renderAt('/new');
      await screen.findByTestId('stage');
      await userEvent.keyboard('+++');
      lookLeft();
      await waitFor(() => expect(panX(container)).not.toBe('0px'));
    });

    it('stays still while decorating', async () => {
      const { container } = renderAt('/new');
      await screen.findByTestId('stage');
      await userEvent.keyboard('+++');
      await userEvent.click(screen.getByRole('button', { name: 'Decorate' }));
      lookLeft();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(panX(container)).toBe('0px');
    });
  });
});
