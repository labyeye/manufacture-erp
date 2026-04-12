import React from "react";
import { C } from "../../constants/colors";

export function Badge({ label, color = C.accent }) {
  return (
    <span
      style={{
        background: color + "22",
        color,
        border: `1px solid ${color}55`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
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

export function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22, filter: "brightness(1) invert(0)" }}>
          {icon}
        </span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
          {title}
        </h2>
      </div>
      {sub && (
        <p
          style={{ color: C.muted, fontSize: 13, marginTop: 4, marginLeft: 32 }}
        >
          {sub}
        </p>
      )}
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
          letterSpacing: 1,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function SubmitBtn({
  label = "Submit",
  color = C.accent,
  onClick,
  disabled,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 18,
        background: disabled ? C.border : color,
        color: disabled ? C.muted : "#fff",
        border: "none",
        borderRadius: 7,
        padding: "11px 28px",
        fontWeight: 700,
        fontSize: 14,
        transition: "background .2s",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function ExcelBtn({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.border : C.green + "22",
        color: disabled ? C.muted : C.green,
        border: `1px solid ${disabled ? C.border : C.green + "44"}`,
        borderRadius: 6,
        padding: "7px 16px",
        fontWeight: 700,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      📊 Excel
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
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "9px 12px",
        background: C.inputBg,
        border: "1px solid " + C.border,
        borderRadius: 6,
        fontSize: 13,
        color: C.text,
        accentColor: "white",
        ...style,
      }}
    />
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
        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12 }}>📅</span>
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
        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12 }}>📅</span>
      </div>
    </div>
  );
}
