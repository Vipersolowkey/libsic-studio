const dns = require('dns');
const mongoose = require('mongoose');

// Optional: some home networks refuse the DNS lookup that mongodb+srv:// needs.
// If you see "querySrv ECONNREFUSED", set DNS_SERVERS=8.8.8.8,1.1.1.1 in your .env file.
function applyDnsOverride() {
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  }
}

// Connects to MongoDB using the connection string from the .env file.
async function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
  }
  applyDnsOverride();
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

module.exports = { connectDb };
