// The things a visitor can change in a room. These are also what a saved room remembers.
//   effect: 'none' or one of the scene's effects (rain, snow, fireflies, stars, dust)
//   lightOn: true for day, false for night (the sunlight goes out, the night layers come in)
//   curtainsClosed: true when the curtains are drawn
export function defaultSettings(scene) {
  return { effect: scene.defaultEffect || 'none', lightOn: true, curtainsClosed: false };
}

// Works out the new settings after a click on an object. It returns a new object and
// never changes the old one. Objects that play music (nextTrack) do not change the settings.
export function applyObjectAction(settings, object) {
  const { type, effect } = object.action;
  if (type === 'toggleLight') return { ...settings, lightOn: !settings.lightOn };
  if (type === 'toggleCurtains') return { ...settings, curtainsClosed: !settings.curtainsClosed };
  if (type === 'toggleEffect') return { ...settings, effect: settings.effect === effect ? 'none' : effect };
  return settings;
}
