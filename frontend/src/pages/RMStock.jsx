import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Badge,
  ImportBtn,
  ExportBtn,
  TemplateBtn,
  ImportModal,
} from "../components/ui/BasicComponents";
import { rawMaterialStockAPI } from "../api/auth";

const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

export default function RMStock({
  rawStock = [],
  setRawStock,
  itemMasterFG = [],
  session,
  toast,
  refreshData,
  canExportImport = true,
}) {
  const isClient = session?.role === "Client";
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [editingItem, setEditingItem] = useState(null);
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const fileInputRef = useRef(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stock item?"))
      return;
    try {
      await rawMaterialStockAPI.delete(id);
      setRawStock((prev) => prev.filter((s) => s._id !== id && s.id !== id));
      toast?.("Successfully deleted", "success");
    } catch (err) {
      toast?.("Failed to delete", "error");
    }
  };

  const allItems = useMemo(() => {
    const masterItems = itemMasterFG.filter((i) => i.type === "Raw Material");
    const stockMap = new Map();
    (rawStock || []).forEach((s) => {
      if (s.code) stockMap.set(s.code, s);
    });

    return masterItems.map((m) => {
      const s = stockMap.get(m.code);
      return {
        ...m,
        _id: s?._id || m._id,
        isFromMaster: !s,
        qty: s?.qty || 0,
        weight: s?.weight || 0,
        rate: s?.rate || 0,
        reorderLevel: s?.reorderLevel || m.reorderLevel || 0,
        name: m.name,
        category: m.category || m.paperCategory || "",
      };
    });
  }, [itemMasterFG, rawStock]);

  const categories = useMemo(() => {
    const cats = [...new Set(allItems.map((s) => s.category).filter(Boolean))];
    return ["All", ...cats];
  }, [allItems]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q) ||
          (s.code || "").toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "All") {
      list = list.filter((s) => s.category === activeFilter);
    }
    if (!showZeroStock) {
      list = list.filter((s) => (s.qty || 0) > 0 || (s.weight || 0) > 0);
    }
    return list;
  }, [allItems, search, activeFilter, showZeroStock]);

  const handleUpdateReorder = async (item, newVal) => {
    try {
      if (item.isFromMaster) {
        await rawMaterialStockAPI.create({
          ...item,
          reorderLevel: newVal,
        });
      } else {
        await rawMaterialStockAPI.update(item._id || item.id, {
          reorderLevel: newVal,
        });
      }
      if (refreshData) await refreshData();
      toast?.("Reorder level updated", "success");
    } catch (err) {
      toast?.("Failed to update", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      if (editingItem.isFromMaster) {
        await rawMaterialStockAPI.create(editingItem);
      } else {
        const id = editingItem._id || editingItem.id;
        await rawMaterialStockAPI.update(id, editingItem);
      }
      setEditingItem(null);
      toast?.("Item updated successfully", "success");
      if (refreshData) await refreshData();
    } catch (err) {
      toast?.("Failed to save changes", "error");
    }
  };

  const totalItems = filtered.length;
  const totalWeightKg = filtered.reduce(
    (sum, s) => sum + +(s.weight || s.weightKg || 0),
    0,
  );
  const totalValue = filtered.reduce((sum, s) => {
    const weight = +(s.weight || s.weightKg || 0);
    const rate = +(s.rate || 0);
    return sum + weight * rate;
  }, 0);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected item(s)?`)) return;
    try {
      await Promise.allSettled(selectedIds.map((id) => rawMaterialStockAPI.delete(id)));
      setRawStock((prev) => prev.filter((s) => !selectedIds.includes(s._id) && !selectedIds.includes(s.id)));
      setSelectedIds([]);
      toast?.(`${selectedIds.length} item(s) deleted`, "success");
    } catch {
      toast?.("Failed to delete some items", "error");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((i) => i._id || i.id));
    }
  };

  const handleExport = () => {
    const headers = [
      "Code",
      "Material Name",
      "Category",
      "Qty (Sheets/Nos)",
      "Weight (KG)",
      "Reorder (KG)",
      "Rate (₹/KG)",
      "Value (₹)",
    ];
    const rows = filtered.map((s) => [
      s.code || "",
      s.name || s.paperType || "",
      s.category || "",
      s.qty || 0,
      s.weight || 0,
      s.reorderLevel || 0,
      s.rate || 0,
      ((s.weight || 0) * (s.rate || 0)).toFixed(2),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RM Stock");
    XLSX.writeFile(
      workbook,
      `RM_Stock_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const handleExportPDF = () => {
    if (!filtered.length) {
      toast?.("No data to export", "error");
      return;
    }
    const rfmt = (n) => Math.round(+n || 0).toLocaleString("en-IN");
    const totalWt = filtered.reduce((s, r) => s + +(r.weight || 0), 0);
    const totalVal = filtered.reduce((s, r) => s + (+r.weight || 0) * (+r.rate || 0), 0);
    const rowsHtml = filtered
      .map(
        (s) => `
        <tr>
          <td>${s.code || ""}</td>
          <td>${s.name || s.paperType || ""}</td>
          <td>${s.category || ""}</td>
          <td class="num">${fmt(s.qty || 0)}</td>
          <td class="num">${fmt(s.weight || 0)}</td>
          <td class="num">${fmt(s.reorderLevel || 0)}</td>
          <td class="num">${fmt(s.rate || 0)}</td>
          <td class="num">₹${rfmt((s.weight || 0) * (s.rate || 0))}</td>
        </tr>`,
      )
      .join("");
    const html = `
      <html>
        <head>
          <title>RM Stock</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; padding: 20px 30px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 16px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; }
            .doc-title { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .doc-title h2 { margin: 0; font-size: 16px; font-weight: 700; }
            .meta { font-size: 10px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #334155; }
            td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10px; }
            .num { text-align: right; font-family: 'JetBrains Mono', monospace; }
            tfoot td { font-weight: 800; background: #f8fafc; }
            @media print { @page { margin: 1cm; size: A4 landscape; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
            <p>Raw Material Stock Report</p>
          </div>
          <div class="doc-title">
            <h2>RM Stock</h2>
            <div class="meta">Generated: ${new Date().toLocaleString()}<br/>Records: ${filtered.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Material</th><th>Category</th>
                <th class="num">Qty</th><th class="num">Weight (kg)</th><th class="num">Reorder</th>
                <th class="num">Rate</th><th class="num">Value</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="4">Totals</td>
                <td class="num">${fmt(Math.round(totalWt))}</td>
                <td></td><td></td>
                <td class="num">₹${rfmt(totalVal)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
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
              code: (row[0] || "").toString(),
              name: (row[1] || "").toString(),
              category: (row[2] || "").toString(),
              qty: parseFloat(row[3] || 0),
              weight: parseFloat(row[4] || 0),
              reorderLevel: parseFloat(row[5] || 0),
              rate: parseFloat(row[6] || 0),
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

              const existing = (rawStock || []).find(
                (s) =>
                  (item.code && s.code === item.code) ||
                  s.name.toLowerCase().trim() === item.name.toLowerCase().trim(),
              );

              try {
                if (existing) {
                  await rawMaterialStockAPI.adjustStock(
                    existing._id,
                    item.qty,
                    item.weight,
                    "Import Update",
                  );
                  updateCount++;
                } else {
                  await rawMaterialStockAPI.create(item);
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
        console.error("Parse error:", err);
        toast("Failed to parse Excel file", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const ReorderEdit = ({ item }) => {
    const [val, setVal] = useState(item.reorderLevel || "");
    const [saving, setSaving] = useState(false);
    const hasChanged = val !== (item.reorderLevel || "");

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{
            width: 65,
            padding: "6px 8px",
            background: "#0c0c0e",
            border: `1px solid ${hasChanged ? C.yellow : "#2a2a2e"}`,
            borderRadius: 4,
            color: "#fff",
            fontSize: 12,
            outline: "none",
          }}
          placeholder="—"
        />
        {hasChanged && (
          <button
            onClick={async () => {
              setSaving(true);
              await handleUpdateReorder(item, +val);
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px) saturate(180%)",
              WebkitBackdropFilter: "blur(12px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {saving ? "..." : "✓"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Raw Material Stock"
      />
      {editingItem && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyItems: "center",
            zIndex: 1000,
            padding: 20,
            justifyContent: "center",
          }}
        >
          <div
            className="fade-in"
            style={{
              background: "transparent",
              border: "1px solid #2a2a2e",
              borderRadius: 12,
              width: "100%",
              maxWidth: 500,
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px 0",
                fontSize: 18,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Edit Raw Material
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#666",
                    marginBottom: 6,
                  }}
                >
                  NAME
                </label>
                <input
                  value={editingItem.name || editingItem.paperType || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: 10,
                    background: "#0c0c0e",
                    border: "1px solid #2a2a2e",
                    borderRadius: 6,
                    color: "#fff",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    CODE
                  </label>
                  <input
                    value={editingItem.code || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, code: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#0c0c0e",
                      border: "1px solid #2a2a2e",
                      borderRadius: 6,
                      color: "#fff",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    CATEGORY
                  </label>
                  <input
                    value={
                      editingItem.category || editingItem.paperCategory || ""
                    }
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#0c0c0e",
                      border: "1px solid #2a2a2e",
                      borderRadius: 6,
                      color: "#fff",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    QTY (SHEETS)
                  </label>
                  <input
                    type="number"
                    value={editingItem.qty || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, qty: +e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#0c0c0e",
                      border: "1px solid #2a2a2e",
                      borderRadius: 6,
                      color: "#fff",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    WEIGHT (KG)
                  </label>
                  <input
                    type="number"
                    value={editingItem.weight || editingItem.weightKg || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        weight: +e.target.value,
                        weightKg: +e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#0c0c0e",
                      border: "1px solid #2a2a2e",
                      borderRadius: 6,
                      color: "#fff",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    RATE (₹/KG)
                  </label>
                  <input
                    type="number"
                    value={editingItem.rate || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, rate: +e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#0c0c0e",
                      border: "1px solid #2a2a2e",
                      borderRadius: 6,
                      color: "#fff",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    REORDER (KG)
                  </label>
                  <input
                    type="number"
                    value={editingItem.reorderLevel || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        reorderLevel: +e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#0c0c0e",
                      border: "1px solid #2a2a2e",
                      borderRadius: 6,
                      color: "#fff",
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setEditingItem(null)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid #2a2a2e",
                  background: "transparent",
                  color: "#888",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px) saturate(180%)",
                  WebkitBackdropFilter: "blur(12px) saturate(180%)",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 24 }}>📦</span>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          Raw Material Stock
        </h1>
        <button
          onClick={() => setShowZeroStock(!showZeroStock)}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: showZeroStock ? C.blue : "transparent",
            color: "#fff",
            border: `1px solid ${showZeroStock ? C.blue : "#2a2a2e"}`,
            cursor: "pointer",
          }}
        >
          {showZeroStock ? "Hide Zero Stock" : "Show Zero Stock"}
        </button>
      </div>
      <p
        style={{
          color: "#888",
          fontSize: 13,
          marginBottom: 24,
          marginLeft: 36,
        }}
      >
        Live inventory of all raw materials
      </p>

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total Items" val={fmt(totalItems)} color={C.blue} />
        <StatCard
          label="Total Weight (kg)"
          val={fmt(Math.round(totalWeightKg))}
          suffix=" kg"
          color={C.yellow}
        />
        <StatCard
          label="Total Value"
          val={fmt(Math.round(totalValue))}
          prefix="₹"
          color={C.green}
        />
      </div>

      {}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666",
            }}
          >
            🔍
          </span>
          <input
            placeholder="Search material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px 10px 36px",
              background: "transparent",
              border: "1px solid #2a2a2e",
              borderRadius: 6,
              color: "#fff",
              fontSize: 13,
            }}
          />
        </div>
        <TemplateBtn
          onClick={() => {
            const headers = [
              "Code",
              "Material Name",
              "Category",
              "QtySheets",
              "WeightKg",
              "ReorderKg",
              "Rate",
            ];
            const example = [
              "RM001",
              "Sample Paper",
              "Paper Reel",
              "1000",
              "500",
              "100",
              "50",
            ];
            const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
            XLSX.writeFile(workbook, "rm_template.xlsx");
          }}
        />
        {canExportImport && !isClient && (
          <ImportBtn onClick={() => fileInputRef.current?.click()} />
        )}
        {canExportImport && <ExportBtn onClick={handleExport} />}
        {canExportImport && <ExportBtn onClick={handleExportPDF} label="Export PDF" />}
        {!isClient && selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />
            Delete Selected ({selectedIds.length})
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              background: activeFilter === cat ? C.blue : "transparent",
              color: activeFilter === cat ? "#fff" : "#888",
              border: `1px solid ${activeFilter === cat ? C.blue : "#2a2a2e"}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {}
      <div
        style={{
          background: "transparent",
          border: "1px solid #2a2a2e",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #2a2a2e" }}>
              <th style={{ width: 40, padding: "14px 16px" }}>
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selectedIds.length === filtered.length
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
                { label: "CODE", w: 100 },
                { label: "MATERIAL NAME", w: "auto" },
                { label: "CATEGORY", w: 110 },
                { label: "QTY (SHEETS)", w: 110 },
                { label: "QTY (KG)", w: 110 },
                { label: "REORDER (KG)", w: 110 },
                { label: "RATE (₹/KG)", w: 110 },
                { label: "VALUE (₹)", w: 120 },
                { label: "ACTION", w: 130 },
              ].map((h) => (
                <th
                  key={h.label}
                  style={{
                    width: h.w,
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#666",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => {
              const qty = +(s.qty || 0);
              const weight = +(s.weight || s.weightKg || 0);
              const rate = +(s.rate || 0);
              const val = weight * rate;

              return (
                <tr
                  key={s._id || s.id || idx}
                  style={{
                    borderBottom: "1px solid #1e1e22",
                    background: selectedIds.includes(s._id || s.id)
                      ? "rgba(0, 122, 255, 0.05)"
                      : "transparent",
                  }}
                >
                  <td style={{ padding: "16px" }}>
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
                      padding: "16px",
                      color: C.blue,
                      fontWeight: 500,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.code || "—"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 13, color: "#eee" }}
                    >
                      {s.name || s.paperType}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#555",
                        marginTop: 2,
                        textTransform: "uppercase",
                      }}
                    >
                      {s.productCode || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 500,
                        background: C.blue + "22",
                        color: C.blue,
                      }}
                    >
                      {s.category || s.paperCategory || "—"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      color: qty > 0 ? C.green : "#333",
                      fontWeight: 500,
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    {qty > 0 ? fmt(qty) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      color: weight > 0 ? C.green : "#333",
                      fontWeight: 500,
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    {weight > 0 ? `${fmt(weight)} kg` : "—"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <ReorderEdit item={s} />
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      color: "#888",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {rate ? `₹${fmt(rate)}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      color: C.green,
                      fontWeight: 500,
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    {val > 0 ? `₹${fmt(Math.round(val))}` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isClient && (
                        <>
                          <button
                            onClick={() => setEditingItem(s)}
                            style={{
                              padding: "4px 9px",
                              background: "#2196F322",
                              color: "#2196F3",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(s._id || s.id)}
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              backdropFilter: "blur(12px) saturate(180%)",
                              WebkitBackdropFilter: "blur(12px) saturate(180%)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.18)",
                              borderRadius: 6,
                              padding: "4px 14px",
                              fontSize: 12,
                              fontWeight: 500,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                              cursor: "pointer",
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #2a2a2e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "#666" }}>
            {filtered.length} items
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { c: C.red, l: "Low" },
              { c: C.yellow, l: "Moderate" },
              { c: C.green, l: "Adequate" },
            ].map((x) => (
              <div
                key={x.l}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: x.c,
                  }}
                />
                <span style={{ fontSize: 11, color: "#888" }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val, color, prefix = "", suffix = "" }) {
  return (
    <div
      style={{
        background: "transparent",
        border: `1px solid ${color}44`,
        padding: "16px 20px",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color,
          fontFamily: "monospace",
        }}
      >
        {prefix}
        {val}
        {suffix}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#666",
          marginTop: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, color, textColor, border, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        color: textColor,
        border: border ? `1px solid ${border}` : "none",
        padding: "8px 16px",
        borderRadius: 6,
        fontWeight: 500,
        fontSize: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}
