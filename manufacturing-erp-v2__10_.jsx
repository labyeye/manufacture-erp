import { useState, useEffect, useRef } from "react";
import React from "react";
import * as XLSX from "xlsx";


const C = {
  bg: "#0d1117",
  surface: "#161b22",
  card: "#1c2128",
  border: "#30363d",
  accent: "#f97316",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  red: "#ef4444",
  purple: "#a855f7",
  text: "#e6edf3",
  muted: "#8b949e",
  inputBg: "#0d1117",
};

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");


const xlsxDownload = (wb, filename) => {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};


const AuthContext = React.createContext({ isAdmin: true, editableTabs: null, canEdit: () => true });
const useAuth = () => React.useContext(AuthContext);





const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'Syne',sans-serif;min-height:100vh}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:${C.bg}}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
  input,select,textarea{
    background:${C.inputBg};color:${C.text};border:1px solid ${C.border};
    border-radius:6px;padding:9px 12px;font-family:'Syne',sans-serif;font-size:13px;
    outline:none;width:100%;transition:border .2s;
  }
  input:focus,select:focus,textarea:focus{border-color:${C.accent}}
  select option{background:${C.surface}}
  button{cursor:pointer;font-family:'Syne',sans-serif}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .fade{animation:fadeIn .25s ease}
`;


const STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];


function Badge({ label, color = C.accent }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 20, ...style
    }}>{children}</div>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{title}</h2>
      </div>
      {sub && <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginLeft: 32 }}>{sub}</p>}
    </div>
  );
}

function FormGrid({ children }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14
    }}>{children}</div>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      {children}
    </div>
  );
}

function SubmitBtn({ label = "Submit", color = C.accent, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 18, background: disabled ? C.border : color,
        color: disabled ? C.muted : "#fff",
        border: "none", borderRadius: 7, padding: "11px 28px",
        fontWeight: 700, fontSize: 14, transition: "background .2s",
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >{label}</button>
  );
}

function ExcelBtn({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.border : C.green + "22",
        color: disabled ? C.muted : C.green,
        border: `1px solid ${disabled ? C.border : C.green + "44"}`,
        borderRadius: 6, padding: "7px 16px",
        fontWeight: 700, fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >📊 Excel</button>
  );
}

function AutocompleteInput({ value, onChange, suggestions = [], placeholder = "", style = {}, inputStyle = {} }) {
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

function Toast({ msg, onClose, type = "success" }) {
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


function DatePicker({ value, onChange, style = {} }) {
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
  const today = new Date(); today.setHours(0,0,0,0);

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
          {}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{MONTHS[viewDate.month]} {viewDate.year}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>›</button>
          </div>
          {}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: C.muted, fontWeight: 700, padding: "2px 0" }}>{d}</div>)}
          </div>
          {}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisDate = new Date(viewDate.year, viewDate.month, day);
              const isSelected = selDate && thisDate.getTime() === selDate.getTime();
              const isToday = thisDate.getTime() === today.getTime();
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
          {}
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8, textAlign: "center" }}>
            <button onClick={() => select(today.getDate()) || setViewDate({ year: today.getFullYear(), month: today.getMonth() })}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, fontSize: 11, padding: "3px 12px", cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo }) {
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

function Table({ cols, rows, emptyMsg = "No records yet." }) {
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



function generateProductCode(type, counters) {
  const prefixMap = { "Raw Material": "RM", "Finished Goods": "FG", "Consumable": "CG", "Machine Spare": "SP" };
  const prefix = prefixMap[type] || "IT";
  const num = (counters[prefix] || 1);
  return prefix + String(num).padStart(4, "0");
}


function computeRMItemName(it) {
  if (it.rmItem === "Paper Reel") {
    return [it.paperType, "Paper Reel", it.gsm ? it.gsm + "gsm" : "", it.widthMm ? it.widthMm + "mm" : ""].filter(Boolean).join(" ");
  }
  if (it.rmItem === "Paper Sheets") {
    return [it.paperType, "Sheet", it.gsm ? it.gsm + "gsm" : "", (it.widthMm && it.lengthMm) ? it.widthMm + "x" + it.lengthMm + "mm" : it.widthMm ? it.widthMm + "mm" : ""].filter(Boolean).join(" ");
  }
  return it.itemName || "";
}



function ExcelImportBtn({ label, onImport, templateCols, templateRows, color }) {
  const fileRef = useRef(null);
  const col = color || C.green;

  const downloadTemplate = () => {
    
    const examples = templateRows && templateRows.length > 0 ? templateRows : [];
    const data = examples.length > 0
      ? examples
      : [Object.fromEntries(templateCols.map(c => [c, ""]))]; 
    const ws = XLSX.utils.json_to_sheet(data, { header: templateCols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
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





const PROCESS_COLORS = {
  "Printing":         C.blue,
  "Varnish":          "#06b6d4",
  "Lamination":       C.purple,
  "Die Cutting":      C.accent,
  "Formation":        C.green,
  "Manual Formation": "#10b981",
};
const PROCESS_ICONS = {
  "Printing":         "🖨️",
  "Varnish":          "✨",
  "Lamination":       "📋",
  "Die Cutting":      "✂️",
  "Formation":        "📦",
  "Manual Formation": "🤲",
};

function Dashboard({ data, onNavigate, machineReportData, setMachineReportData }) {
  const { jobOrders, machineMaster, purchaseOrders, inward, salesOrders, dispatches, rawStock, fgStock, itemMasterFG } = data;

  
  const [reportTab,    setReportTab]    = useState("production");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [drill,        setDrill]        = useState(null);
  const [jobDrill,     setJobDrill]     = useState(null);
  const [selMachineId, setSelMachineId] = useState("");
  const [selOperator,  setSelOperator]  = useState("");
  const [yieldDrill,   setYieldDrill]   = useState(null);
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState("All");
  const [searchDelivery, setSearchDelivery] = useState("");
  const [soReconSearch, setSoReconSearch] = useState("");
  const [soReconFilter, setSoReconFilter] = useState("All");
  const [ageingFilter, setAgeingFilter] = useState("All");
  const [ageingSearch, setAgeingSearch] = useState("");
  const [pvtProcess, setPvtProcess] = useState("All");
  const [pvtTargets, setPvtTargets] = useState({}); 
  const [poReconFilter, setPoReconFilter] = useState("All"); 

  
  const allEntries = React.useMemo(() => {
    const entries = [];
    jobOrders.forEach(jo => {
      (jo.stageHistory || []).forEach(e => {
        const slot = (jo.schedule || []).find(s => s.process === e.stage);
        entries.push({
          date:         e.date || "",
          joNo:         jo.joNo,
          itemName:     jo.itemName || jo.product || "—",
          clientName:   jo.clientName || "—",
          stage:        e.stage || "—",
          operator:     (e.operator || "").trim(),
          qtyCompleted: +(e.qtyCompleted || 0),
          qtyRejected:  +(e.qtyRejected  || 0),
          machineId:    slot?.machineId   || null,
          machineName:  slot?.machineName || "Unassigned",
        });
      });
    });
    return entries;
  }, [jobOrders]);

  
  const daysSince = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(today() + "T00:00:00") - new Date(dateStr + "T00:00:00");
    return Math.floor(diff / 86400000);
  };

  const ageBadge = (days) => {
    const col = days > 7 ? C.red : days > 3 ? C.yellow : C.green;
    const label = days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
    return { col, label };
  };

  
  const { activeJOs, processPendingMap, totalActiveJOs } = React.useMemo(() => {
    const activeJOs = jobOrders.filter(j => j.status !== "Completed" && j.status !== "Cancelled");
    const processPendingMap = {};
    STAGES.forEach(proc => {
      processPendingMap[proc] = activeJOs.filter(j => {
        const jobProcs = (j.process || []);
        if (!jobProcs.includes(proc)) return false;
        if ((j.completedProcesses || []).includes(proc)) return false;
        const orderedJobProcs = STAGES.filter(p => jobProcs.includes(p));
        const procIdx = orderedJobProcs.indexOf(proc);
        if (procIdx <= 0) return true;
        return orderedJobProcs.slice(0, procIdx).every(p => (j.completedProcesses || []).includes(p));
      });
    });
    return { activeJOs, processPendingMap, totalActiveJOs: activeJOs.length };
  }, [jobOrders]);

  
  const reportDates = (() => {
    const end   = dateTo   || today();
    const start = dateFrom || (() => { const d = new Date(end + "T00:00:00"); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
    const dates = [];
    const cur = new Date(start + "T00:00:00");
    const endD = new Date(end + "T00:00:00");
    while (cur <= endD) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
    return dates;
  })();

  const allOperators = React.useMemo(() => [...new Set(allEntries.map(e => e.operator).filter(Boolean))].sort(), [allEntries]);

  const machineDailyData = (machineId) => {
    const map = {};
    allEntries.forEach(e => {
      if (e.machineId !== machineId) return;
      if (dateFrom && e.date < dateFrom) return;
      if (dateTo   && e.date > dateTo)   return;
      if (!map[e.date]) map[e.date] = { qty: 0, rejected: 0, operators: new Set() };
      map[e.date].qty += e.qtyCompleted;
      map[e.date].rejected += e.qtyRejected;
      if (e.operator) map[e.date].operators.add(e.operator);
    });
    return map;
  };

  const operatorDailyData = (operator) => {
    const map = {};
    allEntries.forEach(e => {
      if (e.operator !== operator) return;
      if (dateFrom && e.date < dateFrom) return;
      if (dateTo   && e.date > dateTo)   return;
      if (!map[e.date]) map[e.date] = { qty: 0, rejected: 0, machines: new Set() };
      map[e.date].qty += e.qtyCompleted;
      map[e.date].rejected += e.qtyRejected;
      if (e.machineName && e.machineName !== "Unassigned") map[e.date].machines.add(e.machineName);
    });
    return map;
  };

  
  const DateFilter = () => (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Date range:</span>
      <DatePicker value={dateFrom} onChange={setDateFrom} style={{ width: 150 }} />
      <span style={{ fontSize: 12, color: C.muted }}>to</span>
      <DatePicker value={dateTo}   onChange={setDateTo}   style={{ width: 150 }} />
      {(dateFrom || dateTo) && (
        <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>✕ Clear</button>
      )}
    </div>
  );

  
  const exportToExcel = (rows, filename, sheetName = "Report") => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    xlsxDownload(wb, filename + "_" + today() + ".xlsx");
  };

  
  const SimpleDateTable = ({ dates, getRow }) => (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.surface }}>
            {["Date", "Quantity", "Operator"].map((h, i) => (
              <th key={h} style={{ padding: "10px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map(d => {
            const row = getRow(d);
            const dt  = new Date(d + "T00:00:00");
            const isSun   = dt.getDay() === 0;
            const isToday = d === today();
            return (
              <tr key={d} style={{ background: isToday ? C.accent + "08" : isSun ? C.border + "22" : "transparent", borderBottom: `1px solid ${C.border}22` }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = C.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = isToday ? C.accent + "08" : isSun ? C.border + "22" : "transparent"; }}>
                <td style={{ padding: "9px 16px", fontWeight: isToday ? 800 : 600, color: isToday ? C.accent : isSun ? C.red : C.text }}>
                  {String(dt.getDate()).padStart(2,"0")}/{String(dt.getMonth()+1).padStart(2,"0")}/{String(dt.getFullYear()).slice(2)}
                  <span style={{ marginLeft: 8, fontSize: 10, color: C.muted, fontWeight: 400 }}>
                    {dt.toLocaleString("default",{weekday:"short"})}{isSun ? " · Off" : ""}{isToday ? " · Today" : ""}
                  </span>
                </td>
                <td style={{ padding: "9px 16px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontWeight: row.qty > 0 ? 700 : 400, fontSize: 13, color: row.qty > 0 ? C.text : C.border }}>
                  {row.qty > 0 ? (
                    <div>
                      <div>{fmt(row.qty)}</div>
                      {row.rejected > 0 && <div style={{ fontSize: 10, color: C.red }}>✕ {fmt(row.rejected)} rej.</div>}
                    </div>
                  ) : "—"}
                </td>
                <td style={{ padding: "9px 16px", textAlign: "right", fontSize: 12, color: row.label ? C.text : C.border }}>
                  {row.label || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: C.surface, borderTop: `2px solid ${C.border}` }}>
            <td style={{ padding: "10px 16px", fontWeight: 800, fontSize: 12, color: C.muted }}>TOTAL</td>
            <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 14, color: C.green }}>
              {fmt(dates.reduce((s, d) => s + getRow(d).qty, 0))}
            </td>
            <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, color: C.muted }}>
              {dates.reduce((s, d) => s + getRow(d).rejected, 0) > 0
                ? <span style={{ color: C.red }}>✕ {fmt(dates.reduce((s, d) => s + getRow(d).rejected, 0))} rejected</span>
                : ""}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );

  
  const isDrillingOpenOrders  = reportTab === "production" && drill === "open_orders";
  const isDrillingProcess     = reportTab === "production" && drill && STAGES.includes(drill);

  if (isDrillingOpenOrders) return (
    <div className="fade">
      <button onClick={() => setDrill(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 20 }}>← Back</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>All Open Orders <Badge label={`${totalActiveJOs} jobs`} color={C.yellow} /></h2>
      {activeJOs.length === 0
        ? <Card style={{ textAlign: "center", padding: 60, color: C.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>All caught up!</Card>
        : activeJOs.slice().reverse().map(j => <JODetailCard key={j.id} j={j} />)}
    </div>
  );

  if (isDrillingProcess) {
    const pendingJOs = processPendingMap[drill] || [];
    const col = PROCESS_COLORS[drill];
    return (
      <div className="fade">
        <button onClick={() => setDrill(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 20 }}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: col, marginBottom: 16 }}>{PROCESS_ICONS[drill]} {drill} Pending <Badge label={`${pendingJOs.length} job${pendingJOs.length !== 1 ? "s" : ""}`} color={col} /></h2>
        {pendingJOs.length === 0
          ? <Card style={{ textAlign: "center", padding: 60, color: C.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>No jobs pending!</Card>
          : pendingJOs
              .map(j => {
                const slot = (j.schedule || []).find(s => s.process === drill);
                const refDate = slot?.startDate || j.jobcardDate || j.date || "";
                return { j, age: daysSince(refDate) };
              })
              .sort((a, b) => b.age - a.age) 
              .map(({ j, age }) => (
                <JODetailCard key={j.id} j={j} highlightProcess={drill} age={age} />
              ))}
      </div>
    );
  }
  return (
    <div className="fade">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📊 Production Dashboard</h2>
      </div>

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {[
          ["production", "⚙️ Production Report"],
          ["operator",   "👤 Operator Report"],
          ["machine",    "🏭 Machine Report"],
          ["po_recon",   "🛒 PO Reconciliation"],
          ["so_recon",   "📋 SO Reconciliation"],
          ["so_ageing",  "⏳ SO Ageing"],
          ["prod_target","🎯 Prod vs Target"],
          ["yield",      "📈 Yield Tracking"],
          ["delivery",   "🚛 Delivery Status"],
          ["low_stock",  "⚠️ Low Stock"],
          ["monthly",    "📅 Monthly Summary"],
          ["vendor",     "🏭 Vendor Performance"],
        ].map(([v, l]) => (
          <button key={v} onClick={() => { setReportTab(v); setDrill(null); setYieldDrill(null); setPoReconFilter("All"); }} style={{
            padding: "9px 20px", borderRadius: "6px 6px 0 0", fontWeight: 700, fontSize: 13,
            border: `1px solid ${reportTab === v ? C.accent : C.border}`,
            borderBottom: reportTab === v ? `1px solid ${C.card}` : `1px solid ${C.border}`,
            background: reportTab === v ? C.card : "transparent",
            color: reportTab === v ? C.accent : C.muted,
            marginBottom: -1, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {}
      {reportTab === "production" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <ExcelBtn onClick={() => {
              const wb = XLSX.utils.book_new();
              const openRows = activeJOs.map(j => ({
                JO_No: j.joNo, Item: j.itemName || j.product || "—",
                Client: j.clientName || "—", Status: j.status,
                Order_Qty: +(j.orderQty || 0),
                Processes: (j.process || []).join(", "),
                Completed_Processes: (j.completedProcesses || []).join(", "),
                Job_Date: j.jobcardDate || j.date || "",
              }));
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(openRows), "Open Orders");
              const pendingRows = [];
              STAGES.forEach(proc => {
                (processPendingMap[proc] || []).forEach(j => {
                  pendingRows.push({
                    Process: proc, JO_No: j.joNo,
                    Item: j.itemName || "—", Client: j.clientName || "—",
                    Order_Qty: +(j.orderQty || 0), Status: j.status,
                  });
                });
              });
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingRows.length ? pendingRows : [{}]), "Pending by Process");
              xlsxDownload(wb, "Production_Report_" + today() + ".xlsx");
            }} />
          </div>
          <div onClick={() => setDrill("open_orders")}
            style={{ background: C.card, border: `2px solid ${C.yellow}44`, borderRadius: 12, padding: "20px 24px", marginBottom: 24, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color .2s, background .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.yellow; e.currentTarget.style.background = C.yellow + "0d"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.yellow + "44"; e.currentTarget.style.background = C.card; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 36 }}>⚙️</span>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: C.yellow, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{totalActiveJOs}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 4 }}>Open Orders</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Active job orders in production</div>
              </div>
            </div>
            <div style={{ color: C.yellow, fontSize: 22 }}>→</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Pending by Process</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {STAGES.map(proc => {
              const jobs = processPendingMap[proc] || [];
              const col = PROCESS_COLORS[proc];
              const isEmpty = jobs.length === 0;

              
              const ages = jobs.map(j => {
                
                const slot = (j.schedule || []).find(s => s.process === proc);
                const refDate = slot?.startDate || j.jobcardDate || j.date || "";
                return daysSince(refDate);
              });
              const maxAge = ages.length > 0 ? Math.max(...ages) : 0;
              const { col: ageCol, label: ageLabel } = ageBadge(maxAge);

              return (
                <div key={proc} onClick={() => !isEmpty && setDrill(proc)}
                  style={{ background: C.card, border: `1px solid ${isEmpty ? C.border : col + "44"}`, borderLeft: `4px solid ${isEmpty ? C.border : col}`, borderRadius: 10, padding: "16px 18px", cursor: isEmpty ? "default" : "pointer", opacity: isEmpty ? 0.55 : 1, transition: "all .15s" }}
                  onMouseEnter={e => { if (!isEmpty) { e.currentTarget.style.background = col + "0d"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: isEmpty ? C.border : col, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{jobs.length}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isEmpty ? C.muted : C.text, marginTop: 6 }}>{proc}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{isEmpty ? "All clear" : `job${jobs.length !== 1 ? "s" : ""} pending`}</div>
                    </div>
                    <span style={{ fontSize: 26, opacity: isEmpty ? 0.4 : 1 }}>{PROCESS_ICONS[proc]}</span>
                  </div>
                  {!isEmpty && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: col, fontWeight: 700 }}>Click to view →</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: ageCol, background: ageCol + "22", borderRadius: 4, padding: "2px 7px", border: `1px solid ${ageCol}44` }}>
                        ⏱ {ageLabel} max
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {}
      {reportTab === "operator" && (
        <div>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 240px" }}>
              <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Select Operator</label>
              <select value={selOperator} onChange={e => setSelOperator(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">— Select Operator —</option>
                {allOperators.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <DateFilter />
            <button disabled={!selOperator} onClick={() => {
              if (!selOperator) return;
              const dayData = operatorDailyData(selOperator);
              const total = reportDates.reduce((s, d) => s + (dayData[d]?.qty || 0), 0);
              const totalRejected = reportDates.reduce((s, d) => s + (dayData[d]?.rejected || 0), 0);
              const rows = reportDates.map(d => {
                const dt = new Date(d + "T00:00:00");
                const isSun = dt.getDay() === 0;
                const row = dayData[d];
                const dateStr = String(dt.getDate()).padStart(2,"0") + "/" + String(dt.getMonth()+1).padStart(2,"0") + "/" + String(dt.getFullYear()).slice(2);
                const weekday = dt.toLocaleString("default", { weekday: "short" });
                return `<tr style="background:${isSun?"#f9f9f9":"#fff"}">
                  <td style="padding:7px 12px;border-bottom:1px solid #eee;color:${isSun?"#e53e3e":"#222"}">${dateStr} <span style="color:#999;font-size:11px">${weekday}${isSun?" · Off":""}</span></td>
                  <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:${row?.qty>0?700:400};color:${row?.qty>0?"#1a1a1a":"#bbb"}">${row?.qty > 0 ? row.qty.toLocaleString("en-IN") : "—"}</td>
                  <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:${row?.rejected>0?"#e53e3e":"#bbb"}">${row?.rejected > 0 ? row.rejected.toLocaleString("en-IN") : "—"}</td>
                  <td style="padding:7px 12px;border-bottom:1px solid #eee;color:#555;font-size:12px">${row ? [...row.machines].join(", ") || "—" : "—"}</td>
                </tr>`;
              }).join("");
              const dateRange = dateFrom || dateTo ? `${dateFrom || "—"} to ${dateTo || "—"}` : `Last 30 days (up to ${today()})`;
              var activeDays = reportDates.filter(d => (dayData[d]?.qty || 0) > 0).length;
              var avgPerDay = activeDays > 0 ? Math.round(total / activeDays) : 0;
              var html = "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start'>" +
                "<div><div style='font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px'>AARAY PACKAGING PRIVATE LIMITED</div>" +
                "<div style='font-size:10px;color:#666;margin-bottom:1px'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div>" +
                "<div style='font-size:10px;color:#666'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div></div>" +
                "<div style='text-align:right;font-size:10px;color:#444'><div>www.rapackaging.in</div><div>orders@rapackaging.in</div><div>+91 9311802540</div></div></div>" +
                "<h1>Operator Production Report</h1>" +
                "<div style='color:#666;font-size:12px;margin-bottom:16px'>Operator: <strong>" + selOperator + "</strong> &nbsp;·&nbsp; Period: " + dateRange + "</div>" +
                "<div class='summary'>" +
                "<div class='stat'><div class='stat-val'>" + total.toLocaleString("en-IN") + "</div><div class='stat-lbl'>Total Produced</div></div>" +
                "<div class='stat'><div class='stat-val' style='color:#e53e3e'>" + totalRejected.toLocaleString("en-IN") + "</div><div class='stat-lbl'>Total Rejected</div></div>" +
                "<div class='stat'><div class='stat-val'>" + activeDays + "</div><div class='stat-lbl'>Active Days</div></div>" +
                "<div class='stat'><div class='stat-val'>" + (avgPerDay > 0 ? avgPerDay.toLocaleString("en-IN") : "—") + "</div><div class='stat-lbl'>Avg / Day</div></div>" +
                "</div>" +
                "<table><thead><tr><th>Date</th><th class='right'>Quantity</th><th class='right'>Rejected</th><th>Machine</th></tr></thead>" +
                "<tbody>" + rows + "</tbody>" +
                "<tfoot><tr><td>TOTAL</td><td style='text-align:right;font-family:monospace'>" + total.toLocaleString("en-IN") + "</td>" +
                "<td style='text-align:right;font-family:monospace;color:#e53e3e'>" + (totalRejected > 0 ? totalRejected.toLocaleString("en-IN") : "—") + "</td><td></td></tr></tfoot>" +
                "</table>" +
                "<div class='footer'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";
              var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}" +
                "h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}" +
                "table{width:100%;border-collapse:collapse;margin-top:16px}" +
                "th{background:#f0f0f0;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ddd}" +
                "th.right{text-align:right}" +
                "td{padding:7px 12px;border-bottom:1px solid #eee;font-size:12px}" +
                ".summary{display:flex;gap:24px;margin:16px 0;padding:14px 18px;background:#f8f8f8;border-radius:6px;border:1px solid #e0e0e0}" +
                ".stat{text-align:center}" +
                ".stat-val{font-size:22px;font-weight:800;font-family:monospace;color:#1a1a1a}" +
                ".stat-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:2px}" +
                "tfoot tr td{font-weight:800;background:#f0f0f0;border-top:2px solid #ddd}" +
                ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
                "@media print{body{margin:15px}}";
              var fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Operator Report — " + selOperator + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
              var blob = new Blob([fullHtml], { type: "text/html" });
              var url = URL.createObjectURL(blob);
              var a = document.createElement("a");
              a.href = url;
              a.download = "Operator_Report_" + selOperator.replace(/\s+/g, "_") + "_" + today() + ".html";
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
            }} style={{ background: !selOperator ? C.border : C.red + "22", color: !selOperator ? C.muted : C.red, border: `1px solid ${!selOperator ? C.border : C.red + "44"}`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: !selOperator ? "not-allowed" : "pointer", alignSelf: "flex-end" }}>🖨 PDF</button>
            <ExcelBtn disabled={!selOperator} onClick={() => {
              if (!selOperator) return;
              const dayData = operatorDailyData(selOperator);
              const rows = reportDates.map(d => {
                const dt = new Date(d + "T00:00:00");
                const row = dayData[d];
                return {
                  Date: String(dt.getDate()).padStart(2,"0") + "/" + String(dt.getMonth()+1).padStart(2,"0") + "/" + dt.getFullYear(),
                  Weekday: dt.toLocaleString("default", { weekday: "long" }),
                  Operator: selOperator,
                  Quantity_Produced: row?.qty || 0,
                  Quantity_Rejected: row?.rejected || 0,
                  Machines: row ? [...row.machines].join(", ") : "",
                };
              });
              exportToExcel(rows, "Operator_Report_" + selOperator.replace(/\s+/g, "_"), "Operator Report");
            }} />
          </div>

          {!selOperator ? (
            <Card style={{ textAlign: "center", padding: 50, color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Select an operator to view their daily report</div>
              {allOperators.length === 0 && <div style={{ fontSize: 12, marginTop: 8, color: C.red }}>No operator data yet — log production entries in the Production module with an operator name</div>}
            </Card>
          ) : (() => {
            const dayData = operatorDailyData(selOperator);
            const total = reportDates.reduce((s, d) => s + (dayData[d]?.qty || 0), 0);
            const totalRejected = reportDates.reduce((s, d) => s + (dayData[d]?.rejected || 0), 0);

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>👤 {selOperator}</span>
                    <span style={{ marginLeft: 12, fontSize: 12, color: C.muted }}>Production log</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {total > 0 && <Badge label={`${fmt(total)} pcs total`} color={C.green} />}
                  </div>
                </div>
                <SimpleDateTable
                  dates={reportDates}
                  getRow={d => ({
                    qty: dayData[d]?.qty || 0,
                    rejected: dayData[d]?.rejected || 0,
                    label: dayData[d] ? [...dayData[d].machines].join(", ") || "—" : "",
                  })}
                />
              </div>
            );
          })()}
        </div>
      )}

      {}
      {reportTab === "machine" && (
        <div>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 280px" }}>
              <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Select Machine</label>
              <select value={selMachineId} onChange={e => setSelMachineId(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">— Select Machine —</option>
                {(machineMaster || []).filter(m => m.status === "Active").map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                ))}
              </select>
            </div>
            <DateFilter />
            <button disabled={!selMachineId} onClick={() => {
              if (!selMachineId) return;
              const m = (machineMaster || []).find(x => x.id === selMachineId);
              const dayData = machineDailyData(selMachineId);
              const total = reportDates.reduce((s, d) => s + (dayData[d]?.qty || 0), 0);
              const totalRejected = reportDates.reduce((s, d) => s + (dayData[d]?.rejected || 0), 0);
              const dateRange = dateFrom || dateTo ? `${dateFrom || "—"} to ${dateTo || "—"}` : `Last 30 days (up to ${today()})`;
              var activeDays = reportDates.filter(d => (dayData[d]?.qty || 0) > 0).length;
              var avgPerDay = activeDays > 0 ? Math.round(total / activeDays) : 0;
              var rows = reportDates.map(d => {
                const dt = new Date(d + "T00:00:00");
                const isSun = dt.getDay() === 0;
                const row = dayData[d];
                const dateStr = String(dt.getDate()).padStart(2,"0") + "/" + String(dt.getMonth()+1).padStart(2,"0") + "/" + String(dt.getFullYear()).slice(2);
                const weekday = dt.toLocaleString("default", { weekday: "short" });
                return "<tr style='background:" + (isSun ? "#f9f9f9" : "#fff") + "'>" +
                  "<td style='padding:7px 12px;border-bottom:1px solid #eee;color:" + (isSun ? "#e53e3e" : "#222") + "'>" + dateStr + " <span style='color:#999;font-size:11px'>" + weekday + (isSun ? " · Off" : "") + "</span></td>" +
                  "<td style='padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:" + (row?.qty > 0 ? 700 : 400) + ";color:" + (row?.qty > 0 ? "#1a1a1a" : "#bbb") + "'>" + (row?.qty > 0 ? row.qty.toLocaleString("en-IN") : "—") + "</td>" +
                  "<td style='padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:" + (row?.rejected > 0 ? "#e53e3e" : "#bbb") + "'>" + (row?.rejected > 0 ? row.rejected.toLocaleString("en-IN") : "—") + "</td>" +
                  "<td style='padding:7px 12px;border-bottom:1px solid #eee;color:#555;font-size:12px'>" + (row ? [...row.operators].join(", ") || "—" : "—") + "</td>" +
                  "</tr>";
              }).join("");
              var html = "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start'>" +
                "<div><div style='font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px'>AARAY PACKAGING PRIVATE LIMITED</div>" +
                "<div style='font-size:10px;color:#666;margin-bottom:1px'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div>" +
                "<div style='font-size:10px;color:#666'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div></div>" +
                "<div style='text-align:right;font-size:10px;color:#444'><div>www.rapackaging.in</div><div>orders@rapackaging.in</div><div>+91 9311802540</div></div></div>" +
                "<h1>Machine Production Report</h1>" +
                "<div style='color:#666;font-size:12px;margin-bottom:16px'>Machine: <strong>" + (m?.name || "") + "</strong> &nbsp;·&nbsp; Type: " + (m?.type || "") + " &nbsp;·&nbsp; Period: " + dateRange + "</div>" +
                "<div class='summary'>" +
                "<div class='stat'><div class='stat-val'>" + total.toLocaleString("en-IN") + "</div><div class='stat-lbl'>Total Produced</div></div>" +
                "<div class='stat'><div class='stat-val' style='color:#e53e3e'>" + totalRejected.toLocaleString("en-IN") + "</div><div class='stat-lbl'>Total Rejected</div></div>" +
                "<div class='stat'><div class='stat-val'>" + activeDays + "</div><div class='stat-lbl'>Active Days</div></div>" +
                "<div class='stat'><div class='stat-val'>" + (avgPerDay > 0 ? avgPerDay.toLocaleString("en-IN") : "—") + "</div><div class='stat-lbl'>Avg / Day</div></div>" +
                "</div>" +
                "<table><thead><tr><th>Date</th><th class='right'>Quantity</th><th class='right'>Rejected</th><th>Operator</th></tr></thead>" +
                "<tbody>" + rows + "</tbody>" +
                "<tfoot><tr><td>TOTAL</td><td style='text-align:right;font-family:monospace'>" + total.toLocaleString("en-IN") + "</td>" +
                "<td style='text-align:right;font-family:monospace;color:#e53e3e'>" + (totalRejected > 0 ? totalRejected.toLocaleString("en-IN") : "—") + "</td><td></td></tr></tfoot>" +
                "</table>" +
                "<div class='footer'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";
              var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}" +
                "h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}" +
                "table{width:100%;border-collapse:collapse;margin-top:16px}" +
                "th{background:#f0f0f0;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ddd}" +
                "th.right{text-align:right}" +
                "td{padding:7px 12px;border-bottom:1px solid #eee;font-size:12px}" +
                ".summary{display:flex;gap:24px;margin:16px 0;padding:14px 18px;background:#f8f8f8;border-radius:6px;border:1px solid #e0e0e0}" +
                ".stat{text-align:center}" +
                ".stat-val{font-size:22px;font-weight:800;font-family:monospace;color:#1a1a1a}" +
                ".stat-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:2px}" +
                "tfoot tr td{font-weight:800;background:#f0f0f0;border-top:2px solid #ddd}" +
                ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
                "@media print{body{margin:15px}}";
              var fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Machine Report — " + (m?.name || "") + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
              var blob = new Blob([fullHtml], { type: "text/html" });
              var url = URL.createObjectURL(blob);
              var a = document.createElement("a");
              a.href = url;
              a.download = "Machine_Report_" + (m?.name || "Machine").replace(/\s+/g, "_") + "_" + today() + ".html";
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
            }} style={{ background: !selMachineId ? C.border : C.red + "22", color: !selMachineId ? C.muted : C.red, border: `1px solid ${!selMachineId ? C.border : C.red + "44"}`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: !selMachineId ? "not-allowed" : "pointer", alignSelf: "flex-end" }}>🖨 PDF</button>
            <ExcelBtn disabled={!selMachineId} onClick={() => {
              if (!selMachineId) return;
              const m = (machineMaster || []).find(x => x.id === selMachineId);
              const dayData = machineDailyData(selMachineId);
              const rows = reportDates.map(d => {
                const dt = new Date(d + "T00:00:00");
                const row = dayData[d];
                return {
                  Date: String(dt.getDate()).padStart(2,"0") + "/" + String(dt.getMonth()+1).padStart(2,"0") + "/" + dt.getFullYear(),
                  Weekday: dt.toLocaleString("default", { weekday: "long" }),
                  Machine: m?.name || "",
                  Machine_Type: m?.type || "",
                  Quantity_Produced: row?.qty || 0,
                  Quantity_Rejected: row?.rejected || 0,
                  Operators: row ? [...row.operators].join(", ") : "",
                };
              });
              exportToExcel(rows, "Machine_Report_" + (m?.name||"Machine").replace(/\s+/g,"_"), "Machine Report");
            }} />
          </div>

          {!selMachineId ? (
            <Card style={{ textAlign: "center", padding: 50, color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏭</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Select a machine to view its daily production report</div>
            </Card>
          ) : (() => {
            const m = (machineMaster || []).find(x => x.id === selMachineId);
            const col = m ? (MACHINE_TYPE_COLORS[m.type] || C.accent) : C.accent;
            const dayData = machineDailyData(selMachineId);
            const total = reportDates.reduce((s, d) => s + (dayData[d]?.qty || 0), 0);
            const totalRejected = reportDates.reduce((s, d) => s + (dayData[d]?.rejected || 0), 0);

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>🏭 {m?.name}</span>
                    <Badge label={m?.type || ""} color={col} />
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {total > 0 && <Badge label={`${fmt(total)} pcs total`} color={C.green} />}
                  </div>
                </div>
                <SimpleDateTable
                  dates={reportDates}
                  getRow={d => ({
                    qty: dayData[d]?.qty || 0,
                    rejected: dayData[d]?.rejected || 0,
                    label: dayData[d] ? [...dayData[d].operators].join(", ") || "—" : "",
                  })}
                />
              </div>
            );
          })()}
        </div>
      )}
      {}
      {reportTab === "po_recon" && (() => {
        
        const pos = (purchaseOrders || []).filter(p => {
          if (p.status === "Cancelled") return false;
          if (dateFrom && p.poDate < dateFrom) return false;
          if (dateTo   && p.poDate > dateTo)   return false;
          return true;
        });

        
        const grnMap = {};
        (inward || []).forEach(grn => {
          if (!grn.poRef) return;
          if (dateFrom && grn.grnDate < dateFrom) return;
          if (dateTo   && grn.grnDate > dateTo)   return;
          if (!grnMap[grn.poRef]) grnMap[grn.poRef] = {};
          (grn.items || []).forEach(it => {
            const key = (it.itemName || "").toLowerCase();
            if (!grnMap[grn.poRef][key]) grnMap[grn.poRef][key] = { qty: 0, weight: 0 };
            grnMap[grn.poRef][key].qty    += +(it.noOfSheets || it.noOfReels || 0);
            grnMap[grn.poRef][key].weight += +(it.weight || 0);
          });
        });

        
        const totalPOs = pos.length;
        const openPOs  = pos.filter(p => {
          const grns = grnMap[p.poNo] || {};
          const ordWeight = (p.items||[]).reduce((s, it) => s + +(it.weight||0), 0);
          const recWeight = Object.values(grns).reduce((s, v) => s + v.weight, 0);
          const ordQty = (p.items||[]).reduce((s, it) => s + +(it.noOfSheets||it.noOfReels||0), 0);
          const recQty = Object.values(grns).reduce((s, v) => s + v.qty, 0);
          if (p.status === "Cancelled") return false;
          if (recWeight === 0 && recQty === 0) return true;
          if (ordWeight > 0 && recWeight >= ordWeight * 0.99) return false;
          if (ordQty > 0 && recQty >= ordQty) return false;
          return true;
        }).length;
        const totalOrderedWeight = pos.reduce((s, p) => s + (p.items||[]).reduce((ss, it) => ss + +(it.weight||0), 0), 0);
        const totalReceivedWeight = (inward||[]).reduce((s, g) => s + (g.items||[]).reduce((ss, it) => ss + +(it.weight||0), 0), 0);
        const totalPendingWeight = Math.max(0, totalOrderedWeight - totalReceivedWeight);

        return (
          <div>
            {}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <DateFilter />
              <button onClick={() => {
                const dateRange = dateFrom || dateTo ? `${dateFrom || "—"} to ${dateTo || today()}` : "All time";
                const rows = pos.map(p => {
                  const grns = grnMap[p.poNo] || {};
                  const ordQty    = (p.items||[]).reduce((s, it) => s + +(it.noOfSheets||it.noOfReels||0), 0);
                  const ordWeight = (p.items||[]).reduce((s, it) => s + +(it.weight||0), 0);
                  const recQty    = Object.values(grns).reduce((s, v) => s + v.qty, 0);
                  const recWeight = Object.values(grns).reduce((s, v) => s + v.weight, 0);
                  const pendQty    = Math.max(0, ordQty - recQty);
                  const pendWeight = Math.max(0, ordWeight - recWeight);
                  const status = p.status === "Cancelled" ? "Cancelled"
                    : recWeight === 0 && recQty === 0 ? "Open"
                    : ordWeight > 0 && recWeight >= ordWeight * 0.99 ? "Received"
                    : ordQty > 0 && recQty >= ordQty ? "Received" : "Partial";
                  const statusColor = status === "Received" ? "#16a34a" : status === "Partial" ? "#d97706" : status === "Cancelled" ? "#dc2626" : "#3b82f6";
                  const items = (p.items||[]).map(it => it.itemName || it.rmItem).filter(Boolean).join(", ");
                  const unitLabel = (p.items||[]).some(it => it.rmItem === "Paper Reel") ? " reels" : (p.items||[]).some(it => it.noOfSheets > 0) ? " sheets" : "";
                  const ordStr = [ordQty > 0 ? ordQty.toLocaleString("en-IN") + unitLabel : "", ordWeight > 0 ? Math.round(ordWeight).toLocaleString("en-IN") + " kg" : ""].filter(Boolean).join(" / ") || "—";
                  const recStr = [recQty > 0 ? recQty.toLocaleString("en-IN") + unitLabel : "", recWeight > 0 ? Math.round(recWeight).toLocaleString("en-IN") + " kg" : ""].filter(Boolean).join(" / ") || "—";
                  const pendStr = [pendQty > 0 ? pendQty.toLocaleString("en-IN") + unitLabel : "", pendWeight > 0.5 ? Math.round(pendWeight).toLocaleString("en-IN") + " kg" : ""].filter(Boolean).join(" / ");
                  const fillRate = ordWeight > 0 ? Math.round(Math.min(recWeight, ordWeight) / ordWeight * 100) : ordQty > 0 ? Math.round(Math.min(recQty, ordQty) / ordQty * 100) : 0;
                  const fillColor = fillRate >= 90 ? "#16a34a" : fillRate >= 50 ? "#d97706" : fillRate > 0 ? "#dc2626" : "#ccc";
                  const skuCount = (p.items||[]).length;
                  return `<tr>
                    <td style="font-family:monospace;font-weight:700;color:#3b82f6">${p.poNo}</td>
                    <td><div style="font-weight:600">${p.vendorName}</div><div style="font-size:10px;color:#888">${items} <span style="color:#aaa">(${skuCount} SKU${skuCount !== 1 ? "s" : ""})</span></div></td>
                    <td>${p.poDate||"—"}</td>
                    <td><span style="font-weight:700;color:${statusColor};background:${statusColor}18;border-radius:4px;padding:2px 8px;font-size:11px">${status}</span></td>
                    <td style="text-align:right;font-family:monospace">${ordStr}</td>
                    <td style="text-align:right;font-family:monospace;color:${recQty >= ordQty && ordQty > 0 || recWeight >= ordWeight && ordWeight > 0 ? "#16a34a" : recQty > 0 || recWeight > 0 ? "#d97706" : "#ccc"}">${recStr}${pendStr ? `<div style="font-size:9px;color:#dc2626">▼ ${pendStr} pending</div>` : ""}</td>
                    <td style="text-align:right;font-family:monospace;font-weight:800;color:${fillColor}">${ordWeight > 0 || ordQty > 0 ? fillRate + "%" : "—"}</td>
                  </tr>`;
                }).join("");
                const css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}h2{font-size:12px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ddd}th.right{text-align:right}td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}.sum{display:flex;gap:20px;margin:16px 0;padding:14px;background:#f8f8f8;border-radius:6px}.s{text-align:center;min-width:100px}.sv{font-size:18px;font-weight:800;font-family:monospace}.sl{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}";
                const html = `<div style="border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center"><div style="font-size:20px;font-weight:900;color:#1e3a5f">AARAY PACKAGING PRIVATE LIMITED</div><div style="font-size:10px;color:#666">Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#666;margin-bottom:4px">Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#444">www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>
                  <h1>PO Reconciliation Report</h1><h2>Period: ${dateRange} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})}</h2>
                  <div class="sum">
                    <div class="s"><div class="sv">${totalPOs}</div><div class="sl">Total POs</div></div>
                    <div class="s"><div class="sv" style="color:#d97706">${openPOs}</div><div class="sl">Open / Partial</div></div>
                    <div class="s"><div class="sv">${fmt(Math.round(totalOrderedWeight))} kg</div><div class="sl">Total Ordered</div></div>
                    <div class="s"><div class="sv" style="color:#16a34a">${fmt(Math.round(totalReceivedWeight))} kg</div><div class="sl">Total Received</div></div>
                    <div class="s"><div class="sv" style="color:${totalPendingWeight > 0 ? "#dc2626" : "#16a34a"}">${fmt(Math.round(totalPendingWeight))} kg</div><div class="sl">Pending</div></div>
                  </div>
                  <table><thead><tr><th>PO #</th><th>Vendor</th><th>PO Date</th><th>Status</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Fill Rate</th></tr></thead><tbody>${rows}</tbody></table>
                  <div class="footer"><span>Generated on ${new Date().toLocaleDateString("en-IN")}</span><span>This is a computer generated document</span></div>`;
                const fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>PO Reconciliation</title><style>" + css + "</style></head><body>" + html + "</body></html>";
                var blob = new Blob([fullHtml], { type: "text/html" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "PO_Reconciliation_" + today() + ".html";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
              }} style={{ marginLeft: "auto", background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
              <ExcelBtn onClick={() => {
                const rows = pos.map(p => {
                  const grns = grnMap[p.poNo] || {};
                  const ordQty    = (p.items||[]).reduce((s, it) => s + +(it.noOfSheets||it.noOfReels||0), 0);
                  const ordWeight = (p.items||[]).reduce((s, it) => s + +(it.weight||0), 0);
                  const recQty    = Object.values(grns).reduce((s, v) => s + v.qty, 0);
                  const recWeight = Object.values(grns).reduce((s, v) => s + v.weight, 0);
                  const status = p.status === "Cancelled" ? "Cancelled"
                    : recWeight === 0 && recQty === 0 ? "Open"
                    : ordWeight > 0 && recWeight >= ordWeight * 0.99 ? "Received"
                    : ordQty > 0 && recQty >= ordQty ? "Received" : "Partial";
                  return {
                    PO_No: p.poNo,
                    Vendor: p.vendorName,
                    PO_Date: p.poDate,
                    Status: status,
                    SKU_Count: (p.items||[]).length,
                    Items: (p.items||[]).map(it => it.itemName||it.rmItem).filter(Boolean).join(", "),
                    Ordered_Qty: ordQty,
                    Received_Qty: recQty,
                    Pending_Qty: Math.max(0, ordQty - recQty),
                    Ordered_Kg: Math.round(ordWeight),
                    Received_Kg: Math.round(recWeight),
                    Pending_Kg: Math.round(Math.max(0, ordWeight - recWeight)),
                    Fill_Rate_Pct: ordWeight > 0 ? Math.round(Math.min(recWeight, ordWeight) / ordWeight * 100) : ordQty > 0 ? Math.round(Math.min(recQty, ordQty) / ordQty * 100) : 0,
                  };
                });
                exportToExcel(rows, "PO_Reconciliation", "PO Reconciliation");
              }} />
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {(() => {
                const totalSKUsOrdered  = pos.reduce((s, p) => s + (p.items||[]).length, 0);
                const totalSKUsReceived = pos.reduce((s, p) => {
                  const grns = grnMap[p.poNo] || {};
                  return s + (p.items||[]).filter(it => {
                    const key = (it.itemName || "").toLowerCase().trim();
                    const rcv = grns[key];
                    if (!rcv) return false;
                    const isRM = !it.materialType || it.materialType === "Raw Material";
                    const ordQ  = isRM ? (it.rmItem === "Paper Reel" ? +(it.weight||0) : +(it.noOfSheets||0)) : +(it.qty||0);
                    const recQ  = isRM ? (rcv.weight||0) : (rcv.qty||0);
                    return ordQ > 0 && recQ >= ordQ * 0.9;
                  }).length;
                }, 0);
                const overallFillRate = totalOrderedWeight > 0 ? Math.round(totalReceivedWeight / totalOrderedWeight * 100) : 0;
                const cards = [
                  { label: "Total POs", val: totalPOs, color: C.blue, filter: "All" },
                  { label: "Open / Partial", val: openPOs, color: C.yellow, filter: "Open/Partial" },
                  { label: "SKUs Ordered", val: totalSKUsOrdered, color: C.blue, filter: null },
                  { label: "SKUs Received", val: totalSKUsReceived, color: C.green, filter: null },
                  { label: "Total Ordered (kg)", val: fmt(Math.round(totalOrderedWeight)) + " kg", color: C.blue, filter: null },
                  { label: "Total Received (kg)", val: fmt(Math.round(totalReceivedWeight)) + " kg", color: C.green, filter: null },
                  { label: "Overall Fill Rate", val: overallFillRate + "%", color: overallFillRate >= 90 ? C.green : overallFillRate >= 50 ? C.yellow : C.red, filter: null },
                  { label: "Pending (kg)", val: fmt(Math.round(totalPendingWeight)) + " kg", color: totalPendingWeight > 0 ? C.red : C.green, filter: null },
                ];
                return cards.map(s => (
                  <Card key={s.label} onClick={s.filter ? () => setPoReconFilter(f => f === s.filter ? "All" : s.filter) : undefined}
                    style={{
                      borderLeft: `3px solid ${s.color}`, padding: 14,
                      cursor: s.filter ? "pointer" : "default",
                      background: poReconFilter === s.filter && s.filter ? s.color + "18" : undefined,
                      outline: poReconFilter === s.filter && s.filter ? `2px solid ${s.color}44` : undefined,
                      transition: "all .15s",
                    }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      {s.label}
                      {s.filter && <span style={{ marginLeft: 6, fontSize: 10, color: poReconFilter === s.filter ? s.color : C.border }}>{poReconFilter === s.filter ? "✕ clear" : "▼ filter"}</span>}
                    </div>
                  </Card>
                ));
              })()}
            </div>

            {}
            {poReconFilter !== "All" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 14px", background: C.yellow + "18", border: `1px solid ${C.yellow}44`, borderRadius: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>⚡ Showing: {poReconFilter} orders only</span>
                <button onClick={() => setPoReconFilter("All")} style={{ background: "transparent", border: `1px solid ${C.yellow}44`, color: C.yellow, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✕ Clear Filter</button>
              </div>
            )}

            {}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "110px 1fr 110px 90px 1fr 1fr 80px", gap: 8, alignItems: "center" }}>
                {["PO #", "Vendor", "PO Date", "Status", "Ordered", "Received", "Fill Rate"].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {pos.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No purchase orders found.</div>
              )}
              {pos.filter(p => {
                if (poReconFilter === "All") return true;
                const grns = grnMap[p.poNo] || {};
                const ordWeight = (p.items||[]).reduce((s, it) => s + +(it.weight||0), 0);
                const ordQty    = (p.items||[]).reduce((s, it) => s + +(it.noOfSheets||it.noOfReels||0), 0);
                const recWeight = Object.values(grns).reduce((s, v) => s + v.weight, 0);
                const recQty    = Object.values(grns).reduce((s, v) => s + v.qty, 0);
                const fillRate  = ordWeight > 0 ? Math.round(Math.min(recWeight, ordWeight) / ordWeight * 100) : ordQty > 0 ? Math.round(Math.min(recQty, ordQty) / ordQty * 100) : 0;
                const st = p.status === "Cancelled" ? "Cancelled" : recWeight === 0 && recQty === 0 ? "Open" : fillRate >= 90 ? "Received" : "Partial";
                return st === "Open" || st === "Partial";
              }).map(p => {
                const grns = grnMap[p.poNo] || {};
                const ordQty    = (p.items||[]).reduce((s, it) => s + +(it.noOfSheets || it.noOfReels || 0), 0);
                const ordWeight = (p.items||[]).reduce((s, it) => s + +(it.weight || 0), 0);
                const recQty    = Object.values(grns).reduce((s, v) => s + v.qty, 0);
                const recWeight = Object.values(grns).reduce((s, v) => s + v.weight, 0);
                const pendQty    = Math.max(0, ordQty - recQty);
                const pendWeight = Math.max(0, ordWeight - recWeight);

                
                const fillRate = ordWeight > 0
                  ? Math.round(Math.min(recWeight, ordWeight) / ordWeight * 100)
                  : ordQty > 0
                    ? Math.round(Math.min(recQty, ordQty) / ordQty * 100)
                    : 0;
                const fillColor = fillRate >= 90 ? C.green : fillRate >= 50 ? C.yellow : fillRate > 0 ? C.red : C.border;

                
                const derivedStatus = p.status === "Cancelled" ? "Cancelled"
                  : recWeight === 0 && recQty === 0 ? "Open"
                  : fillRate >= 90 ? "Received"
                  : "Partial";
                const statusColor = derivedStatus === "Received" ? C.green : derivedStatus === "Partial" ? C.yellow : derivedStatus === "Cancelled" ? C.red : C.blue;
                const recCol = fillRate >= 90 ? C.green : recWeight > 0 || recQty > 0 ? C.yellow : C.border;

                
                const fmtQtyKg = (qty, weight, unit) => {
                  const parts = [];
                  if (qty > 0) parts.push(fmt(qty) + (unit ? " " + unit : ""));
                  if (weight > 0) parts.push(fmt(Math.round(weight)) + " kg");
                  return parts.length ? parts.join(" / ") : "—";
                };
                const unitLabel = (p.items||[]).some(it => it.rmItem === "Paper Reel") ? "reels"
                  : (p.items||[]).some(it => it.noOfSheets > 0) ? "sheets" : "";

                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 110px 90px 1fr 1fr 80px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "start" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.blue, fontSize: 12 }}>{p.poNo}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.vendorName}</div>
                      {(p.items||[]).length > 0 && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                          {(p.items||[]).map(it => it.itemName || it.rmItem).filter(Boolean).slice(0,2).join(", ")}
                          {(p.items||[]).length > 2 ? ` +${(p.items||[]).length - 2} more` : ""}
                          <span style={{ marginLeft: 6, color: C.border }}>({(p.items||[]).length} SKU{(p.items||[]).length !== 1 ? "s" : ""})</span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: C.muted }}>{p.poDate}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusColor + "18", borderRadius: 4, padding: "2px 8px" }}>{derivedStatus}</span>

                    {}
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text }}>
                        {fmtQtyKg(ordQty, ordWeight, unitLabel)}
                      </span>
                      <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{(p.items||[]).length} SKU{(p.items||[]).length !== 1 ? "s" : ""}</div>
                    </div>

                    {}
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: recCol }}>
                        {fmtQtyKg(recQty, recWeight, unitLabel)}
                      </span>
                      {(pendQty > 0 || pendWeight > 0.5) && (
                        <div style={{ fontSize: 9, color: C.red, fontWeight: 700, marginTop: 2 }}>
                          ▼ {fmtQtyKg(pendQty, pendWeight, unitLabel)} pending
                        </div>
                      )}
                    </div>

                    {}
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 13, color: fillColor }}>
                        {ordWeight > 0 || ordQty > 0 ? fillRate + "%" : "—"}
                      </div>
                      {(ordWeight > 0 || ordQty > 0) && (
                        <div style={{ marginTop: 3, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: Math.min(100, fillRate) + "%", background: fillColor, borderRadius: 2, transition: "width .3s" }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })()}
      {}
      {reportTab === "so_recon" && (() => {
        
        const sos = (salesOrders || []).filter(s => {
          if (s.status === "Cancelled") return false;
          if (dateFrom && (s.orderDate || "") < dateFrom) return false;
          if (dateTo   && (s.orderDate || "") > dateTo)   return false;
          return true;
        });

        
        const soDispMap = {};
        const soDispDatesMap = {}; 
        const soDispNosMap  = {}; 
        (dispatches || []).forEach(d => {
          if (!d.soRef) return;
          if (!soDispMap[d.soRef]) soDispMap[d.soRef] = {};
          (d.items || []).forEach(it => {
            const key = (it.itemName || "").toLowerCase().trim();
            soDispMap[d.soRef][key] = (soDispMap[d.soRef][key] || 0) + +(it.qty || 0);
          });
          if (d.dispatchDate) {
            if (!soDispDatesMap[d.soRef]) soDispDatesMap[d.soRef] = new Set();
            soDispDatesMap[d.soRef].add(d.dispatchDate);
          }
          if (d.dispatchNo) {
            if (!soDispNosMap[d.soRef]) soDispNosMap[d.soRef] = new Set();
            soDispNosMap[d.soRef].add(d.dispatchNo);
          }
        });

        
        const soJOMap = {};
        (jobOrders || []).forEach(j => {
          if (!j.soRef) return;
          if (!soJOMap[j.soRef]) soJOMap[j.soRef] = [];
          soJOMap[j.soRef].push(j);
        });

        
        const soRows = sos.map(s => {
          const disp    = soDispMap[s.soNo] || {};
          const ordQty  = (s.items || []).reduce((sum, it) => sum + +(it.orderQty || 0), 0);
          const ordVal  = (s.items || []).reduce((sum, it) => sum + +(it.amount || 0), 0);
          const dispQty = (s.items || []).reduce((sum, it) => {
            return sum + (disp[(it.itemName || "").toLowerCase().trim()] || 0);
          }, 0);
          
          const dispVal = (s.items || []).reduce((sum, it) => {
            const dq = disp[(it.itemName || "").toLowerCase().trim()] || 0;
            const oq = +(it.orderQty || 0);
            const price = +(it.price || 0);
            return sum + (oq > 0 ? Math.min(dq, oq) * price : 0);
          }, 0);
          const pendQty = Math.max(0, ordQty - dispQty);
          const pendVal = Math.max(0, ordVal - dispVal);
          const pct     = ordQty > 0 ? Math.min(100, Math.round(dispQty / ordQty * 100)) : 0;
          const status  = pct >= 100 ? "Fully Dispatched"
            : pct > 0 ? "Partially Dispatched"
            : "Not Dispatched";
          const dispDates = soDispDatesMap[s.soNo] ? [...soDispDatesMap[s.soNo]].sort() : [];
          const dispNos   = soDispNosMap[s.soNo]   ? [...soDispNosMap[s.soNo]].sort()  : [];
          const linkedJOs = soJOMap[s.soNo] || [];
          const joNos     = linkedJOs.map(j => j.joNo).join(", ");
          const joStatus  = linkedJOs.length === 0 ? "No JO"
            : linkedJOs.every(j => j.status === "Completed") ? "All Completed"
            : linkedJOs.some(j => j.status === "In Progress" || j.status === "Completed") ? "In Progress"
            : "Pending";
          return { s, ordQty, dispQty, pendQty, ordVal, dispVal, pendVal, pct, status, dispDates, dispNos, linkedJOs, joNos, joStatus };
        });

        
        const totalSOs      = soRows.length;
        const fullyDisp     = soRows.filter(r => r.status === "Fully Dispatched").length;
        const partialDisp   = soRows.filter(r => r.status === "Partially Dispatched").length;
        const notDisp       = soRows.filter(r => r.status === "Not Dispatched").length;
        const totalOrdQty   = soRows.reduce((s, r) => s + r.ordQty, 0);
        const totalDispQty  = soRows.reduce((s, r) => s + r.dispQty, 0);
        const totalPendQty  = soRows.reduce((s, r) => s + r.pendQty, 0);
        const totalOrdVal   = soRows.reduce((s, r) => s + r.ordVal, 0);
        const totalDispVal  = soRows.reduce((s, r) => s + r.dispVal, 0);
        const totalPendVal  = soRows.reduce((s, r) => s + r.pendVal, 0);

        const statusColor = (st) => st === "Fully Dispatched" ? C.green : st === "Partially Dispatched" ? C.yellow : C.red;
        const joStatusColor = (st) => st === "All Completed" ? C.green : st === "In Progress" ? C.blue : st === "No JO" ? C.muted : C.yellow;

        const filtered = soRows.filter(r => {
          if (soReconFilter !== "All" && r.status !== soReconFilter) return false;
          const q = soReconSearch.toLowerCase();
          if (q && !(r.s.soNo + r.s.clientName + r.joNos).toLowerCase().includes(q)) return false;
          return true;
        }).sort((a, b) => a.pct - b.pct);

        const dateRange = dateFrom || dateTo ? `${dateFrom || "—"} to ${dateTo || today()}` : "All time";

        const exportPDF = () => {
          const rows = filtered.map(({ s, ordQty, dispQty, pendQty, pct, status, dispDates, dispNos, joNos }) => {
            const scol = status === "Fully Dispatched" ? "#16a34a" : status === "Partially Dispatched" ? "#d97706" : "#dc2626";
            const icon = status === "Fully Dispatched" ? "✅" : status === "Partially Dispatched" ? "⚡" : "⏳";
            const items = (s.items || []).slice(0, 2).map(it => it.itemName).filter(Boolean).join(", ") + ((s.items||[]).length > 2 ? ` +${(s.items||[]).length - 2} more` : "");
            return `<tr>
              <td style="font-family:monospace;font-weight:700;color:#16a34a">${s.soNo}</td>
              <td><div style="font-weight:600">${s.clientName}</div><div style="font-size:10px;color:#888">${s.orderDate||""}</div></td>
              <td style="font-size:11px;color:#555">${items}</td>
              <td style="font-size:10px;color:#888">${s.deliveryDate || "—"}</td>
              <td style="text-align:right;font-family:monospace">${ordQty > 0 ? ordQty.toLocaleString("en-IN") : "—"}</td>
              <td style="text-align:right;font-family:monospace;color:#16a34a">${dispQty > 0 ? dispQty.toLocaleString("en-IN") : "—"}</td>
              <td style="text-align:right;font-family:monospace;color:${pendQty > 0 ? "#dc2626" : "#16a34a"}">${pendQty > 0 ? pendQty.toLocaleString("en-IN") : "—"}</td>
              <td style="font-size:10px;color:#555">${dispDates.join(", ") || "—"}</td>
              <td style="font-size:10px;color:#555">${dispNos.join(", ") || "—"}</td>
              <td style="font-size:10px;color:#888">${joNos || "—"}</td>
              <td><span style="font-weight:700;color:${scol};background:${scol}18;border-radius:4px;padding:2px 8px;font-size:11px">${icon} ${pct}%</span></td>
            </tr>`;
          }).join("");
          const css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}h2{font-size:12px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ddd}th.right{text-align:right}td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}.sum{display:flex;gap:16px;margin:16px 0;padding:14px;background:#f8f8f8;border-radius:6px;flex-wrap:wrap}.s{text-align:center;min-width:90px}.sv{font-size:18px;font-weight:800;font-family:monospace}.sl{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}";
          const html = `<div style="border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center"><div style="font-size:20px;font-weight:900;color:#1e3a5f">AARAY PACKAGING PRIVATE LIMITED</div><div style="font-size:10px;color:#666">Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#666;margin-bottom:4px">Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#444">www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>
            <h1>Sales Order Reconciliation Report</h1><h2>Period: ${dateRange} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</h2>
            <div class="sum">
              <div class="s"><div class="sv">${totalSOs}</div><div class="sl">Total SOs</div></div>
              <div class="s"><div class="sv" style="color:#16a34a">${fullyDisp}</div><div class="sl">Fully Dispatched</div></div>
              <div class="s"><div class="sv" style="color:#d97706">${partialDisp}</div><div class="sl">Partial</div></div>
              <div class="s"><div class="sv" style="color:#dc2626">${notDisp}</div><div class="sl">Not Dispatched</div></div>
              <div class="s"><div class="sv">${totalOrdQty.toLocaleString("en-IN")}</div><div class="sl">Total Ordered</div></div>
              <div class="s"><div class="sv" style="color:#16a34a">${totalDispQty.toLocaleString("en-IN")}</div><div class="sl">Total Dispatched</div></div>
              <div class="s"><div class="sv" style="color:${totalPendQty > 0 ? "#dc2626" : "#16a34a"}">${totalPendQty.toLocaleString("en-IN")}</div><div class="sl">Pending</div></div>
            </div>
            <table><thead><tr><th>SO #</th><th>Client</th><th>Items</th><th>Delivery Date</th><th class="right">Ordered</th><th class="right">Dispatched</th><th class="right">Pending</th><th>Dispatch Dates</th><th>Dispatch Nos</th><th>Linked JOs</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="footer"><span>Generated on ${new Date().toLocaleDateString("en-IN")}</span><span>This is a computer generated document</span></div>`;
          const fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>SO Reconciliation</title><style>" + css + "</style></head><body>" + html + "</body></html>";
          const blob = new Blob([fullHtml], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "SO_Reconciliation_" + today() + ".html";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        };

        const exportExcel = () => {
          const rows = filtered.map(({ s, ordQty, dispQty, pendQty, ordVal, dispVal, pendVal, pct, status, dispDates, dispNos, joNos, joStatus }) => ({
            SO_No: s.soNo,
            Client: s.clientName,
            Order_Date: s.orderDate || "",
            Delivery_Date: s.deliveryDate || "",
            Items: (s.items || []).map(it => it.itemName).filter(Boolean).join(", "),
            Ordered_Qty: ordQty,
            Dispatched_Qty: dispQty,
            Pending_Qty: pendQty,
            Order_Value_Rs: Math.round(ordVal),
            Dispatched_Value_Rs: Math.round(dispVal),
            Pending_Value_Rs: Math.round(pendVal),
            Dispatch_Pct: pct + "%",
            Dispatch_Dates: dispDates.join(", "),
            Dispatch_Nos: dispNos.join(", "),
            Linked_JOs: joNos,
            JO_Status: joStatus,
            SO_Status: status,
          }));
          exportToExcel(rows, "SO_Reconciliation", "SO Reconciliation");
        };

        return (
          <div>
            {}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <DateFilter />
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={exportPDF} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
                <ExcelBtn onClick={exportExcel} />
              </div>
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total SOs",           val: totalSOs,                                          color: C.blue },
                { label: "Fully Dispatched",     val: fullyDisp,                                         color: C.green },
                { label: "Partially Dispatched", val: partialDisp,                                       color: C.yellow },
                { label: "Not Dispatched",       val: notDisp,                                           color: C.red },
                { label: "Order Value (₹)",      val: "₹" + fmt(Math.round(totalOrdVal)),                color: C.blue },
                { label: "Dispatched Value (₹)", val: "₹" + fmt(Math.round(totalDispVal)),               color: C.green },
                { label: "Pending Value (₹)",    val: "₹" + fmt(Math.round(totalPendVal)),               color: totalPendVal > 0 ? C.red : C.green },
                { label: "Total Ordered (pcs)",  val: fmt(totalOrdQty),                                  color: C.blue },
                { label: "Pending (pcs)",        val: fmt(totalPendQty),                                 color: totalPendQty > 0 ? C.red : C.green },
              ].map(s => (
                <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="🔍 Search SO#, client or JO#..."
                value={soReconSearch} onChange={e => setSoReconSearch(e.target.value)}
                style={{ maxWidth: 260, fontSize: 13 }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "Not Dispatched", "Partially Dispatched", "Fully Dispatched"].map(st => (
                  <button key={st} onClick={() => setSoReconFilter(st)} style={{
                    padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: soReconFilter === st ? (st === "All" ? C.accent : statusColor(st)) + "22" : "transparent",
                    border: `1px solid ${soReconFilter === st ? (st === "All" ? C.accent : statusColor(st)) : C.border}`,
                    color: soReconFilter === st ? (st === "All" ? C.accent : statusColor(st)) : C.muted,
                  }}>{st === "All" ? "All" : st}</button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{filtered.length} of {totalSOs} SOs</span>
            </div>

            {}
            {sos.length === 0 ? (
              <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No sales orders found for this period</div>
              </Card>
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {}
                <div style={{ display: "grid", gridTemplateColumns: "110px 150px 1fr 95px 75px 80px 75px 90px 90px 90px 100px 80px", gap: 6, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {["SO #", "Client", "Items", "Delivery Date", "Ord Qty", "Disp Qty", "Pend Qty", "Ord Value ₹", "Disp Value ₹", "Pend Value ₹", "Dispatch Dates", "Status"].map(h => (
                    <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No orders match the filter.</div>
                )}

                {filtered.map(({ s, ordQty, dispQty, pendQty, ordVal, dispVal, pendVal, pct, status, dispDates, dispNos, linkedJOs, joNos, joStatus }) => {
                  const scol = statusColor(status);
                  const jcol = joStatusColor(joStatus);
                  return (
                    <div key={s.id} style={{ display: "grid", gridTemplateColumns: "110px 150px 1fr 95px 75px 80px 75px 90px 90px 90px 100px 80px", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "start" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                      {}
                      <div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.green, fontSize: 12 }}>{s.soNo}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.orderDate || ""}</div>
                      </div>

                      {}
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.clientName}</div>

                      {}
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {(s.items || []).slice(0, 2).map(it => it.itemName).filter(Boolean).join(", ")}
                        {(s.items || []).length > 2 && <span> +{(s.items||[]).length - 2} more</span>}
                        {linkedJOs.length > 0 && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: jcol, fontWeight: 700, background: jcol + "18", borderRadius: 3, padding: "1px 6px" }}>
                              {linkedJOs.length} JO{linkedJOs.length > 1 ? "s" : ""} · {joStatus}
                            </span>
                          </div>
                        )}
                      </div>

                      {}
                      <div style={{ fontSize: 11, color: s.deliveryDate && s.deliveryDate < today() && status !== "Fully Dispatched" ? C.red : C.muted, fontWeight: s.deliveryDate && s.deliveryDate < today() && status !== "Fully Dispatched" ? 700 : 400 }}>
                        {s.deliveryDate || "—"}
                        {s.deliveryDate && s.deliveryDate < today() && status !== "Fully Dispatched" && <div style={{ fontSize: 9, color: C.red }}>Overdue</div>}
                      </div>

                      {}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{ordQty > 0 ? fmt(ordQty) : "—"}</span>

                      {}
                      <div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: dispQty >= ordQty && ordQty > 0 ? C.green : dispQty > 0 ? C.yellow : C.border }}>
                          {dispQty > 0 ? fmt(dispQty) : "—"}
                        </span>
                        {ordQty > 0 && (
                          <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: scol, borderRadius: 2 }} />
                          </div>
                        )}
                      </div>

                      {}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: pendQty > 0 ? 700 : 400, color: pendQty > 0 ? C.red : C.muted }}>
                        {pendQty > 0 ? fmt(pendQty) : "—"}
                      </span>

                      {}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: ordVal > 0 ? C.text : C.border }}>
                        {ordVal > 0 ? "₹" + fmt(Math.round(ordVal)) : "—"}
                      </span>

                      {}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: dispVal > 0 ? C.green : C.border }}>
                        {dispVal > 0 ? "₹" + fmt(Math.round(dispVal)) : "—"}
                      </span>

                      {}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: pendVal > 0 ? 700 : 400, color: pendVal > 0 ? C.red : C.muted }}>
                        {pendVal > 0 ? "₹" + fmt(Math.round(pendVal)) : "—"}
                      </span>

                      {}
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {dispDates.length === 0 ? "—" : dispDates.map((d, i) => <div key={i}>{d}</div>)}
                      </div>

                      {}
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: scol, background: scol + "18", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>{pct}%</span>
                        <div style={{ fontSize: 10, color: scol, marginTop: 3 }}>{status}</div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        );
      })()}

      {}
      {reportTab === "so_ageing" && (() => {
        const ageBucket = (days) =>
          days <= 7  ? "0–7 days"  :
          days <= 14 ? "8–14 days" :
          days <= 30 ? "15–30 days": "30+ days";
        const bucketColor = (b) =>
          b === "0–7 days"   ? C.green  :
          b === "8–14 days"  ? C.yellow :
          b === "15–30 days" ? C.accent : C.red;

        const activeSOs = (salesOrders || []).filter(s => {
          if (s.status === "Cancelled" || s.status === "Closed") return false;
          if (dateFrom && (s.orderDate || "") < dateFrom) return false;
          if (dateTo   && (s.orderDate || "") > dateTo)   return false;
          return true;
        });

        
        const ageDispMap = {};
        (dispatches || []).forEach(d => {
          if (!d.soRef) return;
          if (!ageDispMap[d.soRef]) ageDispMap[d.soRef] = {};
          (d.items || []).forEach(it => {
            const key = (it.itemName || "").toLowerCase().trim();
            ageDispMap[d.soRef][key] = (ageDispMap[d.soRef][key] || 0) + +(it.qty || 0);
          });
        });

        const ageRows = activeSOs.map(s => {
          const disp    = ageDispMap[s.soNo] || {};
          const ordQty  = (s.items || []).reduce((sum, it) => sum + +(it.orderQty || 0), 0);
          const ordVal  = (s.items || []).reduce((sum, it) => sum + +(it.amount || 0), 0);
          const dispQty = (s.items || []).reduce((sum, it) =>
            sum + (disp[(it.itemName || "").toLowerCase().trim()] || 0), 0);
          const pendQty = Math.max(0, ordQty - dispQty);
          const pendVal = ordVal > 0 && ordQty > 0 ? Math.round((pendQty / ordQty) * ordVal) : 0;
          const pct     = ordQty > 0 ? Math.min(100, Math.round(dispQty / ordQty * 100)) : 0;
          const status  = pct >= 100 ? "Fully Dispatched" : pct > 0 ? "Partially Dispatched" : "Not Dispatched";
          const ageDays = s.orderDate
            ? Math.floor((new Date(today()+"T00:00:00") - new Date(s.orderDate+"T00:00:00")) / 86400000)
            : 0;
          const overdueDelivery = s.deliveryDate && s.deliveryDate < today() && status !== "Fully Dispatched";
          const deliveryAgeDays = overdueDelivery
            ? Math.floor((new Date(today()+"T00:00:00") - new Date(s.deliveryDate+"T00:00:00")) / 86400000)
            : 0;
          const bucket = ageBucket(ageDays);
          return { s, ordQty, dispQty, pendQty, ordVal, pendVal, pct, status, ageDays, overdueDelivery, deliveryAgeDays, bucket };
        }).filter(r => r.status !== "Fully Dispatched") 
          .sort((a, b) => b.ageDays - a.ageDays);

        const buckets = ["0–7 days","8–14 days","15–30 days","30+ days"];
        const bucketStats = buckets.map(b => ({
          bucket: b,
          count: ageRows.filter(r => r.bucket === b).length,
          pendVal: ageRows.filter(r => r.bucket === b).reduce((s, r) => s + r.pendVal, 0),
        }));

        const filteredAge = ageRows.filter(r => {
          if (ageingFilter !== "All" && r.bucket !== ageingFilter) return false;
          const q = ageingSearch.toLowerCase();
          if (q && !(r.s.soNo + r.s.clientName).toLowerCase().includes(q)) return false;
          return true;
        });

        const totalPendVal = ageRows.reduce((s, r) => s + r.pendVal, 0);
        const totalPendQty = ageRows.reduce((s, r) => s + r.pendQty, 0);

        return (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <DateFilter />
              <ExcelBtn onClick={() => {
                const rows = filteredAge.map(r => ({
                  SO_No: r.s.soNo, Client: r.s.clientName,
                  Order_Date: r.s.orderDate || "", Delivery_Date: r.s.deliveryDate || "",
                  Age_Days: r.ageDays, Age_Bucket: r.bucket,
                  Overdue_Delivery: r.overdueDelivery ? "Yes (" + r.deliveryAgeDays + " days)" : "No",
                  Ordered_Qty: r.ordQty, Dispatched_Qty: r.dispQty, Pending_Qty: r.pendQty,
                  Order_Value_Rs: Math.round(r.ordVal), Pending_Value_Rs: r.pendVal,
                  Dispatch_Pct: r.pct + "%", Status: r.status,
                }));
                exportToExcel(rows, "SO_Ageing_Report", "SO Ageing");
              }} />
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {bucketStats.map(({ bucket, count, pendVal }) => {
                const col = bucketColor(bucket);
                return (
                  <div key={bucket} onClick={() => setAgeingFilter(ageingFilter === bucket ? "All" : bucket)}
                    style={{ background: ageingFilter === bucket ? col + "22" : C.card, border: `1px solid ${ageingFilter === bucket ? col : col + "55"}`, borderLeft: `4px solid ${col}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all .15s" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono',monospace" }}>{count}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 4 }}>{bucket}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>₹{fmt(Math.round(pendVal))} pending</div>
                  </div>
                );
              })}
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Open / Partial SOs",   val: ageRows.length,                color: C.yellow },
                { label: "Pending Qty (pcs)",     val: fmt(totalPendQty),             color: C.red },
                { label: "Pending Value (₹)",     val: "₹" + fmt(Math.round(totalPendVal)), color: C.red },
                { label: "Overdue Deliveries",    val: ageRows.filter(r => r.overdueDelivery).length, color: C.red },
              ].map(s => (
                <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="🔍 Search SO# or client..." value={ageingSearch}
                onChange={e => setAgeingSearch(e.target.value)} style={{ maxWidth: 240, fontSize: 13 }} />
              {ageingFilter !== "All" && (
                <button onClick={() => setAgeingFilter("All")} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Clear filter</button>
              )}
              <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{filteredAge.length} orders</span>
            </div>

            {ageRows.length === 0 ? (
              <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No open or partially dispatched orders</div>
              </Card>
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "110px 150px 80px 90px 80px 75px 80px 90px 90px 80px", gap: 6, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {["SO #", "Client", "Order Date", "Delivery Date", "Age", "Pend Qty", "Pend ₹", "Ord ₹", "Dispatch%", "Status"].map(h => (
                    <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                  ))}
                </div>
                {filteredAge.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No orders match filter.</div>}
                {filteredAge.map(({ s, ordQty, dispQty, pendQty, ordVal, pendVal, pct, status, ageDays, overdueDelivery, deliveryAgeDays, bucket }) => {
                  const scol = bucketColor(bucket);
                  const stcol = status === "Fully Dispatched" ? C.green : status === "Partially Dispatched" ? C.yellow : C.red;
                  return (
                    <div key={s.id} style={{ display: "grid", gridTemplateColumns: "110px 150px 80px 90px 80px 75px 80px 90px 90px 80px", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center", borderLeft: `3px solid ${scol}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.green, fontSize: 12 }}>{s.soNo}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{(s.items||[]).length} item{(s.items||[]).length!==1?"s":""}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.clientName}</div>
                      <span style={{ fontSize: 11, color: C.muted }}>{s.orderDate || "—"}</span>
                      <div>
                        <span style={{ fontSize: 11, color: overdueDelivery ? C.red : C.muted, fontWeight: overdueDelivery ? 700 : 400 }}>{s.deliveryDate || "—"}</span>
                        {overdueDelivery && <div style={{ fontSize: 9, color: C.red, fontWeight: 700 }}>+{deliveryAgeDays}d overdue</div>}
                      </div>
                      <div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 14, color: scol }}>{ageDays}d</span>
                        <div style={{ fontSize: 9, color: scol, fontWeight: 700, marginTop: 1 }}>{bucket}</div>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: pendQty > 0 ? C.red : C.muted, fontWeight: 700 }}>{fmt(pendQty)}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: pendVal > 0 ? C.red : C.muted, fontWeight: pendVal > 0 ? 700 : 400 }}>
                        {pendVal > 0 ? "₹" + fmt(Math.round(pendVal)) : "—"}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>
                        {ordVal > 0 ? "₹" + fmt(Math.round(ordVal)) : "—"}
                      </span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: stcol }}>{pct}%</div>
                        <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: pct + "%", background: stcol, borderRadius: 2 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: stcol, background: stcol + "18", borderRadius: 4, padding: "2px 6px" }}>{status.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        );
      })()}

      {}
      {reportTab === "prod_target" && (() => {
        const processes = ["All", ...STAGES];

        
        const dailyActual = {}; 
        jobOrders.forEach(jo => {
          (jo.stageHistory || []).forEach(e => {
            if (!e.date) return;
            if (dateFrom && e.date < dateFrom) return;
            if (dateTo   && e.date > dateTo)   return;
            const proc = e.stage || "Unknown";
            const keyAll  = e.date + "|All";
            const keyProc = e.date + "|" + proc;
            dailyActual[keyAll]  = (dailyActual[keyAll]  || 0) + +(e.qtyCompleted || 0);
            dailyActual[keyProc] = (dailyActual[keyProc] || 0) + +(e.qtyCompleted || 0);
          });
        });

        const pvtDates = reportDates; 

        
        const totalActual = pvtDates.reduce((s, d) => s + (dailyActual[d + "|" + pvtProcess] || 0), 0);
        const totalTarget = pvtDates.reduce((s, d) => {
          const k = d + "|" + pvtProcess;
          return s + (pvtTargets[k] || 0);
        }, 0);
        const activeDays  = pvtDates.filter(d => new Date(d+"T00:00:00").getDay() !== 0).length;
        const hitDays     = pvtDates.filter(d => {
          const actual = dailyActual[d + "|" + pvtProcess] || 0;
          const target = pvtTargets[d + "|" + pvtProcess] || 0;
          return target > 0 && actual >= target;
        }).length;
        const targetSetDays = pvtDates.filter(d => pvtTargets[d + "|" + pvtProcess] > 0).length;
        const achievement = totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : null;

        return (
          <div>
            {}
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Process</label>
                <select value={pvtProcess} onChange={e => setPvtProcess(e.target.value)} style={{ fontSize: 13, width: 200 }}>
                  {processes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <DateFilter />
              <ExcelBtn onClick={() => {
                const rows = pvtDates.map(d => {
                  const dt = new Date(d+"T00:00:00");
                  const actual = dailyActual[d+"|"+pvtProcess] || 0;
                  const target = pvtTargets[d+"|"+pvtProcess] || 0;
                  const gap = actual - target;
                  return {
                    Date: String(dt.getDate()).padStart(2,"0")+"/"+String(dt.getMonth()+1).padStart(2,"0")+"/"+dt.getFullYear(),
                    Weekday: dt.toLocaleString("default",{weekday:"long"}),
                    Process: pvtProcess,
                    Target: target || "",
                    Actual: actual || "",
                    Gap: target > 0 ? gap : "",
                    Achievement_Pct: target > 0 ? Math.round(actual/target*100)+"%" : "",
                    Hit_Target: target > 0 ? (actual >= target ? "Yes" : "No") : "",
                  };
                });
                exportToExcel(rows, "Production_vs_Target_"+pvtProcess.replace(/\s+/g,"_"), "Prod vs Target");
              }} />
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Target",     val: totalTarget > 0 ? fmt(totalTarget) : "Not set", color: C.blue },
                { label: "Total Actual",     val: fmt(totalActual),  color: totalActual >= totalTarget && totalTarget > 0 ? C.green : C.yellow },
                { label: "Achievement",      val: achievement !== null ? achievement + "%" : "—", color: achievement === null ? C.muted : achievement >= 100 ? C.green : achievement >= 80 ? C.yellow : C.red },
                { label: "Days w/ Target",   val: targetSetDays + " / " + activeDays, color: C.blue },
                { label: "Days Target Hit",  val: targetSetDays > 0 ? hitDays + " / " + targetSetDays : "—", color: hitDays === targetSetDays && targetSetDays > 0 ? C.green : C.yellow },
                { label: "Shortfall",        val: totalTarget > 0 ? fmt(Math.max(0, totalTarget - totalActual)) : "—", color: C.red },
              ].map(s => (
                <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "130px 90px 90px 90px 100px 90px 1fr", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {["Date", "Target", "Actual", "Gap", "Achievement", "Hit?", "Set Target"].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {pvtDates.map(d => {
                const dt      = new Date(d+"T00:00:00");
                const isSun   = dt.getDay() === 0;
                const isToday = d === today();
                const actual  = dailyActual[d+"|"+pvtProcess] || 0;
                const tKey    = d+"|"+pvtProcess;
                const target  = pvtTargets[tKey] || 0;
                const gap     = actual - target;
                const ach     = target > 0 ? Math.round(actual / target * 100) : null;
                const hit     = target > 0 && actual >= target;
                const achCol  = ach === null ? C.muted : ach >= 100 ? C.green : ach >= 80 ? C.yellow : C.red;

                return (
                  <div key={d} style={{ display: "grid", gridTemplateColumns: "130px 90px 90px 90px 100px 90px 1fr", gap: 8, padding: "9px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center", background: isToday ? C.accent + "08" : isSun ? C.border + "18" : "transparent" }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? C.accent : isSun ? C.red : C.text }}>
                        {String(dt.getDate()).padStart(2,"0")}/{String(dt.getMonth()+1).padStart(2,"0")}/{String(dt.getFullYear()).slice(2)}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>{dt.toLocaleString("default",{weekday:"short"})}{isSun?" · Off":""}{isToday?" · Today":""}</span>
                    </div>

                    {}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: target > 0 ? C.blue : C.border }}>
                      {target > 0 ? fmt(target) : "—"}
                    </span>

                    {}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: actual > 0 ? 700 : 400, color: actual > 0 ? C.text : C.border }}>
                      {actual > 0 ? fmt(actual) : "—"}
                    </span>

                    {}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: target === 0 ? C.border : gap >= 0 ? C.green : C.red }}>
                      {target === 0 ? "—" : (gap >= 0 ? "+" : "") + fmt(gap)}
                    </span>

                    {}
                    <div>
                      {ach !== null ? (
                        <>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 13, color: achCol }}>{ach}%</span>
                          <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: Math.min(ach, 100) + "%", background: achCol, borderRadius: 2 }} />
                          </div>
                        </>
                      ) : <span style={{ color: C.border, fontSize: 12 }}>—</span>}
                    </div>

                    {}
                    <span style={{ fontSize: 13 }}>{target === 0 ? "" : hit ? "✅" : "❌"}</span>

                    {}
                    {!isSun && (
                      <input
                        type="number"
                        placeholder="Set target..."
                        value={pvtTargets[tKey] || ""}
                        onChange={e => {
                          const v = +e.target.value;
                          setPvtTargets(prev => {
                            const next = { ...prev };
                            if (v > 0) next[tKey] = v; else delete next[tKey];
                            return next;
                          });
                        }}
                        style={{ fontSize: 12, padding: "5px 8px", maxWidth: 130, background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.blue }}
                      />
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })()}

      {}
      {reportTab === "yield" && (() => {
        
        const inDateRange = (dateStr) => {
          if (!dateStr) return false;
          if (dateFrom && dateStr < dateFrom) return false;
          if (dateTo   && dateStr > dateTo)   return false;
          return true;
        };

        const FORMATION = ["Formation", "Manual Formation"];
        const yieldColor = (pct) => pct >= 95 ? C.green : pct >= 85 ? C.yellow : C.red;

        
        const jos = jobOrders.filter(j =>
          j.status !== "Cancelled" &&
          (j.stageHistory || []).some(e => inDateRange(e.date))
        );

        
        const joYield = jos.map(j => {
          const ordered = +(j.orderQty || 0);
          const entriesInRange = (j.stageHistory || []).filter(e => inDateRange(e.date));
          const totalRejected = entriesInRange.reduce((s, e) => s + +(e.qtyRejected || 0), 0);
          const formationEntries = entriesInRange.filter(e => FORMATION.includes(e.stage));
          let finalQty;
          if (formationEntries.length > 0) {
            finalQty = formationEntries.reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
          } else {
            const stageTotals = {};
            entriesInRange.forEach(e => {
              if (!stageTotals[e.stage]) stageTotals[e.stage] = 0;
              stageTotals[e.stage] += +(e.qtyCompleted || 0);
            });
            const vals = Object.values(stageTotals);
            finalQty = vals.length > 0 ? Math.min(...vals) : 0;
          }
          const yieldPct = ordered > 0 ? Math.round((finalQty / ordered) * 100) : null;
          const rejPct   = ordered > 0 && totalRejected > 0 ? Math.round((totalRejected / ordered) * 100) : 0;
          return { j, ordered, finalQty, totalRejected, yieldPct, rejPct };
        }).sort((a, b) => (a.yieldPct ?? 100) - (b.yieldPct ?? 100));

        
        const processStats = {};
        jobOrders.forEach(jo => {
          (jo.stageHistory || []).filter(e => inDateRange(e.date)).forEach(e => {
            const proc = e.stage || "Unknown";
            if (!processStats[proc]) processStats[proc] = { completed: 0, rejected: 0, jobs: {} };
            processStats[proc].completed += +(e.qtyCompleted || 0);
            processStats[proc].rejected  += +(e.qtyRejected  || 0);
            if (!processStats[proc].jobs[jo.joNo]) processStats[proc].jobs[jo.joNo] = { jo, completed: 0, rejected: 0 };
            processStats[proc].jobs[jo.joNo].completed += +(e.qtyCompleted || 0);
            processStats[proc].jobs[jo.joNo].rejected  += +(e.qtyRejected  || 0);
          });
        });
        const procRows = Object.entries(processStats).map(([proc, s]) => {
          const total = s.completed + s.rejected;
          const yieldPct = total > 0 ? Math.round((s.completed / total) * 100) : 100;
          const rejPct   = total > 0 ? Math.round((s.rejected  / total) * 100) : 0;
          return { proc, ...s, total, yieldPct, rejPct };
        }).sort((a, b) => a.yieldPct - b.yieldPct);

        
        const totalOrdered  = joYield.reduce((s, r) => s + r.ordered, 0);
        const totalProduced = joYield.reduce((s, r) => s + r.finalQty, 0);
        const totalRejected = joYield.reduce((s, r) => s + r.totalRejected, 0);
        const overallYield  = totalOrdered > 0 ? Math.round((totalProduced / totalOrdered) * 100) : 0;

        

        
        if (yieldDrill) {
          const pData = processStats[yieldDrill] || { completed: 0, rejected: 0, jobs: {} };
          const drillJobs = Object.values(pData.jobs).sort((a, b) => {
            const aR = a.completed + a.rejected > 0 ? a.rejected / (a.completed + a.rejected) : 0;
            const bR = b.completed + b.rejected > 0 ? b.rejected / (b.completed + b.rejected) : 0;
            return bR - aR;
          });
          const dTotal = pData.completed + pData.rejected;
          const dYield = dTotal > 0 ? Math.round((pData.completed / dTotal) * 100) : 100;
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button onClick={() => setYieldDrill(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: PROCESS_COLORS[yieldDrill] || C.accent, margin: 0 }}>{yieldDrill} — Wastage Breakdown</h2>
                <span style={{ fontSize: 12, color: C.muted }}>{dateFrom || dateTo ? `${dateFrom || "—"} to ${dateTo || today()}` : "All time"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total Processed", val: fmt(dTotal), color: C.blue },
                  { label: "Completed", val: fmt(pData.completed), color: C.green },
                  { label: "Wastage", val: fmt(pData.rejected), color: C.red },
                  { label: "Yield", val: dYield + "%", color: yieldColor(dYield) },
                ].map(s => (
                  <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                  </Card>
                ))}
              </div>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 130px 90px 90px 80px 70px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {["JO #", "Item", "Client", "Completed", "Wastage", "Yield", "Wst %"].map(h => (
                    <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                  ))}
                </div>
                {drillJobs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No data for this period.</div>}
                {drillJobs.map(({ jo, completed, rejected }) => {
                  const total = completed + rejected;
                  const yPct = total > 0 ? Math.round((completed / total) * 100) : 100;
                  const rPct = total > 0 ? Math.round((rejected / total) * 100) : 0;
                  return (
                    <div key={jo.joNo} style={{ display: "grid", gridTemplateColumns: "120px 1fr 130px 90px 90px 80px 70px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.yellow, fontSize: 12 }}>{jo.joNo}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{jo.itemName || "—"}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{jo.status}</div>
                      </div>
                      <span style={{ fontSize: 12, color: C.muted }}>{jo.clientName || "—"}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.green }}>{fmt(completed)}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: rejected > 0 ? C.red : C.muted }}>{rejected > 0 ? fmt(rejected) : "—"}</span>
                      <div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 13, color: yieldColor(yPct) }}>{yPct}%</span>
                        <div style={{ height: 3, width: "100%", background: C.border, borderRadius: 2, marginTop: 3 }}>
                          <div style={{ height: "100%", width: yPct + "%", background: yieldColor(yPct), borderRadius: 2 }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: rPct > 5 ? C.red : rPct > 0 ? C.yellow : C.muted }}>{rPct > 0 ? rPct + "%" : "—"}</span>
                    </div>
                  );
                })}
              </Card>
            </div>
          );
        }

        
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <DateFilter />
              <button onClick={() => {
                const dateRange = dateFrom||dateTo ? `${dateFrom||"—"} to ${dateTo||today()}` : "All time";
                const joRows = joYield.map(r => `<tr><td style="font-family:monospace;font-weight:700;color:#f59e0b">${r.j.joNo}</td><td>${r.j.itemName||"—"}</td><td>${r.j.clientName||"—"}</td><td style="text-align:right">${r.ordered>0?r.ordered.toLocaleString("en-IN"):"—"}</td><td style="text-align:right">${r.finalQty>0?r.finalQty.toLocaleString("en-IN"):"—"}</td><td style="text-align:right;font-weight:800;color:${r.yieldPct>=95?"#16a34a":r.yieldPct>=85?"#d97706":"#dc2626"}">${r.yieldPct!=null?r.yieldPct+"%":"—"}</td><td style="text-align:right;color:#e53e3e">${r.rejPct>0?r.rejPct+"%":"—"}</td></tr>`).join("");
                const pRows = procRows.map(r => `<tr><td style="font-weight:700">${r.proc}</td><td style="text-align:right">${r.total.toLocaleString("en-IN")}</td><td style="text-align:right">${r.completed.toLocaleString("en-IN")}</td><td style="text-align:right;color:#e53e3e">${r.rejected.toLocaleString("en-IN")}</td><td style="text-align:right;font-weight:800;color:${r.yieldPct>=95?"#16a34a":r.yieldPct>=85?"#d97706":"#dc2626"}">${r.yieldPct}%</td></tr>`).join("");
                var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}h2{font-size:14px;color:#555;margin:20px 0 8px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;border-bottom:2px solid #ddd}th.right{text-align:right}td{padding:6px 10px;border-bottom:1px solid #eee}.sum{display:flex;gap:20px;margin:16px 0;padding:12px;background:#f8f8f8;border-radius:6px}.s{text-align:center}.sv{font-size:20px;font-weight:800;font-family:monospace}.sl{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}";
                var html = "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center'><div style='font-size:20px;font-weight:900;color:#1e3a5f'>AARAY PACKAGING PRIVATE LIMITED</div><div style='font-size:10px;color:#666'>Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style='font-size:10px;color:#666;margin-bottom:4px'>Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style='font-size:10px;color:#444'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div><h1>Production Yield Report</h1><div style='color:#666;font-size:12px;margin-bottom:16px'>Period: "+dateRange+" &nbsp;·&nbsp; Generated: "+new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+"</div><div class='sum'><div class='s'><div class='sv'>"+fmt(totalOrdered)+"</div><div class='sl'>Total Ordered</div></div><div class='s'><div class='sv'>"+fmt(totalProduced)+"</div><div class='sl'>Total Produced</div></div><div class='s'><div class='sv' style='color:#e53e3e'>"+fmt(totalRejected)+"</div><div class='sl'>Total Wastage</div></div><div class='s'><div class='sv' style='color:"+(overallYield>=95?"#16a34a":overallYield>=85?"#d97706":"#dc2626")+"'>"+overallYield+"%</div><div class='sl'>Overall Yield</div></div></div><h2>Per Job Order</h2><table><thead><tr><th>JO #</th><th>Item</th><th>Client</th><th class='right'>Ordered</th><th class='right'>Produced</th><th class='right'>Yield</th><th class='right'>Wst%</th></tr></thead><tbody>"+joRows+"</tbody></table><h2>Per Process</h2><table><thead><tr><th>Process</th><th class='right'>Total</th><th class='right'>Completed</th><th class='right'>Wastage</th><th class='right'>Yield</th></tr></thead><tbody>"+pRows+"</tbody></table><div class='footer'><span>Generated on "+new Date().toLocaleDateString("en-IN")+"</span><span>This is a computer generated document</span></div>";
                var fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Yield Report</title><style>"+css+"</style></head><body>"+html+"</body></html>";
                var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "Yield_Report_" + today() + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
              }} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
              <ExcelBtn onClick={() => {
                const wb = XLSX.utils.book_new();
                const joSheet = XLSX.utils.json_to_sheet(joYield.map(r => ({
                  JO_No: r.j.joNo, Item: r.j.itemName||"—", Client: r.j.clientName||"—",
                  Ordered_Qty: r.ordered, Produced_Qty: r.finalQty,
                  Wastage_Qty: r.totalRejected,
                  Yield_Pct: r.yieldPct != null ? r.yieldPct + "%" : "—",
                  Wastage_Pct: r.rejPct > 0 ? r.rejPct + "%" : "0%",
                })));
                XLSX.utils.book_append_sheet(wb, joSheet, "By Job Order");
                const procSheet = XLSX.utils.json_to_sheet(procRows.map(r => ({
                  Process: r.proc, Total_Processed: r.total,
                  Completed: r.completed, Wastage: r.rejected,
                  Yield_Pct: r.yieldPct + "%", Wastage_Pct: r.rejPct + "%",
                })));
                XLSX.utils.book_append_sheet(wb, procSheet, "By Process");
                xlsxDownload(wb, "Yield_Report_" + today() + ".xlsx");
              }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Ordered", val: fmt(totalOrdered), color: C.blue },
                { label: "Total Produced", val: fmt(totalProduced), color: C.green },
                { label: "Total Wastage", val: fmt(totalRejected), color: C.red },
                { label: "Overall Yield", val: overallYield + "%", color: yieldColor(overallYield) },
              ].map(s => (
                <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>By Process</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Click a process to see per-job wastage breakdown</div>
              {procRows.length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>No production data for this period.</div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {procRows.map(r => (
                    <div key={r.proc} onClick={() => setYieldDrill(r.proc)}
                      style={{ background: C.bg, border: `1px solid ${yieldColor(r.yieldPct)}44`, borderLeft: `3px solid ${yieldColor(r.yieldPct)}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.transform = "translateY(0)"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.proc}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: yieldColor(r.yieldPct) }}>{r.yieldPct}%</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted }}>
                        <span>✅ {fmt(r.completed)}</span>
                        {r.rejected > 0 && <span style={{ color: C.red }}>❌ {fmt(r.rejected)}</span>}
                      </div>
                      <div style={{ marginTop: 8, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: r.yieldPct + "%", background: yieldColor(r.yieldPct), borderRadius: 2, transition: "width .3s" }} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, color: PROCESS_COLORS[r.proc] || C.accent, fontWeight: 700 }}>Click to drill down →</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2 }}>By Job Order</span>
                <span style={{ marginLeft: 10, fontSize: 11, color: C.muted }}>sorted by worst yield · {jos.length} job{jos.length !== 1 ? "s" : ""} with activity in period</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 90px 90px 80px 70px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {["JO #", "Item", "Client", "Ordered", "Produced", "Yield", "Wst %"].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {joYield.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No production entries in this period.</div>}
              {joYield.map(({ j, ordered, finalQty, totalRejected: rej, yieldPct, rejPct }) => (
                <div key={j.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 90px 90px 80px 70px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.yellow, fontSize: 12 }}>{j.joNo}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{j.itemName || "—"}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{j.status}</div>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted }}>{j.clientName || "—"}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{ordered > 0 ? fmt(ordered) : "—"}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.green }}>{finalQty > 0 ? fmt(finalQty) : "—"}</span>
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 13, color: yieldPct != null ? yieldColor(yieldPct) : C.muted }}>
                      {yieldPct != null ? yieldPct + "%" : "—"}
                    </span>
                    {yieldPct != null && (
                      <div style={{ height: 3, width: "100%", background: C.border, borderRadius: 2, marginTop: 3 }}>
                        <div style={{ height: "100%", width: Math.min(yieldPct, 100) + "%", background: yieldColor(yieldPct), borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: rejPct > 5 ? C.red : rejPct > 0 ? C.yellow : C.muted }}>{rejPct > 0 ? rejPct + "%" : "—"}</span>
                </div>
              ))}
            </Card>
          </div>
        );
      })()}


      {}
      {reportTab === "delivery" && (() => {
        
        const dispatchMap = {};
        const dispatchDatesMap = {}; 
        (dispatches || []).forEach(d => {
          if (!d.soRef) return;
          if (dateFrom && d.dispatchDate < dateFrom) return;
          if (dateTo   && d.dispatchDate > dateTo)   return;
          if (!dispatchMap[d.soRef]) dispatchMap[d.soRef] = {};
          (d.items || []).forEach(it => {
            const key = (it.itemName || "").toLowerCase().trim();
            dispatchMap[d.soRef][key] = (dispatchMap[d.soRef][key] || 0) + +(it.qty || 0);
          });
          if (d.dispatchDate) {
            if (!dispatchDatesMap[d.soRef]) dispatchDatesMap[d.soRef] = new Set();
            dispatchDatesMap[d.soRef].add(d.dispatchDate);
          }
        });

        const activeSOs = (salesOrders || []).filter(s => {
          if (s.status === "Cancelled") return false;
          if (dateFrom && s.orderDate < dateFrom) return false;
          if (dateTo   && s.orderDate > dateTo)   return false;
          return true;
        });

        
        const soStatus = activeSOs.map(s => {
          const soDisp = dispatchMap[s.soNo] || {};
          const totalOrdered    = (s.items || []).reduce((sum, it) => sum + +(it.orderQty || 0), 0);
          const totalDispatched = (s.items || []).reduce((sum, it) => {
            return sum + (soDisp[(it.itemName || "").toLowerCase().trim()] || 0);
          }, 0);
          const pending = Math.max(0, totalOrdered - totalDispatched);
          const pct = totalOrdered > 0 ? Math.round(totalDispatched / totalOrdered * 100) : 0;
          const status = pct >= 100 ? "Fully Dispatched" : pct > 0 ? "Partially Dispatched" : "Not Dispatched";
          const dispatchDates = dispatchDatesMap[s.soNo] ? [...dispatchDatesMap[s.soNo]].sort() : [];
          const lastDispatchDate = dispatchDates.length > 0 ? dispatchDates[dispatchDates.length - 1] : "";
          const allDispatchDates = dispatchDates.join(", ");
          return { s, totalOrdered, totalDispatched, pending, pct, status, lastDispatchDate, allDispatchDates };
        });

        const fullyDone  = soStatus.filter(r => r.status === "Fully Dispatched").length;
        const partial    = soStatus.filter(r => r.status === "Partially Dispatched").length;
        const notStarted = soStatus.filter(r => r.status === "Not Dispatched").length;
        const totalPendingQty = soStatus.reduce((s, r) => s + r.pending, 0);

        const [filterStatus, setFilterStatus] = [filterDeliveryStatus, setFilterDeliveryStatus];
        const [searchDel, setSearchDel] = [searchDelivery, setSearchDelivery];

        const filtered = soStatus.filter(r => {
          if (filterStatus !== "All" && r.status !== filterStatus) return false;
          if (searchDel && !(r.s.soNo + r.s.clientName).toLowerCase().includes(searchDel.toLowerCase())) return false;
          return true;
        }).sort((a, b) => a.pct - b.pct); 

        const statusColor = (st) => st === "Fully Dispatched" ? C.green : st === "Partially Dispatched" ? C.yellow : C.red;
        const statusIcon  = (st) => st === "Fully Dispatched" ? "✅" : st === "Partially Dispatched" ? "⚡" : "⏳";

        return (
          <div>
            {}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <DateFilter />
              <button onClick={() => {
                const dateRange = dateFrom || dateTo ? `${dateFrom || "—"} to ${dateTo || today()}` : "All time";
                const rows = filtered.map(({ s, totalOrdered, totalDispatched, pending, pct, status, lastDispatchDate, allDispatchDates }) => {
                  const scol = status === "Fully Dispatched" ? "#16a34a" : status === "Partially Dispatched" ? "#d97706" : "#dc2626";
                  const icon = status === "Fully Dispatched" ? "✅" : status === "Partially Dispatched" ? "⚡" : "⏳";
                  const items = (s.items || []).slice(0, 3).map(it => it.itemName).filter(Boolean).join(", ") + ((s.items||[]).length > 3 ? ` +${(s.items||[]).length - 3} more` : "");
                  return `<tr>
                    <td style="font-family:monospace;font-weight:700;color:#16a34a">${s.soNo}</td>
                    <td><div style="font-weight:600">${s.clientName}</div><div style="font-size:10px;color:#888">${s.orderDate||""}</div></td>
                    <td style="font-size:11px;color:#555">${items}</td>
                    <td style="text-align:right;font-family:monospace">${totalOrdered > 0 ? totalOrdered.toLocaleString("en-IN") : "—"}</td>
                    <td style="text-align:right;font-family:monospace;color:#16a34a">${totalDispatched > 0 ? totalDispatched.toLocaleString("en-IN") : "—"}</td>
                    <td style="text-align:right;font-family:monospace;color:${pending > 0 ? "#dc2626" : "#16a34a"}">${pending > 0 ? pending.toLocaleString("en-IN") : "—"}</td>
                    <td style="font-size:11px;color:#555">${lastDispatchDate || "—"}</td>
                    <td><span style="font-weight:700;color:${scol}">${icon} ${pct}%</span></td>
                  </tr>`;
                }).join("");
                const css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}h2{font-size:12px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ddd}th.right{text-align:right}td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}.sum{display:flex;gap:16px;margin:16px 0;padding:14px;background:#f8f8f8;border-radius:6px;flex-wrap:wrap}.s{text-align:center;min-width:100px}.sv{font-size:18px;font-weight:800;font-family:monospace}.sl{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}";
                const html = `<div style="border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center"><div style="font-size:20px;font-weight:900;color:#1e3a5f">AARAY PACKAGING PRIVATE LIMITED</div><div style="font-size:10px;color:#666">Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#666;margin-bottom:4px">Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#444">www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>
                  <h1>Delivery Status Report</h1><h2>Period: ${dateRange} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}${filterDeliveryStatus !== "All" ? ` &nbsp;·&nbsp; Filter: ${filterDeliveryStatus}` : ""}</h2>
                  <div class="sum">
                    <div class="s"><div class="sv">${activeSOs.length}</div><div class="sl">Total SOs</div></div>
                    <div class="s"><div class="sv" style="color:#16a34a">${fullyDone}</div><div class="sl">Fully Dispatched</div></div>
                    <div class="s"><div class="sv" style="color:#d97706">${partial}</div><div class="sl">Partially Dispatched</div></div>
                    <div class="s"><div class="sv" style="color:#dc2626">${notStarted}</div><div class="sl">Not Dispatched</div></div>
                    <div class="s"><div class="sv" style="color:#dc2626">${fmt(totalPendingQty)}</div><div class="sl">Total Pending (pcs)</div></div>
                  </div>
                  <table><thead><tr><th>SO #</th><th>Client</th><th>Items</th><th class="right">Ordered</th><th class="right">Dispatched</th><th class="right">Pending</th><th>Last Dispatch Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
                  <div class="footer"><span>Generated on ${new Date().toLocaleDateString("en-IN")}</span><span>This is a computer generated document</span></div>`;
                const fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Delivery Status Report</title><style>" + css + "</style></head><body>" + html + "</body></html>";
                var blob = new Blob([fullHtml], { type: "text/html" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "Delivery_Status_" + today() + ".html";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
              }} style={{ marginLeft: "auto", background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
              <ExcelBtn onClick={() => {
                const rows = filtered.map(({ s, totalOrdered, totalDispatched, pending, pct, status, lastDispatchDate, allDispatchDates }) => ({
                  SO_No: s.soNo,
                  Client: s.clientName,
                  Order_Date: s.orderDate || "",
                  Items: (s.items || []).map(it => it.itemName).filter(Boolean).join(", "),
                  Ordered_Qty: totalOrdered,
                  Dispatched_Qty: totalDispatched,
                  Pending_Qty: pending,
                  Dispatch_Pct: pct + "%",
                  Last_Dispatch_Date: lastDispatchDate || "",
                  All_Dispatch_Dates: allDispatchDates || "",
                  Status: status,
                }));
                exportToExcel(rows, "Delivery_Status", "Delivery Status");
              }} />
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Active SOs",        val: activeSOs.length,   color: C.blue },
                { label: "Fully Dispatched",         val: fullyDone,          color: C.green },
                { label: "Partially Dispatched",     val: partial,            color: C.yellow },
                { label: "Not Dispatched",           val: notStarted,         color: C.red },
                { label: "Total Pending (pcs)",      val: fmt(totalPendingQty), color: C.red },
              ].map(s => (
                <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="🔍 Search SO# or client..." value={searchDel} onChange={e => setSearchDel(e.target.value)} style={{ maxWidth: 240, fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "Not Dispatched", "Partially Dispatched", "Fully Dispatched"].map(st => (
                  <button key={st} onClick={() => setFilterStatus(st)} style={{
                    padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: filterStatus === st ? (st === "All" ? C.accent : statusColor(st)) + "22" : "transparent",
                    border: `1px solid ${filterStatus === st ? (st === "All" ? C.accent : statusColor(st)) : C.border}`,
                    color: filterStatus === st ? (st === "All" ? C.accent : statusColor(st)) : C.muted,
                  }}>{st === "All" ? "All" : statusIcon(st) + " " + st}</button>
                ))}
              </div>
            </div>

            {}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 150px 1fr 90px 90px 80px 80px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {["SO #", "Client", "Items", "Ordered", "Dispatched", "Pending", "Status"].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No orders match the filter.</div>
              )}
              {filtered.map(({ s, totalOrdered, totalDispatched, pending, pct, status }) => {
                const col = statusColor(status);
                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "120px 150px 1fr 90px 90px 80px 80px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.green, fontSize: 12 }}>{s.soNo}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s.clientName}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{s.orderDate}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {(s.items || []).slice(0, 2).map(it => it.itemName).filter(Boolean).join(", ")}
                      {(s.items || []).length > 2 ? ` +${(s.items||[]).length - 2} more` : ""}
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{fmt(totalOrdered)}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.green }}>{fmt(totalDispatched)}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: pending > 0 ? C.red : C.green }}>{fmt(pending)}</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: col }}>{statusIcon(status)} {pct}%</div>
                      <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 3 }}>
                        <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: col, borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })()}

      {}
      {reportTab === "low_stock" && (() => {
        
        const lowRM = (rawStock || []).filter(r => r.reorderWeightKg && +(r.weight || 0) <= +r.reorderWeightKg);

        
        const fgItems = (itemMasterFG?.["Finished Goods"] || []);
        const fgStockMap = {};
        (fgStock || []).forEach(f => {
          const k = (f.itemName || f.product || "").trim();
          if (k) fgStockMap[k] = (fgStockMap[k] || 0) + +(f.qty || 0);
        });
        const lowFG = fgItems.filter(it => it.reorderQty && (fgStockMap[it.name] || 0) <= +it.reorderQty);
        const total = lowRM.length + lowFG.length;

        return (
          <div>
            {}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => {
                const rmRows = lowRM.map(r => {
                  const curr = +(r.weight || 0);
                  const level = +r.reorderWeightKg;
                  const deficit = Math.max(0, level - curr);
                  return `<tr>
                    <td style="font-weight:600">${r.name.split("|")[0].trim()}</td>
                    <td style="text-align:right;font-family:monospace;color:#dc2626;font-weight:700">${fmt(curr)} kg</td>
                    <td style="text-align:right;font-family:monospace">${fmt(level)} kg</td>
                    <td style="text-align:right;font-family:monospace;color:#dc2626;font-weight:700">−${fmt(deficit)} kg</td>
                    <td style="text-align:right">${r.rate ? `₹${fmt(+r.rate)}/kg` : "—"}</td>
                  </tr>`;
                }).join("");
                const fgRows = lowFG.map(it => {
                  const curr = fgStockMap[it.name] || 0;
                  const level = +it.reorderQty;
                  const deficit = Math.max(0, level - curr);
                  return `<tr>
                    <td style="font-family:monospace;color:#7c3aed;font-weight:700">${it.code || "—"}</td>
                    <td><div style="font-weight:600">${it.name}</div>${it.category ? `<div style="font-size:10px;color:#888">${it.category}</div>` : ""}</td>
                    <td style="text-align:right;font-family:monospace;color:#d97706;font-weight:700">${fmt(curr)} pcs</td>
                    <td style="text-align:right;font-family:monospace">${fmt(level)} pcs</td>
                    <td style="text-align:right;font-family:monospace;color:#d97706;font-weight:700">−${fmt(deficit)} pcs</td>
                  </tr>`;
                }).join("");
                const css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}h2{font-size:13px;color:#555;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #eee}p{font-size:12px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ddd}th.right{text-align:right}td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}.sum{display:flex;gap:20px;margin:16px 0;padding:14px;background:#f8f8f8;border-radius:6px}.s{text-align:center;min-width:100px}.sv{font-size:18px;font-weight:800;font-family:monospace}.sl{font-size:10px;color:#888;text-transform:uppercase;margin-top:2px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}.ok{text-align:center;padding:30px;background:#f0fdf4;border-radius:8px;color:#16a34a;font-weight:600}";
                const rmSection = lowRM.length > 0
                  ? `<h2>🧱 Raw Material — ${lowRM.length} item${lowRM.length !== 1 ? "s" : ""} below reorder level</h2>
                     <table><thead><tr><th>Material</th><th class="right">Current (kg)</th><th class="right">Reorder Level</th><th class="right">Deficit</th><th class="right">Rate</th></tr></thead><tbody>${rmRows}</tbody></table>`
                  : `<h2>🧱 Raw Material</h2><div class="ok">✅ All RM levels are adequate</div>`;
                const fgSection = lowFG.length > 0
                  ? `<h2>📦 Finished Goods — ${lowFG.length} item${lowFG.length !== 1 ? "s" : ""} below reorder level</h2>
                     <table><thead><tr><th>Code</th><th>Item Name</th><th class="right">Current (pcs)</th><th class="right">Reorder Level</th><th class="right">Deficit</th></tr></thead><tbody>${fgRows}</tbody></table>`
                  : `<h2>📦 Finished Goods</h2><div class="ok">✅ All FG levels are adequate</div>`;
                const html = `<div style="border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center"><div style="font-size:20px;font-weight:900;color:#1e3a5f">AARAY PACKAGING PRIVATE LIMITED</div><div style="font-size:10px;color:#666">Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#666;margin-bottom:4px">Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style="font-size:10px;color:#444">www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>
                  <h1>Low Stock Alert Report</h1>
                  <p>Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",weekday:"long"})}</p>
                  <div class="sum">
                    <div class="s"><div class="sv" style="color:${total > 0 ? "#dc2626" : "#16a34a"}">${total}</div><div class="sl">Total Alerts</div></div>
                    <div class="s"><div class="sv" style="color:#dc2626">${lowRM.length}</div><div class="sl">RM Items Low</div></div>
                    <div class="s"><div class="sv" style="color:#d97706">${lowFG.length}</div><div class="sl">FG Items Low</div></div>
                  </div>
                  ${rmSection}${fgSection}
                  <div class="footer"><span>Generated on ${new Date().toLocaleDateString("en-IN")}</span><span>This is a computer generated document</span></div>`;
                const fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Low Stock Alert</title><style>" + css + "</style></head><body>" + html + "</body></html>";
                var blob = new Blob([fullHtml], { type: "text/html" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "Low_Stock_Alert_" + today() + ".html";
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
              }} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
              <ExcelBtn onClick={() => {
                const wb = XLSX.utils.book_new();
                const rmSheet = XLSX.utils.json_to_sheet(lowRM.map(r => ({
                  Material: r.name.split("|")[0].trim(),
                  Current_Stock_Kg: +(r.weight || 0),
                  Reorder_Level_Kg: +r.reorderWeightKg,
                  Deficit_Kg: Math.max(0, +r.reorderWeightKg - +(r.weight || 0)),
                  Rate_Per_Kg: r.rate || "",
                })));
                XLSX.utils.book_append_sheet(wb, rmSheet, "RM Low Stock");
                const fgSheet = XLSX.utils.json_to_sheet(lowFG.map(it => ({
                  Code: it.code || "",
                  Item_Name: it.name,
                  Category: it.category || "",
                  Current_Stock_Pcs: fgStockMap[it.name] || 0,
                  Reorder_Level_Pcs: +it.reorderQty,
                  Deficit_Pcs: Math.max(0, +it.reorderQty - (fgStockMap[it.name] || 0)),
                })));
                XLSX.utils.book_append_sheet(wb, fgSheet, "FG Low Stock");
                xlsxDownload(wb, "Low_Stock_Alert_" + today() + ".xlsx");
              }} />
            </div>

            {}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Alerts", val: total, color: total > 0 ? C.red : C.green },
                { label: "RM Items Low", val: lowRM.length, color: C.red },
                { label: "FG Items Low", val: lowFG.length, color: C.yellow },
              ].map(s => (
                <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {total === 0 ? (
              <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>All stock levels are above reorder thresholds</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Set reorder levels in RM Stock and FG Stock by clicking Edit on any item</div>
              </Card>
            ) : (<>
              {}
              {lowRM.length > 0 && (
                <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: C.red + "18", borderBottom: `1px solid ${C.red}33`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🧱</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.red }}>Raw Material — {lowRM.length} item{lowRM.length !== 1 ? "s" : ""} low</span>
                    <button onClick={() => onNavigate("rawstock")} style={{ marginLeft: "auto", background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Go to RM Stock →</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 120px 120px 100px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                    {["Material", "Current (kg)", "Reorder Level", "Deficit", "Rate"].map(h => (
                      <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                    ))}
                  </div>
                  {lowRM.map(r => {
                    const curr = +(r.weight || 0);
                    const level = +r.reorderWeightKg;
                    const deficit = Math.max(0, level - curr);
                    return (
                      <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 120px 120px 100px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name.split("|")[0].trim()}</div>
                          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</div>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.red, fontSize: 13 }}>{fmt(curr)} kg</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.muted, fontSize: 13 }}>{fmt(level)} kg</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.red, fontSize: 13 }}>−{fmt(deficit)} kg</span>
                        <span style={{ fontSize: 12, color: C.muted }}>{r.rate ? `₹${fmt(+r.rate)}/kg` : "—"}</span>
                      </div>
                    );
                  })}
                </Card>
              )}

              {}
              {lowFG.length > 0 && (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: C.yellow + "18", borderBottom: `1px solid ${C.yellow}33`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📦</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.yellow }}>Finished Goods — {lowFG.length} item{lowFG.length !== 1 ? "s" : ""} low</span>
                    <button onClick={() => onNavigate("fg")} style={{ marginLeft: "auto", background: C.yellow + "22", color: C.yellow, border: `1px solid ${C.yellow}44`, borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Go to FG Stock →</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 120px 120px 120px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                    {["Code", "Item Name", "Current (pcs)", "Reorder Level", "Deficit"].map(h => (
                      <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                    ))}
                  </div>
                  {lowFG.map(it => {
                    const curr = fgStockMap[it.name] || 0;
                    const level = +it.reorderQty;
                    const deficit = Math.max(0, level - curr);
                    return (
                      <div key={it.id} style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 120px 120px 120px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.purple, fontSize: 12 }}>{it.code || "—"}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                          {it.category && <div style={{ fontSize: 10, color: C.muted }}>{it.category}</div>}
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.yellow, fontSize: 13 }}>{fmt(curr)} pcs</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.muted, fontSize: 13 }}>{fmt(level)} pcs</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.yellow, fontSize: 13 }}>−{fmt(deficit)} pcs</span>
                      </div>
                    );
                  })}
                </Card>
              )}
            </>)}
          </div>
        );
      })()}

      {}
      {reportTab === "monthly" && (() => {
        
        const months = {};
        jobOrders.forEach(jo => {
          (jo.stageHistory || []).forEach(e => {
            if (!e.date) return;
            const month = e.date.slice(0, 7); 
            if (!months[month]) months[month] = { completed: 0, rejected: 0, jobs: new Set(), processes: {}, machines: {} };
            months[month].completed += +(e.qtyCompleted || 0);
            months[month].rejected  += +(e.qtyRejected  || 0);
            months[month].jobs.add(jo.joNo);
            if (!months[month].processes[e.stage]) months[month].processes[e.stage] = { completed: 0, rejected: 0 };
            months[month].processes[e.stage].completed += +(e.qtyCompleted || 0);
            months[month].processes[e.stage].rejected  += +(e.qtyRejected  || 0);
          });
        });

        
        jobOrders.forEach(jo => {
          if (jo.status !== "Completed" || !jo.jobcardDate) return;
          const month = jo.jobcardDate.slice(0, 7);
          if (months[month]) months[month].jobsCompleted = (months[month].jobsCompleted || 0) + 1;
        });

        const sortedMonths = Object.keys(months).sort().reverse();

        
        const selMonth = (dateFrom || today()).slice(0, 7);
        const mData = months[selMonth];

        const monthLabel = (ym) => {
          const [y, m] = ym.split("-");
          return new Date(+y, +m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
        };

        const exportPDF = () => {
          if (!mData) return;
          const procRows = Object.entries(mData.processes).map(([proc, s]) => {
            const total = s.completed + s.rejected;
            const yld = total > 0 ? Math.round(s.completed / total * 100) : 100;
            return `<tr><td>${proc}</td><td style="text-align:right">${s.completed.toLocaleString("en-IN")}</td><td style="text-align:right;color:#e53e3e">${s.rejected.toLocaleString("en-IN")}</td><td style="text-align:right;font-weight:800;color:${yld>=95?"#16a34a":yld>=85?"#d97706":"#dc2626"}">${yld}%</td></tr>`;
          }).join("");

          var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}h2{font-size:14px;color:#555;margin:18px 0 8px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #ddd}th.r{text-align:right}td{padding:6px 10px;border-bottom:1px solid #eee}.summary{display:flex;gap:20px;margin:14px 0;padding:12px 16px;background:#f8f8f8;border-radius:6px;border:1px solid #e0e0e0}.stat{text-align:center}.stat-val{font-size:20px;font-weight:800;font-family:monospace}.stat-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:2px}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}@media print{body{margin:15px}}";

          const total = mData.completed + mData.rejected;
          const yld = total > 0 ? Math.round(mData.completed / total * 100) : 100;

          var html = "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center'><div style='font-size:20px;font-weight:900;color:#1e3a5f;margin-bottom:3px'>AARAY PACKAGING PRIVATE LIMITED</div><div style='font-size:10px;color:#666;margin-bottom:1px'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style='font-size:10px;color:#666;margin-bottom:4px'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style='font-size:10px;color:#444'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>" +
            "<h1>Monthly Production Summary</h1><div style='color:#666;font-size:12px;margin-bottom:16px'>" + monthLabel(selMonth) + "</div>" +
            "<div class='summary'><div class='stat'><div class='stat-val'>" + mData.completed.toLocaleString("en-IN") + "</div><div class='stat-lbl'>Total Produced</div></div>" +
            "<div class='stat'><div class='stat-val' style='color:#e53e3e'>" + mData.rejected.toLocaleString("en-IN") + "</div><div class='stat-lbl'>Total Rejected</div></div>" +
            "<div class='stat'><div class='stat-val'>" + mData.jobs.size + "</div><div class='stat-lbl'>Active JOs</div></div>" +
            "<div class='stat'><div class='stat-val' style='color:" + (yld>=95?"#16a34a":yld>=85?"#d97706":"#dc2626") + "'>" + yld + "%</div><div class='stat-lbl'>Overall Yield</div></div></div>" +
            "<h2>By Process</h2><table><thead><tr><th>Process</th><th class='r'>Produced</th><th class='r'>Rejected</th><th class='r'>Yield</th></tr></thead><tbody>" + procRows + "</tbody></table>" +
            "<div class='footer'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";

          var fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Monthly Summary — " + monthLabel(selMonth) + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
          var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "Monthly_Summary_" + selMonth + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        };

        return (
          <div>
            {}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Select Month</label>
                <select value={selMonth} onChange={e => setDateFrom(e.target.value + "-01")} style={{ fontSize: 13 }}>
                  {sortedMonths.length === 0
                    ? <option value={selMonth}>{monthLabel(selMonth)}</option>
                    : sortedMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)
                  }
                </select>
              </div>
              {mData && (
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button onClick={exportPDF} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "9px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
                  <ExcelBtn onClick={() => {
                    const wb = XLSX.utils.book_new();
                    const procSheet = XLSX.utils.json_to_sheet(Object.entries(mData.processes).map(([proc, s]) => {
                      const total = s.completed + s.rejected;
                      const yld = total > 0 ? Math.round(s.completed / total * 100) : 100;
                      return { Process: proc, Produced: s.completed, Rejected: s.rejected, Total: total, Yield_Pct: yld + "%" };
                    }));
                    XLSX.utils.book_append_sheet(wb, procSheet, "By Process");
                    const joSheet = XLSX.utils.json_to_sheet([...mData.jobs].map(joNo => {
                      const jo = jobOrders.find(j => j.joNo === joNo);
                      if (!jo) return { JO_No: joNo };
                      return { JO_No: jo.joNo, Item: jo.itemName || "—", Client: jo.clientName || "—", Order_Qty: +(jo.orderQty || 0), Status: jo.status };
                    }));
                    XLSX.utils.book_append_sheet(wb, joSheet, "Job Orders");
                    const summarySheet = XLSX.utils.json_to_sheet([{
                      Month: monthLabel(selMonth),
                      Total_Produced: mData.completed,
                      Total_Rejected: mData.rejected,
                      Active_JOs: mData.jobs.size,
                      Overall_Yield_Pct: (() => { const t = mData.completed + mData.rejected; return t > 0 ? Math.round(mData.completed/t*100) + "%" : "—"; })(),
                    }]);
                    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
                    xlsxDownload(wb, "Monthly_Summary_" + selMonth + ".xlsx");
                  }} />
                </div>
              )}
            </div>

            {!mData ? (
              <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No production data for {monthLabel(selMonth)}</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Log production entries in the Production module to see monthly summaries</div>
              </Card>
            ) : (<>
              {}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
                {(() => {
                  const t = mData.completed + mData.rejected;
                  const yld = t > 0 ? Math.round(mData.completed / t * 100) : 100;
                  const yldCol = yld >= 95 ? C.green : yld >= 85 ? C.yellow : C.red;
                  return [
                    { label: "Total Produced", val: fmt(mData.completed), color: C.green },
                    { label: "Total Rejected", val: fmt(mData.rejected),  color: C.red },
                    { label: "Active JOs",     val: mData.jobs.size,       color: C.blue },
                    { label: "Overall Yield",  val: t > 0 ? yld + "%" : "—", color: yldCol },
                  ].map(s => (
                    <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                    </Card>
                  ));
                })()}
              </div>

              {}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Production by Process</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {Object.entries(mData.processes).map(([proc, s]) => {
                    const total = s.completed + s.rejected;
                    const yld = total > 0 ? Math.round(s.completed / total * 100) : 100;
                    const col = yld >= 95 ? C.green : yld >= 85 ? C.yellow : C.red;
                    return (
                      <div key={proc} style={{ background: C.bg, border: `1px solid ${col}44`, borderLeft: `3px solid ${col}`, borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{proc}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: col }}>{yld}%</span>
                        </div>
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.muted }}>
                          <span>✅ {fmt(s.completed)}</span>
                          <span style={{ color: C.red }}>❌ {fmt(s.rejected)}</span>
                        </div>
                        <div style={{ marginTop: 8, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: yld + "%", background: col, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {}
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
                  Job Orders Active in {monthLabel(selMonth)}
                </div>
                {[...mData.jobs].map(joNo => {
                  const jo = jobOrders.find(j => j.joNo === joNo);
                  if (!jo) return null;
                  const produced = Object.values(jo.stageQtyMap || {}).reduce((s, v) => Math.max(s, +v), 0);
                  return (
                    <div key={joNo} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.yellow, fontSize: 13, minWidth: 110 }}>{jo.joNo}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{jo.itemName || "—"}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>{jo.clientName || "—"}</span>
                      <Badge label={jo.status} color={jo.status === "Completed" ? C.green : C.yellow} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.blue }}>Ordered: {fmt(+(jo.orderQty||0))}</span>
                    </div>
                  );
                })}
              </Card>
            </>)}
          </div>
        );
      })()}

      {}
      {reportTab === "vendor" && (() => {
        
        const vendorMap = {};

        (purchaseOrders || []).forEach(po => {
          if (!po.vendorName) return;
          const v = po.vendorName.trim();
          if (!vendorMap[v]) vendorMap[v] = { name: v, pos: [], grns: [], orderedKg: 0, receivedKg: 0, totalPOs: 0, onTimePOs: 0, latePOs: 0, pendingPOs: 0 };
          vendorMap[v].pos.push(po);
          vendorMap[v].totalPOs++;
          const ordKg = (po.items || []).reduce((s, it) => s + +(it.weight || 0), 0);
          vendorMap[v].orderedKg += ordKg;
        });

        (inward || []).forEach(grn => {
          const v = (grn.vendorName || "").trim();
          if (!v) return;
          if (!vendorMap[v]) vendorMap[v] = { name: v, pos: [], grns: [], orderedKg: 0, receivedKg: 0, totalPOs: 0, onTimePOs: 0, latePOs: 0, pendingPOs: 0 };
          vendorMap[v].grns.push(grn);
          const recKg = (grn.items || []).reduce((s, it) => s + +(it.weight || 0), 0);
          vendorMap[v].receivedKg += recKg;

          
          if (grn.poRef) {
            const po = (purchaseOrders || []).find(p => p.poNo === grn.poRef);
            if (po && po.deliveryDate && grn.grnDate) {
              if (grn.grnDate <= po.deliveryDate) vendorMap[v].onTimePOs++;
              else vendorMap[v].latePOs++;
            }
          }
        });

        
        (purchaseOrders || []).forEach(po => {
          const v = (po.vendorName || "").trim();
          if (!v || !vendorMap[v]) return;
          if (po.status === "Open" || po.status === "Partial") vendorMap[v].pendingPOs++;
        });

        const vendors = Object.values(vendorMap).sort((a, b) => b.totalPOs - a.totalPOs);

        const exportPDF = () => {
          const rows = vendors.map(v => {
            const delivered = v.onTimePOs + v.latePOs;
            const onTimePct = delivered > 0 ? Math.round(v.onTimePOs / delivered * 100) : null;
            const pendingKg = Math.max(0, v.orderedKg - v.receivedKg);
            return `<tr>
              <td style="font-weight:700">${v.name}</td>
              <td style="text-align:right">${v.totalPOs}</td>
              <td style="text-align:right">${v.grns.length}</td>
              <td style="text-align:right">${Math.round(v.orderedKg).toLocaleString("en-IN")} kg</td>
              <td style="text-align:right">${Math.round(v.receivedKg).toLocaleString("en-IN")} kg</td>
              <td style="text-align:right;color:#e53e3e">${Math.round(pendingKg).toLocaleString("en-IN")} kg</td>
              <td style="text-align:right;font-weight:800;color:${onTimePct===null?"#888":onTimePct>=90?"#16a34a":onTimePct>=70?"#d97706":"#dc2626"}">${onTimePct !== null ? onTimePct + "%" : "—"}</td>
              <td style="text-align:right">${v.pendingPOs}</td>
            </tr>`;
          }).join("");

          var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:30px}h1{font-size:20px;margin-bottom:4px;color:#1e3a5f}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #ddd}th.r{text-align:right}td{padding:6px 10px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#fafafa}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}@media print{body{margin:15px}}";
          var html = "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center'><div style='font-size:20px;font-weight:900;color:#1e3a5f;margin-bottom:3px'>AARAY PACKAGING PRIVATE LIMITED</div><div style='font-size:10px;color:#666;margin-bottom:1px'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style='font-size:10px;color:#666;margin-bottom:4px'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style='font-size:10px;color:#444'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>" +
            "<h1>Vendor Performance Report</h1><div style='color:#666;font-size:12px;margin-bottom:16px'>Generated: " + new Date().toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}) + "</div>" +
            "<table><thead><tr><th>Vendor</th><th class='r'>Total POs</th><th class='r'>GRNs</th><th class='r'>Ordered (kg)</th><th class='r'>Received (kg)</th><th class='r'>Pending (kg)</th><th class='r'>On-Time %</th><th class='r'>Open POs</th></tr></thead><tbody>" + rows + "</tbody></table>" +
            "<div class='footer'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";
          var fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Vendor Performance</title><style>" + css + "</style></head><body>" + html + "</body></html>";
          var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = r.grn + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        };

        return (
          <div>
            {}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8 }}>
              <DateFilter />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={exportPDF} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "9px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🖨 PDF</button>
                <ExcelBtn onClick={() => {
                  const rows = vendors.map(v => {
                    const delivered = v.onTimePOs + v.latePOs;
                    const onTimePct = delivered > 0 ? Math.round(v.onTimePOs / delivered * 100) : null;
                    const pendingKg = Math.max(0, v.orderedKg - v.receivedKg);
                    return {
                      Vendor: v.name,
                      Total_POs: v.totalPOs,
                      Total_GRNs: v.grns.length,
                      Ordered_Kg: Math.round(v.orderedKg),
                      Received_Kg: Math.round(v.receivedKg),
                      Pending_Kg: Math.round(pendingKg),
                      OnTime_Deliveries: v.onTimePOs,
                      Late_Deliveries: v.latePOs,
                      OnTime_Pct: onTimePct !== null ? onTimePct + "%" : "—",
                      Open_POs: v.pendingPOs,
                    };
                  });
                  exportToExcel(rows, "Vendor_Performance", "Vendor Performance");
                }} />
              </div>
            </div>

            {vendors.length === 0 ? (
              <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏭</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No vendor data yet</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Create Purchase Orders and record GRNs to see vendor performance</div>
              </Card>
            ) : (<>
              {}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total Vendors", val: vendors.length, color: C.blue },
                  { label: "Total POs", val: (purchaseOrders||[]).length, color: C.blue },
                  { label: "Total GRNs", val: (inward||[]).length, color: C.green },
                  { label: "Pending POs", val: (purchaseOrders||[]).filter(p => p.status==="Open"||p.status==="Partial").length, color: C.yellow },
                ].map(s => (
                  <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                  </Card>
                ))}
              </div>

              {}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 70px 70px 110px 110px 110px 90px 80px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                  {["Vendor", "POs", "GRNs", "Ord (kg)", "Rec (kg)", "Pending (kg)", "On-Time", "Open POs"].map(h => (
                    <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                  ))}
                </div>

                {vendors.map(v => {
                  const delivered = v.onTimePOs + v.latePOs;
                  const onTimePct = delivered > 0 ? Math.round(v.onTimePOs / delivered * 100) : null;
                  const pendingKg = Math.max(0, v.orderedKg - v.receivedKg);
                  const onTimeCol = onTimePct === null ? C.muted : onTimePct >= 90 ? C.green : onTimePct >= 70 ? C.yellow : C.red;

                  return (
                    <div key={v.name} style={{ display: "grid", gridTemplateColumns: "1.5fr 70px 70px 110px 110px 110px 90px 80px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{v.name}</div>
                        {delivered > 0 && <div style={{ fontSize: 10, color: C.muted }}>{v.onTimePOs} on-time · {v.latePOs} late</div>}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: C.blue }}>{v.totalPOs}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.green }}>{v.grns.length}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text }}>{fmt(Math.round(v.orderedKg))} kg</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.green }}>{fmt(Math.round(v.receivedKg))} kg</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: pendingKg > 0 ? 700 : 400, color: pendingKg > 0 ? C.red : C.muted }}>{pendingKg > 0 ? fmt(Math.round(pendingKg)) + " kg" : "—"}</span>
                      <div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 14, color: onTimeCol }}>
                          {onTimePct !== null ? onTimePct + "%" : "—"}
                        </span>
                        {delivered > 0 && (
                          <div style={{ height: 3, width: "100%", background: C.border, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: (onTimePct || 0) + "%", background: onTimeCol, borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: v.pendingPOs > 0 ? C.yellow : C.muted, fontWeight: v.pendingPOs > 0 ? 700 : 400 }}>
                        {v.pendingPOs > 0 ? v.pendingPOs : "—"}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </>)}
          </div>
        );
      })()}

    </div>
  );
}

function JODetailCard({ j, highlightProcess, age }) {
  const [expanded, setExpanded] = useState(false);
  const processes = j.process || [];
  const completed = j.completedProcesses || [];
  const pending = processes.filter(p => !completed.includes(p));

  return (
    <Card style={{ marginBottom: 10, borderLeft: `3px solid ${j.status === "Completed" ? C.green : C.yellow}` }}>
      {}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, fontWeight: 700, fontSize: 14 }}>{j.joNo}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{j.itemName || j.product || "—"}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{j.clientName || "—"}</span>
          {j.orderQty && <span style={{ fontSize: 11, color: C.muted }}>Qty: <strong style={{ color: C.text }}>{j.orderQty}</strong></span>}
          {j.deliveryDate && <span style={{ fontSize: 11, color: C.muted }}>Del: <strong style={{ color: C.text }}>{j.deliveryDate}</strong></span>}
          {age !== undefined && (() => {
            const ageCol = age > 7 ? C.red : age > 3 ? C.yellow : C.green;
            const ageLabel = age === 0 ? "Today" : age === 1 ? "1 day" : `${age} days`;
            return (
              <span style={{ fontSize: 10, fontWeight: 800, color: ageCol, background: ageCol + "22", borderRadius: 4, padding: "2px 8px", border: `1px solid ${ageCol}44` }}>
                ⏱ {ageLabel}
              </span>
            );
          })()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge
            label={j.status || "Open"}
            color={j.status === "Completed" ? C.green : j.status === "Dispatch Ready" ? C.purple : j.status === "Cancelled" ? C.red : C.yellow}
          />
          <span style={{ color: C.muted, fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {}
      {processes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {STAGES.filter(p => processes.includes(p)).map(p => {
            const isDone = completed.includes(p);
            const isHighlight = p === highlightProcess;
            const col = PROCESS_COLORS[p];
            return (
              <span key={p} style={{
                padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700,
                background: isDone ? col + "22" : isHighlight ? col + "33" : C.surface,
                color: isDone ? col : isHighlight ? col : C.muted,
                border: `1px solid ${isDone ? col + "55" : isHighlight ? col : C.border}`,
                textDecoration: isDone ? "line-through" : "none",
                outline: isHighlight ? `2px solid ${col}` : "none",
              }}>
                {isDone ? "✓ " : "⏳ "}{p}
              </span>
            );
          })}
        </div>
      )}

      {}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}33` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
            {[
              ["SO Ref", j.soRef || "—", C.green],
              ["Jobcard Date", j.jobcardDate || "—", C.muted],
              ["Printing", j.printing || "—", C.muted],
              ["Paper Type", j.paperType || "—", C.muted],
              ["Paper GSM", j.paperGsm ? j.paperGsm + " gsm" : "—", C.muted],
              ["No. of Sheets", j.noOfSheets || "—", C.blue],
              ["Sheet Size", j.sheetSize || "—", C.muted],
              ["Remarks", j.remarks || "—", C.muted],
            ].map(([label, val, col]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: col, fontFamily: label === "SO Ref" ? "'JetBrains Mono',monospace" : undefined }}>{val}</div>
              </div>
            ))}
          </div>

          {}
          {(j.stageHistory || []).length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Production Log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...(j.stageHistory || [])].reverse().map((entry, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: C.surface, borderRadius: 6, padding: "7px 12px" }}>
                    <Badge label={entry.stage} color={PROCESS_COLORS[entry.stage] || C.accent} />
                    <span style={{ fontSize: 12 }}>✓ <strong>{entry.qtyCompleted}</strong> done</span>
                    {+entry.qtyRejected > 0 && <span style={{ fontSize: 12, color: C.red }}>✕ {entry.qtyRejected} rejected</span>}
                    {entry.operator && <span style={{ fontSize: 11, color: C.muted }}>👤 {entry.operator}</span>}
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{entry.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}


const PAPER_TYPES_BY_ITEM = {
  "Paper Sheets": ["White PE Coated", "Kraft PE Coated", "SBS/FBB", "Whiteback", "Greyback", "Kraft Uncoated", "Art Paper", "Gumming Sheet"],
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
};
const RM_ITEMS = ["Paper Reel", "Paper Sheets"];
const LOCATIONS = ["Vijay Nagar", "Lal Kuan"];


function printGRN(r) {
  var itemRows = (r.items || []).map(function(it) {
    var qty = it.rmItem === "Paper Reel"
      ? (it.noOfReels ? it.noOfReels + " reels" : "—")
      : (it.noOfSheets ? Number(it.noOfSheets).toLocaleString("en-IN") + " sheets" : "—");
    return "<tr><td>" + (it.itemName || "") + "</td><td>" + (it.rmItem || "") + "</td><td>" +
      (it.paperType || "") + "</td><td>" + (it.gsm ? it.gsm + "gsm" : "—") + "</td><td>" +
      (it.widthMm || "") + (it.lengthMm ? "x" + it.lengthMm : "") + (it.widthMm ? "mm" : "—") + "</td><td>" +
      qty + "</td><td>" + (it.weight ? it.weight + " kg" : "—") + "</td><td>" +
      (it.rate ? "Rs " + it.rate + "/kg" : "—") + "</td><td style=\'font-weight:bold\'>" +
      (it.amount ? "Rs " + (+it.amount).toLocaleString("en-IN") : "—") + "</td></tr>";
  }).join("");
  var total = (r.items || []).reduce(function(s, it) { return s + (+(it.amount || 0)); }, 0);
  var html = "<div style=\'border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center\'><div style=\'font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px\'>AARAY PACKAGING PRIVATE LIMITED</div><div style=\'font-size:10px;color:#666;margin-bottom:1px\'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#666;margin-bottom:4px\'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#444\'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div><div class=\'header\'>" +
    "<div><h1>Goods Receipt Note</h1><h2>" + r.grn + "</h2></div>" +
    "<div style=\'text-align:right\'><div style=\'font-size:11px;color:#888\'>Date</div><div style=\'font-weight:bold;font-size:14px\'>" + (r.date || "") + "</div></div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Inward Details</div><div class=\'field-grid\'>" +
    "<div class=\'field\'><label>Vendor Name</label><span>" + (r.vendorName || "") + "</span></div>" +
    "<div class=\'field\'><label>Invoice Number</label><span>" + (r.invoiceNo || "") + "</span></div>" +
    "<div class=\'field\'><label>Vehicle Number</label><span>" + (r.vehicleNo || "—") + "</span></div>" +
    "<div class=\'field\'><label>PO Reference</label><span>" + (r.poRef || "—") + "</span></div>" +
    "<div class=\'field\'><label>Location</label><span>" + (r.location || "—") + "</span></div>" +
    "<div class=\'field\'><label>Received By</label><span>" + (r.receivedBy || "—") + "</span></div>" +
    "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Material Items</div>" +
    "<table><thead><tr><th>Item Name</th><th>Type</th><th>Paper Type</th><th>GSM</th><th>Size</th><th>Qty</th><th>Weight</th><th>Rate</th><th>Amount</th></tr></thead>" +
    "<tbody>" + itemRows + "</tbody></table>" +
    (total > 0 ? "<div class=\'total\'>Total Amount: Rs " + total.toLocaleString("en-IN") + "</div>" : "") + "</div>" +
    (r.remarks ? "<div class=\'section\'><div class=\'section-title\'>Remarks</div><p>" + r.remarks + "</p></div>" : "") +
    "<div class=\'footer\'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";
  var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px}" +
    "h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:16px}" +
    "table{width:100%;border-collapse:collapse;margin-top:12px}" +
    "th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd}" +
    "td{padding:6px 10px;border:1px solid #eee;font-size:12px}" +
    "tr:nth-child(even) td{background:#fafafa}" +
    ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}" +
    ".section{margin-top:16px}.section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}" +
    ".field-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}" +
    ".field label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;display:block;margin-bottom:2px}" +
    ".field span{font-size:13px;font-weight:500}.total{text-align:right;font-weight:bold;font-size:14px;margin-top:8px}" +
    ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
    "@media print{body{margin:10px}}";
  var fullHtml = "<!DOCTYPE html><html><head><title>" + r.grn + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
  var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = r.grn + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}


function MaterialInward({ rawStock, setRawStock, inward, setInward, itemMasterFG, setItemMasterFG, purchaseOrders, setPurchaseOrders, itemCounters, setItemCounters, grnCounter, setGrnCounter, categoryMaster, sizeMaster, vendorMaster, consumableStock, setConsumableStock, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditInward = canEdit("inward");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo,   setDrDateTo]   = useState("");
  const blankHeader = {
    date: today(), vendorName: "", invoiceNo: "", vehicleNo: "",
    location: "", receivedBy: "", remarks: "", poRef: ""
  };
  const blankItem = {
    materialType: "Raw Material", productCode: "", rmItem: "", paperType: "", widthMm: "", lengthMm: "", gsm: "",
    noOfSheets: "", noOfReels: "", weight: "", rate: "", amount: "", itemName: "", qty: "", unit: "nos", category: "", size: "", uom: "nos"
  };

  
  const paperTypesByItem = {
    "Paper Reel":   (sizeMaster && sizeMaster["Paper Reel"])  || PAPER_TYPES_BY_ITEM["Paper Reel"],
    "Paper Sheets": (sizeMaster && sizeMaster["Paper Sheet"]) || PAPER_TYPES_BY_ITEM["Paper Sheets"],
  };

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([{ ...blankItem, _id: uid() }]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");

  const setH = (k, v) => {
    setHeader(f => {
      const updated = { ...f, [k]: v };
      if (k === "poRef" && v) {
        const po = purchaseOrders.find(p => p.poNo === v);
        if (po) {
          updated.vendorName = po.vendorName || f.vendorName;
          
          const poItems = po.items || [];
          if (poItems.length > 0) {
            const newItems = poItems.map(pit => ({
              ...blankItem,
              _id: uid(),
              materialType: pit.materialType || "Raw Material",
              rmItem: pit.rmItem || "",
              paperType: pit.paperType || "",
              widthMm: pit.widthMm || "",
              lengthMm: pit.lengthMm || "",
              gsm: pit.gsm || "",
              noOfSheets: "",
              noOfReels: "",
              rate: pit.rate || "",
              itemName: pit.itemName || "",
              qty: "",
              unit: pit.unit || "nos",
            }));
            setItems(newItems);
            setItemErrors(newItems.map(() => ({})));
          }
        }
      }
      if (k === "poRef" && !v) {
        setItems([{ ...blankItem, _id: uid() }]);
        setItemErrors([{}]);
      }
      return updated;
    });
    setHeaderErrors(e => ({ ...e, [k]: false }));
  };
  const EH = (k) => headerErrors[k] ? { border: `1px solid ${C.red}` } : {};
  const EHMsg = (k) => headerErrors[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;


  const setItem = (idx, k, v) => {
    setItems(prev => {
      const updated = [...prev];
      const it = { ...updated[idx], [k]: v };
      
      if (k === "productCode" && v) {
        const masterItem = (itemMasterFG["Raw Material"] || []).find(x => (x.code || "").toLowerCase() === v.toLowerCase());
        if (masterItem) {
          
          const name = masterItem.name || "";
          if (name.includes("Paper Reel")) {
            it.rmItem = "Paper Reel";
            const gsmMatch = name.match(/(\d+)gsm/);
            const widthMatch = name.match(/(\d+)mm/);
            const paperTypes = ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"];
            const foundType = paperTypes.find(t => name.includes(t));
            if (gsmMatch) it.gsm = gsmMatch[1];
            if (widthMatch) it.widthMm = widthMatch[1];
            if (foundType) it.paperType = foundType;
          } else if (name.includes("Sheet")) {
            it.rmItem = "Paper Sheets";
            const gsmMatch = name.match(/(\d+)gsm/);
            const dimMatch = name.match(/(\d+)x(\d+)mm/);
            const widthMatch = name.match(/(\d+)mm/);
            const paperTypes = ["White PE Coated", "Kraft PE Coated", "Kraft Uncoated", "SBS/FBB", "Whiteback", "Greyback", "Art Paper", "Gumming Sheet"];
            const foundType = paperTypes.find(t => name.includes(t));
            if (gsmMatch) it.gsm = gsmMatch[1];
            if (dimMatch) { it.widthMm = dimMatch[1]; it.lengthMm = dimMatch[2]; }
            else if (widthMatch) it.widthMm = widthMatch[1];
            if (foundType) it.paperType = foundType;
          }
          it.itemName = masterItem.name;
        }
      }
      if (k === "materialType") { it.rmItem = ""; it.paperType = ""; it.itemName = ""; it.productCode = ""; it.widthMm = ""; it.lengthMm = ""; it.gsm = ""; it.noOfSheets = ""; it.noOfReels = ""; it.weight = ""; it.qty = ""; it.category = ""; it.size = ""; it.uom = "nos"; it.width = ""; it.length = ""; it.height = ""; }
      if (k === "rmItem") { it.paperType = ""; it.itemName = ""; it.productCode = ""; }
      const isRM = it.materialType === "Raw Material" || !it.materialType;
      it.itemName = isRM ? computeRMItemName(it) : computeConsumableItemName(it);
      const weight = k === "weight" ? +v : +(it.weight || 0);
      const qty    = k === "qty"    ? +v : +(it.qty    || 0);
      const rate   = k === "rate"   ? +v : +(it.rate   || 0);
      it.amount = isRM ? (weight && rate ? (weight * rate).toFixed(2) : "") : (qty && rate ? (qty * rate).toFixed(2) : "");
      updated[idx] = it;
      return updated;
    });
    setItemErrors(prev => { const e = [...prev]; e[idx] = { ...(e[idx] || {}), [k]: false }; return e; });
  };

  const addItem = () => {
    setItems(prev => [...prev, { ...blankItem, _id: uid() }]);
    setItemErrors(prev => [...prev, {}]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
    setItemErrors(prev => prev.filter((_, i) => i !== idx));
  };

  const EI = (idx, k) => (itemErrors[idx] || {})[k] ? { border: `1px solid ${C.red}` } : {};
  const EIMsg = (idx, k) => (itemErrors[idx] || {})[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;

  const submit = () => {
    
    const he = {};
    if (!header.date) he.date = true;
    if (!header.vendorName) he.vendorName = true;
    if (!header.invoiceNo) he.invoiceNo = true;
    if (!header.vehicleNo) he.vehicleNo = true;
    if (!header.location) he.location = true;
    if (!header.receivedBy) he.receivedBy = true;
    if (!header.remarks) he.remarks = true;
    setHeaderErrors(he);

    
    const allItemErrors = items.map(it => {
      const e = {};
      if (it.materialType === "Raw Material" || !it.materialType) {
        if (!it.rmItem) e.rmItem = true;
        if (!it.paperType) e.paperType = true;
        if (!it.widthMm) e.widthMm = true;
        if (it.rmItem !== "Paper Reel" && !it.lengthMm) e.lengthMm = true;
        if (!it.gsm) e.gsm = true;
        if (it.rmItem === "Paper Sheets" && !it.noOfSheets) e.noOfSheets = true;
        if (!it.weight) e.weight = true;
        if (!it.rate) e.rate = true;
      } else {
        if (!it.itemName) e.itemName = true;
        if (!it.qty) e.qty = true;
        if (!it.rate) e.rate = true;
      }
      return e;
    });
    setItemErrors(allItemErrors);

    if (Object.keys(he).length > 0 || allItemErrors.some(e => Object.keys(e).length > 0)) {
      const FIELD_LABELS = { date: "Date", vendorName: "Vendor Name", invoiceNo: "Invoice Number", vehicleNo: "Vehicle Number", location: "Location", receivedBy: "Received By", rmItem: "RM Item", paperType: "Paper Type", widthMm: "Width (mm)", lengthMm: "Length (mm)", gsm: "GSM", noOfSheets: "No. of Sheets", weight: "Weight (kg)", rate: "Rate", itemName: "Item Name", qty: "Quantity" };
      const msgs = [];
      Object.keys(he).forEach(k => msgs.push(FIELD_LABELS[k] || k));
      allItemErrors.forEach((e, idx) => Object.keys(e).forEach(k => msgs.push(`Item ${idx + 1}: ${FIELD_LABELS[k] || k}`)));
      toast([...new Set(msgs)], "validation");
      return;
    }

    
    if (header.poRef) {
      const linkedPO = purchaseOrders.find(p => p.poNo === header.poRef);
      if (linkedPO) {
        const rateWarnings = [];
        const qtyWarnings = [];

        
        const alreadyReceivedMap = {};
        (inward || []).filter(r => r.poRef === header.poRef).forEach(grn => {
          (grn.items || []).forEach(it => {
            const key = (it.itemName || "").toLowerCase().trim();
            if (!key) return;
            const isRM = !it.materialType || it.materialType === "Raw Material";
            const rcvQty = isRM ? +(it.weight || 0) : +(it.qty || 0);
            alreadyReceivedMap[key] = (alreadyReceivedMap[key] || 0) + rcvQty;
          });
        });

        items.forEach((it, idx) => {
          const isRM = !it.materialType || it.materialType === "Raw Material";
          const tolerance = isRM ? 1.20 : 1.10;
          const tolerancePct = isRM ? "120%" : "110%";

          
          const grnRate = +(it.rate || 0);
          if (grnRate && it.itemName) {
            const poItem = (linkedPO.items || []).find(pi =>
              (pi.itemName || "").toLowerCase() === (it.itemName || "").toLowerCase()
            );
            if (poItem) {
              const poRate = +(poItem.rate || 0);
              if (poRate > 0 && grnRate > poRate) {
                const unitLabel = it.unit || (it.rmItem === "Paper Reel" ? "kg" : it.noOfSheets ? "sheet" : "kg");
                rateWarnings.push(`Item ${idx + 1} (${it.itemName}): GRN rate ₹${grnRate}/${unitLabel} exceeds PO rate ₹${poRate}/${unitLabel}`);
              }

              
              const grnQty = isRM ? +(it.weight || 0) : +(it.qty || 0);
              const poQty  = isRM ? +(poItem.weight || 0) : +(poItem.qty || 0);
              if (poQty > 0 && grnQty > 0) {
                const alreadyRcv = alreadyReceivedMap[(it.itemName || "").toLowerCase().trim()] || 0;
                const totalAfter = alreadyRcv + grnQty;
                const maxAllowed = poQty * tolerance;
                if (totalAfter > maxAllowed) {
                  const unitLabel = isRM ? "kg" : (it.unit || "nos");
                  qtyWarnings.push(
                    `Item ${idx + 1} (${it.itemName}): Total received ${fmt(Math.round(totalAfter))} ${unitLabel} would exceed ${tolerancePct} of PO qty (${fmt(Math.round(poQty))} ${unitLabel} ordered, max ${fmt(Math.round(maxAllowed))} ${unitLabel})`
                  );
                }
              }
            }
          }
        });

        if (rateWarnings.length > 0) {
          toast(["Rate exceeds linked PO — cannot proceed:", ...rateWarnings], "validation");
          return;
        }
        if (qtyWarnings.length > 0) {
          toast(["Quantity exceeds allowed tolerance — cannot proceed:", ...qtyWarnings], "validation");
          return;
        }
      }
    }

    
    const dupGRN = inward.find(r =>
      r.vendorName.trim().toLowerCase() === header.vendorName.trim().toLowerCase() &&
      r.invoiceNo.trim().toLowerCase() === header.invoiceNo.trim().toLowerCase()
    );
    if (dupGRN) {
      toast("Duplicate entry: GRN " + dupGRN.grn + " already exists for this vendor & invoice number.", "error");
      return;
    }

    const grn = String(grnCounter);
    setGrnCounter(n => n + 1);
    const entry = { ...header, id: uid(), grn, items };
    setInward(p => [...p, entry]);

    
    
    let rmCounter = itemCounters.RM || 1;
    const newRMItems = [];

    items.forEach(it => {
      
      if (it.materialType && it.materialType !== "Raw Material") return;

      const stockKey = [it.rmItem, it.paperType, it.gsm + "gsm", it.widthMm + (it.lengthMm ? "x" + it.lengthMm : "") + "mm"].filter(Boolean).join(" | ");
      const addQty = it.noOfSheets ? +it.noOfSheets : it.noOfReels ? +it.noOfReels : 0;
      const unit = it.noOfSheets ? "sheets" : it.noOfReels ? "reels" : "kg";
      const addWeight = +it.weight || 0;
      
      const newWeightPerSheet = (it.rmItem === "Paper Sheets" && it.noOfSheets && it.weight)
        ? (+it.weight / +it.noOfSheets)
        : null;
      setRawStock(prev => {
        const idx = prev.findIndex(s => s.name === stockKey);
        
        const rmMaster = (itemMasterFG["Raw Material"] || []);
        const masterMatch = it.itemName
          ? rmMaster.find(x => x.name.toLowerCase() === it.itemName.toLowerCase())
          : null;
        const rmCode = masterMatch?.code || "";
        if (idx >= 0) {
          const existing = prev[idx];
          const totalSheets = (+(existing.qty || 0)) + addQty;
          const totalWeight = (+(existing.weight || 0)) + addWeight;
          const avgWeightPerSheet = (it.rmItem === "Paper Sheets" && totalSheets > 0)
            ? (totalWeight / totalSheets)
            : existing.weightPerSheet;
          const u = [...prev];
          const newRate = +(it.rate || 0);
          const updatedRate = newRate > 0 ? newRate : (existing.rate || 0);
          u[idx] = { ...existing, qty: existing.qty + addQty, weight: totalWeight, weightPerSheet: avgWeightPerSheet, rate: updatedRate, rmCode: existing.rmCode || rmCode };
          return u;
        }
        return [...prev, {
          id: "RM-" + uid(), name: stockKey, unit, qty: addQty,
          weight: addWeight, gsm: it.gsm, width: it.widthMm, length: it.lengthMm,
          weightPerSheet: newWeightPerSheet, rate: +(it.rate || 0), rmCode
        }];
      });
      if (it.itemName) {
        const existsAlready = (itemMasterFG["Raw Material"] || []).some(x => x.name.toLowerCase() === it.itemName.toLowerCase())
          || newRMItems.some(x => x.name.toLowerCase() === it.itemName.toLowerCase());
        if (!existsAlready) {
          const code = generateProductCode("Raw Material", { ...itemCounters, RM: rmCounter });
          rmCounter++;
          const newEntry = { id: uid(), code, name: it.itemName, addedOn: today(), source: "Material Inward" };
          newRMItems.push(newEntry);
          
          setRawStock(prev2 => prev2.map(s => s.name === stockKey && !s.rmCode ? { ...s, rmCode: code } : s));
        }
      }
    });

    if (newRMItems.length > 0) {
      setItemMasterFG(prev => ({
        ...prev,
        "Raw Material": [...(prev["Raw Material"] || []), ...newRMItems],
      }));
      setItemCounters(c => ({ ...c, RM: rmCounter }));
    }

    
    const consumableItems = items.filter(it => it.materialType && it.materialType !== "Raw Material");
    if (consumableItems.length > 0) {
      setConsumableStock(prev => {
        const updated = [...prev];
        consumableItems.forEach(it => {
          const itemName = computeConsumableItemName(it) || it.itemName || "";
          if (!itemName) return;
          const addQty = +(it.qty || 0);
          if (addQty <= 0) return;
          const idx = updated.findIndex(s => s.itemName === itemName && s.materialType === it.materialType);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], qty: (+(updated[idx].qty) || 0) + addQty, rate: it.rate || updated[idx].rate, lastInward: header.date, productCode: it.productCode || updated[idx].productCode || "" };
          } else {
            updated.push({
              id: uid(), itemName, materialType: it.materialType, category: it.category || "",
              size: it.size || "", uom: it.uom || "", unit: it.unit || "nos",
              qty: addQty, rate: it.rate || "", lastInward: header.date, productCode: it.productCode || "",
            });
          }
        });
        return updated;
      });
    }

    
    if (header.poRef) {
      const linkedPO = purchaseOrders.find(p => p.poNo === header.poRef);
      if (linkedPO) {
        
        const allGRNsForPO = [...inward.filter(r => r.poRef === header.poRef), { ...header, items }];

        
        const receivedMap = {};
        allGRNsForPO.forEach(r => (r.items || []).forEach(it => {
          const key = (it.itemName || "").toLowerCase().trim();
          if (!key) return;
          const isRM = !it.materialType || it.materialType === "Raw Material";
          const qty = isRM
            ? (it.rmItem === "Paper Reel" ? +(it.weight || 0) : +(it.noOfSheets || 0))
            : +(it.qty || 0);
          receivedMap[key] = (receivedMap[key] || 0) + qty;
        }));

        const poItems = linkedPO.items || [];
        let totalPOQty = 0;
        let totalReceivedQty = 0;

        poItems.forEach(pit => {
          const key = (pit.itemName || "").toLowerCase().trim();
          const isRM = !pit.materialType || pit.materialType === "Raw Material";
          const poQty = isRM
            ? (pit.rmItem === "Paper Reel" ? +(pit.weight || 0) : +(pit.noOfSheets || 0))
            : +(pit.qty || 0);
          const received = receivedMap[key] || 0;
          totalPOQty += poQty;
          totalReceivedQty += Math.min(received, poQty * 1.20); 
        });

        let newStatus;
        if (totalPOQty === 0 || totalReceivedQty === 0) {
          newStatus = totalReceivedQty === 0 ? "Open" : "Partial";
        } else if (totalReceivedQty >= totalPOQty * 0.90) {
          
          newStatus = "Received";
        } else {
          newStatus = "Partial";
        }

        setPurchaseOrders(prev => prev.map(p => p.poNo === header.poRef ? { ...p, status: newStatus } : p));
      }
    }


    toast("GRN recorded: " + grn + " (" + items.length + " item" + (items.length > 1 ? "s" : "") + ")");
    setHeader(blankHeader);
    setItems([{ ...blankItem, _id: uid() }]);
    setHeaderErrors({});
    setItemErrors([{}]);
  };

  
  const saveGRNEdit = (originalRecord, updatedData) => {
    const oldItems = originalRecord.items || [];
    const newItems = updatedData.items || [];
    const makeKey = (it) => [it.rmItem, it.paperType, it.gsm + "gsm", it.widthMm + (it.lengthMm ? "x" + it.lengthMm : "") + "mm"].filter(Boolean).join(" | ");

    setRawStock(prev => {
      let stock = prev.map(s => ({ ...s }));
      
      oldItems.forEach(it => {
        const key = makeKey(it);
        const idx = stock.findIndex(s => s.name === key);
        if (idx < 0) return;
        stock[idx] = { ...stock[idx],
          qty:    Math.max(0, (stock[idx].qty    || 0) - (it.noOfSheets ? +it.noOfSheets : it.noOfReels ? +it.noOfReels : 0)),
          weight: Math.max(0, (stock[idx].weight || 0) - +(it.weight || 0))
        };
      });
      
      newItems.forEach(it => {
        const key = makeKey(it);
        const addQty    = it.noOfSheets ? +it.noOfSheets : it.noOfReels ? +it.noOfReels : 0;
        const addWeight = +(it.weight || 0);
        const unit      = it.noOfSheets ? "sheets" : it.noOfReels ? "reels" : "kg";
        const newRate   = +(it.rate || 0);
        const idx = stock.findIndex(s => s.name === key);
        if (idx >= 0) {
          stock[idx] = { ...stock[idx], qty: (stock[idx].qty || 0) + addQty, weight: (stock[idx].weight || 0) + addWeight, ...(newRate > 0 ? { rate: newRate } : {}) };
        } else {
          stock.push({ id: "RM-" + uid(), name: key, unit, qty: addQty, weight: addWeight, gsm: it.gsm, width: it.widthMm, length: it.lengthMm, rate: newRate });
        }
      });
      return stock.filter(s => (s.qty || 0) > 0 || (s.weight || 0) > 0);
    });

    setInward(prev => prev.map(x => x.id === originalRecord.id ? { ...x, ...updatedData } : x));
    setEditId(null);
    toast("GRN updated — stock recalculated");
  };

  const divider = (label) => {
    return (
      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid " + C.border, paddingTop: 14, marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2 }}>{label}</span>
      </div>
    );
  };
  return (
    <div className="fade">
      <SectionTitle icon="🚚" title="Material Inward" sub="Record incoming paper / board material receipts" />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["form", "📝 New Entry"], ["records", `📋 Records (${inward.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, border: `1px solid ${view === v ? C.blue : C.border}`,
            background: view === v ? C.blue + "22" : "transparent", color: view === v ? C.blue : C.muted,
            fontWeight: 700, fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      {view === "form" && (
        <div>
          {}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 16 }}>Invoice Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              <Field label="Date *">
                <DatePicker value={header.date} onChange={v => setH("date", v)} style={EH("date")} />{EHMsg("date")}
              </Field>
              <Field label="PO Reference">
                <select value={header.poRef || ""} onChange={e => setH("poRef", e.target.value)}>
                  <option value="">-- Link to PO (optional) --</option>
                  {(purchaseOrders || []).filter(p => p.status !== "Received" && p.status !== "Cancelled").map(p => (
                    <option key={p.poNo} value={p.poNo}>{p.poNo} — {p.vendorName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Vendor Name *">
                <AutocompleteInput
                  value={header.vendorName}
                  onChange={v => setH("vendorName", v)}
                  suggestions={(vendorMaster || []).map(v => v.name)}
                  placeholder="Supplier / Vendor name"
                  inputStyle={EH("vendorName")}
                />
                {EHMsg("vendorName")}
              </Field>
              <Field label="Invoice Number *">
                <input placeholder="Invoice / DC number" value={header.invoiceNo} onChange={e => setH("invoiceNo", e.target.value)} style={EH("invoiceNo")} />{EHMsg("invoiceNo")}
              </Field>
              <Field label="Vehicle Number *">
                <input placeholder="e.g. DL01AB1234" value={header.vehicleNo} onChange={e => setH("vehicleNo", e.target.value)} style={EH("vehicleNo")} />{EHMsg("vehicleNo")}
              </Field>
              <Field label="Location / Store *">
                <select value={header.location} onChange={e => setH("location", e.target.value)} style={EH("location")}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                </select>
                {EHMsg("location")}
              </Field>
              <Field label="Received By *">
                <input placeholder="Staff name" value={header.receivedBy} onChange={e => setH("receivedBy", e.target.value)} style={EH("receivedBy")} />{EHMsg("receivedBy")}
              </Field>
              <Field label="Remarks *" span={2}>
                <input placeholder="Condition of material, special notes..." value={header.remarks} onChange={e => setH("remarks", e.target.value)} style={EH("remarks")} />{EHMsg("remarks")}
              </Field>
            </div>
          </Card>

          {}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>Material Items ({items.length})</h3>
            <button onClick={addItem} style={{
              background: C.accent, color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13
            }}>+ Add Item</button>
          </div>

          {items.map((it, idx) => (
            <Card key={it._id} style={{ marginBottom: 12, borderLeft: `3px solid ${C.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>Item {idx + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 5, padding: "4px 12px", fontWeight: 700, fontSize: 12 }}>✕ Remove</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>

                {}
                <Field label="Product Code">
                  <AutocompleteInput
                    value={it.productCode || ""}
                    onChange={v => setItem(idx, "productCode", v.includes(" — ") ? v.split(" — ")[0] : v)}
                    suggestions={(() => {
                      const type = it.materialType === "Consumable" ? "Consumable" : it.materialType === "Machine Spare" ? "Machine Spare" : it.materialType === "Other" ? "Other" : "Raw Material";
                      return (itemMasterFG[type] || []).filter(x => x.code).map(x => x.code + " — " + x.name);
                    })()}
                    placeholder="Type or select code (optional)"
                  />
                </Field>

                {}
                <Field label="Material Type *">
                  <select value={it.materialType || "Raw Material"} onChange={e => setItem(idx, "materialType", e.target.value)}>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Machine Spare">Machine Spare</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>

                {}
                {(it.materialType === "Raw Material" || !it.materialType) && (<>
                  <Field label="RM Item *">
                    <select value={it.rmItem} onChange={e => setItem(idx, "rmItem", e.target.value)} style={EI(idx, "rmItem")}>
                      <option value="">-- Select Item --</option>
                      {RM_ITEMS.map(i => <option key={i}>{i}</option>)}
                    </select>
                    {EIMsg(idx, "rmItem")}
                  </Field>
                  <Field label="Paper Type *">
                    <select value={it.paperType} onChange={e => setItem(idx, "paperType", e.target.value)} disabled={!it.rmItem} style={EI(idx, "paperType")}>
                      <option value="">{it.rmItem ? "-- Select Type --" : "-- Select RM Item first --"}</option>
                      {(paperTypesByItem[it.rmItem] || []).map(p => <option key={p}>{p}</option>)}
                    </select>
                    {EIMsg(idx, "paperType")}
                  </Field>
                  <Field label="Width (mm) *">
                    <input type="number" placeholder="e.g. 700" value={it.widthMm} onChange={e => setItem(idx, "widthMm", e.target.value)} style={EI(idx, "widthMm")} />
                    {EIMsg(idx, "widthMm")}
                  </Field>
                  {it.rmItem !== "Paper Reel" && (
                    <Field label="Length (mm) *">
                      <input type="number" placeholder="e.g. 1000" value={it.lengthMm} onChange={e => setItem(idx, "lengthMm", e.target.value)} style={EI(idx, "lengthMm")} />
                      {EIMsg(idx, "lengthMm")}
                    </Field>
                  )}
                  <Field label="GSM *">
                    <input type="number" placeholder="e.g. 90, 130, 250" value={it.gsm} onChange={e => setItem(idx, "gsm", e.target.value)} style={EI(idx, "gsm")} />
                    {EIMsg(idx, "gsm")}
                  </Field>
                  {it.rmItem === "Paper Sheets" && (
                    <Field label="No. of Sheets *">
                      <input type="number" placeholder="Qty in sheets" value={it.noOfSheets} onChange={e => setItem(idx, "noOfSheets", e.target.value)} style={EI(idx, "noOfSheets")} />
                      {EIMsg(idx, "noOfSheets")}
                    </Field>
                  )}
                  {it.rmItem === "Paper Reel" && (
                    <Field label="No. of Reels *">
                      <input type="number" placeholder="Qty in reels" value={it.noOfReels} onChange={e => setItem(idx, "noOfReels", e.target.value)} style={EI(idx, "noOfReels")} />
                      {EIMsg(idx, "noOfReels")}
                    </Field>
                  )}
                  <Field label="Weight (kg) *">
                    <input type="number" placeholder="Gross / net weight" value={it.weight} onChange={e => setItem(idx, "weight", e.target.value)} style={EI(idx, "weight")} />
                    {EIMsg(idx, "weight")}
                  </Field>
                  <Field label={`Rate (₹/${it.rmItem === "Paper Reel" ? "kg" : it.noOfSheets ? "sheet" : "kg"}) *`}>
                    <input type="number" placeholder="Rate per unit" value={it.rate || ""} onChange={e => setItem(idx, "rate", e.target.value)} style={EI(idx, "rate")} />
                    {EIMsg(idx, "rate")}
                  </Field>
                  <Field label="Amount (₹)">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, minHeight: 38, color: it.amount ? C.green : C.muted, fontWeight: it.amount ? 700 : 400, fontFamily: it.amount ? "'JetBrains Mono',monospace" : undefined }}>
                      {it.amount ? `₹${fmt(+it.amount)}` : "— Weight × Rate —"}
                    </div>
                  </Field>
                  <Field label="Item Name" span={2}>
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, minHeight: 38, color: it.itemName ? C.blue : C.muted, fontWeight: it.itemName ? 700 : 400, fontFamily: it.itemName ? "'JetBrains Mono',monospace" : undefined }}>
                      {it.itemName || "— Auto-filled from material details —"}
                    </div>
                  </Field>
                </>)}

                {}
                {it.materialType && it.materialType !== "Raw Material" && (<>
                  <Field label="Category">
                    {(() => {
                      const cats = (categoryMaster && categoryMaster[it.materialType]) || [];
                      return cats.length > 0 ? (
                        <select value={it.category || ""} onChange={e => setItem(idx, "category", e.target.value)}>
                          <option value="">-- Select Category --</option>
                          {cats.map(c => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input placeholder="Category (optional)" value={it.category || ""} onChange={e => setItem(idx, "category", e.target.value)} />
                      );
                    })()}
                  </Field>
                  <Field label="Item Name *">
                    <input placeholder="e.g. Tape, Bearing, Ink..." value={it.itemName || ""} onChange={e => setItem(idx, "itemName", e.target.value)} style={EI(idx, "itemName")} />
                    {EIMsg(idx, "itemName")}
                  </Field>
                  {it.materialType === "Consumable" && (<>
                    <Field label="Size">
                      <input placeholder="e.g. 2 inch, 50mm, A4..." value={it.size || ""} onChange={e => setItem(idx, "size", e.target.value)} />
                    </Field>
                    <Field label="UOM">
                      <select value={it.uom || "nos"} onChange={e => setItem(idx, "uom", e.target.value)}>
                        {["nos", "inch", "mm", "cm", "mtrs", "kg", "ltrs", "roll", "box", "set"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </Field>
                    {CONSUMABLE_BOX_CATS.includes(it.category) && (<>
                      <Field label="Width *"><input type="number" placeholder="e.g. 24" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} /></Field>
                      <Field label="Length *"><input type="number" placeholder="e.g. 18" value={it.length || ""} onChange={e => setItem(idx, "length", e.target.value)} /></Field>
                      <Field label="Height *"><input type="number" placeholder="e.g. 18" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} /></Field>
                    </>)}
                    {CONSUMABLE_BAG_CATS.includes(it.category) && (<>
                      <Field label="Width *"><input type="number" placeholder="e.g. 18" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} /></Field>
                      <Field label="Height *"><input type="number" placeholder="e.g. 24" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} /></Field>
                    </>)}
                    {(CONSUMABLE_BOX_CATS.includes(it.category) || CONSUMABLE_BAG_CATS.includes(it.category)) && (
                      <Field label="Item Name" span={2}>
                        <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: it.itemName ? C.green : C.muted, fontWeight: it.itemName ? 700 : 400, fontFamily: it.itemName ? "'JetBrains Mono',monospace" : undefined }}>
                          {it.itemName || "— Auto-filled from dimensions —"}
                        </div>
                      </Field>
                    )}
                  </>)}
                  <Field label="Quantity *">
                    <input type="number" placeholder="e.g. 10" value={it.qty || ""} onChange={e => setItem(idx, "qty", e.target.value)} style={EI(idx, "qty")} />
                    {EIMsg(idx, "qty")}
                  </Field>
                  <Field label="Unit">
                    <select value={it.unit || "nos"} onChange={e => setItem(idx, "unit", e.target.value)}>
                      {["nos", "kg", "ltrs", "mtrs", "box", "roll", "set", "pair"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                  <Field label={`Rate (₹/${it.unit || "unit"}) *`}>
                    <input type="number" placeholder="Rate per unit" value={it.rate || ""} onChange={e => setItem(idx, "rate", e.target.value)} style={EI(idx, "rate")} />
                    {EIMsg(idx, "rate")}
                  </Field>
                  <Field label="Amount (₹)">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, minHeight: 38, color: it.amount ? C.green : C.muted, fontWeight: it.amount ? 700 : 400, fontFamily: it.amount ? "'JetBrains Mono',monospace" : undefined }}>
                      {it.amount ? `₹${fmt(+it.amount)}` : "— Qty × Rate —"}
                    </div>
                  </Field>
                </>)}

              </div>
            </Card>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={addItem} style={{
              background: C.accent + "22", color: C.accent, border: `1px solid ${C.accent}44`,
              borderRadius: 6, padding: "9px 20px", fontWeight: 700, fontSize: 13
            }}>+ Add Another Item</button>
            <SubmitBtn label={`Submit GRN (${items.length} item${items.length > 1 ? "s" : ""})`} color={C.blue} onClick={submit} />
            {items.some(it => it.amount) && (
              <div style={{ marginLeft: "auto", padding: "9px 16px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Total Amount: </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.green, fontSize: 14 }}>
                  ₹{fmt(items.reduce((sum, it) => sum + (+(it.amount || 0)), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "records" && (
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, margin: 0 }}>GRN Records</h3>
            <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{inward.filter(r => (!drDateFrom || (r.date||"") >= drDateFrom) && (!drDateTo || (r.date||"") <= drDateTo)).length} of {inward.length} records</span>
          </div>
          {inward.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No inward records yet. Create your first entry.</div>}
          {inward.slice().reverse().filter(r => (!drDateFrom || (r.date||"") >= drDateFrom) && (!drDateTo || (r.date||"") <= drDateTo)).map(r => {
            const total = (r.items || []).reduce((s, it) => s + (+(it.amount || 0)), 0);
            const isEditing = editId === r.id;
            const setItem = (idx, k, v) => setEditData(p => ({ ...p, items: p.items.map((it, i) => {
              if (i !== idx) return it;
              const updated = { ...it, [k]: v };
              const weight = k === "weight" ? +v : +(updated.weight || 0);
              const rate   = k === "rate"   ? +v : +(updated.rate   || 0);
              updated.amount = weight && rate ? (weight * rate).toFixed(2) : updated.amount;
              return updated;
            }) }));
            const removeItem = (idx) => setEditData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
            const addItem = () => setEditData(p => ({ ...p, items: [...p.items, { _id: uid(), productCode: "", rmItem: "", paperType: "", widthMm: "", lengthMm: "", gsm: "", noOfSheets: "", noOfReels: "", weight: "", rate: "", amount: "", itemName: "" }] }));
            return (
              <div key={r.id} style={{ borderBottom: `1px solid ${C.border}22`, padding: "12px 4px" }}>
                {}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.blue, fontWeight: 700 }}>{r.grn}</span>
                    {isEditing ? (
                      <input value={editData.date || ""} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} style={{ width: 130, fontSize: 12 }} />
                    ) : <span style={{ fontSize: 12, color: C.muted }}>{r.date}</span>}
                    {isEditing ? (
                      <input value={editData.vendorName || ""} onChange={e => setEditData(p => ({ ...p, vendorName: e.target.value }))} placeholder="Vendor" style={{ width: 160, fontSize: 12 }} />
                    ) : <span style={{ fontSize: 13, fontWeight: 600 }}>{r.vendorName}</span>}
                    {isEditing ? (
                      <input value={editData.invoiceNo || ""} onChange={e => setEditData(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="Invoice#" style={{ width: 120, fontSize: 12 }} />
                    ) : <span style={{ fontSize: 12, color: C.muted }}>Inv: {r.invoiceNo}</span>}
                    {!isEditing && total > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.green, fontSize: 12, fontWeight: 700 }}>₹{fmt(total)}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveGRNEdit(r, editData)}
                          style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>✓ Save</button>
                        <button onClick={() => setEditId(null)}
                          style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 12px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        {canEditInward && (
                          <button onClick={() => { setEditId(r.id); setEditData({ date: r.date, vendorName: r.vendorName, invoiceNo: r.invoiceNo, vehicleNo: r.vehicleNo || "", location: r.location || "", receivedBy: r.receivedBy || "", remarks: r.remarks || "", items: (r.items || []).map(it => ({ ...it })) }); }}
                            style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 12px", fontWeight: 700, fontSize: 12 }}>✏️ Edit</button>
                        )}
                        {canEditInward && confirmDeleteId === r.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 10px" }}>
                            <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>Delete {r.grn}?</span>
                            <button onClick={() => {
                              setInward(prev => prev.filter(x => x.id !== r.id));
                              setConfirmDeleteId(null);
                              toast(`GRN ${r.grn} deleted`);
                            }} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Yes, Delete</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : canEditInward && (
                          <button onClick={() => setConfirmDeleteId(r.id)}
                            style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontWeight: 700, fontSize: 12 }}>🗑 Delete</button>
                        )}
                        <button onClick={() => printGRN(r)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 PDF</button>
                      </>
                    )}
                  </div>
                </div>
                {}
                {isEditing && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginTop: 10, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                    {[["vehicleNo","Vehicle No"],["location","Location"],["receivedBy","Received By"],["remarks","Remarks"]].map(([k, label]) => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</label>
                        <input value={editData[k] || ""} onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))} style={{ fontSize: 12 }} />
                      </div>
                    ))}
                  </div>
                )}
                {}
                {isEditing && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Items</div>
                    {(editData.items || []).map((it, idx) => (
                      <div key={it._id || idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 80px 80px 80px 80px 80px 80px 30px", gap: 6, padding: "8px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "end" }}>
                        {[["rmItem","Material"],["paperType","Paper Type"],["widthMm","Width mm"],["lengthMm","Length mm"],["gsm","GSM"],["noOfSheets","Sheets"],["weight","Weight kg"],["rate","Rate ₹"],["amount","Amount ₹"]].map(([k, label]) => (
                          <div key={k}>
                            <label style={{ display: "block", fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</label>
                            <input value={it[k] || ""} onChange={e => setItem(idx, k, e.target.value)} style={{ fontSize: 11, padding: "5px 7px" }} />
                          </div>
                        ))}
                        <button onClick={() => removeItem(idx)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "5px 0", fontWeight: 700, fontSize: 13, alignSelf: "end", marginBottom: 0 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={addItem} style={{ marginTop: 8, background: C.accent + "22", color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>+ Add Item</button>
                  </div>
                )}
                {}
                {!isEditing && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {(r.items || []).map((it, i) => (
                      <span key={i} style={{ fontSize: 11, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px", color: C.muted }}>
                        {it.rmItem || it.productCode} {it.weight ? `· ${it.weight}kg` : ""} {it.noOfSheets ? `· ${it.noOfSheets} sheets` : ""}
                      </span>
                    ))}
                    {r.poRef && <Badge label={r.poRef} color={C.blue} />}
                    {r.vehicleNo && <span style={{ fontSize: 11, color: C.muted }}>{r.vehicleNo}</span>}
                    {r.location && <span style={{ fontSize: 11, color: C.muted }}>📍 {r.location}</span>}
                    {r.receivedBy && <span style={{ fontSize: 11, color: C.muted }}>👤 {r.receivedBy}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}


const SO_SALESPERSONS = ["Ankit", "Direct Order"];
const SO_CLIENT_CATEGORIES = ["HP", "ZPL", "Others"];
const FG_SEED_CATEGORIES = ["Paper Dip Bowl", "Paper Dip Bowl Lid", "Paper Cup", "Paper Cup Lid", "Paper Soup Bowl", "Paper Soup Bowl Lid", "Paper Flat Bowl", "Paper Flat Bowl Lid", "Paper Salad Box", "Paper Burger Box", "Paper Boat Tray", "Wrapping Paper", "Cake Box", "Pastry Box", "Paper Bag with Handle", "Paper Bag without Handle", "Paper Bag Manual", "Insert", "Sleeve", "Sticker"];

const ITEM_TYPE_GROUPS = ["Raw Material", "Consumable", "Finished Goods", "Machine Spare"];

const SEED_CATEGORY_MASTER = {
  "Raw Material": ["Paper Reel", "Paper Sheet"],
  "Consumable": ["Tape", "Corrugated Box", "LDPE Polybag", "Glue"],
  "Finished Goods": FG_SEED_CATEGORIES,
  "Machine Spare": [],
};

const SEED_SIZE_MASTER = {
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
  "Paper Sheet": ["White PE Coated", "Kraft PE Coated", "Kraft Uncoated", "SBS/FBB", "Whiteback", "Greyback", "Art Paper", "Gumming Sheet"],
  "Tape": [],
  "Corrugated Box": [],
  "LDPE Polybag": [],
  "Glue": [],
  "Paper Dip Bowl": ["40ml", "100ml", "125ml", "180ml"],
  "Paper Dip Bowl Lid": ["62mm", "76mm", "90mm"],
  "Paper Cup": ["240ml", "360ml", "480ml"],
  "Paper Cup Lid": ["80mm", "90mm"],
  "Paper Soup Bowl": ["250ml", "350ml", "400ml", "500ml", "650ml", "750ml", "1000ml"],
  "Paper Soup Bowl Lid": ["110mm"],
  "Paper Flat Bowl": ["500ml", "750ml", "1000ml", "1000ml 184mm"],
  "Paper Flat Bowl Lid": ["150mm"],
  "Paper Salad Box": ["450ml", "700ml", "900ml", "1200ml", "1600ml"],
  "Paper Burger Box": [],
  "Paper Boat Tray": ["450ml", "700ml", "900ml", "1200ml", "1600ml"],
  "Wrapping Paper": [],
  "Cake Box": [],
  "Pastry Box": [],
  "Paper Bag with Handle": ["9x6x7inch 100gsm", "12x7x8inch 100gsm"],
  "Paper Bag without Handle": ["18x12x27cm 60gsm", "18x12x27cm 80gsm", "21x12x33cm 60gsm", "21x12x33cm 80gsm"],
  "Paper Bag Manual": [],
  "Insert": [],
  "Sleeve": [],
  "Sticker": [],
};


function SizeMaster({ sizeMaster, setSizeMaster, categoryMaster, setCategoryMaster, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditSizemaster = canEdit("sizemaster");
  const [selType, setSelType] = useState("Raw Material");
  const [selCat, setSelCat] = useState("Paper Reel");
  const [newSize, setNewSize] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const categories = categoryMaster[selType] || [];
  const sizes = sizeMaster[selCat] || [];
  const isWrappingPaper = selCat === "Wrapping Paper";

  
  const STRUCTURED_CONFIGS = {
    "Wrapping Paper": {
      fields: [{ key: "width", label: "Width" }, { key: "length", label: "Length" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.width}x${f.length}${uom} ${f.gsm}gsm`,
    },
    "Paper Burger Box": {
      fields: [{ key: "topWidth", label: "Top Width" }, { key: "topLength", label: "Top Length" }],
      format: (f, uom) => `${f.topWidth}x${f.topLength}${uom}`,
    },
    "Cake Box": {
      fields: [{ key: "width", label: "Width" }, { key: "length", label: "Length" }, { key: "height", label: "Height" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.width}x${f.length}x${f.height}${uom} ${f.gsm}gsm`,
    },
    "Pastry Box": {
      fields: [{ key: "width", label: "Width" }, { key: "length", label: "Length" }, { key: "height", label: "Height" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.width}x${f.length}x${f.height}${uom} ${f.gsm}gsm`,
    },
    "Paper Bag with Handle": {
      fields: [{ key: "bagWidth", label: "Bag Width" }, { key: "bagLength", label: "Bag Length" }, { key: "bagHeight", label: "Bag Height" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.bagWidth}x${f.bagLength}x${f.bagHeight}${uom} ${f.gsm}gsm`,
    },
    "Paper Bag without Handle": {
      fields: [{ key: "bagWidth", label: "Bag Width" }, { key: "bagLength", label: "Bag Length" }, { key: "bagHeight", label: "Bag Height" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.bagWidth}x${f.bagLength}x${f.bagHeight}${uom} ${f.gsm}gsm`,
    },
    "Paper Bag Manual": {
      fields: [{ key: "bagWidth", label: "Bag Width" }, { key: "bagLength", label: "Bag Length" }, { key: "bagHeight", label: "Bag Height" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.bagWidth}x${f.bagLength}x${f.bagHeight}${uom} ${f.gsm}gsm`,
    },
    "Insert": {
      fields: [{ key: "width", label: "Width" }, { key: "length", label: "Length" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.width}x${f.length}${uom} ${f.gsm}gsm`,
    },
    "Sleeve": {
      fields: [{ key: "width", label: "Width" }, { key: "length", label: "Length" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.width}x${f.length}${uom} ${f.gsm}gsm`,
    },
    "Sticker": {
      fields: [{ key: "width", label: "Width" }, { key: "length", label: "Length" }, { key: "gsm", label: "GSM", noUom: true }],
      format: (f, uom) => `${f.width}x${f.length}${uom} ${f.gsm}gsm`,
    },
  };

  const isStructured = !!STRUCTURED_CONFIGS[selCat];
  const config = STRUCTURED_CONFIGS[selCat];
  const [structUom, setStructUom] = useState("inch");
  const [structFields, setStructFields] = useState({});
  const [structErrors, setStructErrors] = useState({});

  const setStructField = (k, v) => { setStructFields(p => ({ ...p, [k]: v })); setStructErrors(p => ({ ...p, [k]: false })); };

  const addStructuredSize = () => {
    if (!config) return;
    const e = {};
    config.fields.forEach(f => { if (!structFields[f.key]) e[f.key] = true; });
    if (Object.keys(e).length > 0) { setStructErrors(e); return; }
    setStructErrors({});
    const generated = config.format(structFields, structUom);
    if ((sizeMaster[selCat] || []).includes(generated)) { return; }
    setSizeMaster(prev => ({ ...prev, [selCat]: [...(prev[selCat] || []), generated] }));
    setStructFields({});
  };

  const structPreview = config ? (() => {
    const allFilled = config.fields.every(f => structFields[f.key]);
    if (!allFilled) return null;
    return config.format(structFields, structUom);
  })() : null;

  const addSize = () => {
    const s = newSize.trim();
    if (!s) return;
    if (sizes.includes(s)) { toast("Size already exists", "error"); return; }
    setSizeMaster(prev => ({ ...prev, [selCat]: [...(prev[selCat] || []), s] }));
    setNewSize("");
    toast("Size added");
  };

  const deleteSize = (s) => {
    setSizeMaster(prev => ({ ...prev, [selCat]: (prev[selCat] || []).filter(x => x !== s) }));
  };

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if ((categoryMaster[selType] || []).includes(name)) { toast("Category already exists", "error"); return; }
    setCategoryMaster(prev => ({ ...prev, [selType]: [...(prev[selType] || []), name] }));
    setSizeMaster(prev => ({ ...prev, [name]: [] }));
    setNewCatName("");
    setSelCat(name);
  };

  const handleCategoryBulkImport = (rows) => {
    let added = 0;
    rows.forEach(row => {
      const cat = (row["Category"] || row["category"] || row["Name"] || row["name"] || "").toString().trim();
      if (!cat) return;
      setCategoryMaster(prev => {
        const existing = prev[selType] || [];
        if (existing.includes(cat)) return prev;
        added++;
        return { ...prev, [selType]: [...existing, cat] };
      });
    });
    setTimeout(() => toast(added + " categories imported to " + selType), 100);
  };

  const deleteCategory = (cat) => {
    
    setCategoryMaster(prev => ({ ...prev, [selType]: (prev[selType] || []).filter(c => c !== cat) }));
    setSizeMaster(prev => { const n = { ...prev }; delete n[cat]; return n; });
    if (selCat === cat) setSelCat(categories.filter(c => c !== cat)[0] || "");
  };

  const TYPE_COLORS = { "Raw Material": C.blue, "Consumable": C.yellow, "Finished Goods": C.green, "Machine Spare": C.red };

  return (
    <div className="fade">
      <SectionTitle icon="📐" title="Category Master" sub="Manage item categories and their sizes across all types" />

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {ITEM_TYPE_GROUPS.map(t => (
          <button key={t} onClick={() => { setSelType(t); const first = (categoryMaster[t] || [])[0] || ""; setSelCat(first); setStructFields({}); setStructErrors({}); setStructUom("inch"); setNewSize(""); }} style={{
            padding: "8px 18px", borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: `1px solid ${selType === t ? TYPE_COLORS[t] : C.border}`,
            background: selType === t ? TYPE_COLORS[t] + "22" : "transparent",
            color: selType === t ? TYPE_COLORS[t] : C.muted,
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selType === "Raw Material" ? "300px 1fr" : "1fr", gap: 16, alignItems: "start" }}>

        {}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLORS[selType], textTransform: "uppercase", letterSpacing: 1 }}>{selType}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{categories.length} categories</span>
          </div>

          {}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input placeholder="New category name..." value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} style={{ flex: 1, fontSize: 12, padding: "6px 10px" }} />
              <button onClick={addCategory} style={{ background: TYPE_COLORS[selType], color: "#fff", border: "none", borderRadius: 5, padding: "0 10px", fontWeight: 700, fontSize: 13 }}>+</button>
            </div>
            <ExcelImportBtn
              label={"Category_" + selType}
              color={TYPE_COLORS[selType]}
              templateCols={["Category"]}
              onImport={handleCategoryBulkImport}
            />
          </div>

          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {categories.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 12 }}>No categories yet.<br />Add one above.</div>
            ) : categories.map(cat => {
              const count = (sizeMaster[cat] || []).length;
              return (
                <div key={cat} style={{
                  padding: "9px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: selCat === cat ? TYPE_COLORS[selType] + "22" : "transparent",
                  borderLeft: `3px solid ${selCat === cat ? TYPE_COLORS[selType] : "transparent"}`,
                  transition: "all .15s", gap: 6
                }}>
                  <span onClick={() => { setSelCat(cat); setStructFields({}); setStructErrors({}); setStructUom("inch"); setNewSize(""); }} style={{ fontSize: 13, color: selCat === cat ? TYPE_COLORS[selType] : C.text, fontWeight: selCat === cat ? 700 : 400, flex: 1 }}>{cat}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: count > 0 ? C.green : C.border, background: count > 0 ? C.green + "22" : C.border + "22", borderRadius: 10, padding: "1px 7px", whiteSpace: "nowrap" }}>{count}</span>
                  {canEditSizemaster && <button onClick={() => deleteCategory(cat)} style={{ background: "transparent", color: C.muted, border: "none", fontSize: 14, padding: "0 2px", lineHeight: 1 }} title="Delete category">×</button>}
                </div>
              );
            })}
          </div>
        </Card>

        {}
        {selType === "Raw Material" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{selCat || "—"}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sizes.length} paper type{sizes.length !== 1 ? "s" : ""}</div>
              </div>
              <Badge label="Paper Types" color={C.blue} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                placeholder={selCat ? `Add paper type for ${selCat}...` : "Select a category first"}
                value={newSize}
                onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => e.key === "Enter" && selCat && addSize()}
                style={{ flex: 1 }}
                disabled={!selCat}
              />
              <button onClick={addSize} disabled={!selCat} style={{ background: selCat ? C.blue : C.border, color: "#fff", border: "none", borderRadius: 6, padding: "0 16px", fontWeight: 700, fontSize: 13, cursor: selCat ? "pointer" : "not-allowed" }}>+ Add</button>
            </div>
            {sizes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>
                {selCat ? `No paper types for ${selCat} yet.` : "Select a category on the left."}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sizes.map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.blue}33`, borderRadius: 6, padding: "6px 10px 6px 12px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
                    {canEditSizemaster && <button onClick={() => deleteSize(s)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, width: 20, height: 20, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}



function SalesOrders({ salesOrders, setSalesOrders, sizeMaster, categoryMaster, clientMaster, setClientMaster, itemMasterFG, setItemMasterFG, soCounter, setSoCounter, jobOrders, setJobOrders, itemCounters, setItemCounters, dispatches, toast }) {
  const { isAdmin, canEdit } = useAuth();

  const blankHeader = { orderDate: today(), deliveryDate: "", salesPerson: "", clientCategory: "", clientName: "", remarks: "", status: "Open" };
  const blankItem = () => ({ _id: uid(), productCode: "", itemCategory: "", size: "", variant: "", width: "", length: "", height: "", gussett: "", uom: "inch", orderQty: "", price: "", amount: "", itemName: "", remarks: "" });

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");

  const fgCategories = (categoryMaster && categoryMaster["Finished Goods"]) || FG_SEED_CATEGORIES;

  const setH = (k, v) => {
    setHeader(f => ({ ...f, [k]: v }));
    setHeaderErrors(e => ({ ...e, [k]: false }));
  };
  const EH = (k) => headerErrors[k] ? { border: `1px solid ${C.red}` } : {};
  const EHMsg = (k) => headerErrors[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;

  
  const generateItemName = (it, clientName) => {
    const cat = it.itemCategory || "";
    const client = clientName || "";
    const variant = it.variant || "";
    if (!cat) return "";
    if (FG_SIZE_CLIENT_CATS.includes(cat)) return [cat, it.size, client, variant].filter(Boolean).join(" ");
    if (FG_BOX_CATS.includes(cat)) {
      const uom = it.uom || "inch";
      const dims = (it.width && it.length && it.height) ? `${it.width}x${it.length}x${it.height}${uom}` : "";
      return [cat, dims, client, variant].filter(Boolean).join(" ");
    }
    if (FG_FLAT_CATS.includes(cat)) {
      const uom = it.uom || "inch";
      const dims = (it.width && it.length) ? `${it.width}x${it.length}${uom}` : "";
      return [cat, dims, client, variant].filter(Boolean).join(" ");
    }
    if (FG_BAG_CATS.includes(cat)) {
      const uom = it.uom || "inch";
      const dims = (it.width && it.gussett && it.height) ? `${it.width}x${it.gussett}x${it.height}${uom}` : "";
      return [cat, dims, client, variant].filter(Boolean).join(" ");
    }
    if (FG_WRAP_CATS.includes(cat)) {
      const uom = it.uom || "inch";
      const dims = (it.width && it.height) ? `${it.width}x${it.height}${uom}` : "";
      return [cat, dims, client, variant].filter(Boolean).join(" ");
    }
    return [cat, it.size, client, variant].filter(Boolean).join(" ");
  };

  const setItem = (idx, k, v) => {
    setItems(prev => {
      const updated = [...prev];
      const it = { ...updated[idx], [k]: v };
      
      if (k === "productCode" && v) {
        const masterItem = (itemMasterFG["Finished Goods"] || []).find(x => (x.code || "").toLowerCase() === v.toLowerCase());
        if (masterItem) {
          it.itemName = masterItem.name || "";
          if (masterItem.category) it.itemCategory = masterItem.category;
          
          const name = masterItem.name || "";
          const cat  = masterItem.category || "";
          
          const uomMatch = name.match(/(inch|mm|cm)$/i);
          const uom = uomMatch ? uomMatch[1].toLowerCase() : "inch";
          it.uom = uom;
          if (FG_BOX_CATS.includes(cat)) {
            
            const dimMatch = name.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(inch|mm|cm)?/i);
            if (dimMatch) { it.width = dimMatch[1]; it.length = dimMatch[2]; it.height = dimMatch[3]; }
          } else if (FG_BAG_CATS.includes(cat)) {
            
            const dimMatch = name.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(inch|mm|cm)?/i);
            if (dimMatch) { it.width = dimMatch[1]; it.gussett = dimMatch[2]; it.height = dimMatch[3]; }
          } else if (FG_FLAT_CATS.includes(cat)) {
            
            const dimMatch = name.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(inch|mm|cm)?/i);
            if (dimMatch) { it.width = dimMatch[1]; it.length = dimMatch[2]; }
          } else if (FG_WRAP_CATS.includes(cat)) {
            
            const dimMatch = name.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(inch|mm|cm)?/i);
            if (dimMatch) { it.width = dimMatch[1]; it.height = dimMatch[2]; }
          } else if (FG_SIZE_CLIENT_CATS.includes(cat)) {
            
            const sizeMatch = name.replace(cat, "").trim().split(" ")[0];
            if (sizeMatch) it.size = sizeMatch;
          }
        }
      }
      if (k === "itemCategory") { it.size = ""; it.variant = ""; it.width = ""; it.length = ""; it.height = ""; it.gussett = ""; it.uom = "inch"; it.productCode = ""; }
      it.itemName = generateItemName(it, header.clientName);
      
      const qty = k === "orderQty" ? +v : +(it.orderQty || 0);
      const price = k === "price" ? +v : +(it.price || 0);
      it.amount = qty && price ? (qty * price).toFixed(2) : "";
      updated[idx] = it;
      return updated;
    });
    setItemErrors(prev => { const e = [...prev]; e[idx] = { ...(e[idx] || {}), [k]: false }; return e; });
  };

  
  const setHWithItemNameRefresh = (k, v) => {
    setH(k, v);
    if (k === "clientName") {
      setItems(prev => prev.map(it => ({ ...it, itemName: generateItemName(it, v) })));
    }
  };

  const addItem = () => { setItems(p => [...p, blankItem()]); setItemErrors(p => [...p, {}]); };
  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(p => p.filter((_, i) => i !== idx));
    setItemErrors(p => p.filter((_, i) => i !== idx));
  };

  const EI = (idx, k) => (itemErrors[idx] || {})[k] ? { border: `1px solid ${C.red}` } : {};
  const EIMsg = (idx, k) => (itemErrors[idx] || {})[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;

  const submit = () => {
    
    const he = {};
    if (!header.orderDate) he.orderDate = true;
    if (!header.deliveryDate) he.deliveryDate = true;
    if (!header.salesPerson) he.salesPerson = true;
    if (!header.clientCategory) he.clientCategory = true;
    if (!header.clientName) he.clientName = true;
    setHeaderErrors(he);

    
    const allItemErrors = items.map(it => {
      const e = {};
      if (!it.itemCategory) e.itemCategory = true;
      if (FG_SIZE_CLIENT_CATS.includes(it.itemCategory) && !it.size) e.size = true;
      if (FG_BOX_CATS.includes(it.itemCategory)) { if (!it.width) e.width = true; if (!it.length) e.length = true; if (!it.height) e.height = true; }
      if (FG_FLAT_CATS.includes(it.itemCategory)) { if (!it.width) e.width = true; if (!it.length) e.length = true; }
      if (FG_BAG_CATS.includes(it.itemCategory)) { if (!it.width) e.width = true; if (!it.gussett) e.gussett = true; if (!it.height) e.height = true; }
      if (FG_WRAP_CATS.includes(it.itemCategory)) { if (!it.width) e.width = true; if (!it.height) e.height = true; }
      if (!it.orderQty) e.orderQty = true;
      return e;
    });
    setItemErrors(allItemErrors);

    if (Object.keys(he).length > 0 || allItemErrors.some(e => Object.keys(e).length > 0)) {
      const FIELD_LABELS = { orderDate: "Order Date", deliveryDate: "Delivery Date", salesPerson: "Sales Person", clientCategory: "Client Category", clientName: "Client Name", itemCategory: "Item Category", size: "Size", width: "Width", length: "Length", height: "Height", gussett: "Gussett", orderQty: "Order Quantity" };
      const msgs = [];
      Object.keys(he).forEach(k => msgs.push(FIELD_LABELS[k] || k));
      allItemErrors.forEach((e, idx) => Object.keys(e).forEach(k => msgs.push(`Item ${idx + 1}: ${FIELD_LABELS[k] || k}`)));
      toast([...new Set(msgs)], "validation");
      return;
    }

    const soNo = "SO-" + soCounter;
    setSoCounter(n => n + 1);
    const entry = { ...header, soNo, id: uid(), items };
    setSalesOrders(p => [...p, entry]);

    
    const clientName = header.clientName.trim();
    if (clientName) {
      setClientMaster(prev => {
        if (prev.some(c => c.name.toLowerCase() === clientName.toLowerCase())) return prev;
        return [...prev, { id: uid(), name: clientName, addedOn: today(), source: "Sales Order" }];
      });
    }

    
    let fgCounter = itemCounters.FG || 1;
    const newFGItems = [];
    items.forEach(it => {
      const iName = it.itemName.trim();
      if (!iName) return;
      const existsAlready = (itemMasterFG["Finished Goods"] || []).some(x => x.name.toLowerCase() === iName.toLowerCase())
        || newFGItems.some(x => x.name.toLowerCase() === iName.toLowerCase());
      if (existsAlready) return;
      const code = generateProductCode("Finished Goods", { ...itemCounters, FG: fgCounter });
      fgCounter++;
      newFGItems.push({ id: uid(), code, name: iName, addedOn: today(), source: "Sales Order", category: it.itemCategory || "" });
    });
    if (newFGItems.length > 0) {
      setItemMasterFG(prev => ({ ...prev, "Finished Goods": [...(prev["Finished Goods"] || []), ...newFGItems] }));
      setItemCounters(c => ({ ...c, FG: fgCounter }));
    }

    toast(`Sales Order created: ${soNo} (${items.length} item${items.length > 1 ? "s" : ""})`);
    setHeader(blankHeader);
    setItems([blankItem()]);
    setHeaderErrors({});
    setItemErrors([{}]);
  };

  const divider = (label, color) => {
    const col = color || C.green;
    return (
      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid " + C.border, paddingTop: 14, marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, textTransform: "uppercase", letterSpacing: 2 }}>{label}</span>
      </div>
    );
  };

  return (
    <div className="fade">
      <SectionTitle icon="🧾" title="Sales Orders" sub="Create and track customer sales orders" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["form", "📝 New Order"], ["records", `📋 Records (${salesOrders.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${view === v ? C.green : C.border}`, background: view === v ? C.green + "22" : "transparent", color: view === v ? C.green : C.muted, fontWeight: 700, fontSize: 13 }}>{l}</button>
        ))}
      </div>

      {view === "form" && (
        <div>
          {}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 16 }}>Order & Client Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {divider("Order Details")}
              <Field label="Order Date *"><DatePicker value={header.orderDate} onChange={v => setH("orderDate", v)} style={EH("orderDate")} />{EHMsg("orderDate")}</Field>
              <Field label="Delivery Date *"><DatePicker value={header.deliveryDate} onChange={v => setH("deliveryDate", v)} style={EH("deliveryDate")} />{EHMsg("deliveryDate")}</Field>
              <Field label="Sales Person *">
                <select value={header.salesPerson} onChange={e => setH("salesPerson", e.target.value)} style={EH("salesPerson")}>
                  <option value="">-- Select --</option>
                  {SO_SALESPERSONS.map(s => <option key={s}>{s}</option>)}
                  <option value="__other__">+ Other</option>
                </select>
                {EHMsg("salesPerson")}
              </Field>
              {header.salesPerson === "__other__" && (
                <Field label="Sales Person Name *"><input placeholder="Enter name" value={header.salesPersonCustom || ""} onChange={e => setH("salesPersonCustom", e.target.value)} /></Field>
              )}
              {divider("Client Details")}
              <Field label="Client Category *">
                <select value={header.clientCategory} onChange={e => setH("clientCategory", e.target.value)} style={EH("clientCategory")}>
                  <option value="">-- Select Category --</option>
                  {SO_CLIENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                {EHMsg("clientCategory")}
              </Field>
              <Field label="Client Name *">
                <AutocompleteInput
                  value={header.clientName}
                  onChange={v => setHWithItemNameRefresh("clientName", v)}
                  suggestions={(clientMaster || []).map(c => c.name)}
                  placeholder="Client / Company name"
                  inputStyle={EH("clientName")}
                />
                {EHMsg("clientName")}
              </Field>
              <Field label="Remarks" span={2}>
                <input placeholder="Special instructions (optional)" value={header.remarks || ""} onChange={e => setH("remarks", e.target.value)} />
              </Field>
            </div>
          </Card>

          {}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Order Items ({items.length})</h3>
            <button onClick={addItem} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13 }}>+ Add Item</button>
          </div>

          {items.map((it, idx) => (
            <Card key={it._id} style={{ marginBottom: 12, borderLeft: `3px solid ${C.green}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontWeight: 700, color: C.green, fontSize: 13 }}>Item {idx + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 5, padding: "4px 12px", fontWeight: 700, fontSize: 12 }}>✕ Remove</button>}
              </div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
      <Field label="Product Code">
        <AutocompleteInput
          value={it.productCode || ""}
          onChange={v => setItem(idx, "productCode", v.includes(" — ") ? v.split(" — ")[0] : v)}
          suggestions={(itemMasterFG["Finished Goods"] || []).filter(x => x.code).map(x => x.code + " — " + x.name)}
          placeholder="Type or select code (optional)"
        />
      </Field>

      <Field label="Category *">
        <select value={it.itemCategory} onChange={e => setItem(idx, "itemCategory", e.target.value)} style={EI(idx, "itemCategory")}>
          <option value="">-- Select Category --</option>
          {fgCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        {EIMsg(idx, "itemCategory")}
      </Field>

      {it.itemCategory && FG_SIZE_CLIENT_CATS.includes(it.itemCategory) && (
        <Field label="Size *">
          <select value={it.size || ""} onChange={e => setItem(idx, "size", e.target.value)} style={EI(idx, "size")}>
            <option value="">-- Select Size --</option>
            {(sizeMaster[it.itemCategory] || []).map(s => <option key={s}>{s}</option>)}
          </select>
          {EIMsg(idx, "size")}
        </Field>
      )}
      {(
        <Field label="Variant / Colour">
          <input placeholder="e.g. Blue, Yellow, Plain (optional)" value={it.variant || ""} onChange={e => setItem(idx, "variant", e.target.value)} />
        </Field>
      )}


      {it.itemCategory && FG_BOX_CATS.includes(it.itemCategory) && (<>
        <Field label="UOM *"><select value={it.uom || "inch"} onChange={e => setItem(idx, "uom", e.target.value)}><option value="inch">inch</option><option value="cm">cm</option><option value="mm">mm</option></select></Field>
        <Field label="Width *"><input type="number" placeholder="e.g. 8" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} style={EI(idx, "width")} />{EIMsg(idx, "width")}</Field>
        <Field label="Length *"><input type="number" placeholder="e.g. 8" value={it.length || ""} onChange={e => setItem(idx, "length", e.target.value)} style={EI(idx, "length")} />{EIMsg(idx, "length")}</Field>
        <Field label="Height *"><input type="number" placeholder="e.g. 5" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} style={EI(idx, "height")} />{EIMsg(idx, "height")}</Field>
      </>)}

      {it.itemCategory && FG_FLAT_CATS.includes(it.itemCategory) && (<>
        <Field label="UOM *"><select value={it.uom || "inch"} onChange={e => setItem(idx, "uom", e.target.value)}><option value="inch">inch</option><option value="cm">cm</option><option value="mm">mm</option></select></Field>
        <Field label="Width *"><input type="number" placeholder="e.g. 5" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} style={EI(idx, "width")} />{EIMsg(idx, "width")}</Field>
        <Field label="Length *"><input type="number" placeholder="e.g. 7" value={it.length || ""} onChange={e => setItem(idx, "length", e.target.value)} style={EI(idx, "length")} />{EIMsg(idx, "length")}</Field>
      </>)}

      {it.itemCategory && FG_BAG_CATS.includes(it.itemCategory) && (<>
        <Field label="UOM *"><select value={it.uom || "inch"} onChange={e => setItem(idx, "uom", e.target.value)}><option value="inch">inch</option><option value="cm">cm</option><option value="mm">mm</option></select></Field>
        <Field label="Width *"><input type="number" placeholder="e.g. 9" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} style={EI(idx, "width")} />{EIMsg(idx, "width")}</Field>
        <Field label="Gussett *"><input type="number" placeholder="e.g. 6" value={it.gussett || ""} onChange={e => setItem(idx, "gussett", e.target.value)} style={EI(idx, "gussett")} />{EIMsg(idx, "gussett")}</Field>
        <Field label="Height *"><input type="number" placeholder="e.g. 7" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} style={EI(idx, "height")} />{EIMsg(idx, "height")}</Field>
      </>)}

      {it.itemCategory && FG_WRAP_CATS.includes(it.itemCategory) && (<>
        <Field label="UOM *"><select value={it.uom || "inch"} onChange={e => setItem(idx, "uom", e.target.value)}><option value="inch">inch</option><option value="cm">cm</option><option value="mm">mm</option></select></Field>
        <Field label="Width *"><input type="number" placeholder="e.g. 20" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} style={EI(idx, "width")} />{EIMsg(idx, "width")}</Field>
        <Field label="Height *"><input type="number" placeholder="e.g. 30" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} style={EI(idx, "height")} />{EIMsg(idx, "height")}</Field>
      </>)}

      {it.itemCategory && !FG_SIZE_CLIENT_CATS.includes(it.itemCategory) && !FG_BOX_CATS.includes(it.itemCategory) && !FG_FLAT_CATS.includes(it.itemCategory) && !FG_BAG_CATS.includes(it.itemCategory) && !FG_WRAP_CATS.includes(it.itemCategory) && (
        <Field label="Size"><input placeholder="Enter size (optional)" value={it.size || ""} onChange={e => setItem(idx, "size", e.target.value)} /></Field>
      )}

      <Field label="Order Quantity *">
        <input type="number" placeholder="Qty" value={it.orderQty || ""} onChange={e => setItem(idx, "orderQty", e.target.value)} style={EI(idx, "orderQty")} />
        {EIMsg(idx, "orderQty")}
      </Field>

      <Field label="Price (₹)">
        <input type="number" placeholder="Price per unit" value={it.price || ""} onChange={e => setItem(idx, "price", e.target.value)} />
      </Field>

      <Field label="Amount (₹)">
        <div style={{
          padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`,
          borderRadius: 6, fontSize: 13, minHeight: 38,
          color: it.amount ? C.green : C.muted,
          fontWeight: it.amount ? 700 : 400,
          fontFamily: it.amount ? "'JetBrains Mono',monospace" : undefined,
        }}>
          {it.amount ? `₹${fmt(+it.amount)}` : "— Qty × Price —"}
        </div>
      </Field>

      <Field label="Item Name" span={2}>
        <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, minHeight: 38, color: it.itemName ? C.green : C.muted, fontWeight: it.itemName ? 700 : 400, fontFamily: it.itemName ? "'JetBrains Mono',monospace" : undefined }}>
          {it.itemName || "— Auto-filled from category + size + client —"}
        </div>
      </Field>
      <Field label="Item Remarks" span={2}>
        <input placeholder="Special instructions for this item (optional)" value={it.remarks || ""} onChange={e => setItem(idx, "remarks", e.target.value)} />
      </Field>
    </div>
            </Card>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={addItem} style={{ background: C.green + "22", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 6, padding: "9px 20px", fontWeight: 700, fontSize: 13 }}>+ Add Another Item</button>
            <SubmitBtn label={`Create Sales Order (${items.length} item${items.length > 1 ? "s" : ""})`} color={C.green} onClick={submit} />
            {items.some(it => it.amount) && (
              <div style={{ marginLeft: "auto", padding: "9px 16px", background: C.green + "22", border: `1px solid ${C.green}44`, borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Order Value: </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.green, fontSize: 14 }}>
                  ₹{fmt(items.reduce((sum, it) => sum + (+(it.amount || 0)), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "records" && (
        <SORecords salesOrders={salesOrders} setSalesOrders={setSalesOrders} sizeMaster={sizeMaster} categoryMaster={categoryMaster} setJobOrders={setJobOrders} itemMasterFG={itemMasterFG} setItemMasterFG={setItemMasterFG} dispatches={dispatches} toast={toast} />
      )}
    </div>
  );
}





function printSO(s) {
  var itemRows = (s.items || [s]).map(function(it) {
    return "<tr><td>" + (it.itemCategory || "") + "</td><td>" + (it.itemName || "") + "</td><td>" +
      (it.size || "—") + "</td><td>" + (it.orderQty || "—") + "</td><td>" +
      (it.price ? "Rs " + it.price : "—") + "</td><td style=\'font-weight:bold\'>" +
      (it.amount ? "Rs " + (+it.amount).toLocaleString("en-IN") : "—") + "</td><td style=\'color:#555;font-style:italic\'>" +
      (it.remarks || "—") + "</td></tr>";
  }).join("");
  var total = (s.items || []).reduce(function(sum, it) { return sum + (+(it.amount || 0)); }, 0);
  var statusColor = s.status === "Closed" ? "#6b7280" : "#22c55e";
  var html = "<div style=\'border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center\'><div style=\'font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px\'>AARAY PACKAGING PRIVATE LIMITED</div><div style=\'font-size:10px;color:#666;margin-bottom:1px\'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#666;margin-bottom:4px\'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#444\'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div><div class=\'header\'>" +
    "<div><h1>Sales Order</h1><h2>" + s.soNo + " &nbsp;<span style=\'font-size:11px;padding:3px 10px;border-radius:4px;background:" + statusColor + "22;color:" + statusColor + ";border:1px solid " + statusColor + "\'>" + (s.status || "Open") + "</span></h2></div>" +
    "<div style=\'text-align:right\'><div style=\'font-size:11px;color:#888\'>Order Date</div><div style=\'font-weight:bold;font-size:14px\'>" + (s.orderDate || "") + "</div>" +
    (s.deliveryDate ? "<div style=\'font-size:11px;color:#888;margin-top:4px\'>Delivery Date</div><div style=\'font-weight:bold\'>" + s.deliveryDate + "</div>" : "") + "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Client Details</div><div class=\'field-grid\'>" +
    "<div class=\'field\'><label>Client Name</label><span>" + (s.clientName || "") + "</span></div>" +
    "<div class=\'field\'><label>Client Category</label><span>" + (s.clientCategory || "") + "</span></div>" +
    "<div class=\'field\'><label>Sales Person</label><span>" + (s.salesPerson === "__other__" ? (s.salesPersonCustom || "") : (s.salesPerson || "")) + "</span></div>" +
    "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Order Items</div>" +
    "<table><thead><tr><th>Category</th><th>Item Name</th><th>Size</th><th>Qty</th><th>Price</th><th>Amount</th><th>Remarks</th></tr></thead>" +
    "<tbody>" + itemRows + "</tbody></table>" +
    (total > 0 ? "<div class=\'total\'>Order Value: Rs " + total.toLocaleString("en-IN") + "</div>" : "") + "</div>" +
    (s.remarks ? "<div class=\'section\'><div class=\'section-title\'>Remarks</div><p>" + s.remarks + "</p></div>" : "") +
    "<div class=\'footer\'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";
  var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px}" +
    "h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:16px}" +
    "table{width:100%;border-collapse:collapse;margin-top:12px}" +
    "th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd}" +
    "td{padding:6px 10px;border:1px solid #eee;font-size:12px}" +
    "tr:nth-child(even) td{background:#fafafa}" +
    ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}" +
    ".section{margin-top:16px}.section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}" +
    ".field-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}" +
    ".field label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;display:block;margin-bottom:2px}" +
    ".field span{font-size:13px;font-weight:500}.total{text-align:right;font-weight:bold;font-size:14px;margin-top:8px}" +
    ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
    "@media print{body{margin:10px}}";
  var fullHtml = "<!DOCTYPE html><html><head><title>" + s.soNo + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
  var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = s.soNo + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}


function printChallan(s) {
  var itemRows = (s.items || []).map(function(it) {
    return "<tr><td>" + (it.itemCategory || "") + "</td><td>" + (it.itemName || "") + "</td><td>" +
      (it.size || "—") + "</td><td style='text-align:center'>" + (it.orderQty || "—") + "</td><td></td></tr>";
  }).join("");
  var html =
    "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start'>" +
      "<div><div style='font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px'>AARAY PACKAGING PRIVATE LIMITED</div>" +
      "<div style='font-size:10px;color:#666;margin-bottom:1px'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div>" +
      "<div style='font-size:10px;color:#666'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div></div>" +
      "<div style='text-align:right;font-size:10px;color:#444'><div>www.rapackaging.in</div><div>orders@rapackaging.in</div><div>+91 9311802540</div></div></div>" +
    "<div class='header'><div><h1>Delivery Challan</h1><h2>Ref: " + s.soNo + "</h2></div>" +
      "<div style='text-align:right'><div style='font-size:11px;color:#888'>Challan Date</div><div style='font-weight:bold;font-size:14px'>" + new Date().toLocaleDateString("en-IN") + "</div>" +
      (s.deliveryDate ? "<div style='font-size:11px;color:#888;margin-top:4px'>Delivery Date</div><div style='font-weight:bold'>" + s.deliveryDate + "</div>" : "") + "</div></div>" +
    "<div class='section'><div class='section-title'>Consignee</div><div class='field-grid'>" +
      "<div class='field'><label>Client Name</label><span>" + (s.clientName || "") + "</span></div>" +
      "<div class='field'><label>Client Category</label><span>" + (s.clientCategory || "") + "</span></div>" +
      "<div class='field'><label>Sales Person</label><span>" + (s.salesPerson === "__other__" ? (s.salesPersonCustom || "") : (s.salesPerson || "")) + "</span></div>" +
    "</div></div>" +
    "<div class='section'><div class='section-title'>Items Dispatched</div>" +
      "<table><thead><tr><th>Category</th><th>Item Description</th><th>Size</th><th style='text-align:center'>Qty</th><th>Remarks</th></tr></thead>" +
      "<tbody>" + itemRows + "</tbody></table></div>" +
    "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px'>" +
      "<div style='border-top:1px solid #333;padding-top:8px;text-align:center;font-size:11px;color:#666'>Prepared By</div>" +
      "<div style='border-top:1px solid #333;padding-top:8px;text-align:center;font-size:11px;color:#666'>Checked By</div>" +
      "<div style='border-top:1px solid #333;padding-top:8px;text-align:center;font-size:11px;color:#666'>Receiver Signature &amp; Stamp</div>" +
    "</div>" +
    "<div class='footer'><span>Generated on " + new Date().toLocaleDateString("en-IN") + " — ManufactureIQ ERP</span><span>This is a computer generated document</span></div>";
  var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px}" +
    "h1{font-size:18px;margin-bottom:4px}h2{font-size:13px;color:#555;margin-bottom:16px}" +
    "table{width:100%;border-collapse:collapse;margin-top:12px}" +
    "th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd}" +
    "td{padding:8px 10px;border:1px solid #eee;font-size:12px}" +
    "tr:nth-child(even) td{background:#fafafa}" +
    ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}" +
    ".section{margin-top:16px}.section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}" +
    ".field-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}" +
    ".field label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;display:block;margin-bottom:2px}" +
    ".field span{font-size:13px;font-weight:500}" +
    ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
    "@media print{body{margin:10px}}";
  var fullHtml = "<!DOCTYPE html><html><head><title>Challan-" + s.soNo + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
  var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = s.soNo + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function SORecords({ salesOrders, setSalesOrders, sizeMaster, categoryMaster, setJobOrders, itemMasterFG, setItemMasterFG, dispatches, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditSales = canEdit("sales");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo,   setDrDateTo]   = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [expandedDispatch, setExpandedDispatch] = useState(null);

  
  const dispatchMap = {};
  (dispatches || []).forEach(d => {
    if (!d.soRef) return;
    if (!dispatchMap[d.soRef]) dispatchMap[d.soRef] = {};
    (d.items || []).forEach(it => {
      const key = (it.itemName || "").toLowerCase().trim();
      dispatchMap[d.soRef][key] = (dispatchMap[d.soRef][key] || 0) + +(it.qty || 0);
    });
  });

  const fgCategories = (categoryMaster && categoryMaster["Finished Goods"]) || FG_SEED_CATEGORIES;

  const startEdit = (s) => { setEditId(s.id); setEditData({ ...s }); };
  const cancelEdit = () => { setEditId(null); setEditData(null); };
  const saveEdit = () => {
    
    const oldSO = salesOrders.find(s => s.id === editId);
    setSalesOrders(prev => prev.map(s => s.id === editId ? { ...editData } : s));
    
    const oldItems = oldSO?.items || [];
    const newItems = editData?.items || [];
    oldItems.forEach((oldIt, i) => {
      const newIt = newItems[i];
      if (oldIt.itemName && newIt?.itemName && oldIt.itemName !== newIt.itemName) {
        setItemMasterFG(prev => ({
          ...prev,
          "Finished Goods": (prev["Finished Goods"] || []).map(x =>
            x.name === oldIt.itemName ? { ...x, name: newIt.itemName } : x
          )
        }));
      }
    });
    toast("Sales Order updated");
    cancelEdit();
  };
  const deleteOrder = (id) => {
    const so = salesOrders.find(s => s.id === id);
    setSalesOrders(prev => prev.filter(s => s.id !== id));
    
    if (so) {
      setJobOrders(prev => prev.map(j => j.soRef === so.soNo ? { ...j, soRef: "" } : j));
    }
    toast("Sales Order deleted — linked Job Orders unlinked");
    cancelEdit();
  };

  const setED = (k, v) => setEditData(p => ({ ...p, [k]: v }));
  const setEDItem = (idx, k, v) => setEditData(p => {
    const items = [...(p.items || [])];
    items[idx] = { ...items[idx], [k]: v };
    return { ...p, items };
  });

  const filtered = React.useMemo(() => salesOrders.slice().reverse().filter(s => {
    if (drDateFrom && (s.orderDate||"") < drDateFrom) return false;
    if (drDateTo   && (s.orderDate||"") > drDateTo)   return false;
    return !search || s.soNo.toLowerCase().includes(search.toLowerCase()) ||
      s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      (s.items || []).some(it => it.itemName?.toLowerCase().includes(search.toLowerCase()));
  }), [salesOrders, search]);


  const exportToExcel = () => {
    const rows = [];
    filtered.forEach(s => {
      (s.items || []).forEach(it => {
        rows.push({
          "SO No":          s.soNo || "",
          "Order Date":     s.orderDate || "",
          "Delivery Date":  s.deliveryDate || "",
          "Client Name":    s.clientName || "",
          "Client Category":s.clientCategory || "",
          "Sales Person":   s.salesPerson || "",
          "Status":         s.status || "Open",
          "Product Code":   it.productCode || "",
          "Item Name":      it.itemName || "",
          "Category":       it.itemCategory || "",
          "Size":           it.size || "",
          "Order Qty":      it.orderQty || "",
          "Price (₹)":      it.price || "",
          "Amount (₹)":     it.amount || "",
          "Remarks":        s.remarks || "",
        });
      });
      if (!(s.items || []).length) {
        rows.push({
          "SO No": s.soNo || "", "Order Date": s.orderDate || "", "Delivery Date": s.deliveryDate || "",
          "Client Name": s.clientName || "", "Client Category": s.clientCategory || "",
          "Sales Person": s.salesPerson || "", "Status": s.status || "Open",
          "Product Code": "", "Item Name": "", "Category": "", "Size": "",
          "Order Qty": "", "Price (₹)": "", "Amount (₹)": "", "Remarks": s.remarks || "",
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Orders");
    const suffix = drDateFrom || drDateTo ? `_${drDateFrom||""}to${drDateTo||""}` : `_${today()}`;
    xlsxDownload(wb, `Sales_Orders${suffix}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <input placeholder="🔍 Search by SO#, client, item..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
        <span style={{ fontSize: 13, color: C.muted }}>{filtered.length} of {salesOrders.length} orders</span>
        <button onClick={exportToExcel} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>⬇ Export Excel</button>
      </div>
      {filtered.map(s => (
        <Card key={s.id} style={{ marginBottom: 12, borderLeft: `3px solid ${s.id === editId ? C.yellow : C.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.green, fontWeight: 700, fontSize: 14 }}>{s.soNo}</span>
              <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{s.clientName} · {s.orderDate}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge label={s.status || "Open"} color={s.status === "Closed" ? C.muted : s.status === "Cancelled" ? C.red : C.green} />
              {editId !== s.id && (<>
                {canEditSales && <button onClick={() => startEdit(s)} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>✏️ Edit</button>}
                <button onClick={() => printSO(s)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 PDF</button>
                <button onClick={() => printChallan(s)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 Challan</button>
                {canEditSales && s.status !== "Cancelled" && s.status !== "Closed" && (
                  <button onClick={() => { setSalesOrders(prev => prev.map(x => x.id === s.id ? { ...x, status: "Cancelled" } : x)); toast("Sales Order cancelled"); }} style={{ background: C.red + "22", color: C.red, border: "1px solid " + C.red + "44", borderRadius: 5, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>✕</button>
                )}
              </>)}
            </div>
          </div>

          {editId === s.id && editData ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
                <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Order Date</label><DatePicker value={editData.orderDate} onChange={v => setED("orderDate", v)} /></div>
                <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Delivery Date</label><DatePicker value={editData.deliveryDate} onChange={v => setED("deliveryDate", v)} /></div>
                <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Sales Person</label>
                  <select value={editData.salesPerson} onChange={e => setED("salesPerson", e.target.value)}>
                    {SO_SALESPERSONS.map(sp => <option key={sp}>{sp}</option>)}
                    <option value="__other__">+ Other</option>
                  </select>
                </div>
                <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Client Category</label>
                  <select value={editData.clientCategory} onChange={e => setED("clientCategory", e.target.value)}>
                    {SO_CLIENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Client Name</label><input value={editData.clientName} onChange={e => setED("clientName", e.target.value)} /></div>
                <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Status</label>
                  <select value={editData.status} onChange={e => setED("status", e.target.value)}>
                    {["Open", "In Progress", "Closed", "Cancelled"].map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>
              </div>
              {}
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Items</div>
              {(editData.items || []).map((it, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: 6, marginBottom: 8 }}>
                  <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Category</label>
                    <select value={it.itemCategory || ""} onChange={e => setEDItem(idx, "itemCategory", e.target.value)}>
                      {fgCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Size</label><input value={it.size || ""} onChange={e => setEDItem(idx, "size", e.target.value)} /></div>
                  <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Variant / Colour</label><input placeholder="e.g. RDBD Blue, Yellow" value={it.variant || ""} onChange={e => setEDItem(idx, "variant", e.target.value)} /></div>

                  <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Qty</label><input type="number" value={it.orderQty || ""} onChange={e => setEDItem(idx, "orderQty", e.target.value)} /></div>
                  <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Rate (₹/unit)</label><input type="number" placeholder="Price" value={it.price || ""} onChange={e => { setEDItem(idx, "price", e.target.value); setEDItem(idx, "amount", e.target.value && it.orderQty ? (+e.target.value * +(it.orderQty)).toFixed(2) : ""); }} /></div>
                  <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Item Name</label>
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.green, fontFamily: "'JetBrains Mono',monospace" }}>{it.itemName || "—"}</div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Item Remarks</label>
                    <input value={it.remarks || ""} placeholder="Special instructions for this item (optional)" onChange={e => setEDItem(idx, "remarks", e.target.value)} />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={saveEdit} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12 }}>Save</button>
                <button onClick={cancelEdit} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                {canEditSales && <button onClick={() => deleteOrder(s.id)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, marginLeft: "auto" }}>Delete</button>}
              </div>
            </div>
          ) : (
            <div>
              {}
              {(() => {
                const soDispatched = dispatchMap[s.soNo] || {};
                const totalOrdered  = (s.items || []).reduce((sum, it) => sum + +(it.orderQty || 0), 0);
                const totalDispatched = (s.items || []).reduce((sum, it) => {
                  const key = (it.itemName || "").toLowerCase().trim();
                  return sum + (soDispatched[key] || 0);
                }, 0);
                const dispatchedDispatches = (dispatches || []).filter(d => d.soRef === s.soNo);
                if (dispatchedDispatches.length === 0) return null;
                const allDone = totalOrdered > 0 && totalDispatched >= totalOrdered;
                const partial = totalDispatched > 0 && !allDone;
                const statusCol = allDone ? C.green : partial ? C.yellow : C.muted;
                const statusLabel = allDone ? "Fully Dispatched" : partial ? "Partially Dispatched" : "Not Dispatched";
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div
                      onClick={() => setExpandedDispatch(expandedDispatch === s.id ? null : s.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: statusCol + "12", border: `1px solid ${statusCol}33`, borderRadius: 6, cursor: "pointer", userSelect: "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: statusCol }}>{allDone ? "✅" : partial ? "⚡" : "⏳"} {statusLabel}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {fmt(totalDispatched)} / {fmt(totalOrdered)} pcs dispatched
                      </span>
                      {totalOrdered > 0 && (
                        <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: "hidden", maxWidth: 120 }}>
                          <div style={{ height: "100%", width: Math.min(100, Math.round(totalDispatched / totalOrdered * 100)) + "%", background: statusCol, borderRadius: 2 }} />
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>{dispatchedDispatches.length} dispatch{dispatchedDispatches.length !== 1 ? "es" : ""} {expandedDispatch === s.id ? "▲" : "▼"}</span>
                    </div>

                    {}
                    {expandedDispatch === s.id && (
                      <div style={{ marginTop: 6, padding: "8px 12px", background: C.surface, border: `1px solid ${C.border}33`, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Item-wise Dispatch Status</div>
                        {(s.items || []).map((it, i) => {
                          const key = (it.itemName || "").toLowerCase().trim();
                          const dispatched = soDispatched[key] || 0;
                          const ordered = +(it.orderQty || 0);
                          const pending = Math.max(0, ordered - dispatched);
                          const pct = ordered > 0 ? Math.round(dispatched / ordered * 100) : 0;
                          const col = pct >= 100 ? C.green : pct > 0 ? C.yellow : C.border;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: i < (s.items||[]).length - 1 ? `1px solid ${C.border}22` : "none", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 160 }}>{it.itemName || "—"}</span>
                              <span style={{ fontSize: 11, color: C.muted }}>Ordered: <strong style={{ color: C.text }}>{fmt(ordered)}</strong></span>
                              <span style={{ fontSize: 11, color: col }}>Dispatched: <strong>{fmt(dispatched)}</strong></span>
                              <span style={{ fontSize: 11, color: pending > 0 ? C.red : C.green }}>Pending: <strong>{fmt(pending)}</strong></span>
                              <div style={{ width: 80, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: col, minWidth: 32 }}>{pct}%</span>
                            </div>
                          );
                        })}
                        {}
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}33` }}>
                          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Dispatch Records</div>
                          {dispatchedDispatches.map((d, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, color: C.muted, padding: "3px 0" }}>
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.purple, fontWeight: 700 }}>{d.dispatchNo}</span>
                              <span>{d.dispatchDate}</span>
                              <span>{(d.items || []).map(it => `${it.itemName}: ${fmt(+it.qty)}`).join(" · ")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(s.items || [s]).map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge label={it.itemCategory || "—"} color={C.purple} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.green }}>{it.itemName || "—"}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>Qty: <strong style={{ color: C.text }}>{it.orderQty || "—"}</strong></span>
                  {it.size && <span style={{ fontSize: 12, color: C.muted }}>Size: {it.size}</span>}
                </div>
              ))}
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: C.muted }}>
                <span>Delivery: {s.deliveryDate || "—"}</span>
                <span>Sales: {s.salesPerson === "__other__" ? s.salesPersonCustom : s.salesPerson}</span>
                {s.remarks && <span>Note: {s.remarks}</span>}
              </div>
            </div>
          )}
        </Card>
      ))}
      {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>No sales orders found.</Card>}
    </div>
  );
}



function restoreRMStock(jo, setRawStock) {
  if (!jo || !jo.paperType || !jo.paperGsm) return;
  const gsm = jo.paperGsm + "gsm";
  const sheetSz = jo.sheetSize || (jo.sheetW && jo.sheetL ? jo.sheetW + "x" + jo.sheetL + (jo.sheetUom || "mm") : "");
  const sheetsToRestore = +(jo.noOfSheets || 0);
  setRawStock(prev => {
    let updated = [...prev];
    const matchIdx = updated.findIndex(r => {
      const n = r.name;
      return n.includes(jo.paperType) &&
             n.includes(gsm) &&
             (sheetSz ? n.includes(sheetSz) : true);
    });
    if (matchIdx >= 0) {
      const r = updated[matchIdx];
      const isSheet = r.unit === "sheets" || r.name.includes("Sheet");
      
      const newQty = (+(r.qty || 0)) + (isSheet ? sheetsToRestore : 0);
      
      const weightToRestore = isSheet && r.weightPerSheet
        ? sheetsToRestore * r.weightPerSheet
        : 0;
      const newWeight = (+(r.weight || 0)) + weightToRestore;
      updated[matchIdx] = { ...r, qty: newQty, weight: newWeight };
    }
    return updated;
  });
}


function printJO(j) {
  var html = "<div style=\'border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center\'><div style=\'font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px\'>AARAY PACKAGING PRIVATE LIMITED</div><div style=\'font-size:10px;color:#666;margin-bottom:1px\'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#666;margin-bottom:4px\'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#444\'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div><div class=\'header\'>" +
    "<div><h1>Job Card</h1><h2>" + j.joNo + "</h2></div>" +
    "<div style=\'text-align:right\'>" +
      "<div style=\'font-size:11px;color:#888\'>Status</div>" +
      "<div style=\'font-weight:bold;font-size:14px\'>" + (j.status || "") + "</div>" +
    "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Basic Details</div><div class=\'field-grid\'>" +
    "<div class=\'field\'><label>Jobcard Date</label><span>" + (j.jobcardDate || "") + "</span></div>" +
    "<div class=\'field\'><label>Sales Order #</label><span>" + (j.soRef || "—") + "</span></div>" +
    "<div class=\'field\'><label>Order Date</label><span>" + (j.orderDate || "—") + "</span></div>" +
    "<div class=\'field\'><label>Delivery Date</label><span>" + (j.deliveryDate || "—") + "</span></div>" +
    "<div class=\'field\'><label>Client Name</label><span>" + (j.clientName || "") + "</span></div>" +
    "<div class=\'field\'><label>Client Category</label><span>" + (j.clientCategory || "") + "</span></div>" +
    "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Item Details</div><div class=\'field-grid\'>" +
    "<div class=\'field\'><label>Item Name</label><span>" + (j.itemName || "") + "</span></div>" +
    "<div class=\'field\'><label>Size</label><span>" + (j.size || "—") + "</span></div>" +
    "<div class=\'field\'><label>Order Qty</label><span>" + (j.orderQty || "—") + "</span></div>" +
    "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Production Details</div><div class=\'field-grid\'>" +
    "<div class=\'field\'><label>Printing</label><span>" + (j.printing || "") + "</span></div>" +
    "<div class=\'field\'><label>Plate</label><span>" + (j.plate || "") + "</span></div>" +
    "<div class=\'field\'><label>Process</label><span>" + ((j.process || []).join(", ") || "—") + "</span></div>" +
    "</div></div>" +
    "<div class=\'section\'><div class=\'section-title\'>Paper 1</div><div class=\'field-grid\'>" +
    "<div class=\'field\'><label>Paper Type</label><span>" + (j.paperType || "") + "</span></div>" +
    "<div class=\'field\'><label>Paper GSM</label><span>" + (j.paperGsm ? j.paperGsm + " gsm" : "—") + "</span></div>" +
    "<div class=\'field\'><label># of Ups</label><span>" + (j.noOfUps || "—") + "</span></div>" +
    "<div class=\'field\'><label># of Sheets</label><span>" + (j.noOfSheets || "—") + "</span></div>" +
    "<div class=\'field\'><label>Sheet W</label><span>" + (j.sheetW ? j.sheetW + " " + (j.sheetUom || "mm") : "—") + "</span></div>" +
    "<div class=\'field\'><label>Sheet L</label><span>" + (j.sheetL ? j.sheetL + " " + (j.sheetUom || "mm") : "—") + "</span></div>" +
    "<div class=\'field\'><label>Sheet Size</label><span>" + (j.sheetSize || "—") + "</span></div>" +
    "</div></div>" +
    (j.hasSecondPaper ?
      "<div class=\'section\'><div class=\'section-title\'>Paper 2</div><div class=\'field-grid\'>" +
      "<div class=\'field\'><label>Paper Type</label><span>" + (j.paperType2 || "") + "</span></div>" +
      "<div class=\'field\'><label>Paper GSM</label><span>" + (j.paperGsm2 ? j.paperGsm2 + " gsm" : "—") + "</span></div>" +
      "<div class=\'field\'><label># of Ups</label><span>" + (j.noOfUps2 || "—") + "</span></div>" +
      "<div class=\'field\'><label># of Sheets</label><span>" + (j.noOfSheets2 || "—") + "</span></div>" +
      "<div class=\'field\'><label>Sheet W</label><span>" + (j.sheetW2 ? j.sheetW2 + " " + (j.sheetUom2 || "mm") : "—") + "</span></div>" +
      "<div class=\'field\'><label>Sheet L</label><span>" + (j.sheetL2 ? j.sheetL2 + " " + (j.sheetUom2 || "mm") : "—") + "</span></div>" +
      "<div class=\'field\'><label>Sheet Size</label><span>" + (j.sheetW2 && j.sheetL2 ? j.sheetW2 + "x" + j.sheetL2 + (j.sheetUom2 || "mm") : "—") + "</span></div>" +
      "</div></div>"
    : "") +
    (j.remarks ? "<div class=\'section\'><div class=\'section-title\'>Remarks</div><p>" + j.remarks + "</p></div>" : "") +
    "<div class=\'footer\'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>";
  var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px}" +
    "h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:16px}" +
    ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}" +
    ".section{margin-top:16px}.section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}" +
    ".field-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}" +
    ".field label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;display:block;margin-bottom:2px}" +
    ".field span{font-size:13px;font-weight:500}" +
    ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
    "@media print{body{margin:10px}}";
  var fullHtml = "<!DOCTYPE html><html><head><title>" + j.joNo + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
  var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = j.joNo + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}


function JORecords({ jobOrders, setJobOrders, salesOrders, sizeMaster, allPaperTypes, fgStock, setFgStock, rawStock, setRawStock, machineMaster, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditJobs = canEdit("jobs");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo,   setDrDateTo]   = useState("");
  const [editId, setEditId]       = useState(null);
  const [editData, setEditData]   = useState(null);
  const [search, setSearch]       = useState("");

  const startEdit = (j) => { setEditId(j.id); setEditData({ ...j }); };
  const cancelEdit = () => { setEditId(null); setEditData(null); };
  const saveEdit = () => {
    
    const rebuilt = buildSchedule(
      { ...editData, _editId: editData.id },
      machineMaster || [],
      jobOrders
    );
    const mergedSchedule = rebuilt.map(newSlot => {
      const old = (editData.schedule || []).find(s => s.process === newSlot.process);
      return { ...newSlot, actualStart: old?.actualStart || "", actualEnd: old?.actualEnd || "", actualQty: old?.actualQty || "", actualNotes: old?.actualNotes || "" };
    });
    setJobOrders(prev => prev.map(j => j.id === editId ? { ...editData, schedule: mergedSchedule } : j));
    toast("Job Order updated");
    cancelEdit();
  };
  const deleteOrder = (id) => {
    const jo = jobOrders.find(j => j.id === id);
    setJobOrders(prev => prev.filter(j => j.id !== id));
    if (jo) {
      setWipStock(prev => prev.filter(w => w.joNo !== jo.joNo));
      setFgStock(prev => prev.filter(f => f.joNo !== jo.joNo));
      restoreRMStock(jo, setRawStock);
    }
    toast("Job Order deleted — RM Stock restored");
    cancelEdit();
  };
  const setED = (k, v) => setEditData(p => ({ ...p, [k]: v }));

  const filtered = React.useMemo(() => jobOrders.slice().reverse().filter(j => {
    const jDate = j.jobcardDate || j.date || "";
    if (drDateFrom && jDate < drDateFrom) return false;
    if (drDateTo   && jDate > drDateTo)   return false;
    return !search || j.joNo.toLowerCase().includes(search.toLowerCase()) ||
      j.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      j.clientName?.toLowerCase().includes(search.toLowerCase());
  }), [jobOrders, search]);


  const exportToExcel = () => {
    const rows = filtered.map(j => ({
      "JO No":           j.joNo || "",
      "Jobcard Date":    j.jobcardDate || j.date || "",
      "SO Ref":          j.soRef || "",
      "Client Name":     j.clientName || "",
      "Client Category": j.clientCategory || "",
      "Item Name":       j.itemName || j.product || "",
      "Size":            j.size || "",
      "Order Qty":       j.orderQty || "",
      "Paper Type":      j.paperType || "",
      "Paper GSM":       j.paperGsm || "",
      "No. of Sheets":   j.noOfSheets || "",
      "Sheet W":         j.sheetW || "",
      "Sheet L":         j.sheetL || "",
      "Printing":        j.printing || "",
      "Plate":           j.plate || "",
      "Process":         (j.process || []).join(", "),
      "Status":          j.status || "Open",
      "Completed":       (j.completedProcesses || []).join(", "),
      "Remarks":         j.remarks || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Job Orders");
    const suffix = drDateFrom || drDateTo ? `_${drDateFrom||""}to${drDateTo||""}` : `_${today()}`;
    xlsxDownload(wb, `Job_Orders${suffix}.xlsx`);
  };

  const lbl = (text) => ({ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <input placeholder="🔍 Search by JO#, item, client..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
        <span style={{ fontSize: 13, color: C.muted }}>{filtered.length} of {jobOrders.length} orders</span>
        <button onClick={exportToExcel} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>⬇ Export Excel</button>
      </div>
      {filtered.map(j => (
        <Card key={j.id} style={{ marginBottom: 12, borderLeft: `3px solid ${j.id === editId ? C.blue : j.status === "Completed" ? C.green : j.status === "Cancelled" ? C.red : C.yellow}` }}>
          {}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, fontWeight: 700, fontSize: 14 }}>{j.joNo}</span>
              <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{j.itemName || j.product || "—"} · {j.clientName || "—"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge label={j.status || "Open"} color={j.status === "Completed" ? C.green : j.status === "Cancelled" ? C.red : j.status?.includes("Pending") ? C.accent : C.muted} />
              {editId !== j.id && (<>
                {canEditJobs && <button onClick={() => startEdit(j)} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>✏️ Edit</button>}
                <button onClick={() => printJO(j)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 PDF</button>
                {canEditJobs && j.status !== "Cancelled" && j.status !== "Completed" && (
                  <button onClick={() => { setJobOrders(prev => prev.map(x => x.id === j.id ? { ...x, status: "Cancelled" } : x)); toast("Job Order cancelled"); }} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>✕</button>
                )}
              </>)}
            </div>
          </div>

          {}
          {editId === j.id && editData ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
                <div><label style={lbl()}>Jobcard Date</label><DatePicker value={editData.jobcardDate} onChange={v => setED("jobcardDate", v)} /></div>
                <div><label style={lbl()}>Client Name</label><input value={editData.clientName || ""} onChange={e => setED("clientName", e.target.value)} /></div>
                <div><label style={lbl()}>Client Category</label>
                  <select value={editData.clientCategory || ""} onChange={e => setED("clientCategory", e.target.value)}>
                    {["HP", "ZPL", "Others", "Unprinted"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl()}>Item Name</label><input value={editData.itemName || ""} onChange={e => setED("itemName", e.target.value)} /></div>
                <div><label style={lbl()}>Size</label><input value={editData.size || ""} onChange={e => setED("size", e.target.value)} /></div>
                <div><label style={lbl()}>Order Qty</label><input type="number" value={editData.orderQty || ""} onChange={e => setED("orderQty", e.target.value)} /></div>
                <div><label style={lbl()}>Printing</label>
                  <select value={editData.printing || "Plain"} onChange={e => setED("printing", e.target.value)}>
                    {["Plain","1","2","3","4","5","6"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={lbl()}>Plate</label>
                  <select value={editData.plate || "Plain"} onChange={e => setED("plate", e.target.value)}>
                    {["Plain","Old","New"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={lbl()}>Paper Type</label>
                  <select value={editData.paperType || ""} onChange={e => setED("paperType", e.target.value)}>
                    <option value="">-- Select --</option>
                    {allPaperTypes.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={lbl()}>Paper GSM</label><input type="number" value={editData.paperGsm || ""} onChange={e => setED("paperGsm", e.target.value)} /></div>
                <div><label style={lbl()}># of Sheets</label><input type="number" value={editData.noOfSheets || ""} onChange={e => setED("noOfSheets", e.target.value)} /></div>
                <div><label style={lbl()}>Sheet W</label><input type="number" value={editData.sheetW || ""} onChange={e => setED("sheetW", e.target.value)} /></div>
                <div><label style={lbl()}>Sheet L</label><input type="number" value={editData.sheetL || ""} onChange={e => setED("sheetL", e.target.value)} /></div>
                <div><label style={lbl()}>Remarks</label><input value={editData.remarks || ""} onChange={e => setED("remarks", e.target.value)} /></div>
                <div><label style={lbl()}>Status</label>
                  <select value={editData.status || "Open"} onChange={e => setED("status", e.target.value)}>
                    {["Open", "In Progress", "QC Pending", "Dispatch Ready", "Completed", "Cancelled"].map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl()}>Process</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Printing","Varnish","Lamination","Die Cutting","Formation","Manual Formation"].map(p => {
                    const sel = (editData.process || []).includes(p);
                    return <div key={p} onClick={() => setED("process", sel ? (editData.process || []).filter(x => x !== p) : [...(editData.process || []), p])}
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: sel ? C.accent + "22" : C.surface, border: `1px solid ${sel ? C.accent : C.border}`, color: sel ? C.accent : C.muted }}>
                      {sel ? "✓ " : ""}{p}
                    </div>;
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={saveEdit} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12 }}>Save</button>
                <button onClick={cancelEdit} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                {canEditJobs && <button onClick={() => deleteOrder(j.id)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, marginLeft: "auto" }}>Delete</button>}
              </div>
            </div>
          ) : (
            
            <div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: C.muted, marginBottom: (j.schedule || []).length ? 8 : 0 }}>
                <span>Date: {j.jobcardDate || j.date || "—"}</span>
                <span>SO: <span style={{ color: C.green, fontFamily: "'JetBrains Mono',monospace" }}>{j.soRef || "—"}</span></span>
                <span>Printing: <strong style={{ color: C.text }}>{j.printing || "—"}</strong></span>
                <span>Paper: {j.paperType || "—"} {j.paperGsm ? `${j.paperGsm}gsm` : ""}</span>
                {j.hasSecondPaper && j.paperType2 && <span style={{ color: C.accent }}>Paper 2: {j.paperType2} {j.paperGsm2 ? `${j.paperGsm2}gsm` : ""}</span>}
                <span>Sheets: {j.noOfSheets || "—"}</span>
                {(j.process || []).length > 0 && <div style={{ display: "flex", gap: 4 }}>{(j.process || []).map(p => <Badge key={p} label={p} color={C.accent} />)}</div>}
              </div>
              {}
              {(j.schedule || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {j.schedule.map((slot, i) => {
                    const col = PROCESS_COLORS[slot.process] || C.accent;
                    const isLate = slot.endDate && slot.endDate < today() && !slot.actualEnd;
                    const isDone = !!slot.actualEnd;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 5, background: isDone ? C.green + "18" : isLate ? C.red + "18" : col + "18", border: `1px solid ${isDone ? C.green + "44" : isLate ? C.red + "44" : col + "33"}`, fontSize: 11 }}>
                        <span style={{ fontWeight: 700, color: isDone ? C.green : isLate ? C.red : col }}>{slot.process}</span>
                        <span style={{ color: C.muted }}>{slot.machineName !== "Unassigned" ? slot.machineName : "—"}</span>
                        <span style={{ color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{slot.startDate} → {slot.endDate}</span>
                        {isDone && <span style={{ color: C.green }}>✓</span>}
                        {isLate && <span style={{ color: C.red }}>⚠</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
      {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>No job orders found.</Card>}
    </div>
  );
}


function printPO(po) {
  const hasRM = (po.items || []).some(it => !it.materialType || it.materialType === "Raw Material");

  var itemRows = (po.items || []).map(function(it) {
    var isRM = !it.materialType || it.materialType === "Raw Material";
    if (isRM) {
      var qty = it.rmItem === "Paper Reel"
        ? (it.noOfReels ? it.noOfReels + " reels" : "") + (it.weight ? (it.noOfReels ? " / " : "") + it.weight + " kg" : "") || "—"
        : (it.noOfSheets ? it.noOfSheets + " sheets" : "") + (it.weight ? (it.noOfSheets ? " / " : "") + it.weight + " kg" : "") || "—";
      return "<tr>" +
        "<td><span style='font-size:10px;color:#888;display:block'>Raw Material</span>" + (it.itemName || "") + "</td>" +
        (hasRM ? "<td>" + (it.rmItem || "—") + "</td><td>" + (it.paperType || "—") + "</td><td>" + (it.gsm ? it.gsm + "gsm" : "—") + "</td>" : "") +
        "<td>" + (it.widthMm || "") + (it.lengthMm ? "x" + it.lengthMm : "") + (it.widthMm ? "mm" : "—") + "</td>" +
        "<td>" + qty + "</td>" +
        "<td>" + (it.rate ? "₹" + it.rate + "/kg" : "—") + "</td>" +
        "<td style='font-weight:bold'>" + (it.amount ? "₹" + (+it.amount).toLocaleString("en-IN") : "—") + "</td>" +
        "</tr>";
    } else {
      var qtyStr = it.qty ? it.qty + " " + (it.unit || "") : "—";
      var rateStr = it.rate ? "₹" + it.rate + "/" + (it.unit || "unit") : "—";
      var sizeInfo = [it.size, it.uom && it.size ? it.uom : ""].filter(Boolean).join(" ") || "—";
      return "<tr>" +
        "<td><span style='font-size:10px;color:#888;display:block'>" + (it.materialType || "") + (it.category ? " · " + it.category : "") + "</span>" + (it.itemName || "") + "</td>" +
        (hasRM ? "<td style='color:#aaa'>—</td><td style='color:#aaa'>—</td><td style='color:#aaa'>—</td>" : "") +
        "<td style='color:#888;font-size:11px'>" + sizeInfo + "</td>" +
        "<td>" + qtyStr + "</td>" +
        "<td>" + rateStr + "</td>" +
        "<td style='font-weight:bold'>" + (it.amount ? "₹" + (+it.amount).toLocaleString("en-IN") : "—") + "</td>" +
        "</tr>";
    }
  }).join("");

  var total = (po.items || []).reduce(function(s, it) { return s + (+(it.amount || 0)); }, 0);
  var statusColor = po.status === "Received" ? "#22c55e" : po.status === "Partial" ? "#f59e0b" : po.status === "Cancelled" ? "#ef4444" : "#3b82f6";
  var html = "<div style=\'border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center\'><div style=\'font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px\'>AARAY PACKAGING PRIVATE LIMITED</div><div style=\'font-size:10px;color:#666;margin-bottom:1px\'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#666;margin-bottom:4px\'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div><div style=\'font-size:10px;color:#444\'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div><div class='header'>" +
    "<div><h1>Purchase Order</h1><h2>" + po.poNo + "</h2></div>" +
    "<div style='text-align:right'>" +
      "<div style='font-size:11px;color:#888'>Status</div>" +
      "<div style='font-weight:bold;color:" + statusColor + "'>" + (po.status || "Open") + "</div>" +
    "</div></div>" +
    "<div class='section'><div class='section-title'>Order Details</div>" +
    "<div class='field-grid'>" +
      "<div class='field'><label>PO Date</label><span>" + (po.poDate || "") + "</span></div>" +
      "<div class='field'><label>Delivery Date</label><span>" + (po.deliveryDate || "—") + "</span></div>" +
      "<div class='field'><label>Vendor Name</label><span>" + (po.vendorName || "") + "</span></div>" +
      "<div class='field'><label>Vendor Contact</label><span>" + (po.vendorContact || "—") + "</span></div>" +
    "</div></div>" +
    "<div class='section'><div class='section-title'>Items</div>" +
    "<table><thead><tr>" +
      "<th>Item Name</th>" +
      (hasRM ? "<th>RM Item</th><th>Paper Type</th><th>GSM</th>" : "") +
      "<th>Size</th><th>Qty</th><th>Rate</th><th>Amount</th>" +
    "</tr></thead><tbody>" + itemRows + "</tbody></table>" +
    (total > 0 ? "<div class='total'>Total: ₹" + total.toLocaleString("en-IN") + "</div>" : "") + "</div>" +
    (po.remarks ? "<div class='section'><div class='section-title'>Remarks</div><p>" + po.remarks + "</p></div>" : "");

  var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px}" +
    "h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:16px}" +
    "table{width:100%;border-collapse:collapse;margin-top:12px}" +
    "th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd}" +
    "td{padding:6px 10px;border:1px solid #eee;font-size:12px}" +
    "tr:nth-child(even) td{background:#fafafa}" +
    ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}" +
    ".section{margin-top:16px}" +
    ".section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}" +
    ".field-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}" +
    ".field label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;display:block;margin-bottom:2px}" +
    ".field span{font-size:13px;font-weight:500}" +
    ".total{text-align:right;font-weight:bold;font-size:14px;margin-top:8px}" +
    "@media print{body{margin:10px}}";
  var fullHtml = "<!DOCTYPE html><html><head><title>" + po.poNo + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
  var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = po.poNo + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function PurchaseOrders({ purchaseOrders, setPurchaseOrders, poCounter, setPoCounter, rawStock, clientMaster, categoryMaster, sizeMaster, vendorMaster, itemMasterFG, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditPurchase = canEdit("purchase");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo,   setDrDateTo]   = useState("");
  const blankHeader = { poDate: today(), deliveryDate: "", vendorName: "", vendorContact: "", remarks: "", status: "Open" };
  const blankItem = () => ({ _id: uid(), materialType: "Raw Material", productCode: "", rmItem: "", paperType: "", widthMm: "", lengthMm: "", gsm: "", noOfSheets: "", noOfReels: "", weight: "", rate: "", amount: "", itemName: "", qty: "", unit: "nos", category: "", size: "", uom: "nos" });

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");

  const rmCategories = (categoryMaster && categoryMaster["Raw Material"]) || ["Paper Reel", "Paper Sheet"];
  const consumableCategories = (categoryMaster && categoryMaster["Consumable"]) || [];
  const allPOCategories = [...rmCategories, ...consumableCategories];

  
  const paperTypesByItem = {
    "Paper Reel":   (sizeMaster && sizeMaster["Paper Reel"])  || PAPER_TYPES_BY_ITEM["Paper Reel"],
    "Paper Sheets": (sizeMaster && sizeMaster["Paper Sheet"]) || PAPER_TYPES_BY_ITEM["Paper Sheets"],
  };

  const setH = (k, v) => {
    setHeader(f => ({ ...f, [k]: v }));
    setHeaderErrors(e => ({ ...e, [k]: false }));
  };
  const EH = k => headerErrors[k] ? { border: "1px solid " + C.red } : {};
  const EHMsg = k => headerErrors[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;


  const setItem = (idx, k, v) => {
    setItems(prev => {
      const updated = [...prev];
      const it = { ...updated[idx], [k]: v };
      
      if (k === "productCode" && v) {
        const masterItem = (itemMasterFG["Raw Material"] || []).find(x => (x.code || "").toLowerCase() === v.toLowerCase());
        if (masterItem) {
          const name = masterItem.name || "";
          if (name.includes("Paper Reel")) {
            it.rmItem = "Paper Reel";
            const gsmMatch = name.match(/(\d+)gsm/);
            const widthMatch = name.match(/(\d+)mm/);
            const paperTypes = ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"];
            const foundType = paperTypes.find(t => name.includes(t));
            if (gsmMatch) it.gsm = gsmMatch[1];
            if (widthMatch) it.widthMm = widthMatch[1];
            if (foundType) it.paperType = foundType;
          } else if (name.includes("Sheet")) {
            it.rmItem = "Paper Sheets";
            const gsmMatch = name.match(/(\d+)gsm/);
            const dimMatch = name.match(/(\d+)x(\d+)mm/);
            const widthMatch = name.match(/(\d+)mm/);
            const paperTypes = ["White PE Coated", "Kraft PE Coated", "Kraft Uncoated", "SBS/FBB", "Whiteback", "Greyback", "Art Paper", "Gumming Sheet"];
            const foundType = paperTypes.find(t => name.includes(t));
            if (gsmMatch) it.gsm = gsmMatch[1];
            if (dimMatch) { it.widthMm = dimMatch[1]; it.lengthMm = dimMatch[2]; }
            else if (widthMatch) it.widthMm = widthMatch[1];
            if (foundType) it.paperType = foundType;
          }
          it.itemName = masterItem.name;
        }
      }
      if (k === "materialType") { it.rmItem = ""; it.paperType = ""; it.itemName = ""; it.productCode = ""; it.widthMm = ""; it.lengthMm = ""; it.gsm = ""; it.noOfSheets = ""; it.noOfReels = ""; it.weight = ""; it.qty = ""; it.category = ""; it.size = ""; it.uom = "nos"; it.width = ""; it.length = ""; it.height = ""; }
      if (k === "rmItem") { it.paperType = ""; it.itemName = ""; it.productCode = ""; }
      const isRM = it.materialType === "Raw Material" || !it.materialType;
      it.itemName = isRM ? computeRMItemName(it) : computeConsumableItemName(it);
      
      const weight = k === "weight" ? +v : +(it.weight || 0);
      const qty    = k === "qty"    ? +v : +(it.qty    || 0);
      const rate   = k === "rate"   ? +v : +(it.rate   || 0);
      it.amount = isRM ? (weight && rate ? (weight * rate).toFixed(2) : "") : (qty && rate ? (qty * rate).toFixed(2) : "");
      updated[idx] = it;
      return updated;
    });
    setItemErrors(prev => { const e = [...prev]; e[idx] = { ...(e[idx] || {}), [k]: false }; return e; });
  };
  const EI = (idx, k) => (itemErrors[idx] || {})[k] ? { border: "1px solid " + C.red } : {};
  const EIMsg = (idx, k) => (itemErrors[idx] || {})[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;

  const addItem = () => { setItems(p => [...p, blankItem()]); setItemErrors(p => [...p, {}]); };
  const removeItem = idx => { if (items.length === 1) return; setItems(p => p.filter((_, i) => i !== idx)); setItemErrors(p => p.filter((_, i) => i !== idx)); };

  const submit = () => {
    const he = {};
    if (!header.poDate) he.poDate = true;
    if (!header.vendorName) he.vendorName = true;
    setHeaderErrors(he);
    const allItemErrors = items.map(it => {
      const e = {};
      if (it.materialType === "Raw Material" || !it.materialType) {
        if (!it.rmItem) e.rmItem = true;
        if (!it.paperType) e.paperType = true;
        if (!it.widthMm) e.widthMm = true;
        if (it.rmItem !== "Paper Reel" && !it.lengthMm) e.lengthMm = true;
        if (!it.gsm) e.gsm = true;
        if (it.rmItem === "Paper Sheets" && !it.noOfSheets) e.noOfSheets = true;
        if (it.rmItem === "Paper Reel" && !it.noOfReels) e.noOfReels = true;
      } else {
        if (!it.itemName) e.itemName = true;
        if (!it.qty) e.qty = true;
        if (!it.unit) e.unit = true;
      }
      return e;
    });
    setItemErrors(allItemErrors);
    if (Object.keys(he).length > 0 || allItemErrors.some(e => Object.keys(e).length > 0)) {
      const FIELD_LABELS = { poDate: "PO Date", vendorName: "Vendor Name", rmItem: "RM Item", paperType: "Paper Type", widthMm: "Width (mm)", lengthMm: "Length (mm)", gsm: "GSM", noOfSheets: "No. of Sheets", noOfReels: "No. of Reels", itemName: "Item Name", qty: "Quantity", unit: "Unit" };
      const msgs = [];
      Object.keys(he).forEach(k => msgs.push(FIELD_LABELS[k] || k));
      allItemErrors.forEach((e, idx) => Object.keys(e).forEach(k => msgs.push(`Item ${idx + 1}: ${FIELD_LABELS[k] || k}`)));
      toast([...new Set(msgs)], "validation");
      return;
    }
    const poNo = "PO-" + poCounter;
    setPoCounter(n => n + 1);
    setPurchaseOrders(p => [...p, { ...header, poNo, id: uid(), items }]);
    toast("Purchase Order created: " + poNo);
    setHeader(blankHeader);
    setItems([blankItem()]);
    setHeaderErrors({});
    setItemErrors([{}]);
  };

  const filtered = React.useMemo(() => purchaseOrders.slice().reverse().filter(p => {
    if (drDateFrom && (p.poDate || "") < drDateFrom) return false;
    if (drDateTo   && (p.poDate || "") > drDateTo)   return false;
    return !search || p.poNo.toLowerCase().includes(search.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(search.toLowerCase());
  }), [purchaseOrders, search]);


  const saveEdit = () => {
    setPurchaseOrders(prev => prev.map(p => p.id === editId ? { ...editData } : p));
    toast("Purchase Order updated"); setEditId(null); setEditData(null);
  };

  const exportToExcel = () => {
    const rows = [];
    filtered.forEach(p => {
      (p.items || []).forEach(it => {
        rows.push({
          "PO No":           p.poNo || "",
          "PO Date":         p.poDate || "",
          "Delivery Date":   p.deliveryDate || "",
          "Vendor Name":     p.vendorName || "",
          "Vendor Contact":  p.vendorContact || "",
          "Status":          p.status || "Open",
          "Product Code":    it.productCode || "",
          "Item Name":       it.itemName || "",
          "RM Item":         it.rmItem || "",
          "Paper Type":      it.paperType || "",
          "GSM":             it.gsm || "",
          "Width (mm)":      it.widthMm || "",
          "Length (mm)":     it.lengthMm || "",
          "No. of Sheets":   it.noOfSheets || "",
          "No. of Reels":    it.noOfReels || "",
          "Weight (kg)":     it.weight || "",
          "Rate (₹)":        it.rate || "",
          "Amount (₹)":      it.amount || "",
          "Remarks":         p.remarks || "",
        });
      });
      if (!(p.items || []).length) {
        rows.push({
          "PO No": p.poNo || "", "PO Date": p.poDate || "", "Delivery Date": p.deliveryDate || "",
          "Vendor Name": p.vendorName || "", "Vendor Contact": p.vendorContact || "",
          "Status": p.status || "Open", "Product Code": "", "Item Name": "", "RM Item": "",
          "Paper Type": "", "GSM": "", "Width (mm)": "", "Length (mm)": "",
          "No. of Sheets": "", "No. of Reels": "", "Weight (kg)": "", "Rate (₹)": "", "Amount (₹)": "",
          "Remarks": p.remarks || "",
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");
    const suffix = drDateFrom || drDateTo ? `_${drDateFrom||""}to${drDateTo||""}` : `_${today()}`;
    xlsxDownload(wb, `Purchase_Orders${suffix}.xlsx`);
  };

  return (
    <div className="fade">
      <SectionTitle icon="🛒" title="Purchase Orders" sub="Create and track purchase orders for raw materials" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["form", "📝 New PO"], ["records", "📋 Records (" + purchaseOrders.length + ")"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: "1px solid " + (view === v ? C.blue : C.border),
            background: view === v ? C.blue + "22" : "transparent",
            color: view === v ? C.blue : C.muted
          }}>{l}</button>
        ))}
      </div>

      {view === "form" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 16 }}>Order & Vendor Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              <Field label="PO Date *"><DatePicker value={header.poDate} onChange={v => setH("poDate", v)} style={EH("poDate")} />{EHMsg("poDate")}</Field>
              <Field label="Delivery Date"><DatePicker value={header.deliveryDate} onChange={v => setH("deliveryDate", v)} /></Field>
              <Field label="Vendor Name *">
                <AutocompleteInput
                  value={header.vendorName}
                  onChange={v => setH("vendorName", v)}
                  suggestions={(vendorMaster || []).map(v => v.name)}
                  placeholder="Vendor / Supplier name"
                  inputStyle={EH("vendorName")}
                />
                {EHMsg("vendorName")}
              </Field>
              <Field label="Vendor Contact">
                <input placeholder="Phone / email" value={header.vendorContact || ""} onChange={e => setH("vendorContact", e.target.value)} />
              </Field>
              <Field label="Status">
                <select value={header.status} onChange={e => setH("status", e.target.value)}>
                  {["Open", "Partial", "Received", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Remarks" span={2}>
                <input placeholder="Special instructions" value={header.remarks || ""} onChange={e => setH("remarks", e.target.value)} />
              </Field>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>Items ({items.length})</h3>
            <button onClick={addItem} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13 }}>+ Add Item</button>
          </div>

          {items.map((it, idx) => (
            <Card key={it._id} style={{ marginBottom: 12, borderLeft: "3px solid " + C.blue }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: C.blue, fontSize: 13 }}>Item {idx + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 5, padding: "4px 12px", fontWeight: 700, fontSize: 12 }}>✕ Remove</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {}
                <Field label="Product Code">
                  <AutocompleteInput
                    value={it.productCode || ""}
                    onChange={v => setItem(idx, "productCode", v.includes(" — ") ? v.split(" — ")[0] : v)}
                    suggestions={(() => {
                      const type = it.materialType === "Consumable" ? "Consumable" : it.materialType === "Machine Spare" ? "Machine Spare" : it.materialType === "Other" ? "Other" : "Raw Material";
                      return (itemMasterFG[type] || []).filter(x => x.code).map(x => x.code + " — " + x.name);
                    })()}
                    placeholder="Type or select code (optional)"
                  />
                </Field>

                {}
                <Field label="Material Type *">
                  <select value={it.materialType || "Raw Material"} onChange={e => setItem(idx, "materialType", e.target.value)}>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Machine Spare">Machine Spare</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>

                {}
                {(it.materialType === "Raw Material" || !it.materialType) && (<>
                  <Field label="RM Item *">
                    <select value={it.rmItem || ""} onChange={e => setItem(idx, "rmItem", e.target.value)} style={EI(idx, "rmItem")}>
                      <option value="">-- Select Item --</option>
                      {RM_ITEMS.map(i => <option key={i}>{i}</option>)}
                    </select>
                    {EIMsg(idx, "rmItem")}
                  </Field>
                  <Field label="Paper Type *">
                    <select value={it.paperType || ""} onChange={e => setItem(idx, "paperType", e.target.value)} disabled={!it.rmItem} style={EI(idx, "paperType")}>
                      <option value="">{it.rmItem ? "-- Select Type --" : "-- Select RM Item first --"}</option>
                      {(paperTypesByItem[it.rmItem] || []).map(p => <option key={p}>{p}</option>)}
                    </select>
                    {EIMsg(idx, "paperType")}
                  </Field>
                  <Field label="Width (mm) *">
                    <input type="number" placeholder="e.g. 700" value={it.widthMm || ""} onChange={e => setItem(idx, "widthMm", e.target.value)} style={EI(idx, "widthMm")} />
                    {EIMsg(idx, "widthMm")}
                  </Field>
                  {it.rmItem !== "Paper Reel" && (
                    <Field label="Length (mm) *">
                      <input type="number" placeholder="e.g. 1000" value={it.lengthMm || ""} onChange={e => setItem(idx, "lengthMm", e.target.value)} style={EI(idx, "lengthMm")} />
                      {EIMsg(idx, "lengthMm")}
                    </Field>
                  )}
                  <Field label="GSM *">
                    <input type="number" placeholder="e.g. 90, 130, 250" value={it.gsm || ""} onChange={e => setItem(idx, "gsm", e.target.value)} style={EI(idx, "gsm")} />
                    {EIMsg(idx, "gsm")}
                  </Field>
                  {it.rmItem === "Paper Sheets" && (
                    <Field label="No. of Sheets *">
                      <input type="number" placeholder="Qty in sheets" value={it.noOfSheets || ""} onChange={e => setItem(idx, "noOfSheets", e.target.value)} style={EI(idx, "noOfSheets")} />
                      {EIMsg(idx, "noOfSheets")}
                    </Field>
                  )}
                  {it.rmItem === "Paper Reel" && (
                    <Field label="No. of Reels">
                      <input type="number" placeholder="Qty in reels" value={it.noOfReels || ""} onChange={e => setItem(idx, "noOfReels", e.target.value)} />
                    </Field>
                  )}
                  <Field label={it.rmItem === "Paper Reel" ? "Weight (kg) *" : "Weight (kg)"}>
                    <input type="number" placeholder="Weight in kg" value={it.weight || ""} onChange={e => setItem(idx, "weight", e.target.value)} style={it.rmItem === "Paper Reel" ? EI(idx, "weight") : {}} />
                    {it.rmItem === "Paper Reel" && EIMsg(idx, "weight")}
                  </Field>
                  <Field label="Rate (₹/kg)">
                    <input type="number" placeholder="Rate per kg" value={it.rate || ""} onChange={e => setItem(idx, "rate", e.target.value)} />
                  </Field>
                  <Field label="Amount (₹)">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: it.amount ? C.green : C.muted, fontWeight: it.amount ? 700 : 400, fontFamily: it.amount ? "'JetBrains Mono',monospace" : undefined }}>
                      {it.amount ? "₹" + fmt(+it.amount) : "— Weight × Rate —"}
                    </div>
                  </Field>
                  <Field label="Item Name" span={2}>
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: it.itemName ? C.blue : C.muted, fontWeight: it.itemName ? 700 : 400, fontFamily: it.itemName ? "'JetBrains Mono',monospace" : undefined }}>
                      {it.itemName || "— Auto-filled from material details —"}
                    </div>
                  </Field>
                </>)}

                {}
                {it.materialType && it.materialType !== "Raw Material" && (<>
                  <Field label="Category">
                    {(() => {
                      const cats = (categoryMaster && categoryMaster[it.materialType]) || [];
                      return cats.length > 0 ? (
                        <select value={it.category || ""} onChange={e => setItem(idx, "category", e.target.value)}>
                          <option value="">-- Select Category --</option>
                          {cats.map(c => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input placeholder="Category (optional)" value={it.category || ""} onChange={e => setItem(idx, "category", e.target.value)} />
                      );
                    })()}
                  </Field>
                  <Field label="Item Name *">
                    <input placeholder={`e.g. Tape, Bearing, Ink...`} value={it.itemName || ""} onChange={e => setItem(idx, "itemName", e.target.value)} style={EI(idx, "itemName")} />
                    {EIMsg(idx, "itemName")}
                  </Field>
                  {it.materialType === "Consumable" && (<>
                    <Field label="Size">
                      <input placeholder="e.g. 2 inch, 50mm, A4..." value={it.size || ""} onChange={e => setItem(idx, "size", e.target.value)} />
                    </Field>
                    <Field label="UOM">
                      <select value={it.uom || "nos"} onChange={e => setItem(idx, "uom", e.target.value)}>
                        {["nos", "inch", "mm", "cm", "mtrs", "kg", "ltrs", "roll", "box", "set"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </Field>
                    {CONSUMABLE_BOX_CATS.includes(it.category) && (<>
                      <Field label="Width *"><input type="number" placeholder="e.g. 24" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} /></Field>
                      <Field label="Length *"><input type="number" placeholder="e.g. 18" value={it.length || ""} onChange={e => setItem(idx, "length", e.target.value)} /></Field>
                      <Field label="Height *"><input type="number" placeholder="e.g. 18" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} /></Field>
                    </>)}
                    {CONSUMABLE_BAG_CATS.includes(it.category) && (<>
                      <Field label="Width *"><input type="number" placeholder="e.g. 18" value={it.width || ""} onChange={e => setItem(idx, "width", e.target.value)} /></Field>
                      <Field label="Height *"><input type="number" placeholder="e.g. 24" value={it.height || ""} onChange={e => setItem(idx, "height", e.target.value)} /></Field>
                    </>)}
                    {(CONSUMABLE_BOX_CATS.includes(it.category) || CONSUMABLE_BAG_CATS.includes(it.category)) && (
                      <Field label="Item Name" span={2}>
                        <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: it.itemName ? C.green : C.muted, fontWeight: it.itemName ? 700 : 400, fontFamily: it.itemName ? "'JetBrains Mono',monospace" : undefined }}>
                          {it.itemName || "— Auto-filled from dimensions —"}
                        </div>
                      </Field>
                    )}
                  </>)}
                  <Field label="Quantity *">
                    <input type="number" placeholder="e.g. 10" value={it.qty || ""} onChange={e => setItem(idx, "qty", e.target.value)} style={EI(idx, "qty")} />
                    {EIMsg(idx, "qty")}
                  </Field>
                  <Field label="Unit *">
                    <select value={it.unit || "nos"} onChange={e => setItem(idx, "unit", e.target.value)} style={EI(idx, "unit")}>
                      {["nos", "kg", "ltrs", "mtrs", "box", "roll", "set", "pair"].map(u => <option key={u}>{u}</option>)}
                    </select>
                    {EIMsg(idx, "unit")}
                  </Field>
                  <Field label="Rate (₹/unit)">
                    <input type="number" placeholder="Rate per unit" value={it.rate || ""} onChange={e => setItem(idx, "rate", e.target.value)} />
                  </Field>
                  <Field label="Amount (₹)">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: it.amount ? C.green : C.muted, fontWeight: it.amount ? 700 : 400, fontFamily: it.amount ? "'JetBrains Mono',monospace" : undefined }}>
                      {it.amount ? "₹" + fmt(+it.amount) : "— Qty × Rate —"}
                    </div>
                  </Field>
                </>)}
              </div>
            </Card>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={addItem} style={{ background: C.blue + "22", color: C.blue, border: "1px solid " + C.blue + "44", borderRadius: 6, padding: "9px 20px", fontWeight: 700, fontSize: 13 }}>+ Add Another Item</button>
            <SubmitBtn label={"Create Purchase Order (" + items.length + " item" + (items.length > 1 ? "s" : "") + ")"} color={C.blue} onClick={submit} />
            {items.some(it => it.amount) && (
              <div style={{ marginLeft: "auto", padding: "9px 16px", background: C.blue + "22", border: "1px solid " + C.blue + "44", borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Total: </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.blue, fontSize: 14 }}>
                  {"₹" + fmt(items.reduce((sum, it) => sum + (+(it.amount || 0)), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "records" && (
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <input placeholder="🔍 Search by PO# or vendor..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
            <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
            <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} of {purchaseOrders.length} records</span>
            <button onClick={exportToExcel} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>⬇ Export Excel</button>
          </div>
          {filtered.map(p => (
            <Card key={p.id} style={{ marginBottom: 12, borderLeft: "3px solid " + (editId === p.id ? C.yellow : C.blue) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.blue, fontWeight: 700, fontSize: 14 }}>{p.poNo}</span>
                  <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{p.vendorName} · {p.poDate}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={p.status || "Open"} color={p.status === "Received" ? C.green : p.status === "Cancelled" ? C.red : p.status === "Partial" ? C.yellow : C.blue} />
                  {editId !== p.id && (<>
                    {canEditPurchase && <button onClick={() => { setEditId(p.id); setEditData({ ...p }); }} style={{ background: C.blue + "22", color: C.blue, border: "1px solid " + C.blue + "44", borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>✏️ Edit</button>}
                    <button onClick={() => printPO(p)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 PDF</button>
                  </>)}
                </div>
              </div>
              {editId === p.id && editData ? (
                <div>
                  {}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>PO Date</label><DatePicker value={editData.poDate} onChange={v => setEditData(p => ({ ...p, poDate: v }))} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Delivery Date</label><DatePicker value={editData.deliveryDate} onChange={v => setEditData(p => ({ ...p, deliveryDate: v }))} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Vendor Name</label><input value={editData.vendorName || ""} onChange={e => setEditData(p => ({ ...p, vendorName: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Vendor Contact</label><input value={editData.vendorContact || ""} onChange={e => setEditData(p => ({ ...p, vendorContact: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Status</label>
                      <select value={editData.status || "Open"} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                        {["Open", "Partial", "Received", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Remarks</label><input value={editData.remarks || ""} onChange={e => setEditData(p => ({ ...p, remarks: e.target.value }))} /></div>
                  </div>

                  {}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Items</div>
                    {(editData.items || []).map((it, idx) => {
                      const setItField = (k, v) => setEditData(prev => {
                        const items = [...(prev.items || [])];
                        const updated = { ...items[idx], [k]: v };
                        
                        if (k === "weight" || k === "rate") {
                          const w = k === "weight" ? +v : +(updated.weight || 0);
                          const r = k === "rate" ? +v : +(updated.rate || 0);
                          updated.amount = w > 0 && r > 0 ? String(w * r) : "";
                        }
                        if (k === "rmItem") { updated.paperType = ""; updated.itemName = ""; }
                        
                        if (updated.rmItem === "Paper Reel") {
                          updated.itemName = [updated.paperType, "Paper Reel", updated.gsm ? updated.gsm + "gsm" : "", updated.widthMm ? updated.widthMm + "mm" : ""].filter(Boolean).join(" ");
                        } else if (updated.rmItem === "Paper Sheets") {
                          updated.itemName = [updated.paperType, "Sheet", updated.gsm ? updated.gsm + "gsm" : "", (updated.widthMm && updated.lengthMm) ? updated.widthMm + "x" + updated.lengthMm + "mm" : updated.widthMm ? updated.widthMm + "mm" : ""].filter(Boolean).join(" ");
                        }
                        items[idx] = updated;
                        return { ...prev, items };
                      });
                      return (
                        <Card key={it._id || idx} style={{ marginBottom: 10, borderLeft: "2px solid " + C.blue + "66" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontWeight: 700, color: C.blue, fontSize: 12 }}>Item {idx + 1}</span>
                            {(editData.items || []).length > 1 && (
                              <button onClick={() => setEditData(prev => ({ ...prev, items: (prev.items || []).filter((_, i) => i !== idx) }))}
                                style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>✕ Remove</button>
                            )}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>RM Item</label>
                              <select value={it.rmItem || ""} onChange={e => setItField("rmItem", e.target.value)} style={{ fontSize: 12 }}>
                                <option value="">-- Select --</option>
                                {RM_ITEMS.map(i => <option key={i}>{i}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Paper Type</label>
                              <select value={it.paperType || ""} onChange={e => setItField("paperType", e.target.value)} disabled={!it.rmItem} style={{ fontSize: 12 }}>
                                <option value="">-- Select --</option>
                                {(paperTypesByItem[it.rmItem] || []).map(pt => <option key={pt}>{pt}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>GSM</label>
                              <input type="number" value={it.gsm || ""} onChange={e => setItField("gsm", e.target.value)} placeholder="e.g. 90" style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Width (mm)</label>
                              <input type="number" value={it.widthMm || ""} onChange={e => setItField("widthMm", e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                            {it.rmItem !== "Paper Reel" && (
                              <div>
                                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Length (mm)</label>
                                <input type="number" value={it.lengthMm || ""} onChange={e => setItField("lengthMm", e.target.value)} style={{ fontSize: 12 }} />
                              </div>
                            )}
                            {it.rmItem === "Paper Sheets" && (
                              <div>
                                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>No. of Sheets</label>
                                <input type="number" value={it.noOfSheets || ""} onChange={e => setItField("noOfSheets", e.target.value)} style={{ fontSize: 12 }} />
                              </div>
                            )}
                            {it.rmItem === "Paper Reel" && (
                              <div>
                                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>No. of Reels</label>
                                <input type="number" value={it.noOfReels || ""} onChange={e => setItField("noOfReels", e.target.value)} style={{ fontSize: 12 }} />
                              </div>
                            )}
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Weight (kg)</label>
                              <input type="number" value={it.weight || ""} onChange={e => setItField("weight", e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Rate (₹/kg)</label>
                              <input type="number" value={it.rate || ""} onChange={e => setItField("rate", e.target.value)} style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 3 }}>Amount (₹)</label>
                              <div style={{ padding: "8px 10px", background: C.inputBg, border: "1px solid " + C.border, borderRadius: 6, fontSize: 12, color: it.amount ? C.green : C.muted, fontFamily: it.amount ? "'JetBrains Mono',monospace" : undefined }}>
                                {it.amount ? "₹" + fmt(+it.amount) : "— auto —"}
                              </div>
                            </div>
                          </div>
                          {it.itemName && (
                            <div style={{ marginTop: 8, fontSize: 11, color: C.blue, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>📦 {it.itemName}</div>
                          )}
                        </Card>
                      );
                    })}
                    {}
                    <button onClick={() => setEditData(prev => ({ ...prev, items: [...(prev.items || []), blankItem()] }))}
                      style={{ background: C.blue + "22", color: C.blue, border: "1px solid " + C.blue + "44", borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginBottom: 10 }}>
                      + Add Item
                    </button>
                  </div>

                  {}
                  {(editData.items || []).some(it => it.amount) && (
                    <div style={{ padding: "10px 14px", background: C.blue + "18", border: "1px solid " + C.blue + "33", borderRadius: 6, marginBottom: 12, textAlign: "right" }}>
                      <span style={{ fontSize: 12, color: C.muted }}>Total: </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: C.blue, fontSize: 15 }}>
                        ₹{fmt((editData.items || []).reduce((s, it) => s + (+(it.amount || 0)), 0))}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEdit} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12 }}>Save Changes</button>
                    <button onClick={() => { setEditId(null); setEditData(null); }} style={{ background: C.surface, color: C.muted, border: "1px solid " + C.border, borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                    {canEditPurchase && <button onClick={() => { setPurchaseOrders(prev => prev.filter(x => x.id !== p.id)); setEditId(null); toast("PO deleted"); }} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, marginLeft: "auto" }}>Delete</button>}
                  </div>
                </div>
              ) : (
                <div>
                  {(p.items || []).map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid " + C.border + "22", flexWrap: "wrap", fontSize: 12, color: C.muted, alignItems: "center" }}>
                      {it.itemCategory && <Badge label={it.itemCategory} color={C.blue} />}
                      <span style={{ fontWeight: 600, color: C.text }}>{it.itemName}</span>
                      <span>Qty: <strong style={{ color: C.text }}>{it.qty} {it.unit}</strong></span>
                      {it.rate && <span>Rate: ₹{it.rate}</span>}
                      {it.amount && <span style={{ color: C.green, fontWeight: 700 }}>₹{fmt(+it.amount)}</span>}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: C.muted }}>
                    {p.deliveryDate && <span>Delivery: {p.deliveryDate}</span>}
                    {p.vendorContact && <span>Contact: {p.vendorContact}</span>}
                    {p.remarks && <span>Note: {p.remarks}</span>}
                    <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", color: C.blue, fontWeight: 700 }}>
                      Total: ₹{fmt((p.items||[]).reduce((s,it) => s + (+(it.amount||0)), 0))}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>🛒</div>No purchase orders yet.</Card>}
        </div>
      )}
    </div>
  );
}


function addWorkingDays(dateStr, days) {
  if (days <= 0) return dateStr;
  const d = new Date(dateStr + "T00:00:00");
  
  const fullWeeks = Math.floor(days / 6);
  const remaining = days % 6;
  d.setDate(d.getDate() + fullWeeks * 7);
  let added = 0;
  while (added < remaining) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d.toISOString().slice(0, 10);
}

function dateRangesOverlap(s1, e1, s2, e2) {
  return s1 <= e2 && s2 <= e1;
}


function buildSchedule(form, machineMaster, existingJobOrders = []) {
  const ordered = STAGES.filter(p => (form.process || []).includes(p));
  const schedule = [];

  
  const machineBookings = {};
  existingJobOrders.forEach(jo => {
    if (jo.status === "Cancelled") return;
    if (form._editId && jo.id === form._editId) return;
    (jo.schedule || []).forEach(slot => {
      if (!slot.machineId || !slot.startDate || !slot.endDate) return;
      if (!machineBookings[slot.machineId]) machineBookings[slot.machineId] = [];
      machineBookings[slot.machineId].push({ startDate: slot.startDate, endDate: slot.endDate });
    });
  });
  
  Object.keys(machineBookings).forEach(mid => {
    machineBookings[mid].sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  
  function skipSunday(dateStr) {
    if (new Date(dateStr + "T00:00:00").getDay() === 0) return addWorkingDays(dateStr, 1);
    return dateStr;
  }

  
  function findAvailableStart(machineId, desiredStart, daysNeeded) {
    const bookings = machineBookings[machineId] || [];
    let start = skipSunday(desiredStart);
    let iterations = 0;
    let changed = true;
    while (changed && iterations < 50) {
      changed = false;
      iterations++;
      const end = addWorkingDays(start, Math.max(daysNeeded, 1));
      for (const b of bookings) {
        if (b.startDate > end) break; 
        if (dateRangesOverlap(start, end, b.startDate, b.endDate)) {
          start = skipSunday(addWorkingDays(b.endDate, 1));
          changed = true;
          break;
        }
      }
    }
    return start;
  }

  let cursor = form.jobcardDate || today();

  ordered.forEach(proc => {
    const machineId = (form.machineAssignments || {})[proc];
    const machine = machineMaster.find(m => m.id === machineId);
    const cap = machine ? +(machine.capacity || 0) : 0;
    const hrs = machine ? +(machine.workingHours || 8) : 8;
    const shifts = machine ? +(machine.shiftsPerDay || 1) : 1;
    const dailyOutput = cap * hrs * shifts;

    const stageQty = SHEET_STAGES.includes(proc)
      ? +(form.noOfSheets || 0)
      : +(form.orderQty || 0);

    const daysNeeded = (dailyOutput > 0 && stageQty > 0)
      ? Math.max(1, Math.ceil(stageQty / dailyOutput))
      : 1;

    const startDate = machineId
      ? findAvailableStart(machineId, cursor, daysNeeded)
      : skipSunday(cursor);
    const endDate = addWorkingDays(startDate, daysNeeded);

    if (machineId) {
      if (!machineBookings[machineId]) machineBookings[machineId] = [];
      machineBookings[machineId].push({ startDate, endDate });
      
      machineBookings[machineId].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    cursor = endDate;

    schedule.push({
      process: proc,
      machineId: machineId || null,
      machineName: machine?.name || "Unassigned",
      startDate, endDate,
      stageQty, dailyOutput: dailyOutput || 0, daysNeeded,
      actualStart: "", actualEnd: "", actualQty: "", actualNotes: ""
    });
  });
  return schedule;
}


const FORMATION_STAGES_QTY = ["Formation", "Manual Formation"];
const FORMATION_MACHINE_TYPES = ["Formation", "Bag Making", "Sheeting", "Sheet Cutting", "Cutting"];
const MANUAL_FORMATION_MACHINE_TYPES = ["Handmade"];

const PROCESS_MACHINE_TYPE = {
  "Printing":         "Printing",
  "Varnish":          "Printing",
  "Lamination":       "Printing",
  "Die Cutting":      "Die Cutting",
  "Formation":        "Formation",
  "Manual Formation": "Formation",
};


function JobOrders({ jobOrders, setJobOrders, salesOrders, sizeMaster, joCounter, setJoCounter, rawStock, setRawStock, wipStock, setWipStock, fgStock, setFgStock, machineMaster, printingMaster, setPrintingMaster, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const blank = {
    jobcardDate: today(), soRef: "", orderDate: "", deliveryDate: "",
    itemName: "", size: "", clientName: "", clientCategory: "",
    printing: "", plate: "", paperCategory: "", paperType: "", process: [],
    orderQty: "", noOfUps: "", reelSize: "", noOfSheets: "", reelWeightKg: "", reelWidthMm: "", cuttingLengthMm: "", sheetUom: "mm", sheetW: "", sheetL: "", sheetSize: "", paperGsm: "",
    sheetSize2: "", reelWeightKg2: "", reelWidthMm2: "", cuttingLengthMm2: "", remarks: "", status: "Open", machineAssignments: {}, schedule: []
  };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState("form");
  const [submitting, setSubmitting] = useState(false);

  const reelPaperTypes  = React.useMemo(() => sizeMaster["Paper Reel"]  || [], [sizeMaster]);
  const sheetPaperTypes = React.useMemo(() => sizeMaster["Paper Sheet"] || [], [sizeMaster]);
  const allPaperTypes   = React.useMemo(() => [...new Set([...reelPaperTypes, ...sheetPaperTypes])], [reelPaperTypes, sheetPaperTypes]);

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      
      if (k === "soRef" && v) {
        const so = salesOrders.find(s => s.soNo === v);
        if (so) {
          updated.orderDate = so.orderDate || "";
          updated.deliveryDate = so.deliveryDate || "";
          updated.clientName = so.clientName || "";
          updated.clientCategory = so.clientCategory || "";
          
          if (!so.items || so.items.length <= 1) {
            const firstItem = so.items ? so.items[0] : so;
            updated.itemName = firstItem.itemName || "";
            updated.size = firstItem.size ||
              (firstItem.width && firstItem.gussett && firstItem.height ? `${firstItem.width}x${firstItem.gussett}x${firstItem.height}${firstItem.uom || "inch"}` :
               firstItem.width && firstItem.length && firstItem.height ? `${firstItem.width}x${firstItem.length}x${firstItem.height}${firstItem.uom || "inch"}` :
               firstItem.width && firstItem.length ? `${firstItem.width}x${firstItem.length}${firstItem.uom || "inch"}` :
               firstItem.width && firstItem.height ? `${firstItem.width}x${firstItem.height}${firstItem.uom || "inch"}` : "") || "";
            updated.orderQty = firstItem.orderQty || "";
          } else {
            
            updated.itemName = "";
            updated.size = "";
            updated.orderQty = "";
          }
        }
      }
      
      if (k === "paperCategory") { updated.paperType = ""; updated.reelSize = ""; updated.reelWidthMm = ""; updated.cuttingLengthMm = ""; updated.reelWeightKg = ""; updated.noOfSheets = ""; updated.sheetW = ""; updated.sheetL = ""; updated.sheetSize = ""; }
      
      if (["sheetW", "sheetL", "sheetUom"].includes(k)) {
        const w = k === "sheetW" ? v : updated.sheetW;
        const l = k === "sheetL" ? v : updated.sheetL;
        const u = k === "sheetUom" ? v : updated.sheetUom;
        updated.sheetSize = (w && l) ? `${w}x${l}${u}` : "";
      }
      
      if (["sheetW2", "sheetL2", "sheetUom2"].includes(k)) {
        const w = k === "sheetW2" ? v : updated.sheetW2;
        const l = k === "sheetL2" ? v : updated.sheetL2;
        const u = k === "sheetUom2" ? v : updated.sheetUom2;
        updated.sheetSize2 = (w && l) ? `${w}x${l}${u}` : "";
      }
      
      
      if (updated.itemName && printingMaster && printingMaster.length > 0 &&
          (k === "itemName" || k === "soRef")) {
        const iName = (updated.itemName || "").toLowerCase();
        const cName = (updated.clientName || "").toLowerCase();
        const cCat  = (updated.clientCategory || "").toLowerCase();
        const pm = printingMaster.find(r =>
          (r.itemName || "").toLowerCase() === iName &&
          (r.clientName || "").toLowerCase() === cName &&
          (r.clientCategory || "").toLowerCase() === cCat
        ) || printingMaster.find(r =>
          (r.itemName || "").toLowerCase() === iName && !r.clientName && !r.clientCategory
        );
        if (pm) {
          
          if (pm.paperCategory) updated.paperCategory = pm.paperCategory;
          if (pm.printing)  updated.printing  = pm.printing;
          if (pm.plate)     updated.plate     = pm.plate;
          if (pm.process && pm.process.length) updated.process = pm.process;
          if (pm.paperType) updated.paperType = pm.paperType;
          if (pm.paperGsm)  updated.paperGsm  = pm.paperGsm;
          
          if (pm.paperCategory === "Paper Reel") {
            if (pm.reelSize)        updated.reelSize        = pm.reelSize;
            if (pm.reelWidthMm)     updated.reelWidthMm     = pm.reelWidthMm;
            if (pm.cuttingLengthMm) updated.cuttingLengthMm = pm.cuttingLengthMm;
            if (pm.reelWeightKg)    updated.reelWeightKg    = pm.reelWeightKg;
          } else {
            if (pm.noOfUps)  updated.noOfUps  = pm.noOfUps;
            if (pm.sheetUom) updated.sheetUom = pm.sheetUom;
            if (pm.sheetW)   updated.sheetW   = pm.sheetW;
            if (pm.sheetL)   updated.sheetL   = pm.sheetL;
            if (pm.sheetW && pm.sheetL) updated.sheetSize = pm.sheetW + "x" + pm.sheetL + (pm.sheetUom || "mm");
            else if (pm.sheetSize) updated.sheetSize = pm.sheetSize;
          }
        }
      }

      return updated;
    });
    setErrors(e => ({ ...e, [k]: false }));
  };

  const E = (k) => errors[k] ? { border: `1px solid ${C.red}` } : {};
  const EMsg = (k) => errors[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;

  const submit = () => {
    const e = {};
    if (!form.jobcardDate) e.jobcardDate = true;
    if (!form.soRef) e.soRef = true;
    if (!form.itemName) e.itemName = true;
    if (!form.clientName) e.clientName = true;
    if (!form.clientCategory) e.clientCategory = true;
    if (!form.size) e.size = true;
    if (!form.printing) e.printing = true;
    if (!form.plate) e.plate = true;
    if (!form.process || form.process.length === 0) e.process = true;
    if (!form.paperType) e.paperType = true;
    if (form.paperCategory !== "Paper Reel" && !form.noOfUps) e.noOfUps = true;
    const _isReelJob = form.paperCategory === "Paper Reel";
    if (_isReelJob) {
      if (!form.reelWeightKg) e.reelWeightKg = true;
    } else {
      if (!form.noOfSheets) e.noOfSheets = true;
      if (!form.sheetW) e.sheetW = true;
      if (!form.sheetL) e.sheetL = true;
    }
    if (!form.paperGsm) e.paperGsm = true;
    
    if (form.hasSecondPaper) {
      if (!form.paperType2) e.paperType2 = true;
      if (!form.paperGsm2)  e.paperGsm2  = true;
      const _gsm2 = (form.paperGsm2 || "") + "gsm";
      const _rmMatch2 = rawStock.find(r => r.name.includes(form.paperType2 || "") && r.name.includes(_gsm2));
      const _isReelJob2 = _rmMatch2 && (_rmMatch2.unit === "reels" || _rmMatch2.name.includes("Reel"));
      if (_isReelJob2) {
        if (!form.reelWeightKg2) e.reelWeightKg2 = true;
      } else {
        if (!form.noOfSheets2) e.noOfSheets2 = true;
        if (!form.sheetW2) e.sheetW2 = true;
        if (!form.sheetL2) e.sheetL2 = true;
      }
    }
    
    (form.process || []).forEach(proc => {
      if (!(form.machineAssignments || {})[proc]) e["machine_" + proc] = true;
    });
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const JO_FIELD_LABELS = { jobcardDate: "Jobcard Date", soRef: "Sales Order #", itemName: "Item Name", clientName: "Client Name", clientCategory: "Client Category", size: "Size", printing: "Printing", plate: "Plate", process: "Process (select at least one)", paperType: "Paper Type", noOfUps: "# of Ups", noOfSheets: "# of Sheets", sheetW: "Sheet Width", sheetL: "Sheet Length", reelWeightKg: "Reel Weight (kg)", paperGsm: "Paper GSM", paperType2: "Paper Type 2", paperGsm2: "Paper GSM 2", noOfSheets2: "# of Sheets 2", sheetW2: "Sheet Width 2", sheetL2: "Sheet Length 2" };
      const msgs = Object.keys(e).map(k => k.startsWith("machine_") ? `Machine: ${k.replace("machine_", "")}` : (JO_FIELD_LABELS[k] || k));
      toast(msgs, "validation");
      return;
    }
    setErrors({});
    const joProcesses = form.process && form.process.length > 0 ? form.process : [];
    const initStatus = joProcesses.length > 0 ? joProcesses[0] + " Pending" : "Open";
    
    if (form.paperType && form.paperGsm) {
      const gsm = form.paperGsm + "gsm";
      const isReelJob = form.paperCategory === "Paper Reel";
      const sheetSz = !isReelJob ? (form.sheetSize || (form.sheetW && form.sheetL ? form.sheetW + "x" + form.sheetL + (form.sheetUom || "mm") : "")) : "";
      const sheetsNeeded = +(form.noOfSheets || 0);
      const match = rawStock.find(r => {
        const n = r.name;
        return n.includes(form.paperType) && n.includes(gsm) && (sheetSz ? n.includes(sheetSz) : true);
      });
      if (!match) {
        toast(`No matching RM Stock found for ${form.paperType} ${gsm}${sheetSz ? " " + sheetSz : ""}. Please add stock via Material Inward first.`, "error");
        return;
      }
      const isSheet = match.unit === "sheets" || match.name.includes("Sheet");
      const isReel  = match.unit === "reels"  || match.name.includes("Reel");
      if (isSheet && sheetsNeeded > 0 && +(match.qty || 0) < sheetsNeeded) {
        toast(`Insufficient stock for Paper 1: ${form.paperType} ${gsm} — available ${fmt(+(match.qty||0))} sheets, required ${fmt(sheetsNeeded)} sheets. Job card not created.`, "error");
        return;
      }
      if (isReel && +(form.reelWeightKg || 0) > 0 && +(match.weight || 0) < +(form.reelWeightKg || 0)) {
        toast(`Insufficient stock for Paper 1: ${form.paperType} ${gsm} — available ${fmt(+(match.weight||0))} kg, required ${fmt(+(form.reelWeightKg||0))} kg. Job card not created.`, "error");
        return;
      }
    }

    
    if (form.hasSecondPaper && form.paperType2 && form.paperGsm2) {
      const gsm2 = form.paperGsm2 + "gsm";
      const sheetSz2 = form.sheetSize2 || (form.sheetW2 && form.sheetL2 ? form.sheetW2 + "x" + form.sheetL2 + (form.sheetUom2 || "mm") : "");
      const sheetsNeeded2 = +(form.noOfSheets2 || 0);
      const match2 = rawStock.find(r => {
        const n = r.name;
        return n.includes(form.paperType2) && n.includes(gsm2) && (sheetSz2 ? n.includes(sheetSz2) : true);
      });
      if (!match2) {
        toast(`No matching RM Stock found for Paper 2: ${form.paperType2} ${gsm2}${sheetSz2 ? " " + sheetSz2 : ""}. Please add stock via Material Inward first.`, "error");
        return;
      }
      const isSheet2 = match2.unit === "sheets" || match2.name.includes("Sheet");
      const isReel2  = match2.unit === "reels"  || match2.name.includes("Reel");
      if (isSheet2 && sheetsNeeded2 > 0 && +(match2.qty || 0) < sheetsNeeded2) {
        toast(`Insufficient stock for Paper 2: ${form.paperType2} ${gsm2} — available ${fmt(+(match2.qty||0))} sheets, required ${fmt(sheetsNeeded2)} sheets. Job card not created.`, "error");
        return;
      }
      if (isReel2 && +(form.reelWeightKg2 || 0) > 0 && +(match2.weight || 0) < +(form.reelWeightKg2 || 0)) {
        toast(`Insufficient stock for Paper 2: ${form.paperType2} ${gsm2} — available ${fmt(+(match2.weight||0))} kg, required ${fmt(+(form.reelWeightKg2||0))} kg. Job card not created.`, "error");
        return;
      }
    }

    
    if (form.soRef && form.itemName) {
      const dupJO = jobOrders.find(j =>
        j.soRef === form.soRef &&
        (j.itemName || "").trim().toLowerCase() === (form.itemName || "").trim().toLowerCase()
      );
      if (dupJO) {
        toast("Duplicate: Job Order " + dupJO.joNo + " already exists for " + form.soRef + " — " + form.itemName, "error");
        return;
      }
    }


    const entry = {
      ...form, joNo: "JO-" + joCounter, id: uid(), status: initStatus,
      currentStage: "Not Started", completedProcesses: [], stageQtyMap: {}, stageHistory: [],
      machineAssignments: form.machineAssignments || {},
      schedule: [] 
    };
    const joNoVal = "JO-" + joCounter;
    setJoCounter(n => n + 1);
    setSubmitting(true);

    
    setTimeout(() => {
      const schedule = buildSchedule(form, machineMaster, jobOrders);
      const fullEntry = { ...entry, joNo: joNoVal, schedule };
      setJobOrders(p => [...p, fullEntry]);

    
    if (form.paperType && form.paperGsm) {
      const gsm = form.paperGsm + "gsm";
      const isReelJob = form.paperCategory === "Paper Reel";
      const sheetSz = form.sheetSize || (form.sheetW && form.sheetL ? form.sheetW + "x" + form.sheetL + (form.sheetUom || "mm") : "");
      const sheetsToDeduct = +(form.noOfSheets || 0);
      const reelWeightToDeduct = +(form.reelWeightKg || 0);
      setRawStock(prev => {
        let updated = [...prev];
        const matchIdx = updated.findIndex(r => {
          const n = r.name;
          return n.includes(form.paperType) &&
                 n.includes(gsm) &&
                 (sheetSz && !isReelJob ? n.includes(sheetSz) : true);
        });
        if (matchIdx >= 0) {
          const r = updated[matchIdx];
          const isSheet = r.unit === "sheets" || r.name.includes("Sheet");
          const isReel  = r.unit === "reels"  || r.name.includes("Reel");
          let newQty    = +(r.qty    || 0);
          let newWeight = +(r.weight || 0);
          if (isSheet && sheetsToDeduct > 0) {
            newQty    = Math.max(0, newQty - sheetsToDeduct);
            newWeight = r.weightPerSheet ? Math.max(0, newWeight - sheetsToDeduct * r.weightPerSheet) : newWeight;
          } else if (isReel && reelWeightToDeduct > 0) {
            newWeight = Math.max(0, newWeight - reelWeightToDeduct);
          }
          updated[matchIdx] = { ...r, qty: newQty, weight: newWeight };
        }
        return updated;
      });
    }

    
    if (form.hasSecondPaper && form.paperType2 && form.paperGsm2) {
      const gsm2 = form.paperGsm2 + "gsm";
      const sheetSz2 = form.sheetW2 && form.sheetL2 ? form.sheetW2 + "x" + form.sheetL2 + (form.sheetUom2 || "mm") : "";
      const sheetsToDeduct2 = +(form.noOfSheets2 || 0);
      setRawStock(prev => {
        let updated = [...prev];
        const matchIdx = updated.findIndex(r => {
          const n = r.name;
          return n.includes(form.paperType2) &&
                 n.includes(gsm2) &&
                 (sheetSz2 ? n.includes(sheetSz2) : true);
        });
        if (matchIdx >= 0) {
          const r = updated[matchIdx];
          const isSheet = r.unit === "sheets" || r.name.includes("Sheet");
          const newQty = Math.max(0, (+(r.qty || 0)) - (isSheet ? sheetsToDeduct2 : 0));
          const weightToDeduct2 = isSheet && r.weightPerSheet ? sheetsToDeduct2 * r.weightPerSheet : 0;
          const newWeight = Math.max(0, (+(r.weight || 0)) - weightToDeduct2);
          updated[matchIdx] = { ...r, qty: newQty, weight: newWeight };
        }
        return updated;
      });
    }

    
    if (form.itemName && setPrintingMaster) {
      const _isReel = form.paperCategory === "Paper Reel";
      const pmEntry = {
        itemName:       form.itemName,
        clientName:     form.clientName     || "",
        clientCategory: form.clientCategory || "",
        printing:       form.printing       || "",
        plate:          form.plate          || "",
        process:        form.process        || [],
        paperCategory:  form.paperCategory  || "",
        paperType:      form.paperType      || "",
        paperGsm:       form.paperGsm       || "",
        
        ...(_isReel ? {
          reelSize:        form.reelSize        || "",
          reelWidthMm:     form.reelWidthMm     || "",
          cuttingLengthMm: form.cuttingLengthMm || "",
          reelWeightKg:    form.reelWeightKg    || "",
        } : {
        
          noOfUps:   form.noOfUps   || "",
          sheetUom:  form.sheetUom  || "mm",
          sheetW:    form.sheetW    || "",
          sheetL:    form.sheetL    || "",
          sheetSize: form.sheetSize || "",
        }),
      };
      setPrintingMaster(prev => {
        const idx = prev.findIndex(r =>
          (r.itemName || "").toLowerCase()       === (form.itemName || "").toLowerCase() &&
          (r.clientName || "").toLowerCase()     === (form.clientName || "").toLowerCase() &&
          (r.clientCategory || "").toLowerCase() === (form.clientCategory || "").toLowerCase()
        );
        if (idx < 0) {
          
          return [...prev, { id: uid(), ...pmEntry, addedOn: today() }];
        }
        
        const existing = prev[idx];
        const _isReelPM = (pmEntry.paperCategory || existing.paperCategory) === "Paper Reel";
        const fields = _isReelPM
          ? ["printing","plate","paperType","paperGsm","reelSize","reelWidthMm","cuttingLengthMm","reelWeightKg"]
          : ["printing","plate","paperType","paperGsm","noOfUps","sheetW","sheetL","sheetSize"];
        const processDiff = JSON.stringify((existing.process||[]).slice().sort()) !== JSON.stringify((pmEntry.process||[]).slice().sort());
        const fieldDiff = fields.some(f => (existing[f]||"").toString() !== (pmEntry[f]||"").toString());
        if (fieldDiff || processDiff) {
          const diffFields = fields.filter(f => (existing[f]||"").toString() !== (pmEntry[f]||"").toString());
          if (processDiff) diffFields.push("process");
          const diffLines = diffFields.map(f => "  " + f + ": was [" + (existing[f]||"—") + "] → now [" + (pmEntry[f]||"—") + "]").join("\n");
          const msg = "Printing specs for \"" + form.itemName + "\" differ from master:\n\n" + diffLines + "\n\nUpdate master with new values?";
          if (window.confirm(msg)) {
            const u = [...prev];
            u[idx] = { ...existing, ...pmEntry };
            return u;
          }
        }
        return prev;
      });
    }
    toast("Job Order created: " + joNoVal);
      setForm(blank);
      setSubmitting(false);
    }, 0); 
  };

  const divider = (label) => {
    return (
      <div style={{ gridColumn: "1 / -1", borderTop: "1px solid " + C.border, paddingTop: 14, marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: 2 }}>{label}</span>
      </div>
    );
  };

  const selectedSO = salesOrders.find(s => s.soNo === form.soRef);

  return (
    <div className="fade">
      <SectionTitle icon="⚙️" title="Job Orders" sub="Create production job orders linked to sales orders" />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["form", "📝 New Job Order"], ["records", `📋 Records (${jobOrders.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, border: `1px solid ${view === v ? C.yellow : C.border}`,
            background: view === v ? C.yellow + "22" : "transparent", color: view === v ? C.yellow : C.muted,
            fontWeight: 700, fontSize: 13
          }}>{l}</button>
        ))}
      </div>

      {view === "form" && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.yellow, marginBottom: 18 }}>New Job Card</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>

            {divider("Basic Details")}
            <Field label="Jobcard Date *">
              <DatePicker value={form.jobcardDate} onChange={v => set("jobcardDate", v)} style={E("jobcardDate")} />
              {EMsg("jobcardDate")}
            </Field>
            <Field label="Sales Order # *">
              <select value={form.soRef} onChange={e => set("soRef", e.target.value)} style={E("soRef")}>
                <option value="">-- Select Sales Order --</option>
                {salesOrders.filter(s => {
                  if (s.status === "Closed") return false;
                  const soItems = s.items && s.items.length > 0 ? s.items : [s];
                  return soItems.some(it => {
                    const itName = (it.itemName || "").trim().toLowerCase();
                    
                    if (!itName) return true;
                    return !jobOrders.some(j =>
                      j.soRef === s.soNo &&
                      (j.itemName || "").trim().toLowerCase() === itName
                    );
                  });
                }).map(s => <option key={s.soNo} value={s.soNo}>{s.soNo} – {s.clientName}</option>)}
              </select>
              {EMsg("soRef")}
            </Field>
            <Field label="Order Date">
              {form.soRef
                ? <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: form.orderDate ? C.text : C.muted }}>{form.orderDate || "— Auto from SO —"}</div>
                : <DatePicker value={form.orderDate} onChange={v => set("orderDate", v)} />}
            </Field>
            <Field label="Delivery Date">
              {form.soRef
                ? <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: form.deliveryDate ? C.text : C.muted }}>{form.deliveryDate || "— Auto from SO —"}</div>
                : <DatePicker value={form.deliveryDate} onChange={v => set("deliveryDate", v)} />}
            </Field>

            {divider("Client & Item Details")}
            <Field label="Client Name">
              {form.soRef
                ? <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: form.clientName ? C.text : C.muted }}>{form.clientName || "— Auto from SO —"}</div>
                : <input placeholder="Enter client name" value={form.clientName || ""} onChange={e => set("clientName", e.target.value)} />}
            </Field>
            <Field label="Client Category *">
              <select value={form.clientCategory} onChange={e => set("clientCategory", e.target.value)} style={E("clientCategory")}>
                <option value="">-- Select --</option>
                {["HP", "ZPL", "Others", "Unprinted"].map(c => <option key={c}>{c}</option>)}
              </select>
              {EMsg("clientCategory")}
            </Field>
            <Field label="Item Name *">
              {selectedSO?.items?.length > 1 ? (
                <>
                  <select value={form.itemName} onChange={e => {
                    const it = selectedSO.items.find(i => i.itemName === e.target.value);
                    
                    const derivedSize = it?.size ||
                      (it?.width && it?.gussett && it?.height ? `${it.width}x${it.gussett}x${it.height}${it.uom || "inch"}` :
                       it?.width && it?.length && it?.height ? `${it.width}x${it.length}x${it.height}${it.uom || "inch"}` :
                       it?.width && it?.length ? `${it.width}x${it.length}${it.uom || "inch"}` :
                       it?.width && it?.height ? `${it.width}x${it.height}${it.uom || "inch"}` : "");
                    const selectedItemName = e.target.value;
                    const pm = printingMaster ? printingMaster.find(r =>
                      (r.itemName || "").toLowerCase() === selectedItemName.toLowerCase() &&
                      (r.clientName || "").toLowerCase() === (form.clientName || "").toLowerCase() &&
                      (r.clientCategory || "").toLowerCase() === (form.clientCategory || "").toLowerCase()
                    ) || printingMaster.find(r =>
                      (r.itemName || "").toLowerCase() === selectedItemName.toLowerCase() && !r.clientName && !r.clientCategory
                    ) : null;
                    setForm(f => ({
                      ...f,
                      itemName: selectedItemName,
                      size: derivedSize || f.size,
                      orderQty: it?.orderQty || f.orderQty,
                      ...(pm ? {
                        paperCategory: pm.paperCategory || f.paperCategory,
                        printing:  pm.printing  || f.printing,
                        plate:     pm.plate     || f.plate,
                        process:   pm.process && pm.process.length ? pm.process : f.process,
                        paperType: pm.paperType || f.paperType,
                        paperGsm:  pm.paperGsm  || f.paperGsm,
                        ...(pm.paperCategory === "Paper Reel" ? {
                          reelSize:        pm.reelSize        || f.reelSize,
                          reelWidthMm:     pm.reelWidthMm     || f.reelWidthMm,
                          cuttingLengthMm: pm.cuttingLengthMm || f.cuttingLengthMm,
                          reelWeightKg:    pm.reelWeightKg    || f.reelWeightKg,
                        } : {
                          noOfUps:   pm.noOfUps   || f.noOfUps,
                          sheetUom:  pm.sheetUom  || f.sheetUom,
                          sheetW:    pm.sheetW    || f.sheetW,
                          sheetL:    pm.sheetL    || f.sheetL,
                          sheetSize: pm.sheetSize || (pm.sheetW && pm.sheetL ? pm.sheetW + "x" + pm.sheetL + (pm.sheetUom || "mm") : f.sheetSize),
                        }),
                      } : {})
                    }));
                    setErrors(err => ({ ...err, itemName: false, size: false }));
                  }} style={E("itemName")}>
                    <option value="">-- Select Item --</option>
                    {selectedSO.items.map((it, i) => {
                      const alreadyHasJO = jobOrders.some(j => j.soRef === form.soRef && (j.itemName||"").trim().toLowerCase() === (it.itemName||"").trim().toLowerCase());
                      return (
                        <option key={i} value={it.itemName} disabled={alreadyHasJO}>
                          {it.itemName}{alreadyHasJO ? " (JO exists)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </>
              ) : (
                form.soRef
                  ? <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${E("itemName").border || C.border}`, borderRadius: 6, fontSize: 13, color: form.itemName ? C.green : C.muted, fontWeight: form.itemName ? 700 : 400, fontFamily: form.itemName ? "'JetBrains Mono',monospace" : undefined }}>{form.itemName || "— Auto from SO —"}</div>
                  : <input placeholder="Enter item name" value={form.itemName || ""} onChange={e => set("itemName", e.target.value)} style={E("itemName")} />
              )}
              {EMsg("itemName")}
            </Field>
            <Field label="Size *">
              <input placeholder="Size" value={form.size || ""} onChange={e => set("size", e.target.value)} style={E("size")} />
              {EMsg("size")}
            </Field>

            {divider("Production Details")}
            {(() => {
              if (!form.itemName || !printingMaster) return null;
              const pm = printingMaster.find(r =>
                (r.itemName || "").toLowerCase() === (form.itemName || "").toLowerCase() &&
                (r.clientName || "").toLowerCase() === (form.clientName || "").toLowerCase() &&
                (r.clientCategory || "").toLowerCase() === (form.clientCategory || "").toLowerCase()
              ) || printingMaster.find(r =>
                (r.itemName || "").toLowerCase() === (form.itemName || "").toLowerCase() && !r.clientName && !r.clientCategory
              );
              if (pm) return (
                <div style={{ gridColumn: "1 / -1", background: C.blue + "11", border: `1px solid ${C.blue}33`, borderRadius: 6, padding: "8px 14px", fontSize: 12, color: C.blue, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>⚡ Auto-filled from Printing Detail Master</span>
                  <span style={{ color: C.muted }}>({pm.clientName || "any"} · {pm.clientCategory || "any"}) — all fields are editable</span>
                </div>
              );
              return (
                <div style={{ gridColumn: "1 / -1", background: C.yellow + "11", border: `1px solid ${C.yellow}33`, borderRadius: 6, padding: "8px 14px", fontSize: 12, color: C.yellow, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>⚠ No printing details found for this item</span>
                  <span style={{ color: C.muted }}>— fill in manually. Details will be saved to master after creating this JO.</span>
                </div>
              );
            })()}
            <Field label="Order Quantity">
              {form.soRef
                ? <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: form.orderQty ? C.text : C.muted, fontWeight: form.orderQty ? 700 : 400, fontFamily: form.orderQty ? "'JetBrains Mono',monospace" : undefined }}>{form.orderQty || "— Auto from SO —"}</div>
                : <input type="number" placeholder="Order quantity" value={form.orderQty || ""} onChange={e => set("orderQty", e.target.value)} />}
            </Field>
            <Field label="Printing *">
              <select value={form.printing} onChange={e => set("printing", e.target.value)} style={E("printing")}>
                <option value="">-- Select Printing --</option>
                {["Plain", "1", "2", "3", "4", "5", "6"].map(p => <option key={p}>{p}</option>)}
              </select>
              {EMsg("printing")}
            </Field>
            <Field label="Plate *">
              <select value={form.plate} onChange={e => set("plate", e.target.value)} style={E("plate")}>
                <option value="">-- Select Plate --</option>
                {["Plain", "Old", "New"].map(p => <option key={p}>{p}</option>)}
              </select>
              {EMsg("plate")}
            </Field>
            <Field label="Process *" span={2}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "6px 0" }}>
                {STAGES.map(p => {
                  const selected = (form.process || []).includes(p);
                  return (
                    <div key={p} onClick={() => {
                      const cur = form.process || [];
                      const newProc = selected ? cur.filter(x => x !== p) : [...cur, p];
                      
                      const newMA = { ...(form.machineAssignments || {}) };
                      if (selected) delete newMA[p];
                      set("process", newProc);
                      set("machineAssignments", newMA);
                    }} style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: selected ? C.accent + "22" : C.surface,
                      border: `1px solid ${selected ? C.accent : C.border}`,
                      color: selected ? C.accent : C.muted,
                      userSelect: "none", transition: "all .15s"
                    }}>
                      {selected ? "✓ " : ""}{p}
                    </div>
                  );
                })}
              </div>
              {errors.process && <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Select at least one process</div>}
            </Field>

            {}
            {(form.process || []).length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: 2 }}>Machine Assignment</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {STAGES
                    .filter(p => (form.process || []).includes(p))
                    .map(proc => {
                      const machineType = PROCESS_MACHINE_TYPE[proc];
                      const eligible = machineMaster.filter(m => m.status === "Active" &&
                        (proc === "Manual Formation"
                          ? MANUAL_FORMATION_MACHINE_TYPES.includes(m.type)
                          : proc === "Formation"
                            ? FORMATION_MACHINE_TYPES.includes(m.type)
                            : m.type === machineType));
                      const assigned = (form.machineAssignments || {})[proc] || "";
                      const machine = machineMaster.find(m => m.id === assigned);
                      const daily = machine && machine.capacity
                        ? +(machine.capacity) * +(machine.workingHours || 8) * +(machine.shiftsPerDay || 1)
                        : 0;
                      const col = PROCESS_COLORS[proc] || C.accent;
                      const hasError = !!errors["machine_" + proc];
                      return (
                        <div key={proc} style={{ background: C.surface, border: `1px solid ${hasError ? C.red + "88" : assigned ? col + "44" : C.border}`, borderLeft: `3px solid ${hasError ? C.red : assigned ? col : C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: hasError ? C.red : col, textTransform: "uppercase", letterSpacing: 1 }}>
                              {proc} {hasError ? "⚠ Required" : ""}
                            </span>
                            {eligible.length === 0 && <span style={{ fontSize: 10, color: C.red }}>No active machines</span>}
                          </div>
                          <select
                            value={assigned}
                            onChange={e => { set("machineAssignments", { ...(form.machineAssignments || {}), [proc]: e.target.value }); setErrors(p => ({ ...p, ["machine_" + proc]: false })); }}
                            style={{ fontSize: 12, marginBottom: daily ? 6 : 0, border: hasError ? `1px solid ${C.red}` : undefined }}
                          >
                            <option value="">-- Select Machine --</option>
                            {eligible.map(m => (
                              <option key={m.id} value={m.id}>{m.name}{m.capacity ? ` (${fmt(+(m.capacity))} ${m.capacityUnit || "pcs/hr"})` : ""}</option>
                            ))}
                          </select>
                          {hasError && <div style={{ fontSize: 10, color: C.red, marginTop: 4, fontWeight: 700 }}>Select a machine for {proc}</div>}
                          {daily > 0 && (
                            <div style={{ fontSize: 10, color: col, fontWeight: 700, marginTop: 4 }}>
                              Daily output: {fmt(daily)} · Est. {Math.ceil((["Printing","Varnish","Lamination","Die Cutting"].includes(proc) ? +(form.noOfSheets||0) : +(form.orderQty||0)) / daily) || "?"} day(s)
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {divider("Sheet / Reel Details")}
            <Field label="Paper Category *">
              <select value={form.paperCategory || ""} onChange={e => set("paperCategory", e.target.value)} style={E("paperCategory")}>
                <option value="">-- Paper Reel or Sheet --</option>
                <option value="Paper Reel">Paper Reel</option>
                <option value="Paper Sheet">Paper Sheet</option>
              </select>
            </Field>
            <Field label={form.hasSecondPaper ? "Paper Type 1 *" : "Paper Type *"}>
              <select value={form.paperType} onChange={e => set("paperType", e.target.value)} style={E("paperType")} disabled={!form.paperCategory}>
                <option value="">-- Select Paper Type --</option>
                {(form.paperCategory === "Paper Reel" ? reelPaperTypes : form.paperCategory === "Paper Sheet" ? sheetPaperTypes : allPaperTypes).map(p => <option key={p}>{p}</option>)}
              </select>
              {EMsg("paperType")}
            </Field>
            <Field label="Paper GSM *">
              <input type="number" placeholder="e.g. 300" value={form.paperGsm} onChange={e => set("paperGsm", e.target.value)} style={E("paperGsm")} />
              {EMsg("paperGsm")}
            </Field>
            {form.paperCategory === "Paper Reel" ? (
              <Field label="Reel Size *">
                <AutocompleteInput
                  value={form.reelSize || ""}
                  onChange={v => {
                    const selected = rawStock.find(r => {
                      const label = [r.productCode, r.name].filter(Boolean).join(" — ");
                      return label === v || r.name === v;
                    });
                    set("reelSize", v);
                    if (selected && selected.widthMm) set("reelWidthMm", String(selected.widthMm));
                  }}
                  suggestions={rawStock.filter(r => r.unit === "reels" || r.name.includes("Reel")).map(r => [r.productCode, r.name].filter(Boolean).join(" — "))}
                  placeholder="Select or type reel"
                />
              </Field>
            ) : (
              <Field label="# of Ups *">
                <input type="number" placeholder="No. of ups" value={form.noOfUps} onChange={e => set("noOfUps", e.target.value)} style={E("noOfUps")} />
                {EMsg("noOfUps")}
              </Field>
            )}
            {form.paperCategory === "Paper Reel" ? (<>
              <Field label="Reel Width (mm)">
                <input type="number" placeholder="e.g. 690" value={form.reelWidthMm || ""} onChange={e => set("reelWidthMm", e.target.value)} />
              </Field>
              <Field label="Cutting Length (mm)">
                <input type="number" placeholder="e.g. 920" value={form.cuttingLengthMm || ""} onChange={e => set("cuttingLengthMm", e.target.value)} />
              </Field>
              <Field label="Reel Weight Required (kg) *">
                {(() => {
                  const gsm = (form.paperGsm || "") + "gsm";
                  const match = form.paperType && form.paperGsm ? rawStock.find(r => r.name.includes(form.paperType) && r.name.includes(gsm) && (r.unit === "reels" || r.name.includes("Reel"))) : null;
                  const availKg = match ? +(match.weight || 0) : null;
                  const neededKg = +(form.reelWeightKg || 0);
                  const stockColor = availKg === null ? C.muted : availKg === 0 ? C.red : (neededKg > 0 && neededKg > availKg) ? C.red : (neededKg > 0 && neededKg > availKg * 0.8) ? C.yellow : C.green;
                  const stockLabel = availKg === null || !neededKg ? "" : availKg === 0 ? "Out of stock" : neededKg > availKg ? `Insufficient RM — ${fmt(availKg)} kg available` : `✓ ${fmt(availKg)} kg available`;
                  return (<>
                    <input type="number" placeholder="e.g. 200" value={form.reelWeightKg || ""} onChange={e => set("reelWeightKg", e.target.value)} style={E("reelWeightKg")} />
                    {EMsg("reelWeightKg")}
                    {stockLabel && <div style={{ fontSize: 10, fontWeight: 700, color: stockColor, marginTop: 4 }}>{availKg === 0 ? "🚫" : (neededKg > 0 && neededKg > availKg) ? "⚠" : "✓"} {stockLabel}</div>}
                  </>);
                })()}
              </Field>
            </>) : (<>
              <Field label="# of Sheets *">
                {(() => {
                  const gsm = (form.paperGsm || "") + "gsm";
                  const sheetSz = form.sheetSize || (form.sheetW && form.sheetL ? form.sheetW + "x" + form.sheetL + (form.sheetUom || "mm") : "");
                  const match = form.paperType && form.paperGsm && form.sheetW && form.sheetL ? rawStock.find(r => r.name.includes(form.paperType) && r.name.includes(gsm) && (sheetSz ? r.name.includes(sheetSz) : true) && (r.unit === "sheets" || r.name.includes("Sheet"))) : null;
                  const avail = match ? +(match.qty || 0) : null;
                  const needed = +(form.noOfSheets || 0);
                  return (<>
                    <input type="number" placeholder="No. of sheets" value={form.noOfSheets} onChange={e => set("noOfSheets", e.target.value)} style={E("noOfSheets")} />
                    {EMsg("noOfSheets")}
                    {avail !== null && <div style={{ fontSize: 10, fontWeight: 700, color: avail === 0 ? C.red : needed > avail ? C.red : needed > avail * 0.8 ? C.yellow : C.green, marginTop: 4 }}>{avail === 0 ? "🚫 Out of stock" : needed > avail ? `⚠ Insufficient RM — ${fmt(avail)} sheets available` : `✓ ${fmt(avail)} sheets available`}</div>}
                  </>);
                })()}
              </Field>
              <Field label="Sheet UOM">
                <select value={form.sheetUom} onChange={e => set("sheetUom", e.target.value)}>
                  {["mm", "cm", "inch"].map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Sheet W *">
                <input type="number" placeholder="Width" value={form.sheetW} onChange={e => set("sheetW", e.target.value)} style={E("sheetW")} />
                {EMsg("sheetW")}
              </Field>
              <Field label="Sheet L *">
                <input type="number" placeholder="Length" value={form.sheetL} onChange={e => set("sheetL", e.target.value)} style={E("sheetL")} />
                {EMsg("sheetL")}
              </Field>
              <Field label="Sheet Size">
                <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: form.sheetSize ? C.blue : C.muted, fontWeight: form.sheetSize ? 700 : 400, fontFamily: form.sheetSize ? "'JetBrains Mono',monospace" : undefined }}>
                  {form.sheetSize || "— Auto from W × L × UOM —"}
                </div>
              </Field>
            </>)}
            <Field label="Remarks" span={2}>
              <input placeholder="Special instructions" value={form.remarks} onChange={e => set("remarks", e.target.value)} />
            </Field>

            {}
            <Field label="Second Paper" span={2}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={!!form.hasSecondPaper} onChange={e => set("hasSecondPaper", e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: C.accent }} />
                  <span style={{ color: form.hasSecondPaper ? C.accent : C.muted, fontWeight: form.hasSecondPaper ? 700 : 400 }}>
                    This job uses a second paper
                  </span>
                </label>
              </div>
            </Field>

            {form.hasSecondPaper && (<>
              {divider("Second Paper Details")}
              <Field label="Paper Type 2 *">
                <select value={form.paperType2 || ""} onChange={e => set("paperType2", e.target.value)} style={E("paperType2")}>
                  <option value="">-- Select Paper Type --</option>
                  {allPaperTypes.map(p => <option key={p}>{p}</option>)}
                </select>
                {EMsg("paperType2")}
              </Field>
              <Field label="Paper GSM 2 *">
                <input type="number" placeholder="e.g. 250" value={form.paperGsm2 || ""} onChange={e => set("paperGsm2", e.target.value)} style={E("paperGsm2")} />
                {EMsg("paperGsm2")}
              </Field>
              <Field label="# of Ups 2">
                <input type="number" placeholder="No. of ups" value={form.noOfUps2 || ""} onChange={e => set("noOfUps2", e.target.value)} />
              </Field>
              {(() => {
                if (!form.paperType2 || !form.paperGsm2) return (
                  <Field label="# of Sheets 2 *">
                    <input type="number" placeholder="No. of sheets" value={form.noOfSheets2 || ""} onChange={e => set("noOfSheets2", e.target.value)} style={E("noOfSheets2")} />
                    {EMsg("noOfSheets2")}
                  </Field>
                );
                const gsm2 = form.paperGsm2 + "gsm";
                const match2 = rawStock.find(r => r.name.includes(form.paperType2) && r.name.includes(gsm2));
                const isReel2 = match2 && (match2.unit === "reels" || match2.name.includes("Reel"));
                if (isReel2) {
                  const availKg2 = +(match2.weight || 0);
                  const neededKg2 = +(form.reelWeightKg2 || 0);
                  const color2 = availKg2 === 0 ? C.red : (neededKg2 > 0 && neededKg2 > availKg2) ? C.red : (neededKg2 > 0 && neededKg2 > availKg2 * 0.8) ? C.yellow : C.green;
                  const label2 = availKg2 === 0 ? "Out of stock" : (neededKg2 > 0 && neededKg2 > availKg2) ? `Insufficient RM — ${fmt(availKg2)} kg available` : `${fmt(availKg2)} kg available`;
                  return (
                    <Field label="Reel Weight Required (kg) 2 *">
                      <input type="number" placeholder="e.g. 150" value={form.reelWeightKg2 || ""} onChange={e => set("reelWeightKg2", e.target.value)} style={E("reelWeightKg2")} />
                      {EMsg("reelWeightKg2")}
                      <div style={{ fontSize: 10, fontWeight: 700, color: color2, marginTop: 3 }}>{availKg2 === 0 ? "🚫" : (neededKg2 > 0 && neededKg2 > availKg2) ? "⚠" : "✓"} {label2}</div>
                    </Field>
                  );
                }
                const sheetSz2 = form.sheetSize2 || (form.sheetW2 && form.sheetL2 ? form.sheetW2 + "x" + form.sheetL2 + (form.sheetUom2 || "mm") : "");
                const matchSheet2 = rawStock.find(r => r.name.includes(form.paperType2) && r.name.includes(gsm2) && (sheetSz2 ? r.name.includes(sheetSz2) : true));
                const avail2 = matchSheet2 ? +(matchSheet2.qty || 0) : null;
                const needed2 = +(form.noOfSheets2 || 0);
                return (
                  <Field label="# of Sheets 2 *">
                    <input type="number" placeholder="No. of sheets" value={form.noOfSheets2 || ""} onChange={e => set("noOfSheets2", e.target.value)} style={E("noOfSheets2")} />
                    {EMsg("noOfSheets2")}
                    {avail2 !== null && <div style={{ fontSize: 10, fontWeight: 700, color: avail2 === 0 ? C.red : needed2 > avail2 ? C.red : needed2 > avail2 * 0.8 ? C.yellow : C.green, marginTop: 4 }}>{avail2 === 0 ? "🚫 Out of stock" : needed2 > avail2 ? `⚠ Insufficient RM — ${fmt(avail2)} sheets available` : `✓ ${fmt(avail2)} sheets available`}</div>}
                  </Field>
                );
              })()}
              {(() => {
                if (!form.paperType2 || !form.paperGsm2) return null;
                const gsm2 = form.paperGsm2 + "gsm";
                const match2 = rawStock.find(r => r.name.includes(form.paperType2) && r.name.includes(gsm2));
                const isReel2 = match2 && (match2.unit === "reels" || match2.name.includes("Reel"));
                if (isReel2) return (
                  <Field label="Reel Width 2 (mm)">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.blue, fontFamily: "'JetBrains Mono',monospace" }}>
                      {match2.name.match(/(\d+)mm/) ? match2.name.match(/(\d+)mm/)[1] + " mm" : "— From RM stock —"}
                    </div>
                  </Field>
                );
                return (<>
                  <Field label="Sheet UOM 2">
                    <select value={form.sheetUom2 || "mm"} onChange={e => set("sheetUom2", e.target.value)}>
                      {["mm", "cm", "inch"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                  <Field label="Sheet W 2 *">
                    <input type="number" placeholder="Width" value={form.sheetW2 || ""} onChange={e => set("sheetW2", e.target.value)} style={E("sheetW2")} />
                    {EMsg("sheetW2")}
                  </Field>
                  <Field label="Sheet L 2 *">
                    <input type="number" placeholder="Length" value={form.sheetL2 || ""} onChange={e => set("sheetL2", e.target.value)} style={E("sheetL2")} />
                    {EMsg("sheetL2")}
                  </Field>
                  <Field label="Sheet Size 2">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: form.sheetSize2 ? C.blue : C.muted, fontWeight: form.sheetSize2 ? 700 : 400, fontFamily: form.sheetSize2 ? "'JetBrains Mono',monospace" : undefined }}>
                      {form.sheetSize2 || "— Auto from W × L × UOM —"}
                    </div>
                  </Field>
                </>);
              })()}
            </>)}
          </div>
          <SubmitBtn label={submitting ? "Creating..." : "Create Job Order"} color={C.yellow} onClick={submitting ? undefined : submit} disabled={submitting} />
        </Card>
      )}

      {view === "records" && (
        <JORecords jobOrders={jobOrders} setJobOrders={setJobOrders} salesOrders={salesOrders} sizeMaster={sizeMaster} allPaperTypes={allPaperTypes} fgStock={fgStock} setFgStock={setFgStock} rawStock={rawStock} setRawStock={setRawStock} machineMaster={machineMaster} toast={toast} />
      )}
    </div>
  );
}



const SHEET_STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting"];
function getStageTarget(jo, stage) {
  if (!jo) return 0;
  if (stage === "Printing 2") return +(jo.noOfSheets2 || 0);
  if (SHEET_STAGES.includes(stage)) return +(jo.noOfSheets || 0);
  if (FORMATION_STAGES_QTY.includes(stage)) return +(jo.orderQty || 0);
  return 0;
}
function getStageFilledQty(jo, stage) {
  if (!jo) return 0;
  return +((jo.stageQtyMap || {})[stage] || 0);
}


function recomputeJO(jo, stageQtyMap, newHistory) {
  const processes = jo.process || [];
  const orderedProcs = STAGES.filter(p => processes.includes(p));

  
  const completedProcesses = orderedProcs.filter((p, idx) => {
    
    if (p === "Printing" && jo.hasSecondPaper) {
      const p1target = getStageTarget(jo, "Printing");
      const p1filled = +(stageQtyMap["Printing"] || 0);
      const p2target = getStageTarget(jo, "Printing 2");
      const p2filled = +(stageQtyMap["Printing 2"] || 0);
      return p1filled >= p1target && p1target > 0 && p2filled >= p2target && p2target > 0;
    }
    const target = getStageTarget(jo, p);
    const filled = +(stageQtyMap[p] || 0);
    if (filled === 0) return false;
    
    if (target > 0 && filled >= target) return true;
    
    
    if (idx > 0) {
      const prevProc = orderedProcs[idx - 1];
      const prevEntries = newHistory.filter(h => h.stage === prevProc);
      const prevOutput = prevEntries.reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
      if (prevOutput > 0 && filled >= prevOutput) return true;
    }
    
    if (idx === 0 && target === 0) return newHistory.some(h => h.stage === p);
    return false;
  });

  
  const lastEntry = [...newHistory].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0];
  const currentStage = lastEntry?.stage || "Not Started";

  
  const nextProcess = orderedProcs.find(p => !completedProcesses.includes(p));
  let status;
  if (processes.length > 0) {
    if (nextProcess) {
      status = nextProcess + " Pending";
    } else {
      const lastCompleted = completedProcesses[completedProcesses.length - 1];
      status = FORMATION_STAGES_QTY.includes(lastCompleted) ? "Completed" : "QC Pending";
    }
  } else {
    status = newHistory.length === 0 ? "Open" : FORMATION_STAGES_QTY.includes(currentStage) ? "Completed" : currentStage + " Done";
  }

  return { ...jo, stageHistory: newHistory, stageQtyMap, completedProcesses, currentStage, status };
}

function ProductionUpdate({ jobOrders, setJobOrders, wipStock, setWipStock, fgStock, setFgStock, salesOrders, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditProduction = canEdit("production");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo,   setDrDateTo]   = useState("");
  const blank = { joNo: "", stage: "", operator: "", date: today(), qtyCompleted: "", qtyRejected: "0", remarks: "" };
  const [form, setForm] = useState(blank);
  const selectedJO = jobOrders.find(j => j.joNo === form.joNo);

  const submit = () => {
    if (!form.joNo || !form.stage || !form.qtyCompleted || !form.operator.trim()) { toast("Fill all required fields including Operator name", "error"); return; }
    const currentJO = jobOrders.find(j => j.joNo === form.joNo);
    const FORMATION_STAGES_LOCAL = ["Formation", "Manual Formation"];

    
    if (currentJO && !FORMATION_STAGES_LOCAL.includes(form.stage) &&
        (currentJO.completedProcesses || []).includes(form.stage)) {
      toast(`${form.stage} already completed for ${form.joNo}`, "error"); return;
    }

    
    if (currentJO && form.stage) {
      const target = getStageTarget(currentJO, form.stage);
      if (target > 0) {
        const alreadyFilled = getStageFilledQty(currentJO, form.stage);
        const adding = +(form.qtyCompleted || 0) + +(form.qtyRejected || 0);
        if (alreadyFilled + adding > target) {
          toast(`Cannot exceed target of ${target} for ${form.stage} (already filled: ${alreadyFilled})`, "error"); return;
        }
      }
    }
    const stageEntry = { ...form, id: uid(), timestamp: new Date().toLocaleString() };
    setJobOrders(prev => prev.map(j => {
      if (j.joNo !== form.joNo) return j;
      const history = [...(j.stageHistory || []), stageEntry];
      const processes = j.process || [];

      
      const stageQtyMap = { ...(j.stageQtyMap || {}) };
      const prevQty = +(stageQtyMap[form.stage] || 0);
      const addedQty = +(form.qtyCompleted || 0) + +(form.qtyRejected || 0);
      stageQtyMap[form.stage] = prevQty + addedQty;

      
      let stageNowComplete = false;
      if (form.stage === "Printing" && j.hasSecondPaper) {
        
        const p1filled = stageQtyMap["Printing"] || 0;
        const p1target = getStageTarget(j, "Printing");
        const p2filled = stageQtyMap["Printing 2"] || 0;
        const p2target = getStageTarget(j, "Printing 2");
        stageNowComplete = p1filled >= p1target && p1target > 0 && p2filled >= p2target && p2target > 0;
      } else if (form.stage === "Printing 2" && j.hasSecondPaper) {
        
        const p1filled = stageQtyMap["Printing"] || 0;
        const p1target = getStageTarget(j, "Printing");
        const p2filled = stageQtyMap["Printing 2"] || 0;
        const p2target = getStageTarget(j, "Printing 2");
        stageNowComplete = p1filled >= p1target && p1target > 0 && p2filled >= p2target && p2target > 0;
      } else {
        const target = getStageTarget(j, form.stage);
        const filledNow = stageQtyMap[form.stage];
        stageNowComplete = target > 0 ? filledNow >= target : true;
        if (!stageNowComplete) {
          const orderedJOProcs = STAGES.filter(p => processes.includes(p));
          const stageIdx = orderedJOProcs.indexOf(form.stage);
          if (stageIdx > 0) {
            const prevProc = orderedJOProcs[stageIdx - 1];
            const prevOutput = [...(j.stageHistory || []), stageEntry]
              .filter(h => h.stage === prevProc)
              .reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
            if (prevOutput > 0 && filledNow >= prevOutput) stageNowComplete = true;
          }
        }
      }

      const completed = [...(j.completedProcesses || [])];
      
      const stageForCompletion = (form.stage === "Printing 2" && j.hasSecondPaper) ? "Printing" : form.stage;
      if (stageNowComplete && processes.includes(stageForCompletion) && !completed.includes(stageForCompletion)) {
        completed.push(stageForCompletion);
      }

      const orderedJOProcesses = STAGES.filter(p => processes.includes(p));
      const nextProcess = orderedJOProcesses.find(p => !completed.includes(p));
      const FORMATION_STAGES = ["Formation", "Manual Formation"];
      let newStatus;
      if (nextProcess) {
        newStatus = nextProcess + " Pending";
      } else if (processes.length > 0) {
        const lastCompleted = completed[completed.length - 1];
        if (FORMATION_STAGES.includes(form.stage) || FORMATION_STAGES.includes(lastCompleted)) {
          newStatus = "Completed";
        } else if (form.stage === "QC") {
          newStatus = "Dispatch Ready";
        } else if (form.stage === "Dispatch Ready") {
          newStatus = "Completed";
        } else {
          newStatus = "QC Pending";
        }
      } else {
        if (FORMATION_STAGES_QTY.includes(form.stage)) {
          newStatus = "Completed";
        } else {
          newStatus = form.stage === STAGES[STAGES.length - 1] ? "Completed" : form.stage + " Done";
        }
      }
      return { ...j, currentStage: form.stage, stageHistory: history, completedProcesses: completed, stageQtyMap, status: newStatus };
    }));
    
    const FORMATION_DONE = ["Formation", "Manual Formation"];
    const j = jobOrders.find(j => j.joNo === form.joNo);
    const processes = j?.process || [];
    
    const simQtyMap = { ...(j?.stageQtyMap || {}) };
    const simAdded = +(form.qtyCompleted || 0) + +(form.qtyRejected || 0);
    simQtyMap[form.stage] = (+(simQtyMap[form.stage] || 0)) + simAdded;
    const simTarget = getStageTarget(j, form.stage);
    const stageTargetReached = simTarget > 0 ? simQtyMap[form.stage] >= simTarget : true;
    const completedAfter = [...(j?.completedProcesses || [])];
    if (stageTargetReached && processes.includes(form.stage) && !completedAfter.includes(form.stage)) {
      completedAfter.push(form.stage);
    }
    const isCompletion = FORMATION_DONE.some(s => completedAfter.includes(s)) ||
      (processes.length === 0 && FORMATION_DONE.includes(form.stage) && stageTargetReached);

    const isFormationStage = FORMATION_DONE.includes(form.stage);

    
    if (isFormationStage) {
      const activeJO = currentJO || selectedJO;
      const qtyToAdd = +form.qtyCompleted || 0;
      if (activeJO && qtyToAdd > 0) {
        const itemName = (activeJO.itemName || activeJO.product || "").trim();
        const price = (() => {
          if (!activeJO.soRef) return 0;
          const linkedSO = salesOrders.find(s => s.soNo === activeJO.soRef);
          if (!linkedSO) return 0;
          const items = linkedSO.items || [];
          const match = items.find(it => (it.itemName||"").trim().toLowerCase() === itemName.toLowerCase());
          return match && match.price ? +match.price : 0;
        })();
        setFgStock(prev => {
          const arr = [...prev];
          const idx = arr.findIndex(f => (f.itemName||f.product||"").trim().toLowerCase() === itemName.toLowerCase());
          if (idx >= 0) {
            arr[idx] = { ...arr[idx], qty: (+(arr[idx].qty)||0) + qtyToAdd, lastUpdated: form.date };
          } else {
            arr.push({ id: uid(), itemName: itemName || "Unknown", joNo: form.joNo, qty: qtyToAdd, unit: "nos", date: form.date, price });
          }
          return arr;
        });
          }
    }

    
    if (isCompletion) {
      setWipStock(prev => prev.filter(w => w.joNo !== form.joNo));
    } else {
      setWipStock(prev => {
        const idx = prev.findIndex(w => w.joNo === form.joNo);
        if (idx >= 0) { const s = [...prev]; s[idx] = { ...s[idx], stage: form.stage, qty: +form.qtyCompleted, updatedAt: form.date }; return s; }
        return [...prev, { id: uid(), joNo: form.joNo, product: currentJO?.itemName || currentJO?.product, stage: form.stage, qty: +form.qtyCompleted, unit: "nos", updatedAt: form.date }];
      });
    }
    toast("Stage updated: " + form.stage + " for " + form.joNo);
    setForm(blank);
  };

  const activeJOs = jobOrders.filter(j => j.status !== "Completed");

  const [prodTab, setProdTab] = useState("details");
  const [editEntry, setEditEntry] = useState(null); 
  const [recordsFilter, setRecordsFilter] = useState("");

  return (
    <div className="fade">
      <SectionTitle icon="🔧" title="Production" sub="Record and track stage-wise production progress" />

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["details", "🔧 Production Details"], ["records", "📋 Records"], ["status", "📊 Production Status"]].map(([v, l]) => (
          <button key={v} onClick={() => setProdTab(v)} style={{
            padding: "8px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: `1px solid ${prodTab === v ? C.accent : C.border}`,
            background: prodTab === v ? C.accent + "22" : "transparent",
            color: prodTab === v ? C.accent : C.muted,
          }}>{l}</button>
        ))}
      </div>

      {prodTab === "details" && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 16 }}>Stage Update Entry</h3>
            <FormGrid>
              <Field label="Job Order *">
                <select value={form.joNo} onChange={e => setForm(f => ({ ...f, joNo: e.target.value }))}>
                  <option value="">-- Select Job Order --</option>
                  {activeJOs.map(j => <option key={j.joNo} value={j.joNo}>{j.joNo} – {j.itemName || j.product || ""}</option>)}
                </select>
              </Field>
              {selectedJO && (
                <Field label="Current Stage">
                  <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.muted }}>{selectedJO.currentStage}</div>
                </Field>
              )}
              {selectedJO && (
                <Field label="Order Quantity">
                  <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: selectedJO.orderQty ? C.text : C.muted, fontWeight: selectedJO.orderQty ? 700 : 400, fontFamily: selectedJO.orderQty ? "'JetBrains Mono',monospace" : undefined }}>
                    {selectedJO.orderQty || "—"}
                  </div>
                </Field>
              )}
              {selectedJO && (
                <Field label="# of Sheets">
                  <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: selectedJO.noOfSheets ? C.text : C.muted, fontWeight: selectedJO.noOfSheets ? 700 : 400, fontFamily: selectedJO.noOfSheets ? "'JetBrains Mono',monospace" : undefined }}>
                    {selectedJO.noOfSheets ? `Paper 1: ${selectedJO.noOfSheets}` : "—"}
                    {selectedJO.hasSecondPaper && selectedJO.noOfSheets2 && (
                      <span style={{ color: C.accent, marginLeft: 8 }}>· Paper 2: {selectedJO.noOfSheets2}</span>
                    )}
                  </div>
                </Field>
              )}
              <Field label="Production Stage *">
                <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                  <option value="">-- Select Stage --</option>
                  {(() => {
                    const joProcesses = selectedJO?.process || STAGES;
                    const completed = selectedJO?.completedProcesses || [];
                    const FORMATION_LOCAL = ["Formation", "Manual Formation"];
                    const available = STAGES.filter(s => {
                      if (!joProcesses.includes(s)) return false;
                      if (FORMATION_LOCAL.includes(s)) {
                        const target = getStageTarget(selectedJO, s);
                        const filled = getStageFilledQty(selectedJO, s);
                        return target > 0 ? filled < target : !completed.includes(s);
                      }
                      return !completed.includes(s);
                    });
                    
                    const stages = [];
                    available.forEach(s => {
                      stages.push(s);
                      if (s === "Printing" && selectedJO?.hasSecondPaper && !completed.includes("Printing")) {
                        stages.push("Printing 2");
                      }
                    });
                    return stages.length > 0 ? stages.map(s => {
                      const target = getStageTarget(selectedJO, s);
                      const filled = getStageFilledQty(selectedJO, s);
                      const remaining = target > 0 ? target - filled : null;
                      const label = s === "Printing" && selectedJO?.hasSecondPaper ? "Printing (Paper 1)"
                        : s === "Printing 2" ? "Printing (Paper 2)"
                        : s;
                      return (
                        <option key={s} value={s}>
                          {label}{remaining !== null ? ` (${filled}/${target})` : ""}
                        </option>
                      );
                    }) : <option disabled value="">All processes completed</option>;
                  })()}
                </select>
                {selectedJO && (() => {
                  const joProcesses = selectedJO.process || STAGES;
                  const completed = selectedJO.completedProcesses || [];
                  const available = STAGES.filter(s => joProcesses.includes(s) && !completed.includes(s));
                  if (available.length === 0) return <div style={{ fontSize: 11, color: C.green, marginTop: 4, fontWeight: 600 }}>✓ All processes done for this Job Order</div>;
                  if (form.stage) {
                    const target = getStageTarget(selectedJO, form.stage);
                    const filled = getStageFilledQty(selectedJO, form.stage);
                    if (target > 0) return (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                        {form.stage}: <span style={{ color: C.accent, fontWeight: 700 }}>{filled}</span> / {target} filled
                        {target - filled > 0 && <span style={{ color: C.yellow }}> · {target - filled} remaining</span>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </Field>
              <Field label="Operator / Worker *"><input placeholder="Name of operator" value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} style={!form.operator.trim() ? { border: `1px solid ${C.red}` } : {}} /></Field>
              <Field label="Date *"><DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} /></Field>
              <Field label="Qty Completed *"><input type="number" placeholder="Qty done in this stage" value={form.qtyCompleted} onChange={e => setForm(f => ({ ...f, qtyCompleted: e.target.value }))} /></Field>
              <Field label="Qty Rejected"><input type="number" placeholder="Rejected / scrap qty" value={form.qtyRejected} onChange={e => setForm(f => ({ ...f, qtyRejected: e.target.value }))} /></Field>
              <Field label="Shift">
                <select value={form.shift || ""} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}>
                  <option value="">-- Shift --</option>
                  {["Morning", "Afternoon", "Night"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Remarks" span={2}><input placeholder="Issues, observations, notes" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} /></Field>
            </FormGrid>
            {selectedJO && (
              <div style={{ marginTop: 16, padding: 12, background: C.surface, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>PROCESS PROGRESS</span>
                  <Badge label={selectedJO.status || "Open"} color={selectedJO.status === "Completed" ? C.green : selectedJO.status?.includes("Pending") ? C.accent : C.muted} />
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(() => {
                    const joProcs = selectedJO.process || [];
                    const orderedProcs = STAGES.filter(p => joProcs.includes(p));
                    return orderedProcs.map(s => {
                      const done = (selectedJO.completedProcesses || []).includes(s);
                      const current = selectedJO.currentStage === s;
                      return (
                        <div key={s} style={{
                          padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: done ? C.green + "22" : current ? C.accent + "22" : C.border + "44",
                          color: done ? C.green : current ? C.accent : C.muted,
                          border: `1px solid ${done ? C.green : current ? C.accent : C.border}55`
                        }}>{done ? "✓ " : ""}{s}</div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
            <SubmitBtn label="Update Stage" color={C.accent} onClick={submit} />
          </Card>
        </>
      )}

      {prodTab === "records" && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <input placeholder="🔍 Filter by JO# or stage..." value={recordsFilter} onChange={e => setRecordsFilter(e.target.value)} style={{ maxWidth: 220 }} />
            <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
            <button onClick={() => {
              const rows = [];
              jobOrders.forEach(j => {
                (j.stageHistory || []).forEach(e => {
                  if (drDateFrom && (e.date||"") < drDateFrom) return;
                  if (drDateTo   && (e.date||"") > drDateTo)   return;
                  if (recordsFilter &&
                    !j.joNo.toLowerCase().includes(recordsFilter.toLowerCase()) &&
                    !(e.stage||"").toLowerCase().includes(recordsFilter.toLowerCase())) return;
                  rows.push({
                    "Date":           e.date || "",
                    "JO No":          j.joNo || "",
                    "Item Name":      j.itemName || j.product || "",
                    "Client":         j.clientName || "",
                    "Stage":          e.stage || "",
                    "Qty Completed":  e.qtyCompleted || 0,
                    "Qty Rejected":   e.qtyRejected  || 0,
                    "Operator":       e.operator || "",
                    "Shift":          e.shift || "",
                    "Remarks":        e.remarks || "",
                  });
                });
              });
              rows.sort((a, b) => (a.Date > b.Date ? -1 : 1));
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Production");
              const suffix = drDateFrom || drDateTo ? `_${drDateFrom||""}to${drDateTo||""}` : `_${today()}`;
              xlsxDownload(wb, `Production_Records${suffix}.xlsx`);
            }} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>⬇ Export Excel</button>
          </div>
          {jobOrders.filter(j => (j.stageHistory || []).length > 0).map(j => {
            const entries = (j.stageHistory || []).filter(e => {
              if (drDateFrom && (e.date||"") < drDateFrom) return false;
              if (drDateTo   && (e.date||"") > drDateTo)   return false;
              return !recordsFilter ||
                j.joNo.toLowerCase().includes(recordsFilter.toLowerCase()) ||
                e.stage.toLowerCase().includes(recordsFilter.toLowerCase());
            });
            if (!entries.length) return null;
            return (
              <Card key={j.joNo} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, fontWeight: 700 }}>{j.joNo}</span>
                    <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{j.itemName || j.product || ""}</span>
                  </div>
                  <Badge label={j.status || "Open"} color={j.status === "Completed" ? C.green : C.accent} />
                </div>
                {entries.map(entry => (
                  <div key={entry.id} style={{
                    padding: "10px 12px", marginBottom: 8, background: C.surface,
                    borderRadius: 8, border: `1px solid ${C.border}`
                  }}>
                    {editEntry?.joNo === j.joNo && editEntry?.entryId === entry.id ? (
                      
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Stage</label>
                            <select value={editEntry.fields.stage} onChange={e => setEditEntry(p => ({ ...p, fields: { ...p.fields, stage: e.target.value } }))}>
                              {STAGES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Qty Completed</label>
                            <input type="number" value={editEntry.fields.qtyCompleted} onChange={e => setEditEntry(p => ({ ...p, fields: { ...p.fields, qtyCompleted: e.target.value } }))} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Qty Rejected</label>
                            <input type="number" value={editEntry.fields.qtyRejected} onChange={e => setEditEntry(p => ({ ...p, fields: { ...p.fields, qtyRejected: e.target.value } }))} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Operator</label>
                            <input value={editEntry.fields.operator || ""} onChange={e => setEditEntry(p => ({ ...p, fields: { ...p.fields, operator: e.target.value } }))} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Date</label>
                            <DatePicker value={editEntry.fields.date} onChange={v => setEditEntry(p => ({ ...p, fields: { ...p.fields, date: v } }))} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Remarks</label>
                            <input value={editEntry.fields.remarks || ""} onChange={e => setEditEntry(p => ({ ...p, fields: { ...p.fields, remarks: e.target.value } }))} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => {
                            setJobOrders(prev => prev.map(jo => {
                              if (jo.joNo !== j.joNo) return jo;
                              const oldEntry = (jo.stageHistory || []).find(e => e.id === entry.id);
                              const stageQtyMap = { ...(jo.stageQtyMap || {}) };
                              const oldTotal = +(oldEntry?.qtyCompleted || 0) + +(oldEntry?.qtyRejected || 0);
                              const newTotal = +(editEntry.fields.qtyCompleted || 0) + +(editEntry.fields.qtyRejected || 0);
                              
                              stageQtyMap[entry.stage] = Math.max(0, (+(stageQtyMap[entry.stage] || 0)) - oldTotal);
                              
                              const newStage = editEntry.fields.stage;
                              stageQtyMap[newStage] = (+(stageQtyMap[newStage] || 0)) + newTotal;
                              const newHistory = jo.stageHistory.map(e => e.id === entry.id ? { ...e, ...editEntry.fields } : e);
                              return recomputeJO(jo, stageQtyMap, newHistory);
                            }));
                            setEditEntry(null);
                            toast("Entry updated");
                          }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12 }}>Save</button>
                          <button onClick={() => setEditEntry(null)} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                          {canEditProduction && <button onClick={() => {
                            setJobOrders(prev => prev.map(jo => {
                              if (jo.joNo !== j.joNo) return jo;
                              const stageQtyMap = { ...(jo.stageQtyMap || {}) };
                              const total = +(entry.qtyCompleted || 0) + +(entry.qtyRejected || 0);
                              stageQtyMap[entry.stage] = Math.max(0, (+(stageQtyMap[entry.stage] || 0)) - total);
                              const newHistory = jo.stageHistory.filter(e => e.id !== entry.id);
                              return recomputeJO(jo, stageQtyMap, newHistory);
                            }));
                            setEditEntry(null);
                            toast("Entry deleted");
                          }} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 6, padding: "7px 16px", fontWeight: 700, fontSize: 12, marginLeft: "auto" }}>Delete</button>}
                        </div>
                      </div>
                    ) : (
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                          <Badge label={entry.stage} color={C.accent} />
                          <span style={{ fontSize: 13 }}>✓ <strong>{entry.qtyCompleted}</strong> done</span>
                          {+entry.qtyRejected > 0 && <span style={{ fontSize: 13, color: C.red }}>✕ {entry.qtyRejected} rejected</span>}
                          {entry.operator && <span style={{ fontSize: 12, color: C.muted }}>👤 {entry.operator}</span>}
                          {entry.shift && <span style={{ fontSize: 12, color: C.muted }}>🕐 {entry.shift}</span>}
                          <span style={{ fontSize: 12, color: C.muted }}>{entry.date}</span>
                          {entry.remarks && <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>"{entry.remarks}"</span>}
                        </div>
                        {canEditProduction && <button onClick={() => setEditEntry({ joNo: j.joNo, entryId: entry.id, fields: { ...entry } })}
                          style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>✏️ Edit</button>}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            );
          })}
          {jobOrders.every(j => !(j.stageHistory || []).length) && (
            <Card style={{ textAlign: "center", padding: 40, color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              No production entries yet.
            </Card>
          )}
        </>
      )}

      {prodTab === "status" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 14 }}>WIP Stock ({wipStock.length})</h3>
              {wipStock.length === 0 ? (
                <div style={{ textAlign: "center", color: C.muted, padding: "24px 0", fontSize: 13 }}>No WIP items</div>
              ) : wipStock.map(w => (
                <div key={w.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}22` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, fontSize: 12 }}>{w.joNo}</span>
                    <Badge label={w.stage} color={C.accent} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{w.product}</div>
                  <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: C.accent, width: `${((STAGES.indexOf(w.stage) + 1) / STAGES.length) * 100}%`, transition: "width .5s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Stage {STAGES.indexOf(w.stage) + 1} of {STAGES.length} · {fmt(w.qty)} {w.unit}</div>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 14 }}>FG Stock ({fgStock.length})</h3>
              <Table cols={["Product", "JO#", "Qty", "Date"]}
                rows={fgStock.map(f => [
                  f.product,
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, fontSize: 11 }}>{f.joNo}</span>,
                  <span style={{ color: C.green, fontFamily: "'JetBrains Mono',monospace" }}>{fmt(f.qty)} {f.unit}</span>,
                  f.date
                ])} />
            </Card>
          </div>

          {}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 14 }}>All Job Orders ({jobOrders.length})</h3>
            <Table
              cols={["JO#", "Item Name", "Client", "Stage", "Progress", "Status"]}
              rows={jobOrders.slice().reverse().map(j => {
                const processes = j.process && j.process.length > 0 ? j.process : [];
                const completedCount = (j.completedProcesses || []).filter(p => processes.includes(p)).length;
                const pct = j.status === "Completed" ? 100 : processes.length > 0 ? Math.round((completedCount / processes.length) * 100) : 0;
                return [
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, whiteSpace: "nowrap", fontSize: 11 }}>{j.joNo}</span>,
                  <span style={{ fontSize: 12 }}>{j.itemName || j.product || "—"}</span>,
                  j.clientName || "—",
                  <Badge label={j.status === "Completed" ? "Order Completed" : (j.currentStage || "Not Started")} color={j.status === "Completed" ? C.green : C.blue} />,
                  <div style={{ minWidth: 80 }}>
                    <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
                      <div style={{ height: "100%", borderRadius: 3, background: j.status === "Completed" ? C.green : C.accent, width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>{pct}%</div>
                  </div>,
                  <Badge label={j.status} color={j.status === "Completed" ? C.green : j.status === "Dispatch Ready" ? C.purple : j.status === "QC Pending" ? C.yellow : j.status.includes("Pending") ? C.accent : C.muted} />
                ];
              })}
              emptyMsg="No job orders yet."
            />
          </Card>
        </>
      )}
    </div>
  );
}



function printDispatch(d, itemMasterFG) {
  const fgItems = (itemMasterFG?.["Finished Goods"] || []);
  var itemRows = (d.items || []).map(function(it) {
    
    const master = fgItems.find(x => x.name?.toLowerCase() === (it.itemName || "").toLowerCase());
    const clientCode = master?.clientCodes?.[d.clientName] || "";
    const internalCode = it.productCode || master?.code || "";
    const displayCode = clientCode || internalCode || "—";
    const codeLabel = clientCode
      ? "<span style='font-family:monospace;font-weight:700;color:#7c3aed'>" + clientCode + "</span>"
      : "<span style='font-family:monospace;font-weight:700;color:#555'>" + (internalCode || "—") + "</span>";
    var noOfBox = (it.pcsPerBox && it.qty) ? Math.ceil(+(it.qty) / +(it.pcsPerBox)) : "";
    var pcsBoxVal = it.pcsPerBox || "—";
    var noBoxVal = noOfBox || "—";
    return "<tr><td>" + codeLabel + "</td><td>" + (it.itemName || "") + "</td><td style='text-align:right'>" + (it.qty || "—") + "</td><td>" + (it.unit || "nos") + "</td>" +
      "<td style='text-align:center;font-weight:700'>" + pcsBoxVal + "</td>" +
      "<td style='text-align:center;font-weight:700'>" + noBoxVal + "</td></tr>";
  }).join("");
  var totalQty = (d.items || []).reduce(function(s, it) { return s + (+(it.qty || 0)); }, 0);

  var html = "<div style='border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;text-align:center'>" +
    "<div style='font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px'>AARAY PACKAGING PRIVATE LIMITED</div>" +
    "<div style='font-size:10px;color:#666;margin-bottom:1px'>Unit I: A7/64 &amp; A7/65, South Side GT Road Industrial Area, Ghaziabad</div>" +
    "<div style='font-size:10px;color:#666;margin-bottom:4px'>Unit II: 27MI &amp; 28MI, South Side GT Road Industrial Area, Ghaziabad</div>" +
    "<div style='font-size:10px;color:#444'>www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540</div></div>" +
    "<div class='header'><div><h1>Delivery Challan</h1><h2>" + (d.dispatchNo || "") + "</h2></div>" +
    "<div style='text-align:right'><div style='font-size:11px;color:#888'>Status</div><div style='font-weight:bold;color:#7c3aed'>" + (d.status || "Dispatched") + "</div></div></div>" +
    "<div class='section'><div class='section-title'>Dispatch Details</div><div class='field-grid'>" +
    "<div class='field'><label>Dispatch Date</label><span>" + (d.dispatchDate || "") + "</span></div>" +
    "<div class='field'><label>Sales Order #</label><span>" + (d.soRef || "—") + "</span></div>" +
    "<div class='field'><label>Client Name</label><span>" + (d.clientName || "") + "</span></div>" +
    "<div class='field'><label>Vehicle No.</label><span>" + (d.vehicleNo || "—") + "</span></div>" +
    "<div class='field'><label>Driver Name</label><span>" + (d.driverName || "—") + "</span></div>" +
    "<div class='field'><label>Delivery Address</label><span>" + (d.deliveryAddress || "—") + "</span></div>" +
    "</div></div>" +
    "<div class='section'><div class='section-title'>Items Dispatched</div>" +
    "<table><thead><tr><th>Product Code</th><th>Item Name</th><th style='text-align:right'>Quantity</th><th>Unit</th><th>Pcs/Box</th><th>No. of Box</th></tr></thead>" +
    "<tbody>" + itemRows + "</tbody>" +
    "<tfoot><tr><td></td><td style='font-weight:800'>Total</td><td style='text-align:right;font-weight:800'>" + totalQty.toLocaleString("en-IN") + "</td><td></td><td></td><td></td></tr></tfoot>" +
    "</table></div>" +
    (d.remarks ? "<div class='section'><div class='section-title'>Remarks</div><p>" + d.remarks + "</p></div>" : "") +
    "<div class='footer'><span>Generated on " + new Date().toLocaleDateString("en-IN") + "</span><span>This is a computer generated document</span></div>" +
    "<div style='margin-top:40px;display:flex;justify-content:space-between;padding-top:10px'>" +
    "<div style='text-align:center;width:200px'><div style='border-top:1px solid #000;padding-top:6px;font-size:11px'>Authorised Signatory</div></div>" +
    "<div style='text-align:center;width:200px'><div style='border-top:1px solid #000;padding-top:6px;font-size:11px'>Receiver&apos;s Signature</div></div>" +
    "</div>";

  var css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px}" +
    "h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:16px}" +
    "table{width:100%;border-collapse:collapse;margin-top:12px}" +
    "th{background:#f0f0f0;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd}" +
    "td{padding:6px 10px;border:1px solid #eee;font-size:12px}" +
    "tr:nth-child(even) td{background:#fafafa}tr:nth-child(even) td[style*=background]{background:unset}" +
    "tfoot tr td{background:#f0f0f0;font-weight:700;border-top:2px solid #ddd}" +
    ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:12px}" +
    ".section{margin-top:16px}.section-title{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}" +
    ".field-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}" +
    ".field label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;display:block;margin-bottom:2px}" +
    ".field span{font-size:13px;font-weight:500}" +
    ".footer{margin-top:24px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}" +
    "@media print{body{margin:10px}}";

  var fullHtml = "<!DOCTYPE html><html><head><title>" + (d.dispatchNo || "Dispatch") + "</title><style>" + css + "</style></head><body>" + html + "</body></html>";
  var blob = new Blob([fullHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = (d.dispatchNo || "Dispatch") + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function Dispatch({ dispatches, setDispatches, fgStock, setFgStock, salesOrders, setSalesOrders, jobOrders, clientMaster, itemMasterFG, toast, dispatchCounter, setDispatchCounter }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditDispatch = canEdit("dispatch");
  const blank = { dispatchDate: today(), soRef: "", clientName: "", deliveryAddress: "", vehicleNo: "", driverName: "", remarks: "", status: "Dispatched" };
  const blankItem = () => ({ _id: uid(), itemName: "", qty: "", unit: "nos", pcsPerBox: "", noOfBox: "" });

  const [form, setForm] = useState(blank);
  const [items, setItems] = useState([blankItem()]);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState("form");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo,   setDrDateTo]   = useState("");

  
  const { fgStockMap, availableFGItems } = React.useMemo(() => {
    const map = {};
    fgStock.forEach(f => { const k = (f.itemName||f.product||"").trim(); if (k) map[k] = (map[k]||0) + (+(f.qty)||0); });
    return { fgStockMap: map, availableFGItems: Object.keys(map).filter(k => map[k] > 0) };
  }, [fgStock]);

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === "soRef" && v) {
        const so = salesOrders.find(s => s.soNo === v);
        if (so) {
          updated.clientName = so.clientName || "";
          
          setItems([blankItem()]);
        }
      }
      if (k === "soRef" && !v) {
        
        setItems([blankItem()]);
      }
      return updated;
    });
    setErrors(e => ({ ...e, [k]: false }));
  };

  const setItem = (idx, k, v) => {
    setItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [k]: v }; return u; });
  };
  const addItem = () => setItems(p => [...p, blankItem()]);
  const removeItem = idx => { if (items.length === 1) return; setItems(p => p.filter((_, i) => i !== idx)); };

  const E = k => errors[k] ? { border: "1px solid " + C.red } : {};
  const EMsg = (k) => {
    if (!errors[k]) return null;
    return (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>);
  };

  const submit = () => {
    const e = {};
    if (!form.dispatchDate) e.dispatchDate = true;
    if (!form.clientName) e.clientName = true;
    if (!form.vehicleNo) e.vehicleNo = true;
    if (items.some(it => !it.itemName || !it.qty)) e.items = true;
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const msgs = [];
      if (e.dispatchDate) msgs.push("Dispatch Date");
      if (e.clientName) msgs.push("Client Name");
      if (e.vehicleNo) msgs.push("Vehicle Number");
      if (e.items) msgs.push("Items — fill Item Name and Qty for all rows");
      toast(msgs, "validation");
      return;
    }
    
    const stockErrors = items
      .filter(it => it.itemName && it.qty)
      .map(it => {
        const available = fgStockMap[(it.itemName || "").trim()] || 0;
        const required = +(it.qty);
        if (required > available) {
          return `${it.itemName}: required ${fmt(required)}, available ${fmt(available)}`;
        }
        return null;
      })
      .filter(Boolean);
    if (stockErrors.length > 0) {
      toast(["Insufficient FG Stock — dispatch not created:", ...stockErrors], "error");
      return;
    }


    
    setFgStock(prev => {
      let arr = prev.map(f => ({ ...f })); 
      items.forEach(it => {
        if (!it.itemName || !it.qty) return;
        let remaining = +(it.qty);
        const itemKey = (it.itemName || "").trim().toLowerCase();
        arr = arr.map(f => {
          if (remaining <= 0) return f;
          const key = (f.itemName || f.product || "").trim().toLowerCase();
          if (key !== itemKey) return f;
          const deduct = Math.min(remaining, +(f.qty) || 0);
          remaining -= deduct;
          return { ...f, qty: (+(f.qty) || 0) - deduct };
        });
      });
      return arr.filter(f => (+(f.qty) || 0) > 0);
    });

    const dispatchNo = "Dispatch" + dispatchCounter;
    setDispatchCounter(n => n + 1);
    
    const fgItems = (itemMasterFG?.["Finished Goods"] || []);
    const itemsWithCode = items.map(it => {
      const master = fgItems.find(x => x.name?.toLowerCase() === (it.itemName || "").toLowerCase());
      return { ...it, productCode: it.productCode || master?.code || "" };
    });
    const newDispatchEntry = { ...form, dispatchNo, id: uid(), items: itemsWithCode };
    setDispatches(p => [...p, newDispatchEntry]);

    
    if (form.soRef) {
      const so = salesOrders.find(s => s.soNo === form.soRef);
      if (so && so.status !== "Closed") {
        const soItems = so.items && so.items.length > 0 ? so.items : [so];
        const allDispatches = [...dispatches, newDispatchEntry];
        const allClosed = soItems.every(soIt => {
          const itemName = (soIt.itemName || "").trim().toLowerCase();
          const orderQty = +(soIt.orderQty || 0);
          
          const linkedJO = jobOrders.find(j =>
            j.soRef === form.soRef &&
            (j.itemName || "").trim().toLowerCase() === itemName
          );
          const productionQty = linkedJO ? +(linkedJO.orderQty || 0) : 0;
          const threshold = Math.max(orderQty * 0.95, productionQty);
          
          const totalDispatched = allDispatches
            .filter(d => d.soRef === form.soRef)
            .flatMap(d => d.items || [])
            .filter(di => (di.itemName || "").trim().toLowerCase() === itemName)
            .reduce((s, di) => s + +(di.qty || 0), 0);
          return threshold > 0 && totalDispatched >= threshold;
        });
        if (allClosed) {
          setSalesOrders(prev => prev.map(s => s.soNo === form.soRef ? { ...s, status: "Closed" } : s));
          toast(`Dispatch recorded: ${dispatchNo} — SO ${form.soRef} closed (all SKUs fulfilled)`);
        } else {
          toast("Dispatch recorded: " + dispatchNo);
        }
      } else {
        toast("Dispatch recorded: " + dispatchNo);
      }
    } else {
      toast("Dispatch recorded: " + dispatchNo);
    }

    setForm(blank);
    setItems([blankItem()]);
    setErrors({});
  };

  
  const saveDispatchEdit = (originalRecord, updatedData) => {
    const oldItems = originalRecord.items || [];
    const newItems = updatedData.items || [];

    
    
    const tempStockMap = {};
    fgStock.forEach(f => {
      const k = (f.itemName || f.product || "").trim().toLowerCase();
      if (k) tempStockMap[k] = (tempStockMap[k] || 0) + (+(f.qty) || 0);
    });
    oldItems.forEach(it => {
      if (!it.itemName || !it.qty) return;
      const k = (it.itemName || "").trim().toLowerCase();
      tempStockMap[k] = (tempStockMap[k] || 0) + +(it.qty);
    });
    const editStockErrors = newItems
      .filter(it => it.itemName && it.qty)
      .map(it => {
        const k = (it.itemName || "").trim().toLowerCase();
        const available = tempStockMap[k] || 0;
        const required = +(it.qty);
        if (required > available) {
          return `${it.itemName}: required ${fmt(required)}, available ${fmt(available)}`;
        }
        return null;
      })
      .filter(Boolean);
    if (editStockErrors.length > 0) {
      toast(["Insufficient FG Stock — dispatch not updated:", ...editStockErrors], "error");
      return;
    }

    setFgStock(prev => {
      let stock = prev.map(f => ({ ...f }));

      
      oldItems.forEach(it => {
        if (!it.itemName || !it.qty) return;
        const itemKey = (it.itemName || "").trim().toLowerCase();
        let remaining = +(it.qty);
        
        const idx = stock.findIndex(f => (f.itemName || f.product || "").trim().toLowerCase() === itemKey);
        if (idx >= 0) {
          stock[idx] = { ...stock[idx], qty: (+(stock[idx].qty) || 0) + remaining };
        } else {
          
          stock.push({ id: "FG-" + uid(), itemName: it.itemName, qty: remaining, unit: it.unit || "nos" });
        }
      });

      
      newItems.forEach(it => {
        if (!it.itemName || !it.qty) return;
        const itemKey = (it.itemName || "").trim().toLowerCase();
        let remaining = +(it.qty);
        stock = stock.map(f => {
          if (remaining <= 0) return f;
          const key = (f.itemName || f.product || "").trim().toLowerCase();
          if (key !== itemKey) return f;
          const deduct = Math.min(remaining, +(f.qty) || 0);
          remaining -= deduct;
          return { ...f, qty: (+(f.qty) || 0) - deduct };
        });
      });

      return stock.filter(f => (+(f.qty) || 0) > 0);
    });

    setDispatches(prev => prev.map(x => x.id === originalRecord.id ? { ...x, ...updatedData } : x));
    setEditId(null);
    toast("Dispatch updated — FG stock recalculated");
  };

  const filtered = React.useMemo(() => dispatches.slice().reverse().filter(d => {
    if (drDateFrom && (d.dispatchDate||"") < drDateFrom) return false;
    if (drDateTo   && (d.dispatchDate||"") > drDateTo)   return false;
    return !search || (d.dispatchNo||"").toLowerCase().includes(search.toLowerCase()) ||
      (d.clientName||"").toLowerCase().includes(search.toLowerCase()) ||
      (d.soRef||"").toLowerCase().includes(search.toLowerCase());
  }), [dispatches, drDateFrom, drDateTo, search]);

  const exportToExcel = () => {
    const rows = [];
    filtered.forEach(d => {
      (d.items || []).forEach(it => {
        rows.push({
          "Dispatch No":       d.dispatchNo || "",
          "Dispatch Date":     d.dispatchDate || "",
          "Client Name":       d.clientName || "",
          "SO Ref":            d.soRef || "",
          "Status":            d.status || "Dispatched",
          "Product Code":      it.productCode || "",
          "Item Name":         it.itemName || "",
          "Qty":               it.qty || "",
          "Unit":              it.unit || "",
          "Pcs/Box":           it.pcsPerBox || "",
          "No. of Box":        (it.pcsPerBox && it.qty) ? Math.ceil(+(it.qty) / +(it.pcsPerBox)) : "",
          "Vehicle No":        d.vehicleNo || "",
          "Driver":            d.driverName || "",
          "Delivery Address":  d.deliveryAddress || "",
          "Remarks":           d.remarks || "",
        });
      });
      if (!(d.items || []).length) {
        rows.push({
          "Dispatch No": d.dispatchNo || "", "Dispatch Date": d.dispatchDate || "",
          "Client Name": d.clientName || "", "SO Ref": d.soRef || "",
          "Status": d.status || "Dispatched", "Product Code": "", "Item Name": "",
          "Qty": "", "Unit": "", "Vehicle No": d.vehicleNo || "",
          "Driver": d.driverName || "", "Delivery Address": d.deliveryAddress || "",
          "Remarks": d.remarks || "",
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatch Records");
    const suffix = drDateFrom || drDateTo ? `_${drDateFrom||""}to${drDateTo||""}` : `_${today()}`;
    xlsxDownload(wb, `Dispatch_Records${suffix}.xlsx`);
  };

  return (
    <div className="fade">
      <SectionTitle icon="🚛" title="Dispatch" sub="Record outgoing dispatches against sales orders" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["form", "📝 New Dispatch"], ["records", "📋 Records (" + dispatches.length + ")"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: "1px solid " + (view === v ? C.purple : C.border),
            background: view === v ? C.purple + "22" : "transparent",
            color: view === v ? C.purple : C.muted
          }}>{l}</button>
        ))}
      </div>

      {view === "form" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 16 }}>Dispatch Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              <Field label="Dispatch Date *"><DatePicker value={form.dispatchDate} onChange={v => set("dispatchDate", v)} style={E("dispatchDate")} />{EMsg("dispatchDate")}</Field>
              <Field label="Sales Order #">
                <select value={form.soRef} onChange={e => set("soRef", e.target.value)}>
                  <option value="">-- Link to SO (optional) --</option>
                  {salesOrders.filter(s => s.status !== "Closed").map(s => <option key={s.soNo} value={s.soNo}>{s.soNo} – {s.clientName}</option>)}
                </select>
              </Field>
              <Field label="Client Name *">
                <input placeholder="Client name" value={form.clientName} onChange={e => set("clientName", e.target.value)} style={E("clientName")} />
                {EMsg("clientName")}
              </Field>
              <Field label="Delivery Address">
                <input placeholder="Delivery address" value={form.deliveryAddress || ""} onChange={e => set("deliveryAddress", e.target.value)} />
              </Field>
              <Field label="Vehicle No *">
                <input placeholder="e.g. DL01AB1234" value={form.vehicleNo || ""} onChange={e => set("vehicleNo", e.target.value)} style={E("vehicleNo")} />
                {EMsg("vehicleNo")}
              </Field>
              <Field label="Driver Name">
                <input placeholder="Driver name" value={form.driverName || ""} onChange={e => set("driverName", e.target.value)} />
              </Field>
              <Field label="Remarks" span={2}>
                <input placeholder="Notes" value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} />
              </Field>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>Items ({items.length})</h3>
            <button onClick={addItem} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13 }}>+ Add Item</button>
          </div>

          {errors.items && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>Each item must have a name and quantity</div>}

          {items.map((it, idx) => (
            <Card key={it._id} style={{ marginBottom: 12, borderLeft: "3px solid " + C.purple }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>Item {idx + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 5, padding: "4px 12px", fontWeight: 700, fontSize: 12 }}>✕ Remove</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
                <Field label="Item Name *">
                  {(() => {
                    const linkedSO = form.soRef ? salesOrders.find(s => s.soNo === form.soRef) : null;
                    const soItemNames = linkedSO?.items?.length > 0
                      ? linkedSO.items.map(i => i.itemName).filter(Boolean)
                      : null;
                    const optionList = soItemNames
                      ? soItemNames.map(name => {
                          const avail = fgStockMap[name] || 0;
                          const soIt = linkedSO.items.find(i => i.itemName === name);
                          const orderQty = +(soIt?.orderQty || 0);
                          const alreadyDispatched = dispatches
                            .filter(d => d.soRef === form.soRef)
                            .flatMap(d => d.items || [])
                            .filter(di => (di.itemName || "").trim().toLowerCase() === name.trim().toLowerCase())
                            .reduce((s, di) => s + +(di.qty || 0), 0);
                          const remaining = Math.max(0, orderQty - alreadyDispatched);
                          return { name, avail, orderQty, alreadyDispatched, remaining };
                        })
                      : availableFGItems.map(name => ({ name, avail: fgStockMap[name] || 0, orderQty: 0, alreadyDispatched: 0, remaining: 0 }));
                    return (
                      <select value={it.itemName || ""} onChange={e => {
                        const name = e.target.value;
                        const fgItems = (itemMasterFG?.["Finished Goods"] || []);
                        const master = fgItems.find(x => x.name?.toLowerCase() === name.toLowerCase());
                        
                        const pastItem = [...dispatches].reverse()
                          .flatMap(d => d.items || [])
                          .find(di => (di.itemName || "").trim().toLowerCase() === name.trim().toLowerCase() && di.pcsPerBox);
                        setItems(prev => {
                          const u = [...prev];
                          u[idx] = {
                            ...u[idx],
                            itemName: name,
                            ...(master?.code ? { productCode: master.code } : {}),
                            ...(pastItem?.pcsPerBox ? { pcsPerBox: pastItem.pcsPerBox } : {}),
                          };
                          return u;
                        });
                      }}>
                        <option value="">-- Select FG Item --</option>
                        {optionList.map(({ name, avail, orderQty, remaining }) => {
                          const usedInOtherRow = items.some((r, i) => i !== idx && (r.itemName || "").trim().toLowerCase() === name.trim().toLowerCase());
                          return (
                            <option key={name} value={name} disabled={usedInOtherRow}>
                              {name}{usedInOtherRow ? " (already added)" : soItemNames
                                ? ` (ordered: ${fmt(orderQty)}, remaining: ${fmt(remaining)}, stock: ${fmt(avail)})`
                                : ` (avail: ${fmt(avail)})`}
                            </option>
                          );
                        })}
                      </select>
                    );
                  })()}
                </Field>
                <Field label="Product Code">
                  <input placeholder="Auto-filled or enter manually" value={it.productCode || ""}
                    onChange={e => setItem(idx, "productCode", e.target.value)}
                    style={{ fontFamily: "'JetBrains Mono',monospace", color: C.purple }} />
                </Field>
                <Field label="Quantity *">
                  <input type="number" placeholder="Qty to dispatch" value={it.qty || ""} onChange={e => setItem(idx, "qty", e.target.value)} />
                </Field>
                <Field label="Unit">
                  <select value={it.unit || "nos"} onChange={e => setItem(idx, "unit", e.target.value)}>
                    {["nos", "kg", "boxes", "rolls", "sets"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Pcs / Box">
                  <input type="number" placeholder="e.g. 100" value={it.pcsPerBox || ""} onChange={e => setItem(idx, "pcsPerBox", e.target.value)} />
                </Field>
                <Field label="No. of Box">
                  <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: it.pcsPerBox && it.qty ? C.blue : C.muted, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                    {it.pcsPerBox && it.qty ? Math.ceil(+(it.qty) / +(it.pcsPerBox)) : "— Auto from Qty ÷ Pcs/Box —"}
                  </div>
                </Field>
                {it.itemName && fgStockMap[it.itemName] !== undefined && (
                  <Field label="Available">
                    <div style={{ padding: "9px 12px", background: C.inputBg, border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, color: fgStockMap[it.itemName] > 0 ? C.green : C.red, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                      {fmt(fgStockMap[it.itemName])} in stock
                    </div>
                  </Field>
                )}
              </div>
            </Card>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={addItem} style={{ background: C.purple + "22", color: C.purple, border: "1px solid " + C.purple + "44", borderRadius: 6, padding: "9px 20px", fontWeight: 700, fontSize: 13 }}>+ Add Another Item</button>
            <SubmitBtn label={"Record Dispatch (" + items.length + " item" + (items.length > 1 ? "s" : "") + ")"} color={C.purple} onClick={submit} />
          </div>
        </div>
      )}

      {view === "records" && (
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <input placeholder="🔍 Search dispatch#, client, SO#..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
            <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
            <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} of {dispatches.length} records</span>
            <button onClick={exportToExcel} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>⬇ Export Excel</button>
          </div>
          {filtered.map(d => {
            const isEditing = editId === d.id;
            return (
            <Card key={d.id} style={{ marginBottom: 12, borderLeft: "3px solid " + C.purple }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.purple, fontWeight: 700, fontSize: 14 }}>{d.dispatchNo}</span>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Date</label>
                        <input value={editData.dispatchDate || ""} onChange={e => setEditData(p => ({ ...p, dispatchDate: e.target.value }))} style={{ width: 130, fontSize: 12 }} />
                      </div>
                      {[["clientName","Client","180px"],["soRef","SO Ref","120px"],["vehicleNo","Vehicle No","120px"],["driverName","Driver","140px"],["deliveryAddress","Delivery Address","200px"],["remarks","Remarks","200px"]].map(([k, label, w]) => (
                        <div key={k}>
                          <label style={{ display: "block", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</label>
                          <input value={editData[k] || ""} onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))} style={{ width: w, fontSize: 12 }} />
                        </div>
                      ))}
                      <div>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Status</label>
                        <select value={editData.status || "Dispatched"} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} style={{ fontSize: 12, width: 140 }}>
                          {["Dispatched", "In Transit", "Delivered", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{d.clientName} · {d.dispatchDate}</span>
                      {d.soRef && <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono',monospace", color: C.green, fontSize: 11 }}>{d.soRef}</span>}
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge label={d.status || "Dispatched"} color={C.purple} />
                  {isEditing ? (
                    <>
                      <button onClick={() => saveDispatchEdit(d, editData)}
                        style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>✓ Save</button>
                      <button onClick={() => setEditId(null)}
                        style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 12px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {canEditDispatch && (
                        <button onClick={() => { setEditId(d.id); setEditData({ dispatchDate: d.dispatchDate, clientName: d.clientName, soRef: d.soRef || "", vehicleNo: d.vehicleNo || "", driverName: d.driverName || "", deliveryAddress: d.deliveryAddress || "", remarks: d.remarks || "", status: d.status || "Dispatched", items: (d.items || []).map(it => ({ ...it })) }); }}
                          style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>✏️ Edit</button>
                      )}
                      {canEditDispatch && confirmDeleteId === d.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 10px" }}>
                          <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>Delete {d.dispatchNo}?</span>
                          <button onClick={() => {
                            setDispatches(prev => prev.filter(x => x.id !== d.id));
                            setConfirmDeleteId(null);
                            toast(`${d.dispatchNo} deleted`);
                          }} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Yes, Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : canEditDispatch && (
                        <button onClick={() => setConfirmDeleteId(d.id)}
                          style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>🗑 Delete</button>
                      )}
                      <button onClick={() => printDispatch(d, itemMasterFG)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 PDF</button>
                      {(() => {
                        const client = (clientMaster || []).find(c => c.name === d.clientName);
                        const itemsList = (d.items || []).map(it => `• ${it.itemName}: ${(+it.qty||0).toLocaleString("en-IN")} ${it.unit||"pcs"}`).join("\n");
                        const msg = `Dear Client,\n\nPlease be informed that your order has been dispatched.\n\nDispatch No: ${d.dispatchNo}\nDate: ${d.dispatchDate}${d.soRef ? `\nSO Ref: ${d.soRef}` : ""}${d.vehicleNo ? `\nVehicle No: ${d.vehicleNo}` : ""}${d.driverName ? `\nDriver: ${d.driverName}` : ""}\n\nItems:\n${itemsList}\n\nRegards,\nAaray Packaging Pvt. Ltd.\n+91 9311802540`;
                        const phone = client?.phone?.replace(/[^0-9]/g, "");
                        const email = client?.email;
                        return (<>
                          {phone && (
                            <a href={`https://wa.me/${phone.startsWith("91") ? "" : "91"}${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"
                              style={{ background: "#25D36622", color: "#25D366", border: "1px solid #25D36644", borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
                              💬 WhatsApp
                            </a>
                          )}
                          {email && (
                            <a href={`mailto:${email}?subject=${encodeURIComponent(`Dispatch Notification — ${d.dispatchNo}`)}&body=${encodeURIComponent(msg)}`}
                              style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
                              ✉ Email
                            </a>
                          )}
                          {!phone && !email && (
                            <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>Add phone/email in Client Master to notify</span>
                          )}
                        </>);
                      })()}
                    </>
                  )}
                </div>
              </div>
              {isEditing && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Items</div>
                  {(editData.items || []).map((it, idx) => {
                    const setIt = (k, v) => setEditData(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, [k]: v } : x) }));
                    const fgItems = (itemMasterFG?.["Finished Goods"] || []);
                    return (
                      <div key={it._id || idx} style={{ display: "grid", gridTemplateColumns: "2fr 100px 80px 30px", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "end" }}>
                        <div>
                          <label style={{ display: "block", fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Item Name</label>
                          <select value={it.itemName || ""} onChange={e => setIt("itemName", e.target.value)} style={{ fontSize: 12 }}>
                            <option value="">-- Select Item --</option>
                            {fgItems.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                            {it.itemName && !fgItems.find(x => x.name === it.itemName) && <option value={it.itemName}>{it.itemName}</option>}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Qty</label>
                          <input type="number" value={it.qty || ""} onChange={e => setIt("qty", e.target.value)} style={{ fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Unit</label>
                          <select value={it.unit || "nos"} onChange={e => setIt("unit", e.target.value)} style={{ fontSize: 12 }}>
                            {["nos", "pcs", "box", "kg", "set"].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <button onClick={() => setEditData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                          style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "5px 0", fontWeight: 700, fontSize: 13 }}>✕</button>
                      </div>
                    );
                  })}
                  <button onClick={() => setEditData(p => ({ ...p, items: [...(p.items || []), { _id: uid(), itemName: "", qty: "", unit: "nos" }] }))}
                    style={{ marginTop: 8, background: C.purple + "22", color: C.purple, border: `1px solid ${C.purple}44`, borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>+ Add Item</button>
                </div>
              )}
              {!isEditing && (
                <>
                  <div>
                    {(d.items || []).map((it, i) => {
                      const fgItems = (itemMasterFG?.["Finished Goods"] || []);
                      const masterItem = fgItems.find(x => x.name?.toLowerCase() === (it.itemName || "").toLowerCase());
                      const code = it.productCode || masterItem?.code || "";
                      return (
                        <div key={i} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid " + C.border + "22", fontSize: 12, color: C.muted, alignItems: "center" }}>
                          {code && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 800, color: C.purple, background: C.purple + "18", border: "1px solid " + C.purple + "33", borderRadius: 4, padding: "1px 7px" }}>{code}</span>}
                          <span style={{ fontWeight: 600, color: C.text }}>{it.itemName}</span>
                          <span>Qty: <strong style={{ color: C.purple }}>{it.qty} {it.unit}</strong></span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
                    {d.vehicleNo && <span>Vehicle: {d.vehicleNo}</span>}
                    {d.driverName && <span>Driver: {d.driverName}</span>}
                    {d.deliveryAddress && <span>To: {d.deliveryAddress}</span>}
                    {d.remarks && <span>Note: {d.remarks}</span>}
                  </div>
                </>
              )}
            </Card>
            );
          })}
          {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>🚛</div>No dispatches yet.</Card>}
        </div>
      )}
    </div>
  );
}


function RawMaterialStock({ rawStock, setRawStock, itemMasterFG, toast }) {
  const { canEdit } = useAuth();
  const canEditRawstock = canEdit("rawstock");
  const [search, setSearch] = useState("");
  const [selCategory, setSelCategory] = useState("All");
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});

  
  const isPaperSheet = (r) => r.unit === "sheets" || r.name?.toLowerCase().includes("sheet");
  const isPaperReel = (r) => r.unit === "reels" || r.name?.toLowerCase().includes("reel");

  
  const rmMasterItems = (itemMasterFG?.["Raw Material"] || []);
  const getCategoryForStock = (r) => {
    
    const match = rmMasterItems.find(it => r.name.includes(it.name) || it.name.includes(r.name));
    if (match?.category) return match.category;
    
    if (isPaperReel(r)) return "Paper Reel";
    if (isPaperSheet(r)) return "Paper Sheet";
    return "Other";
  };

  
  const rmCategories = ["All", ...new Set(rawStock.map(r => getCategoryForStock(r)).filter(Boolean))];

  const filtered = React.useMemo(() => rawStock.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = selCategory === "All" || getCategoryForStock(r) === selCategory;
    return matchSearch && matchCat;
  }), [rawStock, search, selCategory]);

  
  const getRMCode = (r) => {
    if (r.rmCode) return r.rmCode;
    const masterItems = itemMasterFG?.["Raw Material"] || [];
    
    let match = masterItems.find(x => x.name.toLowerCase() === r.name.toLowerCase());
    if (!match) {
      
      const stockTokens = r.name.toLowerCase().replace(/ \| /g, " ").replace(/\|/g, " ");
      match = masterItems.find(x => {
        if (!x.name) return false;
        const masterLower = x.name.toLowerCase();
        return stockTokens.includes(masterLower) || masterLower.includes(stockTokens);
      });
    }
    return match?.code || "";
  };
  const saveEdit = (id) => {
    setRawStock(prev => prev.map(r => r.id === id ? {
      ...r,
      qty:    editFields.qty    !== "" ? +editFields.qty    : r.qty,
      weight: editFields.weight !== "" ? +editFields.weight : r.weight,
      rate:   editFields.rate   !== "" ? +editFields.rate   : r.rate,
    } : r));
    toast("Stock updated");
    setEditId(null);
  };

  
  const totalItems = rawStock.length;
  const totalWeight = rawStock.reduce((s, r) => s + +(r.weight || 0), 0);
  const totalValue = rawStock.reduce((s, r) => s + (+(r.weight || 0) * +(r.rate || 0)), 0);

  const exportToExcel = () => {
    const rows = filtered.map(r => ({
      "Product Code":   getRMCode(r) || "—",
      "Material Name":  r.name,
      "Category":       getCategoryForStock(r),
      "Qty (Sheets)":   r.unit === "sheets" ? r.qty : "",
      "Qty (kg)":       r.weight ? +r.weight : "",
      "Rate (₹/kg)":    r.rate  ? +r.rate  : "",
      "Value (₹)":      r.rate  ? +(r.weight||0) * +(r.rate||0) : "",
      "Unit":           r.unit || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RM Stock");
    xlsxDownload(wb, `RM_Stock_${today()}.xlsx`);
  };

  return (
    <div className="fade">
      <SectionTitle icon="📦" title="Raw Material Stock" sub="Live inventory of all raw materials" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, flex: 1 }}>
          {[
            { label: "Total Items", val: totalItems, color: C.blue },
            { label: "Total Weight (kg)", val: fmt(totalWeight) + " kg", color: C.yellow },
            { label: "Total Value", val: "₹" + fmt(totalValue), color: C.green },
          ].map(s => (
            <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="🔍  Search material..." style={{ maxWidth: 320 }} value={search} onChange={e => setSearch(e.target.value)} />
        {}
        {rawStock.some(r => !r.rmCode) && (
          <button onClick={() => {
            const masterItems = (itemMasterFG?.["Raw Material"] || []);
            setRawStock(prev => prev.map(r => {
              if (r.rmCode) return r;
              const stockTokens = r.name.toLowerCase().replace(/ \| /g, " ").replace(/\|/g, " ");
              const match = masterItems.find(x => {
                if (!x.name) return false;
                const ml = x.name.toLowerCase();
                return stockTokens.includes(ml) || ml.includes(stockTokens);
              });
              return match?.code ? { ...r, rmCode: match.code } : r;
            }));
            toast("Product codes linked to RM stock");
          }} style={{ background: C.yellow + "22", color: C.yellow, border: `1px solid ${C.yellow}44`, borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            ⚡ Link Product Codes
          </button>
        )}
        <ExcelImportBtn
          label="RM Stock"
          color={C.blue}
          templateCols={["Product Code", "Item Name", "Category", "Type", "Reorder Level (kg)", "Qty", "Weight (kg)", "Rate (₹/kg)"]}
          templateRows={[]}
          onImport={rows => {
            const skipped = [];
            let added = 0, updated = 0;
            rows.forEach(row => {
              const itemName    = (row["Item Name"] || row["item_name"] || "").toString().trim();
              const category    = (row["Category"]  || row["category"]  || "").toString().trim();
              const type        = (row["Type"]       || row["type"]      || "").toString().trim();
              const reorderRaw  = row["Reorder Level (kg)"];
              
              if (!itemName)   { skipped.push("Row missing Item Name"); return; }
              if (!category)   { skipped.push(`${itemName}: missing Category`); return; }
              if (!type)       { skipped.push(`${itemName}: missing Type`); return; }
              if (reorderRaw === undefined || reorderRaw === "") { skipped.push(`${itemName}: missing Reorder Level`); return; }
              const productCode     = (row["Product Code"] || row["product_code"] || "").toString().trim();
              const qty             = row["Qty"] !== undefined && row["Qty"] !== "" ? +(row["Qty"]) : 0;
              const weight          = row["Weight (kg)"] !== undefined && row["Weight (kg)"] !== "" ? +(row["Weight (kg)"]) : 0;
              const rate            = row["Rate (₹/kg)"] !== undefined && row["Rate (₹/kg)"] !== "" ? +(row["Rate (₹/kg)"]) : 0;
              const reorderWeightKg = +reorderRaw;
              const unit            = category === "Paper Reel" ? "reels" : "sheets";
              setRawStock(prev => {
                const idx = prev.findIndex(r => r.name.toLowerCase() === itemName.toLowerCase());
                if (idx >= 0) {
                  updated++;
                  const u = [...prev];
                  u[idx] = { ...u[idx],
                    ...(productCode ? { rmCode: productCode } : {}),
                    category, type, reorderWeightKg, unit,
                    ...(qty      ? { qty }    : {}),
                    ...(weight   ? { weight } : {}),
                    ...(rate     ? { rate }   : {}),
                  };
                  return u;
                }
                added++;
                return [...prev, { id: "RM-" + uid(), name: itemName, rmCode: productCode, category, type, unit, qty, weight, rate, gsm: "", width: "", length: "", reorderWeightKg }];
              });
            });
            if (skipped.length > 0) toast(["Some rows skipped:", ...skipped], "error");
            else toast(`RM Stock: ${added} added, ${updated} updated`);
          }}
        />
        <button onClick={exportToExcel} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>⬇ Export Excel</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {rmCategories.map(cat => (
          <button key={cat} onClick={() => setSelCategory(cat)} style={{
            padding: "5px 14px", borderRadius: 5, fontWeight: 600, fontSize: 12,
            border: `1px solid ${selCategory === cat ? C.blue : C.border}`,
            background: selCategory === cat ? C.blue + "22" : "transparent",
            color: selCategory === cat ? C.blue : C.muted, cursor: "pointer"
          }}>{cat}</button>
        ))}
      </div>

      <Card>
        {}
        <div style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 110px 100px 100px 90px 110px 110px 80px", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
          {["Code", "Material Name", "Category", "Qty (Sheets)", "Qty (kg)", "Reorder (kg)", "Rate (₹/kg)", "Value (₹)", "Action"].map(h => (
            <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No materials found</div>}

        {filtered.map(r => {
          const isSheet = isPaperSheet(r);
          const isReel = isPaperReel(r);
          const qtySheets = isSheet ? r.qty : null;
          const qtyKg = r.weight || (isReel ? r.qty : null); 
          const value = (+(r.weight || 0)) * (+(r.rate || 0));

          return (
            <div key={r.id}
              style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 110px 100px 100px 90px 110px 110px 80px", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}22`, alignItems: "center", background: (r.reorderWeightKg && +(r.weight||0) <= +r.reorderWeightKg) ? C.red + "08" : "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = (r.reorderWeightKg && +(r.weight||0) <= +r.reorderWeightKg) ? C.red + "08" : "transparent"}>

              {}
              <div>
                {(() => {
                  const code = getRMCode(r);
                  return code
                    ? <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: C.blue }}>{code}</span>
                    : <span style={{ fontSize: 11, color: C.muted }}>—</span>;
                })()}
              </div>

              {}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                {r.reorderWeightKg && +(r.weight||0) <= +r.reorderWeightKg && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginTop: 2 }}>⚠ Below reorder level</div>
                )}
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</div>
              </div>

              {}
              <div><Badge label={getCategoryForStock(r)} color={C.blue} /></div>

              {}
              {editId === r.id ? (
                <input type="number" value={editFields.qty} onChange={e => setEditFields(p => ({ ...p, qty: e.target.value }))} style={{ fontSize: 12 }} />
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: isSheet ? (r.qty < 500 ? C.red : r.qty < 2000 ? C.yellow : C.green) : C.border }}>
                  {isSheet ? fmt(r.qty) : "—"}
                </span>
              )}

              {}
              {editId === r.id ? (
                <input type="number" placeholder="kg" value={editFields.weight} onChange={e => setEditFields(p => ({ ...p, weight: e.target.value }))} style={{ fontSize: 12 }} />
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: r.reorderWeightKg ? (+(r.weight||0) <= +r.reorderWeightKg ? C.red : +(r.weight||0) <= +r.reorderWeightKg * 1.5 ? C.yellow : C.green) : (qtyKg ? (qtyKg < 100 ? C.red : qtyKg < 500 ? C.yellow : C.green) : C.border) }}>
                  {qtyKg ? fmt(qtyKg) + " kg" : "—"}
                </span>
              )}

              {}
              {canEditRawstock ? (
                <input type="number" placeholder="—"
                  value={r.reorderWeightKg ?? ""}
                  onChange={e => {
                    const val = e.target.value;
                    setRawStock(prev => prev.map(x => x.id === r.id ? { ...x, reorderWeightKg: val } : x));
                  }}
                  style={{ fontSize: 12, color: C.yellow, width: "100%" }} />
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: r.reorderWeightKg ? C.yellow : C.border }}>
                  {r.reorderWeightKg ? r.reorderWeightKg + " kg" : "—"}
                </span>
              )}

              {}
              {editId === r.id ? (
                <input type="number" placeholder="₹/kg" value={editFields.rate} onChange={e => setEditFields(p => ({ ...p, rate: e.target.value }))} style={{ fontSize: 12 }} />
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.muted }}>
                  {r.rate ? `₹${fmt(r.rate)}` : "—"}
                </span>
              )}

              {}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: value > 0 ? 700 : 400, color: value > 0 ? C.green : C.border }}>
                {value > 0 ? `₹${fmt(value)}` : "—"}
              </span>

              {}
              {editId === r.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => saveEdit(r.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>✓</button>
                  <button onClick={() => setEditId(null)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>✕</button>
                </div>
              ) : canEditRawstock ? (
                <button onClick={() => { setEditId(r.id); setEditFields({ qty: r.qty ?? 0, weight: r.weight ?? 0, rate: r.rate ?? 0 }); }} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>✏️ Edit</button>
              ) : null}
            </div>
          );
        })}

        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
          <span>{filtered.length} items</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ color: C.red }}>● Low</span>
            <span style={{ color: C.yellow }}>● Moderate</span>
            <span style={{ color: C.green }}>● Adequate</span>
          </div>
        </div>
      </Card>
    </div>
  );
}



function ConsumableStock({ consumableStock, setConsumableStock, categoryMaster, itemMasterFG, toast }) {
  const { canEdit } = useAuth();
  const canEditConsumable = canEdit("rawstock");
  const [search, setSearch] = useState("");
  const [selCategory, setSelCategory] = useState("All");
  const [selType, setSelType] = useState("All");
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [view, setView] = useState("stock");
  const [issueLog, setIssueLog] = usePersistedState("erp_consumableIssueLog", []);
  const [issueForm, setIssueForm] = useState({ itemId: "", qty: "", issuedTo: "", reference: "", date: today(), remarks: "" });
  const [issueErrors, setIssueErrors] = useState({});
  const [issueDateFrom, setIssueDateFrom] = useState("");
  const [issueDateTo, setIssueDateTo] = useState("");

  const MATERIAL_TYPES = ["All", "Consumable", "Machine Spare", "Other"];

  const filtered = React.useMemo(() => consumableStock.filter(r => {
    if (selType !== "All" && r.materialType !== selType) return false;
    if (selCategory !== "All" && r.category !== selCategory) return false;
    if (search && !r.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [consumableStock, selType, selCategory, search]);

  const categories = ["All", ...new Set(consumableStock.filter(r => selType === "All" || r.materialType === selType).map(r => r.category).filter(Boolean))];
  const totalItems = consumableStock.length;
  const inStockCount = consumableStock.filter(r => +(r.qty || 0) > 0).length;
  const belowReorderCount = consumableStock.filter(r => r.reorderQty && +(r.qty || 0) <= +(r.reorderQty)).length;

  const saveEdit = (id) => {
    setConsumableStock(prev => prev.map(r => r.id === id ? {
      ...r,
      qty:        editFields.qty        !== "" ? +editFields.qty        : r.qty,
      rate:       editFields.rate       !== "" ? +editFields.rate       : r.rate,
      reorderQty: editFields.reorderQty !== "" ? +editFields.reorderQty : r.reorderQty,
    } : r));
    toast("Consumable stock updated");
    setEditId(null);
  };

  const submitIssue = () => {
    const e = {};
    if (!issueForm.itemId) e.itemId = true;
    if (!issueForm.qty || +issueForm.qty <= 0) e.qty = true;
    if (!issueForm.date) e.date = true;
    setIssueErrors(e);
    if (Object.keys(e).length > 0) return;

    const item = consumableStock.find(r => r.id === issueForm.itemId);
    if (!item) return;
    const availQty = +(item.qty || 0);
    const issueQty = +issueForm.qty;
    if (issueQty > availQty) {
      toast(`Only ${availQty} ${item.unit || "units"} available`, "error");
      return;
    }

    
    setConsumableStock(prev => prev.map(r =>
      r.id === issueForm.itemId ? { ...r, qty: availQty - issueQty } : r
    ));

    
    setIssueLog(prev => [...prev, {
      id: uid(),
      date: issueForm.date,
      itemId: item.id,
      itemName: item.itemName,
      materialType: item.materialType,
      category: item.category || "",
      unit: item.unit || "",
      qty: issueQty,
      issuedTo: issueForm.issuedTo || "",
      reference: issueForm.reference || "",
      remarks: issueForm.remarks || "",
    }]);

    toast(`Issued ${issueQty} ${item.unit || "units"} of ${item.itemName}`);
    setIssueForm({ itemId: "", qty: "", issuedTo: "", reference: "", date: today(), remarks: "" });
    setIssueErrors({});
  };

  const filteredLog = React.useMemo(() => issueLog.slice().reverse().filter(r => {
    if (issueDateFrom && r.date < issueDateFrom) return false;
    if (issueDateTo   && r.date > issueDateTo)   return false;
    return true;
  }), [issueLog, issueDateFrom, issueDateTo]);

  const exportToExcel = () => {
    const rows = filtered.map(r => ({
      "Product Code":  r.productCode || "",
      "Item Name":     r.itemName,
      "Material Type": r.materialType || "",
      "Category":      r.category || "",
      "Size":          r.size || "",
      "UOM":           r.uom || "",
      "Qty":           +(r.qty || 0),
      "Unit":          r.unit || "",
      "Rate (₹)":      r.rate || "",
      "Value (₹)":     r.rate && r.qty ? Math.round(+(r.qty) * +(r.rate)) : "",
      "Last Inward":   r.lastInward || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consumable Stock");
    xlsxDownload(wb, `Consumable_Stock_${today()}.xlsx`);
  };

  return (
    <div className="fade">
      <SectionTitle icon="🗂️" title="Consumable Stock" sub="Consumables, machine spares and other non-RM inventory" />

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["stock", "📦 Stock"], ["issue", "➡️ Issue Item"], ["log", `📋 Records (${issueLog.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: `1px solid ${view === v ? C.accent : C.border}`,
            background: view === v ? C.accent + "22" : "transparent",
            color: view === v ? C.accent : C.muted, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {}
      {view === "issue" && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 16 }}>Issue Consumable Item</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            <Field label="Item *">
              <select value={issueForm.itemId} onChange={e => setIssueForm(f => ({ ...f, itemId: e.target.value }))}
                style={issueErrors.itemId ? { border: `1px solid ${C.red}` } : {}}>
                <option value="">-- Select Item --</option>
                {consumableStock.filter(r => +(r.qty || 0) > 0).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.itemName} ({fmt(+(r.qty||0))} {r.unit || "units"} available)
                  </option>
                ))}
              </select>
              {issueErrors.itemId && <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>}
            </Field>
            <Field label="Qty to Issue *">
              <input type="number" placeholder="e.g. 50" value={issueForm.qty}
                onChange={e => setIssueForm(f => ({ ...f, qty: e.target.value }))}
                style={issueErrors.qty ? { border: `1px solid ${C.red}` } : {}} />
              {issueErrors.qty && <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Enter valid qty</div>}
              {issueForm.itemId && (() => {
                const item = consumableStock.find(r => r.id === issueForm.itemId);
                return item ? <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Available: {fmt(+(item.qty||0))} {item.unit || "units"}</div> : null;
              })()}
            </Field>
            <Field label="Date *">
              <DatePicker value={issueForm.date} onChange={v => setIssueForm(f => ({ ...f, date: v }))} />
              {issueErrors.date && <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>}
            </Field>
            <Field label="Issued To">
              <input placeholder="Department / person / machine" value={issueForm.issuedTo}
                onChange={e => setIssueForm(f => ({ ...f, issuedTo: e.target.value }))} />
            </Field>
            <Field label="Reference (JO# / SO#)">
              <input placeholder="e.g. JO-2026001" value={issueForm.reference}
                onChange={e => setIssueForm(f => ({ ...f, reference: e.target.value }))} />
            </Field>
            <Field label="Remarks">
              <input placeholder="Optional notes" value={issueForm.remarks}
                onChange={e => setIssueForm(f => ({ ...f, remarks: e.target.value }))} />
            </Field>
          </div>
          <SubmitBtn label="Issue Item" color={C.accent} onClick={submitIssue} />
        </Card>
      )}

      {}
      {view === "log" && (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <DateRangeFilter dateFrom={issueDateFrom} setDateFrom={setIssueDateFrom} dateTo={issueDateTo} setDateTo={setIssueDateTo} />
            <ExcelBtn onClick={() => {
              const rows = filteredLog.map(r => ({
                Date: r.date, Item_Name: r.itemName, Category: r.category,
                Qty_Issued: r.qty, Unit: r.unit, Issued_To: r.issuedTo,
                Reference: r.reference, Remarks: r.remarks,
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Records");
              xlsxDownload(wb, `Consumable_Issue_Log_${today()}.xlsx`);
            }} />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{filteredLog.length} entries</span>
          </div>

          {issueLog.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No issue entries yet</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Use the "Issue Item" tab to record consumable usage</div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 130px 120px 1fr", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {["Date", "Item", "Qty", "Unit", "Issued To", "Reference", "Remarks"].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                ))}
              </div>
              {filteredLog.length === 0 && <div style={{ textAlign: "center", padding: 32, color: C.muted }}>No entries in this date range.</div>}
              {filteredLog.map(r => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 130px 120px 1fr", gap: 8, padding: "9px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 12, color: C.muted }}>{r.date}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.itemName}</div>
                    {r.category && <div style={{ fontSize: 10, color: C.muted }}>{r.category}</div>}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.accent, fontSize: 13 }}>{fmt(r.qty)}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{r.unit || "—"}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{r.issuedTo || "—"}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.blue }}>{r.reference || "—"}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{r.remarks || "—"}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {}
      {view === "stock" && (<>

      {}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, flex: 1 }}>
          {[
            { label: "Total Items", val: totalItems, color: C.blue },
            { label: "In Stock", val: inStockCount, color: C.green },
            { label: "Out of Stock", val: totalItems - inStockCount, color: C.red },
            { label: "Below Reorder", val: belowReorderCount, color: C.yellow },
            { label: "Total Value (₹)", val: "₹" + fmt(Math.round(consumableStock.reduce((s, r) => s + (+(r.qty||0) * +(r.rate||0)), 0))), color: C.yellow },
          ].map(s => (
            <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="🔍 Search item..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <ExcelImportBtn
          label="Consumable Stock"
          color={C.accent}
          templateCols={["Product Code", "Item Name", "Material Type", "Category", "Size", "UOM", "Qty", "Unit", "Rate (₹/unit)", "Reorder Level (qty)"]}
          templateRows={[]}
          onImport={rows => {
            let added = 0, updated = 0;
            rows.forEach(row => {
              const itemName    = (row["Item Name"] || row["item_name"] || "").toString().trim();
              if (!itemName) return;
              const productCode  = (row["Product Code"] || row["product_code"] || "").toString().trim();
              const materialType = (row["Material Type"] || row["material_type"] || "Consumable").toString().trim();
              const category     = (row["Category"]     || row["category"]     || "").toString().trim();
              const size         = (row["Size"]         || row["size"]         || "").toString().trim();
              const uom          = (row["UOM"]          || row["uom"]          || "").toString().trim();
              const qty          = +(row["Qty"]         || row["qty"]          || 0);
              const unit         = (row["Unit"]         || row["unit"]         || "nos").toString().trim();
              const rate         = +(row["Rate (₹/unit)"] || row["rate"]       || 0);
              const reorderQty   = row["Reorder Level (qty)"] !== undefined && row["Reorder Level (qty)"] !== "" ? +(row["Reorder Level (qty)"]) : undefined;
              setConsumableStock(prev => {
                const idx = prev.findIndex(r => r.itemName.toLowerCase() === itemName.toLowerCase());
                if (idx >= 0) {
                  updated++;
                  const u = [...prev];
                  u[idx] = { ...u[idx], qty: qty !== 0 ? (+(u[idx].qty||0) + qty) : u[idx].qty, rate: rate || u[idx].rate, productCode: productCode || u[idx].productCode || "", ...(reorderQty !== undefined ? { reorderQty } : {}) };
                  return u;
                }
                added++;
                return [...prev, { id: uid(), productCode, itemName, materialType, category, size, uom, qty, unit, rate, lastInward: today(), ...(reorderQty !== undefined ? { reorderQty } : {}) }];
              });
            });
            toast(`Consumable Stock: ${added} added, ${updated} updated`);
          }}
        />
        <button onClick={exportToExcel} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>⬇ Export Excel</button>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Type:</span>
          {["All", "Consumable", "Machine Spare", "Other"].map(t => (
            <button key={t} onClick={() => { setSelType(t); setSelCategory("All"); }} style={{
              padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: selType === t ? C.blue + "22" : "transparent",
              border: `1px solid ${selType === t ? C.blue : C.border}`,
              color: selType === t ? C.blue : C.muted,
            }}>{t}</button>
          ))}
        </div>
        {selType !== "All" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Category:</span>
          {categories.map(c => (
            <button key={c} onClick={() => setSelCategory(c)} style={{
              padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: selCategory === c ? C.accent + "22" : "transparent",
              border: `1px solid ${selCategory === c ? C.accent : C.border}`,
              color: selCategory === c ? C.accent : C.muted,
            }}>{c}</button>
          ))}
        </div>
        )}
        <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{filtered.length} items</span>
      </div>

      {consumableStock.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🗂️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No consumable stock yet</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Stock auto-updates when you record a GRN with Consumable / Machine Spare / Other items</div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 90px 100px 80px 70px 80px 80px 90px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
            {["Code", "Item Name", "Type", "Category", "Qty", "Unit", "Reorder", "Rate ₹", "Action"].map(h => (
              <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No items match filter.</div>
          )}

          {filtered.map(r => {
            const qty = +(r.qty || 0);
            const isEditing = editId === r.id;
            const value = qty * +(r.rate || 0);
            const stockCol = qty <= 0 ? C.red : qty <= 5 ? C.yellow : C.green;

            const isBelowReorder = r.reorderQty && qty <= +(r.reorderQty);
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 90px 100px 80px 70px 80px 80px 90px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${C.border}22`, alignItems: "center", borderLeft: `3px solid ${stockCol}`, background: isBelowReorder && !isEditing ? C.red + "08" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface}
                onMouseLeave={e => e.currentTarget.style.background = isBelowReorder && !isEditing ? C.red + "08" : "transparent"}>

                {}
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: r.productCode ? C.blue : C.border }}>
                  {r.productCode || "—"}
                </span>

                {}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.itemName}</div>
                  {isBelowReorder && <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginTop: 2 }}>⚠ Below reorder level</div>}
                  {(r.size || r.uom) && <div style={{ fontSize: 10, color: C.muted }}>{[r.size, r.uom].filter(Boolean).join(" · ")}</div>}
                  {r.lastInward && <div style={{ fontSize: 10, color: C.muted }}>Last in: {r.lastInward}</div>}
                </div>

                {}
                <Badge label={r.materialType || "—"} color={r.materialType === "Consumable" ? C.blue : r.materialType === "Machine Spare" ? C.purple : C.muted} />

                {}
                <span style={{ fontSize: 12, color: C.muted }}>{r.category || "—"}</span>

                {}
                {isEditing ? (
                  <input type="number" value={editFields.qty} onChange={e => setEditFields(p => ({ ...p, qty: e.target.value }))} style={{ fontSize: 12, padding: "4px 6px" }} />
                ) : (
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: stockCol }}>{fmt(qty)}</span>
                    {qty <= 0 && <div style={{ fontSize: 9, color: C.red, fontWeight: 700 }}>OUT</div>}
                  </div>
                )}

                {}
                <span style={{ fontSize: 12, color: C.muted }}>{r.unit || "—"}</span>

                {}
                {canEditConsumable ? (
                  <input type="number" placeholder="—"
                    value={r.reorderQty ?? ""}
                    onChange={e => {
                      const val = e.target.value;
                      setConsumableStock(prev => prev.map(x => x.id === r.id ? { ...x, reorderQty: val === "" ? "" : +val } : x));
                    }}
                    style={{ fontSize: 12, color: isBelowReorder ? C.red : C.yellow, width: "100%" }} />
                ) : (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: r.reorderQty ? (isBelowReorder ? C.red : C.yellow) : C.border }}>
                    {r.reorderQty ? fmt(+r.reorderQty) : "—"}
                  </span>
                )}

                {}
                {isEditing ? (
                  <input type="number" value={editFields.rate} onChange={e => setEditFields(p => ({ ...p, rate: e.target.value }))} style={{ fontSize: 12, padding: "4px 6px" }} />
                ) : (
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: r.rate ? C.text : C.border }}>
                      {r.rate ? "₹" + fmt(+r.rate) : "—"}
                    </span>
                    {value > 0 && <div style={{ fontSize: 9, color: C.muted }}>Val: ₹{fmt(Math.round(value))}</div>}
                  </div>
                )}

                {}
                {isEditing ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => saveEdit(r.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>✓</button>
                    <button onClick={() => setEditId(null)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>✕</button>
                  </div>
                ) : confirmDeleteId === r.id ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <button onClick={() => { setConsumableStock(prev => prev.filter(x => x.id !== r.id)); setConfirmDeleteId(null); toast("Item removed"); }} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Yes</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>No</button>
                  </div>
                ) : canEditConsumable ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setEditId(r.id); setEditFields({ qty: r.qty ?? 0, rate: r.rate ?? "", reorderQty: r.reorderQty ?? "" }); }} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>✏️</button>
                    <button onClick={() => setConfirmDeleteId(r.id)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 4, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>🗑</button>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
            <span>{filtered.length} items</span>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: C.red }}>● Out of stock / Below reorder</span>
              <span style={{ color: C.yellow }}>● Low (≤5)</span>
              <span style={{ color: C.green }}>● In stock</span>
            </div>
          </div>
        </Card>
      )}
      </>)}
    </div>
  );
}


function FGStock({ fgStock, setFgStock, itemMasterFG, setItemMasterFG, salesOrders, toast }) {
  const { canEdit } = useAuth();
  const canEditFG = canEdit("fg");
  const [search, setSearch] = useState("");
  const [selCategory, setSelCategory] = useState("All");
  const [editPrice, setEditPrice] = useState({});
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});

  
  const fgMasterItems = React.useMemo(() => (itemMasterFG["Finished Goods"] || []), [itemMasterFG]);

  
  
  const itemClientCategoryMap = React.useMemo(() => {
    const map = {};
    
    fgStock.forEach(f => {
      const key = (f.itemName || f.product || "").trim();
      if (key && f.clientCategory) map[key] = f.clientCategory;
    });
    
    (salesOrders || []).forEach(so => {
      (so.items || []).forEach(it => {
        const key = (it.itemName || "").trim();
        if (key && so.clientCategory) map[key] = so.clientCategory;
      });
    });
    return map;
  }, [salesOrders, fgStock]);

  const stockMap = {};
  fgStock.forEach(f => {
    const key = (f.itemName || f.product || "").trim();
    if (!key) return;
    if (!stockMap[key]) stockMap[key] = { qty: +(f.qty)||0, joNo: f.joNo, unit: f.unit, date: f.date, price: f.price || 0, id: f.id, itemCategory: f.itemCategory || "" };
    else stockMap[key].qty = (+(stockMap[key].qty)||0) + (+(f.qty)||0);
  });

  
  const masterNames = new Set(fgMasterItems.map(x => x.name));
  const extraStockItems = Object.keys(stockMap).filter(k => !masterNames.has(k)).map(k => ({ name: k, id: k, category: "Other" }));
  const allItems = [...fgMasterItems, ...extraStockItems];

  
  const categories = ["All", ...new Set(allItems.map(it => it.category).filter(Boolean))];

  const filtered = allItems.filter(item =>
    (!search || item.name.toLowerCase().includes(search.toLowerCase())) &&
    (selCategory === "All" || item.category === selCategory)
  );

  const totalValue = allItems.reduce((s, item) => {
    const st = stockMap[item.name];
    return s + (st ? st.qty * (st.price || 0) : 0);
  }, 0);
  const totalQty = allItems.reduce((s, item) => s + ((stockMap[item.name]?.qty) || 0), 0);
  const inStockCount = allItems.filter(item => (stockMap[item.name]?.qty || 0) > 0).length;


  const savePrice = (itemName) => {
    const price = +editPrice[itemName];
    setFgStock(prev => prev.map(f => (f.itemName || f.product) === itemName ? { ...f, price } : f));
    setEditPrice(p => ({ ...p, [itemName]: undefined }));
    toast("Price updated");
  };

  const startEditFG = (item, qty, price) => {
    setEditId(item.name);
    setEditFields({ qty: qty ?? 0, price: price ?? "" });
  };

  const saveEditFG = (itemName) => {
    const newQty = +editFields.qty;
    const newPrice = editFields.price !== "" ? +editFields.price : undefined;
    setFgStock(prev => {
      
      let assigned = false;
      return prev.map(f => {
        if ((f.itemName || f.product) !== itemName) return f;
        if (!assigned) {
          assigned = true;
          return { ...f, qty: newQty, ...(newPrice !== undefined ? { price: newPrice } : {}) };
        }
        return { ...f, qty: 0 };
      }).filter(f => f.qty > 0 || (f.itemName || f.product) !== itemName || !assigned);
    });
    if (newPrice !== undefined) {
      setFgStock(prev => prev.map(f => (f.itemName || f.product) === itemName ? { ...f, price: newPrice } : f));
    }
    setEditId(null);
    toast("FG Stock updated");
  };

  const exportToExcel = () => {
    const rows = filtered.map(item => {
      const st = stockMap[item.name];
      const qty   = st?.qty   || 0;
      const price = st?.price || 0;
      return {
        "Product Code":    item.code || "—",
        "Item Name":       item.name,
        "Category":        item.category || "—",
        "Client Category": itemClientCategoryMap[item.name] || "—",
        "In Stock":        qty > 0 ? "Yes" : "No",
        "Qty":             qty || "",
        "Price (₹)":       price > 0 ? price : "",
        "Value (₹)":       qty > 0 && price > 0 ? qty * price : "",
        "JO Ref":          st?.joNo  || "",
        "Date":            st?.date  || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FG Stock");
    xlsxDownload(wb, `FG_Stock_${today()}.xlsx`);
  };

  return (
    <div className="fade">
      <SectionTitle icon="🏭" title="FG Stock" sub="Finished goods inventory — all items from Item Master" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, flex: 1 }}>
          {[
            { label: "Total Items", val: allItems.length, color: C.purple },
            { label: "In Stock", val: inStockCount, color: C.green },
            { label: "Total Qty", val: fmt(totalQty), color: C.blue },
            { label: "Total Value", val: "₹" + fmt(totalValue), color: C.yellow },
          ].map(s => (
            <Card key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="🔍 Search item..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <ExcelImportBtn
          label="FG Stock"
          color={C.purple}
          templateCols={["Item Name", "Client Category", "Qty", "Price (₹/unit)", "Reorder Level (qty)"]}
          templateRows={[]}
          onImport={rows => {
            let added = 0, updated = 0;
            rows.forEach(row => {
              const itemName       = (row["Item Name"] || row["item_name"] || row["name"] || "").toString().trim();
              if (!itemName) return;
              const clientCategory = (row["Client Category"] || row["client_category"] || "").toString().trim();
              const qty            = +(row["Qty"] || row["qty"] || 0);
              const price          = +(row["Price (₹/unit)"] || row["price"] || 0);
              const reorderQty     = row["Reorder Level (qty)"] !== undefined && row["Reorder Level (qty)"] !== "" ? +(row["Reorder Level (qty)"]) : undefined;
              setFgStock(prev => {
                const idx = prev.findIndex(f => (f.itemName || f.product || "").toLowerCase() === itemName.toLowerCase());
                if (idx >= 0) {
                  updated++;
                  const u = [...prev];
                  u[idx] = { ...u[idx], qty: qty !== 0 ? qty : u[idx].qty, price: price || u[idx].price, ...(clientCategory ? { clientCategory } : {}), ...(reorderQty !== undefined ? { reorderQty } : {}) };
                  return u;
                }
                added++;
                return [...prev, { id: uid(), itemName, clientCategory, qty, price, date: today(), source: "Bulk Import", ...(reorderQty !== undefined ? { reorderQty } : {}) }];
              });
            });
            toast(`FG Stock: ${added} added, ${updated} updated`);
          }}
        />
        <button onClick={exportToExcel} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>⬇ Export Excel</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelCategory(cat)} style={{
            padding: "5px 14px", borderRadius: 5, fontWeight: 600, fontSize: 12,
            border: `1px solid ${selCategory === cat ? C.purple : C.border}`,
            background: selCategory === cat ? C.purple + "22" : "transparent",
            color: selCategory === cat ? C.purple : C.muted, cursor: "pointer"
          }}>{cat}</button>
        ))}
      </div>

      <Card>
        {}
        <div style={{ display: "grid", gridTemplateColumns: "80px 2fr 110px 80px 80px 90px 90px 100px 100px 80px", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
          {["Code", "Item Name", "Category", "Client Cat.", "In Stock", "Qty", "Reorder", "Price (₹)", "Value (₹)", "Action"].map(h => (
            <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, padding: 40, fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏭</div>
            No items yet. Add items to Item Master → Finished Goods.
          </div>
        )}

        {filtered.map(item => {
          const st = stockMap[item.name] || stockMap[(item.name||"").trim()];
          const qty = st?.qty || 0;
          const price = st?.price || 0;
          const value = qty * price;
          const inStock = qty > 0;
          const reorderQty = item.reorderQty ? +item.reorderQty : null;
          const isLow = reorderQty !== null && qty <= reorderQty;

          return (
            <div key={item.name} style={{
            display: "grid", gridTemplateColumns: "80px 2fr 110px 80px 80px 90px 90px 100px 100px 80px",
              gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}22`, alignItems: "center",
              background: isLow ? C.red + "08" : "transparent"
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = isLow ? C.red + "08" : "transparent"}>

              {}
              <div>
                {item.code
                  ? <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: C.purple }}>{item.code}</span>
                  : <span style={{ fontSize: 11, color: C.muted }}>—</span>}
              </div>

              {}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                {isLow && <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginTop: 2 }}>⚠ Below reorder level</div>}
                {st?.joNo && <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{st.joNo}</div>}
              </div>

              {}
              <div>
                {(item.category || st?.itemCategory)
                  ? <Badge label={item.category || st?.itemCategory} color={C.purple} />
                  : <span style={{ fontSize: 11, color: C.border }}>—</span>}
              </div>

              {}
              <div>
                {(() => {
                  const cc = itemClientCategoryMap[item.name];
                  const col = cc === "HP" ? C.blue : cc === "ZPL" ? C.green : cc === "Others" ? C.yellow : C.muted;
                  return cc ? <Badge label={cc} color={col} /> : <span style={{ fontSize: 11, color: C.border }}>—</span>;
                })()}
              </div>

              {}
              <div>
                <Badge label={inStock ? "Yes" : "Nil"} color={inStock ? C.green : C.muted} />
              </div>

              {}
              {editId === item.name ? (
                <input type="number" value={editFields.qty} onChange={e => setEditFields(p => ({ ...p, qty: e.target.value }))} style={{ fontSize: 12 }} />
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: isLow ? C.red : inStock ? C.green : C.border }}>
                  {inStock ? fmt(qty) : "—"}
                </span>
              )}

              {}
              {canEditFG ? (
                <input type="number" placeholder="—"
                  value={item.reorderQty ?? ""}
                  onChange={e => {
                    const val = e.target.value;
                    setItemMasterFG(prev => ({
                      ...prev,
                      "Finished Goods": (prev["Finished Goods"] || []).map(x => x.id === item.id ? { ...x, reorderQty: val } : x)
                    }));
                  }}
                  style={{ fontSize: 12, color: C.yellow, width: "100%" }} />
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: item.reorderQty ? C.yellow : C.border }}>
                  {item.reorderQty ? item.reorderQty : "—"}
                </span>
              )}

              {}
              <div>
                {editId === item.name ? (
                  <input type="number" placeholder="₹" value={editFields.price} onChange={e => setEditFields(p => ({ ...p, price: e.target.value }))} style={{ fontSize: 12 }} />
                ) : editPrice[item.name] !== undefined ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="number" value={editPrice[item.name]} onChange={e => setEditPrice(p => ({ ...p, [item.name]: e.target.value }))} style={{ width: 70, fontSize: 12 }} />
                    <button onClick={() => savePrice(item.name)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 4, padding: "0 6px", fontWeight: 700, fontSize: 11 }}>✓</button>
                  </div>
                ) : canEditFG ? (
                  <span onClick={() => setEditPrice(p => ({ ...p, [item.name]: price || "" }))}
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: price > 0 ? C.text : C.muted, cursor: "pointer", borderBottom: `1px dashed ${C.border}` }}>
                    {price > 0 ? `₹${fmt(price)}` : "Set price"}
                  </span>
                ) : (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: price > 0 ? C.text : C.muted }}>
                    {price > 0 ? `₹${fmt(price)}` : "—"}
                  </span>
                )}
              </div>

              {}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: value > 0 ? 700 : 400, color: value > 0 ? C.purple : C.border }}>
                {value > 0 ? `₹${fmt(value)}` : "—"}
              </span>

              {}
              {editId === item.name ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => saveEditFG(item.name)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>✓</button>
                  <button onClick={() => setEditId(null)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>✕</button>
                </div>
              ) : canEditFG ? (
                <button onClick={() => startEditFG(item, qty, price)} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>✏️ Edit</button>
              ) : null}

            </div>
          );
        })}

        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
          <span>{filtered.length} items</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.yellow, fontWeight: 700 }}>Total: ₹{fmt(totalValue)}</span>
        </div>
      </Card>
    </div>
  );
}



function VendorMaster({ vendorMaster, setVendorMaster, toast }) {
  const { canEdit } = useAuth();
  const canEditVendormaster = canEdit("vendormaster");
  const [newVendor, setNewVendor] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGst, setNewGst] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const add = () => {
    const v = newVendor.trim();
    if (!v) return;
    if (vendorMaster.some(x => x.name.toLowerCase() === v.toLowerCase())) { toast("Vendor already exists", "error"); return; }
    setVendorMaster(prev => [...prev, { id: uid(), name: v, phone: newPhone.trim(), email: newEmail.trim(), gst: newGst.trim(), addedOn: today(), source: "Manual" }]);
    setNewVendor(""); setNewPhone(""); setNewEmail(""); setNewGst("");
    toast("Vendor added");
  };

  const remove = (id) => { setVendorMaster(prev => prev.filter(v => v.id !== id)); setConfirmDeleteId(null); toast("Vendor removed"); };

  const filtered = vendorMaster.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade">
      <SectionTitle icon="🏪" title="Vendor Master" sub="All vendors / suppliers — used in Purchase Orders and Material Inward" />
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 14 }}>Add Vendor</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="Vendor Name *">
            <input placeholder="Vendor / Supplier name" value={newVendor} onChange={e => setNewVendor(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          </Field>
          <Field label="Phone / WhatsApp">
            <input placeholder="Phone number" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <input placeholder="Email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </Field>
          <Field label="GST Number">
            <input placeholder="GST / Tax ID" value={newGst} onChange={e => setNewGst(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={add} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, fontSize: 13 }}>+ Add Vendor</button>
          <ExcelImportBtn
            label="Vendor Master"
            color={C.blue}
            templateCols={["Vendor Name", "Phone", "Email", "GST Number"]}
            templateRows={[]}
            onImport={rows => {
              let added = 0;
              setVendorMaster(prev => {
                let updated = [...prev];
                rows.forEach(row => {
                  const name = (row["Vendor Name"] || row["vendor name"] || row["name"] || row["Name"] || "").toString().trim();
                  if (!name) return;
                  if (updated.some(x => x.name.toLowerCase() === name.toLowerCase())) return;
                  updated.push({ id: uid(), name, phone: (row["Phone"] || "").toString().trim(), email: (row["Email"] || "").toString().trim(), gst: (row["GST Number"] || "").toString().trim(), addedOn: today(), source: "Import" });
                  added++;
                });
                return updated;
              });
              toast(added + " vendors imported");
            }}
          />
          <button onClick={() => {
            const rows = filtered.map(v => ({ "Vendor Name": v.name, "Phone": v.phone || "", "Email": v.email || "", "GST Number": v.gst || "", "Added On": v.addedOn || "" }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Vendor Master");
            xlsxDownload(wb, `Vendor_Master_${today()}.xlsx`);
          }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>⬇ Export Excel</button>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>Vendors ({filtered.length})</h3>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No vendors yet. Add one above or import from Excel.</div>
        ) : (
          <div>
            {filtered.map((v, i) => (
              <div key={v.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                {editId === v.id ? (
                  <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, alignItems: "center" }}>
                    <input value={editFields.name || ""} onChange={e => setEditFields(p => ({ ...p, name: e.target.value }))} placeholder="Vendor name" style={{ fontSize: 13, fontWeight: 600 }} />
                    <input placeholder="Phone" value={editFields.phone || ""} onChange={e => setEditFields(p => ({ ...p, phone: e.target.value }))} />
                    <input placeholder="Email" value={editFields.email || ""} onChange={e => setEditFields(p => ({ ...p, email: e.target.value }))} />
                    <input placeholder="GST Number" value={editFields.gst || ""} onChange={e => setEditFields(p => ({ ...p, gst: e.target.value }))} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setVendorMaster(prev => prev.map(x => x.id === v.id ? { ...x, ...editFields } : x)); setEditId(null); toast("Vendor updated"); }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditId(null)} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted, width: 28 }}>#{i + 1}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</span>
                      <Badge label={v.source || "Manual"} color={v.source === "Manual" ? C.blue : C.green} />
                      {v.phone && <span style={{ fontSize: 11, color: C.green }}>📱 {v.phone}</span>}
                      {v.email && <span style={{ fontSize: 11, color: C.blue }}>✉ {v.email}</span>}
                      {v.gst && <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>GST: {v.gst}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{v.addedOn}</span>
                      {canEditVendormaster && <button onClick={() => { setEditId(v.id); setEditFields({ name: v.name, phone: v.phone || "", email: v.email || "", gst: v.gst || "" }); }} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>✏️ Edit</button>}
                      {canEditVendormaster && (
                        confirmDeleteId === v.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button onClick={() => remove(v.id)} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontWeight: 700, fontSize: 11 }}>Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontWeight: 700, fontSize: 11 }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(v.id)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>Remove</button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ClientMaster({ clientMaster, setClientMaster, toast }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditClientmaster = canEdit("clientmaster");
  const [newClient, setNewClient] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGst, setNewGst] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const add = () => {
    const c = newClient.trim();
    if (!c) return;
    if (clientMaster.some(x => x.name.toLowerCase() === c.toLowerCase())) { toast("Client already exists", "error"); return; }
    setClientMaster(prev => [...prev, { id: uid(), name: c, phone: newPhone.trim(), email: newEmail.trim(), gst: newGst.trim(), addedOn: today(), source: "Manual" }]);
    setNewClient(""); setNewPhone(""); setNewEmail(""); setNewGst("");
    toast("Client added");
  };

  const remove = (id) => { setClientMaster(prev => prev.filter(c => c.id !== id)); setConfirmDeleteId(null); };

  const filtered = clientMaster.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade">
      <SectionTitle icon="👥" title="Client Master" sub="All clients — auto-populated from Sales Orders or added manually" />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="Client Name *">
            <input placeholder="Client name" value={newClient} onChange={e => setNewClient(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          </Field>
          <Field label="Phone / WhatsApp">
            <input placeholder="Phone number" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <input placeholder="Email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </Field>
          <Field label="GST Number">
            <input placeholder="GST / Tax ID" value={newGst} onChange={e => setNewGst(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={add} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, fontSize: 13 }}>+ Add Client</button>
          <ExcelImportBtn
            label="Client Master"
            color={C.green}
            templateCols={["Client Name", "Phone", "Email", "GST Number"]}
            templateRows={[]}
            onImport={rows => {
              let added = 0;
              setClientMaster(prev => {
                let updated = [...prev];
                rows.forEach(row => {
                  const name = (row["Client Name"] || row["client name"] || row["name"] || row["Name"] || "").toString().trim();
                  if (!name) return;
                  if (updated.some(x => x.name.toLowerCase() === name.toLowerCase())) return;
                  updated.push({ id: uid(), name, phone: (row["Phone"] || "").toString().trim(), email: (row["Email"] || "").toString().trim(), gst: (row["GST Number"] || "").toString().trim(), addedOn: today(), source: "Import" });
                  added++;
                });
                return updated;
              });
              toast(added + " clients imported");
            }}
          />
          <button onClick={() => {
            const rows = filtered.map(c => ({ "Client Name": c.name, "Phone": c.phone || "", "Email": c.email || "", "GST Number": c.gst || "", "Added On": c.addedOn || "" }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Client Master");
            xlsxDownload(wb, `Client_Master_${today()}.xlsx`);
          }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>⬇ Export Excel</button>
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>Clients ({filtered.length})</h3>
          <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No clients yet. They auto-populate when you create Sales Orders.</div>
        ) : (
          <div>
            {filtered.map((c, i) => (
              <div key={c.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                {editId === c.id ? (
                  <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, alignItems: "center" }}>
                    <input value={editFields.name || ""} onChange={e => setEditFields(p => ({ ...p, name: e.target.value }))} placeholder="Client name" style={{ fontSize: 13, fontWeight: 600 }} />
                    <input placeholder="Phone" value={editFields.phone || ""} onChange={e => setEditFields(p => ({ ...p, phone: e.target.value }))} />
                    <input placeholder="Email" value={editFields.email || ""} onChange={e => setEditFields(p => ({ ...p, email: e.target.value }))} />
                    <input placeholder="GST Number" value={editFields.gst || ""} onChange={e => setEditFields(p => ({ ...p, gst: e.target.value }))} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setClientMaster(prev => prev.map(x => x.id === c.id ? { ...x, ...editFields } : x)); setEditId(null); toast("Client updated"); }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditId(null)} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted, width: 28 }}>#{i + 1}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                      <Badge label={c.source || "Manual"} color={c.source === "Manual" ? C.blue : C.green} />
                      {c.phone && <span style={{ fontSize: 11, color: C.green }}>📱 {c.phone}</span>}
                      {c.email && <span style={{ fontSize: 11, color: C.blue }}>✉ {c.email}</span>}
                      {c.gst && <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>GST: {c.gst}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{c.addedOn}</span>
                      {canEditClientmaster && <button onClick={() => { setEditId(c.id); setEditFields({ name: c.name, phone: c.phone || "", email: c.email || "", gst: c.gst || "" }); }} style={{ background: C.blue + "22", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>✏️ Edit</button>}
                      {canEditClientmaster && (
                        confirmDeleteId === c.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button onClick={() => remove(c.id)} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontWeight: 700, fontSize: 11 }}>Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontWeight: 700, fontSize: 11 }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(c.id)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>Remove</button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


const ITEM_TYPE_COLORS = { "Raw Material": "#3b82f6", "Consumable": "#eab308", "Finished Goods": "#22c55e", "Machine Spare": "#ef4444" };

const FG_BOX_CATS  = ["Cake Box", "Pastry Box"];
const FG_FLAT_CATS = ["Insert", "Sleeve", "Sticker"];
const FG_BAG_CATS  = ["Paper Bag with Handle", "Paper Bag without Handle", "Paper Bag Manual"];
const FG_WRAP_CATS = ["Wrapping Paper"];


const CONSUMABLE_BOX_CATS  = ["Corrugated Box"];           
const CONSUMABLE_BAG_CATS  = ["LDPE Polybag", "Polybag"];  

const computeConsumableItemName = (it) => {
  const cat = it.category || "";
  const uom = it.uom || "inch";
  if (CONSUMABLE_BOX_CATS.includes(cat)) {
    const dims = (it.width && it.length && it.height) ? `${it.width}x${it.length}x${it.height}${uom}` : "";
    return [cat, dims].filter(Boolean).join(" ");
  }
  if (CONSUMABLE_BAG_CATS.includes(cat)) {
    const dims = (it.width && it.height) ? `${it.width}x${it.height}${uom}` : "";
    return [cat, dims].filter(Boolean).join(" ");
  }
  
  const size = it.size || "";
  return [cat, size].filter(Boolean).join(" ") || it.itemName || "";
};

const FG_SIZE_CLIENT_CATS = [
  "Paper Dip Bowl", "Paper Dip Bowl Lid", "Paper Cup", "Paper Cup Lid",
  "Paper Soup Bowl", "Paper Soup Bowl Lid", "Paper Flat Bowl", "Paper Flat Bowl Lid",
  "Paper Salad Box", "Paper Boat Tray"
];

function ItemMasterFG({ itemMasterFG, setItemMasterFG, categoryMaster, sizeMaster, itemCounters, setItemCounters, toast, clientMaster }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditItemmaster = canEdit("itemmaster");
  const [selType, setSelType] = useState("Raw Material");
  const [selCat, setSelCat] = useState("");
  const [newItem, setNewItem] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [expandedItem, setExpandedItem] = useState(null);

  
  const [structFields, setStructFields] = useState({});
  const [structErrors, setStructErrors] = useState({});
  const [structUom, setStructUom] = useState("mm");

  const typeColor = ITEM_TYPE_COLORS[selType];
  const categories = (categoryMaster && categoryMaster[selType]) || [];

  
  const switchType = (t) => {
    setSelType(t);
    setSelCat((categoryMaster && categoryMaster[t] && categoryMaster[t][0]) || "");
    setSearch(""); setFilterCat("All"); setNewItem(""); setStructFields({}); setStructErrors({});
  };

  
  const paperTypes = (sizeMaster && selCat && sizeMaster[selCat]) || [];

  const items = itemMasterFG[selType] || [];
  const filtered = items.filter(x => {
    if (!x.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "All" && (x.category || "") !== filterCat) return false;
    return true;
  });

  const setStructField = (k, v) => { setStructFields(p => ({ ...p, [k]: v })); setStructErrors(p => ({ ...p, [k]: false })); };

  
  const generateName = () => {
    if (!selCat) return "";
    const pt = structFields.paperType || "";
    const gsm = structFields.gsm || "";
    const size = structFields.size || "";
    const width = structFields.width || "";
    const length = structFields.length || "";
    const name = structFields.name || "";

    if (selType === "Raw Material") {
      if (selCat === "Paper Reel") return [pt, "Paper Reel", gsm ? gsm + "gsm" : "", size ? size + "mm" : ""].filter(Boolean).join(" ");
      if (selCat === "Paper Sheet") return [pt, "Sheet", gsm ? gsm + "gsm" : "", (width && length) ? width + "x" + length + structUom : ""].filter(Boolean).join(" ");
      
      return [selCat, pt, gsm ? gsm + "gsm" : "", size ? size + structUom : ""].filter(Boolean).join(" ");
    }
    
    if (selType === "Finished Goods" && FG_BAG_CATS.includes(selCat)) {
      const w = structFields.width || "";
      const g = structFields.gussett || "";
      const h = structFields.height || "";
      const uom = structFields.uom || "inch";
      const client = structFields.client || "";
      const dims = (w && g && h) ? `${w}x${g}x${h}${uom}` : "";
      return [selCat, dims, client].filter(Boolean).join(" ");
    }
    
    if (selType === "Finished Goods" && FG_FLAT_CATS.includes(selCat)) {
      const w = structFields.width || "";
      const l = structFields.length || "";
      const uom = structFields.uom || "inch";
      const client = structFields.client || "";
      const dims = (w && l) ? `${w}x${l}${uom}` : "";
      return [selCat, dims, client].filter(Boolean).join(" ");
    }
    
    if (selType === "Finished Goods" && FG_BOX_CATS.includes(selCat)) {
      const w = structFields.width || "";
      const l = structFields.length || "";
      const h = structFields.height || "";
      const uom = structFields.uom || "inch";
      const client = structFields.client || "";
      const dims = (w && l && h) ? `${w}x${l}x${h}${uom}` : "";
      return [selCat, dims, client].filter(Boolean).join(" ");
    }
    
    if (selType === "Finished Goods" && FG_WRAP_CATS.includes(selCat)) {
      const w = structFields.width || "";
      const h = structFields.height || "";
      const uom = structFields.uom || "inch";
      const client = structFields.client || "";
      const dims = (w && h) ? `${w}x${h}${uom}` : "";
      return [selCat, dims, client].filter(Boolean).join(" ");
    }
    
    if (selType === "Finished Goods" && FG_SIZE_CLIENT_CATS.includes(selCat)) {
      const sz = structFields.size || "";
      const client = structFields.client || "";
      return [selCat, sz, client].filter(Boolean).join(" ");
    }
    
    if (selType === "Finished Goods") return [selCat, name].filter(Boolean).join(" ");
    
    const sizeVal = structFields.size || "";
    const uomVal = structFields.uom || "inch";
    if (sizeVal) return [selCat, sizeVal + uomVal].filter(Boolean).join(" ");
    return [selCat, name].filter(Boolean).join(" ");
  };

  const preview = generateName();

  const addStructuredItem = () => {
    const e = {};
    if (selType === "Raw Material") {
      if (paperTypes.length > 0 && !structFields.paperType && !(selType === "Finished Goods" && FG_SIZE_CLIENT_CATS.includes(selCat))) e.paperType = true;
      if (selCat === "Paper Reel") { if (!structFields.gsm) e.gsm = true; if (!structFields.size) e.size = true; }
      if (selCat === "Paper Sheet") { if (!structFields.gsm) e.gsm = true; if (!structFields.width) e.width = true; if (!structFields.length) e.length = true; }
    } else if (selType === "Consumable" || selType === "Machine Spare") {
      if (!structFields.size) e.size = true;
    } else if (selType === "Finished Goods" && FG_BAG_CATS.includes(selCat)) {
      if (!structFields.width) e.width = true;
      if (!structFields.gussett) e.gussett = true;
      if (!structFields.height) e.height = true;
      if (!structFields.client) e.client = true;
    } else if (selType === "Finished Goods" && FG_WRAP_CATS.includes(selCat)) {
      if (!structFields.width) e.width = true;
      if (!structFields.height) e.height = true;
      if (!structFields.client) e.client = true;
    } else if (selType === "Finished Goods" && FG_FLAT_CATS.includes(selCat)) {
      if (!structFields.width) e.width = true;
      if (!structFields.length) e.length = true;
      if (!structFields.client) e.client = true;
    } else if (selType === "Finished Goods" && FG_BOX_CATS.includes(selCat)) {
      if (!structFields.width) e.width = true;
      if (!structFields.length) e.length = true;
      if (!structFields.height) e.height = true;
      if (!structFields.client) e.client = true;
    } else if (selType === "Finished Goods" && FG_SIZE_CLIENT_CATS.includes(selCat)) {
      if (!structFields.size) e.size = true;
      if (!structFields.client) e.client = true;
    } else {
      if (!structFields.name) e.name = true;
    }
    if (Object.keys(e).length > 0) { setStructErrors(e); return; }
    setStructErrors({});
    const name = generateName();
    if (!name) return;
    if (items.some(x => x.name.toLowerCase() === name.toLowerCase())) return;
    const typeKey = selType === "Raw Material" ? "RM" : selType === "Finished Goods" ? "FG" : selType === "Consumable" ? "CG" : "SP";
    const code = generateProductCode(selType, itemCounters);
    setItemCounters(c => ({ ...c, [typeKey]: (c[typeKey] || 1) + 1 }));
    setItemMasterFG(prev => ({ ...prev, [selType]: [...(prev[selType] || []), { id: uid(), code, name, addedOn: today(), source: "Manual", category: selCat }] }));
  };

  const handleItemBulkImport = (rows) => {
    const typeKey = selType === "Raw Material" ? "RM" : selType === "Finished Goods" ? "FG" : selType === "Consumable" ? "CG" : "SP";
    
    let localCounter = itemCounters[typeKey] || 1;
    let added = 0;
    const newItems = [];

    rows.forEach(row => {
      const name = (row["Item Name"] || row["name"] || row["Name"] || "").toString().trim();
      const category = (row["Category"] || row["category"] || selCat || "").toString().trim();
      const providedCode = (row["Product Code (auto-assigned, leave blank)"] || row["Product Code"] || row["product_code"] || row["code"] || "").toString().trim();
      if (!name) return;
      const code = providedCode || generateProductCode(selType, { ...itemCounters, [typeKey]: localCounter });
      if (!providedCode) localCounter++;
      newItems.push({ id: uid(), code, name, addedOn: today(), source: "Bulk Import", category });
      added++;
    });

    if (added === 0) return;

    setItemMasterFG(prev => {
      const existing = prev[selType] || [];
      const deduped = newItems.filter(n => !existing.some(x => x.name.toLowerCase() === n.name.toLowerCase()));
      return { ...prev, [selType]: [...existing, ...deduped] };
    });
    
    setItemCounters(c => ({ ...c, [typeKey]: localCounter }));
    setTimeout(() => alert(added + " items imported to " + selType + "!"), 100);
    setStructFields({});
  };

  const remove = (id) => setItemMasterFG(prev => ({ ...prev, [selType]: (prev[selType] || []).filter(x => x.id !== id) }));

  const SE = (k) => structErrors[k] ? { border: `1px solid ${C.red}` } : {};
  const SEMsg = (k) => structErrors[k] ? (<div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>) : null;

  return (
    <div className="fade">
      <SectionTitle icon="📋" title="Item Master" sub="All items — categories and sub-types driven by Category Master" />

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {ITEM_TYPE_GROUPS.map(t => (
          <button key={t} onClick={() => switchType(t)} style={{
            padding: "8px 18px", borderRadius: 6, fontWeight: 700, fontSize: 13,
            border: `1px solid ${selType === t ? ITEM_TYPE_COLORS[t] : C.border}`,
            background: selType === t ? ITEM_TYPE_COLORS[t] + "22" : "transparent",
            color: selType === t ? ITEM_TYPE_COLORS[t] : C.muted,
          }}>
            {t}
            <span style={{ marginLeft: 8, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: ITEM_TYPE_COLORS[t] + "33", borderRadius: 10, padding: "1px 7px" }}>{(itemMasterFG[t] || []).length}</span>
          </button>
        ))}
      </div>

      {}
      <Card style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Bulk Import:</span>
          <ExcelImportBtn
            label={"Item_Master_" + selType}
            color={typeColor}
            templateCols={["Product Code (auto-assigned, leave blank)", "Item Name", "Category"]}
            templateRows={[]}
            onImport={handleItemBulkImport}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
          Template has 3 columns: <strong>Product Code</strong> (leave blank — auto-assigned as {generateProductCode(selType, itemCounters)}, {generateProductCode(selType, {...itemCounters, [selType==="Raw Material"?"RM":selType==="Finished Goods"?"FG":selType==="Consumable"?"CG":"SP"]: (itemCounters[selType==="Raw Material"?"RM":selType==="Finished Goods"?"FG":selType==="Consumable"?"CG":"SP"]||1)+1})}…), <strong>Item Name</strong>, <strong>Category</strong>
        </div>
      </Card>


      {}
      {selType === "Finished Goods" && (
        <Card style={{ marginBottom: 12, padding: 14, borderLeft: `3px solid ${C.purple}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8 }}>🏷 Bulk Import Client Product Codes</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            Download the template → fill in client codes → re-import. One column per client. Leave blank if that client doesn't have a code for that item.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Download template with existing FG items + one column per client */}
            <button onClick={() => {
              const fgItems = itemMasterFG["Finished Goods"] || [];
              if (fgItems.length === 0) { alert("No Finished Goods items yet. Add items first."); return; }
              const clientNames = clientMaster.map(c => c.name);
              const cols = ["Our Product Code", "Item Name", ...clientNames];
              const rows = fgItems.map(it => {
                const row = { "Our Product Code": it.code || "", "Item Name": it.name };
                clientNames.forEach(cn => { row[cn] = (it.clientCodes || {})[cn] || ""; });
                return row;
              });
              const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Client Codes");
              xlsxDownload(wb, "Client_Product_Codes_Template.xlsx");
            }} style={{ background: C.purple + "22", color: C.purple, border: `1px solid ${C.purple}44`, borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              ⬇ Download Template
            </button>

            {/* Import filled template */}
            <label style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              ⬆ Import Codes
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const wb = XLSX.read(ev.target.result, { type: "array" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
                    let updated = 0;
                    setItemMasterFG(prev => {
                      const fgItems = [...(prev["Finished Goods"] || [])];
                      rows.forEach(row => {
                        const itemName = (row["Item Name"] || "").toString().trim();
                        const ourCode  = (row["Our Product Code"] || "").toString().trim();
                        // Find matching item by name or code
                        const idx = fgItems.findIndex(it =>
                          it.name?.toLowerCase() === itemName.toLowerCase() ||
                          (ourCode && it.code === ourCode)
                        );
                        if (idx === -1) return;
                        // Extract all client code columns (everything except Our Product Code and Item Name)
                        const newClientCodes = { ...(fgItems[idx].clientCodes || {}) };
                        Object.keys(row).forEach(col => {
                          if (col === "Our Product Code" || col === "Item Name") return;
                          const val = (row[col] || "").toString().trim();
                          if (val) { newClientCodes[col] = val; updated++; }
                          else { delete newClientCodes[col]; }
                        });
                        fgItems[idx] = { ...fgItems[idx], clientCodes: newClientCodes };
                      });
                      return { ...prev, "Finished Goods": fgItems };
                    });
                    setTimeout(() => alert(`Client codes updated for ${rows.length} items (${updated} codes imported).`), 100);
                  } catch(err) { alert("Error reading file: " + err.message); }
                };
                reader.readAsArrayBuffer(file);
                e.target.value = "";
              }} />
            </label>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
            Template columns: <strong>Our Product Code</strong> · <strong>Item Name</strong> · <strong>one column per client</strong>
            {clientMaster.length === 0 && <span style={{ color: C.yellow, marginLeft: 8 }}>⚠ Add clients in Client Master first to see their columns</span>}
          </div>
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: typeColor, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Add {selType} Item</div>

        {/* Category selector — dropdown */}
        <div style={{ marginBottom: 14, maxWidth: 320 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Category *</label>
          {categories.length > 0 ? (
            <select value={selCat} onChange={e => { setSelCat(e.target.value); setStructFields({}); setStructErrors({}); }} style={{ width: "100%", borderColor: structErrors.cat ? C.red : undefined }}>
              <option value="">-- Select Category --</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          ) : (
            <div style={{ padding: "10px 14px", background: C.surface, borderRadius: 6, fontSize: 12, color: C.muted }}>
              No categories defined yet. Add in <strong style={{ color: C.text }}>Category Master → {selType}</strong> first.
            </div>
          )}
        </div>

        {/* Fields based on type & category */}
        {selCat && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, alignItems: "end" }}>

            {/* Paper Type dropdown — from sizeMaster[selCat] — hidden for FG size-client cats */}
            {paperTypes.length > 0 && !(selType === "Finished Goods" && (FG_SIZE_CLIENT_CATS.includes(selCat) || FG_BOX_CATS.includes(selCat) || FG_FLAT_CATS.includes(selCat) || FG_BAG_CATS.includes(selCat) || FG_WRAP_CATS.includes(selCat))) && (
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Paper Type *</label>
                <select value={structFields.paperType || ""} onChange={e => setStructField("paperType", e.target.value)} style={SE("paperType")}>
                  <option value="">-- Select --</option>
                  {paperTypes.map(o => <option key={o}>{o}</option>)}
                </select>
                {SEMsg("paperType")}
              </div>
            )}

            {/* RM specific fields */}
            {selType === "Raw Material" && selCat === "Paper Reel" && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>GSM *</label>
                <input type="number" placeholder="e.g. 60" value={structFields.gsm || ""} onChange={e => setStructField("gsm", e.target.value)} style={SE("gsm")} />
                {SEMsg("gsm")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Size (mm) *</label>
                <input type="number" placeholder="e.g. 690" value={structFields.size || ""} onChange={e => setStructField("size", e.target.value)} style={SE("size")} />
                {SEMsg("size")}
              </div>
            </>)}

            {selType === "Raw Material" && selCat === "Paper Sheet" && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>GSM *</label>
                <input type="number" placeholder="e.g. 300" value={structFields.gsm || ""} onChange={e => setStructField("gsm", e.target.value)} style={SE("gsm")} />
                {SEMsg("gsm")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Width *</label>
                <input type="number" placeholder="e.g. 700" value={structFields.width || ""} onChange={e => setStructField("width", e.target.value)} style={SE("width")} />
                {SEMsg("width")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Length *</label>
                <input type="number" placeholder="e.g. 1000" value={structFields.length || ""} onChange={e => setStructField("length", e.target.value)} style={SE("length")} />
                {SEMsg("length")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>UOM *</label>
                <select value={structUom} onChange={e => setStructUom(e.target.value)}>
                  <option value="mm">mm</option><option value="cm">cm</option><option value="inch">inch</option>
                </select>
              </div>
            </>)}

            {/* Generic RM category (not Paper Reel/Sheet) */}
            {selType === "Raw Material" && selCat !== "Paper Reel" && selCat !== "Paper Sheet" && (
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Item Name *</label>
                <input placeholder={`e.g. ${selCat} item name`} value={structFields.name || ""} onChange={e => setStructField("name", e.target.value)} style={SE("name")} />
                {SEMsg("name")}
              </div>
            )}

            {/* Consumable / Machine Spare — Size + UOM */}
            {(selType === "Consumable" || selType === "Machine Spare") && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Size *</label>
                <input placeholder="e.g. 24x18x24" value={structFields.size || ""} onChange={e => setStructField("size", e.target.value)} style={SE("size")} />
                {SEMsg("size")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>UOM *</label>
                <select value={structFields.uom || "inch"} onChange={e => setStructField("uom", e.target.value)}>
                  <option value="inch">inch</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </>)}

            {/* Finished Goods — Bag categories: Width x Gussett x Height + UOM + Client */}
            {selType === "Finished Goods" && FG_BAG_CATS.includes(selCat) && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>UOM *</label>
                <select value={structFields.uom || "inch"} onChange={e => setStructField("uom", e.target.value)}>
                  <option value="inch">inch</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Width *</label>
                <input type="number" placeholder="e.g. 9" value={structFields.width || ""} onChange={e => setStructField("width", e.target.value)} style={SE("width")} />
                {SEMsg("width")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Gussett *</label>
                <input type="number" placeholder="e.g. 6" value={structFields.gussett || ""} onChange={e => setStructField("gussett", e.target.value)} style={SE("gussett")} />
                {SEMsg("gussett")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Height *</label>
                <input type="number" placeholder="e.g. 7" value={structFields.height || ""} onChange={e => setStructField("height", e.target.value)} style={SE("height")} />
                {SEMsg("height")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Client Name *</label>
                <input placeholder="e.g. Boba Bhai" value={structFields.client || ""} onChange={e => setStructField("client", e.target.value)} style={SE("client")} />
                {SEMsg("client")}
              </div>
            </>)}

            {/* Finished Goods — Flat categories: Width x Length + UOM + Client (no Height) */}
            {selType === "Finished Goods" && FG_FLAT_CATS.includes(selCat) && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>UOM *</label>
                <select value={structFields.uom || "inch"} onChange={e => setStructField("uom", e.target.value)}>
                  <option value="inch">inch</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Width *</label>
                <input type="number" placeholder="e.g. 5" value={structFields.width || ""} onChange={e => setStructField("width", e.target.value)} style={SE("width")} />
                {SEMsg("width")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Length *</label>
                <input type="number" placeholder="e.g. 7" value={structFields.length || ""} onChange={e => setStructField("length", e.target.value)} style={SE("length")} />
                {SEMsg("length")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Client Name *</label>
                <input placeholder="e.g. Donalds" value={structFields.client || ""} onChange={e => setStructField("client", e.target.value)} style={SE("client")} />
                {SEMsg("client")}
              </div>
            </>)}

            {/* Finished Goods — Box categories: Width x Length x Height + UOM + Client */}
            {selType === "Finished Goods" && FG_BOX_CATS.includes(selCat) && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>UOM *</label>
                <select value={structFields.uom || "inch"} onChange={e => setStructField("uom", e.target.value)}>
                  <option value="inch">inch</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Width *</label>
                <input type="number" placeholder="e.g. 8" value={structFields.width || ""} onChange={e => setStructField("width", e.target.value)} style={SE("width")} />
                {SEMsg("width")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Length *</label>
                <input type="number" placeholder="e.g. 8" value={structFields.length || ""} onChange={e => setStructField("length", e.target.value)} style={SE("length")} />
                {SEMsg("length")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Height *</label>
                <input type="number" placeholder="e.g. 5" value={structFields.height || ""} onChange={e => setStructField("height", e.target.value)} style={SE("height")} />
                {SEMsg("height")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Client Name *</label>
                <input placeholder="e.g. Donalds" value={structFields.client || ""} onChange={e => setStructField("client", e.target.value)} style={SE("client")} />
                {SEMsg("client")}
              </div>
            </>)}

            {/* Finished Goods — Wrapping Paper: Width x Height + UOM + Client */}
            {selType === "Finished Goods" && FG_WRAP_CATS.includes(selCat) && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>UOM *</label>
                <select value={structFields.uom || "inch"} onChange={e => setStructField("uom", e.target.value)}>
                  <option value="inch">inch</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Width *</label>
                <input type="number" placeholder="e.g. 20" value={structFields.width || ""} onChange={e => setStructField("width", e.target.value)} style={SE("width")} />
                {SEMsg("width")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Height *</label>
                <input type="number" placeholder="e.g. 30" value={structFields.height || ""} onChange={e => setStructField("height", e.target.value)} style={SE("height")} />
                {SEMsg("height")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Client Name *</label>
                <input placeholder="e.g. ABC Corp" value={structFields.client || ""} onChange={e => setStructField("client", e.target.value)} style={SE("client")} />
                {SEMsg("client")}
              </div>
            </>)}

            {/* Finished Goods — Size + Client for specific categories */}
            {selType === "Finished Goods" && FG_SIZE_CLIENT_CATS.includes(selCat) && (<>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Size *</label>
                <select value={structFields.size || ""} onChange={e => setStructField("size", e.target.value)} style={SE("size")}>
                  <option value="">-- Select Size --</option>
                  {(sizeMaster[selCat] || []).map(s => <option key={s}>{s}</option>)}
                </select>
                {SEMsg("size")}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Client Name *</label>
                <input placeholder="e.g. RDBD" value={structFields.client || ""} onChange={e => setStructField("client", e.target.value)} style={SE("client")} />
                {SEMsg("client")}
              </div>
            </>)}

            {/* Finished Goods — free name for other categories */}
            {selType === "Finished Goods" && !FG_SIZE_CLIENT_CATS.includes(selCat) && !FG_BOX_CATS.includes(selCat) && !FG_FLAT_CATS.includes(selCat) && !FG_BAG_CATS.includes(selCat) && !FG_WRAP_CATS.includes(selCat) && selCat && (
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Item Name *</label>
                <input placeholder={`e.g. ${selCat} item`} value={structFields.name || ""} onChange={e => setStructField("name", e.target.value)} style={SE("name")} />
                {SEMsg("name")}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <button onClick={addStructuredItem} style={{ background: typeColor, color: "#fff", border: "none", borderRadius: 6, padding: "9px 18px", fontWeight: 700, fontSize: 13 }}>+ Add</button>
            </div>
          </div>
        )}

        {/* Preview + next code */}
        {selCat && (
          <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {preview && (
              <div style={{ padding: "8px 12px", background: typeColor + "11", borderRadius: 6, border: `1px dashed ${typeColor}44`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: C.muted }}>Preview:</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: typeColor, fontWeight: 700, fontSize: 14 }}>{preview}</span>
              </div>
            )}
            <div style={{ padding: "8px 12px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Auto Code:</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: typeColor, fontWeight: 800, fontSize: 14 }}>
                {generateProductCode(selType, itemCounters)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Item list */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: typeColor }}>{selType} Items ({filtered.length})</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Backfill codes for items that don't have one */}
            {(itemMasterFG[selType] || []).some(it => !it.code) && (
              <button onClick={() => {
                const typeKey = selType === "Raw Material" ? "RM" : selType === "Finished Goods" ? "FG" : selType === "Consumable" ? "CG" : "SP";
                let counter = itemCounters[typeKey] || 1;
                setItemMasterFG(prev => ({
                  ...prev,
                  [selType]: (prev[selType] || []).map(it => {
                    if (it.code) return it;
                    const prefix = typeKey;
                    const code = prefix + String(counter).padStart(4, "0");
                    counter++;
                    return { ...it, code };
                  })
                }));
                setItemCounters(c => ({ ...c, [typeKey]: counter }));
                toast("Codes assigned to all " + selType + " items");
              }} style={{ background: C.yellow + "22", color: C.yellow, border: `1px solid ${C.yellow}44`, borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                ⚡ Assign Missing Codes
              </button>
            )}
            <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            {selType === "Finished Goods" && categories.length > 0 && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: 12, maxWidth: 200 }}>
                <option value="All">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            )}
            {selType === "Raw Material" && (
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "Paper Reel", "Paper Sheet"].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)} style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                    background: filterCat === cat ? (cat === "Paper Reel" ? C.blue + "33" : cat === "Paper Sheet" ? C.green + "33" : C.surface) : "transparent",
                    color: filterCat === cat ? (cat === "Paper Reel" ? C.blue : cat === "Paper Sheet" ? C.green : C.text) : C.muted,
                    outline: filterCat === cat ? `1px solid ${cat === "Paper Reel" ? C.blue + "66" : cat === "Paper Sheet" ? C.green + "66" : C.border}` : "none",
                  }}>{cat}</button>
                ))}
              </div>
            )}
            <button onClick={() => {
              const rows = filtered.map(it => ({
                Product_Code: it.code || "",
                Item_Name: it.name,
                Category: it.category || "",
                Type: selType,
                Added_On: it.addedOn || "",
                Source: it.source || "",
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, selType.replace(/\s+/g, "_").slice(0, 31));
              xlsxDownload(wb, `Item_Master_${selType.replace(/\s+/g, "_")}_${today()}.xlsx`);
            }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>⬇ Export Excel</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>
            No {selType} items yet.<br />
            <span style={{ fontSize: 12 }}>{selType === "Finished Goods" ? "They auto-populate when you create Sales Orders." : "Add items above."}</span>
          </div>
        ) : (
          <div>
            {filtered.map((it, i) => {
              const isExpanded = expandedItem === it.id;
              const clientCodes = it.clientCodes || {};
              const clientCodeCount = Object.keys(clientCodes).filter(k => clientCodes[k]).length;
              return (
              <div key={it.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {}
                    <div style={{ minWidth: 72, padding: "3px 8px", background: it.code ? typeColor + "22" : C.border + "33", borderRadius: 5, border: `1px solid ${it.code ? typeColor + "55" : C.border}`, textAlign: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 800, color: it.code ? typeColor : C.muted }}>
                        {it.code || "—"}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{it.name}</span>
                      {it.category && selType !== "Raw Material" && <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>· {it.category}</span>}
                    </div>
                    {selType === "Raw Material" && it.category && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 5,
                        background: it.category === "Paper Reel" ? C.blue + "22" : it.category === "Paper Sheet" ? C.green + "22" : C.yellow + "22",
                        color: it.category === "Paper Reel" ? C.blue : it.category === "Paper Sheet" ? C.green : C.yellow,
                        border: `1px solid ${it.category === "Paper Reel" ? C.blue : it.category === "Paper Sheet" ? C.green : C.yellow}44`
                      }}>{it.category}</span>
                    )}
                    <Badge label={it.source} color={it.source === "Manual" ? C.blue : C.green} />
                    {clientCodeCount > 0 && (
                      <span style={{ fontSize: 10, color: C.purple, background: C.purple + "18", border: `1px solid ${C.purple}33`, borderRadius: 4, padding: "1px 7px", fontWeight: 700 }}>
                        {clientCodeCount} client code{clientCodeCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.muted }}>{it.addedOn}</span>
                    {selType === "Finished Goods" && (
                      <button onClick={() => setExpandedItem(isExpanded ? null : it.id)}
                        style={{ background: C.purple + "18", color: C.purple, border: `1px solid ${C.purple}33`, borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        🏷 Client Codes {isExpanded ? "▲" : "▼"}
                      </button>
                    )}
                    {canEditItemmaster && <button onClick={() => remove(it.id)} style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>Remove</button>}
                  </div>
                </div>

                {}
                {isExpanded && selType === "Finished Goods" && (
                  <div style={{ background: C.surface, borderTop: `1px solid ${C.border}22`, padding: "12px 16px 14px 16px", marginLeft: 84 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                      Client-Specific Product Codes
                      <span style={{ marginLeft: 8, fontSize: 10, color: C.muted, fontWeight: 400, textTransform: "none" }}>— printed on delivery challan for that client</span>
                    </div>

                    {}
                    {Object.entries(clientCodes).filter(([, v]) => v).map(([clientName, code]) => (
                      <div key={clientName} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 10px", background: C.purple + "12", border: `1px solid ${C.purple}33`, borderRadius: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{clientName}</span>
                        <input
                          type="text"
                          value={code}
                          onChange={e => {
                            const newCodes = { ...clientCodes, [clientName]: e.target.value };
                            setItemMasterFG(prev => ({ ...prev, [selType]: (prev[selType] || []).map(x => x.id === it.id ? { ...x, clientCodes: newCodes } : x) }));
                          }}
                          style={{ fontSize: 12, width: 160, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.purple }}
                        />
                        <button onClick={() => {
                          const newCodes = { ...clientCodes };
                          delete newCodes[clientName];
                          setItemMasterFG(prev => ({ ...prev, [selType]: (prev[selType] || []).map(x => x.id === it.id ? { ...x, clientCodes: newCodes } : x) }));
                        }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: "0 4px", fontWeight: 700 }}>✕</button>
                      </div>
                    ))}

                    {}
                    {(() => {
                      const unmapped = clientMaster.filter(cl => !clientCodes[cl.name]);
                      if (unmapped.length === 0 && Object.keys(clientCodes).length === 0) {
                        return <div style={{ fontSize: 12, color: C.muted }}>No clients yet. Add clients in Client Master first.</div>;
                      }
                      if (unmapped.length === 0) return null;
                      return (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                          <select
                            defaultValue=""
                            onChange={e => {
                              const clientName = e.target.value;
                              if (!clientName) return;
                              const newCodes = { ...clientCodes, [clientName]: "" };
                              setItemMasterFG(prev => ({ ...prev, [selType]: (prev[selType] || []).map(x => x.id === it.id ? { ...x, clientCodes: newCodes } : x) }));
                              e.target.value = "";
                            }}
                            style={{ fontSize: 12, flex: 1, maxWidth: 260 }}
                          >
                            <option value="">+ Add client code for...</option>
                            {unmapped.map(cl => <option key={cl.id} value={cl.name}>{cl.name}</option>)}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}




const SEED_MACHINES = [
  { name: "SBBM 360 Machine 1",           type: "Bag Making"   },
  { name: "SBBM 360 Machine 2",           type: "Bag Making"   },
  { name: "Flexo Printing Machine",       type: "Printing"     },
  { name: "Sheet Cutting Machine",        type: "Cutting"      },
  { name: "Handmade",                     type: "Handmade"     },
  { name: "Komori 28x40inch Machine",     type: "Printing"     },
  { name: "Akiyama 19x26inch Machine",    type: "Printing"     },
  { name: "Manual Die Cutting Machine 1", type: "Die Cutting"  },
  { name: "Manual Die Cutting Machine 2", type: "Die Cutting"  },
  { name: "Half Cutting Machine",         type: "Die Cutting"  },
  { name: "Automatic Die Cutting",        type: "Die Cutting"  },
  { name: "Carton Erection 1",            type: "Formation"    },
  { name: "Carton Erection 2",            type: "Formation"    },
  { name: "Bowl 250ml",                   type: "Formation"    },
  { name: "Bowl 350ml",                   type: "Formation"    },
  { name: "Bowl 500ml",                   type: "Formation"    },
  { name: "Bowl 750ml",                   type: "Formation"    },
  { name: "Lid 110mm 1",                  type: "Formation"    },
  { name: "Lid 110mm 2",                  type: "Formation"    },
  { name: "Single Layer Lid",             type: "Formation"    },
  { name: "Dip Bowl",                     type: "Formation"    },
  { name: "Single Wall Cup",              type: "Formation"    },
  { name: "Double Wall Cup",              type: "Formation"    },
  { name: "Flat Bowl Machine 1",          type: "Formation"    },
  { name: "Flat Bowl Machine 2",          type: "Formation"    },
  { name: "Flat Bowl Lid Machine",        type: "Formation"    },
];



function PrintingDetailMaster({ printingMaster, setPrintingMaster, toast }) {
  const { canEdit } = useAuth();
  const canEditPM = canEdit("printingmaster");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = React.useMemo(() => printingMaster.filter(r =>
    !search || (r.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.clientCategory || "").toLowerCase().includes(search.toLowerCase())
  ), [printingMaster, search]);

  const startEdit = (r) => { setEditId(r.id); setEditData({ ...r }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const saveEdit = (id) => {
    const d = editData;
    const sheetSize = d.sheetW && d.sheetL ? d.sheetW + "x" + d.sheetL + (d.sheetUom || "mm") : d.sheetSize || "";
    setPrintingMaster(prev => prev.map(r => r.id === id ? { ...r, ...d, sheetSize } : r));
    toast("Printing detail updated");
    setEditId(null);
    setEditData({});
  };

  const exportToExcel = () => {
    const rows = filtered.map(r => {
      const isReel = r.paperCategory === "Paper Reel";
      const base = {
        "Item Name":       r.itemName || "",
        "Client Name":     r.clientName || "",
        "Client Category": r.clientCategory || "",
        "Paper Category":  r.paperCategory || "",
        "Printing":        r.printing || "",
        "Plate":           r.plate || "",
        "Process":         (r.process || []).join(", "),
        "Paper Type":      r.paperType || "",
        "Paper GSM":       r.paperGsm || "",
      };
      if (isReel) {
        return { ...base, "Reel Size": r.reelSize || "", "Reel Width (mm)": r.reelWidthMm || "", "Cutting Length (mm)": r.cuttingLengthMm || "", "Reel Weight (kg)": r.reelWeightKg || "" };
      }
      return { ...base, "# of Ups": r.noOfUps || "", "Sheet UOM": r.sheetUom || "mm", "Sheet W": r.sheetW || "", "Sheet L": r.sheetL || "", "Sheet Size": r.sheetSize || "" };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Printing Details");
    xlsxDownload(wb, `Printing_Detail_Master_${today()}.xlsx`);
  };

  return (
    <div className="fade">
      <SectionTitle icon="🖨️" title="Printing Detail Master" sub="Saved printing specs per item — auto-populates new Job Orders" />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="🔍 Search item..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <ExcelImportBtn
          label="Printing Details"
          color={C.blue}
          templateCols={["Item Name","Client Name","Client Category","Paper Category","Printing","Plate","Process","Paper Type","Paper GSM","# of Ups","Sheet UOM","Sheet W","Sheet L","Reel Size","Reel Width (mm)","Cutting Length (mm)","Reel Weight (kg)"]}
          templateRows={[]}
          onImport={rows => {
            let added = 0, updated = 0;
            rows.forEach(row => {
              const itemName       = (row["Item Name"]       || "").toString().trim();
              if (!itemName) return;
              const clientName     = (row["Client Name"]     || "").toString().trim();
              const clientCategory = (row["Client Category"] || "").toString().trim();
              const paperCategory  = (row["Paper Category"]  || "").toString().trim();
              const isReel = paperCategory === "Paper Reel";
              const entry = {
                itemName, clientName, clientCategory, paperCategory,
                printing:  (row["Printing"]   || "").toString().trim(),
                plate:     (row["Plate"]       || "").toString().trim(),
                process:   (row["Process"]     || "").toString().split(",").map(s => s.trim()).filter(Boolean),
                paperType: (row["Paper Type"]  || "").toString().trim(),
                paperGsm:  (row["Paper GSM"]   || "").toString().trim(),
                ...(isReel ? {
                  reelSize:        (row["Reel Size"]            || "").toString().trim(),
                  reelWidthMm:     (row["Reel Width (mm)"]      || "").toString().trim(),
                  cuttingLengthMm: (row["Cutting Length (mm)"]  || "").toString().trim(),
                  reelWeightKg:    (row["Reel Weight (kg)"]     || "").toString().trim(),
                } : {
                  noOfUps:  (row["# of Ups"]   || "").toString().trim(),
                  sheetUom: (row["Sheet UOM"]   || "mm").toString().trim(),
                  sheetW:   (row["Sheet W"]     || "").toString().trim(),
                  sheetL:   (row["Sheet L"]     || "").toString().trim(),
                }),
              };
              if (!isReel && entry.sheetW && entry.sheetL) {
                entry.sheetSize = entry.sheetW + "x" + entry.sheetL + (entry.sheetUom || "mm");
              }
              setPrintingMaster(prev => {
                const idx = prev.findIndex(r =>
                  (r.itemName || "").toLowerCase() === itemName.toLowerCase() &&
                  (r.clientName || "").toLowerCase() === clientName.toLowerCase() &&
                  (r.clientCategory || "").toLowerCase() === clientCategory.toLowerCase()
                );
                if (idx >= 0) { updated++; const u = [...prev]; u[idx] = { ...u[idx], ...entry }; return u; }
                added++;
                return [...prev, { id: uid(), ...entry, addedOn: today() }];
              });
            });
            toast(`Printing Details: ${added} added, ${updated} updated`);
          }}
        />
        <button onClick={exportToExcel} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>⬇ Export Excel</button>
        <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{filtered.length} items</span>
      </div>

      {filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🖨️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No printing details yet</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Details are saved automatically when a Job Order is created, or import via Excel</div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 60px 60px 1.2fr 100px 55px 50px 90px 75px", gap: 8, padding: "8px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
            {["Item Name / Client","Cat.","Printing","Plate","Process","Paper Type","GSM","Ups / Reel","Size / Width","W×L / Cut+Wt"].map(h => (
              <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
            ))}
          </div>
          {filtered.map(r => (
            <React.Fragment key={r.id}>
              {}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 60px 60px 1.2fr 100px 55px 50px 90px 75px", gap: 8, padding: "10px 16px", borderBottom: editId === r.id ? "none" : `1px solid ${C.border}22`, alignItems: "center", background: editId === r.id ? C.surface : "transparent" }}
                onMouseEnter={e => { if (editId !== r.id) e.currentTarget.style.background = C.surface; }}
                onMouseLeave={e => { if (editId !== r.id) e.currentTarget.style.background = "transparent"; }}>
                {}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.itemName}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {r.clientName && <span>{r.clientName}</span>}
                    {r.clientCategory && <Badge label={r.clientCategory} color={r.clientCategory === "HP" ? C.blue : r.clientCategory === "ZPL" ? C.green : C.yellow} />}
                    {canEditPM && (
                      <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        {confirmDeleteId === r.id ? (<>
                          <button onClick={() => { setPrintingMaster(prev => prev.filter(x => x.id !== r.id)); setConfirmDeleteId(null); toast("Deleted"); }} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>No</button>
                        </>) : (<>
                          <button onClick={() => editId === r.id ? cancelEdit() : startEdit(r)} style={{ background: editId === r.id ? C.red + "22" : C.blue + "22", color: editId === r.id ? C.red : C.blue, border: `1px solid ${editId === r.id ? C.red : C.blue}44`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{editId === r.id ? "✕ Close" : "✏️ Edit"}</button>
                          {editId !== r.id && <button onClick={() => setConfirmDeleteId(r.id)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🗑</button>}
                        </>)}
                      </span>
                    )}
                  </div>
                </div>
                {}
                {r.clientCategory ? <Badge label={r.clientCategory} color={r.clientCategory === "HP" ? C.blue : r.clientCategory === "ZPL" ? C.green : C.yellow} /> : <span style={{ fontSize: 11, color: C.border }}>—</span>}
                <span style={{ fontSize: 12, color: C.muted }}>{r.printing || "—"}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{r.plate || "—"}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{(r.process || []).map(p => <span key={p} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: C.accent + "22", color: C.accent }}>{p}</span>)}</div>
                <span style={{ fontSize: 11, color: C.muted }}>{r.paperType || "—"}</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.blue }}>{r.paperGsm ? r.paperGsm + "g" : "—"}</span>
                {}
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.muted }}>
                  {r.paperCategory === "Paper Reel" ? (r.reelSize ? r.reelSize.split(" — ")[0] : "—") : (r.noOfUps || "—")}
                </span>
                {}
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.green }}>
                  {r.paperCategory === "Paper Reel" ? (r.reelWidthMm ? r.reelWidthMm + "mm" : "—") : (r.sheetSize || "—")}
                </span>
                {}
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.muted }}>
                  {r.paperCategory === "Paper Reel"
                    ? (r.cuttingLengthMm ? r.cuttingLengthMm + "mm cut" : r.reelWeightKg ? r.reelWeightKg + "kg" : "—")
                    : (r.sheetW && r.sheetL ? r.sheetW + "×" + r.sheetL : "—")}
                </span>
              </div>

              {}
              {editId === r.id && (
                <div style={{ padding: "20px 20px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}33` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Edit Printing Details — {r.itemName}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Item Name</label>
                      <input value={editData.itemName || ""} onChange={e => setEditData(p => ({ ...p, itemName: e.target.value }))} /></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Client Name</label>
                      <input value={editData.clientName || ""} onChange={e => setEditData(p => ({ ...p, clientName: e.target.value }))} /></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Client Category</label>
                      <select value={editData.clientCategory || ""} onChange={e => setEditData(p => ({ ...p, clientCategory: e.target.value }))}>
                        <option value="">-- Select --</option>
                        {["HP", "ZPL", "Others", "Unprinted"].map(c => <option key={c}>{c}</option>)}
                      </select></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Printing</label>
                      <select value={editData.printing || ""} onChange={e => setEditData(p => ({ ...p, printing: e.target.value }))}>
                        <option value="">-- Select --</option>
                        {["1","2","3","4","5","6","Unprinted"].map(v => <option key={v}>{v}</option>)}
                      </select></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Plate</label>
                      <select value={editData.plate || ""} onChange={e => setEditData(p => ({ ...p, plate: e.target.value }))}>
                        <option value="">-- Select --</option>
                        {["New","Old"].map(v => <option key={v}>{v}</option>)}
                      </select></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Paper Type</label>
                      <input value={editData.paperType || ""} onChange={e => setEditData(p => ({ ...p, paperType: e.target.value }))} /></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Paper GSM</label>
                      <input type="number" placeholder="e.g. 330" value={editData.paperGsm || ""} onChange={e => setEditData(p => ({ ...p, paperGsm: e.target.value }))} /></div>

                    {}
                    <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Paper Category</label>
                      <select value={editData.paperCategory || ""} onChange={e => setEditData(p => ({ ...p, paperCategory: e.target.value }))}>
                        <option value="">-- Select --</option>
                        <option value="Paper Reel">Paper Reel</option>
                        <option value="Paper Sheet">Paper Sheet</option>
                      </select></div>

                    {}
                    {editData.paperCategory === "Paper Reel" ? (<>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Reel Size</label>
                        <input placeholder="e.g. RM0001 — MG Kraft..." value={editData.reelSize || ""} onChange={e => setEditData(p => ({ ...p, reelSize: e.target.value }))} /></div>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Reel Width (mm)</label>
                        <input type="number" placeholder="e.g. 690" value={editData.reelWidthMm || ""} onChange={e => setEditData(p => ({ ...p, reelWidthMm: e.target.value }))} /></div>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Cutting Length (mm)</label>
                        <input type="number" placeholder="e.g. 920" value={editData.cuttingLengthMm || ""} onChange={e => setEditData(p => ({ ...p, cuttingLengthMm: e.target.value }))} /></div>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Reel Weight (kg)</label>
                        <input type="number" placeholder="e.g. 200" value={editData.reelWeightKg || ""} onChange={e => setEditData(p => ({ ...p, reelWeightKg: e.target.value }))} /></div>
                    </>) : (<>
                      {}
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}># of Ups</label>
                        <input type="number" placeholder="e.g. 24" value={editData.noOfUps || ""} onChange={e => setEditData(p => ({ ...p, noOfUps: e.target.value }))} /></div>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Sheet UOM</label>
                        <select value={editData.sheetUom || "mm"} onChange={e => setEditData(p => ({ ...p, sheetUom: e.target.value, sheetSize: p.sheetW && p.sheetL ? p.sheetW + "x" + p.sheetL + e.target.value : "" }))}>
                          {["mm","cm","inch"].map(u => <option key={u}>{u}</option>)}
                        </select></div>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Sheet W</label>
                        <input type="number" placeholder="Width" value={editData.sheetW || ""} onChange={e => setEditData(p => ({ ...p, sheetW: e.target.value, sheetSize: e.target.value && p.sheetL ? e.target.value + "x" + p.sheetL + (p.sheetUom || "mm") : "" }))} /></div>
                      <div><label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Sheet L</label>
                        <input type="number" placeholder="Length" value={editData.sheetL || ""} onChange={e => setEditData(p => ({ ...p, sheetL: e.target.value, sheetSize: p.sheetW && e.target.value ? p.sheetW + "x" + e.target.value + (p.sheetUom || "mm") : "" }))} /></div>
                    </>)}
                  </div>

                  {}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>Process</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {STAGES.map(p => {
                        const sel = (editData.process || []).includes(p);
                        return <button key={p} onClick={() => setEditData(d => ({ ...d, process: sel ? d.process.filter(x => x !== p) : [...(d.process || []), p] }))}
                          style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent + "22" : "transparent", color: sel ? C.accent : C.muted, fontWeight: sel ? 700 : 400, fontSize: 12, cursor: "pointer" }}>{p}</button>;
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveEdit(r.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save Changes</button>
                    <button onClick={cancelEdit} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </Card>
      )}
    </div>
  );
}

const MACHINE_TYPE_COLORS = {
  "Printing":      C.blue,
  "Cutting":       "#f97316",
  "Die Cutting":   C.accent,
  "Bag Making":    C.purple,
  "Sheeting":      "#06b6d4",
  "Sheet Cutting": "#06b6d4",
  "Formation":     C.green,
  "Handmade":      C.yellow,
};
const MACHINE_TYPE_ICONS = {
  "Printing":      "🖨️",
  "Cutting":       "✂️",
  "Die Cutting":   "🔪",
  "Bag Making":    "🛍️",
  "Sheeting":      "📄",
  "Sheet Cutting": "📄",
  "Formation":     "🏭",
  "Handmade":      "🙌",
};

const MACHINE_TYPES = Object.keys(MACHINE_TYPE_COLORS);

function MachineMaster({ machineMaster, setMachineMaster }) {
  const { isAdmin, canEdit } = useAuth();
  const canEditMachinemaster = canEdit("machinemaster");
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [addName, setAddName]       = useState("");
  const [addType, setAddType]       = useState(MACHINE_TYPES[0]);
  const [addErr, setAddErr]         = useState(false);
  const [editId, setEditId]         = useState(null);
  const [editFields, setEditFields] = useState({});
  const [view, setView]             = useState("grid"); 

  const remove = (id) => setMachineMaster(prev => prev.filter(m => m.id !== id));
  const toggle = (id) => setMachineMaster(prev => prev.map(m => m.id === id ? { ...m, status: m.status === "Active" ? "Inactive" : "Active" } : m));

  const add = () => {
    const n = addName.trim();
    if (!n) { setAddErr(true); return; }
    if (machineMaster.some(m => m.name.toLowerCase() === n.toLowerCase())) { setAddErr(true); return; }
    setMachineMaster(prev => [...prev, {
      id: uid(), name: n, type: addType, status: "Active",
      capacity: "", capacityUnit: "pcs/hr", workingHours: 8, shiftsPerDay: 1, addedOn: today()
    }]);
    setAddName(""); setAddErr(false);
  };

  const startEdit = (m) => {
    setEditId(m.id);
    setEditFields({ name: m.name, type: m.type, capacity: m.capacity || "", capacityUnit: m.capacityUnit || "pcs/hr", workingHours: m.workingHours ?? 8, shiftsPerDay: m.shiftsPerDay ?? 1 });
  };
  const saveEdit = (id) => {
    const n = (editFields.name || "").trim();
    if (!n) return;
    setMachineMaster(prev => prev.map(m => m.id === id ? { ...m, ...editFields, name: n } : m));
    setEditId(null);
  };
  const setEF = (k, v) => setEditFields(p => ({ ...p, [k]: v }));

  
  const updateCapacity = (id, field, val) => {
    setMachineMaster(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const filtered = machineMaster.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.type.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType === "All"   || m.type === filterType;
    const matchStatus = filterStatus === "All" || m.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  
  const grouped = {};
  filtered.forEach(m => { if (!grouped[m.type]) grouped[m.type] = []; grouped[m.type].push(m); });
  const allTypes = Object.keys(grouped).sort();

  const activeCount   = machineMaster.filter(m => m.status === "Active").length;
  const inactiveCount = machineMaster.filter(m => m.status === "Inactive").length;
  const configuredCount = machineMaster.filter(m => m.capacity && +m.capacity > 0).length;

  
  const dailyOutput = (m) => {
    const cap = +(m.capacity || 0);
    const hrs = +(m.workingHours || 8);
    const shifts = +(m.shiftsPerDay || 1);
    return cap > 0 ? cap * hrs * shifts : null;
  };

  const CAPACITY_UNITS = ["pcs/hr", "sheets/hr", "kg/hr", "boxes/hr", "units/hr"];

  const EditForm = ({ m }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
      <div>
        <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Machine Name</label>
        <input value={editFields.name} onChange={e => setEF("name", e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(m.id); if (e.key === "Escape") setEditId(null); }} style={{ fontSize: 12 }} autoFocus />
      </div>
      <div>
        <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Type</label>
        <select value={editFields.type} onChange={e => setEF("type", e.target.value)} style={{ fontSize: 12 }}>
          {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Capacity</label>
        <input type="number" placeholder="e.g. 5000" value={editFields.capacity} onChange={e => setEF("capacity", e.target.value)} style={{ fontSize: 12 }} />
      </div>
      <div>
        <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Unit</label>
        <select value={editFields.capacityUnit} onChange={e => setEF("capacityUnit", e.target.value)} style={{ fontSize: 12 }}>
          {CAPACITY_UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Working Hours / Shift</label>
        <input type="number" min="1" max="24" value={editFields.workingHours} onChange={e => setEF("workingHours", e.target.value)} style={{ fontSize: 12 }} />
      </div>
      <div>
        <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Shifts / Day</label>
        <select value={editFields.shiftsPerDay} onChange={e => setEF("shiftsPerDay", e.target.value)} style={{ fontSize: 12 }}>
          {[1,2,3].map(n => <option key={n} value={n}>{n} shift{n > 1 ? "s" : ""}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => saveEdit(m.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 5, padding: "6px 18px", fontWeight: 700, fontSize: 12 }}>Save</button>
        <button onClick={() => setEditId(null)} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px 12px", fontWeight: 700, fontSize: 12 }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="fade">
      <SectionTitle icon="🏗️" title="Machine Master" sub="Production machines — capacity, working time & shift planning" />

      {}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total",       val: machineMaster.length, color: C.text,   bg: C.border  },
          { label: "Active",      val: activeCount,          color: C.green,  bg: C.green   },
          { label: "Inactive",    val: inactiveCount,        color: C.red,    bg: C.red     },
          { label: "Configured",  val: configuredCount,      color: C.blue,   bg: C.blue    },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg + "18", border: `1px solid ${s.bg}44`, borderRadius: 8, padding: "10px 20px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color: s.color }}>{s.val}</span>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.yellow, marginBottom: 14 }}>Add New Machine</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Machine Name *</label>
            <input placeholder="e.g. Offset Printer 3" value={addName}
              onChange={e => { setAddName(e.target.value); setAddErr(false); }}
              onKeyDown={e => e.key === "Enter" && add()}
              style={addErr ? { border: `1px solid ${C.red}` } : {}}
            />
            {addErr && <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Enter a unique machine name</div>}
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Type *</label>
            <select value={addType} onChange={e => setAddType(e.target.value)}>
              {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={add} style={{ background: C.yellow, color: "#fff", border: "none", borderRadius: 6, padding: "9px 24px", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>+ Add</button>
        </div>
      </Card>

      {}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 150 }}>
          <option value="All">All Types</option>
          {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 120 }}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[["grid","⊞ Grid"], ["list","≡ List"], ["capacity","📊 Capacity"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${view === v ? C.yellow : C.border}`, background: view === v ? C.yellow + "22" : "transparent", color: view === v ? C.yellow : C.muted, fontWeight: 700, fontSize: 12 }}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} machines</span>
      </div>

      {}
      {view === "grid" && (
        filtered.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 50, color: C.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>🏗️</div>No machines match your filters.</Card>
        ) : allTypes.map(type => {
          const col  = MACHINE_TYPE_COLORS[type] || C.muted;
          const icon = MACHINE_TYPE_ICONS[type]  || "⚙️";
          const group = grouped[type];
          return (
            <div key={type} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: col, textTransform: "uppercase", letterSpacing: 1 }}>{type}</span>
                <span style={{ fontSize: 11, color: C.muted }}>({group.length})</span>
                <div style={{ flex: 1, height: 1, background: col + "33", marginLeft: 8 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                {group.map(m => {
                  const daily = dailyOutput(m);
                  return (
                    <div key={m.id} style={{
                      background: C.card, border: `1px solid ${m.status === "Inactive" ? C.border : col + "44"}`,
                      borderLeft: `4px solid ${m.status === "Inactive" ? C.border : col}`,
                      borderRadius: 10, padding: "14px 16px", opacity: m.status === "Inactive" ? 0.6 : 1,
                    }}>
                      {editId === m.id ? <EditForm m={m} /> : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{m.name}</div>
                              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Added {m.addedOn}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 10, background: m.status === "Active" ? C.green + "22" : C.red + "22", color: m.status === "Active" ? C.green : C.red, border: `1px solid ${m.status === "Active" ? C.green + "55" : C.red + "55"}` }}>{m.status}</span>
                          </div>

                          {}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10, padding: "8px 10px", background: C.surface, borderRadius: 6 }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Capacity</div>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: m.capacity ? col : C.border }}>{m.capacity ? `${fmt(+m.capacity)}` : "—"}</div>
                              <div style={{ fontSize: 9, color: C.muted }}>{m.capacity ? (m.capacityUnit || "pcs/hr") : ""}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Hrs/Shift</div>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: C.text }}>{m.workingHours ?? 8}</div>
                              <div style={{ fontSize: 9, color: C.muted }}>hours</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Shifts</div>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: C.text }}>{m.shiftsPerDay ?? 1}</div>
                              <div style={{ fontSize: 9, color: C.muted }}>per day</div>
                            </div>
                          </div>

                          {}
                          {daily !== null && (
                            <div style={{ marginBottom: 10, padding: "6px 10px", background: col + "11", borderRadius: 5, border: `1px solid ${col}33`, textAlign: "center" }}>
                              <span style={{ fontSize: 10, color: C.muted }}>Daily Output: </span>
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: col, fontSize: 13 }}>{fmt(daily)}</span>
                              <span style={{ fontSize: 10, color: C.muted }}> {(m.capacityUnit || "pcs/hr").replace("/hr","")}/day</span>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => toggle(m.id)} style={{ flex: 1, background: m.status === "Active" ? C.red + "18" : C.green + "18", color: m.status === "Active" ? C.red : C.green, border: `1px solid ${m.status === "Active" ? C.red + "44" : C.green + "44"}`, borderRadius: 5, padding: "5px 0", fontWeight: 700, fontSize: 11 }}>
                              {m.status === "Active" ? "Set Inactive" : "Set Active"}
                            </button>
                            {canEditMachinemaster && <button onClick={() => startEdit(m)} style={{ background: C.blue + "18", color: C.blue, border: `1px solid ${C.blue}44`, borderRadius: 5, padding: "5px 10px", fontWeight: 700, fontSize: 11 }}>✏️</button>}
                            {canEditMachinemaster && <button onClick={() => remove(m.id)} style={{ background: C.red + "18", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: "5px 10px", fontWeight: 700, fontSize: 11 }}>🗑</button>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {}
      {view === "list" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 50, fontSize: 13 }}><div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>No machines match.</div>
          ) : <>
            <div style={{ display: "grid", gridTemplateColumns: "36px 2fr 130px 80px 90px 80px 70px 110px 130px", gap: 6, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
              {["#","Machine Name","Type","Status","Capacity","Hrs","Shifts","Daily Output","Actions"].map(h => (
                <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
              ))}
            </div>
            {filtered.map((m, i) => {
              const col   = MACHINE_TYPE_COLORS[m.type] || C.muted;
              const icon  = MACHINE_TYPE_ICONS[m.type]  || "⚙️";
              const daily = dailyOutput(m);
              return (
                <div key={m.id} style={{ borderBottom: `1px solid ${C.border}22`, opacity: m.status === "Inactive" ? 0.55 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {editId === m.id ? (
                    <div style={{ padding: "12px 14px" }}>
                      <EditForm m={m} />
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "36px 2fr 130px 80px 90px 80px 70px 110px 130px", gap: 6, padding: "10px 14px", alignItems: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>#{i+1}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span>{icon}</span><Badge label={m.type} color={col} /></span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: m.status === "Active" ? C.green+"22" : C.red+"22", color: m.status === "Active" ? C.green : C.red, border: `1px solid ${m.status === "Active" ? C.green+"55":C.red+"55"}`, textAlign:"center" }}>{m.status}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: m.capacity ? col : C.border }}>{m.capacity ? `${fmt(+m.capacity)} ${(m.capacityUnit||"pcs/hr")}` : "—"}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text }}>{m.workingHours ?? 8}h</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.text }}>{m.shiftsPerDay ?? 1}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: daily ? col : C.border, fontWeight: daily ? 700 : 400 }}>{daily ? fmt(daily) : "—"}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => toggle(m.id)} style={{ background: m.status==="Active" ? C.red+"18":C.green+"18", color: m.status==="Active"?C.red:C.green, border:"none", borderRadius:4, padding:"4px 7px", fontWeight:700, fontSize:10 }}>{m.status==="Active"?"Off":"On"}</button>
                        {canEditMachinemaster && <button onClick={() => startEdit(m)} style={{ background: C.blue+"18", color: C.blue, border:"none", borderRadius:4, padding:"4px 7px", fontWeight:700, fontSize:10 }}>✏️</button>}
                        {canEditMachinemaster && <button onClick={() => remove(m.id)} style={{ background: C.red+"18", color: C.red, border:"none", borderRadius:4, padding:"4px 7px", fontWeight:700, fontSize:10 }}>🗑</button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>}
        </Card>
      )}

      {}
      {view === "capacity" && (
        <div>
          <Card style={{ marginBottom: 16, borderLeft: `3px solid ${C.blue}`, padding: "14px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 6 }}>📊 Production Capacity Planner</div>
            <div style={{ fontSize: 12, color: C.muted }}>Set capacity per machine to calculate daily and weekly output. Daily Output = Capacity × Working Hours × Shifts/Day.</div>
          </Card>
          {MACHINE_TYPES.filter(type => filtered.some(m => m.type === type)).map(type => {
            const col   = MACHINE_TYPE_COLORS[type] || C.muted;
            const icon  = MACHINE_TYPE_ICONS[type]  || "⚙️";
            const group = filtered.filter(m => m.type === type);
            const totalDaily = group.filter(m => m.status === "Active").reduce((s, m) => s + (dailyOutput(m) || 0), 0);
            return (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: col, textTransform: "uppercase", letterSpacing: 1 }}>{type}</span>
                  {totalDaily > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: col, background: col+"18", border:`1px solid ${col}33`, borderRadius: 6, padding: "2px 10px", fontWeight: 700 }}>
                      Total Active Daily: {fmt(totalDaily)}
                    </span>
                  )}
                  <div style={{ flex: 1, height: 1, background: col + "33", marginLeft: 4 }} />
                </div>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 110px 120px 80px 80px 110px 80px", gap: 0, padding: "8px 14px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                    {["Machine","Status","Capacity","Unit","Hrs/Shift","Shifts/Day","Daily Output"].map(h => (
                      <div key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
                    ))}
                  </div>
                  {group.map(m => {
                    const daily = dailyOutput(m);
                    const weekly = daily ? daily * 6 : null; 
                    return (
                      <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 110px 120px 80px 80px 110px 80px", gap: 0, padding: "10px 14px", borderBottom: `1px solid ${C.border}22`, alignItems: "center", opacity: m.status==="Inactive" ? 0.5 : 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                        <span>
                          <button onClick={() => toggle(m.id)} style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8, background: m.status==="Active" ? C.green+"22":C.red+"22", color: m.status==="Active"?C.green:C.red, border:`1px solid ${m.status==="Active"?C.green+"55":C.red+"55"}`, cursor: "pointer" }}>{m.status}</button>
                        </span>
                        <input
                          type="number" placeholder="e.g. 5000"
                          value={m.capacity || ""}
                          onChange={e => updateCapacity(m.id, "capacity", e.target.value)}
                          style={{ fontSize: 12, padding: "5px 8px", fontFamily: "'JetBrains Mono',monospace" }}
                        />
                        <select value={m.capacityUnit || "pcs/hr"} onChange={e => updateCapacity(m.id, "capacityUnit", e.target.value)} style={{ fontSize: 11, padding: "5px 4px" }}>
                          {CAPACITY_UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                        <input
                          type="number" min="1" max="24" placeholder="8"
                          value={m.workingHours ?? 8}
                          onChange={e => updateCapacity(m.id, "workingHours", e.target.value)}
                          style={{ fontSize: 12, padding: "5px 8px", fontFamily: "'JetBrains Mono',monospace" }}
                        />
                        <select value={m.shiftsPerDay ?? 1} onChange={e => updateCapacity(m.id, "shiftsPerDay", e.target.value)} style={{ fontSize: 11, padding: "5px 4px" }}>
                          {[1,2,3].map(n => <option key={n} value={n}>{n} shift{n>1?"s":""}</option>)}
                        </select>
                        <div style={{ textAlign: "right" }}>
                          {daily ? (
                            <div>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: col, fontSize: 13 }}>{fmt(daily)}</div>
                              <div style={{ fontSize: 9, color: C.muted }}>{weekly ? fmt(weekly)+"/wk" : ""}</div>
                            </div>
                          ) : <span style={{ color: C.border, fontSize: 12 }}>—</span>}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



function GlobalSearch({ salesOrders, jobOrders, purchaseOrders, inward, fgStock, rawStock, dispatches, clientMaster }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = (q) => {
    const s = q.trim().toLowerCase();
    if (!s) { setResults(null); return; }

    const soMatches = salesOrders.filter(r =>
      r.soNo?.toLowerCase().includes(s) ||
      r.clientName?.toLowerCase().includes(s) ||
      (r.items || []).some(it => it.itemName?.toLowerCase().includes(s))
    ).map(r => ({ type: "Sales Order", ref: r.soNo, detail: r.clientName, sub: r.orderDate, status: r.status || "Open", statusColor: r.status === "Closed" ? C.muted : r.status === "Cancelled" ? C.red : C.green }));

    const joMatches = jobOrders.filter(r =>
      r.joNo?.toLowerCase().includes(s) ||
      r.itemName?.toLowerCase().includes(s) ||
      r.product?.toLowerCase().includes(s) ||
      r.clientName?.toLowerCase().includes(s) ||
      r.soRef?.toLowerCase().includes(s)
    ).map(r => ({ type: "Job Order", ref: r.joNo, detail: r.itemName || r.product, sub: r.soRef ? `SO: ${r.soRef}` : r.clientName || "", status: r.status || "Open", statusColor: r.status === "Completed" ? C.green : r.status === "Cancelled" ? C.red : C.yellow }));

    const poMatches = purchaseOrders.filter(r =>
      r.poNo?.toLowerCase().includes(s) ||
      r.vendorName?.toLowerCase().includes(s) ||
      (r.items || []).some(it => it.itemName?.toLowerCase().includes(s))
    ).map(r => ({ type: "Purchase Order", ref: r.poNo, detail: r.vendorName, sub: r.poDate, status: r.status || "Open", statusColor: r.status === "Received" ? C.green : r.status === "Cancelled" ? C.red : C.blue }));

    const grnMatches = inward.filter(r =>
      r.grn?.toLowerCase().includes(s) ||
      r.vendorName?.toLowerCase().includes(s) ||
      r.invoiceNo?.toLowerCase().includes(s) ||
      (r.items || []).some(it => it.itemName?.toLowerCase().includes(s))
    ).map(r => ({ type: "GRN", ref: r.grn, detail: r.vendorName, sub: `Invoice: ${r.invoiceNo}`, status: r.date, statusColor: C.blue }));

    const fgMatches = fgStock.filter(r =>
      (r.itemName || r.product)?.toLowerCase().includes(s) ||
      r.joNo?.toLowerCase().includes(s)
    ).map(r => ({ type: "FG Stock", ref: r.joNo || r.id, detail: r.itemName || r.product, sub: `Qty: ${r.qty}`, status: r.date, statusColor: C.purple }));

    const rmMatches = rawStock.filter(r =>
      r.name?.toLowerCase().includes(s)
    ).map(r => ({ type: "RM Stock", ref: r.id, detail: r.name, sub: `${r.qty} ${r.unit}`, status: r.qty <= 0 ? "Out of Stock" : r.qty < 50 ? "Low Stock" : "In Stock", statusColor: r.qty <= 0 ? C.red : r.qty < 50 ? C.yellow : C.green }));

    const clientMatches = clientMaster.filter(r =>
      r.name?.toLowerCase().includes(s)
    ).map(r => ({ type: "Client", ref: r.id, detail: r.name, sub: `Added: ${r.addedOn}`, status: r.source, statusColor: C.blue }));

    setResults([...soMatches, ...joMatches, ...poMatches, ...grnMatches, ...fgMatches, ...rmMatches, ...clientMatches]);
  };

  const TYPE_ICONS = { "Sales Order": "🧾", "Job Order": "⚙️", "Purchase Order": "🛒", "GRN": "🚚", "FG Stock": "🏭", "RM Stock": "📦", "Client": "👥" };

  return (
    <div className="fade">
      <SectionTitle icon="🔍" title="Global Search" sub="Search across all modules — orders, clients, stock, GRNs" />
      <Card style={{ marginBottom: 20 }}>
        <input
          ref={inputRef}
          placeholder="Type to search by SO#, JO#, client name, item name, vendor, invoice..."
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          style={{ fontSize: 16, padding: "12px 16px" }}
        />
        {query && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
            {results === null ? "Type to search..." : `${results.length} result${results.length !== 1 ? "s" : ""} found`}
          </div>
        )}
      </Card>

      {results !== null && results.length === 0 && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ color: C.muted, fontSize: 14 }}>No results found for "{query}"</div>
        </Card>
      )}

      {results !== null && results.length > 0 && (
        <div>
          {["Sales Order", "Job Order", "Purchase Order", "GRN", "FG Stock", "RM Stock", "Client"].map(type => {
            const group = results.filter(r => r.type === type);
            if (!group.length) return null;
            return (
              <div key={type} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{TYPE_ICONS[type]}</span> {type} ({group.length})
                </div>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {group.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < group.length - 1 ? `1px solid ${C.border}22` : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 18 }}>{TYPE_ICONS[r.type]}</span>
                        <div>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.accent, fontWeight: 700, fontSize: 13 }}>{r.ref}</span>
                          <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600 }}>{r.detail}</span>
                          {r.sub && <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>{r.sub}</span>}
                        </div>
                      </div>
                      <Badge label={r.status} color={r.statusColor} />
                    </div>
                  ))}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {!query && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { icon: "🧾", label: "Sales Orders", count: salesOrders.length, color: C.green },
            { icon: "⚙️", label: "Job Orders", count: jobOrders.length, color: C.yellow },
            { icon: "🛒", label: "Purchase Orders", count: purchaseOrders.length, color: C.blue },
            { icon: "🚚", label: "GRN Entries", count: inward.length, color: C.accent },
            { icon: "🏭", label: "FG Stock", count: fgStock.length, color: C.purple },
            { icon: "📦", label: "RM Stock", count: rawStock.length, color: C.blue },
            { icon: "👥", label: "Clients", count: clientMaster.length, color: C.green },
          ].map(x => (
            <Card key={x.label} style={{ borderLeft: `3px solid ${x.color}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{x.icon}</span>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: x.color, fontSize: 20 }}>{x.count}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{x.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


function ProductionCalendar({ jobOrders, setJobOrders, machineMaster, machineReportData, setMachineReportData }) {
  const [viewMode, setViewMode]   = useState("machine"); 
  const [calMode, setCalMode]     = useState("week");    
  const [anchor, setAnchor]       = useState(() => today());
  const [filterType, setFilterType] = useState("All");

  
  const [editSlot, setEditSlot]   = useState(null);
  const [editFields, setEditFields] = useState({});

  
  const [machinePanel, setMachinePanel] = useState(null); 
  
  

  const todayStr = today();

  const saveActualDaily = (machineId, date, val) => {
    setMachineReportData(prev => ({
      ...prev,
      [machineId]: { ...(prev[machineId] || {}), [date]: val }
    }));
  };

  
  const anchorDate = new Date(anchor + "T00:00:00");
  const getDates = () => {
    const dates = [];
    if (calMode === "week") {
      const day = anchorDate.getDay();
      const monday = new Date(anchorDate);
      monday.setDate(anchorDate.getDate() - ((day + 6) % 7));
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else {
      const y = anchorDate.getFullYear(), m = anchorDate.getMonth();
      const days = new Date(y, m + 1, 0).getDate();
      for (let i = 1; i <= days; i++)
        dates.push(`${y}-${String(m+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`);
    }
    return dates;
  };
  const dates = getDates();

  const prev = () => { const d = new Date(anchor+"T00:00:00"); calMode==="week" ? d.setDate(d.getDate()-7) : d.setMonth(d.getMonth()-1); setAnchor(d.toISOString().slice(0,10)); };
  const next = () => { const d = new Date(anchor+"T00:00:00"); calMode==="week" ? d.setDate(d.getDate()+7) : d.setMonth(d.getMonth()+1); setAnchor(d.toISOString().slice(0,10)); };

  
  const openEdit = (joNo, process) => {
    const jo = jobOrders.find(j => j.joNo === joNo);
    if (!jo) return;
    const slotIdx = (jo.schedule || []).findIndex(s => s.process === process);
    if (slotIdx === -1) return;
    const slot = jo.schedule[slotIdx];
    setEditSlot({ joNo, process, slotIdx, jo });
    setEditFields({
      actualStart:  slot.actualStart  || "",
      actualEnd:    slot.actualEnd    || "",
      actualQty:    slot.actualQty    || "",
      actualNotes:  slot.actualNotes  || "",
      startDate:    slot.startDate    || "",
      endDate:      slot.endDate      || "",
      machineName:  slot.machineName  || "",
      stageQty:     slot.stageQty     || 0,
      dailyOutput:  slot.dailyOutput  || 0,
      daysNeeded:   slot.daysNeeded   || 1,
    });
  };

  const saveEdit = () => {
    if (!editSlot) return;
    setJobOrders(prev => prev.map(jo => {
      if (jo.joNo !== editSlot.joNo) return jo;
      const schedule = [...(jo.schedule || [])];
      schedule[editSlot.slotIdx] = {
        ...schedule[editSlot.slotIdx],
        actualStart:  editFields.actualStart,
        actualEnd:    editFields.actualEnd,
        actualQty:    editFields.actualQty,
        actualNotes:  editFields.actualNotes,
      };
      return { ...jo, schedule };
    }));
    setEditSlot(null);
  };

  const setEF = (k, v) => setEditFields(p => ({ ...p, [k]: v }));

  
  const JO_COLORS = [C.blue, C.green, C.accent, C.purple, "#06b6d4", "#ec4899", "#f59e0b", "#10b981"];
  const joColorMap = {};
  jobOrders.forEach((j, i) => { joColorMap[j.joNo] = JO_COLORS[i % JO_COLORS.length]; });

  
  const assignmentMap = {}; 
  jobOrders.forEach(jo => {
    if (jo.status === "Cancelled") return;
    (jo.schedule || []).forEach(slot => {
      if (!slot.machineId || !slot.startDate || !slot.endDate) return;
      const isActualDone = !!slot.actualEnd;
      const isLate = slot.endDate < todayStr && !isActualDone;
      dates.forEach(d => {
        if (d >= slot.startDate && d <= slot.endDate) {
          if (!assignmentMap[slot.machineId]) assignmentMap[slot.machineId] = {};
          if (!assignmentMap[slot.machineId][d]) assignmentMap[slot.machineId][d] = [];
          assignmentMap[slot.machineId][d].push({
            joNo: jo.joNo, process: slot.process,
            itemName: jo.itemName || jo.product || "—",
            clientName: jo.clientName || "—",
            qty: slot.stageQty, actualQty: slot.actualQty || "",
            actualNotes: slot.actualNotes || "",
            color: joColorMap[jo.joNo], isActualDone, isLate,
            plannedStart: slot.startDate, plannedEnd: slot.endDate,
            actualStart: slot.actualStart || "", actualEnd: slot.actualEnd || "",
          });
        }
      });
    });
  });

  const filteredMachines = machineMaster.filter(m => filterType === "All" || m.type === filterType);

  const monthLabel = (() => {
    if (calMode === "week") {
      const first = dates[0], last = dates[dates.length-1];
      return `${new Date(first+"T00:00:00").toLocaleString("default",{month:"short",day:"numeric"})} – ${new Date(last+"T00:00:00").toLocaleString("default",{month:"short",day:"numeric",year:"numeric"})}`;
    }
    return new Date(anchor+"T00:00:00").toLocaleString("default",{month:"long",year:"numeric"});
  })();

  const cellW = calMode === "week" ? 110 : 34;

  const formatDateLabel = (d) => {
    const dt = new Date(d+"T00:00:00");
    if (calMode === "week") return (
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase" }}>{dt.toLocaleString("default",{weekday:"short"})}</div>
        <div style={{ fontSize:12, fontWeight:d===todayStr?800:600, color:d===todayStr?C.accent:C.text, background:d===todayStr?C.accent+"22":"transparent", borderRadius:4, padding:"1px 4px" }}>{dt.getDate()}</div>
      </div>
    );
    return <div style={{ textAlign:"center", fontSize:11, fontWeight:d===todayStr?800:400, color:d===todayStr?C.accent:dt.getDay()===0?C.red:C.muted }}>{dt.getDate()}</div>;
  };

  
  const EditPanel = () => {
    if (!editSlot) return null;
    const jo = editSlot.jo;
    const col = PROCESS_COLORS[editSlot.process] || C.accent;
    const joColor = joColorMap[editSlot.joNo];
    const isActualDone = !!editFields.actualEnd;
    const isLate = editFields.endDate && editFields.endDate < todayStr && !isActualDone;
    const variance = editFields.actualQty && editFields.stageQty
      ? +editFields.actualQty - +editFields.stageQty : null;

    return (
      <div style={{ position:"fixed", top:0, right:0, width:420, height:"100vh", background:C.card, borderLeft:`1px solid ${C.border}`, boxShadow:"-8px 0 32px #0008", zIndex:10000, display:"flex", flexDirection:"column", animation:"fadeIn .2s ease" }}>
        {}
        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, color:joColor, fontSize:15 }}>{editSlot.joNo}</span>
              <Badge label={editSlot.process} color={col} />
              {isLate && <Badge label="Overdue" color={C.red} />}
              {isActualDone && <Badge label="✓ Done" color={C.green} />}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{jo.itemName || jo.product || "—"}</div>
            <div style={{ fontSize:11, color:C.muted }}>{jo.clientName} · {jo.soRef || "—"}</div>
          </div>
          <button onClick={() => setEditSlot(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer", padding:"0 4px" }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
          {}
          <div style={{ marginBottom:20, padding:"12px 14px", background:C.surface, borderRadius:8, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Planned Schedule</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[["Machine", editFields.machineName], ["Planned Qty", fmt(editFields.stageQty)],
                ["Start Date", editFields.startDate], ["End Date", editFields.endDate],
                ["Days Needed", editFields.daysNeeded + " day(s)"],
                ["Daily Output", editFields.dailyOutput ? fmt(editFields.dailyOutput) : "—"]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:1, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
              <span>✏️ Actual Production</span>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Actual Start Date</label>
                <DatePicker value={editFields.actualStart} onChange={v => setEF("actualStart", v)} />
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Actual End Date</label>
                <DatePicker value={editFields.actualEnd} onChange={v => setEF("actualEnd", v)} />
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Actual Qty Produced</label>
                <input type="number" placeholder={`Target: ${fmt(editFields.stageQty)}`} value={editFields.actualQty} onChange={e => setEF("actualQty", e.target.value)} style={{ fontSize:13 }} />
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>Notes / Reason for Delay</label>
                <textarea placeholder="e.g. Machine breakdown, material shortage..." value={editFields.actualNotes} onChange={e => setEF("actualNotes", e.target.value)} style={{ fontSize:12, minHeight:70, resize:"vertical" }} />
              </div>
            </div>

            {}
            {variance !== null && (
              <div style={{ marginTop:14, padding:"10px 14px", borderRadius:8, background: variance >= 0 ? C.green+"18" : C.red+"18", border:`1px solid ${variance>=0?C.green:C.red}44` }}>
                <div style={{ fontSize:12, fontWeight:700, color: variance>=0 ? C.green : C.red }}>
                  {variance >= 0 ? `✓ Target met — ${fmt(variance)} extra produced` : `⚠ Short by ${fmt(Math.abs(variance))} units`}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                  Planned: {fmt(editFields.stageQty)} · Actual: {fmt(+editFields.actualQty)}
                </div>
              </div>
            )}

            {}
            {editFields.actualEnd && editFields.endDate && (
              <div style={{ marginTop:10, padding:"8px 14px", borderRadius:8, background: editFields.actualEnd <= editFields.endDate ? C.green+"18" : C.yellow+"18", border:`1px solid ${editFields.actualEnd<=editFields.endDate?C.green:C.yellow}44` }}>
                <div style={{ fontSize:11, fontWeight:700, color: editFields.actualEnd <= editFields.endDate ? C.green : C.yellow }}>
                  {editFields.actualEnd <= editFields.endDate
                    ? "✓ Completed on or before planned date"
                    : `⚠ Completed ${Math.ceil((new Date(editFields.actualEnd+"T00:00:00") - new Date(editFields.endDate+"T00:00:00")) / 86400000)} day(s) late`}
                </div>
              </div>
            )}
          </div>
        </div>

        {}
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10 }}>
          <button onClick={saveEdit} style={{ flex:1, background:C.green, color:"#fff", border:"none", borderRadius:8, padding:"10px 0", fontWeight:800, fontSize:14, cursor:"pointer" }}>
            Save Actual
          </button>
          <button onClick={() => setEditSlot(null)} style={{ background:C.surface, color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fade">
      <SectionTitle icon="📅" title="Production Calendar" sub="Machine-wise schedule — click any job to log actual production" />

      {}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          {[["machine","🏭 Machine View"],["date","📅 Date View"]].map(([v,l]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${viewMode===v?C.blue:C.border}`, background:viewMode===v?C.blue+"22":"transparent", color:viewMode===v?C.blue:C.muted, fontWeight:700, fontSize:12 }}>{l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["week","Week"],["month","Month"]].map(([v,l]) => (
            <button key={v} onClick={() => setCalMode(v)} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${calMode===v?C.yellow:C.border}`, background:calMode===v?C.yellow+"22":"transparent", color:calMode===v?C.yellow:C.muted, fontWeight:700, fontSize:12 }}>{l}</button>
          ))}
        </div>
        <button onClick={prev} style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"7px 14px", fontWeight:700, fontSize:13 }}>‹</button>
        <span style={{ fontWeight:700, fontSize:14, color:C.text, minWidth:220, textAlign:"center" }}>{monthLabel}</span>
        <button onClick={next} style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"7px 14px", fontWeight:700, fontSize:13 }}>›</button>
        <button onClick={() => setAnchor(today())} style={{ background:C.accent+"22", border:`1px solid ${C.accent}44`, color:C.accent, borderRadius:6, padding:"7px 14px", fontWeight:700, fontSize:12 }}>Today</button>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width:150 }}>
          <option value="All">All Machine Types</option>
          {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        {[["Job colour","On track",C.blue],["#22c55e","Done",C.green],["#ef4444","Overdue",C.red]].map(([_,label,col]) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.muted }}>
            <div style={{ width:10, height:10, borderRadius:2, background:col }} />{label}
          </div>
        ))}
        <span style={{ fontSize:11, color:C.muted, marginLeft:8 }}>· Click any job to log actual production</span>
        {jobOrders.filter(j => j.status !== "Cancelled" && (j.schedule||[]).length > 0).slice(0,8).map(j => (
          <div key={j.joNo} style={{ display:"flex", alignItems:"center", gap:4, background:joColorMap[j.joNo]+"22", border:`1px solid ${joColorMap[j.joNo]}44`, borderRadius:5, padding:"2px 8px" }}>
            <div style={{ width:7, height:7, borderRadius:1, background:joColorMap[j.joNo] }} />
            <span style={{ fontSize:10, fontWeight:700, color:joColorMap[j.joNo] }}>{j.joNo}</span>
          </div>
        ))}
      </div>

      {}
      {viewMode === "machine" && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", minWidth:"100%" }}>
            <thead>
              <tr>
                <th style={{ width:170, minWidth:170, padding:"8px 12px", textAlign:"left", background:C.surface, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, position:"sticky", left:0, zIndex:2 }}>Machine</th>
                {dates.map(d => (
                  <th key={d} style={{ width:cellW, minWidth:cellW, padding:"6px 4px", background:d===todayStr?C.accent+"18":C.surface, border:`1px solid ${C.border}`, borderBottom:d===todayStr?`2px solid ${C.accent}`:undefined }}>
                    {formatDateLabel(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map(m => {
                const col  = MACHINE_TYPE_COLORS[m.type] || C.muted;
                const icon = MACHINE_TYPE_ICONS[m.type]  || "⚙️";
                return (
                  <tr key={m.id}>
                    <td
                      onClick={() => setMachinePanel(m)}
                      style={{ padding:"6px 12px", background:C.card, border:`1px solid ${C.border}`, position:"sticky", left:0, zIndex:1, minWidth:170, cursor:"pointer", transition:"background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface}
                      onMouseLeave={e => e.currentTarget.style.background = C.card}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:13 }}>{icon}</span>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:m.status==="Inactive"?C.muted:C.text }}>{m.name}</div>
                          <div style={{ fontSize:9, color:col }}>{m.type}</div>
                        </div>
                        {m.status==="Inactive" && <span style={{ fontSize:8, color:C.red, background:C.red+"22", borderRadius:3, padding:"1px 4px", marginLeft:"auto" }}>OFF</span>}
                        <span style={{ fontSize:9, color:C.muted, marginLeft:"auto" }}>📋</span>
                      </div>
                    </td>
                    {dates.map(d => {
                      const jobs = (assignmentMap[m.id]||{})[d] || [];
                      const isSunday = new Date(d+"T00:00:00").getDay() === 0;
                      const isToday  = d === todayStr;
                      return (
                        <td key={d} style={{ padding:"2px", border:`1px solid ${C.border}`, background:isSunday?C.border+"33":isToday?C.accent+"08":"transparent", verticalAlign:"top" }}>
                          {jobs.length === 0 ? (
                            isSunday ? <div style={{ fontSize:8, color:C.red, textAlign:"center", padding:"3px 0" }}>OFF</div> : null
                          ) : (
                            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                              {jobs.map((job, i) => {
                                const cellColor = job.isActualDone ? C.green : job.isLate ? C.red : job.color;
                                return (
                                  <div key={i}
                                    onClick={() => openEdit(job.joNo, job.process)}
                                    style={{ background:cellColor+"33", border:`1px solid ${cellColor}66`, borderRadius:3, padding:calMode==="week"?"3px 5px":"2px", overflow:"hidden", cursor:"pointer", transition:"background .1s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = cellColor+"55"}
                                    onMouseLeave={e => e.currentTarget.style.background = cellColor+"33"}>
                                    {calMode === "week" ? (
                                      <>
                                        <div style={{ fontSize:10, fontWeight:700, color:cellColor, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                          {job.isActualDone?"✓ ":job.isLate?"⚠ ":""}{job.joNo}
                                        </div>
                                        <div style={{ fontSize:9, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{job.process}</div>
                                        <div style={{ fontSize:8, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{job.clientName}</div>
                                      </>
                                    ) : (
                                      <div style={{ width:6, height:6, background:cellColor, borderRadius:1 }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {}
      {viewMode === "date" && (
        <div>
          {dates.map(d => {
            const dt = new Date(d+"T00:00:00");
            const isSunday = dt.getDay() === 0;
            const isToday  = d === todayStr;
            const dayMachines = filteredMachines.filter(m => ((assignmentMap[m.id]||{})[d]||[]).length > 0);
            return (
              <div key={d} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ minWidth:72, padding:"6px 8px", borderRadius:8, background:isToday?C.accent+"22":isSunday?C.red+"18":C.surface, border:`1px solid ${isToday?C.accent+"55":C.border}`, textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase" }}>{dt.toLocaleString("default",{weekday:"short"})}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:isToday?C.accent:isSunday?C.red:C.text, lineHeight:1.1 }}>{dt.getDate()}</div>
                    <div style={{ fontSize:9, color:C.muted }}>{dt.toLocaleString("default",{month:"short"})}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    {isSunday ? (
                      <div style={{ padding:"10px 14px", color:C.red, fontSize:12, fontWeight:600 }}>Off Day</div>
                    ) : dayMachines.length === 0 ? (
                      <div style={{ padding:"10px 14px", color:C.border, fontSize:12 }}>No production scheduled</div>
                    ) : (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                        {dayMachines.map(m => {
                          const jobs = (assignmentMap[m.id]||{})[d] || [];
                          const col  = MACHINE_TYPE_COLORS[m.type] || C.muted;
                          return (
                            <div key={m.id} style={{ background:C.card, border:`1px solid ${col}44`, borderLeft:`3px solid ${col}`, borderRadius:8, padding:"10px 14px", minWidth:220 }}>
                              <div style={{ fontSize:11, fontWeight:700, color:col, marginBottom:8 }}>{MACHINE_TYPE_ICONS[m.type]} {m.name}</div>
                              {jobs.map((job, i) => {
                                const jc = job.isActualDone ? C.green : job.isLate ? C.red : job.color;
                                return (
                                  <div key={i}
                                    onClick={() => openEdit(job.joNo, job.process)}
                                    style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, padding:"6px 8px", background:jc+"18", border:`1px solid ${jc}33`, borderRadius:6, cursor:"pointer", transition:"background .1s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = jc+"33"}
                                    onMouseLeave={e => e.currentTarget.style.background = jc+"18"}>
                                    <div style={{ width:7, height:7, background:jc, borderRadius:2, flexShrink:0 }} />
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:11, fontWeight:700, color:jc }}>{job.isActualDone?"✓ ":job.isLate?"⚠ ":""}{job.joNo}</div>
                                      <div style={{ fontSize:10, color:C.muted }}>{job.process} · {job.clientName}</div>
                                      {job.actualQty && <div style={{ fontSize:10, color:jc }}>Actual: {fmt(+job.actualQty)} / {fmt(job.qty)}</div>}
                                    </div>
                                    <span style={{ fontSize:10, color:C.muted }}>✏️</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      {machinePanel && (() => {
        const m = machinePanel;
        const col = MACHINE_TYPE_COLORS[m.type] || C.muted;
        const icon = MACHINE_TYPE_ICONS[m.type] || "⚙️";
        const cap = +(m.capacity || 0);
        const hrs = +(m.workingHours || 8);
        const shifts = +(m.shiftsPerDay || 1);
        const dailyCap = cap * hrs * shifts;

        
        const jobsByDate = {};
        jobOrders.forEach(jo => {
          if (jo.status === "Cancelled") return;
          (jo.schedule || []).forEach(slot => {
            if (slot.machineId !== m.id || !slot.startDate || !slot.endDate) return;
            dates.forEach(d => {
              if (d >= slot.startDate && d <= slot.endDate) {
                if (new Date(d + "T00:00:00").getDay() === 0) return;
                if (!jobsByDate[d]) jobsByDate[d] = [];
                jobsByDate[d].push({ joNo: jo.joNo, process: slot.process, color: joColorMap[jo.joNo] });
              }
            });
          });
        });

        const workingDates = dates.filter(d => new Date(d + "T00:00:00").getDay() !== 0);
        const totalCap     = dailyCap * workingDates.length;
        const totalPlanned = workingDates.reduce((s, d) => s + (+((machineReportData[m.id + "_plan"] || {})[d] || 0)), 0);
        const totalActual  = workingDates.reduce((s, d) => s + (+((machineReportData[m.id] || {})[d] || 0)), 0);

        return (
          <div style={{ position:"fixed", top:0, right:0, width:640, height:"100vh", background:C.card, borderLeft:`1px solid ${C.border}`, boxShadow:"-8px 0 32px #0008", zIndex:10001, display:"flex", flexDirection:"column", animation:"fadeIn .2s ease" }}>
            {}
            <div style={{ padding:"18px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:20 }}>{icon}</span>
                  <span style={{ fontWeight:800, fontSize:16 }}>{m.name}</span>
                  <Badge label={m.type} color={col} />
                  <Badge label={m.status} color={m.status === "Active" ? C.green : C.red} />
                </div>
                <div style={{ fontSize:11, color:C.muted }}>
                  {dailyCap > 0
                    ? `Capacity: ${fmt(cap)} ${m.capacityUnit || "pcs/hr"} × ${hrs}h × ${shifts} shift${shifts > 1 ? "s" : ""} = ${fmt(dailyCap)} / day`
                    : "No capacity configured — set it in Machine Master"}
                </div>
              </div>
              <button onClick={() => setMachinePanel(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer", padding:"0 4px" }}>✕</button>
            </div>

            {}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0, borderBottom:`1px solid ${C.border}` }}>
              {[
                ["Total Capacity", dailyCap > 0 ? fmt(totalCap) : "—", C.blue],
                ["Total Planned",  totalPlanned > 0 ? fmt(totalPlanned) : "—", C.yellow],
                ["Total Actual",   totalActual  > 0 ? fmt(totalActual)  : "—", C.green],
              ].map(([label, val, c], i) => (
                <div key={label} style={{ padding:"12px 16px", borderRight: i < 2 ? `1px solid ${C.border}` : "none", textAlign:"center" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, fontSize:18, color: val === "—" ? C.border : c }}>{val}</div>
                  <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>

            {}
            <div style={{ flex:1, overflowY:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                  <tr style={{ background:C.surface }}>
                    <th style={{ padding:"9px 14px", textAlign:"left",  fontSize:10, color:C.muted,   fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${C.border}` }}>Date</th>
                    <th style={{ padding:"9px 14px", textAlign:"right", fontSize:10, color:C.blue,    fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${C.border}` }}>Capacity Qty</th>
                    <th style={{ padding:"9px 14px", textAlign:"right", fontSize:10, color:C.yellow,  fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${C.border}` }}>Planned Qty</th>
                    <th style={{ padding:"9px 14px", textAlign:"right", fontSize:10, color:C.green,   fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${C.border}` }}>Actual Qty</th>
                    <th style={{ padding:"9px 14px", textAlign:"left",  fontSize:10, color:C.purple,  fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${C.border}` }}>Operator Name</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map(d => {
                    const dt       = new Date(d + "T00:00:00");
                    const isSunday = dt.getDay() === 0;
                    const isToday  = d === todayStr;
                    const planVal  = (machineReportData[m.id + "_plan"] || {})[d] || "";
                    const actVal   = (machineReportData[m.id] || {})[d] || "";
                    const planQty  = planVal !== "" ? +planVal : null;
                    const actQty   = actVal  !== "" ? +actVal  : null;
                    const dayJobs  = jobsByDate[d] || [];
                    const isBehind = actQty !== null && planQty !== null && planQty > 0 && actQty < planQty;
                    const isOnTarget = actQty !== null && planQty !== null && planQty > 0 && actQty >= planQty;

                    return (
                      <tr key={d} style={{ borderBottom:`1px solid ${C.border}22`, background: isToday ? C.accent + "08" : isSunday ? C.border + "22" : "transparent" }}>

                        {}
                        <td style={{ padding:"8px 14px" }}>
                          <div style={{ fontSize:12, fontWeight: isToday ? 800 : 600, color: isToday ? C.accent : isSunday ? C.red : C.text }}>
                            {String(dt.getDate()).padStart(2,"0")}/{String(dt.getMonth()+1).padStart(2,"0")}/{String(dt.getFullYear()).slice(2)}
                          </div>
                          <div style={{ fontSize:9, color:C.muted }}>
                            {dt.toLocaleString("default", { weekday:"short" })}
                            {isToday ? " · Today" : ""}
                            {isSunday ? " · Off" : ""}
                          </div>
                          {}
                          {!isSunday && dayJobs.length > 0 && (
                            <div style={{ display:"flex", flexWrap:"wrap", gap:2, marginTop:3 }}>
                              {dayJobs.slice(0, 3).map((jb, ji) => (
                                <span key={ji} style={{ fontSize:8, fontWeight:700, color:jb.color, background:jb.color+"22", borderRadius:3, padding:"1px 4px" }}>
                                  {jb.joNo}
                                </span>
                              ))}
                              {dayJobs.length > 3 && <span style={{ fontSize:8, color:C.muted }}>+{dayJobs.length - 3}</span>}
                            </div>
                          )}
                        </td>

                        {}
                        <td style={{ padding:"8px 14px", textAlign:"right", verticalAlign:"middle" }}>
                          {isSunday ? (
                            <span style={{ fontSize:10, color:C.red }}>Off</span>
                          ) : (
                            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:13, color: dailyCap > 0 ? C.blue : C.border }}>
                              {dailyCap > 0 ? fmt(dailyCap) : "—"}
                            </span>
                          )}
                        </td>

                        {}
                        <td style={{ padding:"5px 14px", textAlign:"right", verticalAlign:"middle" }}>
                          {isSunday ? null : (
                            <input
                              type="number"
                              placeholder="—"
                              value={planVal}
                              onChange={e => saveActualDaily(m.id + "_plan", d, e.target.value)}
                              style={{ width:80, textAlign:"right", fontSize:12, fontFamily:"'JetBrains Mono',monospace", padding:"5px 8px", background: planVal ? C.yellow + "18" : C.inputBg, border:`1px solid ${planVal ? C.yellow + "66" : C.border}`, borderRadius:5, color: planVal ? C.yellow : C.muted, fontWeight: planVal ? 700 : 400 }}
                            />
                          )}
                        </td>

                        {}
                        <td style={{ padding:"5px 14px", textAlign:"right", verticalAlign:"middle" }}>
                          {isSunday ? null : (
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                              <input
                                type="number"
                                placeholder="—"
                                value={actVal}
                                onChange={e => saveActualDaily(m.id, d, e.target.value)}
                                style={{ width:80, textAlign:"right", fontSize:12, fontFamily:"'JetBrains Mono',monospace", padding:"5px 8px", background: actQty !== null ? (isBehind ? C.red + "18" : C.green + "18") : C.inputBg, border:`1px solid ${actQty !== null ? (isBehind ? C.red + "55" : C.green + "55") : C.border}`, borderRadius:5, color: actQty !== null ? (isBehind ? C.red : C.green) : C.muted, fontWeight: actQty !== null ? 700 : 400 }}
                              />
                              {isBehind    && <span style={{ fontSize:9, fontWeight:700, color:C.red   }}>▼ {fmt(planQty - actQty)} short</span>}
                              {isOnTarget  && <span style={{ fontSize:9, fontWeight:700, color:C.green }}>✓ on target</span>}
                            </div>
                          )}
                        </td>

                        {}
                        <td style={{ padding:"5px 14px", verticalAlign:"middle" }}>
                          {isSunday ? null : (
                            <input
                              type="text"
                              placeholder="—"
                              value={(machineReportData[m.id + "_op"] || {})[d] || ""}
                              onChange={e => saveActualDaily(m.id + "_op", d, e.target.value)}
                              style={{ width:120, fontSize:12, padding:"5px 8px", background: (machineReportData[m.id + "_op"] || {})[d] ? C.purple + "18" : C.inputBg, border:`1px solid ${(machineReportData[m.id + "_op"] || {})[d] ? C.purple + "55" : C.border}`, borderRadius:5, color: (machineReportData[m.id + "_op"] || {})[d] ? C.purple : C.muted, fontWeight: (machineReportData[m.id + "_op"] || {})[d] ? 600 : 400 }}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {}
            <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.muted }}>Capacity auto-filled · enter Planned and Actual manually</span>
              <button onClick={() => setMachinePanel(null)} style={{ background:C.surface, color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>Close</button>
            </div>
          </div>
        );
      })()}

      {}
      <EditPanel />
      {(editSlot || machinePanel) && (
        <div onClick={() => { setEditSlot(null); setMachinePanel(null); }} style={{ position:"fixed", inset:0, background:"#0006", zIndex:9999 }} />
      )}
    </div>
  );
}

const TABS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "search", icon: "🔍", label: "Global Search" },
  { id: "purchase", icon: "🛒", label: "Purchase Orders" },
  { id: "inward", icon: "🚚", label: "Material Inward" },
  { id: "sales", icon: "🧾", label: "Sales Orders" },
  { id: "jobs", icon: "⚙️", label: "Job Orders" },
  { id: "production", icon: "🔧", label: "Production" },
  { id: "printingmaster", icon: "🖨️", label: "Printing Detail Master" },
  { id: "calendar", icon: "📅", label: "Production Calendar" },
  { id: "dispatch", icon: "🚛", label: "Dispatch" },
  { id: "rawstock", icon: "📦", label: "RM Stock" },
  { id: "fg", icon: "🏭", label: "FG Stock" },
  { id: "consumablestock", icon: "🗂️", label: "Consumable Stock" },
  { id: "vendormaster", icon: "🏪", label: "Vendor Master" },
  { id: "clientmaster", icon: "👥", label: "Client Master" },
  { id: "sizemaster", icon: "📐", label: "Category Master" },
  { id: "itemmaster", icon: "📋", label: "Item Master" },
  { id: "machinemaster", icon: "🏗️", label: "Machine Master" },
];


const SEED_VERSION = "v13"; 


const TRANSACTION_KEYS = [
  "erp_purchaseOrders", "erp_dispatches", "erp_rawStock", "erp_inward",
  "erp_salesOrders", "erp_jobOrders", "erp_wipStock", "erp_fgStock",
  "erp_consumableStock", "erp_itemMasterFG", "erp_itemCounters",
  "erp_soCounter", "erp_joCounter", "erp_poCounter", "erp_grnCounter",
  "erp_dispatchCounter", "erp_machineReportData", "erp_consumableIssueLog",
  "erp_clear_inward_rmstock_v2",
];


(() => {
  const vk = "erp_txn_version";
  if (localStorage.getItem(vk) !== SEED_VERSION) {
    TRANSACTION_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(vk, SEED_VERSION);
  }
})();

function usePersistedState(key, defaultVal) {
  const [state, setState] = useState(() => {
    try {
      const versionKey = key + "_version";
      const stored = localStorage.getItem(key);
      const storedVersion = localStorage.getItem(versionKey);
      
      return stored ? JSON.parse(stored) : defaultVal;
    } catch { return defaultVal; }
  });
  const setPersisted = React.useCallback((val) => {
    setState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  
  }, [key]);
  return [state, setPersisted];
}



const DEFAULT_ROLES = {
  Admin: {
    label: "Admin",
    color: "#ef4444",
    tabs: ["dashboard","search","purchase","inward","sales","jobs","production","calendar","dispatch","rawstock","fg","consumablestock","vendormaster","clientmaster","sizemaster","itemmaster","machinemaster","users"],
  },
  Production: {
    label: "Production",
    color: "#f59e0b",
    tabs: ["dashboard","production","calendar","jobs"],
  },
  Store: {
    label: "Store",
    color: "#3b82f6",
    tabs: ["dashboard","inward","rawstock","fg","itemmaster","purchase"],
  },
  Sales: {
    label: "Sales",
    color: "#22c55e",
    tabs: ["dashboard","sales","dispatch","fg","clientmaster","search"],
  },
  Accounts: {
    label: "Accounts",
    color: "#a855f7",
    tabs: ["dashboard","purchase","sales","search","rawstock","fg"],
  },
};

const getAuth = () => {
  try { return JSON.parse(localStorage.getItem("erp_auth") || "{}"); } catch { return {}; }
};
const setAuth = (v) => localStorage.setItem("erp_auth", JSON.stringify(v));
const getUsers = () => {
  try {
    const u = JSON.parse(localStorage.getItem("erp_users") || "null");
    if (u) return u;
    
    const admin = [{ id: uid(), username: "admin", password: "admin123", role: "Admin", name: "Administrator", active: true }];
    localStorage.setItem("erp_users", JSON.stringify(admin));
    return admin;
  } catch { return []; }
};
const setUsers = (v) => localStorage.setItem("erp_users", JSON.stringify(v));
const getRoles = () => {
  try { return JSON.parse(localStorage.getItem("erp_roles") || "null") || DEFAULT_ROLES; } catch { return DEFAULT_ROLES; }
};
const setRoles = (v) => localStorage.setItem("erp_roles", JSON.stringify(v));


function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError("");
    if (!username.trim() || !password.trim()) { setError("Enter username and password."); return; }
    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password && u.active !== false);
      if (user) {
        setAuth({ userId: user.id, username: user.username, role: user.role, name: user.name });
        onLogin({ userId: user.id, username: user.username, role: user.role, name: user.name });
      } else {
        setError("Invalid username or password.");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace" }}>
      <style>{STYLE}</style>
      <div style={{ width: 380, background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "40px 36px", boxShadow: "0 24px 80px #0008" }}>
        {}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>ManufactureIQ</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: C.text }}>ERP System</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Aaray Packaging Pvt. Ltd.</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Username</label>
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter username"
            autoFocus
            style={{ fontSize: 14, padding: "10px 14px", width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter password"
            style={{ fontSize: 14, padding: "10px 14px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {error && <div style={{ background: C.red + "22", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>⚠ {error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.border }}>
          Contact Admin to reset your password
        </div>
      </div>
    </div>
  );
}


function UserManagement({ currentUser, toast }) {
  const [users, setUsersState] = useState(getUsers);
  const [view, setView] = useState("users"); 
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const ALL_TABS = [...TABS, { id: "users", icon: "👥", label: "User Management" }];
  const ALL_TAB_IDS = ALL_TABS.map(t => t.id);

  const blankUser = () => ({ username: "", password: "", name: "", role: "", tabs: [], editableTabs: [] });

  const [newUser, setNewUser] = useState(blankUser());

  const saveUsers = (u) => { setUsersState(u); setUsers(u); };

  const toggleTab = (obj, setObj, tabId) => {
    const cur = obj.tabs || [];
    const updated = cur.includes(tabId) ? cur.filter(x => x !== tabId) : [...cur, tabId];
    
    const newEditableTabs = updated.includes(tabId)
      ? (obj.editableTabs || [])
      : (obj.editableTabs || []).filter(x => x !== tabId);
    setObj(p => ({ ...p, tabs: updated, editableTabs: newEditableTabs }));
  };

  const toggleEditTab = (obj, setObj, tabId) => {
    const cur = obj.editableTabs || [];
    const updated = cur.includes(tabId) ? cur.filter(x => x !== tabId) : [...cur, tabId];
    setObj(p => ({ ...p, editableTabs: updated }));
  };

  const selectAll = (obj, setObj) => setObj(p => ({ ...p, tabs: ALL_TAB_IDS, editableTabs: ALL_TAB_IDS }));
  const clearAll  = (obj, setObj) => setObj(p => ({ ...p, tabs: [], editableTabs: [] }));

  const addUser = () => {
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.name.trim()) { toast("Fill name, username and password", "error"); return; }
    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) { toast("Username already exists", "error"); return; }
    saveUsers([...users, { id: uid(), ...newUser, active: true }]);
    setNewUser(blankUser());
    setShowAdd(false);
    toast("User created");
  };

  const toggleActive = (id) => {
    if (users.find(u => u.id === id)?.username === "admin") { toast("Cannot deactivate admin", "error"); return; }
    saveUsers(users.map(u => u.id === id ? { ...u, active: !u.active } : u));
    toast("User updated");
  };

  const deleteUser = (id) => {
    if (users.find(u => u.id === id)?.username === "admin") { toast("Cannot delete admin", "error"); return; }
    saveUsers(users.filter(u => u.id !== id));
    toast("User deleted");
  };

  const saveUserEdit = () => {
    saveUsers(users.map(u => u.id === editUser.id ? { ...u, ...editUser } : u));
    setEditUser(null);
    toast("User updated");
  };

  
  const ModuleGrid = ({ obj, setObj, isAdmin }) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Module Access & Edit Rights</span>
        {!isAdmin && <>
          <button onClick={() => selectAll(obj, setObj)} style={{ fontSize: 10, padding: "2px 8px", background: C.green + "22", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 4, cursor: "pointer", fontWeight: 700 }}>All Access</button>
          <button onClick={() => clearAll(obj, setObj)} style={{ fontSize: 10, padding: "2px 8px", background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 4, cursor: "pointer", fontWeight: 700 }}>None</button>
        </>}
      </div>
      {isAdmin ? (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Admin has full access and edit rights to all modules.</div>
      ) : (
        <>
          {}
          <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 11, color: C.muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${C.accent}`, display: "inline-block" }} /> View — can see module &amp; create new entries
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${C.yellow}`, display: "inline-block" }} /> Edit — can modify existing records
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {ALL_TABS.map(t => {
              const hasView = (obj.tabs || []).includes(t.id);
              const hasEdit = (obj.editableTabs || []).includes(t.id);
              return (
                <div key={t.id} style={{
                  borderRadius: 8, border: `1px solid ${hasView ? C.accent + "55" : C.border}`,
                  background: hasView ? C.accent + "0a" : C.surface,
                  overflow: "hidden", transition: "all .15s"
                }}>
                  {}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer" }}>
                    <input type="checkbox" checked={hasView} onChange={() => toggleTab(obj, setObj, t.id)}
                      style={{ accentColor: C.accent, width: 14, height: 14, flexShrink: 0 }} />
                    <span style={{ fontSize: 15 }}>{t.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: hasView ? 700 : 400, color: hasView ? C.accent : C.muted, flex: 1 }}>{t.label}</span>
                    {hasView && <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, background: C.accent + "18", borderRadius: 3, padding: "1px 6px" }}>VIEW</span>}
                  </label>
                  {}
                  {hasView && (
                    <label style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 8px 32px",
                      cursor: "pointer", borderTop: `1px solid ${C.border}`,
                      background: hasEdit ? C.yellow + "0d" : "transparent"
                    }}>
                      <input type="checkbox" checked={hasEdit} onChange={() => toggleEditTab(obj, setObj, t.id)}
                        style={{ accentColor: C.yellow, width: 13, height: 13, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: hasEdit ? C.yellow : C.muted, fontWeight: hasEdit ? 700 : 400, flex: 1 }}>
                        ✏️ Allow editing existing records
                      </span>
                      {hasEdit && <span style={{ fontSize: 10, color: C.yellow, fontWeight: 700, background: C.yellow + "22", borderRadius: 3, padding: "1px 6px" }}>EDIT</span>}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fade">
      <SectionTitle icon="👥" title="User Management" sub="Add users and assign exactly which modules they can access" />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => { setShowAdd(true); setNewUser(blankUser()); }} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add User</button>
      </div>

      {}
      {showAdd && (
        <Card style={{ marginBottom: 20, borderLeft: `3px solid ${C.accent}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>New User</div>

          {}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[["Full Name","name","text","e.g. Ravi Kumar"],["Username","username","text","e.g. ravi"],["Password","password","password","Min 6 chars"],["Role / Title","role","text","e.g. Store Manager (optional)"]].map(([lbl,k,type,ph]) => (
              <div key={k}>
                <label style={{ display:"block", fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>{lbl}</label>
                <input type={type} value={newUser[k]} onChange={e => setNewUser(p => ({...p,[k]:e.target.value}))} placeholder={ph} style={{ fontSize:13 }} />
              </div>
            ))}
          </div>

          {}
          <div style={{ padding: "16px", background: C.surface, borderRadius: 8, marginBottom: 16 }}>
            <ModuleGrid obj={newUser} setObj={setNewUser} isAdmin={false} />
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addUser} style={{ background:C.green, color:"#fff", border:"none", borderRadius:6, padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>✓ Create User</button>
            <button onClick={() => setShowAdd(false)} style={{ background:C.surface, color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        </Card>
      )}

      {}
      {users.map(u => {
        const isAdmin = u.username === "admin";
        const isEditing = editUser?.id === u.id;
        const tabCount = isAdmin ? ALL_TABS.length : (u.tabs || []).length;

        return (
          <Card key={u.id} style={{ marginBottom: 12, borderLeft: `3px solid ${u.active===false ? C.border : C.accent}`, opacity: u.active===false ? 0.6 : 1 }}>

            {}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isEditing ? 20 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accent + "22", border: `2px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: C.accent }}>
                  {(u.name || u.username)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name || u.username}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>@{u.username} {u.role ? `· ${u.role}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {isAdmin && <Badge label="Admin" color={C.red} />}
                  {u.active === false && <Badge label="Inactive" color={C.red} />}
                  <span style={{ fontSize: 11, color: C.muted, background: C.surface, borderRadius: 4, padding: "2px 8px", border: `1px solid ${C.border}` }}>
                    {tabCount} module{tabCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!isEditing && <>
                  <button onClick={() => setEditUser({ ...u, tabs: u.tabs || [] })} style={{ background:C.blue+"22", color:C.blue, border:`1px solid ${C.blue}44`, borderRadius:5, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Edit</button>
                  <button onClick={() => toggleActive(u.id)} style={{ background:C.yellow+"22", color:C.yellow, border:`1px solid ${C.yellow}44`, borderRadius:5, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    {u.active === false ? "Activate" : "Deactivate"}
                  </button>
                  {!isAdmin && <button onClick={() => deleteUser(u.id)} style={{ background:C.red+"22", color:C.red, border:`1px solid ${C.red}44`, borderRadius:5, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Delete</button>}
                </>}
              </div>
            </div>

            {}
            {isEditing && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
                  {[["Full Name","name","text"],["Username","username","text"],["New Password","password","password"],["Role / Title","role","text"]].map(([lbl,k,type]) => (
                    <div key={k}>
                      <label style={{ display:"block", fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>{lbl}{k==="password"?" (leave blank to keep)":""}</label>
                      <input type={type} value={editUser[k]||""} onChange={e => setEditUser(p => ({...p,[k]:e.target.value}))} style={{ fontSize:13 }} placeholder={k==="password"?"Leave blank to keep current":""} />
                    </div>
                  ))}
                </div>

                <div style={{ padding: "16px", background: C.surface, borderRadius: 8, marginBottom: 16 }}>
                  <ModuleGrid obj={editUser} setObj={setEditUser} isAdmin={isAdmin} />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveUserEdit} style={{ background:C.green, color:"#fff", border:"none", borderRadius:6, padding:"8px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>✓ Save Changes</button>
                  <button onClick={() => setEditUser(null)} style={{ background:C.surface, color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {}
            {!isEditing && !isAdmin && (u.tabs || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                {ALL_TABS.filter(t => (u.tabs || []).includes(t.id)).map(t => {
                  const canEd = (u.editableTabs || []).includes(t.id);
                  return (
                    <span key={t.id} style={{ fontSize: 10, padding: "2px 8px", background: C.accent + "18", color: C.accent, borderRadius: 4, border: `1px solid ${C.accent}33`, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {t.icon} {t.label}
                      {canEd && <span style={{ background: C.yellow + "33", color: C.yellow, borderRadius: 3, padding: "0px 4px", fontSize: 9, fontWeight: 800 }}>EDIT</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default function App() {
  
  const [session, setSession] = useState(() => {
    const auth = getAuth();
    if (!auth.userId) return null;
    
    const users = getUsers();
    const user = users.find(u => u.id === auth.userId && u.active !== false);
    return user ? auth : null;
  });

  const handleLogin = (auth) => setSession(auth);
  const handleLogout = () => { setAuth({}); setSession(null); };

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  
  const allTabIds = [...TABS.map(t => t.id), "users"];
  const userRecord = (() => { const users = getUsers(); return users.find(u => u.id === session.userId); })();
  const allowedTabs = session.username === "admin"
    ? allTabIds
    : (userRecord?.tabs?.length ? userRecord.tabs : allTabIds);
  
  const editableTabs = session.username === "admin" ? null : (userRecord?.editableTabs ?? null);

  return <AppInner session={session} onLogout={handleLogout} allowedTabs={allowedTabs} editableTabs={editableTabs} />;
}

function AppInner({ session, onLogout, allowedTabs, editableTabs }) {
  const roles = getRoles();
  const roleColor = roles[session.role]?.color || C.accent;
  const isAdmin = session.username === "admin";
  
  const canEdit = (tabId) => isAdmin || editableTabs === null || (editableTabs || []).includes(tabId);

  const [tab, setTab] = useState(() => {
    
    const first = allowedTabs[0] || "dashboard";
    return allowedTabs.includes("dashboard") ? "dashboard" : first;
  });
  const [soCounter, setSoCounter] = usePersistedState("erp_soCounter", 2026001);
  const [joCounter, setJoCounter] = usePersistedState("erp_joCounter", 20260001);
  const [poCounter, setPoCounter] = usePersistedState("erp_poCounter", 2026001);
  const [grnCounter, setGrnCounter] = usePersistedState("erp_grnCounter", 20260001);
  const [dispatchCounter, setDispatchCounter] = usePersistedState("erp_dispatchCounter", 2026001);
  const [purchaseOrders, setPurchaseOrders] = usePersistedState("erp_purchaseOrders", []);
  const [dispatches, setDispatches] = usePersistedState("erp_dispatches", []);
  const [rawStock, setRawStock] = usePersistedState("erp_rawStock", []);
  const [inward, setInward] = usePersistedState("erp_inward", []);
  const [salesOrders, setSalesOrders] = usePersistedState("erp_salesOrders", []);
  const [jobOrders, setJobOrders] = usePersistedState("erp_jobOrders", []);
  const [wipStock, setWipStock] = usePersistedState("erp_wipStock", []);
  const [fgStock, setFgStock] = usePersistedState("erp_fgStock", []);
  const [consumableStock, setConsumableStock] = usePersistedState("erp_consumableStock", []);
  const [sizeMaster, setSizeMaster] = usePersistedState("erp_sizeMaster", SEED_SIZE_MASTER);
  const [categoryMaster, setCategoryMaster] = usePersistedState("erp_categoryMaster", SEED_CATEGORY_MASTER);
  const [clientMaster, setClientMaster] = usePersistedState("erp_clientMaster", []);
  const [vendorMaster, setVendorMaster] = usePersistedState("erp_vendorMaster", []);
  const [printingMaster, setPrintingMaster] = usePersistedState("erp_printingMaster", []);
  const [machineMaster, setMachineMaster] = usePersistedState("erp_machineMaster", SEED_MACHINES.map(m => ({ id: uid(), name: m.name, type: m.type, status: "Active", capacity: "", capacityUnit: "pcs/hr", workingHours: 8, shiftsPerDay: 1, addedOn: today() })));
  const [machineReportData, setMachineReportData] = usePersistedState("erp_machineReportData", {});

  
  useEffect(() => {
    setMachineMaster(prev => {
      const existingTypes = prev.map(m => m.type.toLowerCase() + "|" + m.name.toLowerCase());
      const toAdd = SEED_MACHINES.filter(s => !existingTypes.includes(s.type.toLowerCase() + "|" + s.name.toLowerCase()));
      if (!toAdd.length) return prev;
      return [...prev, ...toAdd.map(m => ({ id: uid(), name: m.name, type: m.type, status: "Active", capacity: "", capacityUnit: "pcs/hr", workingHours: 8, shiftsPerDay: 1, addedOn: today() }))];
    });
  
  }, []);
  const [itemMasterFG, setItemMasterFG] = usePersistedState("erp_itemMasterFG", { "Raw Material": [], "Consumable": [], "Finished Goods": [], "Machine Spare": [] });
  const [itemCounters, setItemCounters] = usePersistedState("erp_itemCounters", { RM: 1, FG: 1, CG: 1, SP: 1 });

  
  useEffect(() => {
    const prefixMap = { RM: "Raw Material", FG: "Finished Goods", CG: "Consumable", SP: "Machine Spare" };
    const newCounters = { RM: 1, FG: 1, CG: 1, SP: 1 };
    Object.entries(prefixMap).forEach(([prefix, type]) => {
      const items = itemMasterFG[type] || [];
      items.forEach(it => {
        if (!it.code) return;
        const match = it.code.match(new RegExp("^" + prefix + "(\\d+)$"));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= newCounters[prefix]) newCounters[prefix] = num + 1;
        }
      });
    });
    setItemCounters(newCounters);
  }, [itemMasterFG]);


  

  
  useEffect(() => {
    if (!fgStock.length || !salesOrders.length || !jobOrders.length) return;
    const needsUpdate = fgStock.some(f => !f.price || f.price === 0);
    if (!needsUpdate) return;
    setFgStock(prev => prev.map(f => {
      if (f.price && f.price > 0) return f;
      
      const jo = jobOrders.find(j => j.joNo === f.joNo);
      if (!jo || !jo.soRef) return f;
      
      const so = salesOrders.find(s => s.soNo === jo.soRef);
      if (!so) return f;
      
      const itemName = f.itemName || f.product || "";
      const soItem = (so.items || []).find(it =>
        (it.itemName || "").toLowerCase() === itemName.toLowerCase()
      );
      if (!soItem || !soItem.price) return f;
      return { ...f, price: +soItem.price };
    }));
  }, [fgStock.length, salesOrders.length, jobOrders.length]);

  const [toastMsg, setToastMsg] = useState(null); 

  const toast = (msg, type = 'success') => setToastMsg({ msg, type });

  const data = { rawStock, inward, salesOrders, jobOrders, wipStock, fgStock, machineMaster, purchaseOrders, dispatches, itemMasterFG };

  const renderTab = () => {
    const props = { rawStock, setRawStock, inward, setInward, itemCounters, setItemCounters, salesOrders, setSalesOrders, jobOrders, setJobOrders, wipStock, setWipStock, fgStock, setFgStock, sizeMaster, setSizeMaster, categoryMaster, setCategoryMaster, clientMaster, setClientMaster, vendorMaster, setVendorMaster, itemMasterFG, setItemMasterFG, soCounter, setSoCounter, joCounter, setJoCounter, poCounter, setPoCounter, purchaseOrders, setPurchaseOrders, dispatches, setDispatches, toast };
    switch (tab) {
      case "dashboard": return <Dashboard data={data} onNavigate={setTab} machineReportData={machineReportData} setMachineReportData={setMachineReportData} />;
      case "search": return <GlobalSearch {...props} />;
      case "purchase": return <PurchaseOrders {...props} itemMasterFG={itemMasterFG} />;
      case "inward": return <MaterialInward {...props} itemCounters={itemCounters} setItemCounters={setItemCounters} grnCounter={grnCounter} setGrnCounter={setGrnCounter} consumableStock={consumableStock} setConsumableStock={setConsumableStock} />;
      case "sales": return <SalesOrders {...props} />;
      case "jobs": return <JobOrders {...props} sizeMaster={sizeMaster} rawStock={rawStock} setRawStock={setRawStock} machineMaster={machineMaster} printingMaster={printingMaster} setPrintingMaster={setPrintingMaster} />;
      case "production": return <ProductionUpdate {...props} salesOrders={salesOrders} />;
      case "calendar": return <ProductionCalendar jobOrders={jobOrders} setJobOrders={setJobOrders} machineMaster={machineMaster} machineReportData={machineReportData} setMachineReportData={setMachineReportData} />;
      case "dispatch": return <Dispatch {...props} itemMasterFG={itemMasterFG} dispatchCounter={dispatchCounter} setDispatchCounter={setDispatchCounter} />;
      case "rawstock": return <RawMaterialStock {...props} itemMasterFG={itemMasterFG} />;
      case "fg": return <FGStock {...props} itemMasterFG={itemMasterFG} setItemMasterFG={setItemMasterFG} salesOrders={salesOrders} />;
      case "consumablestock": return <ConsumableStock consumableStock={consumableStock} setConsumableStock={setConsumableStock} categoryMaster={categoryMaster} itemMasterFG={itemMasterFG} toast={toast} />;
      case "sizemaster": return <SizeMaster sizeMaster={sizeMaster} setSizeMaster={setSizeMaster} categoryMaster={categoryMaster} setCategoryMaster={setCategoryMaster} toast={toast} />;
      case "vendormaster": return <VendorMaster vendorMaster={vendorMaster} setVendorMaster={setVendorMaster} toast={toast} />;
      case "clientmaster": return <ClientMaster clientMaster={clientMaster} setClientMaster={setClientMaster} toast={toast} />;
      case "itemmaster": return <ItemMasterFG itemMasterFG={itemMasterFG} setItemMasterFG={setItemMasterFG} categoryMaster={categoryMaster} sizeMaster={sizeMaster} itemCounters={itemCounters} setItemCounters={setItemCounters} toast={toast} clientMaster={clientMaster} />;
      case "machinemaster": return <MachineMaster machineMaster={machineMaster} setMachineMaster={setMachineMaster} />;
      case "printingmaster": return <PrintingDetailMaster printingMaster={printingMaster} setPrintingMaster={setPrintingMaster} toast={toast} />;
      case "users": return <UserManagement currentUser={session} toast={toast} />;
    }
  };

  
  const visibleTabs = [...TABS, { id: "users", icon: "👥", label: "User Management" }]
    .filter(t => allowedTabs.includes(t.id));

  return (
    <AuthContext.Provider value={{ isAdmin, editableTabs, canEdit }}>
      <>
      <style>{STYLE}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {}
        <div style={{
          width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto"
        }}>
          <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>ManufactureIQ</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>ERP System</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Manufacturing Suite</div>
          </div>
          <nav style={{ flex: 1, padding: "10px 0" }}>
            {visibleTabs.map(t => {
              const isLowStock = t.id === "rawstock" && rawStock.some(s => s.qty < 50);
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 16px", border: "none",
                  background: tab === t.id ? C.accent + "22" : "transparent",
                  color: tab === t.id ? C.accent : C.muted,
                  borderLeft: `3px solid ${tab === t.id ? C.accent : "transparent"}`,
                  fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
                  textAlign: "left", transition: "all .15s", cursor: "pointer"
                }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {isLowStock && <span style={{ background: C.red, color: "#fff", borderRadius: 10, fontSize: 9, padding: "1px 5px", fontWeight: 800 }}>LOW</span>}
                </button>
              );
            })}
          </nav>

          {}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: roleColor + "22", border: `2px solid ${roleColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: roleColor, flexShrink: 0 }}>
                {(session.name || session.username)[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.name || session.username}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: roleColor }}>{session.role}</div>
              </div>
            </div>
            <button onClick={onLogout} style={{ width: "100%", background: C.red + "18", color: C.red, border: `1px solid ${C.red}33`, borderRadius: 6, padding: "7px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              ⎋ Sign Out
            </button>
          </div>
        </div>

        {}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
          {renderTab()}
        </div>
      </div>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </>
    </AuthContext.Provider>
  );
}
