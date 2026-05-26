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
      const docs = await RawMaterialStock.find({ name: regex }).select("_id name code category paperType gsm unit").limit(30);
      items = docs.map((d) => ({ _id: d._id, name: d.name, code: d.code, category: d.category, paperType: d.paperType, gsm: d.gsm, unit: d.unit }));
    } else if (type === "fg") {
      const docs = await FGStock.find({ itemName: regex }).select("_id itemName itemCode category").limit(30);
      items = docs.map((d) => ({ _id: d._id, name: d.itemName, code: d.itemCode, category: d.category }));
    } else if (type === "cn") {
      const docs = await ConsumableStock.find({ name: regex }).select("_id name code category unit").limit(30);
      items = docs.map((d) => ({ _id: d._id, name: d.name, code: d.code, category: d.category, unit: d.unit }));
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
    if (!itemName) return res.json({ ledger: [], openingQty: 0, openingWeight: 0, currentStock: null });

    const nameRegex = new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

    const dateFilter = (field) => ({
      ...(fromDate && { [field]: { ...((fromDate || toDate) ? { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) } : {}) } }),
    });

    // helper: build $gte/$lte filter for a date field
    const dRange = (fromDate, toDate) => ({
      ...(fromDate && { $gte: fromDate }),
      ...(toDate && { $lte: toDate }),
    });

    const txns = []; // { date, txnType, ref, description, inward, outward, weight }

    /* ─── RAW MATERIAL ─── */
    if (type === "rm") {
      const stock = await RawMaterialStock.findOne({ name: nameRegex });
      const currentQty = stock ? (stock.qty || 0) : 0;
      const currentWeight = stock ? (stock.weight || 0) : 0;
      const unit = stock?.unit || "sheets";
      const isWeightBased = unit === "kg" || (stock?.category || "").toLowerCase().includes("reel");

      // ── Material Inward (GRN) ──
      const inwards = await MaterialInward.find({
        $or: [
          { "items.rmItem": nameRegex },
          ...(stock?.code ? [{ "items.productCode": stock.code }] : []),
        ],
        ...(fromDate || toDate ? { inwardDate: dRange(fromDate, toDate) } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (!nameRegex.test(item.rmItem || "") && !(stock?.code && item.productCode === stock.code)) continue;
          const qty = item.noOfSheets || item.qty || 0;
          const weight = item.weight || 0;
          txns.push({ date: inward.inwardDate, txnType: "Inward", ref: inward.inwardNo, description: `GRN from ${inward.vendorName || "Vendor"}`, inward: isWeightBased ? weight : qty, outward: 0, weight });
        }
      }

      // ── Job Orders (RM consumption → Outward) ──
      const joOrClauses = [];
      if (stock?._id) { joOrClauses.push({ rmStockId: stock._id }); joOrClauses.push({ rmStockId2: stock._id }); }
      if (stock?.paperType) {
        const ptRx = new RegExp(stock.paperType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const clause = { paperType: ptRx };
        if (stock.gsm) clause.paperGsm = stock.gsm;
        joOrClauses.push(clause);
      }
      joOrClauses.push({ polycoatedRmName: nameRegex });
      if (stock?._id) joOrClauses.push({ polycoatedRmStockId: stock._id });

      if (joOrClauses.length) {
        const jos = await JobOrder.find({
          $or: joOrClauses,
          status: { $in: ["In Progress", "Completed", "Scheduled", "Draft"] },
          ...(fromDate || toDate ? { jobcardDate: dRange(fromDate, toDate) } : {}),
        }).select("joNo jobcardDate itemName paperType paperGsm paperCategory noOfSheets noOfSheets2 reelWeightKg polycoatedWeightKg polycoatedRmName rmStockId rmStockId2 polycoatedRmStockId status");

        for (const jo of jos) {
          const isPolycoated = nameRegex.test(jo.polycoatedRmName || "") || (stock?._id && String(jo.polycoatedRmStockId) === String(stock._id));
          if (isPolycoated) {
            const kg = jo.polycoatedWeightKg || 0;
            txns.push({ date: jo.jobcardDate, txnType: "Production", ref: jo.joNo, description: `Consumed for: ${jo.itemName || ""}`, inward: 0, outward: kg, weight: kg });
          } else {
            const isSecond = stock?._id && String(jo.rmStockId2) === String(stock._id);
            const isReel = (jo.paperCategory || "").toLowerCase().includes("reel");
            const qty = isSecond ? (jo.noOfSheets2 || 0) : (jo.noOfSheets || 0);
            const wt = jo.reelWeightKg || 0;
            const outQty = isWeightBased || isReel ? wt : qty;
            txns.push({ date: jo.jobcardDate, txnType: "Production", ref: jo.joNo, description: `Consumed for: ${jo.itemName || ""} (${jo.paperType || ""})`, inward: 0, outward: outQty, weight: wt });
          }
        }
      }

      // ── Stock Adjustments ──
      const adjs = await StockAdjustment.find({
        itemName: nameRegex, stockType: "Raw Material",
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("date adjustmentNo adjustmentType qty weight reason");

      for (const adj of adjs) {
        const isIn = adj.adjustmentType === "Inward";
        const qty = isWeightBased ? (adj.weight || adj.qty || 0) : (adj.qty || 0);
        txns.push({ date: adj.date, txnType: isIn ? "Inward" : "Outward", ref: adj.adjustmentNo || "—", description: `Adj: ${adj.reason || adj.adjustmentType}`, inward: isIn ? qty : 0, outward: isIn ? 0 : qty, weight: adj.weight || 0 });
      }

      txns.sort((a, b) => new Date(a.date) - new Date(b.date));

      const totalIn = txns.reduce((s, t) => s + t.inward, 0);
      const totalOut = txns.reduce((s, t) => s + t.outward, 0);
      const openingQty = isWeightBased ? Math.max(0, currentWeight - totalIn + totalOut) : Math.max(0, currentQty - totalIn + totalOut);

      return res.json({ ledger: txns, openingQty, openingWeight: Math.max(0, currentWeight - totalIn + totalOut), currentStock: { qty: currentQty, weight: currentWeight, unit }, isWeightBased, itemCode: stock?.code || "" });
    }

    /* ─── FINISHED GOODS ─── */
    if (type === "fg") {
      const stock = await FGStock.findOne({ itemName: nameRegex });
      const currentQty = stock ? (stock.qty || 0) : 0;

      // Inward: Material Inward (consumable/FG type) + JO production
      const inwards = await MaterialInward.find({
        $or: [{ "items.itemName": nameRegex }],
        ...(fromDate || toDate ? { inwardDate: dRange(fromDate, toDate) } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (!nameRegex.test(item.itemName || "")) continue;
          txns.push({ date: inward.inwardDate, txnType: "Inward", ref: inward.inwardNo, description: `GRN from ${inward.vendorName || "Vendor"}`, inward: item.qty || 0, outward: 0, weight: 0 });
        }
      }

      // Inward: JO production
      const jos = await JobOrder.find({
        $or: [{ itemName: nameRegex }, { product: nameRegex }],
        status: { $in: ["In Progress", "Completed"] },
        ...(fromDate || toDate ? { jobcardDate: dRange(fromDate, toDate) } : {}),
      }).select("joNo jobcardDate itemName orderQty status");

      for (const jo of jos) {
        txns.push({ date: jo.jobcardDate, txnType: "Production", ref: jo.joNo, description: `Produced via Job Order`, inward: jo.orderQty || 0, outward: 0, weight: 0 });
      }

      // Outward: Dispatch
      const dispatches = await Dispatch.find({
        "items.itemName": nameRegex,
        type: { $ne: "Return" },
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("dispatchNo date companyName items");

      for (const d of dispatches) {
        for (const item of d.items || []) {
          if (!nameRegex.test(item.itemName || "")) continue;
          txns.push({ date: d.date, txnType: "Dispatch", ref: d.dispatchNo, description: `Dispatched to ${d.companyName || "Client"}`, inward: 0, outward: item.qty || 0, weight: 0 });
        }
      }

      // Stock Adjustments
      const adjs = await StockAdjustment.find({
        itemName: nameRegex, stockType: "Finished Goods",
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("date adjustmentNo adjustmentType qty reason");

      for (const adj of adjs) {
        const isIn = adj.adjustmentType === "Inward";
        txns.push({ date: adj.date, txnType: isIn ? "Inward" : "Outward", ref: adj.adjustmentNo || "—", description: `Adj: ${adj.reason || adj.adjustmentType}`, inward: isIn ? (adj.qty || 0) : 0, outward: isIn ? 0 : (adj.qty || 0), weight: 0 });
      }

      txns.sort((a, b) => new Date(a.date) - new Date(b.date));
      const totalIn = txns.reduce((s, t) => s + t.inward, 0);
      const totalOut = txns.reduce((s, t) => s + t.outward, 0);
      const openingQty = Math.max(0, currentQty - totalIn + totalOut);

      return res.json({ ledger: txns, openingQty, openingWeight: 0, currentStock: { qty: currentQty, unit: "pcs" }, isWeightBased: false, itemCode: stock?.itemCode || "" });
    }

    /* ─── CONSUMABLE ─── */
    if (type === "cn") {
      const stock = await ConsumableStock.findOne({ name: nameRegex });
      const currentQty = stock ? (stock.qty || 0) : 0;
      const unit = stock?.unit || "pcs";

      // Inward: Material Inward
      const inwards = await MaterialInward.find({
        "items.itemName": nameRegex,
        "items.materialType": "Consumable",
        ...(fromDate || toDate ? { inwardDate: dRange(fromDate, toDate) } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (item.materialType !== "Consumable" || !nameRegex.test(item.itemName || "")) continue;
          txns.push({ date: inward.inwardDate, txnType: "Inward", ref: inward.inwardNo, description: `GRN from ${inward.vendorName || "Vendor"}`, inward: item.qty || 0, outward: 0, weight: 0 });
        }
      }

      // Outward: Stock Adjustments (Issue/Outward)
      const adjs = await StockAdjustment.find({
        itemName: nameRegex, stockType: "Consumable",
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("date adjustmentNo adjustmentType qty reason");

      for (const adj of adjs) {
        const isIn = adj.adjustmentType === "Inward";
        txns.push({ date: adj.date, txnType: isIn ? "Inward" : "Issue", ref: adj.adjustmentNo || "—", description: adj.reason || adj.adjustmentType, inward: isIn ? (adj.qty || 0) : 0, outward: isIn ? 0 : (adj.qty || 0), weight: 0 });
      }

      txns.sort((a, b) => new Date(a.date) - new Date(b.date));
      const totalIn = txns.reduce((s, t) => s + t.inward, 0);
      const totalOut = txns.reduce((s, t) => s + t.outward, 0);
      const openingQty = Math.max(0, currentQty - totalIn + totalOut);

      return res.json({ ledger: txns, openingQty, openingWeight: 0, currentStock: { qty: currentQty, unit }, isWeightBased: false, itemCode: stock?.code || "" });
    }

    res.json({ ledger: [], openingQty: 0, openingWeight: 0, currentStock: null });
  } catch (err) {
    console.error("Stock Movement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
