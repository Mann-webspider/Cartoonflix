const express = require('express');
const router = express.Router();
const tmdbController = require('../controllers/tmdbController');

// The TMDB key lives on this server and is never sent to a browser.
router.get('/tmdb/search', tmdbController.search);
router.get('/tmdb/:type/:id', tmdbController.details);
router.get('/tmdb/series/:id/season/:seasonNumber', tmdbController.season);

module.exports = router;
