const fs = require('fs');
const path = require('path');
const scenes = require('../src/seed/scenes');

// Scene images live in the client's public folder; the API only stores their paths.
const publicDir = path.join(__dirname, '..', '..', 'client', 'public');

describe('scene art', () => {
  const layerFiles = scenes.flatMap((scene) => scene.layers.map((layer) => [scene.slug, layer.image]));

  it.each(layerFiles)('%s: %s exists in client/public', (slug, image) => {
    expect(fs.existsSync(path.join(publicDir, image))).toBe(true);
  });

  it.each(layerFiles)('%s: %s is an SVG image', (slug, image) => {
    const text = fs.readFileSync(path.join(publicDir, image), 'utf8');
    expect(text).toContain('<svg');
    expect(text).toContain('viewBox="0 0 1600 900"');
  });
});
