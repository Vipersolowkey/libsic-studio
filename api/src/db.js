const mongoose = require('mongoose');

// Connects to MongoDB using the connection string from the .env file.
async function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

module.exports = { connectDb };
