// Part of: Room picture: light, effect and curtains settings.
// Used by: Controls.jsx, RoomScreen.jsx, SceneStage.jsx.
// The room settings a saved room remembers:
//   effect: 'none' or one of the scene's effects | lightOn: true = day, false = night | curtainsClosed: boolean
export function defaultSettings(scene) {
  return { effect: scene.defaultEffect || 'none', lightOn: true, curtainsClosed: false };
}

// The effect actually drawn. A saved room may hold an effect its scene no longer has: then the scene's default is used. 'none' stays 'none'.
export function activeEffect(scene, effect) {
  if (!effect || effect === 'none') return 'none';
  if (scene.effects?.includes(effect)) return effect;
  return scene.defaultEffect && scene.effects?.includes(scene.defaultEffect) ? scene.defaultEffect : 'none';
}

// New settings after a click on an object (pure: returns a new object). nextTrack changes nothing here.
export function applyObjectAction(settings, object) {
  const { type, effect } = object.action;
  if (type === 'toggleLight') return { ...settings, lightOn: !settings.lightOn };
  if (type === 'toggleCurtains') return { ...settings, curtainsClosed: !settings.curtainsClosed };
  if (type === 'toggleEffect') return { ...settings, effect: settings.effect === effect ? 'none' : effect };
  return settings;
}
