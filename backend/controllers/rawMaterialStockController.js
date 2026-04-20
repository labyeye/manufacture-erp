const RawMaterialStock = require("../models/RawMaterialStock");

exports.getAllStock = async (req, res) => {
  try {
    const { category, paperType } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (paperType) filter.paperType = paperType;

    const stock = await RawMaterialStock.find(filter).sort({ name: 1 });

    res.json({ stock });
  } catch (error) {
    console.error("Get all raw material stock error:", error);
    res.status(500).json({ error: "Failed to fetch raw material stock" });
  }
};

exports.getStockById = async (req, res) => {
  try {
    const stock = await RawMaterialStock.findById(req.params.id);

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
    const {
      name,
      code,
      category,
      paperType,
      gsm,
      unit,
      qty,
      weight,
      weightPerSheet,
      sheetSize,
      location,
      reorderLevel,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (code) {
      const existing = await RawMaterialStock.findOne({ code });
      if (existing) {
        return res
          .status(400)
          .json({ error: "Stock item with this code already exists" });
      }
    }

    if (name) {
      const existingName = await RawMaterialStock.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      });
      if (existingName) {
        return res
          .status(400)
          .json({ error: "Stock item with this name already exists" });
      }
    }

    const stock = new RawMaterialStock({
      name,
      code,
      category,
      paperType,
      gsm,
      unit,
      qty: qty || 0,
      weight: weight || 0,
      weightPerSheet,
      sheetSize,
      location,
      reorderLevel: reorderLevel || 50,
    });

    await stock.save();

    res.status(201).json({ stock });
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ error: "Failed to create stock item" });
  }
};

exports.updateStock = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to update RM stock" });
  }
  try {
    const {
      name,
      code,
      category,
      paperType,
      gsm,
      unit,
      qty,
      weight,
      weightPerSheet,
      sheetSize,
      location,
      reorderLevel,
    } = req.body;

    const stock = await RawMaterialStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    if (code && code !== stock.code) {
      const existing = await RawMaterialStock.findOne({
        code,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res
          .status(400)
          .json({ error: "Stock item with this code already exists" });
      }
    }

    if (name && name !== stock.name) {
      const existingName = await RawMaterialStock.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: req.params.id },
      });
      if (existingName) {
        return res
          .status(400)
          .json({ error: "Stock item with this name already exists" });
      }
    }

    if (name !== undefined) stock.name = name;
    if (code !== undefined) stock.code = code;
    if (category !== undefined) stock.category = category;
    if (paperType !== undefined) stock.paperType = paperType;
    if (gsm !== undefined) stock.gsm = gsm;
    if (unit !== undefined) stock.unit = unit;
    if (qty !== undefined) stock.qty = qty;
    if (weight !== undefined) stock.weight = weight;
    if (weightPerSheet !== undefined) stock.weightPerSheet = weightPerSheet;
    if (sheetSize !== undefined) stock.sheetSize = sheetSize;
    if (location !== undefined) stock.location = location;
    if (reorderLevel !== undefined) stock.reorderLevel = reorderLevel;

    await stock.save();

    res.json({ stock });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: "Failed to update stock item" });
  }
};

exports.adjustStock = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to adjust RM stock" });
  }
  try {
    const { adjustment, weightAdjustment, reason } = req.body;

    if (adjustment === undefined && weightAdjustment === undefined) {
      return res
        .status(400)
        .json({ error: "Adjustment or weight adjustment is required" });
    }

    const stock = await RawMaterialStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    if (adjustment !== undefined) stock.qty = (stock.qty || 0) + adjustment;
    if (weightAdjustment !== undefined)
      stock.weight = (stock.weight || 0) + weightAdjustment;

    if (stock.qty < 0 || stock.weight < 0) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    await stock.save();

    res.json({
      message: "Stock adjusted successfully",
      stock,
    });
  } catch (error) {
    console.error("Adjust stock error:", error);
    res.status(500).json({ error: "Failed to adjust stock" });
  }
};

exports.deleteStock = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to delete RM stock" });
  }
  try {
    const stock = await RawMaterialStock.findByIdAndDelete(req.params.id);

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
    const lowStock = await RawMaterialStock.find({
      $expr: { $lte: ["$qty", "$reorderLevel"] },
    }).sort({ qty: 1 });

    res.json({ stock: lowStock });
  } catch (error) {
    console.error("Get low stock error:", error);
    res.status(500).json({ error: "Failed to fetch low stock items" });
  }
};
