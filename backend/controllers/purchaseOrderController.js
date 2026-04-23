const PurchaseOrder = require("../models/PurchaseOrder");
const VendorMaster = require("../models/VendorMaster");
const ItemMaster = require("../models/ItemMaster");
const MaterialInward = require("../models/MaterialInward");
const mongoose = require("mongoose");
const { generatePONo } = require("../utils/counters");

exports.getAll = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate("createdBy", "name username")
      .sort({ createdAt: -1 });
    res.json({ purchaseOrders: pos });
  } catch (error) {
    console.error("Get POs error:", error);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    res.json({ purchaseOrder: po });
  } catch (error) {
    console.error("Get PO error:", error);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
};

exports.create = async (req, res) => {
  try {
    const { poNo, poDate, vendor, items, deliveryDate, remarks } = req.body;

    if (!vendor || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    for (const item of items) {
      if (!item.productCode) {
        return res.status(400).json({
          error: `Product code is required for item: ${item.itemName || "Unnamed Item"}`,
        });
      }
      const masterItem = await ItemMaster.findOne({
        code: { $regex: new RegExp(`^${item.productCode}$`, "i") },
      });
      if (!masterItem) {
        return res.status(400).json({
          error: `Invalid or unregistered product code: ${item.productCode}`,
        });
      }
    }

    let finalPoNo = poNo;
    if (!finalPoNo || finalPoNo.startsWith("PO-")) {
      finalPoNo = await generatePONo();
    }

    const existingPO = await PurchaseOrder.findOne({ poNo: finalPoNo });
    if (existingPO) {
      return res.status(400).json({ error: "PO number already exists" });
    }

    const po = new PurchaseOrder({
      poNo: finalPoNo,
      poDate: new Date(poDate),
      vendor,
      items,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      remarks,
      createdBy: req.user._id,
      status: "Open",
    });

    await po.save();
    await po.populate("createdBy", "name username");

    res.status(201).json({
      message: "Purchase order created successfully",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Create PO error:", error);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
};

exports.update = async (req, res) => {
  try {
    const { poNo, poDate, vendor, items, deliveryDate, remarks, status } =
      req.body;
    const { id } = req.params;

    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.productCode) {
          return res.status(400).json({
            error: `Product code is required for item: ${item.itemName || "Unnamed Item"}`,
          });
        }
        const masterItem = await ItemMaster.findOne({
          code: { $regex: new RegExp(`^${item.productCode}$`, "i") },
        });
        if (!masterItem) {
          return res.status(400).json({
            error: `Invalid or unregistered product code: ${item.productCode}`,
          });
        }
      }
    }

    if (poNo && poNo !== po.poNo) {
      const existingPO = await PurchaseOrder.findOne({ poNo });
      if (existingPO) {
        return res.status(400).json({ error: "PO number already exists" });
      }
    }

    if (poNo) po.poNo = poNo;
    if (poDate) po.poDate = new Date(poDate);
    if (vendor) po.vendor = vendor;
    if (items) po.items = items;
    if (deliveryDate) po.deliveryDate = new Date(deliveryDate);
    if (remarks !== undefined) po.remarks = remarks;
    if (status) po.status = status;

    await po.save();
    await po.populate("createdBy", "name username");

    res.json({
      message: "Purchase order updated successfully",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Update PO error:", error);
    res.status(500).json({ error: "Failed to update purchase order" });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id ? id.trim() : null;

    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      return res
        .status(400)
        .json({ error: "Invalid Purchase Order ID format" });
    }

    const po = await PurchaseOrder.findById(cleanId);
    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    
    if (["Received", "Partial"].includes(po.status)) {
      return res.status(400).json({
        error: `Deletion blocked: This PO is currently '${po.status}'. Orders that have been partially or fully received cannot be deleted for audit reasons. Cancel the order first if not needed.`,
      });
    }

    
    const inward = await MaterialInward.findOne({
      $or: [{ purchaseOrderRef: cleanId }, { poRef: po.poNo }],
    });

    if (inward) {
      return res.status(400).json({
        error: `Deletion blocked: Associated Material Inward found (${inward.inwardNo}). You must delete all linked Material Inward records before this PO can be removed.`,
        inwardNo: inward.inwardNo,
      });
    }

    const deleted = await PurchaseOrder.findByIdAndDelete(cleanId);
    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Purchase order could not be deleted" });
    }

    res.json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    console.error("Delete PO error:", error);
    res.status(500).json({
      error: "Failed to delete purchase order due to server error",
      details: error.message,
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Open", "Partial", "Received", "Cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const po = await PurchaseOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!po) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    res.json({
      message: "Status updated successfully",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
