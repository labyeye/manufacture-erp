const Dispatch = require("../models/Dispatch");
const Counter = require("../models/Counter");
const FGStock = require("../models/FGStock");
const RawMaterialStock = require("../models/RawMaterialStock");
const ConsumableStock = require("../models/ConsumableStock");
const CompanyMaster = require("../models/CompanyMaster");

const adjustFGStock = async (items, direction = -1, dispatchMeta = {}) => {
  const { dispatchNo, dispatchDate, dispatchType, createdBy } = dispatchMeta;
  const histType =
    dispatchType === "Return"
      ? "return"
      : direction === -1
        ? "dispatch"
        : "return";
  const histDate = dispatchDate ? new Date(dispatchDate) : new Date();

  for (const item of items) {
    let remainingToAdjust = Number(item.qty || 0);
    if (remainingToAdjust <= 0) continue;

    // Find the single FGStock record for this item (unique index on itemName)
    const stock = await FGStock.findOne({ itemName: item.itemName });
    if (!stock) continue;

    stock.qty = (stock.qty || 0) + direction * remainingToAdjust;

    // Push history entry if meta is provided (i.e. called from dispatch controller)
    if (dispatchNo !== undefined) {
      stock.stockHistory.push({
        date: histDate,
        qty: direction * remainingToAdjust,
        type: histType,
        ref: dispatchNo || "",
        createdBy,
      });
    }

    await stock.save();
  }
};

const adjustRMStock = async (items, direction = -1) => {
  for (const item of items) {
    const qty = Number(item.qty || 0);
    const weight = Number(item.weight || item.qty || 0);
    if (qty <= 0 && weight <= 0) continue;
    const query = item.productCode
      ? { code: item.productCode }
      : {
          name: {
            $regex: new RegExp(`^${(item.itemName || "").trim()}$`, "i"),
          },
        };
    await RawMaterialStock.findOneAndUpdate(query, {
      $inc: { qty: qty * direction, weight: weight * direction },
    });
  }
};

const adjustCGStock = async (items, direction = -1) => {
  for (const item of items) {
    const qty = Number(item.qty || 0);
    if (qty <= 0) continue;
    const query = item.productCode
      ? { code: item.productCode }
      : {
          name: {
            $regex: new RegExp(`^${(item.itemName || "").trim()}$`, "i"),
          },
        };
    await ConsumableStock.findOneAndUpdate(query, {
      $inc: { qty: qty * direction },
    });
  }
};

const getNextDispatchNo = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "dispatch" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `DIS-${String(counter.seq).padStart(5, "0")}`;
};

exports.getAll = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.role === "Client" && req.user?.clientTag) {
      const tag = req.user.clientTag.trim();
      const companies = await CompanyMaster.find({
        category: { $regex: new RegExp(`^${tag}$`, "i") },
      }).select("name");
      const allowedNames = companies.map((c) => c.name);
      filter.$or = [
        { clientCategory: { $regex: new RegExp(`^${tag}$`, "i") } },
        {
          clientCategory: { $in: [null, ""] },
          companyName: { $in: allowedNames },
        },
        {
          clientCategory: { $exists: false },
          companyName: { $in: allowedNames },
        },
      ];
    }

    const dispatches = await Dispatch.find(filter)
      .populate("createdBy", "name username")
      .sort({ createdAt: -1 });
    res.json({ dispatches });
  } catch (error) {
    console.error("Get dispatches error:", error);
    res.status(500).json({ error: "Failed to fetch dispatches" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id).populate(
      "createdBy",
      "name username",
    );
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }
    res.json({ dispatch });
  } catch (error) {
    console.error("Get dispatch error:", error);
    res.status(500).json({ error: "Failed to fetch dispatch" });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      date,
      companyName,
      soRef,
      joRef,
      vehicleNo,
      driverName,
      lrNo,
      items,
      remarks,
      clientCategory,
    } = req.body;

    if (!date || !companyName || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const dispatchNo = await getNextDispatchNo();
    const recordType = req.body.type === "Return" ? "Return" : "Outward";

    const materialType = ["RM", "CG", "FG"].includes(req.body.materialType)
      ? req.body.materialType
      : "FG";

    const dispatch = new Dispatch({
      dispatchNo,
      date: new Date(date),
      companyName: companyName.trim(),
      soRef: soRef?.trim(),
      joRef: joRef?.trim(),
      vehicleNo: vehicleNo?.trim(),
      driverName: driverName?.trim(),
      lrNo: lrNo?.trim(),
      items,
      remarks: remarks?.trim(),
      type: recordType,
      materialType,
      clientCategory: clientCategory?.trim() || "",
      originalDispatchRef: req.body.originalDispatchRef?.trim(),
      returnReason: req.body.returnReason?.trim(),
      createdBy: req.user._id,
    });

    await dispatch.save();
    await dispatch.populate("createdBy", "name username");

    const stockDirection = recordType === "Return" ? 1 : -1;
    if (materialType === "RM") await adjustRMStock(items, stockDirection);
    else if (materialType === "CG") await adjustCGStock(items, stockDirection);
    else
      await adjustFGStock(items, stockDirection, {
        dispatchNo,
        dispatchDate: date,
        dispatchType: recordType,
        createdBy: req.user?._id,
      });

    res.status(201).json({
      message: "Dispatch created successfully",
      dispatch,
    });
  } catch (error) {
    console.error("Create dispatch error:", error);
    res.status(500).json({ error: "Failed to create dispatch" });
  }
};

