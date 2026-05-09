const crypto = require("crypto");
const User = require("../models/User");
const { sendOtpEmail } = require("../utils/mailer");

// In-memory OTP store: { username -> { otp, expiresAt } }
const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

// POST /api/auth/forgot-password  { username }
exports.requestOtp = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !user.isActive) {
      return res.json({ message: "If an account exists, an OTP has been sent." });
    }

    const otp = generateOtp();
    otpStore.set(user.username, { otp, expiresAt: Date.now() + OTP_TTL_MS });

    const recipient = process.env.OTP_RECIPIENT;
    console.log("[ForgotPwd] sending OTP for", username, "→", recipient);
    await sendOtpEmail(recipient, otp);

    res.json({ message: "OTP sent to the admin email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to send OTP. Check email configuration." });
  }
};

// POST /api/auth/verify-otp  { username, otp }
exports.verifyOtp = async (req, res) => {
  try {
    const { username, otp } = req.body;
    if (!username || !otp) return res.status(400).json({ error: "Username and OTP are required" });

    const entry = otpStore.get(username.toLowerCase());
    if (!entry || Date.now() > entry.expiresAt) {
      return res.status(400).json({ error: "OTP expired or not found" });
    }
    if (entry.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Mark OTP as verified (replace with a reset token flag)
    otpStore.set(username.toLowerCase(), { ...entry, verified: true });

    res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
};

// POST /api/auth/reset-password  { username, otp, newPassword }
exports.resetPassword = async (req, res) => {
  try {
    const { username, otp, newPassword } = req.body;
    if (!username || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const entry = otpStore.get(username.toLowerCase());
    if (!entry || !entry.verified || Date.now() > entry.expiresAt || entry.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired session. Request a new OTP." });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    otpStore.delete(username.toLowerCase());

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
};
