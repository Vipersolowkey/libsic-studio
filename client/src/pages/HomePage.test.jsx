import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import { setLastRoomCode } from '../myRooms.js';
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
  it('reopens the last room of this browser', async () => {
    setLastRoomCode(savedRoom.code);
    renderAt('/');

    expect(await screen.findByLabelText('Room name')).toHaveValue('Study');
    expect(api.getRoom).toHaveBeenCalledWith(savedRoom.code);
  });

  it('starts a new room when there is no last room', async () => {
    renderAt('/');
    expect(await screen.findByRole('button', { name: 'Save room' })).toBeInTheDocument();
    expect(api.getRoom).not.toHaveBeenCalled();
  });
});
