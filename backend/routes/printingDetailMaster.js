const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const printingDetailMasterController = require("../controllers/printingDetailMasterController");

router.use(auth);

router.get("/", printingDetailMasterController.getAllPrintingDetails);

router.get(
  "/item/:itemName/client/:clientName",
  printingDetailMasterController.getPrintingDetailByItemAndClient,
);

router.get("/:id", printingDetailMasterController.getPrintingDetailById);

router.post("/", printingDetailMasterController.createPrintingDetail);

router.put("/:id", printingDetailMasterController.updatePrintingDetail);

router.delete("/:id", printingDetailMasterController.deletePrintingDetail);

router.post("/bulk-import", printingDetailMasterController.bulkImport);

module.exports = router;
