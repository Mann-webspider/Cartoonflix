const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Reads are open; writes require an admin.
router.post('/content', requireAuth, requireAdmin, contentController.addContent);
router.get('/content',contentController.getContent)
router.get('/content/type/:type',contentController.getContentbyType)
router.get('/content/:id',contentController.getSingleContent)
router.put('/content/:id', requireAuth, requireAdmin, contentController.updateContent);
router.delete('/content/:id', requireAuth, requireAdmin, contentController.deleteContent);

module.exports = router;
