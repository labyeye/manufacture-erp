const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { auth } = require("../middleware/auth");

// Public routes
router.post("/login", authController.login);

// Protected routes
router.get("/me", auth, authController.me);
router.post("/logout", auth, authController.logout);

// User Management routes (Protected)
router.get("/users", auth, authController.getAllUsers);
router.get("/users/:id", auth, authController.getUserById);
router.post("/users", auth, authController.createUser);
router.put("/users/:id", auth, authController.updateUser);
router.delete("/users/:id", auth, authController.deleteUser);

module.exports = router;
