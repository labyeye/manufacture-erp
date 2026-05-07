const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
  getLogs,
  getModules,
  clearOldLogs,
} = require("../controllers/activityLogController");

router.get("/", auth, isAdmin, getLogs);
router.get("/filters", auth, isAdmin, getModules);
router.delete("/clear", auth, isAdmin, clearOldLogs);

module.exports = router;
