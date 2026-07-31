const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preferenceController');
const { requireAuth } = require('../middleware/auth');

router.post('/preference', requireAuth, preferenceController.addPreference);
router.get('/preference', requireAuth, preferenceController.getPreferences);

module.exports = router;
