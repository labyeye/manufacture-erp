const SpareIssueLog = require("../models/SpareIssueLog");
const ConsumableStock = require("../models/ConsumableStock");

exports.getAll = async (req, res) => {
  try {
    const { machineId, itemCode, from, to } = req.query;
    const filter = {};
    if (machineId) filter.machineId = machineId;
    if (itemCode) filter.itemCode = itemCode;
    if (from || to) {
      filter.issuedAt = {};
      if (from) filter.issuedAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.issuedAt.$lte = toDate;
      }
    }
    const logs = await SpareIssueLog.find(filter)
      .populate("machineId", "name type")
      .sort({ issuedAt: -1 });
    res.json({ logs });
  } catch (err) {
    console.error("Get spare issue logs error:", err);
    res.status(500).json({ error: "Failed to fetch issue logs" });
  }
};

exports.create = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res.status(403).json({ error: "Not authorized" });
  }
  try {
    const {
      itemCode,
      itemName,
      category,
      machineId,
      machineName,
      qty,
      unit,
      issuedBy,
      remarks,
      stockId,
    } = req.body;

    if (!itemName || !qty || Number(qty) <= 0) {
      return res
        .status(400)
        .json({ error: "itemName and a positive qty are required" });
    }

    const issueQty = Number(qty);

    // Find and deduct from ConsumableStock
    let stock = null;
    if (stockId) {
      stock = await ConsumableStock.findById(stockId);
    } else if (itemCode) {
      stock = await ConsumableStock.findOne({ code: itemCode });
    }

    if (stock) {
      if ((stock.qty || 0) < issueQty) {
        return res.status(400).json({
          error: `Insufficient stock. Available: ${stock.qty || 0}`,
        });
      }
      stock.qty = (stock.qty || 0) - issueQty;
      await stock.save();
    } else {
      // Item exists in ItemMaster but has no stock entry yet — create one
      stock = new ConsumableStock({
        name: itemName,
        code: itemCode,
        category,
        qty: -issueQty,
        unit: unit || "nos",
      });
      await stock.save();
    }

    const log = new SpareIssueLog({
      itemCode,
      itemName,
      category,
      machineId: machineId || undefined,
      machineName,
      qty: issueQty,
      unit: unit || "nos",
      issuedBy,
      remarks,
      issuedAt: new Date(),
    });

    await log.save();
    await log.populate("machineId", "name type");

    res.status(201).json({ log, stock });
  } catch (err) {
    console.error("Create spare issue log error:", err);
    res.status(500).json({ error: "Failed to create issue log" });
  }
};
