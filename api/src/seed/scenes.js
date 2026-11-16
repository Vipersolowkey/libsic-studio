// The scenes of the site, one file each because every scene has many layers.
// Image files live in client/public/scenes/<slug>/. Object positions are percentages, and
// "layer" is the index of the layer the object is drawn on (0 = first layer).
// Every scene has one object for each kind of click: toggleLight, toggleEffect, nextTrack.
module.exports = [require('./nightStudy'), require('./goldenLoft'), require('./underwaterNook')];
