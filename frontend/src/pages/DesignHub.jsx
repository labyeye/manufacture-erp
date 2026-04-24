import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";

/* ─── helpers ─────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const LS_ART   = "artwork_records";
const LS_DIEL  = "dieline_records";

const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const inp = {
  padding: "9px 12px", border: "1px solid #2a2a2a", borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", background: "#141414",
  color: "#e0e0e0", outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl = { fontSize: 11, fontWeight: 600, color: "#666", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" };

const TABS = [
  { id: "artwork",  icon: "🎨", label: "Artwork Approval" },
  { id: "dieline",  icon: "✂️", label: "Dieline Library" },
];

/* Artwork workflow stages */
const ART_STAGES = [
  { id: "received",        label: "Received",         icon: "📥", color: "#6b7280" },
  { id: "internal_review", label: "Internal Review",  icon: "🔍", color: "#3b82f6" },
  { id: "proof_sent",      label: "Proof Sent",       icon: "📤", color: "#8b5cf6" },
  { id: "client_approved", label: "Client Approved",  icon: "✅", color: "#22c55e" },
  { id: "released",        label: "Production Release",icon: "🚀", color: "#f97316" },
  { id: "rejected",        label: "Rejected",         icon: "❌", color: "#ef4444" },
];

const stageOrder = ART_STAGES.filter((s) => s.id !== "rejected").map((s) => s.id);

