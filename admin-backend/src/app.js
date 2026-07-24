const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
const contentRoutes = require('./routes/contentRoutes');
const commentRoutes = require('./routes/commentRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const s3UploadsRotes = require('./routes/s3UploadsRotes');
app.use('/api/v1/admin', contentRoutes);
app.use('/api/v1/admin', commentRoutes);
app.use('/api/v1/admin', preferenceRoutes);
app.use('/api/v1/admin',s3UploadsRotes );

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log(process.env.MONGO_URI);
    
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
  });


module.exports=app