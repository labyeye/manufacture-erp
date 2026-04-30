import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import { Card, SectionTitle, Badge, Field, SubmitBtn, DateRangeFilter, ImportBtn, ExportBtn, TemplateBtn, ImportModal } from "../components/ui/BasicComponents";
import { consumableStockAPI, spareIssueLogAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const TYPE_FILTERS = ["All", "Consumable", "Other"];

export default function ConsumableStock({
  consumableStock = [],
  setConsumableStock,
  categoryMaster = [],
  itemMasterFG = [],
  machineMaster = [],
  session,
  toast,
  refreshData,
}) {
  const isClient = session?.role === "Client";
  const [view, setView] = useState("stock");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedStock, setSelectedStock] = useState(null);
  const [issueQty, setIssueQty] = useState("");
  const [issueMachine, setIssueMachine] = useState(null);
  const [issueRemarks, setIssueRemarks] = useState("");
  const [issueCategoryFilter, setIssueCategoryFilter] = useState("");
  const [fetchedLogs, setFetchedLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);

  // Categories from CategoryMaster where type === 'Machine Spare'
  const machineSpareCategories = useMemo(() => {
    const entry = (Array.isArray(categoryMaster) ? categoryMaster : []).find(
      (c) => c.type === "Machine Spare",
    );
    if (!entry) return [];
    const fromSubTypes = entry.subTypes ? Object.keys(entry.subTypes) : [];
    const fromCategories = entry.categories || [];
    const all = [...new Set([...fromCategories, ...fromSubTypes])];
    return all.filter(Boolean).sort();
  }, [categoryMaster]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = {};
      if (drDateFrom) params.from = drDateFrom;
      if (drDateTo) params.to = drDateTo;
      const res = await spareIssueLogAPI.getAll(params);
      setFetchedLogs(res.logs || []);
    } catch {
      // silently fail; logs just won't show
    } finally {
      setLogsLoading(false);
    }
  }, [drDateFrom, drDateTo]);

  useEffect(() => {
    if (view === "log") fetchLogs();
  }, [view, fetchLogs]);

  const allItems = useMemo(() => {
    const masterItems = itemMasterFG.filter(
      (i) => i.type === "Consumable" || i.type === "Other",
    );
    const stockMap = new Map();
    (consumableStock || []).forEach((s) => {
      if (s.code) stockMap.set(s.code, s);
    });

    return masterItems.map((m) => {
      const s = stockMap.get(m.code);
      return {
        ...m,
        _id: s?._id || m._id,
        isFromMaster: !s,
        qty: s?.qty || 0,
        rate: s?.rate || m.rate || 0,
        reorderLevel: s?.reorderLevel || m.reorderLevel || 0,
        unit: s?.unit || m.uom || "nos",
      };
    });
  }, [itemMasterFG, consumableStock]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "All") {
      list = list.filter((s) => (s.type || s.category || "") === typeFilter);
    }
    if (!showZeroStock) {
      list = list.filter((s) => (s.qty || 0) > 0);
    }
    return list;
  }, [allItems, search, typeFilter, showZeroStock]);

  const totalItemsCount = filtered.length;
  const inStockCount = filtered.filter((s) => (s.qty || 0) > 0).length;
  const outOfStockCount = filtered.filter((s) => (s.qty || 0) <= 0).length;
  const belowReorderCount = filtered.filter(
    (s) => (s.reorderLevel || 0) > 0 && (s.qty || 0) <= (s.reorderLevel || 0),
  ).length;
  const totalValueSum = filtered.reduce(
    (sum, s) => sum + +(s.qty || 0) * +(s.rate || 0),
    0,
  );

  
  const handleIssue = async () => {
    if (!selectedStock || !issueQty) {
      toast("Please select item and enter quantity", "error");
      return;
    }
    const qty = +issueQty;
    if (qty <= 0) {
      toast("Quantity must be > 0", "error");
      return;
    }
    if (!selectedStock.isFromMaster && qty > (selectedStock.qty || 0)) {
      toast(`Insufficient qty. Available: ${selectedStock.qty}`, "error");
      return;
    }

    try {
      await spareIssueLogAPI.create({
        itemCode: selectedStock.code,
        itemName: selectedStock.name,
        category: selectedStock.category,
        machineId: issueMachine?._id || issueMachine?.id || undefined,
        machineName: issueMachine?.name || "",
        qty,
        unit: selectedStock.unit || selectedStock.uom || "nos",
        issuedBy: session?.name || session?.username || "",
        remarks: issueRemarks,
        stockId: selectedStock.isFromMaster ? undefined : (selectedStock._id || selectedStock.id),
      });

      toast(`Issued ${qty} units of ${selectedStock.name}${issueMachine ? ` to ${issueMachine.name}` : ""}`, "success");
      setSelectedStock(null);
      setIssueQty("");
      setIssueMachine(null);
      setIssueRemarks("");
      if (refreshData) refreshData();
    } catch (error) {
      const msg = error?.response?.data?.error || "Failed to update stock";
      toast(msg, "error");
      console.error(error);
    }
  };

  
  const handleExport = () => {
    const headers = [
      "Code",
      "Name",
      "Category",
      "Type",
      "Qty",
      "Unit",
      "Reorder Level",
      "Rate (₹)",
    ];
    const rows = filtered.map((s) => [
      s.code || "",
      s.name || "",
      s.category || "",
      s.type || "",
      s.qty || 0,
      s.unit || "nos",
      s.reorderLevel || "",
      s.rate || "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consumables");
    XLSX.writeFile(workbook, "consumable_stock.xlsx");
    toast && toast("Exported as Excel successfully", "success");
  };

  
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const imported = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (row && (row[0] || row[1])) {
            imported.push({
              id: uid(),
              code: (row[0] || "").toString(),
              name: (row[1] || "").toString(),
              category: (row[2] || "").toString(),
              type: (row[3] || "Consumable").toString(),
              qty: parseFloat(row[4] || 0),
              unit: (row[5] || "nos").toString(),
              reorderLevel: parseFloat(row[6] || 0),
              rate: parseFloat(row[7] || 0),
            });
          }
        }

        if (imported.length > 0) {
          setImportProgress({
            show: true,
            current: 0,
            total: imported.length,
            status: "Starting import...",
          });

          (async () => {
            let successCount = 0;
            let updateCount = 0;

            for (let i = 0; i < imported.length; i++) {
              const item = imported[i];
              setImportProgress((p) => ({
                ...p,
                current: i + 1,
                status: `Processing: ${item.name}`,
              }));

              const existing = (consumableStock || []).find(
                (s) =>
                  s.name.toLowerCase().trim() === item.name.toLowerCase().trim(),
              );

              try {
                if (existing) {
                  await consumableStockAPI.adjustStock(existing._id, item.qty);
                  updateCount++;
                } else {
                  await consumableStockAPI.create(item);
                  successCount++;
                }
              } catch (err) {
                console.error(`Failed to process ${item.name}:`, err);
              }
            }

            toast(
              `Import complete: ${successCount} new, ${updateCount} updated`,
              "success",
            );
            setImportProgress({ show: false, current: 0, total: 0, status: "" });
            if (refreshData) refreshData();
          })();
        }
      } catch (err) {
        console.error("Import error:", err);
        toast && toast("Failed to parse Excel file", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="fade">
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Consumable Stock"
      />
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <SectionTitle
          icon="📦"
          title="Consumable Stock"
          sub="Consumables and other non-RM inventory (Machine Spares tracked in Machine &amp; Tooling)"
        />
        <button
          onClick={() => setShowZeroStock(!showZeroStock)}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            background: showZeroStock ? C.blue : "transparent",
            color: showZeroStock ? "#fff" : C.muted,
            border: `1px solid ${showZeroStock ? C.blue : C.border}`,
            cursor: "pointer",
          }}
        >
          {showZeroStock ? "Hide Zero Stock" : "Show Zero Stock"}
        </button>
      </div>

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["stock", "📦 Stock"],
          ["issue", "➡️ Issue Item"],
          ["log", `📋 Records (${fetchedLogs.length})`],
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

      {}
      {view === "stock" && (
        <div>
          {}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 18 }}>
            <StatCard value={fmt(totalItemsCount)} label="Total Items" color={C.blue || "#3b82f6"} />
            <StatCard value={fmt(inStockCount)} label="In Stock" color={C.green || "#22c55e"} />
            <StatCard value={fmt(outOfStockCount)} label="Out of Stock" color={C.red || "#ef4444"} />
            <StatCard value={fmt(belowReorderCount)} label="Below Reorder" color={C.yellow || "#facc15"} />
            <StatCard value={`₹${fmt(Math.round(totalValueSum))}`} label="Total Value (₹)" color={C.orange || "#f97316"} />
          </div>

          {}
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
            <TemplateBtn onClick={() => {
              const headers = ["Code", "Name", "Category", "Type", "Qty", "Unit", "Reorder Level", "Rate (₹)"];
              const example = ["CS001", "Example Item", "General", "Consumable", "0", "nos", "10", "100"];
              const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
              XLSX.writeFile(workbook, "consumable_template.xlsx");
            }} />
            {!isClient && (
              <ImportBtn onClick={() => fileInputRef.current?.click()} />
            )}
            <ExportBtn onClick={handleExport} />
            <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleImport} />

            {}
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

          {}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.text || "#e5e7eb" }}>
                  {search ? "No items found" : "No consumable stock yet"}
                </div>
                {!search && (
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Stock auto-updates when you record a GRN with Consumable or Other items
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ width: 40, padding: "11px 14px" }}>
                        <input
                          type="checkbox"
                          checked={
                            filtered.length > 0 &&
                            selectedIds.length === filtered.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(filtered.map((s) => s._id || s.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </th>
                      {[
                        "CODE",
                        "NAME",
                        "CATEGORY",
                        "TYPE",
                        "QTY",
                        "UNIT",
                        "REORDER",
                        "RATE (₹)",
                        "VALUE (₹)",
                        "STATUS",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "11px 14px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: C.muted,
                            background: C.surface,
                          }}
                        >
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
                        <tr
                          key={s.id || i}
                          style={{
                            borderBottom: `1px solid ${C.border}22`,
                            background: selectedIds.includes(s._id || s.id)
                              ? (C.blue || "#3b82f6") + "11"
                              : i % 2 === 1
                                ? C.inputBg || "#ffffff08"
                                : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px 14px" }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(s._id || s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, s._id || s.id]);
                                } else {
                                  setSelectedIds((prev) =>
                                    prev.filter((id) => id !== (s._id || s.id)),
                                  );
                                }
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontSize: 11,
                              fontFamily: "'JetBrains Mono',monospace",
                            }}
                          >
                            {s.code || "—"}
                          </td>
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
                          <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {!isClient && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedStock(s);
                                  setView("form");
                                  setEditId(s._id || s.id);
                                  setEditData(s);
                                }}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 4,
                                  border: "none",
                                  background: C.blue + "22",
                                  color: C.blue,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(s._id || s.id)}
                                style={{
                                  background: "#450a0a",
                                  color: "#ef4444",
                                  border: "1px solid #7f1d1d",
                                  borderRadius: 6,
                                  padding: "5px 14px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                          {!isClient && (
                            <button
                              onClick={() => {
                                setSelectedStock(s);
                                setView("issue");
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 4,
                                border: `1px solid ${C.blue || "#3b82f6"}44`,
                                background: (C.blue || "#3b82f6") + "11",
                                color: C.blue || "#3b82f6",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Issue
                            </button>
                          )}
                        </div>
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

      {}
      {view === "issue" && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.orange || "#f97316", marginBottom: 16 }}>Issue Spare / Consumable Item</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
            {machineSpareCategories.length > 0 && (
              <Field label="Filter by Category">
                <select
                  value={issueCategoryFilter}
                  onChange={(e) => { setIssueCategoryFilter(e.target.value); setSelectedStock(null); }}
                >
                  <option value="">-- All Categories --</option>
                  {machineSpareCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Select Item *">
              <select
                value={selectedStock?._id || selectedStock?.id || ""}
                onChange={(e) => {
                  const found = allItems.find((s) => (s._id || s.id) === e.target.value);
                  setSelectedStock(found || null);
                }}
              >
                <option value="">-- Select Item --</option>
                {allItems
                  .filter((s) => !issueCategoryFilter || s.category === issueCategoryFilter)
                  .map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name}{s.category ? ` [${s.category}]` : ""} — Avail: {fmt(s.qty || 0)} {s.unit || "nos"}
                    </option>
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
            <Field label="Issue to Machine">
              <select
                value={issueMachine?._id || issueMachine?.id || ""}
                onChange={(e) => {
                  const m = machineMaster.find((m) => (m._id || m.id) === e.target.value);
                  setIssueMachine(m || null);
                }}
              >
                <option value="">-- Select Machine (optional) --</option>
                {(machineMaster || []).filter((m) => m.status === "Active" || !m.status).map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.name}{m.type ? ` (${m.type})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Remarks">
              <input
                type="text"
                placeholder="Purpose / notes (optional)"
                value={issueRemarks}
                onChange={(e) => setIssueRemarks(e.target.value)}
              />
            </Field>
          </div>
          {selectedStock && issueQty && (
            <div style={{ padding: "12px 16px", background: (C.orange || "#f97316") + "11", border: `1px solid ${(C.orange || "#f97316")}44`, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              Issue <strong style={{ color: C.orange || "#f97316" }}>{fmt(+issueQty)}</strong> {selectedStock.unit || "nos"} of <strong>{selectedStock.name}</strong>
              {issueMachine && <> → Machine: <strong style={{ color: C.blue || "#3b82f6" }}>{issueMachine.name}</strong></>}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <SubmitBtn label="Issue Item" color={C.green} onClick={handleIssue} />
            <button
              onClick={() => { setSelectedStock(null); setIssueQty(""); setIssueMachine(null); setIssueRemarks(""); setIssueCategoryFilter(""); }}
              style={{ padding: "9px 20px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.inputBg, color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
        </Card>
      )}

      {}
      {view === "log" && (
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, margin: 0 }}>Spare Issue History</h3>
            <DateRangeFilter dateFrom={drDateFrom} setDateFrom={setDrDateFrom} dateTo={drDateTo} setDateTo={setDrDateTo} />
            <button
              onClick={fetchLogs}
              style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.inputBg, color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {logsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {logsLoading ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>Loading records…</div>
          ) : fetchedLogs.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No issues recorded yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["DATE", "ITEM", "CATEGORY", "QTY", "ISSUED TO MACHINE", "REMARKS", "ISSUED BY"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: C.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fetchedLogs.map((log, i) => (
                    <tr key={log._id || i} style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 1 ? C.inputBg || "#ffffff08" : "transparent" }}>
                      <td style={{ padding: "9px 12px", color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(log.issuedAt)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>
                        {log.itemName}
                        {log.itemCode && <span style={{ fontSize: 10, color: C.muted, marginLeft: 6, fontFamily: "monospace" }}>{log.itemCode}</span>}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: 12, color: C.muted }}>{log.category || "—"}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.orange || "#f97316", whiteSpace: "nowrap" }}>
                        -{fmt(log.qty)} {log.unit || "nos"}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        {log.machineName ? (
                          <span style={{ padding: "2px 8px", borderRadius: 4, background: (C.blue || "#3b82f6") + "22", color: C.blue || "#3b82f6", fontSize: 11, fontWeight: 600 }}>
                            {log.machineName}
                          </span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "9px 12px", color: C.muted, fontSize: 12 }}>{log.remarks || "—"}</td>
                      <td style={{ padding: "9px 12px", color: C.muted, fontSize: 12 }}>{log.issuedBy || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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