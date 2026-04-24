const express = require("express");
const router = express.Router();
const controller = require("../controllers/priceListController");

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.post("/bulk-import", controller.bulkImport);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;
