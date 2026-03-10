const express = require("express");
const {
  register,
  login,
  refreshAccessToken,
  logout,
  logoutAllSessions,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAllSessions);

module.exports = router;
