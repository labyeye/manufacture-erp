import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import { machineMaintenanceAPI, spareIssueLogAPI } from "../api/auth";
import { Modal, AutocompleteInput } from "../components/ui/BasicComponents";

const today = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

const LS_INTERVALS = "pm_intervals";
const LS_PARTS = "spare_parts";

const load = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "{}");
  } catch {
    return {};
  }
};
const loadArr = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "[]");
  } catch {
    return [];
  }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const inp = {
  padding: "9px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  background: "#141414",
  color: "#e0e0e0",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const lbl = {
  fontSize: 11,
  fontWeight: 600,
  color: "#666",
  display: "block",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const INTERVALS = [
  { label: "Weekly", days: 7 },
  { label: "Fortnightly", days: 14 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Half-Yearly", days: 180 },
  { label: "Annual", days: 365 },
];

const TABS = [
  { id: "pm", icon: "🗓️", label: "PM Scheduler" },
  { id: "parts", icon: "🔩", label: "Spare Parts" },
];

export { PMSchedulerTab, SparePartsTab };

export default function MaintenancePlanner({ machineMaster = [], toast }) {
  const [tab, setTab] = useState("pm");

  return (
    <div className="fade">
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: `2px solid ${active ? "#ff7800" : "transparent"}`,
                background: "transparent",
                color: active ? "#ff7800" : C.muted,
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "pm" && (
        <PMSchedulerTab machineMaster={machineMaster} toast={toast} />
      )}
      {tab === "parts" && (
        <SparePartsTab machineMaster={machineMaster} toast={toast} />
      )}
    </div>
  );
}

function PMSchedulerTab({ machineMaster, toast }) {
  const [intervals, setIntervals] = useState(load(LS_INTERVALS));
  const [pmRecords, setPMRecords] = useState([]);
  const [loadingPMs, setLoadingPMs] = useState(true);
  const [editMachineId, setEditMachineId] = useState(null);
  const [editForm, setEditForm] = useState({
    intervalDays: 30,
    lastPMDate: today(),
    notes: "",
  });
  const [creating, setCreating] = useState({});

  useEffect(() => {
    machineMaintenanceAPI
      .getAll()
      .then((res) =>
        setPMRecords(Array.isArray(res) ? res : res?.records || []),
      )
      .catch(() => setPMRecords([]))
      .finally(() => setLoadingPMs(false));
  }, []);

  const machines = useMemo(() => {
    return (Array.isArray(machineMaster) ? machineMaster : []).filter(
      (m) => m.status !== "Inactive",
    );
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

      const machineRecords = pmRecords
        .filter((r) => {
          const rId = r.machineId?._id || r.machineId;
          return rId === mid || r.machineId?.name === m.name;
        })
        .filter((r) => r.type === "Preventive");

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
      const nextPMDate =
        lastPMDate && intervalDays ? addDays(lastPMDate, intervalDays) : null;

      const daysUntil = nextPMDate ? daysDiff(nextPMDate, today()) : null;
      const isOverdue = daysUntil !== null && daysUntil < 0;
      const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

      return {
        machine: m,
        mid,
        cfg,
        lastPMDate,
        intervalDays,
        nextPMDate,
        daysUntil,
        isOverdue,
        isDueSoon,
        machineRecords,
      };
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>
            Preventive Maintenance Scheduler
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Define PM intervals per machine · auto-generate work orders before
            breakdowns occur
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {overdue > 0 && (
            <div
              style={{
                padding: "6px 14px",
                background: "#ef444422",
                border: "1px solid #ef444433",
                borderRadius: 6,
                fontSize: 12,
                color: "#ef4444",
                fontWeight: 700,
              }}
            >
              ⚠ {overdue} Overdue
            </div>
          )}
          {dueSoon > 0 && (
            <div
              style={{
                padding: "6px 14px",
                background: "#f59e0b22",
                border: "1px solid #f59e0b33",
                borderRadius: 6,
                fontSize: 12,
                color: "#f59e0b",
                fontWeight: 700,
              }}
            >
              ⏰ {dueSoon} Due Soon
            </div>
          )}
        </div>
      </div>

      {}
      {editMachineId &&
        (() => {
          const m = machines.find((x) => (x._id || x.id) === editMachineId);
          return (
            <div
              style={{
                background: "#111",
                border: "1px solid #3b82f633",
                borderRadius: 10,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{ fontWeight: 500, color: "#60a5fa", marginBottom: 14 }}
              >
                Configure PM — {m?.name}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <label style={lbl}>PM Interval</label>
                  <select
                    value={editForm.intervalDays}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        intervalDays: Number(e.target.value),
                      }))
                    }
                    style={inp}
                  >
                    {INTERVALS.map((i) => (
                      <option key={i.label} value={i.days}>
                        {i.label} ({i.days}d)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Last PM Date</label>
                  <input
                    type="date"
                    value={editForm.lastPMDate}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, lastPMDate: e.target.value }))
                    }
                    style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>PM Notes / Checklist</label>
                  <input
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="e.g. Check bearings, clean ink rollers"
                    style={inp}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  onClick={saveInterval}
                  style={{
                    padding: "9px 20px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: 6,
                    color: "#fff",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow:
                      "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  Save Schedule
                </button>
                <button
                  onClick={() => setEditMachineId(null)}
                  style={{
                    background: "transparent",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-xmark" /> Cancel
                </button>
              </div>
            </div>
          );
        })()}

      {}
      <div
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr
              style={{
                background: "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {[
                "Machine",
                "Type",
                "Interval",
                "Last PM",
                "Next PM",
                "Status",
                "PM Count",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((s, i) => {
              const statusColor = s.isOverdue
                ? "#ef4444"
                : s.isDueSoon
                  ? "#f59e0b"
                  : s.nextPMDate
                    ? "#22c55e"
                    : "#6b7280";
              const statusLabel = !s.intervalDays
                ? "Not configured"
                : s.isOverdue
                  ? `${Math.abs(s.daysUntil)}d overdue`
                  : s.isDueSoon
                    ? `Due in ${s.daysUntil}d`
                    : s.nextPMDate
                      ? `${s.daysUntil}d`
                      : "—";
              return (
                <tr
                  key={s.mid}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td style={{ padding: "12px 12px", fontWeight: 600 }}>
                    {s.machine.name}
                    <div style={{ fontSize: 10, color: "#555" }}>
                      {s.machine.type}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    Preventive
                  </td>
                  <td style={{ padding: "12px 12px", fontSize: 12 }}>
                    {s.intervalDays ? (
                      INTERVALS.find((i) => i.days === s.intervalDays)?.label ||
                      `${s.intervalDays}d`
                    ) : (
                      <span style={{ color: "#555" }}>Not set</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    {fmtDate(s.lastPMDate)}
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontSize: 12,
                      fontWeight: s.isOverdue ? 700 : 400,
                      color: s.isOverdue
                        ? "#ef4444"
                        : s.isDueSoon
                          ? "#f59e0b"
                          : "#aaa",
                    }}
                  >
                    {fmtDate(s.nextPMDate)}
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        background: statusColor + "22",
                        border: `1px solid ${statusColor}33`,
                        borderRadius: 4,
                        fontSize: 11,
                        color: statusColor,
                        fontWeight: 700,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    {s.machineRecords.length}
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(s.isOverdue || s.isDueSoon) && s.intervalDays && (
                        <button
                          onClick={() => createPMWorkOrder(s)}
                          disabled={creating[s.mid]}
                          style={{
                            padding: "4px 10px",
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            borderRadius: 4,
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            boxShadow:
                              "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                          }}
                        >
                          {creating[s.mid] ? "..." : "⚡ Create WO"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const cfg = intervals[s.mid] || {};
                          setEditForm({
                            intervalDays: cfg.intervalDays || 30,
                            lastPMDate: s.lastPMDate || today(),
                            notes: cfg.notes || "",
                          });
                          setEditMachineId(s.mid);
                        }}
                        style={{
                          padding: "4px 10px",
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "transparent",
                          color: "#aaa",
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
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
        <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
          No machines found. Add machines in Machine Master first.
        </div>
      )}
    </div>
  );
}

function SparePartsTab({
  machineMaster,
  itemMasterFG = [],
  categoryMaster = [],
  vendorMaster = [],
  toast,
}) {
  const [parts, setParts] = useState(loadArr(LS_PARTS));
  const [view, setView] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  // Issue spare part state
  const [issuingPart, setIssuingPart] = useState(null);
  const [issueForm, setIssueForm] = useState({
    qty: "",
    machineId: "",
    issuedBy: "",
    remarks: "",
  });
  const [issuing, setIssuing] = useState(false);

  // Edit usage log state
  const [editingLog, setEditingLog] = useState(null);
  const [editLogForm, setEditLogForm] = useState({});
  const [savingLog, setSavingLog] = useState(false);

  // Usage history state
  const [usageLogs, setUsageLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [usageDateFrom, setUsageDateFrom] = useState("");
  const [usageDateTo, setUsageDateTo] = useState("");
  const [usageMachineFilter, setUsageMachineFilter] = useState("");

  const blankForm = {
    partName: "",
    partNumber: "",
    compatibleMachines: [],
    category: "",
    qty: "",
    reorderPoint: "",
    vendor: "",
    location: "",
    unitCost: "",
    criticalFlag: false,
    notes: "",
  };
  const [form, setForm] = useState(blankForm);

  const machines = useMemo(
    () => (Array.isArray(machineMaster) ? machineMaster : []),
    [machineMaster],
  );

  // Extract Machine Spare categories from categoryMaster
  const machineSpareCategories = useMemo(() => {
    const arr = Array.isArray(categoryMaster) ? categoryMaster : [];
    const entry = arr.find((c) => c.type === "Machine Spare");
    if (!entry) return [];
    const fromSubTypes = entry.subTypes ? Object.keys(entry.subTypes) : [];
    const fromCategories = entry.categories || [];
    return [...new Set([...fromCategories, ...fromSubTypes])]
      .filter(Boolean)
      .sort();
  }, [categoryMaster]);

  // Extract Machine Spare items from itemMasterFG
  const machineSpareItems = useMemo(() => {
    return (Array.isArray(itemMasterFG) ? itemMasterFG : []).filter(
      (i) => i.type === "Machine Spare",
    );
  }, [itemMasterFG]);

  // Filter part names by selected category
  const filteredSpareItems = useMemo(() => {
    if (!form.category) return machineSpareItems;
    return machineSpareItems.filter((i) => i.category === form.category);
  }, [machineSpareItems, form.category]);

  const persist = (p) => {
    setParts(p);
    save(LS_PARTS, p);
  };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleMachine = (name) => {
    setForm((f) => {
      const cur = f.compatibleMachines || [];
      return {
        ...f,
        compatibleMachines: cur.includes(name)
          ? cur.filter((n) => n !== name)
          : [...cur, name],
      };
    });
  };

  const openIssue = (p) => {
    setIssuingPart(p);
    const defaultMachine = p.compatibleMachines?.[0] || p.machineId || "";
    setIssueForm({
      qty: "",
      machineId: defaultMachine,
      issuedBy: "",
      remarks: "",
    });
  };

  const closeIssue = () => {
    setIssuingPart(null);
    setIssueForm({ qty: "", machineId: "", issuedBy: "", remarks: "" });
  };

  const handleIssue = async () => {
    const qty = Number(issueForm.qty);
    if (!qty || qty <= 0) {
      toast?.("Quantity is required", "error");
      return;
    }
    const avail = Number(issuingPart.qty);
    if (qty > avail) {
      toast?.(`Insufficient stock. Available: ${avail}`, "error");
      return;
    }
    if (!issueForm.machineId) {
      toast?.("Machine is required", "error");
      return;
    }
    if (!issueForm.issuedBy.trim()) {
      toast?.("Issued By is required", "error");
      return;
    }
    if (!issueForm.remarks.trim()) {
      toast?.("Remarks is required", "error");
      return;
    }
    setIssuing(true);
    try {
      await spareIssueLogAPI.create({
        itemCode: issuingPart.partNumber || "",
        itemName: issuingPart.partName,
        category: issuingPart.category || "",
        machineName: issueForm.machineId,
        qty,
        unit: "nos",
        issuedBy: issueForm.issuedBy.trim(),
        remarks: issueForm.remarks.trim(),
        skipStockDeduction: true,
      });
      persist(
        parts.map((p) =>
          p.id === issuingPart.id ? { ...p, qty: avail - qty } : p,
        ),
      );
      toast?.(`Issued ${qty} × ${issuingPart.partName}`, "success");
      closeIssue();
    } catch (err) {
      toast?.(err?.response?.data?.error || "Failed to issue part", "error");
    } finally {
      setIssuing(false);
    }
  };

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
    if (!form.partName) {
      toast?.("Select a part name", "error");
      return;
    }
    const rec = {
      id: editId || uid(),
      ...form,
      qty: Number(form.qty),
      reorderPoint: Number(form.reorderPoint),
      unitCost: Number(form.unitCost),
      updatedAt: new Date().toISOString(),
    };
    if (editId) {
      persist(parts.map((p) => (p.id === editId ? rec : p)));
      toast?.("Part updated", "success");
    } else {
      persist([rec, ...parts]);
      toast?.("Part added to inventory", "success");
    }
    setForm(blankForm);
    setEditId(null);
    setShowModal(false);
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

  const importRef = useRef(null);

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Delete this issue record?")) return;
    try {
      await spareIssueLogAPI.delete(id);
      setUsageLogs((prev) => prev.filter((l) => l._id !== id));
      toast?.("Record deleted", "success");
    } catch {
      toast?.("Failed to delete record", "error");
    }
  };

  const openEditLog = (log) => {
    setEditingLog(log);
    setEditLogForm({
      itemName: log.itemName || "",
      itemCode: log.itemCode || "",
      category: log.category || "",
      machineName: log.machineName || "",
      qty: log.qty || "",
      unit: log.unit || "nos",
      issuedBy: log.issuedBy || "",
      remarks: log.remarks || "",
      issuedAt: log.issuedAt
        ? new Date(log.issuedAt).toISOString().slice(0, 10)
        : "",
    });
  };

  const handleSaveLog = async () => {
    if (
      !editLogForm.itemName ||
      !editLogForm.qty ||
      Number(editLogForm.qty) <= 0
    ) {
      toast?.("Part name and quantity are required", "error");
      return;
    }
    setSavingLog(true);
    try {
      const res = await spareIssueLogAPI.update(editingLog._id, editLogForm);
      setUsageLogs((prev) =>
        prev.map((l) => (l._id === editingLog._id ? res.log : l)),
      );
      toast?.("Record updated", "success");
      setEditingLog(null);
    } catch {
      toast?.("Failed to update record", "error");
    } finally {
      setSavingLog(false);
    }
  };

  const handleExportLogs = () => {
    if (!filteredUsageLogs.length) {
      toast?.("No records to export", "error");
      return;
    }
    const headers = [
      "Date",
      "Part Name",
      "Part Code",
      "Category",
      "Qty",
      "Unit",
      "Machine",
      "Issued By",
      "Remarks",
    ];
    const rows = filteredUsageLogs.map((l) => [
      l.issuedAt ? new Date(l.issuedAt).toLocaleDateString("en-GB") : "",
      l.itemName || "",
      l.itemCode || "",
      l.category || "",
      l.qty || 0,
      l.unit || "nos",
      l.machineName || "",
      l.issuedBy || "",
      l.remarks || "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spare Issue Logs");
    XLSX.writeFile(
      wb,
      `spare_issue_logs_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast?.("Exported successfully", "success");
  };

  const handleImportLogs = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) {
        toast?.("No data rows found", "error");
        return;
      }
      const [, ...dataRows] = rows;
      let success = 0,
        failed = 0;
      for (const row of dataRows) {
        if (!row || !row[1]) {
          failed++;
          continue;
        }
        const [
          ,
          itemName,
          itemCode,
          category,
          qty,
          unit,
          machineName,
          issuedBy,
          remarks,
        ] = row;
        if (!itemName || !qty) {
          failed++;
          continue;
        }
        try {
          await spareIssueLogAPI.create({
            itemName: String(itemName).trim(),
            itemCode: String(itemCode || "").trim(),
            category: String(category || "").trim(),
            machineName: String(machineName || "").trim(),
            qty: Number(qty),
            unit: String(unit || "nos").trim(),
            issuedBy: String(issuedBy || "").trim(),
            remarks: String(remarks || "").trim(),
            skipStockDeduction: true,
          });
          success++;
        } catch {
          failed++;
        }
      }
      toast?.(
        `Imported ${success} records${failed ? `, ${failed} skipped` : ""}`,
        "success",
      );
      fetchUsageLogs();
    } catch {
      toast?.("Failed to parse file", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handlePrintReport = () => {
    if (!filteredUsageLogs.length) {
      toast?.("No records to report", "error");
      return;
    }
    const totalQty = filteredUsageLogs.reduce((s, l) => s + (l.qty || 0), 0);
    const byMachine = {};
    const byPart = {};
    filteredUsageLogs.forEach((l) => {
      const m = l.machineName || "Unassigned";
      byMachine[m] = (byMachine[m] || 0) + (l.qty || 0);
      const p = l.itemName || "Unknown";
      byPart[p] = (byPart[p] || 0) + (l.qty || 0);
    });
    const machineRows = Object.entries(byMachine)
      .sort((a, b) => b[1] - a[1])
      .map(([m, q]) => `<tr><td>${m}</td><td class="num">${q}</td></tr>`)
      .join("");
    const partRows = Object.entries(byPart)
      .sort((a, b) => b[1] - a[1])
      .map(([p, q]) => `<tr><td>${p}</td><td class="num">${q}</td></tr>`)
      .join("");
    const detailRows = filteredUsageLogs
      .map(
        (l) => `
      <tr>
        <td>${l.issuedAt ? new Date(l.issuedAt).toLocaleDateString("en-GB") : "—"}</td>
        <td>${l.itemName || ""}${l.itemCode ? ` <span class="code">[${l.itemCode}]</span>` : ""}</td>
        <td>${l.category || "—"}</td>
        <td class="num">${l.qty} ${l.unit || "nos"}</td>
        <td>${l.machineName || "—"}</td>
        <td>${l.issuedBy || "—"}</td>
        <td>${l.remarks || "—"}</td>
      </tr>`,
      )
      .join("");
    const dateRange =
      usageDateFrom || usageDateTo
        ? `${usageDateFrom || "—"} to ${usageDateTo || "—"}`
        : "All dates";
    const html = `<html><head><title>Spare Parts Usage Report</title><style>
      body{font-family:Arial,sans-serif;padding:20px 30px;color:#1a1a1a;}
      .header{text-align:center;border-bottom:2px solid #ff7800;padding-bottom:10px;margin-bottom:16px;}
      .header h1{color:#c25a00;margin:0;font-size:20px;font-weight:800;}
      .header p{margin:2px 0;font-size:11px;color:#666;}
      h2{font-size:13px;font-weight:700;margin:16px 0 6px;color:#333;text-transform:uppercase;letter-spacing:.05em;}
      .summary{display:flex;gap:20px;margin-bottom:16px;}
      .stat{padding:10px 16px;border:1px solid #ddd;border-radius:6px;flex:1;text-align:center;}
      .stat .val{font-size:22px;font-weight:900;color:#ff7800;}
      .stat .lbl{font-size:10px;color:#888;margin-top:2px;}
      table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10px;}
      th{background:#f5f5f5;border:1px solid #ddd;padding:5px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#555;}
      td{border:1px solid #eee;padding:4px 8px;}
      .num{text-align:right;}
      .code{color:#888;font-size:9px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
      @media print{@page{margin:1cm;size:A4 landscape;}}
    </style></head><body>
      <div class="header">
        <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
        <p>Spare Parts Usage Report &nbsp;|&nbsp; Period: ${dateRange} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
      </div>
      <div class="summary">
        <div class="stat"><div class="val">${filteredUsageLogs.length}</div><div class="lbl">Total Records</div></div>
        <div class="stat"><div class="val">${totalQty}</div><div class="lbl">Total Qty Issued</div></div>
        <div class="stat"><div class="val">${Object.keys(byMachine).length}</div><div class="lbl">Machines</div></div>
        <div class="stat"><div class="val">${Object.keys(byPart).length}</div><div class="lbl">Unique Parts</div></div>
      </div>
      <div class="grid">
        <div>
          <h2>By Machine</h2>
          <table><thead><tr><th>Machine</th><th class="num">Qty</th></tr></thead><tbody>${machineRows}</tbody></table>
        </div>
        <div>
          <h2>By Part</h2>
          <table><thead><tr><th>Part Name</th><th class="num">Qty</th></tr></thead><tbody>${partRows}</tbody></table>
        </div>
      </div>
      <h2>Detailed Log</h2>
      <table><thead><tr><th>Date</th><th>Part</th><th>Category</th><th class="num">Qty</th><th>Machine</th><th>Issued By</th><th>Remarks</th></tr></thead>
      <tbody>${detailRows}</tbody></table>
    </body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    };
  };

  const filteredUsageLogs = useMemo(() => {
    if (!usageMachineFilter) return usageLogs;
    return usageLogs.filter((l) =>
      (l.machineName || "")
        .toLowerCase()
        .includes(usageMachineFilter.toLowerCase()),
    );
  }, [usageLogs, usageMachineFilter]);

  const filtered = useMemo(
    () =>
      parts
        .filter(
          (p) =>
            !search ||
            [p.partName, p.partNumber, p.machineId, p.vendor, p.category]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0) ||
            String(b.id || "").localeCompare(String(a.id || "")),
        ),
    [parts, search],
  );

  const reorderCount = parts.filter(
    (p) =>
      Number(p.qty) <= Number(p.reorderPoint) && Number(p.reorderPoint) > 0,
  ).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Spare Parts</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Machine spare parts inventory — linked to Item Master &amp; Category
            Master
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {reorderCount > 0 && (
            <div
              style={{
                padding: "6px 14px",
                background: "#ef444422",
                border: "1px solid #ef444433",
                borderRadius: 6,
                fontSize: 12,
                color: "#ef4444",
                fontWeight: 700,
              }}
            >
              🔔 {reorderCount} Reorder{reorderCount > 1 ? "s" : ""} Needed
            </div>
          )}
          <button
            onClick={() => {
              setForm(blankForm);
              setEditId(null);
              setShowModal(true);
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            + Add Part
          </button>
          {["list", "usage"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "7px 16px",
                background:
                  view === v
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${view === v ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.18)"}`,
                borderRadius: 6,
                color: "#fff",
                fontWeight: 500,
                fontSize: 12,
                cursor: "pointer",
                boxShadow:
                  view === v
                    ? "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)"
                    : "none",
              }}
            >
              {v === "list" ? "📋 Inventory" : "📊 Usage History"}
            </button>
          ))}
        </div>
      </div>

      {showModal && (
        <Modal
          title={editId ? "Edit Part" : "Add Spare Part"}
          onClose={() => {
            setForm(blankForm);
            setEditId(null);
            setShowModal(false);
          }}
        >
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={lbl}>
                  Category{" "}
                  {machineSpareCategories.length > 0 ? "(from Master)" : ""}
                </label>
                {machineSpareCategories.length > 0 ? (
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    style={inp}
                  >
                    <option value="">-- Select Category --</option>
                    {machineSpareCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.category}
                    onChange={(e) => setF("category", e.target.value)}
                    placeholder="e.g. Rollers, Blades, Bearings"
                    style={inp}
                  />
                )}
              </div>
              <div>
                <label style={lbl}>
                  Part Name *{" "}
                  {machineSpareItems.length > 0 ? "(from Item Master)" : ""}
                </label>
                {machineSpareItems.length > 0 ? (
                  <select
                    value={form.partName}
                    onChange={(e) => handlePartNameChange(e.target.value)}
                    style={inp}
                  >
                    <option value="">-- Select Part --</option>
                    {filteredSpareItems.map((i) => (
                      <option key={i._id || i.id} value={i.name}>
                        {i.name}
                        {i.code ? ` [${i.code}]` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.partName}
                    onChange={(e) => setF("partName", e.target.value)}
                    placeholder="e.g. Print Roller #3"
                    style={inp}
                  />
                )}
              </div>
              <div>
                <label style={lbl}>Part Number / Code</label>
                <input
                  value={form.partNumber}
                  onChange={(e) => setF("partNumber", e.target.value)}
                  placeholder="Auto-filled from Item Master"
                  style={inp}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>
                  Compatible Machines
                  {(form.compatibleMachines || []).length > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: "#ff7800",
                        textTransform: "none",
                        fontWeight: 600,
                      }}
                    >
                      ({form.compatibleMachines.length} selected)
                    </span>
                  )}
                </label>
                {machines.length === 0 ? (
                  <div style={{ ...inp, color: "#555", fontSize: 12 }}>
                    No machines found
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "6px 0",
                    }}
                  >
                    {machines.map((m) => {
                      const selected = (form.compatibleMachines || []).includes(
                        m.name,
                      );
                      return (
                        <button
                          key={m._id || m.id}
                          type="button"
                          onClick={() => toggleMachine(m.name)}
                          style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: selected ? "#ff7800" : "#1a1a1a",
                            color: selected ? "#fff" : "#666",
                            border: `1px solid ${selected ? "#ff7800" : "#333"}`,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Current Qty</label>
                <input
                  type="number"
                  min={0}
                  value={form.qty}
                  onChange={(e) => setF("qty", e.target.value)}
                  placeholder="0"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Reorder Point</label>
                <input
                  type="number"
                  min={0}
                  value={form.reorderPoint}
                  onChange={(e) => setF("reorderPoint", e.target.value)}
                  placeholder="Min stock to trigger reorder"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Supplier / Vendor</label>
                <AutocompleteInput
                  value={form.vendor}
                  onChange={(v) => setF("vendor", v)}
                  suggestions={vendorMaster.map((v) => v.name).filter(Boolean)}
                  placeholder="Search vendor…"
                  showAllOnFocus
                  inputStyle={inp}
                />
              </div>
              <div>
                <label style={lbl}>Storage Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setF("location", e.target.value)}
                  placeholder="e.g. Shelf B-4, Tool Room"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Unit Cost (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.unitCost}
                  onChange={(e) => setF("unitCost", e.target.value)}
                  placeholder="0"
                  style={inp}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingTop: 20,
                }}
              >
                <input
                  type="checkbox"
                  id="critical"
                  checked={form.criticalFlag}
                  onChange={(e) => setF("criticalFlag", e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label
                  htmlFor="critical"
                  style={{ ...lbl, marginBottom: 0, color: "#ef4444" }}
                >
                  Critical Part — production stopper if OOS
                </label>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setF("notes", e.target.value)}
                  placeholder="Lead time, alternate source..."
                  style={inp}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSubmit}
                style={{
                  padding: "9px 22px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 6,
                  color: "#fff",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                {editId ? "Update" : "Add Part"}
              </button>
              <button
                onClick={() => {
                  setForm(blankForm);
                  setEditId(null);
                  setShowModal(false);
                }}
                style={{
                  background: "transparent",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-xmark" /> Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {issuingPart && (
        <Modal title={`Issue — ${issuingPart.partName}`} onClose={closeIssue}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={lbl}>Available Stock</label>
              <div
                style={{
                  ...inp,
                  fontWeight: 700,
                  color: Number(issuingPart.qty) === 0 ? "#ef4444" : "#e0e0e0",
                }}
              >
                {issuingPart.qty} nos
              </div>
            </div>
            <div>
              <label style={lbl}>Quantity to Issue *</label>
              <input
                type="number"
                min={1}
                max={issuingPart.qty}
                value={issueForm.qty}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, qty: e.target.value }))
                }
                placeholder="Enter qty"
                style={inp}
                autoFocus
              />
            </div>
            <div>
              <label style={lbl}>Issue to Machine *</label>
              <select
                value={issueForm.machineId}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, machineId: e.target.value }))
                }
                style={inp}
              >
                <option value="">— Select Machine —</option>
                {(issuingPart?.compatibleMachines?.length
                  ? machines.filter((m) =>
                      issuingPart.compatibleMachines.includes(m.name),
                    )
                  : machines
                ).map((m) => (
                  <option key={m._id || m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              {issuingPart?.compatibleMachines?.length > 0 && (
                <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>
                  Showing {issuingPart.compatibleMachines.length} compatible
                  machine{issuingPart.compatibleMachines.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Issued By *</label>
              <input
                value={issueForm.issuedBy}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, issuedBy: e.target.value }))
                }
                placeholder="Enter name"
                style={inp}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Remarks *</label>
              <input
                value={issueForm.remarks}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, remarks: e.target.value }))
                }
                placeholder="Purpose / reason for issue"
                style={inp}
              />
            </div>
          </div>
          {issueForm.qty && Number(issueForm.qty) > 0 && (
            <div
              style={{
                padding: "10px 14px",
                background: "#f97316" + "11",
                border: "1px solid " + "#f97316" + "44",
                borderRadius: 6,
                marginBottom: 14,
                fontSize: 13,
              }}
            >
              Issue{" "}
              <strong style={{ color: "#f97316" }}>{issueForm.qty} nos</strong>{" "}
              of <strong>{issuingPart.partName}</strong>
              {issueForm.machineId ? (
                <>
                  {" "}
                  →{" "}
                  <strong style={{ color: "#3b82f6" }}>
                    {issueForm.machineId}
                  </strong>
                </>
              ) : null}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleIssue}
              disabled={issuing}
              style={{
                padding: "9px 22px",
                background: issuing
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 6,
                color: "#fff",
                fontWeight: 600,
                cursor: issuing ? "not-allowed" : "pointer",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              {issuing ? "Issuing…" : "Confirm Issue"}
            </button>
            <button
              onClick={closeIssue}
              style={{
                background: "transparent",
                color: "#aaa",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {view === "list" && (
        <>
          <div style={{ marginBottom: 14, display: "flex", gap: 10 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts..."
              style={{ ...inp, maxWidth: 300 }}
            />
          </div>
          <div
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {[
                    "Category",
                    "Part",
                    "Machine",
                    "Stock",
                    "Reorder At",
                    "Status",
                    "Location",
                    "Cost",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        color: "#555",
                        padding: 40,
                      }}
                    >
                      {parts.length === 0
                        ? "No spare parts tracked yet. Add critical parts to prevent production stoppages."
                        : "No parts match your search."}
                    </td>
                  </tr>
                )}
                {filtered.map((p, i) => {
                  const qty = Number(p.qty);
                  const rop = Number(p.reorderPoint);
                  const isOut = qty === 0;
                  const isLow = qty > 0 && rop > 0 && qty <= rop;
                  const statusCol = isOut
                    ? "#ef4444"
                    : isLow
                      ? "#f59e0b"
                      : "#22c55e";
                  const statusLabel = isOut
                    ? "OUT OF STOCK"
                    : isLow
                      ? "LOW — reorder"
                      : "OK";
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 11,
                          color: "#888",
                        }}
                      >
                        {p.category || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div
                          style={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {p.criticalFlag && (
                            <span style={{ color: "#ef4444", fontSize: 10 }}>
                              🔴
                            </span>
                          )}
                          {p.partName}
                        </div>
                        {p.partNumber && (
                          <div style={{ fontSize: 10, color: "#555" }}>
                            {p.partNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {(() => {
                          const names = p.compatibleMachines?.length
                            ? p.compatibleMachines
                            : p.machineId
                              ? [p.machineId]
                              : [];
                          return names.length === 0 ? (
                            <span style={{ color: "#555", fontSize: 11 }}>
                              Any
                            </span>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 4,
                              }}
                            >
                              {names.map((n) => (
                                <span
                                  key={n}
                                  style={{
                                    padding: "2px 7px",
                                    borderRadius: 10,
                                    background: "#ff780022",
                                    color: "#ff7800",
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: statusCol,
                          }}
                        >
                          {qty}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#666",
                        }}
                      >
                        {rop || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            background: statusCol + "22",
                            border: `1px solid ${statusCol}33`,
                            borderRadius: 4,
                            fontSize: 10,
                            color: statusCol,
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        {p.location || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#aaa",
                        }}
                      >
                        {p.unitCost
                          ? `₹${Number(p.unitCost).toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => {
                              setForm({
                                ...p,
                                qty: p.qty,
                                reorderPoint: p.reorderPoint,
                                unitCost: p.unitCost,
                                compatibleMachines: p.compatibleMachines?.length
                                  ? p.compatibleMachines
                                  : p.machineId
                                    ? [p.machineId]
                                    : [],
                              });
                              setEditId(p.id);
                              setShowModal(true);
                            }}
                            style={{
                              background: "transparent",
                              color: "#8082ff",
                              border: "1px solid #8082ff98",
                              borderRadius: 6,
                              padding: "6px 12px",
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete?"))
                                persist(parts.filter((x) => x.id !== p.id));
                            }}
                            style={{
                              background: "transparent",
                              color: "#8082ff",
                              border: "1px solid #8082ff98",
                              borderRadius: 6,
                              padding: "6px 12px",
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <i className="fa-solid fa-trash" /> Delete
                          </button>
                          <button
                            onClick={() => openIssue(p)}
                            style={{
                              background: "transparent",
                              color: "#f97316",
                              border: "1px solid #f9731698",
                              borderRadius: 6,
                              padding: "6px 12px",
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <i className="fa-solid fa-arrow-right-from-bracket" />{" "}
                            Issue
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {parts.length > 0 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#888",
                textAlign: "right",
              }}
            >
              Total inventory value:{" "}
              <strong style={{ color: "#e0e0e0" }}>
                ₹
                {parts
                  .reduce(
                    (s, p) => s + Number(p.qty) * Number(p.unitCost || 0),
                    0,
                  )
                  .toLocaleString("en-IN")}
              </strong>
            </div>
          )}
        </>
      )}

      {editingLog && (
        <Modal title="Edit Issue Record" onClose={() => setEditingLog(null)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={lbl}>Part Name *</label>
              <input
                value={editLogForm.itemName}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, itemName: e.target.value }))
                }
                style={inp}
                placeholder="Part name"
              />
            </div>
            <div>
              <label style={lbl}>Part Code</label>
              <input
                value={editLogForm.itemCode}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, itemCode: e.target.value }))
                }
                style={inp}
                placeholder="Code"
              />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <input
                value={editLogForm.category}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, category: e.target.value }))
                }
                style={inp}
                placeholder="Category"
              />
            </div>
            <div>
              <label style={lbl}>Machine</label>
              <select
                value={editLogForm.machineName}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, machineName: e.target.value }))
                }
                style={inp}
              >
                <option value="">— Select Machine —</option>
                {machines.map((m) => (
                  <option key={m._id || m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Qty *</label>
              <input
                type="number"
                min={1}
                value={editLogForm.qty}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, qty: e.target.value }))
                }
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <input
                value={editLogForm.unit}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, unit: e.target.value }))
                }
                style={inp}
                placeholder="nos"
              />
            </div>
            <div>
              <label style={lbl}>Issued By</label>
              <input
                value={editLogForm.issuedBy}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, issuedBy: e.target.value }))
                }
                style={inp}
                placeholder="Name"
              />
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input
                type="date"
                value={editLogForm.issuedAt}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, issuedAt: e.target.value }))
                }
                style={inp}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Remarks</label>
              <input
                value={editLogForm.remarks}
                onChange={(e) =>
                  setEditLogForm((f) => ({ ...f, remarks: e.target.value }))
                }
                style={inp}
                placeholder="Purpose / notes"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleSaveLog}
              disabled={savingLog}
              style={{
                padding: "9px 22px",
                background: savingLog
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 6,
                color: "#fff",
                fontWeight: 600,
                cursor: savingLog ? "not-allowed" : "pointer",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              {savingLog ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => setEditingLog(null)}
              style={{
                background: "transparent",
                color: "#aaa",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {view === "usage" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: "#888" }}>
              Spare Part Usage History
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <label
                  style={{ ...lbl, display: "inline-block", marginRight: 6 }}
                >
                  From
                </label>
                <input
                  type="date"
                  value={usageDateFrom}
                  onChange={(e) => setUsageDateFrom(e.target.value)}
                  style={{ ...inp, width: "auto", padding: "6px 10px" }}
                />
              </div>
              <div>
                <label
                  style={{ ...lbl, display: "inline-block", marginRight: 6 }}
                >
                  To
                </label>
                <input
                  type="date"
                  value={usageDateTo}
                  onChange={(e) => setUsageDateTo(e.target.value)}
                  style={{ ...inp, width: "auto", padding: "6px 10px" }}
                />
              </div>
              <input
                value={usageMachineFilter}
                onChange={(e) => setUsageMachineFilter(e.target.value)}
                placeholder="Filter by machine..."
                style={{ ...inp, width: "auto", padding: "6px 10px" }}
              />
              {[
                {
                  label: logsLoading ? "Loading…" : "Refresh",
                  onClick: fetchUsageLogs,
                  color: "rgba(255,255,255,0.08)",
                  border: "rgba(255,255,255,0.18)",
                },
                {
                  label: "⬆ Import",
                  onClick: () => importRef.current?.click(),
                  color: "rgba(255,255,255,0.08)",
                  border: "rgba(255,255,255,0.18)",
                },
                {
                  label: "⬇ Export",
                  onClick: handleExportLogs,
                  color: "rgba(255,255,255,0.08)",
                  border: "rgba(255,255,255,0.18)",
                },
                {
                  label: "🖨 Report",
                  onClick: handlePrintReport,
                  color: "rgba(255,120,0,0.15)",
                  border: "#ff780055",
                },
              ].map(({ label, onClick, color, border }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    padding: "6px 14px",
                    background: color,
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow:
                      "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={handleImportLogs}
              />
            </div>
          </div>
          {logsLoading ? (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
              Loading usage records…
            </div>
          ) : filteredUsageLogs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
              No usage records found for the selected period
            </div>
          ) : (
            <div
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {[
                      "Date",
                      "Part Name",
                      "Category",
                      "Qty Used",
                      "Machine",
                      "Issued By",
                      "Remarks",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsageLogs.map((log, i) => (
                    <tr
                      key={log._id || i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 11,
                          color: "#888",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(log.issuedAt)}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {log.itemName}
                        {log.itemCode && (
                          <div style={{ fontSize: 10, color: "#555" }}>
                            {log.itemCode}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        {log.category || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: 500,
                          color: "#f59e0b",
                        }}
                      >
                        {log.qty} {log.unit || "nos"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {log.machineName ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "#3b82f622",
                              color: "#3b82f6",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {log.machineName}
                          </span>
                        ) : (
                          <span style={{ color: "#555", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        {log.issuedBy || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        {log.remarks || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openEditLog(log)}
                            style={{
                              background: "transparent",
                              color: "#8082ff",
                              border: "1px solid #8082ff98",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log._id)}
                            style={{
                              background: "transparent",
                              color: "#ef4444",
                              border: "1px solid #ef444460",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <i className="fa-solid fa-trash" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#888",
                  textAlign: "right",
                }}
              >
                Total usage:{" "}
                <strong style={{ color: "#e0e0e0" }}>
                  {filteredUsageLogs.length} records
                </strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
