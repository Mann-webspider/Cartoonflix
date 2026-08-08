const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// No auth: this API is an operator tool bound to localhost. See README.
router.post('/content', contentController.addContent);
router.get('/content',contentController.getContent)
router.get('/content/type/:type',contentController.getContentbyType)
router.get('/content/:id',contentController.getSingleContent)
router.put('/content/:id', contentController.updateContent);
router.delete('/content/:id', contentController.deleteContent);

// Seasons merge rather than replace, so seeding from TMDB cannot clobber an
// episode that has already been transcoded.
router.post('/content/:id/season', contentController.upsertSeason);
router.delete(
  '/content/:id/season/:seasonNumber',
  contentController.deleteSeason
);

module.exports = router;
