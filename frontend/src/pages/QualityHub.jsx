import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";


const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : null);

const LS_FAI = "fai_records";
const LS_VQ  = "vendor_quality_manual"; 

const load = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
const save = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const inp = {
  padding: "9px 12px", border: "1px solid #2a2a2a", borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", background: "#141414",
  color: "#e0e0e0", outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl = {
  fontSize: 11, fontWeight: 600, color: "#666", display: "block",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em",
};
const card = (col) => ({
  background: "#111", border: `1px solid ${col || "#2a2a2a"}22`,
  borderRadius: 10, padding: 20,
});

const TABS = [
  { id: "fai",      icon: "🔬", label: "First Article Inspection" },
  { id: "supplier", icon: "⭐", label: "Supplier Scorecard" },
];

const FAI_STATUS = {
  Pending:     { color: "#f59e0b", label: "Pending Sign-off" },
  Approved:    { color: "#22c55e", label: "Approved" },
  Rejected:    { color: "#ef4444", label: "Rejected" },
  Conditional: { color: "#8b5cf6", label: "Conditional" },
};

const MEASUREMENT_DEFAULTS = [
  { key: "Length (mm)", value: "" },
  { key: "Width (mm)",  value: "" },
  { key: "GSM",         value: "" },
  { key: "Print Score", value: "" },
];




export default function QualityHub({
  jobOrders = [],
  purchaseOrders = [],
  inward = [],
  vendorMaster = [],
  toast,
}) {
  const [tab, setTab] = useState("fai");

  return (
    <div className="fade">
      {}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #2a2a2a", paddingBottom: 0 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 20px", border: "none",
              borderBottom: `2px solid ${active ? "#ff7800" : "transparent"}`,
              background: "transparent",
              color: active ? "#ff7800" : C.muted,
              fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {tab === "fai" && <FAITab jobOrders={jobOrders} toast={toast} />}
      {tab === "supplier" && (
        <SupplierTab
          purchaseOrders={purchaseOrders}
          inward={inward}
          vendorMaster={vendorMaster}
          toast={toast}
        />
      )}
    </div>
  );
}




function FAITab({ jobOrders, toast }) {
  const [records, setRecords] = useState(load(LS_FAI));
  const [view, setView]       = useState("list"); 
  const [editId, setEditId]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const blankForm = {
    joRef: "", sampleNo: "1", inspectorName: "", approverName: "",
    inspectionDate: today(), status: "Pending",
    measurements: MEASUREMENT_DEFAULTS.map((m) => ({ ...m })),
    defects: "", remarks: "", photoDataUrl: "",
  };
  const [form, setForm] = useState(blankForm);

  const persist = (recs) => { setRecords(recs); save(LS_FAI, recs); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const joOptions = useMemo(() =>
    (jobOrders || []).filter((j) => !["Cancelled"].includes(j.status)).slice().reverse(),
    [jobOrders]
  );

  
  const joFAIStatus = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!map[r.joRef] || r.status === "Approved") map[r.joRef] = r.status;
    });
    return map;
  }, [records]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setF("photoDataUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.joRef) { toast?.("Select a job order", "error"); return; }
    if (!form.inspectorName) { toast?.("Enter inspector name", "error"); return; }
    const rec = {
      id: editId || uid(),
      ...form,
      updatedAt: new Date().toISOString(),
      createdAt: editId ? (records.find((r) => r.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };
    if (editId) {
      persist(records.map((r) => (r.id === editId ? rec : r)));
      toast?.("FAI record updated", "success");
    } else {
      persist([rec, ...records]);
      toast?.("FAI record created", "success");
    }
    setForm(blankForm); setEditId(null); setView("list");
  };

  const filteredRecords = useMemo(() =>
    records.filter((r) => filterStatus === "All" || r.status === filterStatus),
    [records, filterStatus]
  );

  return (
    <div>
      {}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>First Article Inspection</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Mandatory sign-off before JO proceeds to full production
          </div>
        </div>
        <button
          onClick={() => { setForm(blankForm); setEditId(null); setView(view === "form" ? "list" : "form"); }}
          style={{ padding: "8px 18px", background: view === "form" ? "transparent" : "#3b82f6", border: "1px solid #3b82f6", borderRadius: 6, color: view === "form" ? "#3b82f6" : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
        >
          {view === "form" ? "← Back to List" : "+ New Inspection"}
        </button>
      </div>

      {}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {Object.entries(FAI_STATUS).map(([s, { color }]) => {
          const n = records.filter((r) => r.status === s).length;
          return n > 0 ? (
            <div key={s} style={{ padding: "4px 12px", background: color + "22", border: `1px solid ${color}44`, borderRadius: 20, fontSize: 12, color, fontWeight: 700, cursor: "pointer" }} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}>
              {s}: {n}
            </div>
          ) : null;
        })}
        {filterStatus !== "All" && (
          <div style={{ padding: "4px 12px", background: "#ffffff11", borderRadius: 20, fontSize: 12, color: "#888", cursor: "pointer" }} onClick={() => setFilterStatus("All")}>
            Clear filter ×
          </div>
        )}
      </div>

      {}
      {view === "form" && (
        <div style={{ ...card("#3b82f6"), marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#facc15", marginBottom: 20 }}>
            {editId ? "Edit FAI Record" : "New First Article Inspection"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Job Order *</label>
              <select value={form.joRef} onChange={(e) => setF("joRef", e.target.value)} style={inp}>
                <option value="">-- Select JO --</option>
                {joOptions.map((jo) => (
                  <option key={jo._id} value={jo.joNo}>{jo.joNo} — {jo.companyName} · {jo.itemName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Sample #</label>
              <input value={form.sampleNo} onChange={(e) => setF("sampleNo", e.target.value)} style={inp} placeholder="e.g. 1" />
            </div>
            <div>
              <label style={lbl}>Inspection Date</label>
              <input type="date" value={form.inspectionDate} onChange={(e) => setF("inspectionDate", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Inspector Name *</label>
              <input value={form.inspectorName} onChange={(e) => setF("inspectorName", e.target.value)} placeholder="Name of inspector" style={inp} />
            </div>
            <div>
              <label style={lbl}>Approver Name</label>
              <input value={form.approverName} onChange={(e) => setF("approverName", e.target.value)} placeholder="Name of approver / sign-off" style={inp} />
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)} style={{ ...inp, color: FAI_STATUS[form.status]?.color || "#e0e0e0", fontWeight: 700 }}>
                {Object.entries(FAI_STATUS).map(([s, { label }]) => (
                  <option key={s} value={s}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...lbl, marginBottom: 10 }}>Measurements</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {form.measurements.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={m.key}
                    onChange={(e) => {
                      const ms = [...form.measurements];
                      ms[i] = { ...ms[i], key: e.target.value };
                      setF("measurements", ms);
                    }}
                    style={{ ...inp, flex: 1, fontSize: 11 }}
                    placeholder="Parameter"
                  />
                  <input
                    value={m.value}
                    onChange={(e) => {
                      const ms = [...form.measurements];
                      ms[i] = { ...ms[i], value: e.target.value };
                      setF("measurements", ms);
                    }}
                    style={{ ...inp, width: 90, fontSize: 11 }}
                    placeholder="Value"
                  />
                  <button onClick={() => setF("measurements", form.measurements.filter((_, j) => j !== i))}
                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
              <button
                onClick={() => setF("measurements", [...form.measurements, { key: "", value: "" }])}
                style={{ padding: "6px 12px", background: "#3b82f622", border: "1px solid #3b82f644", borderRadius: 5, color: "#3b82f6", fontSize: 11, cursor: "pointer" }}
              >
                + Add Parameter
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Defects Found</label>
              <textarea value={form.defects} onChange={(e) => setF("defects", e.target.value)} placeholder="List any defects or non-conformances..." style={{ ...inp, height: 80, resize: "vertical" }} />
            </div>
            <div>
              <label style={lbl}>Remarks / Conditions</label>
              <textarea value={form.remarks} onChange={(e) => setF("remarks", e.target.value)} placeholder="Additional notes, conditional approvals..." style={{ ...inp, height: 80, resize: "vertical" }} />
            </div>
          </div>

          {}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Sample Photo</label>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div>
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ fontSize: 12, color: "#888" }} />
                <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Max ~500KB recommended</div>
              </div>
              {form.photoDataUrl && (
                <img src={form.photoDataUrl} alt="FAI sample" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid #2a2a2a" }} />
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "10px 24px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              {editId ? "Save Changes" : "Submit Inspection"}
            </button>
            <button onClick={() => { setForm(blankForm); setEditId(null); setView("list"); }} style={{ padding: "10px 18px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {}
      {view === "list" && (
        <div style={{ ...card(), background: "#111" }}>
          {filteredRecords.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
              {records.length === 0
                ? "No FAI records yet. Create the first inspection to gate production."
                : "No records match the current filter."}
            </div>
          )}
          {filteredRecords.map((r) => {
            const { color } = FAI_STATUS[r.status] || { color: "#888" };
            const jo = jobOrders.find((j) => j.joNo === r.joRef);
            return (
              <div key={r.id} style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", color: "#facc15", fontWeight: 700 }}>{r.joRef}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{jo?.companyName || ""}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>Sample #{r.sampleNo}</span>
                    <span style={{ padding: "2px 8px", background: color + "22", border: `1px solid ${color}44`, borderRadius: 4, fontSize: 11, color, fontWeight: 700 }}>
                      {r.status}
                    </span>
                    <span style={{ fontSize: 11, color: "#666" }}>
                      {fmtDate(r.inspectionDate)} · {r.inspectorName}
                      {r.approverName && ` · Approved: ${r.approverName}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setForm({ ...r }); setEditId(r.id); setView("form"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{ padding: "4px 10px", border: "1px solid #facc1533", background: "#facc1511", color: "#facc15", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => { if (confirm("Delete?")) { const recs = records.filter((x) => x.id !== r.id); persist(recs); } }}
                      style={{ padding: "4px 10px", border: "1px solid #ef444433", background: "transparent", color: "#ef4444", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
                {}
                {r.measurements?.filter((m) => m.key && m.value).length > 0 && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {r.measurements.filter((m) => m.key && m.value).map((m, i) => (
                      <span key={i} style={{ fontSize: 11, color: "#888" }}>
                        <span style={{ color: "#aaa", fontWeight: 600 }}>{m.key}</span>: {m.value}
                      </span>
                    ))}
                  </div>
                )}
                {r.defects && <div style={{ fontSize: 11, color: "#f59e0b" }}>⚠ Defects: {r.defects}</div>}
                {r.remarks && <div style={{ fontSize: 11, color: "#666" }}>Remarks: {r.remarks}</div>}
                {r.photoDataUrl && (
                  <img src={r.photoDataUrl} alt="Sample" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #2a2a2a", cursor: "pointer" }}
                    onClick={() => window.open(r.photoDataUrl, "_blank")} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {}
      {view === "list" && (
        <div style={{ marginTop: 16, ...card("#f59e0b"), borderColor: "#f59e0b33" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#f59e0b", marginBottom: 10 }}>
            🔬 FAI Gate Status — Active Job Orders
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {jobOrders.filter((j) => !["Completed", "Cancelled"].includes(j.status)).slice(0, 20).map((jo) => {
              const status = joFAIStatus[jo.joNo];
              const col = status === "Approved" ? "#22c55e" : status === "Rejected" ? "#ef4444" : status ? "#8b5cf6" : "#6b7280";
              return (
                <div key={jo._id} style={{ padding: "4px 10px", background: col + "11", border: `1px solid ${col}33`, borderRadius: 5, fontSize: 11 }}>
                  <span style={{ color: "#facc15", fontWeight: 700 }}>{jo.joNo}</span>
                  <span style={{ color: col, fontWeight: 600, marginLeft: 6 }}>
                    {status || "No FAI"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}




function SupplierTab({ purchaseOrders, inward, vendorMaster, toast }) {
  const [manualScores, setManualScores] = useState(() => load(LS_VQ));
  const [editVendor, setEditVendor] = useState(null);
  const [rForm, setRForm] = useState({ responsiveness: "", notes: "" });

  const getVendorName = (po) =>
    typeof po.vendor === "object" ? po.vendor?.name : po.vendor || po.vendorName || "";

  const scores = useMemo(() => {
    
    const vendorPOs = {};
    (purchaseOrders || []).forEach((po) => {
      const v = getVendorName(po);
      if (!v) return;
      if (!vendorPOs[v]) vendorPOs[v] = [];
      vendorPOs[v].push(po);
    });

    
    const inwardByPO = {};
    (inward || []).forEach((g) => {
      const po = g.poNo || g.poRef;
      if (po) { if (!inwardByPO[po]) inwardByPO[po] = []; inwardByPO[po].push(g); }
    });

    return Object.entries(vendorPOs).map(([vendor, pos]) => {
      let onTimeCount = 0, lateCount = 0, totalPOs = pos.length;

      pos.forEach((po) => {
        const grns = inwardByPO[po.poNo] || [];
        const dueDate = po.deliveryDate ? new Date(po.deliveryDate) : null;
        if (!dueDate) return;
        const grnDate = grns.length
          ? new Date(Math.min(...grns.map((g) => +new Date(g.inwardDate || g.createdAt))))
          : null;
        if (grnDate) {
          if (grnDate <= dueDate) onTimeCount++; else lateCount++;
        }
      });

      const deliveredPOs = onTimeCount + lateCount;
      const onTimePct = deliveredPOs > 0 ? Math.round((onTimeCount / deliveredPOs) * 100) : null;

      
      const allItems = pos.flatMap((po) => po.items || []);
      const avgPrice = allItems.length
        ? allItems.reduce((s, it) => {
            const qty = Number(it.qty || it.quantity || 1);
            const amt = Number(it.amount || it.total || 0);
            return s + (qty > 0 ? amt / qty : 0);
          }, 0) / allItems.length
        : null;

      const manual = manualScores.find((m) => m.vendor === vendor);
      const responsiveness = manual?.responsiveness != null ? Number(manual.responsiveness) : null;

      
      let score = 0, components = 0;
      if (onTimePct != null) { score += onTimePct * 0.4; components++; }
      if (responsiveness != null) { score += responsiveness * 0.3; components++; }
      
      const rawScore = components > 0 ? score / (components * 0.7) : null;
      const composite = rawScore != null ? Math.min(100, Math.round(rawScore)) : null;

      const grade = composite == null ? "?" : composite >= 70 ? "A" : composite >= 40 ? "B" : "C";
      const gradeColor = grade === "A" ? "#22c55e" : grade === "B" ? "#f59e0b" : grade === "C" ? "#ef4444" : "#6b7280";

      const action = grade === "A" ? "Concentrate business — preferred vendor"
        : grade === "B" ? "Monitor — improvement plan in place"
        : grade === "C" ? "Review — shortlist replacements"
        : "Insufficient data — gather 3+ GRNs";

      return { vendor, totalPOs, deliveredPOs, onTimePct, avgPrice, responsiveness, composite, grade, gradeColor, action };
    }).sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));
  }, [purchaseOrders, inward, manualScores]);

  const saveResponsiveness = () => {
    if (!editVendor) return;
    const updated = manualScores.filter((m) => m.vendor !== editVendor);
    updated.push({ vendor: editVendor, responsiveness: Number(rForm.responsiveness), notes: rForm.notes });
    save(LS_VQ, updated);
    setManualScores(updated);
    setEditVendor(null);
    toast?.("Score saved", "success");
  };

  const GRADE_COLORS = { A: "#22c55e", B: "#f59e0b", C: "#ef4444" };

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Supplier Quality Scorecard</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
        Computed from {purchaseOrders?.length || 0} POs · {inward?.length || 0} GRNs · Click a vendor to enter responsiveness score
      </div>

      {}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {["A", "B", "C"].map((g) => {
          const count = scores.filter((s) => s.grade === g).length;
          return (
            <div key={g} style={{ ...card(GRADE_COLORS[g]), textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: GRADE_COLORS[g] }}>{g}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{count}</div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {g === "A" ? "Preferred" : g === "B" ? "Monitor" : "Replace"}
              </div>
            </div>
          );
        })}
      </div>

      {}
      {editVendor && (
        <div style={{ ...card("#8b5cf6"), marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>
            Set Responsiveness Score — {editVendor}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={lbl}>Score 0–100</label>
              <input type="number" min={0} max={100} value={rForm.responsiveness} onChange={(e) => setRForm((f) => ({ ...f, responsiveness: e.target.value }))} style={inp} placeholder="e.g. 85" />
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={lbl}>Notes</label>
              <input value={rForm.notes} onChange={(e) => setRForm((f) => ({ ...f, notes: e.target.value }))} style={inp} placeholder="e.g. replies same day, tracks PO proactively" />
            </div>
            <button onClick={saveResponsiveness} style={{ padding: "9px 18px", background: "#8b5cf6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditVendor(null)} style={{ padding: "9px 14px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Vendor", "Grade", "On-Time Delivery", "Responsiveness", "POs", "Score", "Recommended Action"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#666", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #2a2a2a", background: "#0a0a0a", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#555", padding: 40, fontSize: 13 }}>
                No purchase orders found. Supplier scores are computed automatically from PO + GRN data.
              </td></tr>
            )}
            {scores.map((s) => (
              <tr key={s.vendor} style={{ borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}
                onClick={() => { setEditVendor(s.vendor); setRForm({ responsiveness: s.responsiveness ?? "", notes: manualScores.find((m) => m.vendor === s.vendor)?.notes || "" }); }}>
                <td style={{ padding: "12px 12px", fontWeight: 600 }}>{s.vendor}</td>
                <td style={{ padding: "12px 12px" }}>
                  <span style={{ padding: "3px 10px", background: s.gradeColor + "22", border: `1px solid ${s.gradeColor}44`, borderRadius: 4, fontWeight: 900, color: s.gradeColor, fontSize: 13 }}>
                    {s.grade}
                  </span>
                </td>
                <td style={{ padding: "12px 12px" }}>
                  {s.onTimePct != null ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${s.onTimePct}%`, background: s.onTimePct >= 80 ? "#22c55e" : s.onTimePct >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.onTimePct >= 80 ? "#22c55e" : s.onTimePct >= 60 ? "#f59e0b" : "#ef4444" }}>{s.onTimePct}%</span>
                      <span style={{ fontSize: 10, color: "#555" }}>{s.deliveredPOs}/{s.totalPOs} POs</span>
                    </div>
                  ) : <span style={{ color: "#555", fontSize: 11 }}>No GRNs yet</span>}
                </td>
                <td style={{ padding: "12px 12px" }}>
                  {s.responsiveness != null
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: s.responsiveness >= 70 ? "#22c55e" : s.responsiveness >= 40 ? "#f59e0b" : "#ef4444" }}>{s.responsiveness}/100</span>
                    : <span style={{ fontSize: 11, color: "#3b82f6", textDecoration: "underline" }}>Click to score →</span>}
                </td>
                <td style={{ padding: "12px 12px", fontSize: 12, color: "#888" }}>{s.totalPOs}</td>
                <td style={{ padding: "12px 12px" }}>
                  {s.composite != null
                    ? <span style={{ fontSize: 16, fontWeight: 800, color: s.gradeColor }}>{s.composite}</span>
                    : <span style={{ color: "#555", fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: "12px 12px", fontSize: 11, color: "#aaa" }}>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: "#555", marginTop: 12 }}>
        Score = On-Time Delivery (40%) + Responsiveness (30%) + remaining weighted by data available.
        A ≥ 70 · B 40–69 · C &lt; 40. Click any row to enter responsiveness score manually.
      </div>
    </div>
  );
}
