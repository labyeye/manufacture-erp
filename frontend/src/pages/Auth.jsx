import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import companylogo from "../assets/logo.png";
const API = import.meta.env.VITE_API_URL || "http://localhost:2500/api";

const TOAST_DURATION = 4000;

// Local tokens: one graphite ramp, one kraft accent
const T = {
  bg: "#131313",
  surface: "#1a1a1a",
  raised: "#222222",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",
  text: "#ededed",
  secondary: "#a3a3a3",
  muted: "#737373",
  accent: "#c8955a",
  accentText: "#d9a86f",
  error: "#e08a7a",
  success: "#86b894",
  ease: "cubic-bezier(.22,1,.36,1)",
};

const CSS = `
.au-root { min-height: 100vh; display: grid; grid-template-columns: minmax(360px, 480px) 1fr; background: ${T.bg}; color: ${T.text}; font-family: "Poppins", sans-serif; }
.au-form { display: flex; align-items: center; justify-content: center; padding: 32px; }
.au-frame { position: relative; width: 100%; max-width: 360px; padding: 40px 32px; }
.au-frame > i { position: absolute; width: 12px; height: 12px; border-color: ${T.lineStrong}; border-style: solid; border-width: 0; }
.au-frame > i:nth-of-type(1) { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
.au-frame > i:nth-of-type(2) { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
.au-frame > i:nth-of-type(3) { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
.au-frame > i:nth-of-type(4) { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
.au-art { display: flex; align-items: center; justify-content: center; background: ${T.surface}; border-left: 1px solid ${T.line}; padding: 32px; }
.au-input { width: 100%; box-sizing: border-box; height: 40px; padding: 0 12px; font: inherit; font-size: 14px; color: ${T.text}; background: ${T.surface}; border: 1px solid ${T.line}; border-radius: 8px; outline: none; transition: border-color .15s, background-color .15s; }
.au-input::placeholder { color: ${T.muted}; font-style: normal; }
.au-input:hover:not(:disabled) { border-color: ${T.lineStrong}; }
.au-input:focus-visible { border-color: ${T.accent}; box-shadow: 0 0 0 3px rgba(200,149,90,.25); }
.au-input:disabled { opacity: .6; }
.au-eye { position: absolute; right: 4px; top: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: 0; border-radius: 6px; color: ${T.muted}; cursor: pointer; transition: color .15s; }
.au-eye:hover { color: ${T.text}; }
.au-btn { width: 100%; height: 40px; margin-top: 4px; font: inherit; font-size: 14px; font-weight: 500; color: #141414; background: ${T.accent}; border: 0; border-radius: 8px; cursor: pointer; transition: background-color .15s, transform .15s, opacity .15s; }
.au-btn:hover:not(:disabled) { background: #d6a36a; }
.au-btn:active:not(:disabled) { transform: scale(.98); }
.au-btn:focus-visible { outline: 2px solid ${T.accentText}; outline-offset: 2px; }
.au-btn:disabled { opacity: .5; cursor: not-allowed; }
.au-link { background: none; border: 0; padding: 4px 0; font: inherit; font-size: 13px; color: ${T.secondary}; cursor: pointer; border-radius: 4px; transition: color .15s; }
.au-link:hover { color: ${T.text}; }
.au-link:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
@keyframes au-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.au-enter { animation: au-in .3s ${T.ease} both; }
@media (max-width: 860px) { .au-root { grid-template-columns: 1fr; } .au-art { display: none; } }
@media (prefers-reduced-motion: reduce) { .au-enter { animation: none; } }
`;

const PasswordInput = ({ style, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        {...props}
        className="au-input"
        type={show ? "text" : "password"}
        style={{ paddingRight: 40, ...style }}
      />
      <button
        type="button"
        className="au-eye"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {show ? (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: T.secondary,
  marginBottom: 8,
};

const Notice = ({ msg, tone }) =>
  msg ? (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: "12px 12px",
        fontSize: 13,
        lineHeight: 1.5,
        color: T.secondary,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          marginTop: 7,
          flexShrink: 0,
          background: tone === "error" ? T.error : T.success,
        }}
      />
      {msg}
    </div>
  ) : null;

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const Header = ({ title, sub }) => (
  <div style={{ marginBottom: 32 }}>
    <img
      src={companylogo}
      alt="Company logo"
      style={{ width: 40, height: 40, objectFit: "contain", marginBottom: 24 }}
    />
    <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0, color: T.text }}>
      {title}
    </h1>
    <p style={{ fontSize: 14, color: T.secondary, margin: "8px 0 0" }}>{sub}</p>
  </div>
);

