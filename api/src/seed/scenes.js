// Part of: Scenes: the list of the five rooms.
// Uses: auroraObservatory.js, cloverMeadow.js, goldenLoft.js, nightStudy.js, underwaterNook.js.
// Used by: seedScenes.js.
// The list of scenes (one file each, they are long). The order here is not the menu order: the API sorts by name.
// Images live in client/public/scenes/<slug>/. An object's `layer` is the index of the layer it is drawn on (0 = first).
// To add a scene: create its file, list it here, run `npm run seed:scenes`.
module.exports = [require('./nightStudy'), require('./goldenLoft'), require('./underwaterNook'), require('./cloverMeadow'), require('./auroraObservatory')];
