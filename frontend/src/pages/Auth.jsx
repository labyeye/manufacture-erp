import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C } from "../constants/colors";
import { Card } from "../components/ui/BasicComponents";

/**
 * Login Screen Component
 * ──────────────────────────────────────────────────────────────────────────
 */
export function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await login(username, password);
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg
    }}>
      <Card style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text }}>Manufacturing ERP</h1>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Production & Inventory Management</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            disabled={loading}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            onKeyPress={e => e.key === "Enter" && !loading && handleLogin()}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            disabled={loading}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyPress={e => e.key === "Enter" && !loading && handleLogin()}
          />
        </div>

        {error && (
          <div style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", background: loading ? C.accent + "66" : C.accent, color: "#fff", border: "none", borderRadius: 7,
          padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", transition: "background .2s"
        }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = C.accent + "cc")}
          onMouseLeave={e => !loading && (e.currentTarget.style.background = C.accent)}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </Card>
    </div>
  );
}
