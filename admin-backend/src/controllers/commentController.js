const Comment = require('../models/commentModel');

// Add a comment (user derived from the auth token, never the body).
exports.addComment = async (req, res) => {
  try {
    const { content_id, text } = req.body;
    if (!content_id || !text) {
      return res.status(400).json({ error: 'content_id and text are required' });
    }
    const comment = await Comment.create({ user_id: req.user.id, content_id, text });
    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Soft delete — only the author or an admin.
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.deleted) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (String(comment.user_id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }
    comment.deleted = true;
    await comment.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
