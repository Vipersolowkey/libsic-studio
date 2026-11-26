// Part of: API core: start-up (npm start).
// Uses: app.js, db.js.
// Entry point: `npm start`. Needs MONGODB_URI in api/.env; PORT is optional (default 4000).
require('dotenv').config({ quiet: true }); // loads .env into process.env
const { createApp } = require('./app');
const { connectDb } = require('./db');
const { initMonitoring, flushMonitoring, reportError } = require('./monitoring');

initMonitoring(); // error reporting to Sentry, only when SENTRY_DSN is set

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDb(process.env.MONGODB_URI);
  createApp().listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch(async (err) => {
  console.error('Failed to start:', err.message);
  reportError(err, 'startup');
  await flushMonitoring();
  process.exit(1);
});
