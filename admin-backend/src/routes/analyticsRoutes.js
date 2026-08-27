const express = require("express");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

// Read-only. Events are written by the viewer API, which is where the visitors
// are; this side only ever reports on them.
router.get("/analytics", analyticsController.getAnalytics);

module.exports = router;
