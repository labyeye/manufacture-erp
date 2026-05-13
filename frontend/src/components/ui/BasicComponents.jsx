import React from "react";
import { C } from "../../constants/colors";

/* ── Canonical glass token (mirrors CSS :root variables) ── */
const G = {
  bg:     "rgba(255,255,255,0.05)",
  blur:   "blur(8px)",
  border: "1px solid rgba(255,255,255,0.3)",
  radius: 20,
  shadow: [
    "0 8px 32px rgba(0,0,0,0.1)",
    "inset 0 1px 0 rgba(255,255,255,0.5)",
    "inset 0 -1px 0 rgba(255,255,255,0.1)",
    "inset 0 0 0px 0px rgba(255,255,255,0)",
  ].join(", "),
};

const GLASS_CARD = {
  background:           G.bg,
  backdropFilter:       G.blur,
  WebkitBackdropFilter: G.blur,
  border:               G.border,
  borderRadius:         G.radius,
  boxShadow:            G.shadow,
  position:             "relative",
  overflow:             "hidden",
};

const DARK_INPUT = {
  width:                "100%",
  padding:              "9px 12px",
  background:           G.bg,
  border:               G.border,
  borderRadius:         10,
  fontSize:             13,
  color:                C.text,
  fontFamily:           "'Poppins', sans-serif",
  outline:              "none",
  boxSizing:            "border-box",
  backdropFilter:       G.blur,
  WebkitBackdropFilter: G.blur,
  boxShadow:            "0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)",
  transition:           "border 0.2s, box-shadow 0.2s",
};

export function Badge({ text, color = C.accent }) {
  return (
    <span
      style={{
        background: color + "18",
        color: color,
        border: `1px solid ${color}30`,
        borderRadius: 8,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        fontFamily: "'Fira Code', monospace",
        letterSpacing: "0.01em",
      }}
    >
      {text}
    </span>
  );
}

export function Card({ children, style = {}, onClick }) {
  const hoverStyle = onClick ? { cursor: "pointer", transition: "all 0.2s ease" } : {};
  return (
    <div
      onClick={onClick}
      style={{ ...GLASS_CARD, padding: 22, ...hoverStyle, ...style }}
      onMouseEnter={onClick ? (e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
        e.currentTarget.style.transform = "translateY(-1px)";
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        e.currentTarget.style.boxShadow = GLASS_CARD.boxShadow;
        e.currentTarget.style.transform = "translateY(0)";
      } : undefined}
    >
      {children}
    </div>
  );
}

export function renderIcon(icon, size = 16, color, extraStyle = {}) {
  if (!icon) return null;
  if (typeof icon === "string" && icon.startsWith("fa-")) {
    return <i className={icon} style={{ fontSize: size, color: color || "inherit", lineHeight: 1, flexShrink: 0, ...extraStyle }} />;
  }
  return <span style={{ fontSize: size, lineHeight: 1, ...extraStyle }}>{icon}</span>;
}

export function SectionTitle({ icon, title, sub, children }) {
  const isFaClass = typeof icon === "string" && icon.startsWith("fa-");
  return (
    <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isFaClass
            ? <i className={icon} style={{ fontSize: 18, color: C.accent, width: 22, textAlign: "center" }} />
            : <span style={{ fontSize: 20 }}>{icon}</span>
          }
          <h2 style={{ fontSize: 22, color: C.text, margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h2>
        </div>
        {sub && (
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginLeft: 32, fontWeight: 400 }}>
            {sub}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

export function FormGrid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

export function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: C.muted,
          marginBottom: 6,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function SubmitBtn({ label, ...props }) {
  return <Button text={label} type="submit" {...props} />;
}

export function Button({ text, onClick, color = C.accent, type = "button", loading, small, icon }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        background: color,
        color: "#fff",
        border: "none",
        borderRadius: small ? 10 : 12,
        padding: small ? "6px 14px" : "10px 22px",
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.18s ease",
        boxShadow: `0 2px 8px ${color}30`,
        letterSpacing: "-0.01em",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.opacity = "0.88";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = `0 4px 14px ${color}40`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = loading ? "0.7" : "1";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `0 2px 8px ${color}30`;
      }}
    >
      {icon && renderIcon(icon, small ? 12 : 14, "#fff")}
      {loading ? "..." : text}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 15 }}>
      {label && (
        <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </label>
      )}
      <input {...props} style={{ ...DARK_INPUT, padding: "10px 12px", ...props.style }} />
    </div>
  );
}

