const Scene = require('../src/models/Scene');
const { validationErrors } = require('./helpers');

const validScene = () => ({
  slug: 'test-room',
  name: 'Test room',
  layers: [{ name: 'sky', image: '/scenes/test-room/layer-1.svg', depth: 0.1 }],
  objects: [
    { key: 'lamp', label: 'Lamp', layer: 0, x: 10, y: 20, width: 5, height: 8, action: { type: 'toggleLight' } },
  ],
  effects: ['rain'],
  defaultEffect: 'rain',
});

describe('Scene model', () => {
  it('accepts a valid scene', async () => {
    expect(await validationErrors(new Scene(validScene()))).toEqual({});
  });

  it('requires a slug, a name and at least one layer', async () => {
    const errors = await validationErrors(new Scene({}));
    expect(errors.slug).toBeDefined();
    expect(errors.name).toBeDefined();
    expect(errors.layers).toBeDefined();
  });

  it('rejects a layer depth outside 0 to 1', async () => {
    const data = validScene();
    data.layers[0].depth = 1.5;
    expect((await validationErrors(new Scene(data)))['layers.0.depth']).toBeDefined();
  });

  it('rejects an unknown action type', async () => {
    const data = validScene();
    data.objects[0].action.type = 'explode';
    expect((await validationErrors(new Scene(data)))['objects.0.action.type']).toBeDefined();
  });

  it('requires an effect name when the action is toggleEffect', async () => {
    const data = validScene();
    data.objects[0].action = { type: 'toggleEffect' };
    expect((await validationErrors(new Scene(data)))['objects.0.action.effect']).toBeDefined();
  });

  it('rejects an object placed outside the scene (percent values 0 to 100)', async () => {
    const data = validScene();
    data.objects[0].x = 120;
    expect((await validationErrors(new Scene(data)))['objects.0.x']).toBeDefined();
  });

  it('rejects an unknown effect', async () => {
    const data = validScene();
    data.effects = ['tornado'];
    expect(Object.keys(await validationErrors(new Scene(data))).length).toBeGreaterThan(0);
  });

  it('rejects an object that points to a layer the scene does not have', async () => {
    const data = validScene();
    data.objects[0].layer = 5;
    expect(Object.keys(await validationErrors(new Scene(data))).length).toBeGreaterThan(0);
  });

  it('requires every object to say which layer it sits on', async () => {
    const data = validScene();
    delete data.objects[0].layer;
    expect((await validationErrors(new Scene(data)))['objects.0.layer']).toBeDefined();
  });

  it('draws effects on the first layer unless the scene says otherwise', () => {
    expect(new Scene(validScene()).effectLayer).toBe(0);
  });

  it('rejects an effect layer the scene does not have', async () => {
    const data = validScene();
    data.effectLayer = 3;
    expect(Object.keys(await validationErrors(new Scene(data))).length).toBeGreaterThan(0);
  });

  describe('layer extras', () => {
    it('accepts a layer with a box, a blend, a light flag and an animation', async () => {
      const data = validScene();
      data.layers.push({
        name: 'record',
        image: '/scenes/test-room/record.webp',
        depth: 0.9,
        box: { x: 10, y: 60, width: 15, height: 15 },
        blend: 'screen',
        light: true,
        anim: { name: 'spin', squash: 0.27, duration: 5 },
      });
      expect(await validationErrors(new Scene(data))).toEqual({});
    });

    it('accepts the calm animations and their distance and amplitude', async () => {
      const data = validScene();
      data.layers.push(
        { name: 'clouds', image: '/scenes/test-room/clouds.webp', depth: 0.1, anim: { name: 'drift', distance: 6, duration: 200 } },
        { name: 'curtain', image: '/scenes/test-room/curtain.webp', depth: 0.6, anim: { name: 'billow', amplitude: 1.4, pivot: { x: 50, y: 0 }, duration: 7 } },
        { name: 'cat', image: '/scenes/test-room/cat.webp', depth: 0.9, anim: { name: 'breathe', pivot: { x: 50, y: 100 }, duration: 4 } },
        { name: 'tail', image: '/scenes/test-room/tail.webp', depth: 0.9, anim: { name: 'flick', amplitude: 6, duration: 9 } }
      );
      expect(await validationErrors(new Scene(data))).toEqual({});
    });

    it('accepts a night layer and a curtain, and rejects a curtain that grows more than four times', async () => {
    const data = validScene();
    data.layers[0].night = true;
    data.layers[0].curtain = { scale: 2.3, origin: 100 };
    expect(await validationErrors(new Scene(data))).toEqual({});
    data.layers[0].curtain = { scale: 5, origin: 0 };
    expect((await validationErrors(new Scene(data)))['layers.0.curtain.scale']).toBeDefined();
  });

  it('accepts a multiply layer and a nightDim between 0 and 1, and rejects one above 1', async () => {
    const data = validScene();
    data.layers[0].blend = 'multiply';
    data.nightDim = 0;
    expect(await validationErrors(new Scene(data))).toEqual({});
    data.nightDim = 1.5;
    expect((await validationErrors(new Scene(data)))['nightDim']).toBeDefined();
  });

  it('accepts the sweep movement (a radar beam)', async () => {
    const data = validScene();
    data.layers[0].anim = { name: 'sweep', duration: 10 };
    expect(await validationErrors(new Scene(data))).toEqual({});
  });

  it('accepts a glide and a throb, and rejects a glide with a missing end', async () => {
    const data = validScene();
    data.layers[0].glide = { from: { x: -150, y: 0 }, to: { x: 900, y: -40 }, duration: 40, mirror: true };
    data.layers[0].anim = { name: 'throb', scaleFrom: { x: 1.05, y: 0.9 }, scaleTo: { x: 0.97, y: 1.06 }, duration: 4 };
    expect(await validationErrors(new Scene(data))).toEqual({});
    data.layers[0].glide = { from: { x: -150 }, to: { x: 900, y: -40 }, duration: 40 };
    expect((await validationErrors(new Scene(data)))['layers.0.glide.from.y']).toBeDefined();
    data.layers[0].glide = { from: { x: 0, y: 10 }, to: { x: 4, y: -90 }, duration: 70, pingpong: true };
    expect(await validationErrors(new Scene(data))).toEqual({});
  });

  it('accepts the water effects', async () => {
    const data = validScene();
    data.effects = ['bubbles', 'plankton'];
    data.defaultEffect = 'bubbles';
    expect(await validationErrors(new Scene(data))).toEqual({});
  });

  it('rejects a drift that travels further than the layer is wide', async () => {
      const data = validScene();
      data.layers[0].anim = { name: 'drift', distance: 400 };
      expect((await validationErrors(new Scene(data)))['layers.0.anim.distance']).toBeDefined();
    });

    it('accepts a clock layer without an image', async () => {
      const data = validScene();
      data.layers.push({ name: 'clock', kind: 'clock', depth: 0.9, box: { x: 20, y: 80, width: 5, height: 5 } });
      expect(await validationErrors(new Scene(data))).toEqual({});
    });

    it('still requires an image for a normal layer', async () => {
      const data = validScene();
      delete data.layers[0].image;
      expect((await validationErrors(new Scene(data)))['layers.0.image']).toBeDefined();
    });

    it('rejects an unknown animation, an unknown blend and a box outside the scene', async () => {
      const data = validScene();
      data.layers[0].anim = { name: 'explode' };
      data.layers[0].blend = 'overlay';
      data.layers[0].box = { x: 10, y: 10, width: 120, height: 5 };
      const errors = await validationErrors(new Scene(data));
      expect(errors['layers.0.anim.name']).toBeDefined();
      expect(errors['layers.0.blend']).toBeDefined();
      expect(errors['layers.0.box.width']).toBeDefined();
    });
  });
});

