const express = require('express');
const cors = require('cors');
const scenesRouter = require('./routes/scenes');

// Builds the Express app but does not start listening.
// Keeping this separate from server.js lets the tests call the app without opening a real port.
// "models" lets a test swap in a pretend database; the real server passes nothing.
function createApp(models = {}) {
  const Scene = models.Scene || require('./models/Scene');
  const app = express();

  app.use(cors()); // lets the React site (a different address) call this API
  app.use(express.json()); // lets the API read JSON sent in request bodies

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/scenes', scenesRouter(Scene));

  // Any other /api address does not exist.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Last stop for errors (for example the database is down): reply with JSON, hide the details.
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}

module.exports = { createApp };
