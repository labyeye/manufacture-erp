const StockAdjustment = require("../models/StockAdjustment");
const RawMaterialStock = require("../models/RawMaterialStock");
const FGStock = require("../models/FGStock");
const ConsumableStock = require("../models/ConsumableStock");
const { getNextSequence } = require("../utils/counters");

function detectStockType(productCode) {
  const code = (productCode || "").toUpperCase();
  if (code.startsWith("RM")) return "Raw Material";
  if (code.startsWith("FG")) return "Finished Goods";
  if (code.startsWith("CG")) return "Consumable";
  return null;
}

async function findStockRecord(stockType, productCode, itemName) {
  if (stockType === "Raw Material") {
    return await RawMaterialStock.findOne({
      $or: [
        { code: productCode },
        { name: { $regex: new RegExp(`^${itemName}$`, "i") } },
      ],
    });
  }
  if (stockType === "Finished Goods") {
    return await FGStock.findOne({
      $or: [
        { itemCode: productCode },
        { itemName: { $regex: new RegExp(`^${itemName}$`, "i") } },
      ],
    });
  }
  if (stockType === "Consumable") {
    return await ConsumableStock.findOne({
      $or: [
        { code: productCode },
        { name: { $regex: new RegExp(`^${itemName}$`, "i") } },
      ],
    });
  }
  return null;
}

exports.getAll = async (req, res) => {
  try {
    const { adjustmentType, stockType, productCode, from, to } = req.query;
    const filter = {};
    if (adjustmentType) filter.adjustmentType = adjustmentType;
    if (stockType) filter.stockType = stockType;
    if (productCode) filter.productCode = productCode.toUpperCase();
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const adjustments = await StockAdjustment.find(filter).sort({
      date: -1,
      createdAt: -1,
    });
    res.json({ adjustments });
  } catch (error) {
    console.error("Get all stock adjustments error:", error);
    res.status(500).json({ error: "Failed to fetch stock adjustments" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const adjustment = await StockAdjustment.findById(req.params.id);
    if (!adjustment)
      return res.status(404).json({ error: "Adjustment not found" });
    res.json({ adjustment });
  } catch (error) {
    console.error("Get stock adjustment error:", error);
    res.status(500).json({ error: "Failed to fetch stock adjustment" });
  }
};

exports.create = async (req, res) => {
  try {
    const { date, productCode, itemName, adjustmentType, qty, weight, reason } =
      req.body;

    if (!productCode)
      return res.status(400).json({ error: "Product code is required" });
    if (!itemName)
      return res.status(400).json({ error: "Item name is required" });
    if (!adjustmentType)
      return res.status(400).json({ error: "Adjustment type is required" });
    if (qty === undefined || qty === null)
      return res.status(400).json({ error: "Qty is required" });

    const stockType = detectStockType(productCode);
    if (!stockType) {
      return res.status(400).json({
        error:
          "Cannot determine stock type from product code. Code must start with RM, FG, or CG.",
      });
    }

    let stock = await findStockRecord(stockType, productCode, itemName);

    // If no stock record exists yet, create one with zero stock
    if (!stock) {
      if (adjustmentType === "Outward") {
        return res.status(400).json({
          error: `No stock record found for "${itemName}". Cannot do Outward adjustment on an item with no stock.`,
        });
      }
      if (stockType === "Raw Material") {
        stock = new RawMaterialStock({
          name: itemName,
          code: productCode.toUpperCase(),
          qty: 0,
          weight: 0,
        });
      } else if (stockType === "Finished Goods") {
        stock = new FGStock({
          itemName,
          itemCode: productCode.toUpperCase(),
          qty: 0,
        });
      } else if (stockType === "Consumable") {
        stock = new ConsumableStock({
          name: itemName,
          code: productCode.toUpperCase(),
          qty: 0,
        });
      }
      await stock.save();
    }

    const direction = adjustmentType === "Outward" ? -1 : 1;

    const beforeQty = stock.qty || 0;
    const beforeWeight = stock.weight || 0;
    const newQty = beforeQty + direction * Number(qty);
    const newWeight = beforeWeight + direction * Number(weight || 0);

    if (newQty < 0) {
      return res.status(400).json({
        error:
          "Insufficient stock: adjustment would result in negative quantity",
      });
    }
    if (stockType === "Raw Material" && newWeight < 0) {
      return res.status(400).json({
        error: "Insufficient stock: adjustment would result in negative weight",
      });
    }

    stock.qty = newQty;
    if (stockType === "Raw Material" && weight) stock.weight = newWeight;
    await stock.save();

    const year = new Date().getFullYear();
    const adjustmentNo = await getNextSequence(`ADJ-${year}`, `ADJ-${year}`, 3);

    const adjustment = new StockAdjustment({
      adjustmentNo,
      date: date || new Date(),
      productCode: productCode.toUpperCase(),
      itemName,
      stockType,
      adjustmentType,
      qty: Number(qty),
      weight: Number(weight || 0),
      reason,
      beforeQty,
      afterQty: newQty,
      beforeWeight,
      afterWeight: stockType === "Raw Material" ? newWeight : 0,
      createdBy: req.user?.username || req.user?.name || "System",
    });

    await adjustment.save();
    res.status(201).json({ adjustment });
  } catch (error) {
    console.error("Create stock adjustment error:", error);
    res.status(500).json({ error: "Failed to create stock adjustment" });
  }
};

exports.deleteAdjustment = async (req, res) => {
  try {
    const adjustment = await StockAdjustment.findById(req.params.id);
    if (!adjustment)
      return res.status(404).json({ error: "Adjustment not found" });

    const stock = await findStockRecord(
      adjustment.stockType,
      adjustment.productCode,
      adjustment.itemName,
    );
    if (stock) {
      const direction = adjustment.adjustmentType === "Outward" ? 1 : -1;
      stock.qty = (stock.qty || 0) + direction * adjustment.qty;
      if (adjustment.stockType === "Raw Material" && adjustment.weight) {
        stock.weight = (stock.weight || 0) + direction * adjustment.weight;
      }
      if (stock.qty < 0) stock.qty = 0;
      if (stock.weight < 0) stock.weight = 0;
      await stock.save();
    }

    await StockAdjustment.findByIdAndDelete(req.params.id);
    res.json({ message: "Adjustment deleted and stock reversed successfully" });
  } catch (error) {
    console.error("Delete stock adjustment error:", error);
    res.status(500).json({ error: "Failed to delete stock adjustment" });
  }
};

exports.getReport = async (req, res) => {
  try {
    const { from, to, stockType, adjustmentType } = req.query;
    const filter = {};
    if (stockType) filter.stockType = stockType;
    if (adjustmentType) filter.adjustmentType = adjustmentType;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const adjustments = await StockAdjustment.find(filter).sort({ date: -1 });

    const summary = adjustments.reduce((acc, adj) => {
      const key = `${adj.productCode}|${adj.itemName}`;
      if (!acc[key]) {
        acc[key] = {
          productCode: adj.productCode,
          itemName: adj.itemName,
          stockType: adj.stockType,
          production: 0,
          inward: 0,
          outward: 0,
          net: 0,
        };
      }
      if (adj.adjustmentType === "Production") acc[key].production += adj.qty;
      if (adj.adjustmentType === "Inward") acc[key].inward += adj.qty;
      if (adj.adjustmentType === "Outward") acc[key].outward += adj.qty;
      acc[key].net = acc[key].production + acc[key].inward - acc[key].outward;
      return acc;
    }, {});

    res.json({ adjustments, summary: Object.values(summary) });
  } catch (error) {
    console.error("Get stock adjustment report error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
