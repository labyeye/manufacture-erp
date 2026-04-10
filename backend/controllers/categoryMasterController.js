const CategoryMaster = require("../models/CategoryMaster");

exports.getAll = async (req, res) => {
  try {
    const categories = await CategoryMaster.find()
      .populate("createdBy", "name email")
      .sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const category = await CategoryMaster.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, description, type, status } = req.body;

    const existingCode = await CategoryMaster.findOne({ code });
    if (existingCode)
      return res.status(400).json({ message: "Code already exists" });

    const category = new CategoryMaster({
      name,
      code,
      description,
      type: type || "Raw Material",
      status: status || "Active",
      createdBy: req.user._id,
    });

    await category.save();
    await category.populate("createdBy", "name email");

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, code, description, type, status } = req.body;
    const category = await CategoryMaster.findById(req.params.id);

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // Check if code is already used by another category
    if (code && code !== category.code) {
      const existingCode = await CategoryMaster.findOne({ code });
      if (existingCode)
        return res.status(400).json({ message: "Code already exists" });
    }

    category.name = name || category.name;
    category.code = code || category.code;
    category.description = description || category.description;
    category.type = type || category.type;
    category.status = status || category.status;

    await category.save();
    await category.populate("createdBy", "name email");

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const category = await CategoryMaster.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
