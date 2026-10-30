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
  const svgFiles = layerFiles.filter(([, image]) => image.endsWith('.svg'));

  it.each(layerFiles)('%s: %s exists in client/public', (slug, image) => {
    expect(fs.existsSync(path.join(publicDir, image))).toBe(true);
  });

  const thumbFiles = scenes.flatMap((scene) => (scene.catalog || []).map((entry) => [scene.slug, entry.thumb]));

  it.each(thumbFiles)('%s: the tray picture %s exists in client/public', (slug, thumb) => {
    expect(fs.existsSync(path.join(publicDir, thumb))).toBe(true);
  });

  it.each(layerFiles)('%s: %s is an SVG or WebP image', (slug, image) => {
    expect(image).toMatch(/\.(svg|webp)$/);
  });

  it.each(svgFiles)('%s: %s is a 1600 x 900 SVG', (slug, image) => {
    const text = fs.readFileSync(path.join(publicDir, image), 'utf8');
    expect(text).toContain('<svg');
    expect(text).toContain('viewBox="0 0 1600 900"');
  });
});
