const Scene = require('../src/models/Scene');
const scenes = require('../src/seed/scenes');
const { validationErrors } = require('./helpers');

describe('scene seed data', () => {
  it('has three scenes with unique slugs', () => {
    expect(scenes).toHaveLength(3);
    const slugs = scenes.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(3);
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s passes the Scene model validation', async (slug, scene) => {
    expect(await validationErrors(new Scene(scene))).toEqual({});
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s has 4 layers and a lamp, window and radio', (slug, scene) => {
    expect(scene.layers).toHaveLength(4);
    expect(scene.objects.map((o) => o.key).sort()).toEqual(['lamp', 'radio', 'window']);
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s default effect is one of its own effects', (slug, scene) => {
    expect(scene.effects).toContain(scene.defaultEffect);
  });
});
