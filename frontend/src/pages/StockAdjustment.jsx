import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import { stockAdjustmentAPI, rawMaterialStockAPI } from "../api/auth";
import {
  AutocompleteInput,
  ListToolbar,
  FilterModal,
  Field as FilterField,
  SortSelect,
} from "../components/ui/BasicComponents";
import { StatCard } from "../components/ui/StatCard";

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const TYPE_COLORS = {
  Production: {
    bg: "rgba(174, 180, 238,0.15)",
    text: "#aeb4ee",
    border: "rgba(174, 180, 238,0.3)",
  },
  Inward: {
    bg: "rgba(34,197,94,0.12)",
    text: "#86b894",
    border: "rgba(34,197,94,0.3)",
  },
  Outward: {
    bg: "rgba(239,68,68,0.12)",
    text: "#e0705f",
    border: "rgba(239,68,68,0.3)",
  },
};

const STOCK_TYPE_COLORS = {
  "Raw Material": { bg: "rgba(255,255,255,0.06)", text: "#aeb4ee" },
  "Finished Goods": { bg: "rgba(255,255,255,0.06)", text: "#aeb4ee" },
  Consumable: { bg: "rgba(255,255,255,0.06)", text: "#aeb4ee" },
};

// Short labels for the table: FG, RM, CS
const STOCK_TYPE_ABBR = {
  "Raw Material": "RM",
  "Finished Goods": "FG",
  Consumable: "CS",
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

export default function StockAdjustment({
  itemMasterFG = [],
  session,
  toast,
  refreshData,
  canCreate = true,
  canDelete = true,
}) {
  const isClient = session?.role === "Client";
  const [view, setView] = useState("list");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const importInputRef = useRef(null);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stockTypeFilter, setStockTypeFilter] = useState("");
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

  const [rmStockItems, setRmStockItems] = useState([]);
  const [currentStock, setCurrentStock] = useState(null);
  const [importRows, setImportRows] = useState(null); // parsed Excel rows for preview
  const [importDate, setImportDate] = useState(today());
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetchAdjustments();
    loadRMStock();
  }, []);

  const loadRMStock = async () => {
    try {
      const res = await rawMaterialStockAPI.getAll({});
      setRmStockItems(res.stock || []);
    } catch {
      // non-critical
    }
  };

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

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows = raw
        .map((r) => ({
          itemName: String(
            r["Item Name"] || r["item name"] || r["itemName"] || "",
          ).trim(),
          adjustmentType: String(
            r["Adjustment Type"] ||
              r["adjustment type"] ||
              r["adjustmentType"] ||
              "Inward",
          ).trim(),
          qty: Number(r["Sheets"] || r["sheets"] || r["Qty"] || r["qty"] || 0),
          weight: Number(r["Weight"] || r["weight"] || 0),
        }))
        .filter((r) => r.itemName);
      if (!rows.length) {
        toast?.("No valid rows found in Excel", "error");
        return;
      }
      setImportRows(rows);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleImportSubmit = async () => {
    if (!importRows?.length) return;
    setImportLoading(true);
    try {
      const res = await stockAdjustmentAPI.importBulk(importRows, importDate);
      toast?.(
        res.message,
        res.errors?.length && res.results?.length
          ? "warning"
          : res.errors?.length
            ? "error"
            : "success",
      );
      if (res.results?.length) {
        fetchAdjustments();
        setImportRows(null);
      }
    } catch (err) {
      toast?.(err?.response?.data?.error || "Import failed", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (typeFilter) params.adjustmentType = typeFilter;
      if (stockTypeFilter) params.stockType = stockTypeFilter;
      const res = await stockAdjustmentAPI.getReport(params);
      setReportData(res);
    } catch {
      toast?.("Failed to load report", "error");
    } finally {
      setReportLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = codeSearch.toLowerCase();
    // Item master items (FG, Consumable, RM that are in master)
    const masterItems = itemMasterFG
      .filter((i) =>
        ["Raw Material", "Finished Goods", "Consumable"].includes(i.type),
      )
      .filter(
        (i) =>
          (i.code || "").toLowerCase().includes(q) ||
          (i.name || "").toLowerCase().includes(q),
      );

    // RM stock records (includes items created by GRNs, not in item master)
    const masterCodes = new Set(
      masterItems.map((i) => (i.code || "").toUpperCase()),
    );
    const rmExtra = rmStockItems
      .filter((s) => s.code && !masterCodes.has((s.code || "").toUpperCase()))
      .filter(
        (s) =>
          (s.code || "").toLowerCase().includes(q) ||
          (s.name || "").toLowerCase().includes(q),
      )
      .map((s) => ({
        code: s.code,
        name: s.name,
        type: "Raw Material",
        _id: s._id,
      }));

    return [...masterItems, ...rmExtra];
  }, [itemMasterFG, rmStockItems, codeSearch]);

  const handleSelectItem = (item) => {
    setForm((f) => ({
      ...f,
      productCode: item.code || "",
      itemName: item.name || "",
    }));
    setCodeSearch(`${item.code} — ${item.name}`);
    setShowCodeDropdown(false);
    // Look up current RM stock from already-loaded list (no extra API call needed)
    const found = rmStockItems.find(
      (s) => (s.code || "").toUpperCase() === (item.code || "").toUpperCase(),
    );
    setCurrentStock(found || null);
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
      setCurrentStock(null);
      if (refreshData) refreshData();
      setView("list");
    } catch (err) {
      toast?.(
        err?.response?.data?.error || "Failed to save adjustment",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this adjustment? Stock will be reversed."))
      return;
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
    if (typeFilter) list = list.filter((a) => a.adjustmentType === typeFilter);
    if (stockTypeFilter)
      list = list.filter((a) => a.stockType === stockTypeFilter);
    if (dateFrom)
      list = list.filter((a) => new Date(a.date) >= new Date(dateFrom));
    if (dateTo) list = list.filter((a) => new Date(a.date) <= new Date(dateTo));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.adjustmentNo || "").toLowerCase().includes(q) ||
          (a.productCode || "").toLowerCase().includes(q) ||
          (a.itemName || "").toLowerCase().includes(q),
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

  const labelStyle = {
    fontSize: 11,
    color: C.muted,
    marginBottom: 4,
    display: "block",
    fontWeight: 500,
  };

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setView(id)}
      style={{
        height: 32,
        padding: "0 16px",
        borderRadius: 8,
        border: `1px solid ${view === id ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"}`,
        cursor: "pointer",
        fontWeight: 500,
        fontSize: 13,
        background: view === id ? "#101339" : "transparent",
        color: view === id ? "#dfe2f4" : "#a9aed3",
        transition: "background-color .15s, color .15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="fade">
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        {tabBtn("list", "Adjustments")}
        {canCreate && tabBtn("new", "New adjustment")}
        {tabBtn("report", "Report")}
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleExcelImport}
        />
      </div>

      {/* EXCEL IMPORT PREVIEW MODAL */}
      {importRows && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0b0e2d",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              width: "100%",
              maxWidth: 800,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: C.text }}>
                  <i
                    className="fa-solid fa-file-excel"
                    style={{ color: "#86b894", marginRight: 8 }}
                  />
                  Import Preview — {importRows.length} row
                  {importRows.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  Review before saving. ADJ numbers are auto-generated.
                </div>
              </div>
              <button
                onClick={() => setImportRows(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.muted,
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Date picker */}
            <div
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                Adjustment Date
              </span>
              <input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                style={{
                  padding: "6px 10px",
                  background: "#05071a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  color: C.text,
                  fontSize: 13,
                }}
              />
            </div>

            {/* Table */}
            <div style={{ overflowY: "auto", flex: 1 }}>
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
                      background: "rgba(255,255,255,0.04)",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    {[
                      "#",
                      "Item Name",
                      "Adjustment Type",
                      "Sheets (Qty)",
                      "Weight (kg)",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r, i) => {
                    const typeColor =
                      r.adjustmentType === "Outward" ? "#e0705f" : "#86b894";
                    const valid =
                      r.itemName &&
                      ["Inward", "Outward", "Production"].includes(
                        r.adjustmentType,
                      );
                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: valid
                            ? "transparent"
                            : "rgba(239,68,68,0.06)",
                        }}
                      >
                        <td style={{ padding: "9px 14px", color: C.muted }}>
                          {i + 2}
                        </td>
                        <td
                          style={{
                            padding: "9px 14px",
                            color: C.text,
                            fontWeight: 500,
                          }}
                        >
                          {!valid && (
                            <i
                              className="fa-solid fa-triangle-exclamation"
                              style={{ color: "#e0705f", marginRight: 6 }}
                            />
                          )}
                          {r.itemName || (
                            <span style={{ color: "#e0705f" }}>Missing</span>
                          )}
                        </td>
                        <td style={{ padding: "9px 14px" }}>
                          <span
                            style={{
                              background: `${typeColor}18`,
                              color: typeColor,
                              border: `1px solid ${typeColor}44`,
                              borderRadius: 5,
                              padding: "2px 8px",
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {r.adjustmentType || (
                              <span style={{ color: "#e0705f" }}>Invalid</span>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: "9px 14px", color: C.text }}>
                          {r.qty || "—"}
                        </td>
                        <td style={{ padding: "9px 14px", color: C.text }}>
                          {r.weight || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setImportRows(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: C.muted,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={importLoading}
                style={{
                  padding: "8px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: importLoading
                    ? "rgba(255,255,255,0.08)"
                    : "#86b894",
                  color: importLoading ? C.muted : "#000",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: importLoading ? "not-allowed" : "pointer",
                }}
              >
                {importLoading
                  ? "Saving…"
                  : `Save ${importRows.length} Adjustment${importRows.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ADJUSTMENT FORM */}
      {view === "new" && (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 24,
            maxWidth: 640,
          }}
        >
          <h3
            style={{
              color: C.text,
              fontSize: 16,
              fontWeight: 600,
              margin: "0 0 20px",
            }}
          >
            New Stock Adjustment
          </h3>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Adjustment Type</label>
                <select
                  style={inputStyle}
                  value={form.adjustmentType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adjustmentType: e.target.value }))
                  }
                  required
                >
                  <option value="Inward">Inward (adds stock)</option>
                  <option value="Outward">Outward (subtracts stock)</option>
                  <option value="Production">Production (adds stock)</option>
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
                    background: "#0b0e2d",
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
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(174, 180, 238,0.15)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ color: C.text }}>{item.name}</span>
                      <span
                        style={{
                          color: "#aeb4ee",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {item.code}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {form.productCode && (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      background: "rgba(174, 180, 238,0.12)",
                      border: "1px solid rgba(174, 180, 238,0.3)",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      color: "#aeb4ee",
                      fontWeight: 600,
                    }}
                  >
                    {form.productCode}
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      color: C.muted,
                    }}
                  >
                    {form.itemName}
                  </div>
                </div>

                {/* Current stock — shown for RM items so user knows what they're adjusting */}
                {isRM && currentStock && (
                  <div
                    style={{
                      background: "rgba(234,179,8,0.08)",
                      border: "1px solid rgba(234,179,8,0.25)",
                      borderRadius: 8,
                      padding: "10px 16px",
                      marginBottom: 16,
                      display: "flex",
                      gap: 32,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "#aeb4ee",
                        fontWeight: 600,
                      }}
                    >
                      Current Stock
                    </span>
                    <div>
                      <span style={{ fontSize: 11, color: C.muted }}>Qty </span>
                      <span style={{ fontWeight: 600, color: "#aeb4ee" }}>
                        {(currentStock.qty || 0).toLocaleString("en-IN")} sheets
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        Weight{" "}
                      </span>
                      <span style={{ fontWeight: 600, color: "#aeb4ee" }}>
                        {(currentStock.weight || 0).toLocaleString("en-IN")} kg
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isRM ? "1fr 1fr" : "1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Qty {isRM ? "(Sheets/Reels)" : "(Units)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  style={inputStyle}
                  placeholder="Enter quantity"
                  value={form.qty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, qty: e.target.value }))
                  }
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
                    placeholder="Enter weight in kg"
                    value={form.weight}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, weight: e.target.value }))
                    }
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>

            {/* Info banner */}
            <div
              style={{
                background: "rgba(174, 180, 238,0.08)",
                border: "1px solid rgba(174, 180, 238,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 20,
                fontSize: 12,
                color: "#aeb4ee",
              }}
            >
              <i
                className="fa-solid fa-circle-info"
                style={{ marginRight: 6 }}
              />
              {form.adjustmentType === "Outward"
                ? "Outward will subtract qty from stock."
                : `${form.adjustmentType} will add qty to stock.`}{" "}
              Stock type is auto-detected from the product code prefix
              (RM/FG/CG).
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? "#4b5563" : "#aeb4ee",
                  color: "#dfe2f4",
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
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setCodeSearch("");
                  setView("list");
                }}
                style={{
                  padding: "10px 18px",
                  background: "rgba(255,255,255,0.06)",
                  color: C.muted,
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
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
          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Adjustments",
                value: filtered.length,
                color: "#aeb4ee",
              },
              {
                label: "Production",
                value: filtered.filter((a) => a.adjustmentType === "Production")
                  .length,
                color: "#aeb4ee",
              },
              {
                label: "Inward",
                value: filtered.filter((a) => a.adjustmentType === "Inward")
                  .length,
                color: "#86b894",
              },
              {
                label: "Outward",
                value: filtered.filter((a) => a.adjustmentType === "Outward")
                  .length,
                color: "#e0705f",
              },
            ].map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={fmt(s.value)}
                icon={
                  {
                    "Total Adjustments": "fa-solid fa-sliders",
                    Production: "fa-solid fa-industry",
                    Inward: "fa-solid fa-arrow-down-to-line",
                    Outward: "fa-solid fa-arrow-up-from-line",
                    "Items Affected": "fa-solid fa-boxes-stacked",
                    "Total Production": "fa-solid fa-industry",
                    "Total Inward": "fa-solid fa-arrow-down-to-line",
                    "Total Outward": "fa-solid fa-arrow-up-from-line",
                  }[s.label]
                }
              />
            ))}
          </div>

          <ListToolbar
            search={search}
            setSearch={setSearch}
            placeholder="Search code, name, adj no..."
            count={filtered.length}
            filterCount={
              (typeFilter ? 1 : 0) +
              (stockTypeFilter ? 1 : 0) +
              (dateFrom ? 1 : 0) +
              (dateTo ? 1 : 0)
            }
            onFilter={() => setShowFilterModal(true)}
            exportOptions={[
              {
                label: "Excel",
                icon: "fa-solid fa-file-excel",
                onClick: handleExport,
              },
            ]}
            onAdd={
              canCreate
                ? () => {
                    setForm(EMPTY_FORM);
                    setCodeSearch("");
                    setView("new");
                  }
                : undefined
            }
            addLabel="New adjustment"
            onImport={
              canCreate ? () => importInputRef.current?.click() : undefined
            }
          />

          {showFilterModal && (
            <FilterModal
              onClose={() => setShowFilterModal(false)}
              onReset={() => {
                setTypeFilter("");
                setStockTypeFilter("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              <FilterField label="Adjustment type">
                <SortSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    ["", "All"],
                    ...["Production", "Inward", "Outward"].map((v) => [v, v]),
                  ]}
                />
              </FilterField>
              <FilterField label="Stock type">
                <SortSelect
                  value={stockTypeFilter}
                  onChange={setStockTypeFilter}
                  options={[
                    ["", "All"],
                    ...["Raw Material", "Finished Goods", "Consumable"].map(
                      (v) => [v, v],
                    ),
                  ]}
                />
              </FilterField>
              <FilterField label="From date">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </FilterField>
              <FilterField label="To date">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </FilterField>
            </FilterModal>
          )}

          <div style={{ height: 12 }} />

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{ fontSize: 24, marginBottom: 10 }}
              />
              <div>Loading adjustments...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <i
                className="fa-solid fa-sliders"
                style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}
              />
              <div style={{ fontSize: 15, marginBottom: 6 }}>
                No adjustments found
              </div>
              <div style={{ fontSize: 13 }}>
                Create a new adjustment to reconcile physical stock
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {[
                      "Adj No",
                      "Date",
                      "Product Code",
                      "Item Name",
                      "Stock Type",
                      "Type",
                      "Qty",
                      "Weight",
                      "Before→After",
                      "Reason",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          color: C.muted,
                          fontWeight: 600,
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
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
                      <tr
                        key={a._id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: "10px 12px",
                            color: "#aeb4ee",
                            fontWeight: 600,
                          }}
                        >
                          {a.adjustmentNo || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: C.muted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDate(a.date)}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: "#aeb4ee",
                            fontWeight: 600,
                          }}
                        >
                          {a.productCode}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: C.text,
                            maxWidth: 200,
                          }}
                        >
                          <div
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                              lineHeight: 1.4,
                            }}
                          >
                            {a.itemName}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            title={a.stockType}
                            style={{
                              background: sc.bg,
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: sc.text,
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                          >
                            {STOCK_TYPE_ABBR[a.stockType] || a.stockType}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              background: tc.bg,
                              color: tc.text,
                              border: `1px solid ${tc.border}`,
                              borderRadius: 5,
                              padding: "3px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {a.adjustmentType === "Outward" ? "↓ " : "↑ "}
                            {a.adjustmentType}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color:
                              a.adjustmentType === "Outward"
                                ? "#e0705f"
                                : "#86b894",
                            fontWeight: 600,
                          }}
                        >
                          {a.adjustmentType === "Outward" ? "-" : "+"}
                          {fmt(a.qty)}
                        </td>
                        <td style={{ padding: "10px 12px", color: C.muted }}>
                          {a.weight ? fmt(a.weight) + " kg" : "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: C.muted,
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {fmt(a.beforeQty)} →{" "}
                          <span style={{ color: C.text, fontWeight: 600 }}>
                            {fmt(a.afterQty)}
                          </span>
                          {a.stockType === "Raw Material" &&
                          (a.beforeWeight || a.afterWeight) ? (
                            <div style={{ fontSize: 11, color: "#7b80ad" }}>
                              {fmt(a.beforeWeight)} → {fmt(a.afterWeight)} kg
                            </div>
                          ) : null}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            color: C.muted,
                            maxWidth: 160,
                          }}
                        >
                          <div
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                              lineHeight: 1.4,
                            }}
                          >
                            {a.reason || "—"}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {!isClient && canDelete && (
                            <button
                              onClick={() => handleDelete(a._id)}
                              title="Delete & reverse stock"
                              style={{
                                background: "rgba(239,68,68,0.1)",
                                border: "1px solid rgba(239,68,68,0.25)",
                                color: "#e0705f",
                                borderRadius: 6,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
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
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 20,
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={labelStyle}>From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ ...inputStyle, width: 150 }}
              />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ ...inputStyle, width: 150 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Adjustment Type</label>
              <AutocompleteInput
                value={typeFilter}
                onChange={(v) => setTypeFilter(v)}
                suggestions={["Production", "Inward", "Outward"]}
                placeholder="Filter by type..."
                showAllOnFocus={true}
                inputStyle={{ ...inputStyle, width: 160 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Stock Type</label>
              <AutocompleteInput
                value={stockTypeFilter}
                onChange={(v) => setStockTypeFilter(v)}
                suggestions={["Raw Material", "Finished Goods", "Consumable"]}
                placeholder="Filter by stock type..."
                showAllOnFocus={true}
                inputStyle={{ ...inputStyle, width: 160 }}
              />
            </div>
            <button
              onClick={fetchReport}
              disabled={reportLoading}
              style={{
                padding: "9px 20px",
                background: "#aeb4ee",
                color: "#05071a",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: reportLoading ? "not-allowed" : "pointer",
              }}
            >
              {reportLoading ? "Loading..." : "Generate Report"}
            </button>
            {reportData && (
              <button
                onClick={handleExportReport}
                style={{
                  padding: "9px 16px",
                  background: "rgba(174, 180, 238,0.12)",
                  color: "#aeb4ee",
                  border: "1px solid rgba(174, 180, 238,0.3)",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <i
                  className="fa-solid fa-file-excel"
                  style={{ marginRight: 6 }}
                />
                Export
              </button>
            )}
          </div>

          {reportData && (
            <>
              {/* Summary cards */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                {[
                  {
                    label: "Total Records",
                    value: reportData.adjustments?.length || 0,
                    color: "#aeb4ee",
                  },
                  {
                    label: "Items Affected",
                    value: reportData.summary?.length || 0,
                    color: "#aeb4ee",
                  },
                  {
                    label: "Total Production",
                    value:
                      reportData.summary?.reduce(
                        (s, r) => s + r.production,
                        0,
                      ) || 0,
                    color: "#aeb4ee",
                  },
                  {
                    label: "Total Inward",
                    value:
                      reportData.summary?.reduce((s, r) => s + r.inward, 0) ||
                      0,
                    color: "#86b894",
                  },
                  {
                    label: "Total Outward",
                    value:
                      reportData.summary?.reduce((s, r) => s + r.outward, 0) ||
                      0,
                    color: "#e0705f",
                  },
                ].map((s) => (
                  <StatCard
                    key={s.label}
                    label={s.label}
                    value={fmt(s.value)}
                    icon={
                      {
                        "Total Adjustments": "fa-solid fa-sliders",
                        Production: "fa-solid fa-industry",
                        Inward: "fa-solid fa-arrow-down-to-line",
                        Outward: "fa-solid fa-arrow-up-from-line",
                        "Items Affected": "fa-solid fa-boxes-stacked",
                        "Total Production": "fa-solid fa-industry",
                        "Total Inward": "fa-solid fa-arrow-down-to-line",
                        "Total Outward": "fa-solid fa-arrow-up-from-line",
                      }[s.label]
                    }
                  />
                ))}
              </div>

              <h4
                style={{
                  color: C.text,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Item-wise Summary
              </h4>
              <div style={{ overflowX: "auto" }}>
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
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {[
                        "Product Code",
                        "Item Name",
                        "Stock Type",
                        "Production Added",
                        "Inward Added",
                        "Outward Subtracted",
                        "Net Change",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            color: C.muted,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.summary?.map((r, i) => {
                      const sc = STOCK_TYPE_COLORS[r.stockType] || {};
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(255,255,255,0.02)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#aeb4ee",
                              fontWeight: 600,
                            }}
                          >
                            {r.productCode}
                          </td>
                          <td style={{ padding: "10px 12px", color: C.text }}>
                            {r.itemName}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              title={r.stockType}
                              style={{
                                background: sc.bg,
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: sc.text,
                                borderRadius: 6,
                                padding: "2px 8px",
                                fontSize: 11,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                display: "inline-block",
                              }}
                            >
                              {STOCK_TYPE_ABBR[r.stockType] || r.stockType}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#aeb4ee",
                              fontWeight: 600,
                            }}
                          >
                            {fmt(r.production)}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#86b894",
                              fontWeight: 600,
                            }}
                          >
                            {fmt(r.inward)}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#e0705f",
                              fontWeight: 600,
                            }}
                          >
                            {fmt(r.outward)}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: r.net >= 0 ? "#86b894" : "#e0705f",
                              fontWeight: 600,
                            }}
                          >
                            {r.net >= 0 ? "+" : ""}
                            {fmt(r.net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detail log */}
              <h4
                style={{
                  color: C.text,
                  fontSize: 14,
                  fontWeight: 600,
                  margin: "28px 0 12px",
                }}
              >
                Adjustment Log
              </h4>
              <div style={{ overflowX: "auto" }}>
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
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {[
                        "Adj No",
                        "Date",
                        "Product Code",
                        "Item Name",
                        "Type",
                        "Qty",
                        "Reason",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            color: C.muted,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.adjustments?.map((a) => {
                      const tc = TYPE_COLORS[a.adjustmentType] || {};
                      return (
                        <tr
                          key={a._id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#aeb4ee",
                              fontWeight: 600,
                            }}
                          >
                            {a.adjustmentNo}
                          </td>
                          <td style={{ padding: "10px 12px", color: C.muted }}>
                            {fmtDate(a.date)}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#aeb4ee",
                              fontWeight: 600,
                            }}
                          >
                            {a.productCode}
                          </td>
                          <td style={{ padding: "10px 12px", color: C.text }}>
                            {a.itemName}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                background: tc.bg,
                                color: tc.text,
                                border: `1px solid ${tc.border}`,
                                borderRadius: 5,
                                padding: "3px 8px",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {a.adjustmentType}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color:
                                a.adjustmentType === "Outward"
                                  ? "#e0705f"
                                  : "#86b894",
                              fontWeight: 600,
                            }}
                          >
                            {a.adjustmentType === "Outward" ? "-" : "+"}
                            {fmt(a.qty)}
                          </td>
                          <td style={{ padding: "10px 12px", color: C.muted }}>
                            {a.reason || "—"}
                          </td>
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
              <i
                className="fa-solid fa-chart-bar"
                style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}
              />
              <div style={{ fontSize: 15 }}>
                Set filters and click Generate Report
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
