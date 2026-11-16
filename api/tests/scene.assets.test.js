const fs = require('fs');
const path = require('path');
const scenes = require('../src/seed/scenes');

// Scene images live in the client's public folder; the API only stores their paths.
const publicDir = path.join(__dirname, '..', '..', 'client', 'public');

describe('scene art', () => {
  // A clock layer draws itself and has no picture file.
  const layerFiles = scenes.flatMap((scene) =>
    scene.layers.filter((layer) => layer.image).map((layer) => [scene.slug, layer.image])
  );

  it.each(layerFiles)('%s: %s exists in client/public', (slug, image) => {
    expect(fs.existsSync(path.join(publicDir, image))).toBe(true);
  });

  const thumbFiles = scenes.flatMap((scene) => (scene.catalog || []).map((entry) => [scene.slug, entry.thumb]));

  it.each(thumbFiles)('%s: the tray picture %s exists in client/public', (slug, thumb) => {
    expect(fs.existsSync(path.join(publicDir, thumb))).toBe(true);
  });

  it.each(layerFiles)('%s: %s is a WebP image', (slug, image) => {
    expect(image).toMatch(/\.webp$/);
  });
});
