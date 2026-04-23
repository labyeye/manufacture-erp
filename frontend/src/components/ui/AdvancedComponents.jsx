import React, { useEffect, useRef, useState } from "react";
import { C } from "../../constants/colors";
import { today } from "../../utils/helpers";

export function AutocompleteInput({ value, onChange, suggestions = [], placeholder = "", style = {}, inputStyle = {} }) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const ref = React.useRef(null);

  const filtered = React.useMemo(() => {
    if (!value) return [...suggestions].sort((a, b) => a.localeCompare(b));
    return suggestions
      .filter(s => s.toLowerCase().includes(value.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  }, [value, suggestions]);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        style={{ width: "100%", boxSizing: "border-box", ...inputStyle }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          maxHeight: 200, overflowY: "auto", marginTop: 2,
        }}>
          {filtered.map((s, i) => (
            <div
              key={i}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{
                padding: "8px 12px", fontSize: 13, cursor: "pointer",
                borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}22` : "none",
                color: C.text,
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {(() => {
                if (!value) return s;
                const idx = s.toLowerCase().indexOf(value.toLowerCase());
                if (idx === -1) return s;
                return <>{s.slice(0, idx)}<strong style={{ color: C.accent }}>{s.slice(idx, idx + value.length)}</strong>{s.slice(idx + value.length)}</>;
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ALERT_DURATION = 2800;
const VALIDATION_DURATION = 5500;

const alertKeyframes = `
@keyframes alertScaleIn {
  0% { opacity: 0; transform: scale(0.7) translateY(30px); }
  60% { transform: scale(1.04) translateY(-4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes alertScaleOut {
  0% { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.85) translateY(20px); }
}
@keyframes progressShrink {
  from { width: 100%; }
  to { width: 0%; }
}
@keyframes iconPop {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ringPulse {
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.6; }
  70% { box-shadow: 0 0 0 16px transparent; opacity: 0; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 0; }
}
`;

export function Toast({ msg, onClose, type = "success" }) {
  const [exiting, setExiting] = useState(false);
  const duration = type === "validation" ? VALIDATION_DURATION : ALERT_DURATION;

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), duration - 300);
    const closeTimer = setTimeout(onClose, duration);
    return () => { clearTimeout(exitTimer); clearTimeout(closeTimer); };
  }, []);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 280);
  };

  const msgs = Array.isArray(msg) ? msg : [msg];

  const config = {
    success: {
      color: "#10b981",
      bgGlow: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.35)",
      title: "Success",
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="17" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.1)" />
          <path d="M11 18l5 5 9-9" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    error: {
      color: "#ef4444",
      bgGlow: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.35)",
      title: "Error",
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="17" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.1)" />
          <path d="M13 13l10 10M23 13l-10 10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    warning: {
      color: "#f97316",
      bgGlow: "rgba(249,115,22,0.12)",
      border: "rgba(249,115,22,0.35)",
      title: "Warning",
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="17" stroke="#f97316" strokeWidth="2" fill="rgba(249,115,22,0.1)" />
          <path d="M18 11v8M18 24v1" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    validation: {
      color: "#ef4444",
      bgGlow: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.35)",
      title: "Please fill required fields",
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="17" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.1)" />
          <path d="M18 11v8M18 24v1" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    info: {
      color: "#3b82f6",
      bgGlow: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.35)",
      title: "Info",
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="17" stroke="#3b82f6" strokeWidth="2" fill="rgba(59,130,246,0.1)" />
          <path d="M18 15v10M18 11v1" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
  };

  const c = config[type] || config.info;

  return (
    <>
      <style>{alertKeyframes}</style>
      {}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          zIndex: 9990,
          animation: exiting ? "alertScaleOut 0.28s ease forwards" : "fadeIn 0.2s ease",
        }}
      />
      {}
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "90vw",
          maxWidth: 400,
          background: "#161b22",
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          boxShadow: `0 0 0 1px ${c.border}, 0 24px 60px rgba(0,0,0,0.7), 0 0 40px ${c.bgGlow}`,
          overflow: "hidden",
          animation: exiting
            ? "alertScaleOut 0.28s ease forwards"
            : "alertScaleIn 0.38s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {}
        <div style={{ height: 3, background: c.color, width: "100%" }} />

        {}
        <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
          {}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            position: "relative",
            animation: "iconPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
          }}>
            <div style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              color: c.color,
              animation: "ringPulse 1.2s ease-out 0.2s",
            }} />
            {c.icon}
          </div>

          {}
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: c.color,
            marginBottom: type === "validation" && msgs.length > 1 ? 8 : 4,
            letterSpacing: "0.01em",
          }}>
            {c.title}
          </div>

          {}
          {type === "validation" && msgs.length > 1 ? (
            <ul style={{
              margin: "8px 0 0 0",
              paddingLeft: 20,
              textAlign: "left",
              fontSize: 13,
              color: "#a0a0a0",
              lineHeight: 1.8,
            }}>
              {msgs.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          ) : (
            <div style={{
              fontSize: 13,
              color: "#a0a0a0",
              lineHeight: 1.6,
              maxHeight: 120,
              overflowY: "auto",
            }}>
              {msgs[0]}
            </div>
          )}

          {}
          <div style={{
            marginTop: 18,
            fontSize: 11,
            color: "#444",
            letterSpacing: "0.03em",
          }}>
            Click anywhere to dismiss
          </div>
        </div>

        {}
        <div style={{ height: 3, background: "#1e2530", width: "100%" }}>
          <div style={{
            height: "100%",
            background: c.color,
            animation: `progressShrink ${duration}ms linear`,
            transformOrigin: "left",
          }} />
        </div>
      </div>
    </>
  );
}

export function DatePicker({ value, onChange, style = {} }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const getDays = (year, month) => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  };

  const cells = getDays(viewDate.year, viewDate.month);
  const selDate = value ? new Date(value + "T00:00:00") : null;
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);

  const prevMonth = () => setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const select = (day) => {
    if (!day) return;
    const m = String(viewDate.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewDate.year}-${m}-${d}`);
    setOpen(false);
  };

  const display = value ? (() => {
    const d = new Date(value + "T00:00:00");
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  })() : "";

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div onClick={() => setOpen(o => !o)} style={{
        background: C.inputBg, border: `1px solid ${open ? C.accent : C.border}`,
        borderRadius: 6, padding: "9px 12px", fontSize: 13, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: display ? C.text : C.muted, userSelect: "none", transition: "border .2s"
      }}>
        <span>{display || "DD/MM/YYYY"}</span>
        <span style={{ fontSize: 14, color: C.muted }}>📅</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 14, width: 260, boxShadow: "0 8px 32px #0004"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{MONTHS[viewDate.month]} {viewDate.year}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: C.muted, fontWeight: 700, padding: "2px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisDate = new Date(viewDate.year, viewDate.month, day);
              const isSelected = selDate && thisDate.getTime() === selDate.getTime();
              const isToday = thisDate.getTime() === todayDate.getTime();
              return (
                <div key={i} onClick={() => select(day)} style={{
                  textAlign: "center", padding: "5px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                  fontWeight: isSelected || isToday ? 700 : 400,
                  background: isSelected ? C.accent : isToday ? C.accent + "22" : "transparent",
                  color: isSelected ? "#fff" : isToday ? C.accent : C.text,
                  transition: "background .1s"
                }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.surface; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? C.accent + "22" : "transparent"; }}
                >{day}</div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8, textAlign: "center" }}>
            <button onClick={() => { select(todayDate.getDate()); setViewDate({ year: todayDate.getFullYear(), month: todayDate.getMonth() }); }}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 11, padding: "3px 12px", cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Date:</span>
      <DatePicker value={dateFrom} onChange={setDateFrom} style={{ width: 150 }} />
      <span style={{ fontSize: 12, color: C.muted }}>to</span>
      <DatePicker value={dateTo} onChange={setDateTo} style={{ width: 150 }} />
      {(dateFrom || dateTo) && (
        <button onClick={() => { setDateFrom(""); setDateTo(""); }}
          style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>✕ Clear</button>
      )}
    </div>
  );
}

