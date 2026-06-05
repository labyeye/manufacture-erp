const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const controller = require("../controllers/spareIssueLogController");

router.use(auth);

router.get("/", controller.getAll);
router.post("/", controller.create);
router.put("/:id", controller.updateLog);
router.delete("/:id", controller.deleteLog);

module.exports = router;
