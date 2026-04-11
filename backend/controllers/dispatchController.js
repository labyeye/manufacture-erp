const Dispatch = require("../models/Dispatch");
const Counter = require("../models/Counter");

/**
 * Get next Dispatch number
 */
const getNextDispatchNo = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "dispatch" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `DIS-${String(counter.seq).padStart(5, "0")}`;
};

/**
 * Get all dispatches
 */
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

/**
 * Get single dispatch
 */
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

/**
 * Create dispatch
 */
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

    // Validation
    if (!date || !clientName || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate Dispatch number
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

    res.status(201).json({
      message: "Dispatch created successfully",
      dispatch,
    });
  } catch (error) {
    console.error("Create dispatch error:", error);
    res.status(500).json({ error: "Failed to create dispatch" });
  }
};

/**
 * Update dispatch
 */
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
    if (items) dispatch.items = items;
    if (remarks !== undefined) dispatch.remarks = remarks?.trim();

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

/**
 * Delete dispatch
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await Dispatch.findById(id);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }

    await Dispatch.findByIdAndDelete(id);

    res.json({ message: "Dispatch deleted successfully" });
  } catch (error) {
    console.error("Delete dispatch error:", error);
    res.status(500).json({ error: "Failed to delete dispatch" });
  }
};
