import React, { useState, useMemo, useEffect, useCallback } from "react";
import { C } from "../constants/colors";
import { machineMaintenanceAPI, spareIssueLogAPI } from "../api/auth";


const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

const LS_INTERVALS = "pm_intervals";   
const LS_PARTS     = "spare_parts";    

const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };
const loadArr = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const inp = {
  padding: "9px 12px", border: "1px solid #2a2a2a", borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", background: "#141414",
  color: "#e0e0e0", outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl = {
  fontSize: 11, fontWeight: 600, color: "#666", display: "block",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em",
};

const INTERVALS = [
  { label: "Weekly",    days: 7  },
  { label: "Fortnightly", days: 14 },
  { label: "Monthly",  days: 30 },
  { label: "Quarterly",days: 90 },
  { label: "Half-Yearly", days: 180 },
  { label: "Annual",   days: 365 },
];

const TABS = [
  { id: "pm",    icon: "🗓️", label: "PM Scheduler" },
  { id: "parts", icon: "🔩", label: "Spare Parts" },
];


export { PMSchedulerTab, SparePartsTab };

export default function MaintenancePlanner({ machineMaster = [], toast }) {
  const [tab, setTab] = useState("pm");

  return (
    <div className="fade">
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #2a2a2a" }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 20px", border: "none",
              borderBottom: `2px solid ${active ? "#ff7800" : "transparent"}`,
              background: "transparent", color: active ? "#ff7800" : C.muted,
              fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      {tab === "pm"    && <PMSchedulerTab machineMaster={machineMaster} toast={toast} />}
      {tab === "parts" && <SparePartsTab machineMaster={machineMaster} toast={toast} />}
    </div>
  );
}




function PMSchedulerTab({ machineMaster, toast }) {
  const [intervals, setIntervals] = useState(load(LS_INTERVALS));
  const [pmRecords, setPMRecords]  = useState([]);
  const [loadingPMs, setLoadingPMs] = useState(true);
  const [editMachineId, setEditMachineId] = useState(null);
  const [editForm, setEditForm]    = useState({ intervalDays: 30, lastPMDate: today(), notes: "" });
  const [creating, setCreating]    = useState({});

  useEffect(() => {
    machineMaintenanceAPI.getAll()
      .then((res) => setPMRecords(Array.isArray(res) ? res : res?.records || []))
      .catch(() => setPMRecords([]))
      .finally(() => setLoadingPMs(false));
  }, []);

  const machines = useMemo(() => {
    return (Array.isArray(machineMaster) ? machineMaster : []).filter((m) => m.status !== "Inactive");
  }, [machineMaster]);

  const saveInterval = () => {
    if (!editMachineId) return;
    const updated = { ...intervals, [editMachineId]: { ...editForm } };
    setIntervals(updated);
    save(LS_INTERVALS, updated);
    toast?.("PM schedule saved", "success");
    setEditMachineId(null);
  };

  
  const schedule = useMemo(() => {
    return machines.map((m) => {
      const mid = m._id || m.id;
      const cfg = intervals[mid];

      
      const machineRecords = pmRecords.filter((r) => {
        const rId = r.machineId?._id || r.machineId;
        return rId === mid || r.machineId?.name === m.name;
      }).filter((r) => r.type === "Preventive");

      const lastFromRecord = machineRecords.length
        ? machineRecords.reduce((latest, r) => {
            const d = r.startDateTime || r.endDateTime;
            return !latest || d > latest ? d : latest;
          }, null)
        : null;

      const lastPMDate = lastFromRecord
        ? lastFromRecord.slice(0, 10)
        : cfg?.lastPMDate || null;

      const intervalDays = cfg?.intervalDays || null;
      const nextPMDate = lastPMDate && intervalDays
        ? addDays(lastPMDate, intervalDays)
        : null;

      const daysUntil = nextPMDate ? daysDiff(nextPMDate, today()) : null;
      const isOverdue = daysUntil !== null && daysUntil < 0;
      const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

      return { machine: m, mid, cfg, lastPMDate, intervalDays, nextPMDate, daysUntil, isOverdue, isDueSoon, machineRecords };
    });
  }, [machines, intervals, pmRecords]);

  const overdue = schedule.filter((s) => s.isOverdue).length;
  const dueSoon = schedule.filter((s) => s.isDueSoon).length;

  const createPMWorkOrder = async (s) => {
    setCreating((c) => ({ ...c, [s.mid]: true }));
    try {
      await machineMaintenanceAPI.create({
        machineId: s.mid,
        type: "Preventive",
        startDateTime: new Date().toISOString(),
        endDateTime: new Date(Date.now() + 2 * 3600000).toISOString(),
        description: `Scheduled PM — interval: ${s.intervalDays}d. ${s.cfg?.notes || ""}`,
        technician: "",
      });
      toast?.(`PM work order created for ${s.machine.name}`, "success");
      
      const res = await machineMaintenanceAPI.getAll();
      setPMRecords(Array.isArray(res) ? res : res?.records || []);
    } catch {
      toast?.("Failed to create PM work order", "error");
    } finally {
      setCreating((c) => ({ ...c, [s.mid]: false }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Preventive Maintenance Scheduler</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Define PM intervals per machine · auto-generate work orders before breakdowns occur</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {overdue > 0 && <div style={{ padding: "6px 14px", background: "#ef444422", border: "1px solid #ef444433", borderRadius: 6, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>⚠ {overdue} Overdue</div>}
          {dueSoon > 0 && <div style={{ padding: "6px 14px", background: "#f59e0b22", border: "1px solid #f59e0b33", borderRadius: 6, fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>⏰ {dueSoon} Due Soon</div>}
        </div>
      </div>

      {}
      {editMachineId && (() => {
        const m = machines.find((x) => (x._id || x.id) === editMachineId);
        return (
          <div style={{ background: "#111", border: "1px solid #3b82f633", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: 14 }}>Configure PM — {m?.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <div>
                <label style={lbl}>PM Interval</label>
                <select value={editForm.intervalDays} onChange={(e) => setEditForm((f) => ({ ...f, intervalDays: Number(e.target.value) }))} style={inp}>
                  {INTERVALS.map((i) => <option key={i.label} value={i.days}>{i.label} ({i.days}d)</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Last PM Date</label>
                <input type="date" value={editForm.lastPMDate} onChange={(e) => setEditForm((f) => ({ ...f, lastPMDate: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>PM Notes / Checklist</label>
                <input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Check bearings, clean ink rollers" style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={saveInterval} style={{ padding: "9px 20px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Schedule</button>
              <button onClick={() => setEditMachineId(null)} style={{ padding: "9px 14px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Machine", "Type", "Interval", "Last PM", "Next PM", "Status", "PM Count", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#666", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #2a2a2a", background: "#0a0a0a", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((s) => {
              const borderLeft = s.isOverdue ? "3px solid #ef4444" : s.isDueSoon ? "3px solid #f59e0b" : "3px solid transparent";
              const statusColor = s.isOverdue ? "#ef4444" : s.isDueSoon ? "#f59e0b" : s.nextPMDate ? "#22c55e" : "#6b7280";
              const statusLabel = !s.intervalDays ? "Not configured"
                : s.isOverdue ? `${Math.abs(s.daysUntil)}d overdue`
                : s.isDueSoon ? `Due in ${s.daysUntil}d`
                : s.nextPMDate ? `${s.daysUntil}d`
                : "—";
              return (
                <tr key={s.mid} style={{ borderBottom: "1px solid #1a1a1a", borderLeft }}>
                  <td style={{ padding: "12px 12px", fontWeight: 600 }}>
                    {s.machine.name}
                    <div style={{ fontSize: 10, color: "#555" }}>{s.machine.type}</div>
                  </td>
                  <td style={{ padding: "12px 12px", fontSize: 12, color: "#888" }}>Preventive</td>
                  <td style={{ padding: "12px 12px", fontSize: 12 }}>
                    {s.intervalDays
                      ? INTERVALS.find((i) => i.days === s.intervalDays)?.label || `${s.intervalDays}d`
                      : <span style={{ color: "#555" }}>Not set</span>}
                  </td>
                  <td style={{ padding: "12px 12px", fontSize: 12, color: "#888" }}>{fmtDate(s.lastPMDate)}</td>
                  <td style={{ padding: "12px 12px", fontSize: 12, fontWeight: s.isOverdue ? 700 : 400, color: s.isOverdue ? "#ef4444" : s.isDueSoon ? "#f59e0b" : "#aaa" }}>
                    {fmtDate(s.nextPMDate)}
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    <span style={{ padding: "2px 8px", background: statusColor + "22", border: `1px solid ${statusColor}33`, borderRadius: 4, fontSize: 11, color: statusColor, fontWeight: 700 }}>
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ padding: "12px 12px", fontSize: 12, color: "#888" }}>{s.machineRecords.length}</td>
                  <td style={{ padding: "12px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(s.isOverdue || s.isDueSoon) && s.intervalDays && (
                        <button
                          onClick={() => createPMWorkOrder(s)}
                          disabled={creating[s.mid]}
                          style={{ padding: "4px 10px", background: "#f59e0b22", border: "1px solid #f59e0b44", color: "#f59e0b", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          {creating[s.mid] ? "..." : "⚡ Create WO"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const cfg = intervals[s.mid] || {};
                          setEditForm({ intervalDays: cfg.intervalDays || 30, lastPMDate: s.lastPMDate || today(), notes: cfg.notes || "" });
                          setEditMachineId(s.mid);
                        }}
                        style={{ padding: "4px 10px", border: "1px solid #2a2a2a", background: "transparent", color: "#888", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                      >
                        Configure
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {machines.length === 0 && (
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>No machines found. Add machines in Machine Master first.</div>
      )}
    </div>
  );
}




function SparePartsTab({ machineMaster, itemMasterFG = [], categoryMaster = [], toast }) {
  const [parts, setParts] = useState(loadArr(LS_PARTS));
  const [view, setView]   = useState("list");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  // Usage history state
  const [usageLogs, setUsageLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [usageDateFrom, setUsageDateFrom] = useState("");
  const [usageDateTo, setUsageDateTo] = useState("");
  const [usageMachineFilter, setUsageMachineFilter] = useState("");

  const blankForm = {
    partName: "", partNumber: "", machineId: "", category: "",
    qty: "", reorderPoint: "", vendor: "", location: "",
    unitCost: "", criticalFlag: false, notes: "",
  };
  const [form, setForm] = useState(blankForm);

  const machines = useMemo(() => (Array.isArray(machineMaster) ? machineMaster : []), [machineMaster]);

  // Extract Machine Spare categories from categoryMaster
  const machineSpareCategories = useMemo(() => {
    const arr = Array.isArray(categoryMaster) ? categoryMaster : [];
    const entry = arr.find((c) => c.type === "Machine Spare");
    if (!entry) return [];
    const fromSubTypes = entry.subTypes ? Object.keys(entry.subTypes) : [];
    const fromCategories = entry.categories || [];
    return [...new Set([...fromCategories, ...fromSubTypes])].filter(Boolean).sort();
  }, [categoryMaster]);

  // Extract Machine Spare items from itemMasterFG
  const machineSpareItems = useMemo(() => {
    return (Array.isArray(itemMasterFG) ? itemMasterFG : []).filter(
      (i) => i.type === "Machine Spare"
    );
  }, [itemMasterFG]);

  // Filter part names by selected category
  const filteredSpareItems = useMemo(() => {
    if (!form.category) return machineSpareItems;
    return machineSpareItems.filter((i) => i.category === form.category);
  }, [machineSpareItems, form.category]);

  const persist = (p) => { setParts(p); save(LS_PARTS, p); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCategoryChange = (cat) => {
    setForm((f) => ({ ...f, category: cat, partName: "", partNumber: "" }));
  };

  const handlePartNameChange = (name) => {
    const item = machineSpareItems.find((i) => i.name === name);
    setForm((f) => ({
      ...f,
      partName: name,
      partNumber: item?.code || f.partNumber,
      category: item?.category || f.category,
    }));
  };

  const handleSubmit = () => {
    if (!form.partName) { toast?.("Select a part name", "error"); return; }
    const rec = { id: editId || uid(), ...form, qty: Number(form.qty), reorderPoint: Number(form.reorderPoint), unitCost: Number(form.unitCost), updatedAt: new Date().toISOString() };
    if (editId) { persist(parts.map((p) => (p.id === editId ? rec : p))); toast?.("Part updated", "success"); }
    else { persist([rec, ...parts]); toast?.("Part added to inventory", "success"); }
    setForm(blankForm); setEditId(null); setView("list");
  };

  const fetchUsageLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = {};
      if (usageDateFrom) params.from = usageDateFrom;
      if (usageDateTo) params.to = usageDateTo;
      const res = await spareIssueLogAPI.getAll(params);
      setUsageLogs(res.logs || []);
    } catch {
      toast?.("Failed to load usage history", "error");
    } finally {
      setLogsLoading(false);
    }
  }, [usageDateFrom, usageDateTo]);

  useEffect(() => {
    if (view === "usage") fetchUsageLogs();
  }, [view, fetchUsageLogs]);

  const filteredUsageLogs = useMemo(() => {
    if (!usageMachineFilter) return usageLogs;
    return usageLogs.filter((l) =>
      (l.machineName || "").toLowerCase().includes(usageMachineFilter.toLowerCase())
    );
  }, [usageLogs, usageMachineFilter]);

  const filtered = useMemo(() =>
    parts.filter((p) => !search || [p.partName, p.partNumber, p.machineId, p.vendor, p.category].join(" ").toLowerCase().includes(search.toLowerCase())),
    [parts, search]
  );

  const reorderCount = parts.filter((p) => Number(p.qty) <= Number(p.reorderPoint) && Number(p.reorderPoint) > 0).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Spare Parts</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Machine spare parts inventory — linked to Item Master &amp; Category Master
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {reorderCount > 0 && (
            <div style={{ padding: "6px 14px", background: "#ef444422", border: "1px solid #ef444433", borderRadius: 6, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>
              🔔 {reorderCount} Reorder{reorderCount > 1 ? "s" : ""} Needed
            </div>
          )}
          {["list", "form", "usage"].map((v) => (
            <button
              key={v}
              onClick={() => { if (v !== "form") { setView(v); } else { setForm(blankForm); setEditId(null); setView("form"); } }}
              style={{
                padding: "7px 16px",
                background: view === v ? "#3b82f6" : "transparent",
                border: "1px solid #3b82f6",
                borderRadius: 6,
                color: view === v ? "#fff" : "#3b82f6",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              {v === "list" ? "📋 Inventory" : v === "form" ? (editId ? "✏️ Edit" : "+ Add Part") : "📊 Usage History"}
            </button>
          ))}
        </div>
      </div>

      {view === "form" && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#facc15", marginBottom: 18 }}>{editId ? "Edit Part" : "Add Spare Part"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Category {machineSpareCategories.length > 0 ? "(from Master)" : ""}</label>
              {machineSpareCategories.length > 0 ? (
                <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} style={inp}>
                  <option value="">-- Select Category --</option>
                  {machineSpareCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={form.category} onChange={(e) => setF("category", e.target.value)} placeholder="e.g. Rollers, Blades, Bearings" style={inp} />
              )}
            </div>
            <div>
              <label style={lbl}>Part Name * {machineSpareItems.length > 0 ? "(from Item Master)" : ""}</label>
              {machineSpareItems.length > 0 ? (
                <select value={form.partName} onChange={(e) => handlePartNameChange(e.target.value)} style={inp}>
                  <option value="">-- Select Part --</option>
                  {filteredSpareItems.map((i) => (
                    <option key={i._id || i.id} value={i.name}>{i.name}{i.code ? ` [${i.code}]` : ""}</option>
                  ))}
                </select>
              ) : (
                <input value={form.partName} onChange={(e) => setF("partName", e.target.value)} placeholder="e.g. Print Roller #3" style={inp} />
              )}
            </div>
            <div>
              <label style={lbl}>Part Number / Code</label>
              <input value={form.partNumber} onChange={(e) => setF("partNumber", e.target.value)} placeholder="Auto-filled from Item Master" style={inp} />
            </div>
            <div>
              <label style={lbl}>Compatible Machine</label>
              <select value={form.machineId} onChange={(e) => setF("machineId", e.target.value)} style={inp}>
                <option value="">All / Any</option>
                {machines.map((m) => <option key={m._id || m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Current Qty</label>
              <input type="number" min={0} value={form.qty} onChange={(e) => setF("qty", e.target.value)} placeholder="0" style={inp} />
            </div>
            <div>
              <label style={lbl}>Reorder Point</label>
              <input type="number" min={0} value={form.reorderPoint} onChange={(e) => setF("reorderPoint", e.target.value)} placeholder="Min stock to trigger reorder" style={inp} />
            </div>
            <div>
              <label style={lbl}>Supplier / Vendor</label>
              <input value={form.vendor} onChange={(e) => setF("vendor", e.target.value)} placeholder="Vendor name" style={inp} />
            </div>
            <div>
              <label style={lbl}>Storage Location</label>
              <input value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="e.g. Shelf B-4, Tool Room" style={inp} />
            </div>
            <div>
              <label style={lbl}>Unit Cost (₹)</label>
              <input type="number" min={0} value={form.unitCost} onChange={(e) => setF("unitCost", e.target.value)} placeholder="0" style={inp} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="critical" checked={form.criticalFlag} onChange={(e) => setF("criticalFlag", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="critical" style={{ ...lbl, marginBottom: 0, color: "#ef4444" }}>Critical Part — production stopper if OOS</label>
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <input value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Lead time, alternate source..." style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "9px 22px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{editId ? "Update" : "Add Part"}</button>
            <button onClick={() => { setForm(blankForm); setEditId(null); setView("list"); }} style={{ padding: "9px 14px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {view === "list" && (
        <>
          <div style={{ marginBottom: 14, display: "flex", gap: 10 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts..." style={{ ...inp, maxWidth: 300 }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Category", "Part", "Machine", "Stock", "Reorder At", "Status", "Location", "Cost", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#666", fontWeight: 700, fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #2a2a2a", background: "#0a0a0a", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: "center", color: "#555", padding: 40 }}>
                    {parts.length === 0 ? "No spare parts tracked yet. Add critical parts to prevent production stoppages." : "No parts match your search."}
                  </td></tr>
                )}
                {filtered.map((p) => {
                  const qty = Number(p.qty);
                  const rop = Number(p.reorderPoint);
                  const isOut = qty === 0;
                  const isLow = qty > 0 && rop > 0 && qty <= rop;
                  const statusCol = isOut ? "#ef4444" : isLow ? "#f59e0b" : "#22c55e";
                  const statusLabel = isOut ? "OUT OF STOCK" : isLow ? "LOW — reorder" : "OK";
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #1a1a1a", borderLeft: isOut ? "3px solid #ef4444" : isLow ? "3px solid #f59e0b" : "3px solid transparent" }}>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#888" }}>{p.category || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          {p.criticalFlag && <span style={{ color: "#ef4444", fontSize: 10 }}>🔴</span>}
                          {p.partName}
                        </div>
                        {p.partNumber && <div style={{ fontSize: 10, color: "#555" }}>{p.partNumber}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{p.machineId || "Any"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: statusCol }}>{qty}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#666" }}>{rop || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", background: statusCol + "22", border: `1px solid ${statusCol}33`, borderRadius: 4, fontSize: 10, color: statusCol, fontWeight: 700 }}>{statusLabel}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{p.location || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>
                        {p.unitCost ? `₹${Number(p.unitCost).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => {
                              setForm({ ...p, qty: p.qty, reorderPoint: p.reorderPoint, unitCost: p.unitCost });
                              setEditId(p.id); setView("form");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            style={{ padding: "3px 8px", border: "1px solid #facc1533", background: "#facc1511", color: "#facc15", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>✏️</button>
                          <button
                            onClick={() => { if (confirm("Delete?")) persist(parts.filter((x) => x.id !== p.id)); }}
                            style={{ padding: "3px 8px", border: "1px solid #ef444433", background: "transparent", color: "#ef4444", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {parts.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#888", textAlign: "right" }}>
              Total inventory value: <strong style={{ color: "#e0e0e0" }}>
                ₹{parts.reduce((s, p) => s + Number(p.qty) * Number(p.unitCost || 0), 0).toLocaleString("en-IN")}
              </strong>
            </div>
          )}
        </>
      )}

      {view === "usage" && (
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#888" }}>Spare Part Usage History</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <label style={{ ...lbl, display: "inline-block", marginRight: 6 }}>From</label>
                <input type="date" value={usageDateFrom} onChange={(e) => setUsageDateFrom(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px" }} />
              </div>
              <div>
                <label style={{ ...lbl, display: "inline-block", marginRight: 6 }}>To</label>
                <input type="date" value={usageDateTo} onChange={(e) => setUsageDateTo(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px" }} />
              </div>
              <input
                value={usageMachineFilter}
                onChange={(e) => setUsageMachineFilter(e.target.value)}
                placeholder="Filter by machine..."
                style={{ ...inp, width: "auto", padding: "6px 10px" }}
              />
              <button
                onClick={fetchUsageLogs}
                style={{ padding: "6px 14px", background: "#3b82f622", border: "1px solid #3b82f644", color: "#3b82f6", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                {logsLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
          {logsLoading ? (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Loading usage records…</div>
          ) : filteredUsageLogs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>No usage records found for the selected period</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Date", "Part Name", "Category", "Qty Used", "Machine", "Issued By", "Remarks"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#666", fontWeight: 700, fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #2a2a2a", background: "#0a0a0a", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsageLogs.map((log, i) => (
                    <tr key={log._id || i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>{fmtDate(log.issuedAt)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {log.itemName}
                        {log.itemCode && <div style={{ fontSize: 10, color: "#555" }}>{log.itemCode}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{log.category || "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#f59e0b" }}>
                        {log.qty} {log.unit || "nos"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {log.machineName ? (
                          <span style={{ padding: "2px 8px", borderRadius: 4, background: "#3b82f622", color: "#3b82f6", fontSize: 11, fontWeight: 600 }}>{log.machineName}</span>
                        ) : <span style={{ color: "#555", fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{log.issuedBy || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{log.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: 12, color: "#888", textAlign: "right" }}>
                Total usage: <strong style={{ color: "#e0e0e0" }}>{filteredUsageLogs.length} records</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
