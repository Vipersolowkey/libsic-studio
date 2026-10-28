import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SceneStage from './SceneStage.jsx';
import { scene } from '../test/fixtures.js';

// A tiny parent that keeps the settings, like the real page does.
function Harness({ onNextTrack, initial = { effect: 'rain', lightOn: true } }) {
  const [settings, setSettings] = useState(initial);
  return <SceneStage scene={scene} settings={settings} onSettingsChange={setSettings} onNextTrack={onNextTrack} />;
}

describe('SceneStage', () => {
  it('draws every layer image in order', () => {
    const { container } = render(<Harness />);
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(sources).toEqual(scene.layers.map((l) => l.image));
  });

  it('draws a button for each clickable object, placed by its percentages', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Lamp' })).toHaveStyle({ left: '50%', top: '40%', width: '8%', height: '30%' });
    expect(screen.getByRole('button', { name: 'Window' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Radio' })).toBeInTheDocument();
  });

  it('puts the effect on the scene effect layer', () => {
    const { container } = render(<Harness />);
    const layers = container.querySelectorAll('.layer');
    expect(layers[0].querySelector('[data-effect="rain"]')).not.toBeNull();
    expect(layers[1].querySelector('[data-effect]')).toBeNull();
  });

  it('draws no effect when the effect is none', () => {
    const { container } = render(<Harness initial={{ effect: 'none', lightOn: true }} />);
    expect(container.querySelector('[data-effect]')).toBeNull();
  });

  it('clicking the window turns the rain off and on', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Window' }));
    expect(container.querySelector('[data-effect]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Window' }));
    expect(container.querySelector('[data-effect="rain"]')).not.toBeNull();
  });

  it('clicking the lamp switches the lights off and on', async () => {
    render(<Harness />);
    const stage = screen.getByTestId('stage');
    expect(stage).not.toHaveClass('lights-off');
    await userEvent.click(screen.getByRole('button', { name: 'Lamp' }));
    expect(stage).toHaveClass('lights-off');
    await userEvent.click(screen.getByRole('button', { name: 'Lamp' }));
    expect(stage).not.toHaveClass('lights-off');
  });

  it('clicking the radio calls onNextTrack and leaves the scene as it is', async () => {
    const onNextTrack = vi.fn();
    const { container } = render(<Harness onNextTrack={onNextTrack} />);
    await userEvent.click(screen.getByRole('button', { name: 'Radio' }));
    expect(onNextTrack).toHaveBeenCalledTimes(1);
    expect(onNextTrack.mock.calls[0][0].key).toBe('radio');
    expect(container.querySelector('[data-effect="rain"]')).not.toBeNull();
  });

  it('moves far and near layers by different amounts when the mouse moves', () => {
    const { container } = render(<Harness />);
    const stage = screen.getByTestId('stage');
    Object.defineProperty(stage, 'clientWidth', { value: 1000 });
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 562 });

    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 562 });

    const [far, , near] = container.querySelectorAll('.layer');
    const shift = (el) => Math.abs(parseFloat(el.style.transform.match(/translate\((-?[\d.]+)px/)[1]));
    expect(shift(far)).toBeLessThan(shift(near));
  });

  it('puts the layers back in the middle when the mouse leaves', () => {
    const { container } = render(<Harness />);
    const stage = screen.getByTestId('stage');
    Object.defineProperty(stage, 'clientWidth', { value: 1000 });
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 562 });

    fireEvent.pointerMove(stage, { clientX: 1000, clientY: 0 });
    fireEvent.pointerLeave(stage);

    const near = container.querySelectorAll('.layer')[2];
    expect(parseFloat(near.style.transform.match(/translate\((-?[\d.]+)px/)[1])).toBeCloseTo(0);
  });
});
