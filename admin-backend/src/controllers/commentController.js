const Comment = require('../models/commentModel');

// Add a comment to a content
exports.addComment = async (req, res) => {
  try {
    const comment = new Comment(req.body);
    await comment.save();
    res.status(201).json({ message: 'Comment added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Soft delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
