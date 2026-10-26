// Returns the validation errors of a Mongoose document as an object keyed by field path.
// An empty object means the document is valid.
async function validationErrors(doc) {
  try {
    await doc.validate();
    return {};
  } catch (err) {
    return err.errors;
  }
}

// A pretend Scene model for route tests, so they run without a real database.
// It understands only the calls the scene routes make: find().sort().lean() and findOne().lean().
// Pass `fail: true` to make every call fail, like a database that is down.
function fakeSceneModel(scenes, { fail = false } = {}) {
  const result = (value) => ({
    sort() {
      return this;
    },
    lean() {
      return fail ? Promise.reject(new Error('database is down')) : Promise.resolve(value);
    },
  });
  return {
    find: () => result(scenes),
    findOne: (filter) => result(scenes.find((s) => s.slug === filter.slug) || null),
    exists: async (filter) => {
      if (fail) throw new Error('database is down');
      return scenes.some((s) => s.slug === filter.slug) ? { _id: 1 } : null;
    },
  };
}

// Pretend database for the Room model. The documents are real Mongoose documents (so the real
// validation runs), but "saving" just puts them in a Map instead of talking to MongoDB.
// duplicateFirst: how many saves should fail with "this code already exists" (MongoDB error 11000).
function installFakeRoomStore(Room, { duplicateFirst = 0 } = {}) {
  const store = new Map();
  let duplicatesLeft = duplicateFirst;

  Room.prototype.save = async function save() {
    await this.validate();
    if (duplicatesLeft > 0) {
      duplicatesLeft -= 1;
      throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    }
    this.createdAt = this.createdAt || new Date(); // Mongoose sets these two when saving for real
    this.updatedAt = new Date();
    store.set(this.code, this);
    return this;
  };
  Room.findOne = (filter) => {
    const found = store.get(filter.code) || null;
    return { select: () => Promise.resolve(found), then: (ok, fail) => Promise.resolve(found).then(ok, fail) };
  };
  Room.deleteOne = async (filter) => ({ deletedCount: store.delete(filter.code) ? 1 : 0 });

  return {
    store,
    restore() {
      delete Room.prototype.save;
      delete Room.findOne;
      delete Room.deleteOne;
    },
  };
}

module.exports = { validationErrors, fakeSceneModel, installFakeRoomStore };
