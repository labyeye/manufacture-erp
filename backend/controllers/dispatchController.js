const Dispatch = require("../models/Dispatch");
const Counter = require("../models/Counter");
const FGStock = require("../models/FGStock");

const adjustFGStock = async (items, direction = -1) => {
  for (const item of items) {
    // Attempt to find the best matching FG Stock entry
    // Usually, we match by itemName. In a multi-JO environment, we'd pick the first available.
    const stockItem = await FGStock.findOne({ itemName: item.itemName }).sort({ createdAt: 1 });
    if (stockItem) {
      stockItem.qty += (item.qty * direction);
      if (stockItem.qty < 0) stockItem.qty = 0;
      await stockItem.save();
    }
  }
};




const getNextDispatchNo = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "dispatch" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `DIS-${String(counter.seq).padStart(5, "0")}`;
};




exports.getAll = async (req, res) => {
  try {
    const dispatches = await Dispatch.find()
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
    const dispatch = await Dispatch.findById(req.params.id)
      .populate("createdBy", "name username");
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
      clientName,
      soRef,
      joRef,
      vehicleNo,
      driverName,
      lrNo,
      items,
      remarks,
    } = req.body;

    
    if (!date || !clientName || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    
    const dispatchNo = await getNextDispatchNo();

    const dispatch = new Dispatch({
      dispatchNo,
      date: new Date(date),
      clientName: clientName.trim(),
      soRef: soRef?.trim(),
      joRef: joRef?.trim(),
      vehicleNo: vehicleNo?.trim(),
      driverName: driverName?.trim(),
      lrNo: lrNo?.trim(),
      items,
      remarks: remarks?.trim(),
      createdBy: req.user._id,
    });

    await dispatch.save();
    await dispatch.populate("createdBy", "name username");

    // Deduct from FG Stock
    await adjustFGStock(items, -1);

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
      clientName,
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
    if (clientName) dispatch.clientName = clientName.trim();
    if (soRef !== undefined) dispatch.soRef = soRef?.trim();
    if (joRef !== undefined) dispatch.joRef = joRef?.trim();
    if (vehicleNo !== undefined) dispatch.vehicleNo = vehicleNo?.trim();
    if (driverName !== undefined) dispatch.driverName = driverName?.trim();
    if (lrNo !== undefined) dispatch.lrNo = lrNo?.trim();
    // Handle stock reversal for old items and deduction for new items
    if (items) {
      await adjustFGStock(dispatch.items, 1); // Reverse old
      dispatch.items = items;
      await adjustFGStock(items, -1); // Apply new
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

    // Restore stock before deleting
    await adjustFGStock(dispatch.items, 1);

    await Dispatch.findByIdAndDelete(id);

    res.json({ message: "Dispatch deleted successfully" });
  } catch (error) {
    console.error("Delete dispatch error:", error);
    res.status(500).json({ error: "Failed to delete dispatch" });
  }
};