/* ═══════════════════════════════════════════════════════════ */
export default function DesignHub({ salesOrders = [], jobOrders = [], toast }) {
  const [tab, setTab] = useState("artwork");
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
      {tab === "artwork" && <ArtworkTab salesOrders={salesOrders} jobOrders={jobOrders} toast={toast} />}
      {tab === "dieline" && <DielineTab jobOrders={jobOrders} toast={toast} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ARTWORK APPROVAL
═══════════════════════════════════════════════════════════ */
function ArtworkTab({ salesOrders, jobOrders, toast }) {
  const [records, setRecords] = useState(load(LS_ART));
  const [view, setView]       = useState("list");
  const [editId, setEditId]   = useState(null);
  const [expandId, setExpandId] = useState(null);
  const [filterStage, setFilterStage] = useState("All");

  const blankForm = {
    soRef: "", jobRef: "", artworkName: "", version: "v1",
    clientContact: "", notes: "", fileDataUrl: "", fileName: "",
    currentStage: "received", stageHistory: [],
  };
  const [form, setForm] = useState(blankForm);
  const [advanceUser, setAdvanceUser] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");

  const persist = (r) => { setRecords(r); save(LS_ART, r); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const soOptions = useMemo(() =>
    (salesOrders || []).filter((s) => !["Completed", "Cancelled"].includes(s.status)),
    [salesOrders]
  );

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setF("fileName", file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setF("fileDataUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.artworkName) { toast?.("Enter artwork name", "error"); return; }
    const initialHistory = [{
      stage: "received", date: today(), user: form.clientContact || "System", notes: "Artwork received",
    }];
    const rec = {
      id: editId || uid(),
      ...form,
      stageHistory: editId ? form.stageHistory : initialHistory,
      currentStage: editId ? form.currentStage : "received",
      createdAt: editId ? (records.find((r) => r.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (editId) { persist(records.map((r) => (r.id === editId ? rec : r))); toast?.("Artwork record updated", "success"); }
    else { persist([rec, ...records]); toast?.("Artwork record created", "success"); }
    setForm(blankForm); setEditId(null); setView("list");
  };

  const advanceStage = (rec) => {
    const idx = stageOrder.indexOf(rec.currentStage);
    const nextStage = idx < stageOrder.length - 1 ? stageOrder[idx + 1] : null;
    if (!nextStage) { toast?.("Already at final stage", "info"); return; }
    if (!advanceUser) { toast?.("Enter who is advancing this stage", "error"); return; }
    const newHistory = [
      ...(rec.stageHistory || []),
      { stage: nextStage, date: today(), user: advanceUser, notes: advanceNotes },
    ];
    const updated = { ...rec, currentStage: nextStage, stageHistory: newHistory, updatedAt: new Date().toISOString() };
    persist(records.map((r) => (r.id === rec.id ? updated : r)));
    toast?.(`Advanced to: ${ART_STAGES.find((s) => s.id === nextStage)?.label}`, "success");
    setAdvanceUser(""); setAdvanceNotes("");
  };

  const rejectArtwork = (rec) => {
    if (!advanceUser) { toast?.("Enter who is rejecting", "error"); return; }
    const newHistory = [
      ...(rec.stageHistory || []),
      { stage: "rejected", date: today(), user: advanceUser, notes: advanceNotes || "Rejected" },
    ];
    const updated = { ...rec, currentStage: "rejected", stageHistory: newHistory, updatedAt: new Date().toISOString() };
    persist(records.map((r) => (r.id === rec.id ? updated : r)));
    toast?.("Artwork rejected", "success");
    setAdvanceUser(""); setAdvanceNotes("");
  };

  const versionUp = (rec) => {
    const match = rec.version?.match(/(\d+)$/);
    const num = match ? parseInt(match[1]) + 1 : 2;
    const newVer = `v${num}`;
    const newHistory = [
      ...(rec.stageHistory || []),
      { stage: "received", date: today(), user: "System", notes: `New version ${newVer} uploaded` },
    ];
    const updated = { ...rec, version: newVer, currentStage: "received", stageHistory: newHistory, fileDataUrl: "", fileName: "", updatedAt: new Date().toISOString() };
    persist(records.map((r) => (r.id === rec.id ? updated : r)));
    toast?.(`New version ${newVer} created — artwork reset to Received`, "success");
  };

  const filtered = useMemo(() =>
    records.filter((r) => filterStage === "All" || r.currentStage === filterStage),
    [records, filterStage]
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Artwork Approval Workflow</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Received → Internal Review → Proof Sent → Client Approved → Production Release · Eliminates version conflicts
          </div>
        </div>
        <button onClick={() => { setForm(blankForm); setEditId(null); setView(view === "form" ? "list" : "form"); }}
          style={{ padding: "8px 18px", background: view === "form" ? "transparent" : "#3b82f6", border: "1px solid #3b82f6", borderRadius: 6, color: view === "form" ? "#3b82f6" : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {view === "form" ? "← Back" : "+ New Artwork"}
        </button>
      </div>

      {/* Stage filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["All", ...ART_STAGES.map((s) => s.id)].map((s) => {
          const stg = ART_STAGES.find((x) => x.id === s);
          const n = s === "All" ? records.length : records.filter((r) => r.currentStage === s).length;
          return (
            <button key={s} onClick={() => setFilterStage(filterStage === s ? "All" : s)}
              style={{ padding: "3px 12px", background: filterStage === s ? (stg?.color || "#888") + "33" : "transparent", border: `1px solid ${filterStage === s ? (stg?.color || "#888") : "#2a2a2a"}`, borderRadius: 20, fontSize: 11, color: filterStage === s ? stg?.color || "#fff" : "#666", cursor: "pointer", fontWeight: filterStage === s ? 700 : 400 }}>
              {s === "All" ? `All (${n})` : `${stg?.icon} ${stg?.label} (${n})`}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {view === "form" && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#facc15", marginBottom: 18 }}>{editId ? "Edit Artwork Record" : "Register New Artwork"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Artwork Name *</label>
              <input value={form.artworkName} onChange={(e) => setF("artworkName", e.target.value)} placeholder="e.g. Harsukh Packaging Front" style={inp} />
            </div>
            <div>
              <label style={lbl}>Version</label>
              <input value={form.version} onChange={(e) => setF("version", e.target.value)} placeholder="v1" style={inp} />
            </div>
            <div>
              <label style={lbl}>Sales Order</label>
              <select value={form.soRef} onChange={(e) => setF("soRef", e.target.value)} style={inp}>
                <option value="">-- Link to SO (optional) --</option>
                {soOptions.map((s) => <option key={s._id} value={s.soNo}>{s.soNo} — {s.companyName}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Client Contact</label>
              <input value={form.clientContact} onChange={(e) => setF("clientContact", e.target.value)} placeholder="Who sent the artwork?" style={inp} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Notes</label>
              <input value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Colour references, special instructions..." style={inp} />
            </div>
            <div>
              <label style={lbl}>Artwork File</label>
              <input type="file" onChange={handleFile} style={{ fontSize: 12, color: "#888" }} />
              {form.fileName && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>📎 {form.fileName}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "9px 22px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{editId ? "Save Changes" : "Register Artwork"}</button>
            <button onClick={() => { setForm(blankForm); setEditId(null); setView("list"); }} style={{ padding: "9px 14px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {view === "list" && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>
              {records.length === 0 ? "No artwork records. Register the first artwork to start the approval workflow." : "No records match the filter."}
            </div>
          )}
          {filtered.map((rec) => {
            const stage = ART_STAGES.find((s) => s.id === rec.currentStage) || ART_STAGES[0];
            const idx = stageOrder.indexOf(rec.currentStage);
            const nextStage = idx >= 0 && idx < stageOrder.length - 1 ? ART_STAGES.find((s) => s.id === stageOrder[idx + 1]) : null;
            const canAdvance = rec.currentStage !== "released" && rec.currentStage !== "rejected";
            const isExpanded = expandId === rec.id;

            return (
              <div key={rec.id} style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 4px" }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{rec.artworkName}</span>
                    <span style={{ padding: "1px 8px", background: "#ffffff11", borderRadius: 4, fontSize: 11, color: "#888" }}>{rec.version}</span>
                    {rec.soRef && <span style={{ fontSize: 12, color: "#facc15" }}>{rec.soRef}</span>}
                    <span style={{ padding: "2px 8px", background: stage.color + "22", border: `1px solid ${stage.color}33`, borderRadius: 4, fontSize: 11, color: stage.color, fontWeight: 700 }}>
                      {stage.icon} {stage.label}
                    </span>
                    {rec.clientContact && <span style={{ fontSize: 11, color: "#888" }}>· {rec.clientContact}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpandId(isExpanded ? null : rec.id)}
                      style={{ padding: "4px 10px", border: "1px solid #2a2a2a", background: "transparent", color: "#888", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                      {isExpanded ? "▲ Collapse" : "▼ Timeline"}
                    </button>
                    {rec.fileDataUrl && (
                      <button onClick={() => window.open(rec.fileDataUrl, "_blank")}
                        style={{ padding: "4px 10px", border: "1px solid #8b5cf633", background: "#8b5cf611", color: "#a78bfa", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                        📎 File
                      </button>
                    )}
                    {rec.currentStage === "client_approved" && (
                      <button onClick={() => versionUp(rec)}
                        style={{ padding: "4px 10px", border: "1px solid #f59e0b33", background: "#f59e0b11", color: "#f59e0b", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                        + New Version
                      </button>
                    )}
                    <button onClick={() => { setForm({ ...rec }); setEditId(rec.id); setView("form"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{ padding: "4px 10px", border: "1px solid #facc1533", background: "#facc1511", color: "#facc15", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => { if (confirm("Delete?")) persist(records.filter((r) => r.id !== rec.id)); }}
                      style={{ padding: "4px 10px", border: "1px solid #ef444433", background: "transparent", color: "#ef4444", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  {stageOrder.map((s, i) => {
                    const stg = ART_STAGES.find((x) => x.id === s);
                    const done = stageOrder.indexOf(rec.currentStage) >= i;
                    const isCurrent = rec.currentStage === s;
                    return (
                      <React.Fragment key={s}>
                        <div title={stg?.label} style={{ width: 28, height: 28, borderRadius: "50%", background: done ? stg?.color + "cc" : "#1a1a1a", border: `2px solid ${isCurrent ? stg?.color : done ? stg?.color + "44" : "#2a2a2a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                          {stg?.icon}
                        </div>
                        {i < stageOrder.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: stageOrder.indexOf(rec.currentStage) > i ? "#22c55e44" : "#1a1a1a" }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Advance action */}
                {canAdvance && isExpanded && (
                  <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 10, fontWeight: 700 }}>
                      ADVANCE TO: {nextStage ? `${nextStage.icon} ${nextStage.label}` : "Final Stage"}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <input value={advanceUser} onChange={(e) => setAdvanceUser(e.target.value)} placeholder="Your name *" style={{ ...inp, flex: 1, minWidth: 160 }} />
                      <input value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, flex: 2, minWidth: 200 }} />
                      {nextStage && (
                        <button onClick={() => advanceStage(rec)} style={{ padding: "9px 16px", background: nextStage.color + "22", border: `1px solid ${nextStage.color}44`, color: nextStage.color, borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                          → {nextStage.label}
                        </button>
                      )}
                      {rec.currentStage !== "rejected" && (
                        <button onClick={() => rejectArtwork(rec)} style={{ padding: "9px 16px", background: "#ef444411", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                          ✕ Reject
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {isExpanded && (rec.stageHistory || []).length > 0 && (
                  <div style={{ paddingLeft: 10 }}>
                    {rec.stageHistory.map((h, i) => {
                      const stg = ART_STAGES.find((s) => s.id === h.stage);
                      return (
                        <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 8, fontSize: 12 }}>
                          <span style={{ color: stg?.color || "#888", minWidth: 20 }}>{stg?.icon || "•"}</span>
                          <span style={{ color: stg?.color || "#888", fontWeight: 700, minWidth: 130 }}>{stg?.label || h.stage}</span>
                          <span style={{ color: "#666", minWidth: 90 }}>{fmtDate(h.date)}</span>
                          <span style={{ color: "#888" }}>{h.user}</span>
                          {h.notes && <span style={{ color: "#555" }}>· {h.notes}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DIELINE LIBRARY
═══════════════════════════════════════════════════════════ */
function DielineTab({ jobOrders, toast }) {
  const [dielines, setDielines] = useState(load(LS_DIEL));
  const [view, setView]         = useState("list");
  const [editId, setEditId]     = useState(null);
  const [search, setSearch]     = useState("");

  const blankForm = {
    dieCode: "", description: "", dimensions: "", clientTags: "",
    machineCompatible: "", notes: "", previewDataUrl: "", previewFileName: "",
    lastUsedDate: today(),
  };
  const [form, setForm] = useState(blankForm);

  const persist = (d) => { setDielines(d); save(LS_DIEL, d); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePreview = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setF("previewFileName", file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setF("previewDataUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.dieCode) { toast?.("Enter a die code", "error"); return; }
    const rec = { id: editId || uid(), ...form, updatedAt: new Date().toISOString() };
    if (editId) { persist(dielines.map((d) => (d.id === editId ? rec : d))); toast?.("Dieline updated", "success"); }
    else { persist([rec, ...dielines]); toast?.("Dieline added to library", "success"); }
    setForm(blankForm); setEditId(null); setView("list");
  };

  // Count JOs using each die code
  const dieUsageMap = useMemo(() => {
    const map = {};
    (jobOrders || []).forEach((jo) => {
      const code = jo.dieCode || jo.dieline;
      if (code) { map[code] = (map[code] || 0) + 1; }
    });
    return map;
  }, [jobOrders]);

  const filtered = useMemo(() =>
    dielines.filter((d) => !search || [d.dieCode, d.description, d.dimensions, d.clientTags, d.machineCompatible].join(" ").toLowerCase().includes(search.toLowerCase())),
    [dielines, search]
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Dieline Library</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Cutting patterns as versioned assets · dimensions · compatible machines · client history</div>
        </div>
        <button onClick={() => { setForm(blankForm); setEditId(null); setView(view === "form" ? "list" : "form"); }}
          style={{ padding: "8px 18px", background: view === "form" ? "transparent" : "#3b82f6", border: "1px solid #3b82f6", borderRadius: 6, color: view === "form" ? "#3b82f6" : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {view === "form" ? "← Back" : "+ Add Dieline"}
        </button>
      </div>

      {view === "form" && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#facc15", marginBottom: 18 }}>{editId ? "Edit Dieline" : "Add Dieline to Library"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
            <div><label style={lbl}>Die Code *</label><input value={form.dieCode} onChange={(e) => setF("dieCode", e.target.value)} placeholder="e.g. DIE-2412-A3" style={inp} /></div>
            <div><label style={lbl}>Description</label><input value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="e.g. Retail Box 500g" style={inp} /></div>
            <div><label style={lbl}>Dimensions (W × H × D)</label><input value={form.dimensions} onChange={(e) => setF("dimensions", e.target.value)} placeholder="e.g. 120 × 80 × 40 mm" style={inp} /></div>
            <div><label style={lbl}>Compatible Machine</label><input value={form.machineCompatible} onChange={(e) => setF("machineCompatible", e.target.value)} placeholder="e.g. Automatic Die Cutting" style={inp} /></div>
            <div><label style={lbl}>Client Tags</label><input value={form.clientTags} onChange={(e) => setF("clientTags", e.target.value)} placeholder="Comma-separated clients" style={inp} /></div>
            <div><label style={lbl}>Last Used Date</label><input type="date" value={form.lastUsedDate} onChange={(e) => setF("lastUsedDate", e.target.value)} style={inp} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><input value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Material thickness, special notes..." style={inp} /></div>
            <div>
              <label style={lbl}>Preview / Drawing</label>
              <input type="file" accept="image/*,.pdf" onChange={handlePreview} style={{ fontSize: 12, color: "#888" }} />
              {form.previewFileName && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>📎 {form.previewFileName}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{ padding: "9px 22px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{editId ? "Save" : "Add Dieline"}</button>
            <button onClick={() => { setForm(blankForm); setEditId(null); setView("list"); }} style={{ padding: "9px 14px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {view === "list" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search die code, description, client..." style={{ ...inp, maxWidth: 320 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#555", padding: 40 }}>
                {dielines.length === 0 ? "No dielines in library. Add cutting patterns to start tracking." : "No results."}
              </div>
            )}
            {filtered.map((d) => {
              const usage = dieUsageMap[d.dieCode] || 0;
              return (
                <div key={d.id} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
                  {d.previewDataUrl && (
                    <img src={d.previewDataUrl} alt={d.dieCode} style={{ width: "100%", height: 120, objectFit: "contain", background: "#0a0a0a", cursor: "pointer" }}
                      onClick={() => window.open(d.previewDataUrl, "_blank")} />
                  )}
                  {!d.previewDataUrl && (
                    <div style={{ width: "100%", height: 80, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✂️</div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{d.dieCode}</div>
                    {d.description && <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>{d.description}</div>}
                    {d.dimensions && (
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>📐 {d.dimensions}</div>
                    )}
                    {d.machineCompatible && (
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>⚙️ {d.machineCompatible}</div>
                    )}
                    {d.clientTags && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {d.clientTags.split(",").map((c, i) => (
                          <span key={i} style={{ padding: "1px 6px", background: "#3b82f611", border: "1px solid #3b82f622", borderRadius: 10, fontSize: 10, color: "#60a5fa" }}>{c.trim()}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a1a1a" }}>
                      <div style={{ fontSize: 10, color: "#555" }}>
                        Last used: {fmtDate(d.lastUsedDate)} · {usage} JO{usage !== 1 ? "s" : ""}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setForm({ ...d }); setEditId(d.id); setView("form"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          style={{ padding: "3px 8px", border: "1px solid #facc1533", background: "#facc1511", color: "#facc15", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>✏️</button>
                        <button onClick={() => { if (confirm("Delete?")) persist(dielines.filter((x) => x.id !== d.id)); }}
                          style={{ padding: "3px 8px", border: "1px solid #ef444433", background: "transparent", color: "#ef4444", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                    {d.notes && <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>{d.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
