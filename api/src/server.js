require('dotenv').config({ quiet: true }); // reads the .env file into process.env
const { createApp } = require('./app');
const { connectDb } = require('./db');

const PORT = process.env.PORT || 4000;

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