function Dieline() {
  const cut = {
    stroke: T.accentText,
    strokeWidth: 1.5,
    fill: "none",
    strokeLinejoin: "round",
  };
  const fold = {
    stroke: T.muted,
    strokeWidth: 1,
    strokeDasharray: "5 4",
    fill: "none",
  };
  const Reg = ({ x, y }) => (
    <g stroke={T.muted} strokeWidth="1" fill="none">
      <circle cx={x} cy={y} r="7" />
      <path d={`M${x - 12} ${y}H${x + 12}M${x} ${y - 12}V${y + 12}`} />
    </g>
  );
  return (
    <svg
      viewBox="0 0 640 480"
      width="100%"
      style={{ maxWidth: 640 }}
      role="img"
      aria-label="Carton die line with cut and fold lines"
    >
      <Reg x={40} y={40} />
      <Reg x={600} y={40} />
      <Reg x={40} y={440} />
      <Reg x={600} y={440} />
      {/* cut outline */}
      <path
        {...cut}
        d="M100 160 L125 150 L125 90 L225 84 L245 90 L245 150 L335 150 L335 90 L355 84 L435 84 L455 90 L455 150 L545 150 L545 90 L560 90 L560 330 L545 330 L545 390 L455 396 L435 390 L355 390 L335 396 L335 330 L245 330 L245 390 L225 396 L125 390 L125 330 L100 320 Z"
      />
      {/* folds */}
      <path
        {...fold}
        d="M125 150V330M245 150V330M335 150V330M455 150V330M545 150V330"
      />
      <path {...fold} d="M125 150H545M125 330H545" />
      <text
        x="185"
        y="245"
        textAnchor="middle"
        fontSize="11"
        fill={T.muted}
        fontFamily='"Fira Code", monospace'
      >
        A
      </text>
      <text
        x="290"
        y="245"
        textAnchor="middle"
        fontSize="11"
        fill={T.muted}
        fontFamily='"Fira Code", monospace'
      >
        B
      </text>
      <text
        x="395"
        y="245"
        textAnchor="middle"
        fontSize="11"
        fill={T.muted}
        fontFamily='"Fira Code", monospace'
      >
        C
      </text>
      <text
        x="500"
        y="245"
        textAnchor="middle"
        fontSize="11"
        fill={T.muted}
        fontFamily='"Fira Code", monospace'
      >
        D
      </text>
      {/* legend */}
      <g fontSize="11" fill={T.secondary} fontFamily='"Fira Code", monospace'>
        <path d="M40 440H68" {...cut} transform="translate(60 -4)" />
        <text x="136" y="440">
          Cut
        </text>
        <path d="M40 440H68" {...fold} transform="translate(160 -4)" />
        <text x="236" y="440">
          Fold
        </text>
      </g>
    </svg>
  );
}

