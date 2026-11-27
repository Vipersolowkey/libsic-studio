import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import * as api from '../api.js';
import { otherScene, savedRoom, scene } from '../test/fixtures.js';

// A room that belongs to the signed-in account can be changed without an edit key in this browser (the API says so with `mine`).
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'getCds').mockResolvedValue([]);
  vi.spyOn(api, 'getScenes').mockResolvedValue([scene, otherScene]);
});
afterEach(() => vi.restoreAllMocks());

describe('a room owned by the signed-in account', () => {
  it('shows the owner buttons and saves without an edit key', async () => {
    vi.spyOn(api, 'getRoom').mockResolvedValue({ ...savedRoom, mine: true });
    vi.spyOn(api, 'updateRoom').mockResolvedValue({ ...savedRoom, mine: true, name: 'Study 2' });
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');

    expect(screen.queryByRole('button', { name: 'Save my own copy' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Room name'), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(api.updateRoom).toHaveBeenCalledWith(savedRoom.code, null, expect.objectContaining({ name: 'Study 2' }));
  });

  it('still treats a room that is not mine, and has no key here, as someone else\'s', async () => {
    vi.spyOn(api, 'getRoom').mockResolvedValue({ ...savedRoom, mine: false });
    renderAt(`/r/${savedRoom.code}`);
    await screen.findByTestId('stage');
    expect(screen.getByRole('button', { name: 'Save my own copy' })).toBeInTheDocument();
  });
});
