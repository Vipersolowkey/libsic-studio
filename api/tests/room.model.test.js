const Room = require('../src/models/Room');
const { validationErrors } = require('./helpers');

const validRoom = () => ({
  code: 'abc12345',
  editKeyHash: 'hash-of-the-edit-key',
  sceneSlug: 'rainy-cafe',
});

describe('Room model', () => {
  it('accepts a valid room and fills in the defaults', async () => {
    const room = new Room(validRoom());
    expect(await validationErrors(room)).toEqual({});
    expect(room.name).toBe('Untitled room');
    expect(room.cdCode).toBeNull();
    expect(room.settings.effect).toBe('none');
    expect(room.settings.lightOn).toBe(true);
    expect(room.settings.volume).toBe(0.7);
  });

  it('requires a code, an edit key hash and a scene', async () => {
    const errors = await validationErrors(new Room({}));
    expect(errors.code).toBeDefined();
    expect(errors.editKeyHash).toBeDefined();
    expect(errors.sceneSlug).toBeDefined();
  });

  it('rejects an unknown effect in the settings', async () => {
    const room = new Room({ ...validRoom(), settings: { effect: 'tornado' } });
    expect((await validationErrors(room))['settings.effect']).toBeDefined();
  });

  it('rejects a volume outside 0 to 1', async () => {
    const room = new Room({ ...validRoom(), settings: { volume: 3 } });
    expect((await validationErrors(room))['settings.volume']).toBeDefined();
  });

  it('rejects a very long room name', async () => {
    const room = new Room({ ...validRoom(), name: 'x'.repeat(61) });
    expect((await validationErrors(room)).name).toBeDefined();
  });
});
