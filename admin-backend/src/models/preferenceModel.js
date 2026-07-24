const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  type: { type: String, enum: ['watchlist', 'favorites'], required: true },
  items: [{ type: String }]  // List of content IDs (movies, series, episodes)
});

module.exports = mongoose.model('Preference', preferenceSchema);
