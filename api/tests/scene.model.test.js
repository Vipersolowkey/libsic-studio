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
});
