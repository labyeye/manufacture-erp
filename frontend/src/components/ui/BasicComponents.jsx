import React from "react";
import { C } from "../../constants/colors";

/* ── All glass styling lives in styles/liquid-glass.css.
      This file just composes .lg-* classes onto components. ── */

export function Badge({ text, color = C.accent }) {
  return (
    <span
      className="lg-badge"
      style={{
        background: color + "22",
        color: color,
        borderColor: color + "44",
      }}
    >
      {text}
    </span>
  );
}

export function Card({ children, style = {}, onClick, className = "" }) {
  const cls = `lg-card${onClick ? " lg-card-clickable" : ""}${className ? " " + className : ""}`;
  return (
    <div onClick={onClick} className={cls} style={style}>
      {children}
    </div>
  );
}

export function renderIcon(icon, size = 16, color, extraStyle = {}) {
  if (!icon) return null;
  if (typeof icon === "string" && icon.startsWith("fa-")) {
    return (
      <i
        className={icon}
        style={{
          fontSize: size,
          color: color || "inherit",
          lineHeight: 1,
          flexShrink: 0,
          ...extraStyle,
        }}
      />
    );
  }
  return (
    <span style={{ fontSize: size, lineHeight: 1, ...extraStyle }}>{icon}</span>
  );
}

export function SectionTitle({ icon, title, sub, children }) {
  const isFaClass = typeof icon === "string" && icon.startsWith("fa-");
  return (
    <div
      style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isFaClass ? (
            <i
              className={icon}
              style={{
                fontSize: 18,
                color: C.accent,
                width: 22,
                textAlign: "center",
              }}
            />
          ) : (
            <span style={{ fontSize: 20 }}>{icon}</span>
          )}
          <h2
            style={{
              fontSize: 22,
              color: C.text,
              margin: 0,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
        </div>
        {sub && (
          <p
            style={{
              color: C.muted,
              fontSize: 13,
              marginTop: 4,
              marginLeft: 32,
              fontWeight: 400,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>{children}</div>
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
  return <Button text={label} type="submit" variant="primary" {...props} />;
}

export function Button({
  text,
  onClick,
  color,
  type = "button",
  loading,
  small,
  icon,
  variant = "default",
  className = "",
  style = {},
}) {
  const cls = [
    "lg-btn",
    small ? "lg-btn-sm" : "",
    variant === "primary" ? "lg-btn-primary" : "",
    variant === "danger" ? "lg-btn-danger" : "",
    variant === "ghost" ? "lg-btn-ghost" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={cls}
      style={style}
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
        <label
          style={{
            display: "block",
            fontSize: 11,
            color: C.muted,
            fontWeight: 600,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        className={`lg-input ${props.className || ""}`.trim()}
      />
    </div>
  );
}

export function Select({ label, options = [], ...props }) {
  return (
    <div style={{ marginBottom: 15 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            color: C.muted,
            fontWeight: 600,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        className={`lg-select ${props.className || ""}`.trim()}
      >
        {options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        overflowY: "auto",
        padding: "40px 16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 1100,
          background: "#000000",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 80px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              borderRadius: 6,
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Pure liquid-glass Table ── */
export function GlassTable({
  headers = [],
  rows = [],
  loading,
  emptyText = "No records found.",
  onRowClick,
  stickyHeader = true,
}) {
  if (loading)
    return (
      <div className="lg-card" style={{ padding: 48, textAlign: "center", color: C.muted }}>
        <i
          className="fa-solid fa-circle-notch fa-spin"
          style={{ fontSize: 24, marginBottom: 12, display: "block" }}
        />
        Loading...
      </div>
    );
  if (!rows.length)
    return (
      <div className="lg-card" style={{ padding: 48, textAlign: "center", color: C.muted }}>
        <i
          className="fa-solid fa-inbox"
          style={{
            fontSize: 32,
            marginBottom: 12,
            display: "block",
            opacity: 0.4,
          }}
        />
        {emptyText}
      </div>
    );

  return (
    <div className="lg-table-wrap">
      <div className="lg-table-scroll">
        <table className="lg-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                className={onRowClick ? "is-clickable" : ""}
              >
                {(Array.isArray(row) ? row : Object.values(row)).map(
                  (cell, j) => (
                    <td key={j}>{cell}</td>
                  ),
                )}
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
  if (loading)
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        Loading data...
      </div>
    );
  if (!data.length)
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        No records found.
      </div>
    );
  return <GlassTable headers={headers} rows={data} />;
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
    setFiltered(
      val.length > 0
        ? suggestions.filter((s) => s.toLowerCase().includes(val.toLowerCase()))
        : [],
    );
  };

  const handleSelect = (s) => {
    onChange(s);
    setOpen(false);
    setFiltered([]);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        className="lg-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => value && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={inputStyle}
      />
      {open && filtered.length > 0 && (
        <div
          className="lg-card"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            padding: 0,
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
                padding: "9px 14px",
                fontSize: 13,
                color: C.text,
                borderBottom:
                  i < filtered.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
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
        className="lg-input"
        style={{ colorScheme: "dark", accentColor: C.accent, ...style }}
      />
    </div>
  );
}

export function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="date"
        className="lg-input"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        style={{
          width: "auto",
          colorScheme: "dark",
          fontSize: 12,
          padding: "7px 10px",
        }}
      />
      <span style={{ color: C.muted, fontSize: 12 }}>—</span>
      <input
        type="date"
        className="lg-input"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        style={{
          width: "auto",
          colorScheme: "dark",
          fontSize: 12,
          padding: "7px 10px",
        }}
      />
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
      className="lg-btn"
      style={style}
    >
      <i className="fa-solid fa-file-import" style={{ fontSize: 12 }} />
      {label}
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
      className="lg-btn"
      style={style}
    >
      <i className="fa-solid fa-file-export" style={{ fontSize: 12 }} />
      {label}
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
      className="lg-btn"
      style={style}
    >
      <i className="fa-solid fa-download" style={{ fontSize: 12 }} />
      {label}
    </button>
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
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 32,
          textAlign: "center",
          background: "#000000",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          color: "#ffffff",
        }}
      >
        <i
          className="fa-solid fa-file-import"
          style={{
            fontSize: 28,
            color: C.accent,
            marginBottom: 12,
            display: "block",
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: C.text,
            marginBottom: 6,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
          {status || `Processing ${current} of ${total}...`}
        </div>
        <div
          style={{
            height: 6,
            width: "100%",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${C.accent}, #818cf8)`,
              transition: "width 0.3s ease",
              borderRadius: 10,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            fontWeight: 600,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Progress</span>
          <span
            style={{ color: C.accent,  }}
          >
            {current} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}
