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

module.exports = { validationErrors };
