const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const ctrl = require("../controllers/stockAdjustmentController");

router.use(auth);

router.get("/report", ctrl.getReport);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.delete("/:id", ctrl.deleteAdjustment);

module.exports = router;
