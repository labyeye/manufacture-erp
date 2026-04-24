import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const STORAGE_KEY = "subcontracting_records";

const STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation", "Foiling", "Embossing", "Pasting"];
const STATUS_OPTIONS = ["Issued", "Partially Received", "Received", "Reconciled", "Cancelled"];

const STATUS_COLOR = {
  Issued: "#f97316",
  "Partially Received": "#f59e0b",
  Received: "#3b82f6",
  Reconciled: "#22c55e",
  Cancelled: "#6b7280",
};

const PRIORITY_COLORS = {
  VIP: "#ef4444",
  Rush: "#f97316",
  Standard: "#6b7280",
  "Fill-in": "#4b5563",
};

const inp = {
  padding: "9px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
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

const loadRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveRecords = (recs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
};

export default function Subcontracting({ jobOrders = [], vendorMaster = [], toast }) {
  const [records, setRecords] = useState(loadRecords);
  const [view, setView] = useState("list"); // "list" | "form" | "receive"
  const [editId, setEditId] = useState(null);
  const [receiveId, setReceiveId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [search, setSearch] = useState("");

  const blankForm = {
    joRef: "",
    stage: "",
    vendor: "",
    materialDesc: "",
    qtyIssued: "",
    issueDate: today(),
    expectedReturn: "",
    remarks: "",
    priority: "Standard",
  };
  const [form, setForm] = useState(blankForm);
  const [formErrors, setFormErrors] = useState({});

  const blankReceive = { qtyReceived: "", receiveDate: today(), receiveRemarks: "" };
  const [receiveForm, setReceiveForm] = useState(blankReceive);

  const persist = (recs) => {
    setRecords(recs);
    saveRecords(recs);
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.joRef) e.joRef = true;
    if (!form.stage) e.stage = true;
    if (!form.vendor) e.vendor = true;
    if (!form.qtyIssued || Number(form.qtyIssued) <= 0) e.qtyIssued = true;
    if (!form.issueDate) e.issueDate = true;
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast?.("Fill all required fields", "error");
      return;
    }
    // Find JO for priority/client info
    const jo = jobOrders.find((j) => j.joNo === form.joRef || j._id === form.joRef);
    const record = {
      id: editId || uid(),
      joRef: form.joRef,
      joNo: jo?.joNo || form.joRef,
      clientName: jo?.companyName || "",
      stage: form.stage,
      vendor: form.vendor,
      materialDesc: form.materialDesc,
      qtyIssued: Number(form.qtyIssued),
      issueDate: form.issueDate,
      expectedReturn: form.expectedReturn,
      remarks: form.remarks,
      priority: form.priority || jo?.priority || "Standard",
      status: "Issued",
      receipts: [],
      createdAt: editId ? (records.find((r) => r.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    if (editId) {
      const prev = records.find((r) => r.id === editId);
      record.status = prev?.status || "Issued";
      record.receipts = prev?.receipts || [];
      persist(records.map((r) => (r.id === editId ? record : r)));
      toast?.("Record updated", "success");
    } else {
      persist([record, ...records]);
      toast?.("Subcontracting record created", "success");
    }
    setForm(blankForm);
    setEditId(null);
    setView("list");
  };

  const handleReceive = () => {
    if (!receiveForm.qtyReceived || Number(receiveForm.qtyReceived) <= 0) {
      toast?.("Enter received quantity", "error");
      return;
    }
    const updated = records.map((r) => {
      if (r.id !== receiveId) return r;
      const receipts = [
        ...(r.receipts || []),
        {
          id: uid(),
          qty: Number(receiveForm.qtyReceived),
          date: receiveForm.receiveDate,
          remarks: receiveForm.receiveRemarks,
        },
      ];
      const totalReceived = receipts.reduce((s, x) => s + x.qty, 0);
      const status =
        totalReceived >= r.qtyIssued
          ? "Received"
          : totalReceived > 0
          ? "Partially Received"
          : "Issued";
      return { ...r, receipts, status };
    });
    persist(updated);
    toast?.("Receipt recorded", "success");
    setReceiveId(null);
    setReceiveForm(blankReceive);
    setView("list");
  };

  const handleReconcile = (id) => {
    persist(records.map((r) => (r.id === id ? { ...r, status: "Reconciled" } : r)));
    toast?.("Marked as reconciled", "success");
  };

  const handleCancel = (id) => {
    if (!confirm("Cancel this subcontracting record?")) return;
    persist(records.map((r) => (r.id === id ? { ...r, status: "Cancelled" } : r)));
    toast?.("Record cancelled", "success");
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this record permanently?")) return;
    persist(records.filter((r) => r.id !== id));
    toast?.("Deleted", "success");
  };

  const handleEdit = (r) => {
    setForm({
      joRef: r.joRef,
      stage: r.stage,
      vendor: r.vendor,
      materialDesc: r.materialDesc,
      qtyIssued: r.qtyIssued,
      issueDate: r.issueDate,
      expectedReturn: r.expectedReturn || "",
      remarks: r.remarks || "",
      priority: r.priority || "Standard",
    });
    setEditId(r.id);
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus !== "All" && r.status !== filterStatus) return false;
      if (filterStage !== "All" && r.stage !== filterStage) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.joNo?.toLowerCase().includes(q) &&
          !r.vendor?.toLowerCase().includes(q) &&
          !r.clientName?.toLowerCase().includes(q) &&
          !r.stage?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [records, filterStatus, filterStage, search]);

  // Summary stats
  const stats = useMemo(() => {
    const active = records.filter((r) => !["Reconciled", "Cancelled"].includes(r.status));
    const overdue = active.filter((r) => r.expectedReturn && r.expectedReturn < today());
    const totalIssued = active.reduce((s, r) => s + (r.qtyIssued || 0), 0);
    const totalReceived = active.reduce((s, r) => {
      return s + (r.receipts || []).reduce((rs, x) => rs + x.qty, 0);
    }, 0);
    return { active: active.length, overdue: overdue.length, totalIssued, totalReceived };
  }, [records]);

  const vendorNames = useMemo(() => {
    const fromMaster = (vendorMaster || []).map((v) => v.name || v.vendorName).filter(Boolean);
    const fromRecords = records.map((r) => r.vendor).filter(Boolean);
    return [...new Set([...fromMaster, ...fromRecords])];
  }, [vendorMaster, records]);

  const joOptions = useMemo(() => {
    return (jobOrders || [])
      .filter((j) => !["Completed", "Cancelled"].includes(j.status))
      .slice()
      .reverse();
  }, [jobOrders]);

  const errStyle = (key) => ({
    ...inp,
    border: `1px solid ${formErrors[key] ? "#ef4444" : "#2a2a2a"}`,
  });

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Subcontracting</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Track material issued to outside vendors and reconcile returns
          </div>
        </div>
        <button
          onClick={() => { setForm(blankForm); setEditId(null); setView(view === "form" ? "list" : "form"); }}
          style={{
            padding: "8px 18px",
            background: view === "form" ? "transparent" : "#3b82f6",
            border: "1px solid #3b82f6",
            borderRadius: 6,
            color: view === "form" ? "#3b82f6" : "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {view === "form" ? "← Back to List" : "+ Issue to Vendor"}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Active Issues", value: stats.active, color: "#f97316" },
          { label: "Overdue Returns", value: stats.overdue, color: "#ef4444" },
          { label: "Total Qty Issued", value: fmt(stats.totalIssued), color: "#3b82f6" },
          { label: "Total Qty Received", value: fmt(stats.totalReceived), color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: `1px solid ${s.color}33`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Issue form */}
      {view === "form" && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#facc15", marginBottom: 20 }}>
            {editId ? "Edit Subcontracting Record" : "Issue Material to Vendor"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Job Order * </label>
              <select value={form.joRef} onChange={(e) => setF("joRef", e.target.value)} style={errStyle("joRef")}>
                <option value="">-- Select Job Order --</option>
                {joOptions.map((jo) => (
                  <option key={jo._id} value={jo.joNo || jo._id}>
                    {jo.joNo} — {jo.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Stage / Process *</label>
              <select value={form.stage} onChange={(e) => setF("stage", e.target.value)} style={errStyle("stage")}>
                <option value="">-- Select Stage --</option>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Vendor *</label>
              <input
                list="vendor-list"
                value={form.vendor}
                onChange={(e) => setF("vendor", e.target.value)}
                placeholder="Vendor name..."
                style={errStyle("vendor")}
              />
              <datalist id="vendor-list">
                {vendorNames.map((v) => <option key={v} value={v} />)}
              </datalist>
            </div>

            <div>
              <label style={lbl}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setF("priority", e.target.value)}
                style={{ ...inp, color: PRIORITY_COLORS[form.priority] || "#e0e0e0", fontWeight: form.priority !== "Standard" ? 700 : 400 }}
              >
                <option value="VIP">VIP Client</option>
                <option value="Rush">Rush Order</option>
                <option value="Standard">Standard</option>
                <option value="Fill-in">Fill-in</option>
              </select>
            </div>

            <div>
              <label style={lbl}>Material / Description</label>
              <input
                value={form.materialDesc}
                onChange={(e) => setF("materialDesc", e.target.value)}
                placeholder="e.g. 500 sheets for foiling"
                style={inp}
              />
            </div>

            <div>
              <label style={lbl}>Qty Issued *</label>
              <input
                type="number"
                min={1}
                value={form.qtyIssued}
                onChange={(e) => setF("qtyIssued", e.target.value)}
                placeholder="0"
                style={errStyle("qtyIssued")}
              />
            </div>

            <div>
              <label style={lbl}>Issue Date *</label>
              <input type="date" value={form.issueDate} onChange={(e) => setF("issueDate", e.target.value)} style={errStyle("issueDate")} />
            </div>

            <div>
              <label style={lbl}>Expected Return Date</label>
              <input type="date" value={form.expectedReturn} onChange={(e) => setF("expectedReturn", e.target.value)} style={inp} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Remarks</label>
              <input value={form.remarks} onChange={(e) => setF("remarks", e.target.value)} placeholder="Additional notes..." style={inp} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleSubmit}
              style={{ padding: "10px 24px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              {editId ? "Update Record" : "Issue to Vendor"}
            </button>
            <button
              onClick={() => { setForm(blankForm); setEditId(null); setView("list"); }}
              style={{ padding: "10px 18px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Receive form */}
      {view === "receive" && receiveId && (() => {
        const rec = records.find((r) => r.id === receiveId);
        if (!rec) return null;
        const totalReceived = (rec.receipts || []).reduce((s, x) => s + x.qty, 0);
        const remaining = rec.qtyIssued - totalReceived;
        return (
          <div style={{ background: "#111", border: "1px solid #3b82f633", borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>
              Record Receipt — {rec.joNo} / {rec.stage}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
              Vendor: {rec.vendor} · Issued: {fmt(rec.qtyIssued)} · Received so far: {fmt(totalReceived)} · Remaining: {fmt(remaining)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Qty Received *</label>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={receiveForm.qtyReceived}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, qtyReceived: e.target.value }))}
                  placeholder={`Max ${remaining}`}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Date Received</label>
                <input type="date" value={receiveForm.receiveDate} onChange={(e) => setReceiveForm((f) => ({ ...f, receiveDate: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Remarks</label>
                <input value={receiveForm.receiveRemarks} onChange={(e) => setReceiveForm((f) => ({ ...f, receiveRemarks: e.target.value }))} placeholder="e.g. 12 sheets rejected" style={inp} />
              </div>
            </div>

            {/* Past receipts */}
            {(rec.receipts || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Previous Receipts</div>
                {rec.receipts.map((rx, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#aaa", padding: "4px 0", borderBottom: "1px solid #1a1a1a" }}>
                    {fmtDate(rx.date)} — {fmt(rx.qty)} units {rx.remarks && `· ${rx.remarks}`}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleReceive} style={{ padding: "10px 22px", background: "#22c55e", border: "none", borderRadius: 6, color: "#000", fontWeight: 700, cursor: "pointer" }}>
                Record Receipt
              </button>
              <button onClick={() => { setReceiveId(null); setReceiveForm(blankReceive); setView("list"); }} style={{ padding: "10px 16px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* List view */}
      {view === "list" && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20 }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search JO, vendor, stage..."
              style={{ ...inp, maxWidth: 220 }}
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inp, width: "auto" }}>
              <option value="All">All Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ ...inp, width: "auto" }}>
              <option value="All">All Stages</option>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "#555", marginLeft: "auto" }}>{filteredRecords.length} records</span>
          </div>

          {filteredRecords.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", padding: 40, fontSize: 14 }}>
              {records.length === 0 ? "No subcontracting records yet. Issue material to a vendor to start tracking." : "No records match your filters."}
            </div>
          )}

          {filteredRecords.map((r) => {
            const totalReceived = (r.receipts || []).reduce((s, x) => s + x.qty, 0);
            const remaining = r.qtyIssued - totalReceived;
            const pct = r.qtyIssued > 0 ? (totalReceived / r.qtyIssued) * 100 : 0;
            const isOverdue = r.expectedReturn && r.expectedReturn < today() && !["Received", "Reconciled", "Cancelled"].includes(r.status);
            const statusCol = STATUS_COLOR[r.status] || "#888";
            const prioCol = PRIORITY_COLORS[r.priority] || "#888";

            return (
              <div
                key={r.id}
                style={{
                  borderBottom: "1px solid #1a1a1a",
                  padding: "14px 4px",
                  borderLeft: isOverdue ? "3px solid #ef4444" : r.priority === "VIP" ? "3px solid #ef4444" : r.priority === "Rush" ? "3px solid #f97316" : "3px solid transparent",
                  paddingLeft: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", color: "#facc15", fontWeight: 700 }}>{r.joNo}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{r.clientName}</span>
                    <span style={{ padding: "2px 8px", background: "#3b82f622", borderRadius: 4, fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>{r.stage}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>→ <strong style={{ color: "#e0e0e0" }}>{r.vendor}</strong></span>
                    {r.priority && r.priority !== "Standard" && (
                      <span style={{ padding: "2px 6px", background: prioCol + "22", border: `1px solid ${prioCol}44`, borderRadius: 4, fontSize: 10, color: prioCol, fontWeight: 800 }}>
                        {r.priority === "VIP" ? "⭐ VIP" : "⚡ RUSH"}
                      </span>
                    )}
                    <span style={{ padding: "2px 8px", background: statusCol + "22", border: `1px solid ${statusCol}44`, borderRadius: 4, fontSize: 11, color: statusCol, fontWeight: 700 }}>
                      {r.status}
                    </span>
                    {isOverdue && (
                      <span style={{ padding: "2px 8px", background: "#ef444422", borderRadius: 4, fontSize: 11, color: "#ef4444", fontWeight: 800 }}>
                        ⚠ OVERDUE
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!["Reconciled", "Cancelled"].includes(r.status) && (
                      <button
                        onClick={() => { setReceiveId(r.id); setReceiveForm(blankReceive); setView("receive"); }}
                        style={{ padding: "4px 12px", border: "1px solid #22c55e", background: "#22c55e22", color: "#22c55e", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        Receive
                      </button>
                    )}
                    {r.status === "Received" && (
                      <button
                        onClick={() => handleReconcile(r.id)}
                        style={{ padding: "4px 12px", border: "1px solid #3b82f6", background: "#3b82f622", color: "#3b82f6", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        Reconcile
                      </button>
                    )}
                    {!["Reconciled", "Cancelled"].includes(r.status) && (
                      <button
                        onClick={() => handleEdit(r)}
                        style={{ padding: "4px 10px", border: "1px solid #facc1533", background: "#facc1511", color: "#facc15", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                      >
                        ✏️
                      </button>
                    )}
                    {!["Reconciled"].includes(r.status) && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        style={{ padding: "4px 10px", border: "1px solid #6b728033", background: "transparent", color: "#6b7280", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                      >
                        ×
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{ padding: "4px 10px", border: "1px solid #ef444433", background: "transparent", color: "#ef4444", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ flex: 1, height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#22c55e" : pct > 0 ? "#f59e0b" : "#555", borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#888", minWidth: 80, textAlign: "right" }}>
                    {fmt(totalReceived)} / {fmt(r.qtyIssued)} ({pct.toFixed(0)}%)
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#666" }}>
                  <span>Issued: {fmtDate(r.issueDate)}</span>
                  {r.expectedReturn && <span style={{ color: isOverdue ? "#ef4444" : "#666" }}>Expected: {fmtDate(r.expectedReturn)}</span>}
                  {remaining > 0 && !["Received", "Reconciled", "Cancelled"].includes(r.status) && (
                    <span style={{ color: "#f59e0b" }}>Pending: {fmt(remaining)} units</span>
                  )}
                  {r.materialDesc && <span>· {r.materialDesc}</span>}
                  {r.remarks && <span>· {r.remarks}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
