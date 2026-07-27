const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// Health check
app.get('/api/v1/admin/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
const contentRoutes = require('./routes/contentRoutes');
const commentRoutes = require('./routes/commentRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const s3UploadsRoutes = require('./routes/s3UploadsRotes');

app.use('/api/v1/admin', contentRoutes);
app.use('/api/v1/admin', commentRoutes);
app.use('/api/v1/admin', preferenceRoutes);
app.use('/api/v1/admin', s3UploadsRoutes);

module.exports = app;
