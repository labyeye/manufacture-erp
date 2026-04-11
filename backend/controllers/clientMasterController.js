const ClientMaster = require("../models/ClientMaster");

/**
 * Get all clients
 */
exports.getAll = async (req, res) => {
  try {
    const clients = await ClientMaster.find()
      .populate("createdBy", "name username")
      .sort({ name: 1 });
    res.json({ clients });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
};

/**
 * Get single client
 */
exports.getOne = async (req, res) => {
  try {
    const client = await ClientMaster.findById(req.params.id)
      .populate("createdBy", "name username");
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json({ client });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
};

/**
 * Create client
 */
exports.create = async (req, res) => {
  try {
    const { name, category, contact, phone, email, address, gstin, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Client name is required" });
    }

    // Check if client name already exists
    const existingClient = await ClientMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existingClient) {
      return res.status(400).json({ error: "Client name already exists" });
    }

    const client = new ClientMaster({
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

    await client.save();
    await client.populate("createdBy", "name username");

    res.status(201).json({
      message: "Client created successfully",
      client,
    });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ error: "Failed to create client" });
  }
};

/**
 * Update client
 */
exports.update = async (req, res) => {
  try {
    const { name, category, contact, phone, email, address, gstin, status } = req.body;
    const { id } = req.params;

    const client = await ClientMaster.findById(id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Check if new name is unique (if changed)
    if (name && name.trim() !== client.name) {
      const existingClient = await ClientMaster.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingClient) {
        return res.status(400).json({ error: "Client name already exists" });
      }
      client.name = name.trim();
    }

    if (category !== undefined) client.category = category?.trim();
    if (contact !== undefined) client.contact = contact?.trim();
    if (phone !== undefined) client.phone = phone?.trim();
    if (email !== undefined) client.email = email?.trim();
    if (address !== undefined) client.address = address?.trim();
    if (gstin !== undefined) client.gstin = gstin?.trim()?.toUpperCase();
    if (status) client.status = status;

    await client.save();
    await client.populate("createdBy", "name username");

    res.json({
      message: "Client updated successfully",
      client,
    });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ error: "Failed to update client" });
  }
};

/**
 * Delete client
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await ClientMaster.findById(id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    await ClientMaster.findByIdAndDelete(id);

    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ error: "Failed to delete client" });
  }
};

/**
 * Update client status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const client = await ClientMaster.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("createdBy", "name username");

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({
      message: "Status updated successfully",
      client,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
