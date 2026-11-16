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

  describe('layer extras', () => {
    const extra = {
      ...scene,
      layers: [
        ...scene.layers,
        { name: 'glow', image: '/scenes/test-room/glow.webp', depth: 0.9, blend: 'screen', light: true, box: { x: 10, y: 20, width: 30, height: 40 } },
        { name: 'record', image: '/scenes/test-room/record.webp', depth: 0.9, anim: { name: 'spin', squash: 0.3, duration: 5 } },
        { name: 'leaf', image: '/scenes/test-room/leaf.webp', depth: 0.9, anim: { name: 'sway', pivot: { x: 50, y: 90 }, duration: 4, delay: -1 } },
        { name: 'clock', kind: 'clock', depth: 0.9, box: { x: 20, y: 80, width: 10, height: 5 }, anim: { name: 'pulse', skew: -6 } },
        { name: 'grain', image: '/scenes/test-room/grain.webp', depth: 0, tile: 20 },
      ],
    };
    const settings = { effect: 'none', lightOn: true };
    const noop = () => {};

    it('places a layer that does not cover the whole scene', () => {
      const { container } = render(<SceneStage scene={extra} settings={settings} onSettingsChange={noop} />);
      const glow = container.querySelectorAll('.layer')[3];
      expect(glow).toHaveStyle({ left: '10%', top: '20%', width: '30%', height: '40%' });
      expect(glow).toHaveAttribute('data-blend', 'screen');
      expect(glow).toHaveAttribute('data-light', 'true');
    });

    it('turns the record inside a squashed box and sways a leaf around its pivot', () => {
      const { container } = render(<SceneStage scene={extra} settings={settings} onSettingsChange={noop} />);
      const spin = container.querySelector('.anim-spin');
      expect(spin.style.getPropertyValue('--squash')).toBe('0.3');
      expect(spin.querySelector('.spin img')).not.toBeNull();
      const leaf = container.querySelector('.anim-sway');
      expect(leaf).toHaveStyle({ transformOrigin: '50% 90%' });
    });

    it('passes distance and amplitude on to the calm movements', () => {
      const calm = {
        ...scene,
        layers: [
          ...scene.layers,
          { name: 'clouds', image: '/scenes/test-room/clouds.webp', depth: 0.1, anim: { name: 'drift', distance: 6, duration: 200 } },
          { name: 'curtain', image: '/scenes/test-room/curtain.webp', depth: 0.6, anim: { name: 'billow', amplitude: 1.4, pivot: { x: 50, y: 0 } } },
          { name: 'cat', image: '/scenes/test-room/cat.webp', depth: 0.9, anim: { name: 'breathe' } },
          { name: 'tail', image: '/scenes/test-room/tail.webp', depth: 0.9, anim: { name: 'flick', amplitude: 6 } },
        ],
      };
      const { container } = render(<SceneStage scene={calm} settings={settings} onSettingsChange={noop} />);
      expect(container.querySelector('.anim-drift').style.getPropertyValue('--distance')).toBe('6%');
      expect(container.querySelector('.anim-billow').style.getPropertyValue('--amp')).toBe('1.4deg');
      expect(container.querySelector('.anim-billow')).toHaveStyle({ transformOrigin: '50% 0%' });
      expect(container.querySelector('.anim-breathe')).not.toBeNull();
      expect(container.querySelector('.anim-flick').style.getPropertyValue('--amp')).toBe('6deg');
    });

    it('draws a curtain wider when the curtains are closed, with its click area inside it', async () => {
      const curtained = {
        ...scene,
        layers: [...scene.layers, { name: 'curtain', image: '/scenes/test-room/curtain.webp', depth: 0.6, curtain: { scale: 2.3, origin: 100 } }],
        objects: [...scene.objects, { key: 'curtains', label: 'Curtains', layer: scene.layers.length, x: 0, y: 0, width: 100, height: 100, action: { type: 'toggleCurtains' } }],
      };
      function Curtained() {
        const [settings, setSettings] = useState({ effect: 'none', lightOn: true, curtainsClosed: false });
        return <SceneStage scene={curtained} settings={settings} onSettingsChange={setSettings} />;
      }
      const { container } = render(<Curtained />);
      const curtain = container.querySelector('.curtain');
      expect(curtain).toHaveStyle({ transformOrigin: '100% 0%' });
      expect(curtain.style.getPropertyValue('--closed-scale')).toBe('2.3');
      expect(screen.getByTestId('stage')).not.toHaveClass('curtains-closed');
      await userEvent.click(screen.getByRole('button', { name: 'Curtains' }));
      expect(screen.getByTestId('stage')).toHaveClass('curtains-closed');
      expect(screen.getByTestId('stage')).not.toHaveClass('lights-off');
      expect(screen.getByRole('button', { name: 'Curtains' })).toHaveClass('is-on');
    });

    it('marks a night layer so that it only shows when the lights are off', () => {
      const nightly = { ...scene, layers: [...scene.layers, { name: 'night sky', image: '/scenes/test-room/night.webp', depth: 0.1, night: true }] };
      const { container } = render(<SceneStage scene={nightly} settings={{ effect: 'none', lightOn: false }} onSettingsChange={noop} />);
      expect(container.querySelector('.layer[data-night="true"]')).not.toBeNull();
      expect(screen.getByTestId('stage')).toHaveClass('lights-off');
    });

    it('lets a fish glide from one point to another, mirrored when asked, and a jellyfish bell throb inside its own trip', () => {
      const fishy = {
        ...scene,
        layers: [
          ...scene.layers,
          { name: 'fish', image: '/scenes/test-room/fish1.webp', depth: 0.5, box: { x: 10, y: 20, width: 8, height: 5 }, glide: { from: { x: -150, y: 0 }, to: { x: 900, y: -40 }, duration: 40 } },
          { name: 'fish left', image: '/scenes/test-room/fish2.webp', depth: 0.5, box: { x: 60, y: 30, width: 8, height: 5 }, glide: { from: { x: 100, y: 0 }, to: { x: -800, y: 20 }, duration: 55, delay: -10, mirror: true } },
          {
            name: 'jelly bell',
            image: '/scenes/test-room/bell.webp',
            depth: 0.3,
            box: { x: 30, y: 20, width: 6, height: 4 },
            glide: { from: { x: 0, y: 600 }, to: { x: 20, y: -300 }, duration: 70, pingpong: true },
            anim: { name: 'throb', duration: 4, pivot: { x: 50, y: 0 }, scaleFrom: { x: 1.05, y: 0.9 }, scaleTo: { x: 0.97, y: 1.06 } },
          },
        ],
      };
      const { container } = render(<SceneStage scene={fishy} settings={settings} onSettingsChange={noop} />);
      const [right, left, jelly] = container.querySelectorAll('.glide');
      expect(right.style.getPropertyValue('--fx')).toBe('-150%');
      expect(right.style.getPropertyValue('--ty')).toBe('-40%');
      expect(right).not.toHaveClass('glide-mirror');
      expect(left).toHaveClass('glide-mirror');
      expect(left.style.getPropertyValue('--delay')).toBe('-10s');
      expect(right).not.toHaveClass('glide-pingpong');
      expect(jelly).toHaveClass('glide-pingpong');
      const bell = jelly.querySelector('.anim-throb');
      expect(bell.style.getPropertyValue('--sy0')).toBe('0.9');
      expect(bell.style.getPropertyValue('--sx1')).toBe('0.97');
      expect(bell).toHaveStyle({ transformOrigin: '50% 0%' });
    });

    it('draws bubbles and plankton when those effects are switched on', () => {
      const watery = { ...scene, effects: ['bubbles', 'plankton'], effectLayer: 0 };
      const { container, rerender } = render(<SceneStage scene={watery} settings={{ effect: 'bubbles', lightOn: true }} onSettingsChange={noop} />);
      expect(container.querySelectorAll('.effect-bubbles i').length).toBeGreaterThan(20);
      rerender(<SceneStage scene={watery} settings={{ effect: 'plankton', lightOn: true }} onSettingsChange={noop} />);
      expect(container.querySelectorAll('.effect-plankton i').length).toBeGreaterThan(20);
    });

    it('lets a scene choose how dark the lights-off dimming is, and draws multiply layers', () => {
      const custom = { ...scene, nightDim: 0, layers: scene.layers.map((l, i) => (i === 0 ? { ...l, blend: 'multiply' } : l)) };
      const { container } = render(<SceneStage scene={custom} settings={{ lightOn: false }} onSettingsChange={noop} />);
      expect(container.querySelector('.dim').style.getPropertyValue('--dim-alpha')).toBe('0');
      expect(container.querySelector('.layer[data-blend="multiply"]')).not.toBeNull();
    });

    it('draws a sweep layer that turns all the time', () => {
      const radar = { ...scene, layers: scene.layers.map((l, i) => (i === 0 ? { ...l, anim: { name: 'sweep', duration: 10 } } : l)) };
      const { container } = render(<SceneStage scene={radar} settings={{ lightOn: true }} onSettingsChange={noop} />);
      expect(container.querySelector('.anim-sweep')).not.toBeNull();
    });

    it('draws floating dust when that effect is switched on', () => {
      const dusty = { ...scene, effects: ['dust'], effectLayer: 0 };
      const { container } = render(<SceneStage scene={dusty} settings={{ effect: 'dust', lightOn: true }} onSettingsChange={noop} />);
      expect(container.querySelectorAll('.effect-dust i').length).toBeGreaterThan(20);
    });

    it('draws the live clock and tiles the grain', () => {
      const { container, getByTestId } = render(<SceneStage scene={extra} settings={settings} onSettingsChange={noop} />);
      expect(getByTestId('clock')).toBeInTheDocument();
      expect(container.querySelector('.clock')).toHaveStyle({ transform: 'skewY(-6deg)' });
      expect(container.querySelector('.tiled')).toHaveStyle({ backgroundSize: '20% auto' });
    });

    it('marks the stage as having lamp light, and as paused when the music is not playing', () => {
      const { rerender } = render(<SceneStage scene={extra} settings={settings} onSettingsChange={noop} />);
      const stage = screen.getByTestId('stage');
      expect(stage).toHaveClass('has-lights');
      expect(stage).not.toHaveClass('paused');
      rerender(<SceneStage scene={extra} settings={settings} onSettingsChange={noop} playing={false} />);
      expect(stage).toHaveClass('paused');
    });
  });

  describe('placed objects', () => {
    // Layers 2 to 4 belong to a mug and a radio that a visitor may move; the desk (1) is fixed and the effect sits on it.
    const placing = {
      ...scene,
      layers: [
        { name: 'sky', image: '/sky.webp', depth: 0 },
        { name: 'desk', image: '/desk.webp', depth: 0.9 },
        { name: 'mug shadow', image: '/mug-shadow.webp', depth: 0.9, box: { x: 36, y: 78, width: 8, height: 4 }, item: 'mug' },
        { name: 'mug', image: '/mug.webp', depth: 0.9, box: { x: 37, y: 72, width: 6, height: 8 }, item: 'mug' },
        { name: 'radio', image: '/radio.webp', depth: 0.9, box: { x: 50, y: 60, width: 10, height: 10 }, item: 'radio' },
        { name: 'lamp', image: '/lamp.webp', depth: 0.9 },
      ],
      objects: [{ key: 'radio', label: 'Radio', layer: 4, x: 0, y: 0, width: 100, height: 100, action: { type: 'nextTrack' } }],
      surfaces: [{ key: 'desk', area: { x: 0, y: 60, width: 100, height: 40 }, drawAt: 1, perspective: { farY: 60, nearY: 100, farScale: 1, nearScale: 1 } }],
      catalog: [
        { key: 'mug', surface: 'desk', home: { x: 40, y: 80 }, bounds: { x: 37, y: 72, width: 6, height: 8 }, flippable: true, inDefault: true, scale: { min: 0.5, max: 2 } },
        { key: 'radio', surface: 'desk', home: { x: 55, y: 70 }, bounds: { x: 50, y: 60, width: 10, height: 10 }, flippable: false, inDefault: true, scale: { min: 0.5, max: 2 } },
      ],
      effectLayer: 1,
    };
    const mug = { id: 'mug', key: 'mug', x: 40, y: 80, scale: 1, flip: false };
    const radio = { id: 'radio', key: 'radio', x: 55, y: 70, scale: 1, flip: false };
    const settings = { effect: 'rain', lightOn: true };
    const noop = () => {};
    const draw = (props) => render(<SceneStage scene={placing} settings={settings} onSettingsChange={noop} {...props} />);
    const layerShowing = (container, src) => container.querySelector(`img[src="${src}"]`).closest('.layer');

    it('draws the default arrangement at the home of each object when there are no items', () => {
      const { container } = draw({ items: null });
      expect(layerShowing(container, '/mug.webp')).toHaveStyle({ left: '37%', top: '72%', width: '6%', height: '8%' });
      expect(container.querySelectorAll('img')).toHaveLength(6);
    });

    it('moves the layers of an object with its item', () => {
      const { container } = draw({ items: [{ ...mug, x: 60, y: 90, scale: 2 }, radio] });
      expect(layerShowing(container, '/mug.webp')).toHaveStyle({ left: '54%', top: '74%', width: '12%', height: '16%' });
    });

    it('draws one set of layers for every item, and none for a removed object', () => {
      const { container } = draw({ items: [mug, { ...mug, id: 'mug2', x: 70 }] });
      expect(container.querySelectorAll('img[src="/mug.webp"]')).toHaveLength(2);
      expect(container.querySelector('img[src="/radio.webp"]')).toBeNull();
    });

    it('marks the layers of an item with its id', () => {
      const { container } = draw({ items: [mug, { ...mug, id: 'mug2', x: 70 }] });
      const ids = [...container.querySelectorAll('[data-item]')].map((el) => el.getAttribute('data-item'));
      expect(ids).toEqual(['mug', 'mug', 'mug2', 'mug2']);
    });

    it('mirrors the pictures of a flipped item', () => {
      const { container } = draw({ items: [{ ...mug, flip: true }] });
      expect(layerShowing(container, '/mug.webp').querySelector('.flip')).toHaveStyle({ transform: 'scaleX(-1)' });
      expect(container.querySelector('.flip img[src="/mug-shadow.webp"]')).not.toBeNull();
    });

    it('does not mirror an item that is not flipped', () => {
      const { container } = draw({ items: [mug] });
      expect(container.querySelector('.flip')).toBeNull();
    });

    it('makes the click area of the radio follow its moved layer', async () => {
      const onNextTrack = vi.fn();
      const { container } = draw({ items: [{ ...radio, x: 20, y: 90 }], onNextTrack });
      const button = screen.getByRole('button', { name: 'Radio' });
      expect(button.closest('.layer')).toBe(layerShowing(container, '/radio.webp'));
      expect(button.closest('.layer')).toHaveStyle({ left: '15%', top: '80%' });
      await userEvent.click(button);
      expect(onNextTrack).toHaveBeenCalledTimes(1);
    });

    it('keeps the effect on its own layer, wherever the items are drawn', () => {
      const { container } = draw({ items: [mug, radio] });
      expect(layerShowing(container, '/desk.webp').querySelector('[data-effect="rain"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-effect]')).toHaveLength(1);
    });

    it('does not draw items whose object is not in the scene', () => {
      const { container } = draw({ items: [{ ...mug, key: 'teapot' }] });
      expect(container.querySelectorAll('img')).toHaveLength(3);
    });

    it('draws what it is given on top of every layer, inside the stage', () => {
      draw({ children: <div data-testid="on-top" /> });
      const stage = screen.getByTestId('stage');
      expect(stage.contains(screen.getByTestId('on-top'))).toBe(true);
      expect(stage.lastElementChild).toBe(screen.getByTestId('on-top'));
    });

    it('switches the click areas off while frozen, so decorating cannot start the music', async () => {
      const onNextTrack = vi.fn();
      draw({ items: [radio], frozen: true, onNextTrack });
      expect(screen.getByRole('button', { name: 'Radio' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Radio' }));
      expect(onNextTrack).not.toHaveBeenCalled();
    });

    it('stops the layers following the mouse while frozen', () => {
      const { container } = draw({ items: [mug, radio], frozen: true });
      const stage = screen.getByTestId('stage');
      Object.defineProperty(stage, 'clientWidth', { value: 1000 });
      stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 562 });

      fireEvent.pointerMove(stage, { clientX: 1000, clientY: 562 });

      container.querySelectorAll('.layer').forEach((layer) => expect(layer.style.transform).not.toMatch(/translate\(-?[1-9]/));
    });

    it('keeps the layers still while the whole picture is shown', () => {
      const { container } = draw({ items: [mug, radio], still: true });
      const stage = screen.getByTestId('stage');
      Object.defineProperty(stage, 'clientWidth', { value: 1000 });
      stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 562 });

      fireEvent.pointerMove(stage, { clientX: 1000, clientY: 562 });

      container.querySelectorAll('.layer').forEach((layer) => expect(layer.style.transform).not.toMatch(/translate\(-?[1-9]/));
    });

    it('puts the layers back in the middle when it becomes frozen', () => {
      const { container, rerender } = draw({ items: [mug] });
      const stage = screen.getByTestId('stage');
      Object.defineProperty(stage, 'clientWidth', { value: 1000 });
      stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 562 });
      fireEvent.pointerMove(stage, { clientX: 1000, clientY: 562 });

      rerender(<SceneStage scene={placing} settings={settings} onSettingsChange={noop} items={[mug]} frozen />);

      const near = container.querySelectorAll('.layer')[1];
      expect(parseFloat(near.style.transform.match(/translate\((-?[\d.]+)px/)[1])).toBeCloseTo(0);
    });
  });
});
