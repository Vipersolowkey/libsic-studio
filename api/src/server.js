require('dotenv').config({ quiet: true }); // reads the .env file into process.env
const { createApp } = require('./app');
const { connectDb } = require('./db');

const PORT = process.env.PORT || 4000;

// Optional: some home networks refuse the DNS lookup that mongodb+srv:// needs.
// If you see "querySrv ECONNREFUSED", set DNS_SERVERS=8.8.8.8,1.1.1.1 in your .env file.
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

async function main() {
  await connectDb(process.env.MONGODB_URI);
  createApp().listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
