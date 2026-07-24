const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Routes for comment management
router.post('/comment', commentController.addComment);
router.delete('/comment/:id', commentController.deleteComment);

module.exports = router;
