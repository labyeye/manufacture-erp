const VendorMaster = require("../models/VendorMaster");

/**
 * Get all vendors
 */
exports.getAll = async (req, res) => {
  try {
    const vendors = await VendorMaster.find()
      .populate("createdBy", "name username")
      .sort({ name: 1 });
    res.json({ vendors });
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

/**
 * Get single vendor
 */
exports.getOne = async (req, res) => {
  try {
    const vendor = await VendorMaster.findById(req.params.id)
      .populate("createdBy", "name username");
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json({ vendor });
  } catch (error) {
    console.error("Get vendor error:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

/**
 * Create vendor
 */
exports.create = async (req, res) => {
  try {
    const { name, category, contact, phone, email, address, gstin, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Vendor name is required" });
    }

    // Check if vendor name already exists
    const existingVendor = await VendorMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existingVendor) {
      return res.status(400).json({ error: "Vendor name already exists" });
    }

    const vendor = new VendorMaster({
      name: name.trim(),
      category: category?.trim(),
      contact: contact?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      gstin: gstin?.trim()?.toUpperCase(),
      status: status || "Active",
      createdBy: req.user._id,
    });

    await vendor.save();
    await vendor.populate("createdBy", "name username");

    res.status(201).json({
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error("Create vendor error:", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
};

/**
 * Update vendor
 */
exports.update = async (req, res) => {
  try {
    const { name, category, contact, phone, email, address, gstin, status } = req.body;
    const { id } = req.params;

    const vendor = await VendorMaster.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Check if new name is unique (if changed)
    if (name && name.trim() !== vendor.name) {
      const existingVendor = await VendorMaster.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingVendor) {
        return res.status(400).json({ error: "Vendor name already exists" });
      }
      vendor.name = name.trim();
    }

    if (category !== undefined) vendor.category = category?.trim();
    if (contact !== undefined) vendor.contact = contact?.trim();
    if (phone !== undefined) vendor.phone = phone?.trim();
    if (email !== undefined) vendor.email = email?.trim();
    if (address !== undefined) vendor.address = address?.trim();
    if (gstin !== undefined) vendor.gstin = gstin?.trim()?.toUpperCase();
    if (status) vendor.status = status;

    await vendor.save();
    await vendor.populate("createdBy", "name username");

    res.json({
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    console.error("Update vendor error:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
};

/**
 * Delete vendor
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await VendorMaster.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await VendorMaster.findByIdAndDelete(id);

    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
};

/**
 * Update vendor status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const vendor = await VendorMaster.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("createdBy", "name username");

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json({
      message: "Status updated successfully",
      vendor,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
