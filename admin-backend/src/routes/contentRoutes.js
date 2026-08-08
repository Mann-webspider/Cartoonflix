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

// Seasons merge rather than replace, so seeding from TMDB cannot clobber an
// episode that has already been transcoded.
router.post('/content/:id/season', requireAuth, requireAdmin, contentController.upsertSeason);
router.delete(
  '/content/:id/season/:seasonNumber',
  requireAuth,
  requireAdmin,
  contentController.deleteSeason
);

module.exports = router;
