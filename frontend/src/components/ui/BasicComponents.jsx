import React from "react";
import { C } from "../../constants/colors";

export function Badge({ text, color = C.accent }) {
  return (
    <span
      style={{
        background: color + "22",
        color: color,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ icon, title, sub, children }) {
  return (
    <div style={{ marginBottom: 25, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <h2 style={{ fontSize: 22, color: "#fff", margin: 0, fontWeight: 700 }}>{title}</h2>
        </div>
        {sub && (
          <p style={{ color: "#666", fontSize: 13, marginTop: 4, marginLeft: 34, marginOpen: 0 }}>
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 14,
      }}
    >
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
          marginBottom: 5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "normal",
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
        borderRadius: 6,
        padding: small ? "5px 12px" : "10px 20px",
        fontSize: small ? 11 : 13,
        fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.2s"
      }}
    >
      {icon && <span>{icon}</span>}
      {loading ? "..." : text}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 15 }}>
      {label && <label style={{ display: "block", fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" }}>{label}</label>}
      <input
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#0a0a0a",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: "#fff",
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box"
        }}
      />
    </div>
  );
}

export function Select({ label, options = [], ...props }) {
  return (
    <div style={{ marginBottom: 15 }}>
      {label && <label style={{ display: "block", fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" }}>{label}</label>}
      <select
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#0a0a0a",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: "#fff",
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box"
        }}
      >
        {options.map(opt => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", 
      backdropFilter: "blur(8px)", zIndex: 1000, 
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#111", border: `1px solid ${C.border}`, borderRadius: 12,
        width: "100%", maxWidth: 600, padding: 25, boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ headers, data, loading }) {
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading data...</div>;
  if (!data.length) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>No records found.</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {headers.map(h => (
              <th key={h} style={{ textAlign: "left", padding: "12px 15px", color: "#666", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}44` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "12px 15px", color: "#e0e0e0", fontSize: 13 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportBtn({
  onClick,
  disabled,
  label = "Import Excel",
  style = {},
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px",
        background: disabled ? C.border : "#1976D2",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      ⬆ {label}
    </button>
  );
}

export function ExportBtn({
  onClick,
  disabled,
  label = "Export Excel",
  style = {},
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px",
        background: disabled ? C.border : "#4CAF50",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      ⬇ {label}
    </button>
  );
}

export function TemplateBtn({
  onClick,
  disabled,
  label = "Template",
  style = {},
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px",
        background: disabled ? C.border : "#1976D2",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      ⬇ {label}
    </button>
  );
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "",
  inputStyle = {},
}) {
  const [open, setOpen] = React.useState(false);
  const [filtered, setFiltered] = React.useState([]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setOpen(true);
    if (val.length > 0) {
      const f = suggestions.filter((s) =>
        s.toLowerCase().includes(val.toLowerCase()),
      );
      setFiltered(f);
    } else {
      setFiltered([]);
    }
  };

  const handleSelect = (s) => {
    onChange(s);
    setOpen(false);
    setFiltered([]);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => value && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{
          width: "100%",
          padding: "9px 12px",
          background: C.inputBg,
          border: "1px solid " + C.border,
          borderRadius: 6,
          fontSize: 13,
          color: C.text,
          ...inputStyle,
        }}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: C.card,
            border: "1px solid " + C.border,
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          {filtered.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                color: C.text,
                borderBottom: "1px solid " + C.border,
                cursor: "pointer",
                background: C.card,
              }}
              onMouseOver={(e) => (e.target.style.background = C.border + "22")}
              onMouseOut={(e) => (e.target.style.background = C.card)}
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
        style={{
          width: "100%",
          padding: "9px 36px 9px 12px",
          background: C.inputBg,
          border: "1px solid " + C.border,
          borderRadius: 6,
          fontSize: 13,
          color: C.text,
          accentColor: C.text,
          colorScheme: "dark",
          boxSizing: "border-box",
          ...style,
        }}
      />
      
    </div>
  );
}

export function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          style={{
            padding: "7px 10px 7px 30px",
            background: C.inputBg,
            border: "1px solid " + C.border,
            borderRadius: 5,
            fontSize: 12,
            color: C.text,
            accentColor: "white",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
          }}
        >
          📅
        </span>
      </div>
      <span style={{ color: C.muted, fontSize: 12 }}>to</span>
      <div style={{ position: "relative" }}>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          style={{
            padding: "7px 10px 7px 30px",
            background: C.inputBg,
            border: "1px solid " + C.border,
            borderRadius: 5,
            fontSize: 12,
            color: C.text,
            accentColor: "white",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12,
          }}
        >
          📅
        </span>
      </div>
    </div>
  );
}
export function ImportModal({
  show,
  current,
  total,
  status,
  title = "Importing Data",
}) {
  if (!show) return null;
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 16,
          padding: 30,
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#e0e0e0",
            marginBottom: 8,
          }}
        >
          🚀 {title}
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
          {status || `Processing ${current} of ${total}...`}
        </div>

        <div
          style={{
            height: 8,
            width: "100%",
            background: "#0d0d0d",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #2196F3, #64B5F6)",
              transition: "width 0.3s ease",
              boxShadow: "0 0 10px #2196F388",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            fontWeight: 700,
            color: "#444",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Progress</span>
          <span style={{ color: "#2196F3" }}>
            {current} / {total} items
          </span>
        </div>
      </div>
    </div>
  );
}
