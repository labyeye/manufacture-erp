const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const categoryMasterController = require("../controllers/categoryMasterController");

router.get("/", auth, categoryMasterController.getAll);
router.get("/:id", auth, categoryMasterController.getOne);
router.post("/", auth, categoryMasterController.create);
router.post("/bulk-import", auth, categoryMasterController.bulkImport);
router.post("/add-subtype", auth, categoryMasterController.addSubType);
router.post("/remove-subtype", auth, categoryMasterController.removeSubType);
router.put("/:id", auth, categoryMasterController.update);
router.delete("/:id", auth, categoryMasterController.delete);

module.exports = router;
