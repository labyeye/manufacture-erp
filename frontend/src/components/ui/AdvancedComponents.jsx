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

export function Toast({ msg, onClose, type = "success" }) {
  useEffect(() => {
    const t = setTimeout(onClose, type === "validation" ? 6000 : 2800);
    return () => clearTimeout(t);
  }, []);
  const bg = type === "error" ? C.red : type === "validation" ? C.red : C.green;
  const icon = type === "error" || type === "validation" ? "✕" : "✓";
  const msgs = Array.isArray(msg) ? msg : [msg];
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: bg, color: "#fff", borderRadius: 8,
      padding: "12px 20px", fontWeight: 600, fontSize: 13,
      boxShadow: "0 4px 20px #0008", animation: "fadeIn .2s ease",
      maxWidth: 520, width: "90vw",
    }}>
      {type === "validation" ? (
        <>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: msgs.length > 1 ? 8 : 0 }}>
            ⚠ Please fill in the required fields:
          </div>
          {msgs.length > 1 ? (
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
              {msgs.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          ) : (
            <div style={{ marginTop: 2 }}>{msgs[0]}</div>
          )}
        </>
      ) : (
        <span>{icon} {msgs[0]}</span>
      )}
    </div>
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
