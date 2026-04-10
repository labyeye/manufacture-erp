import React, { useState, useMemo, useRef } from "react";
import { C } from "../constants/colors";
import { Card, SectionTitle, Badge, Field, SubmitBtn, DateRangeFilter } from "../components/ui/BasicComponents";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const TYPE_FILTERS = ["All", "Consumable", "Machine Spare", "Other"];

export default function ConsumableStock({
  consumableStock = [],
  setConsumableStock,
  categoryMaster = {},
  itemMasterFG = {},
  toast,
}) {
  const [view, setView] = useState("stock");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedStock, setSelectedStock] = useState(null);
  const [issueQty, setIssueQty] = useState("");
  const [issueLog, setIssueLog] = useState([]);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const fileInputRef = useRef(null);

  /* ── stats ── */
  const totalItems = consumableStock.length;
  const inStock = consumableStock.filter((s) => (s.qty || 0) > 0).length;
  const outOfStock = consumableStock.filter((s) => (s.qty || 0) <= 0).length;
  const belowReorder = consumableStock.filter(
    (s) => (s.reorderLevel || 0) > 0 && (s.qty || 0) <= (s.reorderLevel || 0),
  ).length;
  const totalValue = consumableStock.reduce(
    (sum, s) => sum + (+(s.qty || 0)) * (+(s.rate || 0)),
    0,
  );

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    let list = consumableStock || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q));
    }
    if (typeFilter !== "All") {
      list = list.filter((s) => (s.type || s.category || "") === typeFilter);
    }
    return list;
  }, [consumableStock, search, typeFilter]);

  /* ── issue item ── */
  const handleIssue = () => {
    if (!selectedStock || !issueQty) { toast("Please select item and enter quantity", "error"); return; }
    const qty = +issueQty;
    if (qty <= 0) { toast("Quantity must be > 0", "error"); return; }
    if (qty > (selectedStock.qty || 0)) { toast(`Insufficient qty. Available: ${selectedStock.qty}`, "error"); return; }

    setConsumableStock((prev) =>
      prev.map((s) => s.id === selectedStock.id ? { ...s, qty: (s.qty || 0) - qty } : s),
    );
    setIssueLog((prev) => [
      { id: uid(), date: today(), itemId: selectedStock.id, itemName: selectedStock.name, qty, category: selectedStock.category || "", issuedBy: "User" },
      ...prev,
    ]);
    toast(`Issued ${qty} units of ${selectedStock.name}`, "success");
    setSelectedStock(null);
    setIssueQty("");
  };

  /* ── export ── */
  const handleExport = () => {
    const headers = ["Code", "Name", "Category", "Type", "Qty", "Unit", "Reorder Level", "Rate (₹)"];
    const rows = (consumableStock || []).map((s) => [s.code || "", s.name || "", s.category || "", s.type || "", s.qty || 0, s.unit || "nos", s.reorderLevel || "", s.rate || ""]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "consumable_stock.csv"; a.click();
    toast && toast("Exported", "success");
  };

  /* ── import ── */
  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const [header, ...rows] = ev.target.result.split("\n").filter(Boolean);
        const keys = header.split(",").map((k) => k.trim().toLowerCase());
        const imported = rows.map((row) => {
          const vals = row.split(",");
          const obj = {}; keys.forEach((k, i) => { obj[k] = vals[i]?.trim() || ""; });
          return { id: uid(), code: obj.code || "", name: obj.name || "", category: obj.category || "", type: obj.type || "Consumable", qty: parseFloat(obj.qty || 0), unit: obj.unit || "nos", reorderLevel: parseFloat(obj["reorder level"] || 0), rate: parseFloat(obj["rate (₹)"] || 0) };
        }).filter((r) => r.name);
        setConsumableStock((prev) => [...prev, ...imported]);
        toast && toast(`Imported ${imported.length} items`, "success");
      } catch { toast && toast("Import failed", "error"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="fade">
      <SectionTitle icon="📦" title="Consumable Stock" sub="Consumables, machine spares and other non-RM inventory" />

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["stock", "📦 Stock"],
          ["issue", "➡️ Issue Item"],
          ["log", `📋 Records (${issueLog.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? C.orange || "#f97316" : C.border}`,
              background: view === v ? C.orange || "#f97316" : "transparent",
              color: view === v ? "#fff" : C.muted,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ════ STOCK VIEW ════ */}
      {view === "stock" && (
        <div>
          {/* ── 5 Stat cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 18 }}>
            <StatCard value={fmt(totalItems)} label="Total Items" color={C.blue || "#3b82f6"} />
            <StatCard value={fmt(inStock)} label="In Stock" color={C.green || "#22c55e"} />
            <StatCard value={fmt(outOfStock)} label="Out of Stock" color={C.red || "#ef4444"} />
            <StatCard value={fmt(belowReorder)} label="Below Reorder" color={C.yellow || "#facc15"} />
            <StatCard value={`₹${fmt(Math.round(totalValue))}`} label="Total Value (₹)" color={C.orange || "#f97316"} />
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>🔍</span>
              <input
                placeholder="Search item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 12px 9px 30px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, background: C.inputBg, color: C.text || "#e5e7eb", boxSizing: "border-box" }}
              />
            </div>
            <ActionBtn label="↓ Template" color="#6366f1" onClick={() => {
              const csv = "Code,Name,Category,Type,Qty,Unit,Reorder Level,Rate (₹)\n,,Consumable,Consumable,0,nos,,";
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "consumable_template.csv"; a.click();
            }} />
            <ActionBtn label="↑ Import Excel" color={C.orange || "#f97316"} onClick={() => fileInputRef.current?.click()} />
            <ActionBtn label="↓ Export Excel" color={C.green || "#22c55e"} onClick={handleExport} />
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />

            {/* Type filters */}
            <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}`, marginLeft: 4 }}>
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: "7px 14px",
                    background: typeFilter === t ? C.blue || "#3b82f6" : "transparent",
                    color: typeFilter === t ? "#fff" : C.muted,
                    fontWeight: typeFilter === t ? 700 : 400,
                    fontSize: 12,
                    border: "none",
                    cursor: "pointer",
                    borderRight: t !== TYPE_FILTERS[TYPE_FILTERS.length - 1] ? `1px solid ${C.border}` : "none",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{filtered.length} items</span>
          </div>

          {/* ── Table / Empty state ── */}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.text || "#e5e7eb" }}>
                  {search ? "No items found" : "No consumable stock yet"}
                </div>
                {!search && (
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Stock auto-updates when you record a GRN with Consumable / Machine Spare / Other items
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["CODE", "NAME", "CATEGORY", "TYPE", "QTY", "UNIT", "REORDER", "RATE (₹)", "VALUE (₹)", "STATUS", ""].map((h) => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: C.muted, background: C.surface }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const low = (s.reorderLevel || 0) > 0 && (s.qty || 0) <= (s.reorderLevel || 0);
                      const out = (s.qty || 0) <= 0;
                      const statusColor = out ? C.red || "#ef4444" : low ? C.orange || "#f97316" : C.green || "#22c55e";
                      const statusLabel = out ? "Out of Stock" : low ? "Low Stock" : "In Stock";
                      return (
                        <tr key={s.id || i} style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 1 ? (C.inputBg || "#ffffff08") : "transparent" }}>
                          <td style={{ padding: "10px 14px", color: C.muted, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{s.code || "—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>{s.category || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12 }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: (C.blue || "#3b82f6") + "22", color: C.blue || "#3b82f6", fontSize: 11, fontWeight: 600 }}>
                              {s.type || "Consumable"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: out ? C.red : C.text || "#e5e7eb" }}>{fmt(s.qty || 0)}</td>
                          <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>{s.unit || "nos"}</td>
                          <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>{s.reorderLevel ? fmt(s.reorderLevel) : "—"}</td>
                          <td style={{ padding: "10px 14px", color: C.muted }}>{s.rate ? `₹${fmt(s.rate)}` : "—"}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: C.green || "#22c55e" }}>{s.rate && s.qty ? `₹${fmt(Math.round((s.qty || 0) * (s.rate || 0)))}` : "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: statusColor + "22", color: statusColor, fontWeight: 600 }}>
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <button
                              onClick={() => { setSelectedStock(s); setView("issue"); }}
                              style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.blue || "#3b82f6"}44`, background: (C.blue || "#3b82f6") + "11", color: C.blue || "#3b82f6", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Issue
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ ISSUE VIEW ════ */}
      {view === "issue" && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.orange || "#f97316", marginBottom: 16 }}>Issue Consumable Item</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
            <Field label="Select Item *">
              <select
                value={selectedStock?.id || ""}
                onChange={(e) => setSelectedStock(consumableStock.find((s) => s.id === e.target.value) || null)}
              >
                <option value="">-- Select Item --</option>
                {consumableStock.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Available: {fmt(s.qty || 0)})</option>
                ))}
              </select>
            </Field>
            {selectedStock && (
              <>
                <Field label="Available Quantity">
                  <div style={{ padding: "9px 12px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                    {fmt(selectedStock.qty || 0)} {selectedStock.unit || "nos"}
                  </div>
                </Field>
                <Field label="Quantity to Issue *">
                  <input type="number" placeholder="Enter quantity" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} />
                </Field>
              </>
            )}
          </div>
          {selectedStock && issueQty && (
            <div style={{ padding: "12px 16px", background: (C.orange || "#f97316") + "11", border: `1px solid ${(C.orange || "#f97316")}44`, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              Issue <strong style={{ color: C.orange || "#f97316" }}>{fmt(+issueQty)}</strong> units of <strong>{selectedStock.name}</strong>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <SubmitBtn label="Issue Item" color={C.green} onClick={handleIssue} />
            <button onClick={() => { setSelectedStock(null); setIssueQty(""); }} style={{ padding: "9px 20px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.inputBg, color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Clear</button>
          </div>
        </Card>
      )}

      {/* ════ LOG VIEW ════ */}
      {view === "log" && (
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, margin: 0 }}>Issue History</h3>
            <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
          </div>
          {issueLog.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No issues recorded yet</div>
          ) : (
            issueLog.map((log) => (
              <div key={log.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 4px", borderBottom: `1px solid ${C.border}22`, fontSize: 13, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.muted, minWidth: 90 }}>{log.date}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{log.itemName}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.orange || "#f97316" }}>-{fmt(log.qty)}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{log.category}</span>
                <span style={{ fontSize: 11, color: C.muted }}>By {log.issuedBy}</span>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div style={{ padding: "16px 18px", border: `1px solid ${color}44`, borderLeft: `3px solid ${color}`, borderRadius: 8, background: color + "08" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "9px 14px", borderRadius: 6, border: "none", background: color, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}