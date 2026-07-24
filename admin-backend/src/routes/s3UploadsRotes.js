const express = require('express');
const router = express.Router();
const s3UploadController = require('../controllers/s3UploadController');

// Routes for content management
router.post('/presigned-url', s3UploadController.generatePresignedUrl);


module.exports = router;
