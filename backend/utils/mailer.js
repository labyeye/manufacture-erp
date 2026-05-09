const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify SMTP connection on startup
transporter.verify((err) => {
  if (err) {
    console.error("[Mailer] SMTP connection FAILED:", err.message);
  } else {
    console.log("[Mailer] SMTP ready — using", process.env.GMAIL_USER);
  }
});

async function sendOtpEmail(toEmail, otp) {
  const info = await transporter.sendMail({
    from: `"Manufacturing ERP" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#64748b;">Use the OTP below to reset your Manufacturing ERP password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#2563eb;text-align:center;padding:24px 0;">${otp}</div>
        <p style="color:#94a3b8;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
  console.log("[Mailer] OTP sent to", toEmail, "— messageId:", info.messageId);
}

module.exports = { sendOtpEmail };
