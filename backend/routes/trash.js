const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const ctrl = require("../controllers/trashController");

router.get("/", auth, ctrl.getAll);
router.delete("/empty", auth, ctrl.emptyTrash);
router.post("/:id/restore", auth, ctrl.restore);
router.delete("/:id", auth, ctrl.permanentDelete);

module.exports = router;
