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
    const regex = q
      ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : /.*/;

    let items = [];
    if (type === "rm") {
      const docs = await RawMaterialStock.find({ name: regex })
        .select("_id name code category paperType gsm unit")
        .limit(30);
      items = docs.map((d) => ({
        _id: d._id,
        name: d.name,
        code: d.code,
        category: d.category,
        paperType: d.paperType,
        gsm: d.gsm,
        unit: d.unit,
      }));
    } else if (type === "fg") {
      const docs = await FGStock.find({ itemName: regex })
        .select("_id itemName itemCode category")
        .limit(30);
      items = docs.map((d) => ({
        _id: d._id,
        name: d.itemName,
        code: d.itemCode,
        category: d.category,
      }));
    } else if (type === "cn") {
      const docs = await ConsumableStock.find({ name: regex })
        .select("_id name code category unit")
        .limit(30);
      items = docs.map((d) => ({
        _id: d._id,
        name: d.name,
        code: d.code,
        category: d.category,
        unit: d.unit,
      }));
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
    if (!itemName)
      return res.json({
        ledger: [],
        openingQty: 0,
        openingWeight: 0,
        currentStock: null,
      });

    const nameRegex = new RegExp(
      `^${itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

    const dateFilter = (field) => ({
      ...(fromDate && {
        [field]: {
          ...(fromDate || toDate
            ? {
                ...(fromDate && { $gte: fromDate }),
                ...(toDate && { $lte: toDate }),
              }
            : {}),
        },
      }),
    });

    // helper: build $gte/$lte filter for a date field
    const dRange = (fromDate, toDate) => ({
      ...(fromDate && { $gte: fromDate }),
      ...(toDate && { $lte: toDate }),
    });

    const txns = []; // { date, txnType, ref, description, inward, outward, weight }

    /* ─── RAW MATERIAL ─── */
    if (type === "rm") {
      // Look up by code first (more reliable), then name
      const stock =
        (await RawMaterialStock.findOne({ name: nameRegex })) || null;
      const currentQty = stock ? stock.qty || 0 : 0;
      const currentWeight = stock ? stock.weight || 0 : 0;
      const unit = stock?.unit || "sheets";
      const isWeightBased =
        unit === "kg" || (stock?.category || "").toLowerCase().includes("reel");

      // Helper: does a GRN item match the requested stock item?
      const itemMatches = (item) =>
        nameRegex.test(item.rmItem || "") ||
        nameRegex.test(item.itemName || "") ||
        (stock?.code &&
          (item.productCode || "").trim().toUpperCase() ===
            (stock.code || "").trim().toUpperCase());

      // ── Material Inward (GRN) ── match by rmItem, itemName, OR productCode
      const inwardOrClauses = [
        { "items.rmItem": nameRegex },
        { "items.itemName": nameRegex },
      ];
      if (stock?.code) {
        inwardOrClauses.push({ "items.productCode": stock.code });
      }

      const inwards = await MaterialInward.find({
        $or: inwardOrClauses,
        ...(fromDate || toDate ? { inwardDate: dRange(fromDate, toDate) } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (!itemMatches(item)) continue;
          const qty = Number(item.noOfSheets || item.qty || 0);
          const weight = Number(item.weight || 0);
          txns.push({
            date: inward.inwardDate,
            txnType: "Inward",
            ref: inward.inwardNo,
            description: `GRN from ${inward.vendorName || "Vendor"}`,
            inward: isWeightBased ? weight : qty,
            outward: 0,
            weight,
          });
        }
      }

      // ── Job Orders (RM consumption → Outward) ──
      // Parse sheet dimensions from stock so we can match precisely by size.
      // Using only paperType+gsm is too broad — it catches ALL sheets of the
      // same type regardless of size (e.g. RM0123 905x690mm vs RM0114 660x920mm).
      let stockSheetW = null;
      let stockSheetL = null;
      if (stock?.sheetSize) {
        const m = stock.sheetSize.match(/^(\d+)[x×](\d+)/i);
        if (m) {
          stockSheetW = parseInt(m[1]);
          stockSheetL = parseInt(m[2]);
        }
      }

      const joOrClauses = [];

      if (stock?.paperType) {
        const ptRx = new RegExp(
          stock.paperType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        );
        // Primary: exact paper type + gsm + sheet dimensions (both primary and second-paper slots)
        if (stockSheetW && stockSheetL) {
          joOrClauses.push({
            paperType: ptRx,
            paperGsm: stock.gsm || undefined,
            sheetW: stockSheetW,
            sheetL: stockSheetL,
          });
          joOrClauses.push({
            paperType2: ptRx,
            paperGsm2: stock.gsm || undefined,
            sheetW: stockSheetW,
            sheetL: stockSheetL,
          });
        } else if (stock.gsm) {
          // No size info — fall back to type+gsm (less precise)
          joOrClauses.push({ paperType: ptRx, paperGsm: stock.gsm });
        }
      }

      // Polycoated paper matching (separate RM slot, has its own StockId reference)
      joOrClauses.push({ polycoatedRmName: nameRegex });
      if (stock?._id) joOrClauses.push({ polycoatedRmStockId: stock._id });

      if (joOrClauses.length) {
        const jos = await JobOrder.find({
          $or: joOrClauses,
          status: { $in: ["In Progress", "Completed", "Scheduled", "Draft"] },
          ...(fromDate || toDate
            ? { jobcardDate: dRange(fromDate, toDate) }
            : {}),
        }).select(
          "joNo jobcardDate itemName paperType paperType2 paperGsm paperGsm2 paperCategory sheetW sheetL noOfSheets noOfSheets2 reelWeightKg polycoatedWeightKg polycoatedRmName polycoatedRmStockId status",
        );

        for (const jo of jos) {
          const isPolycoated =
            nameRegex.test(jo.polycoatedRmName || "") ||
            (stock?._id &&
              String(jo.polycoatedRmStockId) === String(stock._id));
          if (isPolycoated) {
            const kg = jo.polycoatedWeightKg || 0;
            txns.push({
              date: jo.jobcardDate,
              txnType: "Production",
              ref: jo.joNo,
              description: `Consumed for: ${jo.itemName || ""}`,
              inward: 0,
              outward: kg,
              weight: kg,
            });
          } else {
            // Determine if this matched via second-paper slot
            const ptRx2 = stock?.paperType
              ? new RegExp(
                  stock.paperType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                )
              : null;
            const isSecond =
              ptRx2 &&
              ptRx2.test(jo.paperType2 || "") &&
              (!stock?.gsm || jo.paperGsm2 === stock.gsm) &&
              (!stockSheetW ||
                (jo.sheetW === stockSheetW && jo.sheetL === stockSheetL));
            const isReel = (jo.paperCategory || "")
              .toLowerCase()
              .includes("reel");
            const qty = isSecond ? jo.noOfSheets2 || 0 : jo.noOfSheets || 0;
            const wt = jo.reelWeightKg || 0;
            const outQty = isWeightBased || isReel ? wt : qty;
            txns.push({
              date: jo.jobcardDate,
              txnType: "Production",
              ref: jo.joNo,
              description: `Consumed for: ${jo.itemName || ""} (${jo.paperType || ""})`,
              inward: 0,
              outward: outQty,
              weight: wt,
            });
          }
        }
      }

      // ── Stock Adjustments ──
      const adjs = await StockAdjustment.find({
        itemName: nameRegex,
        stockType: "Raw Material",
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("date adjustmentNo adjustmentType qty weight reason");

      for (const adj of adjs) {
        const isIn = adj.adjustmentType === "Inward";
        const qty = isWeightBased ? adj.weight || adj.qty || 0 : adj.qty || 0;
        txns.push({
          date: adj.date,
          txnType: "Stock Adjustment",
          ref: adj.adjustmentNo || "—",
          description: `${adj.adjustmentType}${adj.reason ? ": " + adj.reason : ""}`,
          inward: isIn ? qty : 0,
          outward: isIn ? 0 : qty,
          weight: adj.weight || 0,
        });
      }

      txns.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Compute opening balance by replaying all transactions BEFORE the date range
      // (not backwards from current stock, which can be stale)
      let openingQty = 0;
      let openingWeight = 0;
      if (fromDate) {
        const prevInwards = await MaterialInward.find({
          $or: inwardOrClauses,
          inwardDate: { $lt: fromDate },
        }).select("items inwardDate");
        for (const inw of prevInwards) {
          for (const item of inw.items) {
            if (!itemMatches(item)) continue;
            openingQty += Number(item.noOfSheets || item.qty || 0);
            openingWeight += Number(item.weight || 0);
          }
        }

        const prevAdjs = await StockAdjustment.find({
          itemName: nameRegex,
          stockType: "Raw Material",
          date: { $lt: fromDate },
        }).select("adjustmentType qty weight");
        for (const adj of prevAdjs) {
          const dir = adj.adjustmentType === "Outward" ? -1 : 1;
          openingQty += dir * (Number(adj.qty) || 0);
          openingWeight += dir * (Number(adj.weight) || 0);
        }

        if (joOrClauses.length) {
          const prevJos = await JobOrder.find({
            $or: joOrClauses,
            status: { $in: ["In Progress", "Completed", "Scheduled", "Draft"] },
            jobcardDate: { $lt: fromDate },
          }).select(
            "noOfSheets noOfSheets2 reelWeightKg polycoatedWeightKg polycoatedRmName paperType2 paperGsm2 sheetW sheetL polycoatedRmStockId paperCategory",
          );
          for (const jo of prevJos) {
            const isPolycoated =
              nameRegex.test(jo.polycoatedRmName || "") ||
              (stock?._id &&
                String(jo.polycoatedRmStockId) === String(stock._id));
            const ptRx2 = stock?.paperType
              ? new RegExp(
                  stock.paperType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                )
              : null;
            const isSecond =
              ptRx2 &&
              ptRx2.test(jo.paperType2 || "") &&
              (!stock?.gsm || jo.paperGsm2 === stock.gsm) &&
              (!stockSheetW ||
                (jo.sheetW === stockSheetW && jo.sheetL === stockSheetL));
            const isReel = (jo.paperCategory || "")
              .toLowerCase()
              .includes("reel");
            const outQty = isPolycoated
              ? jo.polycoatedWeightKg || 0
              : isWeightBased || isReel
                ? jo.reelWeightKg || 0
                : isSecond
                  ? jo.noOfSheets2 || 0
                  : jo.noOfSheets || 0;
            openingQty -= outQty;
            openingWeight -=
              isPolycoated || isReel ? outQty : jo.reelWeightKg || 0;
          }
        }

        openingQty = Math.max(0, openingQty);
        openingWeight = Math.max(0, openingWeight);
      }

      const totalIn = txns.reduce((s, t) => s + t.inward, 0);
      const totalOut = txns.reduce((s, t) => s + t.outward, 0);

      return res.json({
        ledger: txns,
        openingQty: isWeightBased ? openingWeight : openingQty,
        openingWeight,
        currentStock: { qty: currentQty, weight: currentWeight, unit },
        isWeightBased,
        itemCode: stock?.code || "",
      });
    }

    /* ─── FINISHED GOODS ─── */
    if (type === "fg") {
      const stock = await FGStock.findOne({ itemName: nameRegex });
      const currentQty = stock ? stock.qty || 0 : 0;

      // Inward: Material Inward (consumable/FG type) + JO production
      const inwards = await MaterialInward.find({
        $or: [{ "items.itemName": nameRegex }],
        ...(fromDate || toDate ? { inwardDate: dRange(fromDate, toDate) } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (!nameRegex.test(item.itemName || "")) continue;
          txns.push({
            date: inward.inwardDate,
            txnType: "Inward",
            ref: inward.inwardNo,
            description: `GRN from ${inward.vendorName || "Vendor"}`,
            inward: item.qty || 0,
            outward: 0,
            weight: 0,
          });
        }
      }

      // Inward: JO production — only Completed JOs (FG is produced when JO completes)
      const jos = await JobOrder.find({
        $or: [{ itemName: nameRegex }, { product: nameRegex }],
        status: "Completed",
        ...(fromDate || toDate ? { updatedAt: dRange(fromDate, toDate) } : {}),
      }).select("joNo jobcardDate updatedAt itemName orderQty status");

      for (const jo of jos) {
        txns.push({
          date: jo.updatedAt || jo.jobcardDate,
          txnType: "Production",
          ref: jo.joNo,
          description: `Produced via Job Order (${jo.status})`,
          inward: jo.orderQty || 0,
          outward: 0,
          weight: 0,
        });
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
          txns.push({
            date: d.date,
            txnType: "Dispatch",
            ref: d.dispatchNo,
            description: `Dispatched to ${d.companyName || "Client"}`,
            inward: 0,
            outward: item.qty || 0,
            weight: 0,
          });
        }
      }

      // Stock Adjustments
      const adjs = await StockAdjustment.find({
        itemName: nameRegex,
        stockType: "Finished Goods",
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("date adjustmentNo adjustmentType qty reason");

      for (const adj of adjs) {
        const isIn = adj.adjustmentType === "Inward";
        txns.push({
          date: adj.date,
          txnType: "Stock Adjustment",
          ref: adj.adjustmentNo || "—",
          description: `${adj.adjustmentType}${adj.reason ? ": " + adj.reason : ""}`,
          inward: isIn ? adj.qty || 0 : 0,
          outward: isIn ? 0 : adj.qty || 0,
          weight: 0,
        });
      }

      txns.sort((a, b) => new Date(a.date) - new Date(b.date));
      const totalIn = txns.reduce((s, t) => s + t.inward, 0);
      const totalOut = txns.reduce((s, t) => s + t.outward, 0);
      const openingQty = Math.max(0, currentQty - totalIn + totalOut);

      return res.json({
        ledger: txns,
        openingQty,
        openingWeight: 0,
        currentStock: { qty: currentQty, unit: "pcs" },
        isWeightBased: false,
        itemCode: stock?.itemCode || "",
      });
    }

    /* ─── CONSUMABLE ─── */
    if (type === "cn") {
      const stock = await ConsumableStock.findOne({ name: nameRegex });
      const currentQty = stock ? stock.qty || 0 : 0;
      const unit = stock?.unit || "pcs";

      const cnOrClauses = [
        { "items.itemName": nameRegex },
        ...(stock?.code ? [{ "items.productCode": stock.code }] : []),
      ];

      const cnItemMatches = (item) =>
        item.materialType === "Consumable" &&
        (nameRegex.test(item.itemName || "") ||
          (stock?.code && (item.productCode || "") === stock.code));

      // Inward: Material Inward
      const inwards = await MaterialInward.find({
        $or: cnOrClauses,
        ...(fromDate || toDate ? { inwardDate: dRange(fromDate, toDate) } : {}),
      }).select("inwardNo inwardDate vendorName items");

      for (const inward of inwards) {
        for (const item of inward.items) {
          if (!cnItemMatches(item)) continue;
          txns.push({
            date: inward.inwardDate,
            txnType: "Inward",
            ref: inward.inwardNo,
            description: `GRN from ${inward.vendorName || "Vendor"}`,
            inward: Number(item.qty || 0),
            outward: 0,
            weight: 0,
          });
        }
      }

      // Outward: Stock Adjustments (Issue/Outward)
      const adjs = await StockAdjustment.find({
        itemName: nameRegex,
        stockType: "Consumable",
        ...(fromDate || toDate ? { date: dRange(fromDate, toDate) } : {}),
      }).select("date adjustmentNo adjustmentType qty reason");

      for (const adj of adjs) {
        const isIn = adj.adjustmentType === "Inward";
        txns.push({
          date: adj.date,
          txnType: "Stock Adjustment",
          ref: adj.adjustmentNo || "—",
          description: `${adj.adjustmentType}${adj.reason ? ": " + adj.reason : ""}`,
          inward: isIn ? adj.qty || 0 : 0,
          outward: isIn ? 0 : adj.qty || 0,
          weight: 0,
        });
      }

      txns.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Opening balance = sum of all transactions before fromDate
      let openingQty = 0;
      if (fromDate) {
        const prevInwards = await MaterialInward.find({
          $or: cnOrClauses,
          inwardDate: { $lt: fromDate },
        }).select("items");
        for (const inw of prevInwards) {
          for (const item of inw.items) {
            if (!cnItemMatches(item)) continue;
            openingQty += Number(item.qty || 0);
          }
        }
        const prevAdjs = await StockAdjustment.find({
          itemName: nameRegex,
          stockType: "Consumable",
          date: { $lt: fromDate },
        }).select("adjustmentType qty");
        for (const adj of prevAdjs) {
          const dir = adj.adjustmentType === "Outward" ? -1 : 1;
          openingQty += dir * (Number(adj.qty) || 0);
        }
        openingQty = Math.max(0, openingQty);
      }

      return res.json({
        ledger: txns,
        openingQty,
        openingWeight: 0,
        currentStock: { qty: currentQty, unit },
        isWeightBased: false,
        itemCode: stock?.code || "",
      });
    }

    res.json({
      ledger: [],
      openingQty: 0,
      openingWeight: 0,
      currentStock: null,
    });
  } catch (err) {
    console.error("Stock Movement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
