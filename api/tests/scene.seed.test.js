const Scene = require('../src/models/Scene');
const scenes = require('../src/seed/scenes');
const { validationErrors } = require('./helpers');

describe('scene seed data', () => {
  it('has unique slugs', () => {
    const slugs = scenes.map((s) => s.slug);
    expect(slugs).toContain('night-study');
    expect(new Set(slugs).size).toBe(scenes.length);
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s passes the Scene model validation', async (slug, scene) => {
    expect(await validationErrors(new Scene(scene))).toEqual({});
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s has layers and one object for each kind of click', (slug, scene) => {
    expect(scene.layers.length).toBeGreaterThanOrEqual(4);
    // a big object (the lamp) may be split into several click areas, so compare the kinds, not the count
    expect([...new Set(scene.objects.map((o) => o.action.type))]).toEqual(expect.arrayContaining(['nextTrack', 'toggleEffect', 'toggleLight']));
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s default effect (if it has one) is one of its own effects', (slug, scene) => {
    if (scene.defaultEffect) expect(scene.effects).toContain(scene.defaultEffect);
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s objects and the effect point to layers that exist', (slug, scene) => {
    scene.objects.forEach((object) => expect(object.layer).toBeLessThan(scene.layers.length));
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s draws its effect on one of its own layers', (slug, scene) => {
    expect(scene.effectLayer).toBeGreaterThanOrEqual(0);
    expect(scene.effectLayer).toBeLessThan(scene.layers.length);
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s keeps clickable hotspots off day-only and night-only layers', (slug, scene) => {
    scene.objects.forEach((object) => {
      const layer = scene.layers[object.layer];
      expect(layer.light).toBeFalsy();
      expect(layer.night).toBeFalsy();
    });
  });

  it.each(scenes.map((s) => [s.slug, s]))('%s has no duplicate (name, image) layers', (slug, scene) => {
    const seen = new Set();
    const duplicates = [];
    for (const layer of scene.layers) {
      const key = `${layer.name}::${layer.image ?? ''}`;
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
    expect(duplicates).toEqual([]);
  });
});

describe.each(scenes.map((s) => [s.slug, s]))('%s catalog', (slug, scene) => {
  const catalog = scene.catalog || [];
  const layersOf = (key) => scene.layers.filter((l) => l.item === key);
  const inPicture = (box) => box.x >= 0 && box.y >= 0 && box.x + box.width <= 100 && box.y + box.height <= 100;

  it('has a catalog entry for every layer item', () => {
    scene.layers.filter((l) => l.item).forEach((l) => expect(catalog.map((e) => e.key)).toContain(l.item));
  });

  it('has at least one layer for every catalog entry', () => {
    catalog.forEach((entry) => expect(layersOf(entry.key).length).toBeGreaterThan(0));
  });

  it('keeps every thumbnail in the picture folder of the scene', () => {
    catalog.forEach((entry) => expect(entry.thumb).toMatch(new RegExp(`^/scenes/${slug}/[\\w.-]+\\.webp$`)));
  });

  it('keeps every home and every bounds box inside the picture', () => {
    catalog.forEach((entry) => {
      expect(entry.home.x).toBeGreaterThanOrEqual(0);
      expect(entry.home.x).toBeLessThanOrEqual(100);
      expect(entry.home.y).toBeLessThanOrEqual(100);
      expect(inPicture(entry.bounds)).toBe(true);
    });
  });

  it('puts the contact point of every object inside its surface', () => {
    catalog.forEach((entry) => {
      const { area } = scene.surfaces.find((surface) => surface.key === entry.surface);
      expect(entry.home.x).toBeGreaterThanOrEqual(area.x);
      expect(entry.home.x).toBeLessThanOrEqual(area.x + area.width);
      expect(entry.home.y).toBeGreaterThanOrEqual(area.y);
      expect(entry.home.y).toBeLessThanOrEqual(area.y + area.height);
    });
  });

  it('keeps the starting objects out of the blocked boxes of their surface', () => {
    (scene.surfaces || []).forEach((surface) => {
      (surface.blocked || []).forEach((box) => {
        catalog
          .filter((entry) => entry.surface === surface.key && entry.inDefault)
          .forEach(({ home }) => expect(home.x > box.x && home.x < box.x + box.width && home.y > box.y && home.y < box.y + box.height).toBe(false));
      });
    });
  });
});

describe('underwater-nook decorating', () => {
  const scene = scenes.find((s) => s.slug === 'underwater-nook');
  const layerIndex = (name) => scene.layers.findIndex((l) => l.name === name);

  it('has a seabed that keeps objects off the clam and open water for floating ones', () => {
    expect(scene.surfaces.map((s) => s.key)).toEqual(['seabed', 'water']);
    const seabed = scene.surfaces.find((s) => s.key === 'seabed');
    expect(seabed.blocked.length).toBeGreaterThanOrEqual(1);
    // the clam reaches past the left and top edge of the seabed, so the box does too: the nearest way out is to the right or in front
    const clam = scene.layers[layerIndex('clam lower shell')].box;
    const box = seabed.blocked[0];
    expect(box.x).toBeLessThanOrEqual(seabed.area.x);
    expect(box.y).toBeLessThanOrEqual(seabed.area.y);
    expect(box.x + box.width).toBeGreaterThanOrEqual(clam.x + clam.width);
    expect(box.y + box.height).toBeGreaterThanOrEqual(clam.y + clam.height);
  });

  it('lets people add jellyfish, seahorses and fish in the water and shells and plants on the seabed', () => {
    const surfaceOf = (key) => scene.catalog.find((e) => e.key === key).surface;
    ['jelly', 'seahorse', 'fish'].forEach((key) => expect(surfaceOf(key)).toBe('water'));
    ['starfish', 'conch', 'scallop', 'urchin', 'coral', 'anemone', 'seagrass', 'rocks'].forEach((key) => expect(surfaceOf(key)).toBe('seabed'));
    scene.catalog.forEach((e) => expect(e.inDefault).toBe(false));
  });

  it('keeps every shadow of an object on the same side when it is flipped and hides it at night', () => {
    const shadows = scene.layers.filter((l) => l.item && /shadow$/.test(l.name));
    expect(shadows.length).toBeGreaterThanOrEqual(8);
    shadows.forEach((layer) => { expect(layer.mirror).toBe(false); expect(layer.light).toBe(true); });
  });
});

describe('night-study customization', () => {
  it('keeps every shadow of a movable object on the same side when the object is flipped', () => {
    const shadows = scenes.find((s) => s.slug === 'night-study').layers.filter((l) => l.item && /shadow/.test(l.name));
    expect(shadows.length).toBeGreaterThanOrEqual(10);
    shadows.forEach((layer) => expect(layer.mirror).toBe(false));
  });

  const scene = scenes.find((s) => s.slug === 'night-study');
  const entry = (key) => scene.catalog.find((e) => e.key === key);
  const layerNamed = (name) => scene.layers.findIndex((l) => l.name === name);

  it('has a desk and a window to put objects on', () => {
    expect(scene.surfaces.map((s) => s.key)).toEqual(['desk', 'window']);
  });

  it('draws desk objects before the lamp reflection and window objects before the window frame', () => {
    const surface = (key) => scene.surfaces.find((s) => s.key === key);
    expect(surface('desk').drawAt).toBe(layerNamed('c_lamp_reflection'));
    expect(surface('window').drawAt).toBe(layerNamed('window frame'));
  });

  it('starts with the eight objects that are on the desk and lets a visitor add six more', () => {
    const keys = (filter) => scene.catalog.filter(filter).map((e) => e.key);
    expect(keys((e) => e.inDefault)).toEqual(['plant', 'succulent', 'mug', 'clock', 'sleeve', 'player', 'notepad', 'bookstack']);
    expect(keys((e) => !e.inDefault)).toEqual(['books', 'candle', 'photo', 'cactus', 'stars', 'polaroids']);
  });

  it('puts the desk things on the desk and the stars and polaroids on the window', () => {
    const surfaceOf = (key) => entry(key).surface;
    ['plant', 'succulent', 'mug', 'clock', 'sleeve', 'player', 'books', 'candle', 'photo', 'cactus'].forEach((key) => expect(surfaceOf(key)).toBe('desk'));
    ['stars', 'polaroids'].forEach((key) => expect(surfaceOf(key)).toBe('window'));
  });

  it('keeps the new objects after the old layers, so the layer numbers of the clickable objects stay', () => {
    const firstTemplate = (key) => scene.layers.findIndex((l) => l.item === key);
    ['books', 'candle', 'photo', 'cactus', 'stars', 'polaroids'].forEach((key) => expect(firstTemplate(key)).toBeGreaterThan(layerNamed('film grain')));
  });

  it('lights the candle with a glowing layer that pulses', () => {
    const flame = scene.layers.find((l) => l.name === 'candle flame');
    expect(flame).toMatchObject({ item: 'candle', anim: { name: 'pulse' } });
  });

  it('allows only one player and does not mirror the player or the clock', () => {
    expect(entry('player')).toMatchObject({ unique: true, flippable: false });
    expect(entry('clock')).toMatchObject({ flippable: false });
    expect(scene.catalog.filter((e) => e.unique).map((e) => e.key)).toEqual(['player']);
  });

  it('draws the record sleeve in front of the player, as it leans against it, when the room starts', () => {
    // objects are drawn by the height of their home, nearer (larger y) later
    expect(entry('sleeve').home.y).toBeGreaterThan(entry('player').home.y);
  });

  it('moves the record, the tonearm and the display glow with the player', () => {
    const playerLayers = scene.layers.filter((l) => l.item === 'player').map((l) => l.name);
    expect(playerLayers).toEqual(expect.arrayContaining(['music player', 'record', 'record shine', 'tonearm', 'display glow']));
  });

  it('moves the digits and the glow with the clock', () => {
    const clockLayers = scene.layers.filter((l) => l.item === 'clock').map((l) => l.name);
    expect(clockLayers).toEqual(expect.arrayContaining(['clock', 'clock digits', 'clock glow']));
  });

  it('leaves the lamp, the desk, the fairy lights and the room light in place', () => {
    for (const name of ['desk', 'lamp', 'c_lamp_lit', 'lamp light on the desk', 'fairy lights', 'fairy light glow', 'city glow', 'lamp glow', 'vignette', 'film grain']) {
      expect(scene.layers[layerNamed(name)].item).toBeUndefined();
    }
  });

  it('keeps the music player click area on a layer of the player', () => {
    const hotspot = scene.objects.find((o) => o.key === 'player');
    expect(scene.layers[hotspot.layer].item).toBe('player');
  });
});
