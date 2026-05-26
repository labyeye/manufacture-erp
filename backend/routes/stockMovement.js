const express = require("express");
const router = express.Router();
const RawMaterialStock = require("../models/RawMaterialStock");
const FGStock = require("../models/FGStock");
const ConsumableStock = require("../models/ConsumableStock");
const MaterialInward = require("../models/MaterialInward");
const JobOrder = require("../models/JobOrder");
const StockAdjustment = require("../models/StockAdjustment");
const Dispatch = require("../models/Dispatch");

// GET /api/stock-movement/items?type=rm|fg|cn&q=searchTerm
router.get("/items", async (req, res) => {
  try {
    const { type = "rm", q = "" } = req.query;
    const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : /.*/;

    let items = [];
    if (type === "rm") {
      const docs = await RawMaterialStock.find({ name: regex }).select("_id name code category").limit(30);
      items = docs.map((d) => ({ _id: d._id, name: d.name, code: d.code, category: d.category }));
    } else if (type === "fg") {
      const docs = await FGStock.find({ itemName: regex }).select("_id itemName itemCode category").limit(30);
      items = docs.map((d) => ({ _id: d._id, name: d.itemName, code: d.itemCode, category: d.category }));
    } else if (type === "cn") {
      const docs = await ConsumableStock.find({ name: regex }).select("_id name code category").limit(30);
      items = docs.map((d) => ({ _id: d._id, name: d.name, code: d.code, category: d.category }));
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock-movement?type=rm&itemName=...&from=...&to=...
router.get("/", async (req, res) => {
  try {
    const { type = "rm", itemName, from, to } = req.query;
    if (!itemName) return res.json({ movements: [], currentStock: null });

    const nameRegex = new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

    const inRange = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      if (fromDate && dt < fromDate) return false;
      if (toDate && dt > toDate) return false;
      return true;
    };

    const movements = [];

    if (type === "rm") {
      const stock = await RawMaterialStock.findOne({ name: nameRegex });
      const currentStock = stock ? { qty: stock.qty, weight: stock.weight, unit: stock.unit } : null;

      // Inward (GRN)
      const inwards = await MaterialInward.find({
        "items.rmItem": nameRegex,
        ...(fromDate || toDate ? { inwardDate: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (!nameRegex.test(item.rmItem || "")) continue;
          movements.push({
            date: inward.inwardDate,
            type: "IN",
            source: "Material Inward",
            ref: inward.inwardNo,
            description: `Received from ${inward.vendorName || "Vendor"}`,
            qty: item.noOfSheets || item.qty || 0,
            weight: item.weight || 0,
            unit: item.uom || item.unit || "",
            runningQty: null,
          });
        }
      }

      // Job Orders (consumption)
      const jos = await JobOrder.find({
        $or: [
          { paperType: nameRegex },
          { polycoatedRmName: nameRegex },
        ],
        status: { $in: ["In Progress", "Completed", "Scheduled"] },
        ...(fromDate || toDate ? { jobcardDate: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("joNo jobcardDate itemName paperType noOfSheets reelWeightKg polycoatedWeightKg polycoatedRmName status");

      for (const jo of jos) {
        const isPolycoated = nameRegex.test(jo.polycoatedRmName || "");
        const qty = isPolycoated ? (jo.polycoatedWeightKg || 0) : (jo.noOfSheets || 0);
        const weight = isPolycoated ? (jo.polycoatedWeightKg || 0) : (jo.reelWeightKg || 0);
        movements.push({
          date: jo.jobcardDate,
          type: "OUT",
          source: "Job Order",
          ref: jo.joNo,
          description: `Used for JO: ${jo.itemName || ""}`,
          qty,
          weight,
          unit: isPolycoated ? "kg" : "sheets",
          runningQty: null,
        });
      }

      // Stock Adjustments
      const adjustments = await StockAdjustment.find({
        itemName: nameRegex,
        stockType: "Raw Material",
        ...(fromDate || toDate ? { date: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("date adjustmentNo adjustmentType qty weight reason beforeQty afterQty createdBy");

      for (const adj of adjustments) {
        movements.push({
          date: adj.date,
          type: adj.adjustmentType === "Inward" ? "IN" : "OUT",
          source: "Stock Adjustment",
          ref: adj.adjustmentNo || "—",
          description: `${adj.adjustmentType} — ${adj.reason || "Manual adjustment"}`,
          qty: adj.qty || 0,
          weight: adj.weight || 0,
          unit: "",
          beforeQty: adj.beforeQty,
          afterQty: adj.afterQty,
          runningQty: null,
        });
      }

      movements.sort((a, b) => new Date(a.date) - new Date(b.date));
      return res.json({ movements, currentStock });
    }

    if (type === "fg") {
      const stock = await FGStock.findOne({ itemName: nameRegex });
      const currentStock = stock ? { qty: stock.qty, unit: "pcs" } : null;

      // Job Orders (production — FG added)
      const jos = await JobOrder.find({
        $or: [{ itemName: nameRegex }, { product: nameRegex }],
        ...(fromDate || toDate ? { jobcardDate: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("joNo jobcardDate itemName orderQty status currentStage completedProcesses");

      for (const jo of jos) {
        movements.push({
          date: jo.jobcardDate,
          type: "IN",
          source: "Job Order (Production)",
          ref: jo.joNo,
          description: `Produced via JO — ${jo.status}`,
          qty: jo.orderQty || 0,
          weight: 0,
          unit: "pcs",
          runningQty: null,
        });
      }

      // Dispatch (outward)
      const dispatches = await Dispatch.find({
        $or: [
          { "items.itemName": nameRegex },
          { "items.name": nameRegex },
        ],
        ...(fromDate || toDate ? { date: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("dispatchNo date clientName items");

      for (const d of dispatches) {
        for (const item of d.items || []) {
          const iname = item.itemName || item.name || "";
          if (!nameRegex.test(iname)) continue;
          movements.push({
            date: d.date,
            type: "OUT",
            source: "Dispatch",
            ref: d.dispatchNo || "—",
            description: `Dispatched to ${d.companyName || "Client"}`,
            qty: item.qty || 0,
            weight: 0,
            unit: "pcs",
            runningQty: null,
          });
        }
      }

      // Stock Adjustments
      const adjustments = await StockAdjustment.find({
        itemName: nameRegex,
        stockType: "Finished Goods",
        ...(fromDate || toDate ? { date: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("date adjustmentNo adjustmentType qty reason beforeQty afterQty createdBy");

      for (const adj of adjustments) {
        movements.push({
          date: adj.date,
          type: adj.adjustmentType === "Inward" ? "IN" : "OUT",
          source: "Stock Adjustment",
          ref: adj.adjustmentNo || "—",
          description: `${adj.adjustmentType} — ${adj.reason || "Manual adjustment"}`,
          qty: adj.qty || 0,
          weight: 0,
          unit: "pcs",
          beforeQty: adj.beforeQty,
          afterQty: adj.afterQty,
          runningQty: null,
        });
      }

      movements.sort((a, b) => new Date(a.date) - new Date(b.date));
      return res.json({ movements, currentStock });
    }

    if (type === "cn") {
      const stock = await ConsumableStock.findOne({ name: nameRegex });
      const currentStock = stock ? { qty: stock.qty, unit: stock.unit || "pcs" } : null;

      // Inward
      const inwards = await MaterialInward.find({
        "items.itemName": nameRegex,
        "items.materialType": "Consumable",
        ...(fromDate || toDate ? { inwardDate: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (item.materialType !== "Consumable") continue;
          if (!nameRegex.test(item.itemName || "")) continue;
          movements.push({
            date: inward.inwardDate,
            type: "IN",
            source: "Material Inward",
            ref: inward.inwardNo,
            description: `Received from ${inward.vendorName || "Vendor"}`,
            qty: item.qty || 0,
            weight: 0,
            unit: item.uom || item.unit || "",
            runningQty: null,
          });
        }
      }

      // Stock Adjustments
      const adjustments = await StockAdjustment.find({
        itemName: nameRegex,
        stockType: "Consumable",
        ...(fromDate || toDate ? { date: { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } } : {}),
      }).select("date adjustmentNo adjustmentType qty reason beforeQty afterQty createdBy");

      for (const adj of adjustments) {
        movements.push({
          date: adj.date,
          type: adj.adjustmentType === "Inward" ? "IN" : "OUT",
          source: "Stock Adjustment",
          ref: adj.adjustmentNo || "—",
          description: `${adj.adjustmentType} — ${adj.reason || "Manual adjustment"}`,
          qty: adj.qty || 0,
          weight: 0,
          unit: "",
          beforeQty: adj.beforeQty,
          afterQty: adj.afterQty,
          runningQty: null,
        });
      }

      movements.sort((a, b) => new Date(a.date) - new Date(b.date));
      return res.json({ movements, currentStock });
    }

    res.json({ movements: [], currentStock: null });
  } catch (err) {
    console.error("Stock Movement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
