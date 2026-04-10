const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const categoryMasterController = require("../controllers/categoryMasterController");

router.get("/", auth, categoryMasterController.getAll);
router.get("/:id", auth, categoryMasterController.getOne);
router.post("/", auth, categoryMasterController.create);
router.put("/:id", auth, categoryMasterController.update);
router.delete("/:id", auth, categoryMasterController.delete);

module.exports = router;