exports.update = async (req, res) => {
  try {
    const {
      date,
      companyName,
      soRef,
      joRef,
      vehicleNo,
      driverName,
      lrNo,
      items,
      remarks,
    } = req.body;
    const { id } = req.params;

    const dispatch = await Dispatch.findById(id);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }

    if (date) dispatch.date = new Date(date);
    if (companyName) dispatch.companyName = companyName.trim();
    if (soRef !== undefined) dispatch.soRef = soRef?.trim();
    if (joRef !== undefined) dispatch.joRef = joRef?.trim();
    if (vehicleNo !== undefined) dispatch.vehicleNo = vehicleNo?.trim();
    if (driverName !== undefined) dispatch.driverName = driverName?.trim();
    if (lrNo !== undefined) dispatch.lrNo = lrNo?.trim();
    if (req.body.clientCategory !== undefined)
      dispatch.clientCategory = req.body.clientCategory?.trim() || "";

    if (items) {
      const mt = dispatch.materialType || "FG";
      const meta = {
        dispatchNo: dispatch.dispatchNo,
        dispatchDate: dispatch.date,
        dispatchType: dispatch.type,
        createdBy: req.user?._id,
      };
      if (mt === "RM") {
        await adjustRMStock(dispatch.items, 1);
        dispatch.items = items;
        await adjustRMStock(items, -1);
      } else if (mt === "CG") {
        await adjustCGStock(dispatch.items, 1);
        dispatch.items = items;
        await adjustCGStock(items, -1);
      } else {
        await adjustFGStock(dispatch.items, 1, {
          ...meta,
          dispatchType: "Return",
        });
        dispatch.items = items;
        await adjustFGStock(items, -1, meta);
      }
    }

    await dispatch.save();
    await dispatch.populate("createdBy", "name username");

    res.json({
      message: "Dispatch updated successfully",
      dispatch,
    });
  } catch (error) {
    console.error("Update dispatch error:", error);
    res.status(500).json({ error: "Failed to update dispatch" });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await Dispatch.findById(id);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }

    const mt = dispatch.materialType || "FG";
    if (mt === "RM") await adjustRMStock(dispatch.items, 1);
    else if (mt === "CG") await adjustCGStock(dispatch.items, 1);
    else
      await adjustFGStock(dispatch.items, 1, {
        dispatchNo: dispatch.dispatchNo,
        dispatchDate: dispatch.date,
        dispatchType: "Return",
        createdBy: req.user?._id,
      });

    await Dispatch.findByIdAndDelete(id);

    res.json({ message: "Dispatch deleted successfully" });
  } catch (error) {
    console.error("Delete dispatch error:", error);
    res.status(500).json({ error: "Failed to delete dispatch" });
  }
};
