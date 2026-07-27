const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// Routes for content management
router.post('/content', contentController.addContent);
router.get('/content',contentController.getContent)
router.get('/content/type/:type',contentController.getContentbyType)
router.get('/content/:id',contentController.getSingleContent)
router.put('/content/:id', contentController.updateContent);
router.delete('/content/:id', contentController.deleteContent);

module.exports = router;
