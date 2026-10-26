import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage.jsx';
import * as api from '../api.js';
import { scene } from '../test/fixtures.js';

const other = { ...scene, slug: 'other', name: 'Other Room', effects: ['stars'], defaultEffect: 'stars', effectLayer: 1 };

afterEach(() => vi.restoreAllMocks());

describe('HomePage', () => {
  it('shows a loading message, then the first scene', async () => {
    vi.spyOn(api, 'getScenes').mockResolvedValue([scene, other]);
    const { container } = render(<HomePage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    expect(await screen.findByTestId('stage')).toBeInTheDocument();
    expect(container.querySelector('[data-effect="rain"]')).not.toBeNull();
  });

  it('shows the error and lets the visitor try again', async () => {
    const spy = vi.spyOn(api, 'getScenes').mockRejectedValueOnce(new Error('Cannot reach the server. Is the API running?'));
    spy.mockResolvedValue([scene]);
    render(<HomePage />);

    expect(await screen.findByText(/cannot reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('stage')).toBeInTheDocument();
  });

  it('tells the visitor when there are no scenes', async () => {
    vi.spyOn(api, 'getScenes').mockResolvedValue([]);
    render(<HomePage />);
    expect(await screen.findByText(/no scenes yet/i)).toBeInTheDocument();
  });

  it('switching scene changes the picture and resets the effect to that scene default', async () => {
    vi.spyOn(api, 'getScenes').mockResolvedValue([scene, other]);
    const { container } = render(<HomePage />);
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Other Room' }));
    expect(container.querySelector('[data-effect="stars"]')).not.toBeNull();
    expect(container.querySelector('[data-effect="rain"]')).toBeNull();
  });

  it('the effect buttons and the light button change the settings', async () => {
    vi.spyOn(api, 'getScenes').mockResolvedValue([scene]);
    const { container } = render(<HomePage />);
    await screen.findByTestId('stage');

    await userEvent.click(screen.getByRole('button', { name: 'Snow' }));
    expect(container.querySelector('[data-effect="snow"]')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(container.querySelector('[data-effect]')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Light on' }));
    expect(screen.getByTestId('stage')).toHaveClass('lights-off');
    expect(screen.getByRole('button', { name: 'Light off' })).toBeInTheDocument();
  });
});
