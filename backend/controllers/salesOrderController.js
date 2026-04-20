const SalesOrder = require("../models/SalesOrder");
const Counter = require("../models/Counter");
const CompanyMaster = require("../models/CompanyMaster");

const getNextSONumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "salesOrder" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `SO-${String(counter.seq).padStart(5, "0")}`;
};

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

exports.getOne = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id).populate(
      "createdBy",
      "name username",
    );
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }
    res.json({ salesOrder });
  } catch (error) {
    console.error("Get sales order error:", error);
    res.status(500).json({ error: "Failed to fetch sales order" });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      orderDate,
      deliveryDate,
      salesPerson,
      companyCategory,
      companyName,
      remarks,
      items,
      status,
    } = req.body;

    if (
      !orderDate ||
      !deliveryDate ||
      !companyName ||
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const soNo = await getNextSONumber();

    const existingSO = await SalesOrder.findOne({ soNo });
    if (existingSO) {
      return res.status(400).json({ error: "SO number already exists" });
    }

    const salesOrder = new SalesOrder({
      soNo,
      orderDate: new Date(orderDate),
      deliveryDate: new Date(deliveryDate),
      salesPerson: salesPerson?.trim(),
      companyCategory: companyCategory?.trim(),
      companyName: companyName.trim(),
      remarks: remarks?.trim(),
      items,
      status: status || "Open",
      createdBy: req.user._id,
    });

    await salesOrder.save();
    await salesOrder.populate("createdBy", "name username");

    if (companyName && companyName.trim()) {
      const existingClient = await CompanyMaster.findOne({
        name: { $regex: new RegExp(`^${companyName.trim()}$`, "i") },
      });

      if (!existingClient) {
        const newClient = new CompanyMaster({
          name: companyName.trim(),
          category: companyCategory?.trim(),
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

exports.update = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to update sales orders" });
  }
  try {
    const {
      orderDate,
      deliveryDate,
      salesPerson,
      companyCategory,
      companyName,
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
    if (companyCategory !== undefined)
      salesOrder.companyCategory = companyCategory?.trim();
    if (companyName) salesOrder.companyName = companyName.trim();
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

exports.delete = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to delete sales orders" });
  }
  try {
    const { id } = req.params;

    const salesOrder = await SalesOrder.findById(id);
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

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

exports.updateStatus = async (req, res) => {
  if (req.user && req.user.role === "Client") {
    return res
      .status(403)
      .json({ error: "Clients are not allowed to update order status" });
  }
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !["Open", "In Production", "Dispatched", "Closed", "Cancelled"].includes(
        status,
      )
    ) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const salesOrder = await SalesOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true },
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
