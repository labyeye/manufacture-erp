const ConsumableStock = require("../models/ConsumableStock");

exports.getAllStock = async (req, res) => {
  try {
    const { category } = req.query;

    const filter = {};
    if (category) filter.category = category;

    const stock = await ConsumableStock.find(filter).sort({ name: 1 });

    res.json({ stock });
  } catch (error) {
    console.error("Get all consumable stock error:", error);
    res.status(500).json({ error: "Failed to fetch consumable stock" });
  }
};

exports.getStockById = async (req, res) => {
  try {
    const stock = await ConsumableStock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    res.json(stock);
  } catch (error) {
    console.error("Get stock item error:", error);
    res.status(500).json({ error: "Failed to fetch stock item" });
  }
};

exports.createStock = async (req, res) => {
  try {
    const { name, category, qty, unit, reorderLevel } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const stock = new ConsumableStock({
      name,
      category,
      qty: qty || 0,
      unit,
      reorderLevel: reorderLevel || 10,
    });

    await stock.save();

    res.status(201).json({ stock });
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ error: "Failed to create stock item" });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { name, category, qty, unit, reorderLevel } = req.body;

    const stock = await ConsumableStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    if (name !== undefined) stock.name = name;
    if (category !== undefined) stock.category = category;
    if (qty !== undefined) stock.qty = qty;
    if (unit !== undefined) stock.unit = unit;
    if (reorderLevel !== undefined) stock.reorderLevel = reorderLevel;

    await stock.save();

    res.json({ stock });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: "Failed to update stock item" });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { adjustment } = req.body;

    if (adjustment === undefined) {
      return res.status(400).json({ error: "Adjustment amount is required" });
    }

    const stock = await ConsumableStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    stock.qty = (stock.qty || 0) + adjustment;

    if (stock.qty < 0) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    await stock.save();

    res.json({ message: "Stock adjusted successfully", stock });
  } catch (error) {
    console.error("Adjust stock error:", error);
    res.status(500).json({ error: "Failed to adjust stock" });
  }
};

exports.deleteStock = async (req, res) => {
  try {
    const stock = await ConsumableStock.findByIdAndDelete(req.params.id);

    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    res.json({ message: "Stock item deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ error: "Failed to delete stock item" });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const lowStock = await ConsumableStock.find({
      $expr: { $lte: ["$qty", "$reorderLevel"] },
    }).sort({ qty: 1 });

    res.json({ stock: lowStock });
  } catch (error) {
    console.error("Get low stock error:", error);
    res.status(500).json({ error: "Failed to fetch low stock items" });
  }
};
