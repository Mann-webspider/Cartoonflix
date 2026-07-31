const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);
router.get("/auth/me", requireAuth, authController.me);

module.exports = router;