describe('Scene catalog and surfaces', () => {
  // A scene with a desk and one movable mug whose layers are templates (they carry "item").
  const sceneWithCatalog = () => {
    const data = validScene();
    data.layers.push({ name: 'mug', image: '/scenes/test-room/mug.webp', depth: 0.9, box: { x: 40, y: 80, width: 6, height: 8 }, item: 'mug' });
    data.layers.push({ name: 'frame', image: '/scenes/test-room/frame.webp', depth: 0.5 });
    data.surfaces = [
      { key: 'desk', area: { x: 2, y: 70, width: 96, height: 28 }, drawAt: 2, perspective: { farY: 70, nearY: 98, farScale: 0.8, nearScale: 1.25 } },
    ];
    data.catalog = [
      {
        key: 'mug',
        label: 'Mug',
        surface: 'desk',
        home: { x: 43, y: 88 },
        bounds: { x: 40, y: 80, width: 6, height: 8 },
        thumb: '/scenes/test-room/mug.webp',
        flippable: true,
        unique: false,
        inDefault: true,
        scale: { min: 0.5, max: 2 },
      },
    ];
    return data;
  };

  it('accepts a scene with a surface, a catalog entry and a layer that names it', async () => {
    expect(await validationErrors(new Scene(sceneWithCatalog()))).toEqual({});
  });

  it('has no catalog and no surfaces by default', () => {
    const scene = new Scene(validScene());
    expect(scene.catalog).toHaveLength(0);
    expect(scene.surfaces).toHaveLength(0);
  });

  it('rejects a catalog entry whose surface does not exist', async () => {
    const data = sceneWithCatalog();
    data.catalog[0].surface = 'ceiling';
    expect((await validationErrors(new Scene(data))).catalog).toBeDefined();
  });

  it('rejects a layer whose item is not in the catalog', async () => {
    const data = sceneWithCatalog();
    data.layers[1].item = 'teapot';
    expect((await validationErrors(new Scene(data))).layers).toBeDefined();
  });

  it('accepts mirror: false on an item layer (a shadow that must not flip with its object)', async () => {
    const data = sceneWithCatalog();
    data.layers[1].mirror = false;
    expect(await validationErrors(new Scene(data))).toEqual({});
    expect(new Scene(data).layers[1].mirror).toBe(false);
  });

  it('rejects an item layer without a box, because it could not be moved', async () => {
    const data = sceneWithCatalog();
    delete data.layers[1].box;
    expect((await validationErrors(new Scene(data))).layers).toBeDefined();
  });

  it('rejects two catalog entries with the same key', async () => {
    const data = sceneWithCatalog();
    data.catalog.push({ ...data.catalog[0] });
    expect((await validationErrors(new Scene(data))).catalog).toBeDefined();
  });

  it('rejects a surface whose drawAt is not a layer of the scene', async () => {
    const data = sceneWithCatalog();
    data.surfaces[0].drawAt = 9;
    expect((await validationErrors(new Scene(data))).surfaces).toBeDefined();
  });

  it('rejects a catalog home outside its surface area', async () => {
    const data = sceneWithCatalog();
    data.catalog[0].home.y = 50;
    expect((await validationErrors(new Scene(data))).catalog).toBeDefined();
  });

  it('rejects a scale range where min is above max or min is not above 0', async () => {
    const data = sceneWithCatalog();
    data.catalog[0].scale = { min: 2, max: 1 };
    expect((await validationErrors(new Scene(data))).catalog).toBeDefined();
    data.catalog[0].scale = { min: 0, max: 1 };
    expect((await validationErrors(new Scene(data)))['catalog.0.scale.min']).toBeDefined();
  });

  it('has no blocked boxes on a surface by default', () => {
    expect(new Scene(sceneWithCatalog()).surfaces[0].blocked).toHaveLength(0);
  });

  it('accepts blocked boxes on a surface and keeps them', async () => {
    const data = sceneWithCatalog();
    data.surfaces[0].blocked = [{ x: 40, y: 80, width: 20, height: 10 }];
    const scene = new Scene(data);
    expect(await validationErrors(scene)).toEqual({});
    expect(scene.toObject().surfaces[0].blocked).toEqual([{ x: 40, y: 80, width: 20, height: 10 }]);
  });

  it('rejects a blocked box that is outside 0 to 100 percent or misses a side', async () => {
    const data = sceneWithCatalog();
    data.surfaces[0].blocked = [{ x: 40, y: 80, width: 120, height: 10 }, { x: 1, y: 2, width: 3 }];
    const errors = await validationErrors(new Scene(data));
    expect(errors['surfaces.0.blocked.0.width']).toBeDefined();
    expect(errors['surfaces.0.blocked.1.height']).toBeDefined();
  });

  it('rejects a perspective with a scale of 0 or less', async () => {
    const data = sceneWithCatalog();
    data.surfaces[0].perspective.farScale = 0;
    expect((await validationErrors(new Scene(data)))['surfaces.0.perspective.farScale']).toBeDefined();
  });
});
