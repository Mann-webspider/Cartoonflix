const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');

router.post('/comment', requireAuth, commentController.addComment);
router.delete('/comment/:id', requireAuth, commentController.deleteComment);

module.exports = router;
