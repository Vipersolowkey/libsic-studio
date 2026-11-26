// Part of: API core: MongoDB connection.
// Used by: seedMusic.js, seedScenes.js, server.js.
const dns = require('dns');
const mongoose = require('mongoose');

// Optional fix: some home networks block the DNS lookup that mongodb+srv:// needs.
// If you see "querySrv ECONNREFUSED", set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env.
function applyDnsOverride() {
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  }
}

// Connects to MongoDB. uri = MONGODB_URI from .env (it holds the password: never commit or share it).
async function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
  }
  applyDnsOverride();
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

module.exports = { connectDb };
