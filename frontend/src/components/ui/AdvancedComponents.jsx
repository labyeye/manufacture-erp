import React, { useState, useEffect, useRef } from "react";
import { C } from "../../constants/colors";

const alertKeyframes = `
  @keyframes alertScaleIn { from { opacity:0; transform:translate(-50%,-50%) scale(.85); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
  @keyframes alertScaleOut { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(.85); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes iconPop { from { opacity:0; transform:scale(.5); } to { opacity:1; transform:scale(1); } }
  @keyframes ringPulse { 0%{ box-shadow:0 0 0 0 currentColor; } 70%{ box-shadow:0 0 0 12px transparent; } 100%{ box-shadow:0 0 0 0 transparent; } }
  @keyframes progressShrink { from { transform:scaleX(1); } to { transform:scaleX(0); } }
`;

const ICONS = {
  success: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.1)" />
      <path d="M11 18l5 5 9-9" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.1)" />
      <path d="M13 13l10 10M23 13l-10 10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" stroke="#ea580c" strokeWidth="2" fill="rgba(234,92,12,0.1)" />
      <path d="M18 11v8M18 24v1" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" stroke="#3b82f6" strokeWidth="2" fill="rgba(59,130,246,0.1)" />
      <path d="M18 15v10M18 11v1" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

const TYPE_COLOR = {
  success: "#10b981",
  error: "#ef4444",
  warning: "#ea580c",
  info: "#3b82f6",
};

const TYPE_TITLE = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

export function Toast({ msg, type = "info", onClose, duration = 3500 }) {
  const [exiting, setExiting] = useState(false);
  const color = TYPE_COLOR[type] || TYPE_COLOR.info;

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 280);
  };

  useEffect(() => {
    const t = setTimeout(handleClose, duration);
    return () => clearTimeout(t);
  }, []);

  const msgs = Array.isArray(msg) ? msg : [msg];

  return (
    <>
      <style>{alertKeyframes}</style>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(27,39,68,0.18)",
          zIndex: 9990,
          animation: exiting ? "alertScaleOut 0.28s ease forwards" : "fadeIn 0.2s ease",
        }}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999, width: "90vw", maxWidth: 400,
          background: "rgba(248,251,254,0.96)",
          border: `1px solid ${color}55`,
          borderRadius: 20,
          boxShadow: `0 0 0 1px ${color}33, 0 24px 60px rgba(27,39,68,0.15), 0 0 40px ${color}22`,
          overflow: "hidden",
          animation: exiting ? "alertScaleOut 0.28s ease forwards" : "alertScaleIn 0.38s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{ height: 3, background: color, width: "100%" }} />
        <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, animation: "iconPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
            {ICONS[type] || ICONS.info}
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, color, marginBottom: 4, letterSpacing: "0.01em" }}>
            {TYPE_TITLE[type] || "Info"}
          </div>
          <div style={{ fontSize: 13, color: "#8a9ab5", lineHeight: 1.6, maxHeight: 120, overflowY: "auto" }}>
            {msgs[0]}
          </div>
          <div style={{ marginTop: 18, fontSize: 11, color: "#8a9ab5", letterSpacing: "0.03em" }}>
            Click anywhere to dismiss
          </div>
        </div>
        <div style={{ height: 3, background: "rgba(180,195,215,0.25)", width: "100%" }}>
          <div style={{ height: "100%", background: color, animation: `progressShrink ${duration}ms linear`, transformOrigin: "left" }} />
        </div>
      </div>
    </>
  );
}
