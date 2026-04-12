const CompanyMaster = require("../models/CompanyMaster");

exports.getAll = async (req, res) => {
  try {
    const companies = await CompanyMaster.find()
      .populate("createdBy", "name username")
      .sort({ name: 1 });
    res.json({ companies });
  } catch (error) {
    console.error("Get companies error:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const company = await CompanyMaster.findById(req.params.id)
      .populate("createdBy", "name username");
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json({ company });
  } catch (error) {
    console.error("Get company error:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, category, contact, phone, email, address, gstin, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const existingCompany = await CompanyMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existingCompany) {
      return res.status(400).json({ error: "Company name already exists" });
    }

    const company = new CompanyMaster({
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

    await company.save();
    await company.populate("createdBy", "name username");

    res.status(201).json({
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, category, contact, phone, email, address, gstin, status } = req.body;
    const { id } = req.params;

    const company = await CompanyMaster.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (name && name.trim() !== company.name) {
      const existingCompany = await CompanyMaster.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingCompany) {
        return res.status(400).json({ error: "Company name already exists" });
      }
      company.name = name.trim();
    }

    if (category !== undefined) company.category = category?.trim();
    if (contact !== undefined) company.contact = contact?.trim();
    if (phone !== undefined) company.phone = phone?.trim();
    if (email !== undefined) company.email = email?.trim();
    if (address !== undefined) company.address = address?.trim();
    if (gstin !== undefined) company.gstin = gstin?.trim()?.toUpperCase();
    if (status) company.status = status;

    await company.save();
    await company.populate("createdBy", "name username");

    res.json({
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ error: "Failed to update company" });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await CompanyMaster.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    await CompanyMaster.findByIdAndDelete(id);

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Delete company error:", error);
    res.status(500).json({ error: "Failed to delete company" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const company = await CompanyMaster.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("createdBy", "name username");

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      message: "Status updated successfully",
      company,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};
