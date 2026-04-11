const SalesOrder = require("../models/SalesOrder");
const Counter = require("../models/Counter");
const ClientMaster = require("../models/ClientMaster");

/**
 * Get next SO number
 */
const getNextSONumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "salesOrder" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `SO-${String(counter.seq).padStart(5, "0")}`;
};

/**
 * Get all sales orders
 */
exports.getAll = async (req, res) => {
  try {
    const salesOrders = await SalesOrder.find()
      .populate("createdBy", "name username")
      .sort({ createdAt: -1 });
    res.json({ salesOrders });
  } catch (error) {
    console.error("Get sales orders error:", error);
    res.status(500).json({ error: "Failed to fetch sales orders" });
  }
};

/**
 * Get single sales order
 */
exports.getOne = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id)
      .populate("createdBy", "name username");
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }
    res.json({ salesOrder });
  } catch (error) {
    console.error("Get sales order error:", error);
    res.status(500).json({ error: "Failed to fetch sales order" });
  }
};

/**
 * Create sales order
 */
exports.create = async (req, res) => {
  try {
    const {
      orderDate,
      deliveryDate,
      salesPerson,
      clientCategory,
      clientName,
      remarks,
      items,
      status,
    } = req.body;

    // Validation
    if (!orderDate || !deliveryDate || !clientName || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate SO number
    const soNo = await getNextSONumber();

    // Check if SO number already exists (shouldn't happen with proper counter)
    const existingSO = await SalesOrder.findOne({ soNo });
    if (existingSO) {
      return res.status(400).json({ error: "SO number already exists" });
    }

    const salesOrder = new SalesOrder({
      soNo,
      orderDate: new Date(orderDate),
      deliveryDate: new Date(deliveryDate),
      salesPerson: salesPerson?.trim(),
      clientCategory: clientCategory?.trim(),
      clientName: clientName.trim(),
      remarks: remarks?.trim(),
      items,
      status: status || "Open",
      createdBy: req.user._id,
    });

    await salesOrder.save();
    await salesOrder.populate("createdBy", "name username");

    // Auto-create client if doesn't exist
    if (clientName && clientName.trim()) {
      const existingClient = await ClientMaster.findOne({
        name: { $regex: new RegExp(`^${clientName.trim()}$`, 'i') }
      });

      if (!existingClient) {
        const newClient = new ClientMaster({
          name: clientName.trim(),
          category: clientCategory?.trim(),
          status: "Active",
          createdBy: req.user._id,
        });
        await newClient.save();
      }
    }

    res.status(201).json({
      message: "Sales order created successfully",
      salesOrder,
    });
  } catch (error) {
    console.error("Create sales order error:", error);
    res.status(500).json({ error: "Failed to create sales order" });
  }
};

/**
 * Update sales order
 */
exports.update = async (req, res) => {
  try {
    const {
      orderDate,
      deliveryDate,
      salesPerson,
      clientCategory,
      clientName,
      remarks,
      items,
      status,
    } = req.body;
    const { id } = req.params;

    const salesOrder = await SalesOrder.findById(id);
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (orderDate) salesOrder.orderDate = new Date(orderDate);
    if (deliveryDate) salesOrder.deliveryDate = new Date(deliveryDate);
    if (salesPerson !== undefined) salesOrder.salesPerson = salesPerson?.trim();
    if (clientCategory !== undefined) salesOrder.clientCategory = clientCategory?.trim();
    if (clientName) salesOrder.clientName = clientName.trim();
    if (remarks !== undefined) salesOrder.remarks = remarks?.trim();
    if (items) salesOrder.items = items;
    if (status) salesOrder.status = status;

    await salesOrder.save();
    await salesOrder.populate("createdBy", "name username");

    res.json({
      message: "Sales order updated successfully",
      salesOrder,
    });
  } catch (error) {
    console.error("Update sales order error:", error);
    res.status(500).json({ error: "Failed to update sales order" });
  }
};

/**
 * Delete sales order
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const salesOrder = await SalesOrder.findById(id);
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    // Don't allow deletion of dispatched or closed orders
    if (["Dispatched", "Closed"].includes(salesOrder.status)) {
      return res
        .status(400)
        .json({ error: "Cannot delete dispatched or closed sales orders" });
    }

    await SalesOrder.findByIdAndDelete(id);

    res.json({ message: "Sales order deleted successfully" });
  } catch (error) {
    console.error("Delete sales order error:", error);
    res.status(500).json({ error: "Failed to delete sales order" });
  }
};

/**
 * Update sales order status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Open", "In Production", "Dispatched", "Closed", "Cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const salesOrder = await SalesOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("createdBy", "name username");

    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    res.json({
      message: "Status updated successfully",
      salesOrder,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
