const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  content_id: { type: String, required: true },
  text: { type: String, required: true },
  deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Comment', commentSchema);
