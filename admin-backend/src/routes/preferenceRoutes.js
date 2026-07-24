const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preferenceController');

// Routes for user preference management
router.post('/preference', preferenceController.addPreference);

module.exports = router;
