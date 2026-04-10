const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const materialInwardController = require("../controllers/materialInwardController");

router.get("/", auth, materialInwardController.getAll);
router.get("/:id", auth, materialInwardController.getOne);
router.post("/", auth, materialInwardController.create);
router.put("/:id", auth, materialInwardController.update);
router.delete("/:id", auth, materialInwardController.delete);
router.patch("/:id/status", auth, materialInwardController.updateStatus);

module.exports = router;
