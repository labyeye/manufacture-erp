const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const forgotPasswordController = require("../controllers/forgotPasswordController");
const { auth } = require("../middleware/auth");


router.post("/login", authController.login);
router.post("/forgot-password", forgotPasswordController.requestOtp);
router.post("/verify-otp", forgotPasswordController.verifyOtp);
router.post("/reset-password", forgotPasswordController.resetPassword);


router.get("/me", auth, authController.me);
router.post("/logout", auth, authController.logout);


router.get("/users", auth, authController.getAllUsers);
router.get("/users/:id", auth, authController.getUserById);
router.post("/users", auth, authController.createUser);
router.put("/users/:id", auth, authController.updateUser);
router.delete("/users/:id", auth, authController.deleteUser);

module.exports = router;
