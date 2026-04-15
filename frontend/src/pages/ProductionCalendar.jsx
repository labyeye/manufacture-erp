import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";
import { Card, SectionTitle, Badge } from "../components/ui/BasicComponents";


const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - d.getDay()); 
  return d.toISOString().split("T")[0];
}

function getMonthStart(dateStr) {
  return dateStr.slice(0, 8) + "01";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateRange(startStr, days) {
  const s = new Date(startStr);
  const e = new Date(startStr);
  e.setDate(e.getDate() + days - 1);
  return `${e.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

function formatMonthRange(startStr) {
  const d = new Date(startStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}


const DEFAULT_MACHINES = [
  { id: "M1", name: "SBBM 360 Machine 1", type: "Bag Making" },
  { id: "M2", name: "SBBM 360 Machine 2", type: "Bag Making" },
  { id: "M3", name: "Flexo Printing Machine", type: "Printing" },
  { id: "M4", name: "Sheet Cutting Machine", type: "Cutting" },
  { id: "M5", name: "Handmade", type: "Handmade" },
  { id: "M6", name: "Komori 28x40inch Machine", type: "Printing" },
  { id: "M7", name: "Akiyama 19x26inch Machine", type: "Printing" },
  { id: "M8", name: "Manual Die Cutting Machine 1", type: "Die Cutting" },
  { id: "M9", name: "Manual Die Cutting Machine 2", type: "Die Cutting" },
  { id: "M10", name: "Half Cutting Machine", type: "Die Cutting" },
  { id: "M11", name: "Automatic Die Cutting", type: "Die Cutting" },
  { id: "M12", name: "Lamination Machine", type: "Lamination" },
  { id: "M13", name: "Pasting Machine", type: "Pasting" },
];

const MACHINE_ICON = {
  "Bag Making": "🖨️",
  Printing: "🖨️",
  Cutting: "✂️",
  "Die Cutting": "✂️",
  Handmade: "👐",
  Lamination: "📄",
  Pasting: "🗂️",
  Formation: "📦",
};

const TYPE_COLOR = {
  "Bag Making": "#f97316",
  Printing: "#3b82f6",
  Cutting: "#a855f7",
  "Die Cutting": "#a855f7",
  Handmade: "#ec4899",
  Lamination: "#14b8a6",
  Pasting: "#eab308",
};


function jobColor(jo, today) {
  if (!jo) return null;
  if (jo.status === "Completed") return "#22c55e"; 
  const due = jo.deliveryDate || jo.joDate;
  if (due && due < today) return "#ef4444"; 
  return "#3b82f6"; 
}


export default function ProductionCalendar({
  jobOrders = [],
  salesOrders = [],
  machineMaster = {},
  refreshData,
  toast,
}) {
  const today = todayStr();
  const [mainView, setMainView] = useState("machine"); 
  const [rangeView, setRangeView] = useState("week"); 
  const [pivotDate, setPivotDate] = useState(getWeekStart(today));
  const [machineTypeFilter, setMachineTypeFilter] = useState("All Machine Types");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const machines = useMemo(() => {
    if (Array.isArray(machineMaster) && machineMaster.length > 0) {
      return machineMaster.map((m) => ({
        id: m._id || m.id || m.name,
        name: m.name,
        type: m.type,
        records: m.records || {},
        workingHours: m.workingHours,
        shiftsPerDay: m.shiftsPerDay,
      }));
    }
    return DEFAULT_MACHINES;
  }, [machineMaster]);

  const machineTypes = useMemo(() => {
    const types = [...new Set(machines.map((m) => m.type))];
    return ["All Machine Types", ...types];
  }, [machines]);

  const days = rangeView === "week" ? 7 : 30;
  const displayStart =
    rangeView === "week" ? getWeekStart(pivotDate) : getMonthStart(pivotDate);

  const daysArray = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(displayStart, i)),
    [displayStart, days],
  );

  const navigate = (dir) => {
    const step = rangeView === "week" ? 7 : 30;
    setPivotDate(addDays(pivotDate, dir * step));
  };

  const jobIndex = useMemo(() => {
    const idx = {};
    (jobOrders || []).forEach((jo) => {
      if (Array.isArray(jo.schedule) && jo.schedule.length > 0) {
        jo.schedule.forEach((slot) => {
          let date = slot.startDate || slot.date || jo.date || today;
          if (typeof date === "string") date = date.slice(0, 10);
          const mKey = slot.machineId || slot.machineName || "";
          if (!mKey) return;
          const key = `${mKey}|${date}`;
          if (!idx[key]) idx[key] = [];
          idx[key].push({ ...jo, currentSlot: slot });
        });
      } else {
        let date = jo.date || jo.jobcardDate || today;
        if (typeof date === "string") date = date.slice(0, 10);
        const machine = jo.machine || jo.assignedMachine || "";
        if (!machine) return;
        const key = `${machine}|${date}`;
        if (!idx[key]) idx[key] = [];
        idx[key].push(jo);
      }
    });
    return idx;
  }, [jobOrders, today]);

  const visibleMachines = useMemo(
    () =>
      machineTypeFilter === "All Machine Types"
        ? machines
        : machines.filter((m) => m.type === machineTypeFilter),
    [machines, machineTypeFilter],
  );

  const dateRangeLabel =
    rangeView === "week"
      ? formatDateRange(displayStart, 7)
      : formatMonthRange(displayStart);

  const colW = rangeView === "week" ? 110 : 36;

  
  const MachineSidePanel = () => {
    if (!selectedMachine) return null;

    const mId = selectedMachine.id || selectedMachine._id;
    const [editData, setEditData] = useState({ ...selectedMachine });
    const [localReport, setLocalReport] = useState(selectedMachine.records || {});
    const [showSuccess, setShowSuccess] = useState(false);

    const updateReport = (date, field, value) => {
      setLocalReport(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [field]: value
        }
      }));
    };

    const handleSave = async () => {
      try {
        setIsSaving(true);
        const payload = {
          name: editData.name,
          type: editData.type,
          workingHours: Number(editData.workingHours || 8),
          shiftsPerDay: Number(editData.shiftsPerDay || 1),
          records: localReport
        };
        await machineMasterAPI.update(mId, payload);
        
        setShowSuccess(true);
        if (refreshData) await refreshData();
        
        setTimeout(() => {
          setSelectedMachine(null);
          setShowSuccess(false);
        }, 1500);
      } catch (err) {
        toast?.("Failed to save records", "error");
      } finally {
        setIsSaving(false);
      }
    };

    
    const stats = daysArray.reduce((acc, date) => {
      const dayData = localReport[date] || {};
      acc.totalCap += Number(dayData.capacity || 0);
      acc.totalPlanned += Number(dayData.planned || 0);
      acc.totalActual += Number(dayData.actual || 0);
      return acc;
    }, { totalCap: 0, totalPlanned: 0, totalActual: 0 });

    return (
      <>
        {}
        <div
          onClick={() => setSelectedMachine(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000088",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
          }}
        />
        {}
        <div
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            width: 750, 
            height: "100vh",
            background: "#121212",
            borderLeft: `1px solid ${C.border}`,
            zIndex: 1001,
            boxShadow: "-20px 0 50px #000000aa",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            color: "#fff"
          }}
        >
          {showSuccess && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "#121212ee",
              zIndex: 2000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "inherit",
              animation: "fadeIn 0.4s ease-out"
            }}>
              <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes bounce { 
                  0%, 100% { transform: scale(1); } 
                  50% { transform: scale(1.2); } 
                }
              `}</style>
              <div style={{ fontSize: 64, animation: "bounce 0.8s ease-in-out" }}>✅</div>
              <h3 style={{ marginTop: 24, fontSize: 24, fontWeight: 900 }}>Record Saved!</h3>
              <p style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>Database updated successfully.</p>
            </div>
          )}
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 28, background: "#ffffff08", padding: 10, borderRadius: 12 }}>🏭</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#fff", fontWeight: 900, letterSpacing: "-0.01em" }}>{editData.name}</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                   <Badge text={editData.type} color={C.blue} />
                   <Badge text="Active" color={C.green} />
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedMachine(null)}
              style={{ background: "transparent", border: "none", color: C.muted, fontSize: 32, cursor: "pointer", padding: "0 10px" }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>
             No capacity configured — set it in Machine Master
          </div>

          {}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
             {[
               ["TOTAL CAPACITY", stats.totalCap, C.muted],
               ["TOTAL PLANNED", stats.totalPlanned, C.yellow],
               ["TOTAL ACTUAL", stats.totalActual, C.green]
             ].map(([label, val, color]) => (
               <div key={label} style={{ background: "#1a1a1a", padding: "16px", borderRadius: 12, textAlign: "center", border: `1px solid ${C.border}44` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, marginBottom: 6, letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: color }}>{val.toLocaleString()}</div>
               </div>
             ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 12, background: "#0a0a0a", boxShadow: "inset 0 2px 10px #000" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
               <thead style={{ position: "sticky", top: 0, background: "#1a1a1a", zIndex: 10, boxShadow: "0 2px 4px #00000044" }}>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{...thS, padding: "14px 16px"}}>DATE</th>
                    <th style={thS}>CAPACITY QTY</th>
                    <th style={{...thS, color: C.yellow}}>PLANNED QTY</th>
                    <th style={{...thS, color: C.green}}>ACTUAL QTY</th>
                    <th style={thS}>OPERATOR NAME</th>
                  </tr>
               </thead>
               <tbody>
                  {daysArray.map((date) => {
                    const row = localReport[date] || {};
                    const dateObj = new Date(date);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const dateFmt = date.split("-").reverse().join("/");
                    const dayName = DAYS[dateObj.getDay()];
                    
                    const pNum = Number(row.planned || 0);
                    const aNum = Number(row.actual || 0);
                    const isShort = pNum > 0 && aNum < pNum;
                    const isOnTarget = pNum > 0 && aNum >= pNum;
                    
                    return (
                      <tr key={date} style={{ borderBottom: "1px solid #ffffff05" }}>
                        <td style={{...tdS, padding: "14px 16px", color: isWeekend ? C.red : (date === today ? C.yellow : "#fff")}}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{dateFmt}</div>
                          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{dayName} {isWeekend && "- Off"} {date === today && "(Today)"}</div>
                        </td>
                        <td style={tdS}>
                          <input 
                            type="number" 
                            id={`${mId}-${date}-capacity`}
                            name={`${mId}-${date}-capacity`}
                            style={{...miniInp, background: "transparent"}} 
                            placeholder="-"
                            value={row.capacity || ""} 
                            onChange={(e) => updateReport(date, "capacity", e.target.value)}
                          />
                        </td>
                        <td style={tdS}>
                          <div style={{ position: "relative" }}>
                            <input 
                              type="number" 
                              id={`${mId}-${date}-planned`}
                              name={`${mId}-${date}-planned`}
                              style={{...miniInp, border: `1px solid ${C.yellow}33`, color: C.yellow, background: `${C.yellow}08`}} 
                              placeholder="-"
                              value={row.planned || ""} 
                              onChange={(e) => updateReport(date, "planned", e.target.value)}
                            />
                          </div>
                        </td>
                        <td style={tdS}>
                          <div style={{ position: "relative" }}>
                            <input 
                              type="number" 
                              id={`${mId}-${date}-actual`}
                              name={`${mId}-${date}-actual`}
                              style={{
                                ...miniInp, 
                                border: `1px solid ${isShort ? C.red : (isOnTarget ? C.green : C.border)}44`, 
                                color: isShort ? C.red : (isOnTarget ? C.green : "#fff"),
                                background: isShort ? `${C.red}11` : (isOnTarget ? `${C.green}11` : "transparent")
                              }} 
                              placeholder="-"
                              value={row.actual || ""} 
                              onChange={(e) => updateReport(date, "actual", e.target.value)}
                            />
                            {isShort && (
                              <div style={{ fontSize: 9, color: C.red, marginTop: 4, textAlign: "center", fontWeight: 700 }}>
                                 ▼ {(pNum - aNum).toLocaleString()} short
                              </div>
                            )}
                            {isOnTarget && (
                              <div style={{ fontSize: 9, color: C.green, marginTop: 4, textAlign: "center", fontWeight: 700 }}>
                                 ✓ on target
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={tdS}>
                          <input 
                            id={`${mId}-${date}-operator`}
                            name={`${mId}-${date}-operator`}
                            style={miniInp} 
                            placeholder="e.g. Operator"
                            value={row.operator || ""} 
                            onChange={(e) => updateReport(date, "operator", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
          </div>

          <div style={{ padding: "16px 0", fontSize: 11, color: C.muted, display: "flex", justifyContent: "space-between" }}>
             <span>Capacity auto-filled - enter Planned and Actual manually</span>
             <span style={{ fontWeight: 800 }}>{displayStart} — {daysArray[daysArray.length-1]}</span>
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <button 
              onClick={() => setSelectedMachine(null)}
              style={{ flex: 1, padding: "14px", borderRadius: 10, background: "#ffffff11", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#ffffff18"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff11"}
            >
              Close
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              style={{ 
                flex: 2, 
                padding: "14px", 
                borderRadius: 10, 
                background: C.blue, 
                border: "none", 
                color: "#fff", 
                fontWeight: 800, 
                cursor: "pointer", 
                boxShadow: `0 4px 15px ${C.blue}44`,
                opacity: isSaving ? 0.7 : 1 
              }}
            >
              {isSaving ? "Saving..." : "Save Planning Records"}
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="📅"
        title="Production Calendar"
        sub="Machine-wise schedule — click any job to log actual production"
      />

      <MachineSidePanel />

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setMainView("machine")}
          style={tabBtn(mainView === "machine", C.blue)}
        >
          🖨️ Machine View
        </button>
        <button
          onClick={() => setMainView("date")}
          style={tabBtn(mainView === "date", C.blue)}
        >
          📅 Date View
        </button>

        <div
          style={{
            display: "flex",
            borderRadius: 6,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
            marginLeft: 4,
          }}
        >
          {["week", "month"].map((rv) => (
            <button
              key={rv}
              onClick={() => setRangeView(rv)}
              style={{
                padding: "7px 16px",
                background:
                  rangeView === rv ? C.yellow || "#facc15" : "transparent",
                color: rangeView === rv ? "#000" : C.muted,
                fontWeight: 700,
                fontSize: 12,
                border: "none",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {rv.charAt(0).toUpperCase() + rv.slice(1)}
            </button>
          ))}
        </div>

        <button onClick={() => navigate(-1)} style={navBtn()}>
          ‹
        </button>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.text || "#e5e7eb",
            minWidth: 160,
            textAlign: "center",
          }}
        >
          {dateRangeLabel}
        </span>
        <button onClick={() => navigate(1)} style={navBtn()}>
          ›
        </button>

        <button
          onClick={() =>
            setPivotDate(
              rangeView === "week" ? getWeekStart(today) : getMonthStart(today),
            )
          }
          style={{
            padding: "7px 14px",
            borderRadius: 6,
            border: `1px solid ${C.orange || "#f97316"}`,
            background: "transparent",
            color: C.orange || "#f97316",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Today
        </button>

        <select
          value={machineTypeFilter}
          onChange={(e) => setMachineTypeFilter(e.target.value)}
          style={{
            marginLeft: "auto",
            padding: "7px 12px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.inputBg || C.surface,
            color: C.text || "#e5e7eb",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {machineTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 12,
          fontSize: 12,
        }}
      >
        {[
          ["#3b82f6", "On track"],
          ["#22c55e", "Done"],
          ["#ef4444", "Overdue"],
        ].map(([color, label]) => (
          <span
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: C.muted,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                display: "inline-block",
              }}
            />
            {label}
          </span>
        ))}
        <span style={{ color: C.muted, marginLeft: 8 }}>
          · Click any job to log actual production
        </span>
      </div>

      <div
        style={{
          overflowX: "auto",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: C.surface,
        }}
      >
        <table
          style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: C.muted,
                  background: C.surface,
                  borderBottom: `1px solid ${C.border}`,
                  borderRight: `1px solid ${C.border}`,
                  minWidth: 200,
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                }}
              >
                MACHINE
              </th>
              {daysArray.map((d) => {
                const dateObj = new Date(d);
                const dayName = DAYS[dateObj.getDay()];
                const dayNum = dateObj.getDate();
                const isToday = d === today;
                return (
                  <th
                    key={d}
                    style={{
                      padding: "8px 4px",
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: isToday ? C.orange || "#f97316" : C.muted,
                      background: isToday
                        ? (C.orange || "#f97316") + "11"
                        : C.surface,
                      borderBottom: `1px solid ${C.border}`,
                      borderRight: `1px solid ${C.border}22`,
                      minWidth: colW,
                      borderTop: isToday
                        ? `2px solid ${C.orange || "#f97316"}`
                        : "none",
                    }}
                  >
                    <div>{dayName}</div>
                    <div
                      style={{
                        fontSize: rangeView === "week" ? 15 : 12,
                        fontWeight: 900,
                        marginTop: 2,
                      }}
                    >
                      {dayNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleMachines.map((machine, mi) => {
              const typeColor = TYPE_COLOR[machine.type] || C.muted;
              const icon = MACHINE_ICON[machine.type] || "⚙️";
              return (
                <tr
                  key={machine.id}
                  style={{
                    background:
                      mi % 2 === 0 ? "transparent" : C.inputBg || "#ffffff08",
                  }}
                >
                  <td
                    onClick={() => {
                        
                        const fullMachine = Array.isArray(machineMaster) 
                            ? machineMaster.find(m => (m._id || m.id) === (machine.id || machine._id))
                            : machine;
                        setSelectedMachine({ ...machine, ...fullMachine });
                    }}
                    style={{
                      padding: "10px 16px",
                      borderBottom: `1px solid ${C.border}22`,
                      borderRight: `1px solid ${C.border}`,
                      verticalAlign: "middle",
                      background:
                        mi % 2 === 0 ? C.surface : C.inputBg || C.surface,
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#ffffff05"}
                    onMouseLeave={(e) => e.currentTarget.style.background = mi % 2 === 0 ? C.surface : C.inputBg || C.surface}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text || "#e5e7eb",
                            lineHeight: 1.2,
                          }}
                        >
                          {machine.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: typeColor,
                            marginTop: 2,
                          }}
                        >
                          {machine.type}
                        </div>
                      </div>
                      <span
                        style={{
                          marginLeft: "auto",
                          color: C.border,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        ⚙
                      </span>
                    </div>
                  </td>

                  {daysArray.map((d) => {
                    const key = `${machine.id}|${d}`;
                    const nameKey = `${machine.name}|${d}`;
                    const jobs = jobIndex[key] || jobIndex[nameKey] || [];
                    const isToday = d === today;
                    const isWeekend =
                      new Date(d).getDay() === 0 || new Date(d).getDay() === 6;

                    return (
                      <td
                        key={d}
                        style={{
                          padding: "6px 4px",
                          borderBottom: `1px solid ${C.border}22`,
                          borderRight: `1px solid ${C.border}22`,
                          verticalAlign: "top",
                          textAlign: "center",
                          background: isToday
                            ? (C.orange || "#f97316") + "08"
                            : isWeekend
                              ? "#ffffff04"
                              : "transparent",
                          minWidth: colW,
                        }}
                      >
                        {jobs.length === 0 ? (
                          <span
                            style={{
                              fontSize: 10,
                              color: C.red || "#ef4444",
                              opacity: 0.6,
                            }}
                          >
                            OFF
                          </span>
                        ) : (
                          jobs.map((jo) => {
                            const jc = jobColor(jo, today);
                            return (
                              <div
                                key={jo.joNo || jo.id}
                                onClick={() =>
                                  toast &&
                                  toast(
                                    `Job: ${jo.joNo} — ${jo.clientName || ""}`,
                                    "info",
                                  )
                                }
                                title={`${jo.joNo} · ${jo.clientName || ""} · ${jo.status || ""}`}
                                style={{
                                  fontSize: 10,
                                  padding: "3px 5px",
                                  background: jc + "22",
                                  border: `1px solid ${jc}44`,
                                  borderRadius: 4,
                                  color: jc,
                                  fontWeight: 700,
                                  marginBottom: 3,
                                  cursor: "pointer",
                                  wordBreak: "break-all",
                                  textAlign: "left",
                                }}
                              >
                                {jo.joNo} {jo.currentSlot?.process && `· ${jo.currentSlot.process}`}
                              </div>
                            );
                          })
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

      {mainView === "date" && (
        <Card style={{ marginTop: 16 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.muted,
              marginBottom: 14,
            }}
          >
            Upcoming Jobs
          </h3>
          {jobOrders.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, padding: 32 }}>
              No jobs scheduled.
            </div>
          )}
          {(jobOrders || [])
            .slice()
            .sort((a, b) =>
              (a.joDate || a.createdAt || "").localeCompare(
                b.joDate || b.createdAt || "",
              ),
            )
            .map((jo) => (
              <div
                key={jo.joNo || jo.id}
                style={{
                  borderBottom: `1px solid ${C.border}22`,
                  padding: "12px 4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: C.yellow || "#facc15",
                        fontWeight: 700,
                      }}
                    >
                      {jo.joNo}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {jo.clientName}
                    </span>
                    <Badge
                      text={jo.status || "Not Started"}
                      color={jo.status === "Completed" ? C.green : C.yellow}
                    />
                    <span style={{ fontSize: 12, color: C.muted }}>
                      {jo.itemName}
                    </span>
                  </div>
                  {jo.deliveryDate && (
                    <span style={{ fontSize: 12, color: C.muted }}>
                      📦 {jo.deliveryDate}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}

const modalInputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  background: "#1a1a1a",
  border: `1px solid ${C.border}`,
  color: "#fff",
  fontSize: 14,
  marginTop: 4,
  boxSizing: "border-box",
  outline: "none",
};

const thS = {
  textAlign: "left",
  padding: "10px 12px",
  color: "#666",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: "0.05em",
  textTransform: "uppercase"
};

const tdS = {
  padding: "10px 12px",
  verticalAlign: "top"
};

const miniInp = {
  width: "100%",
  padding: "8px 10px",
  background: "#111",
  border: `1px solid ${C.border}44`,
  borderRadius: 6,
  color: "#fff",
  fontSize: 12,
  outline: "none",
  textAlign: "center"
};


function tabBtn(active, color) {
  return {
    padding: "8px 18px",
    borderRadius: 6,
    border: `1px solid ${active ? color : "#ffffff22"}`,
    background: active ? color + "22" : "transparent",
    color: active ? color : "#9ca3af",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  };
}

function navBtn() {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #ffffff22",
    background: "transparent",
    color: "#9ca3af",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    lineHeight: 1,
  };
}
