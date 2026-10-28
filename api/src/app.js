const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const scenesRouter = require('./routes/scenes');
const roomsRouter = require('./routes/rooms');

// The written description of the API (see openapi.yaml). It is read once when the app starts.
const apiSpec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8'));

// Builds the Express app but does not start listening.
// Keeping this separate from server.js lets the tests call the app without opening a real port.
// "models" lets a test swap in a pretend database; the real server passes nothing.
function createApp(models = {}) {
  const Scene = models.Scene || require('./models/Scene');
  const Room = models.Room || require('./models/Room');
  const app = express();

  app.use(cors()); // lets the React site (a different address) call this API
  app.use(express.json()); // lets the API read JSON sent in request bodies

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // The online documentation: a web page where every address can be tried out, and the raw document.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec, { customSiteTitle: 'Libsic Studio API' }));
  app.get('/openapi.json', (req, res) => res.json(apiSpec));

  app.use('/api/scenes', scenesRouter(Scene));
  app.use('/api/rooms', roomsRouter({ Room, Scene }));

  // Any other /api address does not exist.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Last stop for errors: reply with JSON and hide the technical details.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'The request body is not valid JSON' });
    }
    if (err.name === 'ValidationError') {
      const details = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}

module.exports = { createApp };
