const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        allowedTabs: user.allowedTabs,
        editableTabs: user.editableTabs,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * Get current user
 */
exports.me = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role,
        allowedTabs: req.user.allowedTabs,
        editableTabs: req.user.editableTabs,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

/**
 * Logout (optional - client-side token removal is sufficient)
 */
exports.logout = async (req, res) => {
  // In a more advanced system, you could blacklist the token here
  res.json({ message: "Logged out successfully" });
};

/**
 * Get all users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

/**
 * Create new user
 */
exports.createUser = async (req, res) => {
  try {
    const { username, password, name, role, allowedTabs, editableTabs } =
      req.body;

    if (!username || !password || !name) {
      return res
        .status(400)
        .json({ error: "Username, password and name are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = new User({
      username: username.toLowerCase(),
      password,
      name,
      role: role || "Viewer",
      allowedTabs: allowedTabs || [],
      editableTabs: editableTabs || null,
      isActive: true,
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, allowedTabs, editableTabs, isActive, password } =
      req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (allowedTabs !== undefined) user.allowedTabs = allowedTabs;
    if (editableTabs !== undefined) user.editableTabs = editableTabs;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();

    res.json({
      message: "User updated successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Don't allow deleting the last admin
    const adminCount = await User.countDocuments({ role: "Admin" });
    if (user.role === "Admin" && adminCount === 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last admin user" });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
