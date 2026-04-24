import React, { useState, useMemo, useEffect } from "react";
import moment from "moment";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Badge,
  Modal,
} from "../components/ui/BasicComponents";
import { planningAPI } from "../api/auth";

const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const fmtHrs = (h) => {
  if (!h || h <= 0) return "0m";
  if (h < 1) return `${Math.round(h * 60)}m`;
  const rounded = parseFloat(h.toFixed(2));
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
};

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
  const [machineTypeFilter, setMachineTypeFilter] =
    useState("All Machine Types");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insightModal, setInsightModal] = useState(null);
  const [dragJob, setDragJob] = useState(null); 

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

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const data = await planningAPI.getCalendar({
        startDate: displayStart,
        endDate: daysArray[daysArray.length - 1],
      });
      setCalendarData(data);
    } catch (err) {
      toast?.("Failed to fetch calendar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const data = await planningAPI.generate();
      if (data.success) {
        toast?.(data.message, "success");
        fetchCalendar();
      }
    } catch (err) {
      toast?.("Failed to generate plan", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [displayStart, days]);

  const navigate = (dir) => {
    const step = rangeView === "week" ? 7 : 30;
    setPivotDate(addDays(pivotDate, dir * step));
  };

  const jobIndex = useMemo(() => {
    const idx = {};
    (calendarData || []).forEach((entry) => {
      if (!entry.machineId || !entry.date) return;

      const date = moment(entry.date).format("YYYY-MM-DD");

      
      const mIdRaw = entry.machineId._id || entry.machineId;
      const mId = typeof mIdRaw === "string" ? mIdRaw : mIdRaw?.toString();
      const mName = entry.machineId.name;

      const keys = new Set();
      if (mId) keys.add(`${mId}|${date}`);
      if (mName) keys.add(`${mName}|${date}`);

      keys.forEach((key) => {
        if (!idx[key]) idx[key] = [];
        
        if (!idx[key].some((existing) => existing._id === entry._id)) {
          idx[key].push(entry);
        }
      });
    });
    return idx;
  }, [calendarData]);

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

  const processStats = useMemo(() => {
    const categories =
      machineTypeFilter === "All Machine Types"
        ? machineTypes.filter((t) => t !== "All Machine Types")
        : [machineTypeFilter];

    return categories
      .map((cat) => {
        const filteredMachines = machines.filter((m) => m.type === cat);
        const filteredEntries = (calendarData || []).filter(
          (e) => e.process === cat,
        );

        const fullMachines = Array.isArray(machineMaster)
          ? machineMaster.filter((m) => m.type === cat)
          : [];

        const totalCapPerDay = fullMachines.reduce((sum, m) => {
          return (
            sum +
            (m.practicalRunRate || 0) *
              (m.standardShiftHours || 0) *
              (m.maxShiftsAllowed || 0)
          );
        }, 0);

        const totalScheduled = filteredEntries.reduce(
          (sum, e) => sum + e.scheduledQty,
          0,
        );
        const otHours = filteredEntries.reduce(
          (sum, e) => sum + (e.overtimeHours || 0),
          0,
        );
        const daysRequired =
          totalCapPerDay > 0 ? Math.ceil(totalScheduled / totalCapPerDay) : 0;

        return {
          category: cat,
          totalCapPerDay,
          totalScheduled,
          otHours,
          daysRequired,
          machineCount: filteredMachines.length,
        };
      })
      .filter((s) => s.totalScheduled > 0 || s.totalCapPerDay > 0);
  }, [machineTypeFilter, machineTypes, machines, calendarData, machineMaster]);

  const MachineSidePanel = () => {
    if (!selectedMachine) return null;

    const mId = selectedMachine.id || selectedMachine._id;
    const [editData, setEditData] = useState({ ...selectedMachine });
    const [localReport, setLocalReport] = useState(
      selectedMachine.records || {},
    );

    const updateReport = (date, field, value) => {
      setLocalReport((prev) => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [field]: value,
        },
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
          records: localReport,
        };
        await machineMasterAPI.update(mId, payload);

        toast?.("Records saved successfully", "success");
        if (refreshData) await refreshData();

        setTimeout(() => {
          setSelectedMachine(null);
        }, 1500);
      } catch (err) {
        toast?.("Failed to save records", "error");
      } finally {
        setIsSaving(false);
      }
    };

    const stats = daysArray.reduce(
      (acc, date) => {
        const dayData = localReport[date] || {};
        acc.totalCap += Number(dayData.capacity || 0);
        acc.totalPlanned += Number(dayData.planned || 0);
        acc.totalActual += Number(dayData.actual || 0);
        return acc;
      },
      { totalCap: 0, totalPlanned: 0, totalActual: 0 },
    );

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
            color: "#fff",
          }}
        >
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  fontSize: 28,
                  background: "#ffffff08",
                  padding: 10,
                  borderRadius: 12,
                }}
              >
                🏭
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 22,
                    color: "#fff",
                    fontWeight: 900,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {editData.name}
                </h2>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Badge text={editData.type} color={C.blue} />
                  <Badge text="Active" color={C.green} />
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedMachine(null)}
              style={{
                background: "transparent",
                border: "none",
                color: C.muted,
                fontSize: 32,
                cursor: "pointer",
                padding: "0 10px",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>
            No capacity configured — set it in Machine Master
          </div>

          {}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 28,
            }}
          >
            {[
              ["TOTAL CAPACITY", stats.totalCap, C.muted],
              ["TOTAL PLANNED", stats.totalPlanned, C.yellow],
              ["TOTAL ACTUAL", stats.totalActual, C.green],
            ].map(([label, val, color]) => (
              <div
                key={label}
                style={{
                  background: "#1a1a1a",
                  padding: "16px",
                  borderRadius: 12,
                  textAlign: "center",
                  border: `1px solid ${C.border}44`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: C.muted,
                    marginBottom: 6,
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: color }}>
                  {val.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: "#0a0a0a",
              boxShadow: "inset 0 2px 10px #000",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#1a1a1a",
                  zIndex: 10,
                  boxShadow: "0 2px 4px #00000044",
                }}
              >
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ ...thS, padding: "14px 16px" }}>DATE</th>
                  <th style={thS}>CAPACITY QTY</th>
                  <th style={{ ...thS, color: C.yellow }}>PLANNED QTY</th>
                  <th style={{ ...thS, color: C.green }}>ACTUAL QTY</th>
                  <th style={thS}>OPERATOR NAME</th>
                </tr>
              </thead>
              <tbody>
                {daysArray.map((date) => {
                  const row = localReport[date] || {};
                  const dateObj = new Date(date);
                  const isWeekend =
                    dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  const dateFmt = date.split("-").reverse().join("/");
                  const dayName = DAYS[dateObj.getDay()];

                  const pNum = Number(row.planned || 0);
                  const aNum = Number(row.actual || 0);
                  const isShort = pNum > 0 && aNum < pNum;
                  const isOnTarget = pNum > 0 && aNum >= pNum;

                  return (
                    <tr
                      key={date}
                      style={{ borderBottom: "1px solid #ffffff05" }}
                    >
                      <td
                        style={{
                          ...tdS,
                          padding: "14px 16px",
                          color: isWeekend
                            ? C.red
                            : date === today
                              ? C.yellow
                              : "#fff",
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 13 }}>
                          {dateFmt}
                        </div>
                        <div
                          style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}
                        >
                          {dayName} {isWeekend && "- Off"}{" "}
                          {date === today && "(Today)"}
                        </div>
                      </td>
                      <td style={tdS}>
                        <input
                          type="number"
                          id={`${mId}-${date}-capacity`}
                          name={`${mId}-${date}-capacity`}
                          style={{ ...miniInp, background: "transparent" }}
                          placeholder="-"
                          value={row.capacity || ""}
                          onChange={(e) =>
                            updateReport(date, "capacity", e.target.value)
                          }
                        />
                      </td>
                      <td style={tdS}>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            id={`${mId}-${date}-planned`}
                            name={`${mId}-${date}-planned`}
                            style={{
                              ...miniInp,
                              border: `1px solid ${C.yellow}33`,
                              color: C.yellow,
                              background: `${C.yellow}08`,
                            }}
                            placeholder="-"
                            value={row.planned || ""}
                            onChange={(e) =>
                              updateReport(date, "planned", e.target.value)
                            }
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
                              border: `1px solid ${isShort ? C.red : isOnTarget ? C.green : C.border}44`,
                              color: isShort
                                ? C.red
                                : isOnTarget
                                  ? C.green
                                  : "#fff",
                              background: isShort
                                ? `${C.red}11`
                                : isOnTarget
                                  ? `${C.green}11`
                                  : "transparent",
                            }}
                            placeholder="-"
                            value={row.actual || ""}
                            onChange={(e) =>
                              updateReport(date, "actual", e.target.value)
                            }
                          />
                          {isShort && (
                            <div
                              style={{
                                fontSize: 9,
                                color: C.red,
                                marginTop: 4,
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              ▼ {(pNum - aNum).toLocaleString()} short
                            </div>
                          )}
                          {isOnTarget && (
                            <div
                              style={{
                                fontSize: 9,
                                color: C.green,
                                marginTop: 4,
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
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
                          onChange={(e) =>
                            updateReport(date, "operator", e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: "16px 0",
              fontSize: 11,
              color: C.muted,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              Capacity auto-filled - enter Planned and Actual manually
            </span>
            <span style={{ fontWeight: 800 }}>
              {displayStart} — {daysArray[daysArray.length - 1]}
            </span>
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <button
              onClick={() => setSelectedMachine(null)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: 10,
                background: "#ffffff11",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#ffffff18")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#ffffff11")
              }
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
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving..." : "Save Planning Records"}
            </button>
          </div>
        </div>
      </>
    );
  };

  const JobInsightModal = () => {
    if (!insightModal) return null;
    const { entry, allEntries, totalQty, totalDays } = insightModal;
    const jo = entry.jobOrderId;
    const isOverdue =
      jo?.internalDueDate &&
      moment(entry.plannedEnd || entry.date).isAfter(jo.internalDueDate);
    const otEntries = allEntries.filter(
      (e) => e.isOvertime || e.shift === "OT",
    );
    const totalOTHours = otEntries.reduce(
      (sum, e) => sum + (e.scheduledHours || 0),
      0,
    );
    
    
    const getEntryTimes = (e) => {
      const m = e.machineId; 
      const setupT = e.shift === "Morning" ? (m?.setupTimeDefault ?? e.setupTime ?? 0.5) : 0;
      const cap = (m?.practicalRunRate || 0) * (m?.efficiencyFactor || 0.85);
      const runT = cap > 0 ? e.scheduledQty / cap : (e.runTime || 0);
      return { setupT, runT };
    };
    const totalSetupTime = allEntries.reduce((sum, e) => sum + getEntryTimes(e).setupT, 0);
    const totalRunTime = allEntries.reduce((sum, e) => sum + getEntryTimes(e).runT, 0);

    return (
      <Modal
        title={`🤖 Scheduling Insight: Job ${entry.jobCardNo}`}
        onClose={() => setInsightModal(null)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: 12,
              background: C.surface,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}
          >
            <h4 style={{ margin: "0 0 8px 0", color: C.text }}>Job Details</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span style={{ color: C.muted }}>Item:</span>{" "}
              <span style={{ color: C.text, fontWeight: 600 }}>
                {jo?.itemName || "Unknown"}
              </span>
              <span style={{ color: C.muted }}>Total Qty:</span>{" "}
              <span>{totalQty.toLocaleString()} units</span>
              <span style={{ color: C.muted }}>Process:</span>{" "}
              <span>{entry.process}</span>
              <span style={{ color: C.muted }}>Delivery Date:</span>{" "}
              <span>
                {jo?.deliveryDate
                  ? moment(jo.deliveryDate).format("DD MMM YYYY")
                  : "Not Set"}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: isOverdue ? C.red + "11" : C.green + "11",
              borderRadius: 8,
              border: `1px solid ${isOverdue ? C.red : C.green}33`,
            }}
          >
            <h4
              style={{
                margin: "0 0 8px 0",
                color: isOverdue ? C.red : C.green,
              }}
            >
              Planning Summary
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span style={{ color: C.muted }}>Total Days Required:</span>{" "}
              <span style={{ fontWeight: 700 }}>{totalDays} Days</span>
              <span style={{ color: C.muted }}>Planned End:</span>{" "}
              <span style={{ fontWeight: 700 }}>
                {moment(entry.plannedEnd || entry.date).format("DD MMM YYYY")}
              </span>
              <span style={{ color: C.muted }}>Status Check:</span>
              <span
                style={{ fontWeight: 700, color: isOverdue ? C.red : C.green }}
              >
                {isOverdue
                  ? "⚠️ Likely to be delayed"
                  : "✅ On track for delivery"}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: C.surface,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: C.text }}>Time Breakdown</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  padding: "10px 12px",
                  background: "#1e3a5f",
                  borderRadius: 6,
                  border: "1px solid #3b82f633",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: "#93c5fd", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                  ⚙ Total Setup
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#93c5fd" }}>
                  {fmtHrs(totalSetupTime)}
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  background: "#14532d",
                  borderRadius: 6,
                  border: "1px solid #22c55e33",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: "#86efac", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                  ▶ Total Run
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#86efac" }}>
                  {fmtHrs(totalRunTime)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {allEntries.map((e, i) => {
                const { setupT, runT } = getEntryTimes(e);
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 60px 1fr 1fr",
                      gap: 6,
                      fontSize: 11,
                      padding: "4px 0",
                      borderBottom: `1px solid ${C.border}22`,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: C.muted, fontSize: 10 }}>
                      {moment(e.date).format("DD MMM")}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: e.shift === "Morning" ? "#60a5fa" : e.shift === "OT" ? C.orange : "#c084fc",
                        background: e.shift === "Morning" ? "#1e3a5f" : e.shift === "OT" ? C.orange + "22" : "#4c1d9522",
                        padding: "1px 5px",
                        borderRadius: 3,
                        textAlign: "center",
                      }}
                    >
                      {e.shift}
                    </span>
                    <span style={{ color: "#93c5fd", fontSize: 11 }}>
                      ⚙ {fmtHrs(setupT)}
                    </span>
                    <span style={{ color: "#86efac", fontSize: 11 }}>
                      ▶ {fmtHrs(runT)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: totalOTHours > 0 ? C.orange + "11" : C.surface,
              borderRadius: 8,
              border: `1px solid ${totalOTHours > 0 ? C.orange : C.border}33`,
            }}
          >
            <h4
              style={{
                margin: "0 0 8px 0",
                color: totalOTHours > 0 ? C.orange : C.text,
              }}
            >
              Machine Allocation
            </h4>
            <div style={{ fontSize: 13 }}>
              <p style={{ margin: "0 0 4px 0" }}>
                Allocated to{" "}
                <strong>{entry.machineId?.name || "Selected Machine"}</strong>
              </p>
              {totalOTHours > 0 ? (
                <p style={{ margin: 0, color: C.orange }}>
                  Requires <strong>{totalOTHours.toFixed(1)} hrs</strong> of
                  Overtime to meet this schedule.
                </p>
              ) : (
                <p style={{ margin: 0, color: C.muted }}>
                  Fully schedulable within regular shifts. No overtime needed.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="📅"
        title="Production Calendar"
        sub="Machine-wise schedule — click any job to log actual production"
      >
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: C.accent || "#4CAF50",
            color: "#000",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          {loading ? "Planning..." : "⚡ Regenerate Rolling Plan"}
        </button>
      </SectionTitle>

      <MachineSidePanel />
      <JobInsightModal />

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
        <button
          onClick={() => setMainView("gantt")}
          style={tabBtn(mainView === "gantt", "#8b5cf6")}
        >
          📊 Gantt
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

      {}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
          marginBottom: 8,
          scrollbarWidth: "none",
        }}
      >
        {processStats.map((stat) => (
          <div
            key={stat.category}
            style={{
              minWidth: 240,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${TYPE_COLOR[stat.category] || C.blue}`,
              borderRadius: 8,
              padding: 12,
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: TYPE_COLOR[stat.category] || C.blue,
                  textTransform: "uppercase",
                }}
              >
                {MACHINE_ICON[stat.category] || "⚙️"} {stat.category}
              </span>
              <Badge text={`${stat.machineCount} Machines`} color="#ffffff11" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Daily Capacity
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>
                  {fmt(stat.totalCapPerDay)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Scheduled Qty
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.blue }}>
                  {fmt(stat.totalScheduled)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Est. Time
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: stat.daysRequired > 7 ? C.yellow : C.green,
                  }}
                >
                  {stat.daysRequired} Days
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    textTransform: "uppercase",
                  }}
                >
                  OT Required
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: stat.otHours > 0 ? C.red : C.muted,
                  }}
                >
                  {stat.otHours.toFixed(1)} hrs
                </div>
              </div>
            </div>

            {stat.totalCapPerDay > 0 && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 9,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: C.muted }}>Load Utilization</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>
                    {Math.round(
                      (stat.totalScheduled /
                        (stat.totalCapPerDay * stat.daysRequired || 1)) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#ffffff08",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (stat.totalScheduled / (stat.totalCapPerDay * stat.daysRequired || 1)) * 100)}%`,
                      background: TYPE_COLOR[stat.category] || C.blue,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {}

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
              const fullMachine = Array.isArray(machineMaster)
                ? machineMaster.find(
                    (m) => (m._id || m.id) === (machine.id || machine._id),
                  )
                : machine;
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
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#ffffff05")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        mi % 2 === 0 ? C.surface : C.inputBg || C.surface)
                    }
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
                          jobs.map((entry) => {
                            const jo = entry.jobOrderId;
                            const itemName = jo?.itemName || "Unknown Item";

                            
                            const statusColor =
                              entry.deliveryFeasible === "GREEN"
                                ? C.green
                                : entry.deliveryFeasible === "ORANGE"
                                  ? C.yellow
                                  : entry.deliveryFeasible === "RED"
                                    ? C.red
                                    : C.blue;

                            
                            const scheduledSoFar = (calendarData || [])
                              .filter(
                                (e) =>
                                  e.jobCardNo === entry.jobCardNo &&
                                  moment(e.date).isSameOrBefore(
                                    moment(entry.date),
                                  ),
                              )
                              .reduce((sum, e) => sum + e.scheduledQty, 0);

                            const progressPercent = Math.min(
                              100,
                              (scheduledSoFar / (jo?.orderQty || 1)) * 100,
                            );

                            const schedHrs = entry.scheduledHours || 0;
                            const shiftHrs = fullMachine?.standardShiftHours || 8;
                            const shiftsCount = Math.max(1, Math.ceil(schedHrs / shiftHrs));
                            const hasOT = entry.overtimeNeeded || entry.overtimeHours > 0;

                            
                            const cardSetupTime = entry.shift === "Morning"
                              ? (fullMachine?.setupTimeDefault ?? 0.5)
                              : 0;
                            
                            const capacityPerHour =
                              (fullMachine?.practicalRunRate || 0) *
                              (fullMachine?.efficiencyFactor || 0.85);
                            const cardRunTime = capacityPerHour > 0
                              ? entry.scheduledQty / capacityPerHour
                              : (entry.runTime || 0);

                            return (
                              <div
                                key={entry._id}
                                onClick={() => {
                                  const allEntries = (
                                    calendarData || []
                                  ).filter(
                                    (e) => e.jobCardNo === entry.jobCardNo,
                                  );
                                  const totalQty = allEntries.reduce(
                                    (sum, e) => sum + e.scheduledQty,
                                    0,
                                  );
                                  const totalDays = new Set(
                                    allEntries.map((e) =>
                                      moment(e.date).format("YYYY-MM-DD"),
                                    ),
                                  ).size;

                                  setInsightModal({
                                    entry,
                                    allEntries,
                                    totalQty,
                                    totalDays,
                                  });
                                }}
                                title={`${entry.jobCardNo} · ${itemName} · Target: ${entry.dailyTarget}`}
                                style={{
                                  fontSize: 10,
                                  padding: "10px",
                                  background: `${statusColor}08`,
                                  border: `1px solid ${statusColor}22`,
                                  borderLeft: `4px solid ${statusColor}`,
                                  borderRadius: "4px 8px 8px 4px",
                                  color: "#fff",
                                  fontWeight: 600,
                                  marginBottom: 8,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                  transition: "transform 0.1s",
                                  position: "relative",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.transform =
                                    "scale(1.02)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.transform = "scale(1)")
                                }
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 4,
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: statusColor,
                                    }}
                                  >
                                    {entry.jobCardNo}
                                  </span>
                                  {entry.overtimeNeeded && (
                                    <span
                                      style={{
                                        background: `${C.red}22`,
                                        color: C.red,
                                        padding: "1px 4px",
                                        borderRadius: 3,
                                        fontSize: 8,
                                        fontWeight: 900,
                                        border: `1px solid ${C.red}44`,
                                      }}
                                    >
                                      OT REQ
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#fff",
                                    marginBottom: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {itemName}
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 8,
                                        color: C.muted,
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      Daily Target
                                    </span>
                                    <span
                                      style={{ fontSize: 11, fontWeight: 700 }}
                                    >
                                      {entry.dailyTarget?.toLocaleString() ||
                                        entry.scheduledQty?.toLocaleString()}{" "}
                                      <span
                                        style={{ opacity: 0.5, fontSize: 9 }}
                                      >
                                        qty
                                      </span>
                                    </span>
                                  </div>

                                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                                    {shiftsCount > 1 ? (
                                      <span style={{ fontSize: 8, color: C.yellow, fontWeight: 700, background: `${C.yellow}22`, padding: '2px 4px', borderRadius: 3, border: `1px solid ${C.yellow}44` }}>
                                        {shiftsCount} SHIFTS
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 8, color: C.muted, fontWeight: 600, padding: '2px 4px' }}>
                                        1 SHIFT
                                      </span>
                                    )}
                                    {hasOT && (
                                      <span style={{ fontSize: 8, color: C.red, fontWeight: 700, background: `${C.red}22`, padding: '2px 4px', borderRadius: 3, border: `1px solid ${C.red}44` }}>
                                        + {entry.overtimeHours > 0 ? `${entry.overtimeHours}h ` : ''}OT
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: 6,
                                    padding: "4px 0",
                                    borderTop: `1px solid #ffffff11`,
                                  }}
                                >
                                  <span style={{ fontSize: 8, color: C.muted }}>
                                    ⚙ Setup
                                  </span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd" }}>
                                    {fmtHrs(cardSetupTime)}
                                  </span>
                                  <span style={{ fontSize: 8, color: C.muted }}>
                                    ▶ Run
                                  </span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#86efac" }}>
                                    {fmtHrs(cardRunTime)}
                                  </span>
                                </div>

                                <div style={{ marginTop: 6 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      fontSize: 8,
                                      marginBottom: 2,
                                      color: C.muted,
                                    }}
                                  >
                                    <span>Progress</span>
                                    <span>{Math.round(progressPercent)}%</span>
                                  </div>
                                  <div
                                    style={{
                                      height: 4,
                                      background: "#ffffff11",
                                      borderRadius: 2,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: "100%",
                                        width: `${progressPercent}%`,
                                        background: statusColor,
                                        transition: "width 0.3s ease",
                                      }}
                                    />
                                  </div>
                                </div>
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
                      {jo.companyName}
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

      {}
      {mainView === "gantt" && (() => {
        
        const machineCapMap = {};
        (Array.isArray(machineMaster) ? machineMaster : []).forEach((m) => {
          const cap = (m.practicalRunRate || 0) * (m.standardShiftHours || 8) * (m.maxShiftsAllowed || 1) * (m.efficiencyFactor || 0.85);
          machineCapMap[m._id] = cap;
          machineCapMap[m.name] = cap;
        });

        
        const ganttRows = visibleMachines.map((machine) => {
          const mId = machine.id;
          const mName = machine.name;
          const dailySlots = daysArray.map((date) => {
            const key1 = `${mId}|${date}`;
            const key2 = `${mName}|${date}`;
            const entries = [...(jobIndex[key1] || []), ...(jobIndex[key2] || [])];
            const uniqueEntries = entries.filter((e, i, arr) => arr.findIndex((x) => x._id === e._id) === i);
            const totalScheduled = uniqueEntries.reduce((s, e) => s + (e.scheduledQty || 0), 0);
            const cap = machineCapMap[mId] || machineCapMap[mName] || 0;
            const utilPct = cap > 0 ? Math.min(200, (totalScheduled / cap) * 100) : (totalScheduled > 0 ? 100 : 0);
            const isOverloaded = utilPct > 100;
            
            const hasRisk = uniqueEntries.some((e) => {
              const jo = e.jobOrderId;
              if (!jo?.deliveryDate) return false;
              const plannedEnd = e.plannedEnd || date;
              return moment(plannedEnd).isAfter(moment(jo.deliveryDate));
            });
            return { date, entries: uniqueEntries, totalScheduled, utilPct, isOverloaded, hasRisk, cap };
          });
          return { machine, dailySlots };
        });

        
        const riskJobs = (calendarData || []).filter((e) => {
          const jo = e.jobOrderId;
          if (!jo?.deliveryDate) return false;
          const plannedEnd = e.plannedEnd || e.date;
          return moment(plannedEnd).isAfter(moment(jo.deliveryDate));
        });
        const riskSet = new Set(riskJobs.map((e) => e.jobCardNo));

        const handleDragStart = (e, entry, machineId, date) => {
          setDragJob({ entry, sourceMachineId: machineId, sourceDate: date });
          e.dataTransfer.effectAllowed = "move";
        };

        const handleDrop = async (e, targetMachineId, targetDate) => {
          e.preventDefault();
          if (!dragJob) return;
          if (dragJob.sourceDate === targetDate && dragJob.sourceMachineId === targetMachineId) {
            setDragJob(null);
            return;
          }
          try {
            await planningAPI.planJob({
              entryId: dragJob.entry._id,
              machineId: targetMachineId,
              date: targetDate,
            });
            toast?.("Job rescheduled", "success");
            fetchCalendar();
          } catch {
            toast?.("Failed to reschedule — check capacity", "error");
          }
          setDragJob(null);
        };

        const colW = rangeView === "week" ? 110 : 36;

        return (
          <div style={{ marginTop: 16 }}>
            {}
            {riskSet.size > 0 && (
              <div style={{ background: "#ef444411", border: "1px solid #ef444433", borderRadius: 8, padding: "10px 16px", marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 12 }}>⚠️ DELIVERY RISK</span>
                {[...riskSet].slice(0, 6).map((jc) => (
                  <span key={jc} style={{ padding: "2px 8px", background: "#ef444422", borderRadius: 4, fontSize: 11, color: "#fca5a5", fontWeight: 700 }}>{jc}</span>
                ))}
                {riskSet.size > 6 && <span style={{ fontSize: 11, color: "#ef4444" }}>+{riskSet.size - 6} more</span>}
                <span style={{ fontSize: 11, color: "#999", marginLeft: "auto" }}>Planned end date exceeds delivery date — negotiate or expedite</span>
              </div>
            )}

            {}
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, fontSize: 11, color: "#888" }}>
              <span>Utilization:</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#22c55e66", display: "inline-block" }} />≤80%</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#f59e0b66", display: "inline-block" }} />81–100%</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#ef444466", display: "inline-block" }} />&gt;100% OVERLOAD</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#ef4444", display: "inline-block" }} />⚠ Delivery risk</span>
              <span style={{ marginLeft: "auto", color: "#555" }}>Drag jobs to reschedule</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ ...thS, width: 160, position: "sticky", left: 0, background: C.surface || "#111", zIndex: 2, borderRight: `1px solid ${C.border}22` }}>
                      Machine
                    </th>
                    {daysArray.map((date) => {
                      const d = new Date(date);
                      const isToday = date === today;
                      const dow = DAYS[d.getDay()];
                      return (
                        <th
                          key={date}
                          style={{
                            ...thS,
                            width: colW,
                            minWidth: colW,
                            textAlign: "center",
                            background: isToday ? "#3b82f611" : C.surface || "#111",
                            borderBottom: isToday ? "2px solid #3b82f6" : `1px solid ${C.border}22`,
                            color: isToday ? "#3b82f6" : "#666",
                            padding: "6px 4px",
                          }}
                        >
                          <div>{dow}</div>
                          <div style={{ fontSize: 9, color: "#555" }}>{date.slice(5)}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ganttRows.map(({ machine, dailySlots }) => (
                    <tr key={machine.id} style={{ borderBottom: `1px solid ${C.border}11` }}>
                      <td
                        style={{
                          ...tdS,
                          position: "sticky",
                          left: 0,
                          background: C.surface || "#111",
                          zIndex: 1,
                          borderRight: `1px solid ${C.border}22`,
                          minWidth: 160,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLOR[machine.type] || "#888" }}>
                          {MACHINE_ICON[machine.type] || "⚙️"} {machine.name}
                        </div>
                        <div style={{ fontSize: 9, color: "#555" }}>{machine.type}</div>
                      </td>
                      {dailySlots.map(({ date, entries, utilPct, isOverloaded, hasRisk, cap }) => {
                        const bgColor = hasRisk
                          ? "#ef444422"
                          : isOverloaded
                          ? "#ef444411"
                          : utilPct > 80
                          ? "#f59e0b11"
                          : utilPct > 0
                          ? "#22c55e0a"
                          : "transparent";
                        const borderColor = hasRisk
                          ? "#ef444444"
                          : isOverloaded
                          ? "#ef444433"
                          : utilPct > 80
                          ? "#f59e0b33"
                          : "transparent";
                        const barColor = hasRisk
                          ? "#ef4444"
                          : isOverloaded
                          ? "#ef4444"
                          : utilPct > 80
                          ? "#f59e0b"
                          : "#22c55e";
                        return (
                          <td
                            key={date}
                            style={{
                              padding: 3,
                              verticalAlign: "top",
                              background: bgColor,
                              border: `1px solid ${borderColor}`,
                              minWidth: colW,
                              width: colW,
                              cursor: dragJob ? "copy" : "default",
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, machine.id, date)}
                          >
                            {}
                            {utilPct > 0 && (
                              <div style={{ height: 4, borderRadius: 2, background: "#1a1a1a", marginBottom: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, utilPct)}%`, background: barColor, borderRadius: 2 }} />
                              </div>
                            )}
                            {}
                            {entries.slice(0, rangeView === "week" ? 4 : 2).map((entry, i) => {
                              const jo = entry.jobOrderId;
                              const isRisk = riskSet.has(entry.jobCardNo);
                              const priority = jo?.priority;
                              const chipColor = isRisk ? "#ef4444"
                                : priority === "VIP" ? "#ef4444"
                                : priority === "Rush" ? "#f97316"
                                : TYPE_COLOR[entry.process] || "#3b82f6";
                              return (
                                <div
                                  key={entry._id || i}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, entry, machine.id, date)}
                                  title={`${entry.jobCardNo} · ${entry.process} · ${(entry.scheduledQty || 0).toLocaleString()} units${isRisk ? " ⚠️ DELIVERY RISK" : ""}${priority && priority !== "Standard" ? ` · ${priority}` : ""}`}
                                  style={{
                                    background: chipColor + "22",
                                    border: `1px solid ${chipColor}55`,
                                    borderRadius: 3,
                                    padding: rangeView === "week" ? "3px 5px" : "1px 3px",
                                    fontSize: rangeView === "week" ? 10 : 8,
                                    color: chipColor,
                                    fontWeight: 700,
                                    cursor: "grab",
                                    marginBottom: 2,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  {isRisk && <span style={{ fontSize: 8 }}>⚠️</span>}
                                  {priority === "VIP" && <span style={{ fontSize: 8 }}>⭐</span>}
                                  {priority === "Rush" && <span style={{ fontSize: 8 }}>⚡</span>}
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {rangeView === "week" ? entry.jobCardNo : entry.jobCardNo?.slice(-4)}
                                  </span>
                                </div>
                              );
                            })}
                            {entries.length > (rangeView === "week" ? 4 : 2) && (
                              <div style={{ fontSize: 9, color: "#666", textAlign: "center" }}>
                                +{entries.length - (rangeView === "week" ? 4 : 2)}
                              </div>
                            )}
                            {}
                            {utilPct > 0 && rangeView === "week" && (
                              <div style={{ fontSize: 9, color: barColor, textAlign: "right", marginTop: 2 }}>
                                {utilPct.toFixed(0)}%
                              </div>
                            )}
                            {isOverloaded && (
                              <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 800, textAlign: "center" }}>
                                OVERLOAD
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            {(() => {
              const suggestions = [];
              visibleMachines.forEach((machine) => {
                const machineEntries = (calendarData || []).filter((e) => {
                  const mId = e.machineId?._id || e.machineId;
                  return mId === machine.id || e.machineId?.name === machine.name;
                });
                
                if (machine.type === "Printing") {
                  const colorGroups = {};
                  machineEntries.forEach((e) => {
                    const jo = e.jobOrderId;
                    const color = jo?.printing || "Unknown";
                    if (!colorGroups[color]) colorGroups[color] = [];
                    colorGroups[color].push(e);
                  });
                  Object.entries(colorGroups).forEach(([color, ents]) => {
                    const dates = [...new Set(ents.map((e) => moment(e.date).format("YYYY-MM-DD")))].sort();
                    if (dates.length > 1) {
                      const span = moment(dates[dates.length - 1]).diff(moment(dates[0]), "days");
                      if (span > 2) {
                        suggestions.push({
                          machine: machine.name,
                          color,
                          count: ents.length,
                          span,
                          saving: Math.round(ents.length * 0.35 * 30),
                        });
                      }
                    }
                  });
                }
              });
              if (!suggestions.length) return null;
              return (
                <div style={{ marginTop: 16, background: "#8b5cf611", border: "1px solid #8b5cf633", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 10, fontSize: 13 }}>
                    💡 Batching Opportunities — batch similar jobs to cut setup time 30–40%
                  </div>
                  {suggestions.slice(0, 5).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#ccc", padding: "6px 0", borderBottom: "1px solid #8b5cf622" }}>
                      <strong style={{ color: "#a78bfa" }}>{s.machine}</strong>
                      {" — "}
                      {s.count} jobs with <strong>{s.color}</strong>-color print spread over {s.span} days.
                      Consolidate to save ~{s.saving} min changeover.
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}
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
  textTransform: "uppercase",
};

const tdS = {
  padding: "10px 12px",
  verticalAlign: "top",
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
  textAlign: "center",
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
