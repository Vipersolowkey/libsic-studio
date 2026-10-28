// The things a visitor can change in a room. These are also what a saved room remembers.
//   effect: 'none' or one of the scene's effects (rain, snow, fireflies, stars)
//   lightOn: true or false
export function defaultSettings(scene) {
  return { effect: scene.defaultEffect || 'none', lightOn: true };
}

// Works out the new settings after a click on an object. It returns a new object and
// never changes the old one. Objects that play music (nextTrack) do not change the settings.
export function applyObjectAction(settings, object) {
  const { type, effect } = object.action;
  if (type === 'toggleLight') return { ...settings, lightOn: !settings.lightOn };
  if (type === 'toggleEffect') return { ...settings, effect: settings.effect === effect ? 'none' : effect };
  return settings;
}