function ErrorToast({ message, onClose }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (message) {
      requestAnimationFrame(() => setVisible(true));
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 200);
      }, TOAST_DURATION);
    }
    return () => clearTimeout(timerRef.current);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : -8}px)`,
        opacity: visible ? 1 : 0,
        transition: `transform .2s ${T.ease}, opacity .2s ${T.ease}`,
        zIndex: 9999,
        width: "90vw",
        maxWidth: 400,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: 16,
        background: T.raised,
        border: `1px solid ${T.lineStrong}`,
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        fontFamily: '"Poppins", sans-serif',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: T.error,
          marginTop: 7,
          flexShrink: 0,
        }}
      />
      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: T.text,
        }}
      >
        {message}
      </p>
      <button
        className="au-link"
        aria-label="Dismiss"
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 200);
        }}
        style={{ padding: 0, lineHeight: 1 }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
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
      setAlertMsg("Enter your username and password");
      return;
    }
    setLoading(true);
    clear();
    try {
      const result = await login(username, password);
      if (!result.success) setAlertMsg("The username or password is incorrect");
    } catch {
      setAlertMsg("Sign in failed, try again");
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
      setError("Network error, try again");
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
      setError("Network error, try again");
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
      setSuccess("Password reset, you can now sign in");
      setScreen("login");
      setFpUsername("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Network error, try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="au-root">
      <style>{CSS}</style>
      <ErrorToast message={alertMsg} onClose={() => setAlertMsg("")} />
      <div className="au-form">
        <div className="au-frame" key={screen}>
          <i />
          <i />
          <i />
          <i />
          <div className="au-enter">
            {screen === "login" && (
              <>
                <Header title="ManufactureIQ" sub="Production and inventory" />
                <Field label="Username">
                  <input
                    className="au-input"
                    type="text"
                    autoComplete="username"
                    placeholder="Username"
                    value={username}
                    disabled={loading}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      clear();
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleLogin()
                    }
                  />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    disabled={loading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clear();
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleLogin()
                    }
                  />
                </Field>
                <Notice msg={success} tone="success" />
                <button
                  className="au-btn"
                  disabled={loading}
                  onClick={handleLogin}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
                <div style={{ marginTop: 16 }}>
                  <button
                    className="au-link"
                    onClick={() => {
                      setScreen("forgot");
                      clear();
                    }}
                  >
                    Forgot password
                  </button>
                </div>
              </>
            )}

            {screen === "forgot" && (
              <>
                <Header
                  title="Forgot password"
                  sub="Enter your username to receive an OTP"
                />
                <Field label="Username">
                  <input
                    className="au-input"
                    type="text"
                    autoComplete="username"
                    placeholder="Username"
                    value={fpUsername}
                    disabled={loading}
                    onChange={(e) => {
                      setFpUsername(e.target.value);
                      clear();
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleRequestOtp()
                    }
                  />
                </Field>
                <Notice msg={error} tone="error" />
                <Notice msg={success} tone="success" />
                <button
                  className="au-btn"
                  disabled={loading}
                  onClick={handleRequestOtp}
                >
                  {loading ? "Sending…" : "Send OTP"}
                </button>
                <div style={{ marginTop: 16 }}>
                  <button
                    className="au-link"
                    onClick={() => {
                      setScreen("login");
                      clear();
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}

            {screen === "otp" && (
              <>
                <Header
                  title="Enter OTP"
                  sub={`Sent to the email linked with ${fpUsername}`}
                />
                <Field label="6-digit code">
                  <input
                    className="au-input"
                    style={{
                      height: 56,
                      textAlign: "center",
                      fontSize: 24,
                      fontWeight: 500,
                      letterSpacing: 8,
                      fontFamily: '"Fira Code", monospace',
                      fontVariantNumeric: "tabular-nums",
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    disabled={loading}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ""));
                      clear();
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleVerifyOtp()
                    }
                  />
                </Field>
                <Notice msg={error} tone="error" />
                <button
                  className="au-btn"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
                <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
                  <button
                    className="au-link"
                    onClick={() => {
                      setScreen("forgot");
                      setOtp("");
                      clear();
                    }}
                  >
                    Resend OTP
                  </button>
                  <button
                    className="au-link"
                    onClick={() => {
                      setScreen("login");
                      setFpUsername("");
                      setOtp("");
                      clear();
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}

            {screen === "reset" && (
              <>
                <Header
                  title="New password"
                  sub="Code verified, choose a new password"
                />
                <Field label="New password">
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    disabled={loading}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clear();
                    }}
                  />
                </Field>
                <Field label="Confirm password">
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clear();
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleResetPassword()
                    }
                  />
                </Field>
                <Notice msg={error} tone="error" />
                <button
                  className="au-btn"
                  disabled={loading}
                  onClick={handleResetPassword}
                >
                  {loading ? "Resetting…" : "Reset password"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="au-art" aria-hidden="true">
        <Dieline />
      </div>
    </div>
  );
}
