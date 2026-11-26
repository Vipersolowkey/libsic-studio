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
// It understands only the calls the scene routes make: find().sort().lean() and findOne().lean(),
// and a list of wanted fields such as { _id: 0, slug: 1, name: 1 } (like MongoDB, it then leaves the others out).
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
    find: (filter, fields) => {
      const wanted = fields && typeof fields === 'object' ? Object.keys(fields).filter((key) => fields[key] === 1) : [];
      if (wanted.length === 0) return result(scenes);
      return result(scenes.map((scene) => Object.fromEntries(wanted.filter((key) => key in scene).map((key) => [key, scene[key]]))));
    },
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
    return {
      select: () => Promise.resolve(found),
      lean: () => Promise.resolve(found),
      then: (ok, fail) => Promise.resolve(found).then(ok, fail),
    };
  };
  Room.deleteOne = async (filter) => ({ deletedCount: store.delete(filter.code) ? 1 : 0 });
  Room.estimatedDocumentCount = async () => store.size;
  // find({ owner }) for "my rooms": the documents of one owner, newest change first.
  Room.find = (filter = {}) => {
    let list = [...store.values()].filter((r) => filter.owner === undefined || String(r.owner) === String(filter.owner));
    const query = {
      sort: () => {
        list = list.sort((a, b) => b.updatedAt - a.updatedAt);
        return query;
      },
      limit: (n) => {
        list = list.slice(0, n);
        return query;
      },
      lean: async () => list,
    };
    return query;
  };

  return {
    store,
    restore() {
      delete Room.prototype.save;
      delete Room.findOne;
      delete Room.deleteOne;
      delete Room.estimatedDocumentCount;
      delete Room.find;
    },
  };
}

// The same idea for the Cd model: real Mongoose documents (so the real validation runs) kept in a Map.
// "official" lists CDs that already exist and may not be changed, such as the studio CDs.
function installFakeCdStore(Cd, { official = [] } = {}) {
  const store = new Map();
  Cd.prototype.save = async function save() {
    await this.validate();
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = new Date();
    store.set(this.code, this);
    return this;
  };
  for (const cd of official) store.set(cd.code, new Cd({ ...cd, official: true }));
  Cd.findOne = (filter) => {
    const found = store.get(filter.code) || null;
    return { select: () => Promise.resolve(found), then: (ok, fail) => Promise.resolve(found).then(ok, fail) };
  };
  Cd.find = (filter) => {
    let wanted = [...store.values()].filter((cd) => (filter.official === undefined || cd.official === filter.official) && (filter.owner === undefined || String(cd.owner) === String(filter.owner)));
    const query = {
      sort: () => query,
      limit: (n) => {
        wanted = wanted.slice(0, n);
        return query;
      },
      lean: async () => wanted,
    };
    return query;
  };
  Cd.deleteOne = async (filter) => ({ deletedCount: store.delete(filter.code) ? 1 : 0 });
  Cd.estimatedDocumentCount = async () => store.size;
  return {
    store,
    restore() {
      for (const name of ['save']) delete Cd.prototype[name];
      for (const name of ['findOne', 'find', 'deleteOne', 'estimatedDocumentCount']) delete Cd[name];
    },
  };
}

// A pretend Track model that knows the given tracks ({ _id, title, artist, src, duration, license }).
function fakeTrackModel(tracks) {
  return { find: (filter) => ({ lean: async () => tracks.filter((t) => filter._id.$in.includes(t._id)) }) };
}

// The same idea for the User model: real Mongoose documents kept in a Map, with the one unique rule MongoDB would enforce (the username).
function installFakeUserStore(User) {
  const store = new Map(); // username -> document
  User.prototype.save = async function save() {
    await this.validate();
    const taken = store.get(this.username);
    if (taken && String(taken._id) !== String(this._id)) throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = new Date();
    store.set(this.username, this);
    return this;
  };
  const query = (found) => ({
    select: () => query(found),
    lean: () => Promise.resolve(found ? found.toObject({ virtuals: false }) : null),
    then: (ok, fail) => Promise.resolve(found).then(ok, fail),
  });
  User.findOne = (filter) => query(store.get(filter.username) || null);
  User.findById = (id) => query([...store.values()].find((u) => String(u._id) === String(id)) || null);
  User.countDocuments = async () => store.size;
  return {
    store,
    restore() {
      delete User.prototype.save;
      for (const name of ['findOne', 'findById', 'countDocuments']) delete User[name];
    },
  };
}

module.exports = { validationErrors, fakeSceneModel, installFakeRoomStore, installFakeCdStore, fakeTrackModel, installFakeUserStore };
