const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const consumableStockController = require("../controllers/consumableStockController");

router.use(auth);

router.get("/", consumableStockController.getAllStock);

router.get("/low-stock", consumableStockController.getLowStock);

router.get("/:id", consumableStockController.getStockById);

router.post("/", consumableStockController.createStock);

router.patch("/:id/adjust", consumableStockController.adjustStock);

router.put("/:id", consumableStockController.updateStock);

router.delete("/:id", consumableStockController.deleteStock);

module.exports = router;
