const User = require("../models/User");

exports.getAll = async (req, res) => {
  try {
    const operators = await User.find({ role: "Operator" }).select("-password");
    res.json({ operators });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch operators" });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, phone, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "Name, username and password are required" });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const operator = new User({
      name,
      phone: phone || null,
      username: username.toLowerCase(),
      password,
      role: "Operator",
      allowedTabs: ["dashboard", "production"],
      editableTabs: ["production"],
      isActive: true,
    });

    await operator.save();
    res.status(201).json({ message: "Operator created", operator: operator.toJSON() });
  } catch (error) {
    res.status(500).json({ error: "Failed to create operator" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, username, password, isActive } = req.body;

    const operator = await User.findOne({ _id: id, role: "Operator" });
    if (!operator) return res.status(404).json({ error: "Operator not found" });

    if (name) operator.name = name;
    if (phone !== undefined) operator.phone = phone;
    if (username) {
      const clash = await User.findOne({ username: username.toLowerCase(), _id: { $ne: id } });
      if (clash) return res.status(400).json({ error: "Username already exists" });
      operator.username = username.toLowerCase();
    }
    if (password) operator.password = password;
    if (isActive !== undefined) operator.isActive = isActive;

    await operator.save();
    res.json({ message: "Operator updated", operator: operator.toJSON() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update operator" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const operator = await User.findOne({ _id: id, role: "Operator" });
    if (!operator) return res.status(404).json({ error: "Operator not found" });
    await User.findByIdAndDelete(id);
    res.json({ message: "Operator deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete operator" });
  }
};
