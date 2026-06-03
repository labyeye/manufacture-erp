import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { C } from "../constants/colors";
import { Card } from "../components/ui/BasicComponents";
import companylogo from "../assets/logo.png";
const API = import.meta.env.VITE_API_URL || "https://backend.packbetter.in/api";

const TOAST_DURATION = 4000;

function ErrorToast({ message, onClose }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (message) {
      // slight delay so CSS transition plays
      requestAnimationFrame(() => setVisible(true));
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, TOAST_DURATION);
    }
    return () => clearTimeout(timerRef.current);
  }, [message]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : -24}px)`,
        opacity: visible ? 1 : 0,
        transition:
          "transform 0.28s cubic-bezier(.22,1,.36,1), opacity 0.25s ease",
        zIndex: 9999,
        minWidth: 320,
        maxWidth: 420,
        width: "90vw",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.23)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
          }}
        >
          {/* icon */}
          <div
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="#ef4444">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          {/* text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: "#fca5a5",
              }}
            >
              Invalid credentials
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 13,
                color: "#94a3b8",
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          </div>
          {/* close */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 2,
              lineHeight: 1,
              borderRadius: 4,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {/* progress bar */}
        <div style={{ height: 3, background: "rgba(239,68,68,0.2)" }}>
          <div
            style={{
              height: "100%",
              background: "#ef4444",
              animation: `shrink ${TOAST_DURATION}ms linear forwards`,
            }}
          />
        </div>
      </div>
      <style>{`
 @keyframes shrink {
 from { width: 100%; }
 to { width: 0%; }
 }
 `}</style>
    </div>
  );
}

//"login"|"forgot"|"otp"|"reset"
export function LoginScreen() {
  const [screen, setScreen] = useState("login");
  const [alertMsg, setAlertMsg] = useState("");

  // login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // forgot / otp / reset state
  const [fpUsername, setFpUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const clear = () => {
    setError("");
    setSuccess("");
    setAlertMsg("");
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setAlertMsg("Please enter your username and password.");
      return;
    }
    setLoading(true);
    clear();
    try {
      const result = await login(username, password);
      if (!result.success)
        setAlertMsg(
          "The username or password you entered is incorrect. Please try again.",
        );
    } catch {
      setAlertMsg("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!fpUsername.trim()) {
      setError("Enter your username");
      return;
    }
    setLoading(true);
    clear();
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fpUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }
      setSuccess(data.message);
      setScreen("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError("Enter the OTP");
      return;
    }
    setLoading(true);
    clear();
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fpUsername.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }
      setScreen("reset");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Fill in both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    clear();
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: fpUsername.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setSuccess("Password reset! You can now log in.");
      setScreen("login");
      setFpUsername("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    color: C.text,
    background: "rgba(255,255,255,0.23)",
    outline: "none",
    transition: "border 0.2s, box-shadow 0.2s",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    color: C.muted,
    marginBottom: 6,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const btnStyle = (disabled) => ({
    width: "100%",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.22)"}`,
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.18s ease",
    marginTop: 4,
    letterSpacing: "-0.01em",
    boxShadow: disabled
      ? "none"
      : "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)",
  });

  const linkBtn = {
    background: "none",
    border: "none",
    color: C.accent,
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
    fontWeight: 500,
    textDecoration: "underline",
  };

  const ErrorBox = ({ msg }) =>
    msg ? (
      <div
        style={{
          background: "rgba(239,68,68,0.1)",
          color: "#f87171",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {msg}
      </div>
    ) : null;

  const SuccessBox = ({ msg }) =>
    msg ? (
      <div
        style={{
          background: "rgba(34,197,94,0.1)",
          color: "#4ade80",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {msg}
      </div>
    ) : null;

  const Header = ({ title, sub }) => (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <img
        src={companylogo}
        alt="Company Logo"
        style={{ width: 100, height: 100, marginBottom: 12 }}
      />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{title}</h1>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</p>
    </div>
  );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #07070f 0%, #0c0c1a 50%, #09090e 100%)",
      }}
    >
      <ErrorToast message={alertMsg} onClose={() => setAlertMsg("")} />
      <Card style={{ width: "100%", maxWidth: 360 }}>
        {/* ── LOGIN ── */}
        {screen === "login" && (
          <>
            <Header
              title="Manufacturing ERP"
              sub="Production & Inventory Management"
            />
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Username</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Enter username"
                value={username}
                disabled={loading}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clear();
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && handleLogin()
                }
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Enter password"
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clear();
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && handleLogin()
                }
              />
            </div>

            <SuccessBox msg={success} />

            <button
              style={btnStyle(loading)}
              disabled={loading}
              onClick={handleLogin}
              onMouseEnter={(e) =>
                !loading && (e.currentTarget.style.filter = "brightness(1.1)")
              }
              onMouseLeave={(e) =>
                !loading && (e.currentTarget.style.filter = "none")
              }
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                style={linkBtn}
                onClick={() => {
                  setScreen("forgot");
                  clear();
                }}
              >
                Forgot Password?
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT — enter username ── */}
        {screen === "forgot" && (
          <>
            <Header
              title="Forgot Password"
              sub="Enter your username to receive an OTP"
            />
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Username</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Enter your username"
                value={fpUsername}
                disabled={loading}
                onChange={(e) => {
                  setFpUsername(e.target.value);
                  clear();
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && handleRequestOtp()
                }
              />
            </div>

            <ErrorBox msg={error} />
            <SuccessBox msg={success} />

            <button
              style={btnStyle(loading)}
              disabled={loading}
              onClick={handleRequestOtp}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                style={linkBtn}
                onClick={() => {
                  setScreen("login");
                  clear();
                }}
              >
                Back to Login
              </button>
            </div>
          </>
        )}

        {/* ── OTP verification ── */}
        {screen === "otp" && (
          <>
            <Header
              title="Enter OTP"
              sub={`OTP sent to the email linked with"${fpUsername}"`}
            />

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>OTP (6-digit)</label>
              <input
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: 8,
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="------"
                value={otp}
                disabled={loading}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  clear();
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && handleVerifyOtp()
                }
              />
            </div>

            <ErrorBox msg={error} />

            <button
              style={btnStyle(loading)}
              disabled={loading}
              onClick={handleVerifyOtp}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <button
                style={linkBtn}
                onClick={() => {
                  setScreen("forgot");
                  setOtp("");
                  clear();
                }}
              >
                Resend OTP
              </button>
              <button
                style={linkBtn}
                onClick={() => {
                  setScreen("login");
                  setFpUsername("");
                  setOtp("");
                  clear();
                }}
              >
                Back to Login
              </button>
            </div>
          </>
        )}

        {/* ── RESET password ── */}
        {screen === "reset" && (
          <>
            <Header
              title="New Password"
              sub="OTP verified — set your new password"
            />
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>New Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                disabled={loading}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clear();
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                disabled={loading}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clear();
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && handleResetPassword()
                }
              />
            </div>

            <ErrorBox msg={error} />

            <button
              style={btnStyle(loading)}
              disabled={loading}
              onClick={handleResetPassword}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
