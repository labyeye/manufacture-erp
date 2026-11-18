import React, { useState } from "react";

const TONES = { default: "#ededed", danger: "#e0705f" };

// Icon-only row action. Always give it a label: it feeds the tooltip and the aria-label.
export function IconBtn({
  icon,
  label,
  onClick,
  danger,
  disabled,
  style = {},
}) {
  const [hover, setHover] = useState(false);
  const active = hover && !disabled;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? (danger ? TONES.danger : TONES.default) : "#a3a3a3",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: 13,
        transition: "background-color .15s, color .15s",
        ...style,
      }}
    >
      <i className={`fa-solid ${icon}`} />
    </button>
  );
}

export default IconBtn;
