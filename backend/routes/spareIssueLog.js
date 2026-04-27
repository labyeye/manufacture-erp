const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const controller = require("../controllers/spareIssueLogController");

router.use(auth);

router.get("/", controller.getAll);
router.post("/", controller.create);

module.exports = router;
