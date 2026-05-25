import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import { stockAdjustmentAPI } from "../api/auth";

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const TYPE_COLORS = {
  Production: { bg: "rgba(99,102,241,0.15)", text: "#818cf8", border: "rgba(99,102,241,0.3)" },
  Inward: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", border: "rgba(34,197,94,0.3)" },
  Outward: { bg: "rgba(239,68,68,0.12)", text: "#f87171", border: "rgba(239,68,68,0.3)" },
};

const STOCK_TYPE_COLORS = {
  "Raw Material": { bg: "rgba(245,158,11,0.12)", text: "#fbbf24" },
  "Finished Goods": { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  Consumable: { bg: "rgba(168,85,247,0.12)", text: "#c084fc" },
};

const EMPTY_FORM = {
  date: today(),
  productCode: "",
  itemName: "",
  adjustmentType: "Inward",
  qty: "",
  weight: "",
  reason: "",
};

export default function StockAdjustment({ itemMasterFG = [], session, toast, refreshData, canCreate = true, canDelete = true }) {
  const isClient = session?.role === "Client";
  const [view, setView] = useState("list");
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [stockTypeFilter, setStockTypeFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);

  const isRM = useMemo(() => {
    const code = (form.productCode || "").toUpperCase();
    return code.startsWith("RM");
  }, [form.productCode]);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await stockAdjustmentAPI.getAll();
      setAdjustments(res.adjustments || []);
    } catch {
      toast?.("Failed to load adjustments", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (typeFilter !== "All") params.adjustmentType = typeFilter;
      if (stockTypeFilter !== "All") params.stockType = stockTypeFilter;
      const res = await stockAdjustmentAPI.getReport(params);
      setReportData(res);
    } catch {
      toast?.("Failed to load report", "error");
    } finally {
      setReportLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const allItems = itemMasterFG.filter((i) =>
      ["Raw Material", "Finished Goods", "Consumable"].includes(i.type)
    );
    const q = codeSearch.toLowerCase();
    return allItems.filter(
      (i) =>
        (i.code || "").toLowerCase().includes(q) ||
        (i.name || "").toLowerCase().includes(q)
    );
  }, [itemMasterFG, codeSearch]);

  const handleSelectItem = (item) => {
    setForm((f) => ({ ...f, productCode: item.code || "", itemName: item.name || "" }));
    setCodeSearch(`${item.code} — ${item.name}`);
    setShowCodeDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productCode) return toast?.("Product code is required", "error");
    if (!form.itemName) return toast?.("Item name is required", "error");
    if (!form.qty || isNaN(Number(form.qty)) || Number(form.qty) <= 0)
      return toast?.("Enter a valid qty greater than 0", "error");

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        productCode: form.productCode,
        itemName: form.itemName,
        adjustmentType: form.adjustmentType,
        qty: Number(form.qty),
        weight: form.weight ? Number(form.weight) : 0,
        reason: form.reason,
      };
      const res = await stockAdjustmentAPI.create(payload);
      setAdjustments((prev) => [res.adjustment, ...prev]);
      toast?.(`Adjustment ${res.adjustment.adjustmentNo} saved`, "success");
      setForm(EMPTY_FORM);
      setCodeSearch("");
      if (refreshData) refreshData();
      setView("list");
    } catch (err) {
      toast?.(err?.response?.data?.error || "Failed to save adjustment", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this adjustment? Stock will be reversed.")) return;
    try {
      await stockAdjustmentAPI.delete(id);
      setAdjustments((prev) => prev.filter((a) => a._id !== id));
      toast?.("Adjustment deleted and stock reversed", "success");
      if (refreshData) refreshData();
    } catch (err) {
      toast?.(err?.response?.data?.error || "Failed to delete", "error");
    }
  };

  const filtered = useMemo(() => {
    let list = adjustments;
    if (typeFilter !== "All") list = list.filter((a) => a.adjustmentType === typeFilter);
    if (stockTypeFilter !== "All") list = list.filter((a) => a.stockType === stockTypeFilter);
    if (dateFrom) list = list.filter((a) => new Date(a.date) >= new Date(dateFrom));
    if (dateTo) list = list.filter((a) => new Date(a.date) <= new Date(dateTo));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.adjustmentNo || "").toLowerCase().includes(q) ||
          (a.productCode || "").toLowerCase().includes(q) ||
          (a.itemName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [adjustments, typeFilter, stockTypeFilter, dateFrom, dateTo, search]);

  const handleExport = () => {
    const rows = filtered.map((a) => ({
      "Adj No": a.adjustmentNo,
      Date: fmtDate(a.date),
      "Product Code": a.productCode,
      "Item Name": a.itemName,
      "Stock Type": a.stockType,
      "Adjustment Type": a.adjustmentType,
      Qty: a.qty,
      Weight: a.weight || "",
      "Before Qty": a.beforeQty,
      "After Qty": a.afterQty,
      "Before Weight": a.beforeWeight || "",
      "After Weight": a.afterWeight || "",
      Reason: a.reason || "",
      "Created By": a.createdBy || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Adjustments");
    XLSX.writeFile(wb, `StockAdjustments_${today()}.xlsx`);
  };

  const handleExportReport = () => {
    if (!reportData?.summary) return;
    const rows = reportData.summary.map((r) => ({
      "Product Code": r.productCode,
      "Item Name": r.itemName,
      "Stock Type": r.stockType,
      "Production Added": r.production,
      "Inward Added": r.inward,
      "Outward Subtracted": r.outward,
      "Net Change": r.net,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Adjustment Report");
    XLSX.writeFile(wb, `AdjustmentReport_${today()}.xlsx`);
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: C.text,
    padding: "9px 12px",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 11, color: C.muted, marginBottom: 4, display: "block", fontWeight: 500, letterSpacing: "0.04em" };

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setView(id)}
      style={{
        padding: "7px 18px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 13,
        background: view === id ? "#6366f1" : "rgba(255,255,255,0.06)",
        color: view === id ? "#fff" : C.muted,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            <i className="fa-solid fa-sliders" style={{ marginRight: 10, color: "#6366f1" }} />
            Stock Adjustment
          </h2>
          <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
            Record discrepancies — adds stock for Production/Inward, subtracts for Outward
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabBtn("list", "Adjustments")}
          {canCreate && tabBtn("new", "New Adjustment")}
          {tabBtn("report", "Report")}
        </div>
      </div>

      {/* NEW ADJUSTMENT FORM */}
      {view === "new" && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24, maxWidth: 640 }}>
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>New Stock Adjustment</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Adjustment Type</label>
                <select
                  style={inputStyle}
                  value={form.adjustmentType}
                  onChange={(e) => setForm((f) => ({ ...f, adjustmentType: e.target.value }))}
                  required
                >
                  <option value="Production">Production (adds stock)</option>
                  <option value="Inward">Inward (adds stock)</option>
                  <option value="Outward">Outward (subtracts stock)</option>
                </select>
              </div>
            </div>

            {/* Product Code selector */}
            <div style={{ marginBottom: 16, position: "relative" }}>
              <label style={labelStyle}>Product Code / Item Name</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Search by code (RM0001) or name..."
                value={codeSearch}
                onChange={(e) => {
                  setCodeSearch(e.target.value);
                  setShowCodeDropdown(true);
                  if (!e.target.value) {
                    setForm((f) => ({ ...f, productCode: "", itemName: "" }));
                  }
                }}
                onFocus={() => setShowCodeDropdown(true)}
                autoComplete="off"
              />
              {showCodeDropdown && codeSearch && filteredItems.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    zIndex: 100,
                    maxHeight: 220,
                    overflowY: "auto",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  {filteredItems.slice(0, 40).map((item) => (
                    <div
                      key={item._id || item.code}
                      onClick={() => handleSelectItem(item)}
                      style={{
                        padding: "9px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ color: C.text }}>{item.name}</span>
                      <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 12 }}>{item.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {form.productCode && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#818cf8", fontWeight: 600 }}>
                  {form.productCode}
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.muted }}>
                  {form.itemName}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isRM ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Qty {isRM ? "(Sheets/Reels)" : "(Units)"}</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  style={inputStyle}
                  placeholder="Enter quantity"
                  value={form.qty}
                  onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  required
                />
              </div>
              {isRM && (
                <div>
                  <label style={labelStyle}>Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    style={inputStyle}
                    placeholder="Enter weight"
                    value={form.weight}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Reason / Remarks</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
                placeholder="Reason for adjustment (optional)"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>

            {/* Info banner */}
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#a5b4fc" }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
              {form.adjustmentType === "Outward"
                ? "Outward will subtract qty from stock."
                : `${form.adjustmentType} will add qty to stock.`}
              {" "}Stock type is auto-detected from the product code prefix (RM/FG/CG).
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? "#4b5563" : "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Adjustment"}
              </button>
              <button
                type="button"
                onClick={() => { setForm(EMPTY_FORM); setCodeSearch(""); setView("list"); }}
                style={{ padding: "10px 18px", background: "rgba(255,255,255,0.06)", color: C.muted, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search code, name, adj no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 220, flex: "none" }}
            />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 160, flex: "none" }}>
              <option value="All">All Types</option>
              <option value="Production">Production</option>
              <option value="Inward">Inward</option>
              <option value="Outward">Outward</option>
            </select>
            <select value={stockTypeFilter} onChange={(e) => setStockTypeFilter(e.target.value)} style={{ ...inputStyle, width: 160, flex: "none" }}>
              <option value="All">All Stock Types</option>
              <option value="Raw Material">Raw Material</option>
              <option value="Finished Goods">Finished Goods</option>
              <option value="Consumable">Consumable</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 140, flex: "none" }} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: 140, flex: "none" }} title="To date" />
            <button
              onClick={handleExport}
              style={{ padding: "9px 16px", background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}
            >
              <i className="fa-solid fa-file-excel" style={{ marginRight: 6 }} />Export
            </button>
            {canCreate && <button
              onClick={() => { setForm(EMPTY_FORM); setCodeSearch(""); setView("new"); }}
              style={{ padding: "9px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />New Adjustment
            </button>}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Total Adjustments", value: filtered.length, color: "#818cf8" },
              { label: "Production", value: filtered.filter((a) => a.adjustmentType === "Production").length, color: "#c084fc" },
              { label: "Inward", value: filtered.filter((a) => a.adjustmentType === "Inward").length, color: "#4ade80" },
              { label: "Outward", value: filtered.filter((a) => a.adjustmentType === "Outward").length, color: "#f87171" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 20px", minWidth: 130 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{fmt(s.value)}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 10 }} />
              <div>Loading adjustments...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <i className="fa-solid fa-sliders" style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 15, marginBottom: 6 }}>No adjustments found</div>
              <div style={{ fontSize: 13 }}>Create a new adjustment to reconcile physical stock</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Adj No", "Date", "Product Code", "Item Name", "Stock Type", "Type", "Qty", "Weight", "Before→After", "Reason", "By", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const tc = TYPE_COLORS[a.adjustmentType] || {};
                    const sc = STOCK_TYPE_COLORS[a.stockType] || {};
                    return (
                      <tr key={a._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "10px 12px", color: "#818cf8", fontWeight: 600 }}>{a.adjustmentNo || "—"}</td>
                        <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(a.date)}</td>
                        <td style={{ padding: "10px 12px", color: "#6366f1", fontWeight: 600 }}>{a.productCode}</td>
                        <td style={{ padding: "10px 12px", color: C.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.itemName}>{a.itemName}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{a.stockType}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                            {a.adjustmentType === "Outward" ? "↓ " : "↑ "}{a.adjustmentType}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: a.adjustmentType === "Outward" ? "#f87171" : "#4ade80", fontWeight: 600 }}>
                          {a.adjustmentType === "Outward" ? "-" : "+"}{fmt(a.qty)}
                        </td>
                        <td style={{ padding: "10px 12px", color: C.muted }}>{a.weight ? fmt(a.weight) + " kg" : "—"}</td>
                        <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap", fontSize: 12 }}>
                          {fmt(a.beforeQty)} → <span style={{ color: C.text, fontWeight: 600 }}>{fmt(a.afterQty)}</span>
                          {a.stockType === "Raw Material" && (a.beforeWeight || a.afterWeight) ? (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{fmt(a.beforeWeight)} → {fmt(a.afterWeight)} kg</div>
                          ) : null}
                        </td>
                        <td style={{ padding: "10px 12px", color: C.muted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.reason}>{a.reason || "—"}</td>
                        <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12 }}>{a.createdBy || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {!isClient && canDelete && (
                            <button
                              onClick={() => handleDelete(a._id)}
                              title="Delete & reverse stock"
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* REPORT VIEW */}
      {view === "report" && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle}>From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 150 }} />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: 150 }} />
            </div>
            <div>
              <label style={labelStyle}>Adjustment Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
                <option value="All">All Types</option>
                <option value="Production">Production</option>
                <option value="Inward">Inward</option>
                <option value="Outward">Outward</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stock Type</label>
              <select value={stockTypeFilter} onChange={(e) => setStockTypeFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
                <option value="All">All</option>
                <option value="Raw Material">Raw Material</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Consumable">Consumable</option>
              </select>
            </div>
            <button
              onClick={fetchReport}
              disabled={reportLoading}
              style={{ padding: "9px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: reportLoading ? "not-allowed" : "pointer" }}
            >
              {reportLoading ? "Loading..." : "Generate Report"}
            </button>
            {reportData && (
              <button
                onClick={handleExportReport}
                style={{ padding: "9px 16px", background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >
                <i className="fa-solid fa-file-excel" style={{ marginRight: 6 }} />Export
              </button>
            )}
          </div>

          {reportData && (
            <>
              {/* Summary cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Total Records", value: reportData.adjustments?.length || 0, color: "#818cf8" },
                  { label: "Items Affected", value: reportData.summary?.length || 0, color: "#60a5fa" },
                  { label: "Total Production", value: reportData.summary?.reduce((s, r) => s + r.production, 0) || 0, color: "#c084fc" },
                  { label: "Total Inward", value: reportData.summary?.reduce((s, r) => s + r.inward, 0) || 0, color: "#4ade80" },
                  { label: "Total Outward", value: reportData.summary?.reduce((s, r) => s + r.outward, 0) || 0, color: "#f87171" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 20px", minWidth: 130 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{fmt(s.value)}</div>
                  </div>
                ))}
              </div>

              <h4 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Item-wise Summary</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Product Code", "Item Name", "Stock Type", "Production Added", "Inward Added", "Outward Subtracted", "Net Change"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, letterSpacing: "0.04em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.summary?.map((r, i) => {
                      const sc = STOCK_TYPE_COLORS[r.stockType] || {};
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "10px 12px", color: "#6366f1", fontWeight: 600 }}>{r.productCode}</td>
                          <td style={{ padding: "10px 12px", color: C.text }}>{r.itemName}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{r.stockType}</span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#c084fc", fontWeight: 600 }}>{fmt(r.production)}</td>
                          <td style={{ padding: "10px 12px", color: "#4ade80", fontWeight: 600 }}>{fmt(r.inward)}</td>
                          <td style={{ padding: "10px 12px", color: "#f87171", fontWeight: 600 }}>{fmt(r.outward)}</td>
                          <td style={{ padding: "10px 12px", color: r.net >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                            {r.net >= 0 ? "+" : ""}{fmt(r.net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detail log */}
              <h4 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "28px 0 12px" }}>Adjustment Log</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Adj No", "Date", "Product Code", "Item Name", "Type", "Qty", "Reason", "By"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.adjustments?.map((a) => {
                      const tc = TYPE_COLORS[a.adjustmentType] || {};
                      return (
                        <tr key={a._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "10px 12px", color: "#818cf8", fontWeight: 600 }}>{a.adjustmentNo}</td>
                          <td style={{ padding: "10px 12px", color: C.muted }}>{fmtDate(a.date)}</td>
                          <td style={{ padding: "10px 12px", color: "#6366f1", fontWeight: 600 }}>{a.productCode}</td>
                          <td style={{ padding: "10px 12px", color: C.text }}>{a.itemName}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                              {a.adjustmentType}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: a.adjustmentType === "Outward" ? "#f87171" : "#4ade80", fontWeight: 600 }}>
                            {a.adjustmentType === "Outward" ? "-" : "+"}{fmt(a.qty)}
                          </td>
                          <td style={{ padding: "10px 12px", color: C.muted }}>{a.reason || "—"}</td>
                          <td style={{ padding: "10px 12px", color: C.muted }}>{a.createdBy || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!reportData && !reportLoading && (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <i className="fa-solid fa-chart-bar" style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 15 }}>Set filters and click Generate Report</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
