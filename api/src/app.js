const express = require('express');
const cors = require('cors');

// Builds the Express app but does not start listening.
// Keeping this separate from server.js lets the tests call the app without opening a real port.
function createApp() {
  const app = express();

  app.use(cors()); // lets the React site (a different address) call this API
  app.use(express.json()); // lets the API read JSON sent in request bodies

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = { createApp };