export function Table({ cols, rows, emptyMsg = "No records yet." }) {
  if (!rows.length) return (
    <div style={{ textAlign: "center", color: C.muted, padding: "32px 0", fontSize: 13 }}>{emptyMsg}</div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {cols.map(c => (
              <th key={c} style={{ padding: "8px 12px", color: C.muted, fontWeight: 600, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}22`, transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {r.map((cell, j) => (
                <td key={j} style={{ padding: "9px 12px", fontFamily: typeof cell === "number" ? "'JetBrains Mono',monospace" : undefined }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExcelImportBtn({ label, onImport, templateCols, templateRows, color }) {
  const fileRef = useRef(null);
  const col = color || C.green;
  const XLSX = require("xlsx");

  const downloadTemplate = () => {
    const examples = templateRows && templateRows.length > 0 ? templateRows : [];
    const data = examples.length > 0
      ? examples
      : [Object.fromEntries(templateCols.map(c => [c, ""]))];
    const ws = XLSX.utils.json_to_sheet(data, { header: templateCols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const { xlsxDownload } = require("../utils/helpers");
    xlsxDownload(wb, label.replace(/\s+/g, "_") + "_template.xlsx");
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        onImport(rows);
      } catch {
        
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={downloadTemplate} style={{ background: col + "22", color: col, border: "1px solid " + col + "44", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
        ⬇ Template
      </button>
      <button onClick={() => fileRef.current?.click()} style={{ background: col, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
        ⬆ Import Excel
      </button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}
