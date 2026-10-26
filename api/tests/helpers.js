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
  };
}

module.exports = { validationErrors, fakeSceneModel };
