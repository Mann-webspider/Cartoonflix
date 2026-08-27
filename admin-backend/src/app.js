const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { MEDIA_ROOT } = require('./ingest/jobs');

const app = express();

app.use(cors());
// Only JSON bodies are parsed; uploaded video arrives as a raw stream on the
// ingest route and must reach it unbuffered.
app.use(bodyParser.json({ limit: '5mb' }));

// Health check
app.get('/api/v1/admin/health', (_req, res) => res.json({ status: 'ok' }));

// Extracted stills, served straight off disk so the admin UI can show them for
// selection before anything is uploaded to S3. Local pipeline only.
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use('/media', express.static(MEDIA_ROOT));
}

// Routes
const contentRoutes = require('./routes/contentRoutes');
const s3UploadsRoutes = require('./routes/s3UploadsRotes');
const ingestRoutes = require('./routes/ingestRoutes');
const tmdbRoutes = require('./routes/tmdbRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api/v1/admin', contentRoutes);
app.use('/api/v1/admin', s3UploadsRoutes);
app.use('/api/v1/admin', ingestRoutes);
app.use('/api/v1/admin', tmdbRoutes);
app.use('/api/v1/admin', analyticsRoutes);

module.exports = app;