export function Select({ label, options = [], ...props }) {
  return (
    <div style={{ marginBottom: 15 }}>
      {label && (
        <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </label>
      )}
      <select {...props} style={{ ...DARK_INPUT, padding: "10px 12px" }}>
        {options.map(opt => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ ...GLASS_CARD, width: "100%", maxWidth: 600, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: C.text, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: C.muted,
              width: 32, height: 32,
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Pure Glassmorphism Table ── */
export function GlassTable({ headers = [], rows = [], loading, emptyText = "No records found.", onRowClick, stickyHeader = true }) {
  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, marginBottom: 12, display: "block" }} />
      Loading...
    </div>
  );
  if (!rows.length) return (
    <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
      <i className="fa-solid fa-inbox" style={{ fontSize: 32, marginBottom: 12, display: "block", opacity: 0.4 }} />
      {emptyText}
    </div>
  );

  return (
    <div style={{ ...GLASS_CARD }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              ...(stickyHeader ? { position: "sticky", top: 0, zIndex: 2 } : {}),
            }}>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  color: C.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  whiteSpace: "nowrap",
                  backdropFilter: "blur(16px)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {(Array.isArray(row) ? row : Object.values(row)).map((cell, j) => (
                  <td key={j} style={{ padding: "11px 16px", color: C.text, verticalAlign: "middle" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Legacy Table — kept for backwards compat */
export function Table({ headers, data, loading }) {
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading data...</div>;
  if (!data.length) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No records found.</div>;
  return (
    <GlassTable
      headers={headers}
      rows={data}
    />
  );
}

export function AutocompleteInput({ value, onChange, suggestions = [], placeholder = "", inputStyle = {} }) {
  const [open, setOpen] = React.useState(false);
  const [filtered, setFiltered] = React.useState([]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setOpen(true);
    setFiltered(val.length > 0 ? suggestions.filter(s => s.toLowerCase().includes(val.toLowerCase())) : []);
  };

  const handleSelect = (s) => { onChange(s); setOpen(false); setFiltered([]); };

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => value && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ ...DARK_INPUT, ...inputStyle }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          ...GLASS_CARD,
          maxHeight: 200, overflowY: "auto",
          zIndex: 100,
        }}>
          {filtered.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              style={{
                padding: "9px 14px", fontSize: 13, color: C.text,
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DatePicker({ value, onChange, style = {} }) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...DARK_INPUT, colorScheme: "dark", accentColor: C.accent, ...style }}
      />
    </div>
  );
}

export function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
        style={{ ...DARK_INPUT, width: "auto", colorScheme: "dark", fontSize: 12, padding: "7px 10px" }} />
      <span style={{ color: C.muted, fontSize: 12 }}>—</span>
      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
        style={{ ...DARK_INPUT, width: "auto", colorScheme: "dark", fontSize: 12, padding: "7px 10px" }} />
    </div>
  );
}

export function ImportBtn({ onClick, disabled, label = "Import Excel", style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 16px",
      background: disabled ? "rgba(255,255,255,0.08)" : "#2563eb",
      color: disabled ? C.muted : "#fff",
      border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s ease",
      ...style,
    }}>
      <i className="fa-solid fa-file-import" style={{ fontSize: 12 }} />
      {label}
    </button>
  );
}

export function ExportBtn({ onClick, disabled, label = "Export Excel", style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 16px",
      background: disabled ? "rgba(255,255,255,0.08)" : "#16a34a",
      color: disabled ? C.muted : "#fff",
      border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s ease",
      ...style,
    }}>
      <i className="fa-solid fa-file-export" style={{ fontSize: 12 }} />
      {label}
    </button>
  );
}

export function TemplateBtn({ onClick, disabled, label = "Template", style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 16px",
      background: disabled ? "rgba(255,255,255,0.08)" : "#2563eb",
      color: disabled ? C.muted : "#fff",
      border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s ease",
      ...style,
    }}>
      <i className="fa-solid fa-download" style={{ fontSize: 12 }} />
      {label}
    </button>
  );
}

export function ImportModal({ show, current, total, status, title = "Importing Data" }) {
  if (!show) return null;
  const progress = total > 0 ? (current / total) * 100 : 0;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
    }}>
      <div style={{ width: "100%", maxWidth: 400, ...GLASS_CARD, padding: 32, textAlign: "center" }}>
        <i className="fa-solid fa-file-import" style={{ fontSize: 28, color: C.accent, marginBottom: 12, display: "block" }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
          {status || `Processing ${current} of ${total}...`}
        </div>
        <div style={{ height: 6, width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: `linear-gradient(90deg, ${C.accent}, #818cf8)`,
            transition: "width 0.3s ease", borderRadius: 10,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>Progress</span>
          <span style={{ color: C.accent, fontFamily: "'Fira Code', monospace" }}>{current} / {total}</span>
        </div>
      </div>
    </div>
  );
}
