const FGStock = require("../models/FGStock");

exports.getAllStock = async (req, res) => {
  try {
    const { itemName, companyName } = req.query;

    const filter = {};
    if (itemName) filter.itemName = { $regex: itemName, $options: "i" };
    if (companyName)
      filter.companyName = { $regex: companyName, $options: "i" };

    
    if (req.user && req.user.role === "Client" && req.user.clientTag) {
      filter.companyCat = req.user.clientTag;
    }

    const stock = await FGStock.find(filter).sort({ lastUpdated: -1 });

    res.json({ stock });
  } catch (error) {
    console.error("Get all FG stock error:", error);
    res.status(500).json({ error: "Failed to fetch FG stock" });
  }
};

exports.getStockById = async (req, res) => {
  try {
    const stock = await FGStock.findById(req.params.id);

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
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to create stock" });
  }
  try {
    const {
      itemName,
      itemCode,
      joNo,
      soRef,
      companyName,
      companyCat,
      qty,
      unit,
      price,
      category,
      reorder,
    } = req.body;

    if (!itemName) {
      return res.status(400).json({ error: "Item name is required" });
    }

    const existing = await FGStock.findOne({
      itemName: { $regex: new RegExp(`^${itemName.trim()}$`, "i") },
    });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Item with this name already exists in FG Stock" });
    }

    const stock = new FGStock({
      itemName,
      itemCode,
      joNo,
      soRef,
      companyName,
      companyCat,
      qty: qty || 0,
      unit,
      price,
      category,
      reorder,
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
      .json({ error: "Clients are not allowed to update stock" });
  }
  try {
    const {
      itemName,
      itemCode,
      joNo,
      soRef,
      companyName,
      companyCat,
      qty,
      unit,
      price,
      category,
      reorder,
    } = req.body;

    const stock = await FGStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    if (itemName !== undefined) {
      if (itemName !== stock.itemName) {
        const existing = await FGStock.findOne({
          itemName: { $regex: new RegExp(`^${itemName.trim()}$`, "i") },
          _id: { $ne: req.params.id },
        });
        if (existing) {
          return res
            .status(400)
            .json({ error: "Item with this name already exists in FG Stock" });
        }
      }
      stock.itemName = itemName;
    }
    if (itemCode !== undefined) stock.itemCode = itemCode;
    if (joNo !== undefined) stock.joNo = joNo;
    if (soRef !== undefined) stock.soRef = soRef;
    if (companyName !== undefined) stock.companyName = companyName;
    if (companyCat !== undefined) stock.companyCat = companyCat;
    if (qty !== undefined) stock.qty = qty;
    if (unit !== undefined) stock.unit = unit;
    if (price !== undefined) stock.price = price;
    if (category !== undefined) stock.category = category;
    if (reorder !== undefined) stock.reorder = reorder;

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
      .json({ error: "Clients are not allowed to adjust stock" });
  }
  try {
    const { adjustment } = req.body;

    if (adjustment === undefined) {
      return res.status(400).json({ error: "Adjustment amount is required" });
    }

    const stock = await FGStock.findById(req.params.id);
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
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to delete stock" });
  }
  try {
    const stock = await FGStock.findByIdAndDelete(req.params.id);

    if (!stock) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    res.json({ message: "Stock item deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ error: "Failed to delete stock item" });
  }
};
