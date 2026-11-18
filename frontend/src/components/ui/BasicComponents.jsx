import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { C, avatarColor } from "../../constants/colors";
import { readTables, exportPDF } from "../../utils/exportTable";

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

/* Page heading removed app-wide: only the action buttons (children) are kept. */
export function SectionTitle({ children }) {
  if (!React.Children.toArray(children).length) return null;
  return (
    <div
      style={{
        marginBottom: 20,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {children}
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

/* Round two-letter initials badge, coloured from the name. */
export function InitialsAvatar({ name = "", size = 24 }) {
  const clean = String(name).trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const text = !clean
    ? "—"
    : parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[1][0]).toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarColor(clean),
        color: "#0b0b14",
        fontSize: 10,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

/* Avatar + name, for the first column of a list. */
export function NameWithAvatar({ name, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <InitialsAvatar name={name} />
      <span>{children ?? name}</span>
    </span>
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

export function Modal({ title, children, onClose, maxWidth = 1100 }) {
  return (
    <div
      className="anim-backdrop"
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
        className="anim-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          background: "#1a1a1a",
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
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {children}
        </div>
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
      <div
        className="lg-card"
        style={{ padding: 48, textAlign: "center", color: C.muted }}
      >
        <i
          className="fa-solid fa-circle-notch fa-spin"
          style={{ fontSize: 24, marginBottom: 12, display: "block" }}
        />
        Loading...
      </div>
    );
  if (!rows.length)
    return (
      <div
        className="lg-card"
        style={{ padding: 48, textAlign: "center", color: C.muted }}
      >
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
  showAllOnFocus = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [filtered, setFiltered] = React.useState([]);
  const [dropdownPos, setDropdownPos] = React.useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const inputRef = React.useRef(null);

  const updatePos = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    updatePos();
    setOpen(true);
    setFiltered(
      val.length > 0
        ? suggestions.filter((s) => s.toLowerCase().includes(val.toLowerCase()))
        : showAllOnFocus
          ? suggestions
          : [],
    );
  };

  const handleSelect = (s) => {
    onChange(s);
    setOpen(false);
    setFiltered([]);
  };

  const handleFocus = () => {
    updatePos();
    if (showAllOnFocus) {
      const val = value || "";
      setFiltered(
        val.length > 0
          ? suggestions.filter((s) =>
              s.toLowerCase().includes(val.toLowerCase()),
            )
          : suggestions,
      );
      setOpen(true);
    } else if (value) {
      setOpen(true);
    }
  };

  const dropdown =
    open &&
    filtered.length > 0 &&
    ReactDOM.createPortal(
      <div
        className="anim-drop"
        style={{
          position: "absolute",
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 0,
          maxHeight: 220,
          overflowY: "auto",
          zIndex: 99999,
        }}
      >
        {filtered.map((s, i) => (
          <div
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(s);
            }}
            style={{
              padding: "9px 14px",
              fontSize: 13,
              color: "#ededed",
              borderBottom:
                i < filtered.length - 1
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "none",
              cursor: "pointer",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "rgba(200,149,90,0.14)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {s}
          </div>
        ))}
      </div>,
      document.body,
    );

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="lg-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={inputStyle}
      />
      {dropdown}
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

/* ── Compact toolbar button + smooth dropdown (shared across pages) ── */
export const toolbarBtn = {
  background: "#1a1a1a",
  color: "#ededed",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

/* Select mode toggle: row checkboxes stay hidden until this is pressed.
   The body classes drive the CSS in liquid-glass.css. */
export function SelectToggle({ onChange }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    document.body.classList.add("has-select-toggle");
    return () =>
      document.body.classList.remove("has-select-toggle", "select-mode");
  }, []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    document.body.classList.toggle("select-mode", next);
    onChange?.(next);
  };
  return (
    <button
      type="button"
      className="po-tbtn"
      aria-pressed={on}
      style={{
        ...toolbarBtn,
        ...(on ? { borderColor: "#c8955a", color: "#c8955a" } : {}),
      }}
      onClick={toggle}
    >
      <i className="fa-regular fa-square-check" /> Select
    </button>
  );
}

export function DropMenu({ icon, label, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const k = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);
  const visible = options.filter(Boolean);
  if (!visible.length) return null;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={toolbarBtn}
        className="po-tbtn"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {icon && <i className={icon} />} {label}
        <i
          className="fa-solid fa-chevron-down"
          style={{
            fontSize: 9,
            transition: "transform .18s ease",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>
      <div className="tb-menu" data-open={open || undefined} role="menu">
        {visible.map((o) => (
          <button
            type="button"
            key={o.label}
            role="menuitem"
            className="tb-menu-item"
            onClick={() => {
              setOpen(false);
              o.onClick();
            }}
          >
            <i className={o.icon} style={{ width: 14, color: "#c8955a" }} />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Modal shown when "Import Excel" is chosen: pick a file or grab the template. */
export function ImportPickerModal({
  title = "Import from Excel",
  onChoose,
  onTemplate,
  onClose,
}) {
  return (
    <Modal title={title} maxWidth={460} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            border: "1px dashed rgba(255,255,255,0.16)",
            borderRadius: 10,
            padding: "26px 16px",
            textAlign: "center",
            background: "#1a1a1a",
          }}
        >
          <i
            className="fa-solid fa-file-excel"
            style={{
              fontSize: 26,
              color: C.accent,
              marginBottom: 10,
              display: "block",
            }}
          />
          <div style={{ fontSize: 13, color: "#ededed", marginBottom: 4 }}>
            Choose an .xlsx or .xls file
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
            Use the template so the columns match.
          </div>
          <button
            type="button"
            className="po-tbtn"
            style={{ ...toolbarBtn, margin: "0 auto" }}
            onClick={() => {
              onClose();
              onChoose();
            }}
          >
            <i className="fa-solid fa-upload" /> Choose file
          </button>
        </div>
        {onTemplate && (
          <button
            type="button"
            className="po-tbtn"
            style={{ ...toolbarBtn, justifyContent: "center" }}
            onClick={onTemplate}
          >
            <i className="fa-solid fa-download" /> Download template
          </button>
        )}
      </div>
    </Modal>
  );
}

/* Search + Filter + (count) + Export + Add — the shared list toolbar.
   exportOptions: [{label, icon, onClick}]. Add menu = Manually / Import Excel. */
export function ListToolbar({
  search,
  setSearch,
  placeholder = "Search...",
  count,
  filterCount = 0,
  onFilter,
  exportOptions = [],
  onAdd,
  addLabel = "Manually",
  onImport,
  onTemplate,
  extra,
  actions,
  onSelectModeChange,
  exportTitle,
  addExtra = [],
}) {
  const [importOpen, setImportOpen] = useState(false);
  const rootRef = useRef(null);
  // Adds a PDF option next to Excel, exporting the table shown below the toolbar
  const exportPdfOption = {
    label: "PDF",
    icon: "fa-solid fa-file-pdf",
    onClick: () => {
      const page = rootRef.current?.closest(".fade");
      const tables = readTables(rootRef.current?.parentElement);
      const all = tables.length ? tables : readTables(page);
      const title =
        exportTitle ||
        page?.querySelector("h1,h2")?.innerText?.trim() ||
        "Export";
      if (all.length) exportPDF(all, title);
    },
  };
  const allExportOptions =
    exportOptions.length && !exportOptions.some((o) => o.label === "PDF")
      ? [...exportOptions, exportPdfOption]
      : exportOptions;
  const addOpts = [
    onAdd && { label: addLabel, icon: "fa-solid fa-pen", onClick: onAdd },
    onImport && {
      label: "Import Excel",
      icon: "fa-solid fa-file-import",
      onClick: () => setImportOpen(true),
    },
    ...addExtra,
  ].filter(Boolean);
  return (
    <>
      <div
        ref={rootRef}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          {setSearch && (
            <div style={{ position: "relative", width: 340 }}>
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#555",
                }}
              >
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 34px",
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                }}
              />
            </div>
          )}
          {onFilter && (
            <button
              type="button"
              className="po-tbtn"
              style={toolbarBtn}
              onClick={onFilter}
            >
              <i className="fa-solid fa-sliders" /> Filter
              {filterCount > 0 && (
                <span
                  style={{
                    background: "#c8955a",
                    color: "#131313",
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "0 6px",
                  }}
                >
                  {filterCount}
                </span>
              )}
            </button>
          )}
          {extra}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {count != null && (
            <span
              style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}
            >
              {count} records
            </span>
          )}
          {actions}
          {onSelectModeChange && <SelectToggle onChange={onSelectModeChange} />}
          <DropMenu
            icon="fa-solid fa-file-export"
            label="Export"
            options={allExportOptions}
          />
          {addOpts.length === 1 && !onImport ? (
            <button
              type="button"
              className="po-tbtn"
              style={toolbarBtn}
              onClick={addOpts[0].onClick}
            >
              <i className="fa-solid fa-plus" /> Add
            </button>
          ) : (
            <DropMenu icon="fa-solid fa-plus" label="Add" options={addOpts} />
          )}
        </div>
      </div>
      {importOpen && (
        <ImportPickerModal
          onChoose={onImport}
          onTemplate={onTemplate}
          onClose={() => setImportOpen(false)}
        />
      )}
    </>
  );
}

/* Filter & Sort modal shell. Children = the page's own fields. */
export function FilterModal({ onClose, onReset, children }) {
  return (
    <Modal title="Filter & Sort" maxWidth={440} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="po-tbtn"
            style={toolbarBtn}
            onClick={onReset}
          >
            Reset
          </button>
          <button
            type="button"
            className="po-tbtn"
            style={toolbarBtn}
            onClick={onClose}
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function SortSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "8px 10px",
        background: "#1a1a1a",
        border: "1px solid #2a2a2e",
        borderRadius: 6,
        color: "#fff",
        fontSize: 12,
      }}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

/* Export dropdown + Import button (opens the picker modal with template). */
export function DataMenus({
  onExportExcel,
  onExportPDF,
  onImport,
  onTemplate,
  onSelectModeChange,
}) {
  const [importOpen, setImportOpen] = useState(false);
  const exportOpts = [
    onExportExcel && {
      label: "Excel",
      icon: "fa-solid fa-file-excel",
      onClick: onExportExcel,
    },
    onExportPDF && {
      label: "PDF",
      icon: "fa-solid fa-file-pdf",
      onClick: onExportPDF,
    },
  ].filter(Boolean);
  return (
    <>
      {onSelectModeChange && <SelectToggle onChange={onSelectModeChange} />}
      <DropMenu
        icon="fa-solid fa-file-export"
        label="Export"
        options={exportOpts}
      />
      {onImport && (
        <button
          type="button"
          className="po-tbtn"
          style={toolbarBtn}
          onClick={() => setImportOpen(true)}
        >
          <i className="fa-solid fa-file-import" /> Import
        </button>
      )}
      {!onImport && onTemplate && (
        <button
          type="button"
          className="po-tbtn"
          style={toolbarBtn}
          onClick={onTemplate}
        >
          <i className="fa-solid fa-download" /> Template
        </button>
      )}
      {importOpen && (
        <ImportPickerModal
          onChoose={onImport}
          onTemplate={onTemplate}
          onClose={() => setImportOpen(false)}
        />
      )}
    </>
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
      className="anim-backdrop"
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
          background: "#1a1a1a",
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
              background: `${C.accent}`,
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
          }}
        >
          <span>Progress</span>
          <span style={{ color: C.accent }}>
            {current} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}
