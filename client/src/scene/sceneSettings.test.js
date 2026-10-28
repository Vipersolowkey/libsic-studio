import { describe, expect, it } from 'vitest';
import { applyObjectAction, defaultSettings } from './sceneSettings.js';
import { scene } from '../test/fixtures.js';

const [windowObject, lamp, radio] = scene.objects;

describe('defaultSettings', () => {
  it('starts with the scene default effect and the light on', () => {
    expect(defaultSettings(scene)).toEqual({ effect: 'rain', lightOn: true });
  });

  it('uses no effect when the scene has no default', () => {
    expect(defaultSettings({ ...scene, defaultEffect: undefined }).effect).toBe('none');
  });
});

describe('applyObjectAction', () => {
  const start = { effect: 'rain', lightOn: true };

  it('the lamp switches the light off and on again', () => {
    const off = applyObjectAction(start, lamp);
    expect(off.lightOn).toBe(false);
    expect(applyObjectAction(off, lamp).lightOn).toBe(true);
  });

  it('the window turns its effect off when it is on, and on when it is off', () => {
    const off = applyObjectAction(start, windowObject);
    expect(off.effect).toBe('none');
    expect(applyObjectAction(off, windowObject).effect).toBe('rain');
  });

  it('the window switches from another effect to its own', () => {
    expect(applyObjectAction({ effect: 'snow', lightOn: true }, windowObject).effect).toBe('rain');
  });

  it('the radio does not change the settings', () => {
    expect(applyObjectAction(start, radio)).toBe(start);
  });

  it('does not change the object it was given', () => {
    const frozen = Object.freeze({ ...start });
    expect(() => applyObjectAction(frozen, lamp)).not.toThrow();
  });
});
