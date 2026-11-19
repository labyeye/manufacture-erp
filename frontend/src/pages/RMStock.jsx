import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import {
  ListToolbar,
  FilterModal,
  Field,
  SortSelect,
  Card,
  SectionTitle,
  Badge,
  ImportModal,
  InitialsAvatar,
} from "../components/ui/BasicComponents";
import { rawMaterialStockAPI } from "../api/auth";
import { IconBtn } from "../components/ui/IconBtn";
import { StatCard } from "../components/ui/StatCard";

import { fmtLakh } from "../utils/formatINR";

const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

export default function RMStock({
  rawStock = [],
  setRawStock,
  itemMasterFG = [],
  session,
  toast,
  refreshData,
  canExportImport = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const isClient = session?.role === "Client";
  const [search, setSearch] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [stockStatusFilter, setStockStatusFilter] = useState("All");
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
      setRawStock((rawStock || []).filter((s) => s._id !== id && s.id !== id));
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
    if (stockStatusFilter !== "All") {
      list = list.filter((s) => {
        const wt = +(s.weight || s.weightKg || 0);
        const reorder = +(s.reorderLevel || 0);
        if (stockStatusFilter === "In Stock")
          return wt > 0 && (reorder === 0 || wt > reorder);
        if (stockStatusFilter === "Low Stock")
          return wt > 0 && reorder > 0 && wt <= reorder;
        if (stockStatusFilter === "Out of Stock") return wt <= 0;
        return true;
      });
    } else if (!showZeroStock) {
      list = list.filter((s) => (s.qty || 0) > 0 || (s.weight || 0) > 0);
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
  }, [allItems, search, activeFilter, stockStatusFilter, showZeroStock]);

  const applyStockUpdate = (savedStock) => {
    if (!savedStock || !setRawStock) return;
    const current = rawStock || [];
    const idx = current.findIndex((s) => s._id === savedStock._id);
    if (idx >= 0) {
      const next = [...current];
      next[idx] = savedStock;
      setRawStock(next);
    } else {
      setRawStock([...current, savedStock]);
    }
  };

  const handleUpdateReorder = async (item, newVal) => {
    try {
      let res;
      if (item.isFromMaster) {
        res = await rawMaterialStockAPI.create({
          ...item,
          reorderLevel: newVal,
        });
      } else {
        res = await rawMaterialStockAPI.update(item._id || item.id, {
          reorderLevel: newVal,
        });
      }
      applyStockUpdate(res?.stock);
      toast?.("Reorder level updated", "success");
      if (refreshData) refreshData();
    } catch (err) {
      toast?.("Failed to update", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      let res;
      if (editingItem.isFromMaster) {
        res = await rawMaterialStockAPI.create(editingItem);
      } else {
        const id = editingItem._id || editingItem.id;
        res = await rawMaterialStockAPI.update(id, editingItem);
      }
      applyStockUpdate(res?.stock);
      setEditingItem(null);
      toast?.("Item updated successfully", "success");
      if (refreshData) refreshData();
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
    if (!window.confirm(`Delete ${selectedIds.length} selected item(s)?`))
      return;
    try {
      await Promise.allSettled(
        selectedIds.map((id) => rawMaterialStockAPI.delete(id)),
      );
      setRawStock(
        (rawStock || []).filter(
          (s) => !selectedIds.includes(s._id) && !selectedIds.includes(s.id),
        ),
      );
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
    const rfmt = (n) =>
      (+n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const totalWt = filtered.reduce((s, r) => s + +(r.weight || 0), 0);
    const totalVal = filtered.reduce(
      (s, r) => s + (+r.weight || 0) * (+r.rate || 0),
      0,
    );
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
            body { font-family: 'Inter', Arial, sans-serif; padding: 20px 30px; color: #0b0e2d; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 16px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #6f74a0; }
            .doc-title { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .doc-title h2 { margin: 0; font-size: 16px; font-weight: 700; }
            .meta { font-size: 10px; color: #8b90b8; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #c9cdea; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #3a3a3a; }
            td { border: 1px solid #dfe2f4; padding: 5px 8px; font-size: 10px; }
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
                  s.name.toLowerCase().trim() ===
                    item.name.toLowerCase().trim(),
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
            setImportProgress({
              show: false,
              current: 0,
              total: 0,
              status: "",
            });
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
            background: "#05071a",
            border: `1px solid ${hasChanged ? "#aeb4ee" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 4,
            color: "#dfe2f4",
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
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 4,
              color: "#dfe2f4",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
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
              border: "1px solid rgba(255,255,255,0.08)",
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
                fontWeight: 600,
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
                    color: "#6f74a0",
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
                    background: "#05071a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    color: "#dfe2f4",
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
                      color: "#6f74a0",
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
                      background: "#05071a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "#dfe2f4",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6f74a0",
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
                      background: "#05071a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "#dfe2f4",
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
                      color: "#6f74a0",
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
                      background: "#05071a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "#dfe2f4",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6f74a0",
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
                      background: "#05071a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "#dfe2f4",
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
                      color: "#6f74a0",
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
                      background: "#05071a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "#dfe2f4",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6f74a0",
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
                      background: "#05071a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "#dfe2f4",
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
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#8b90b8",
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
                  color: "#dfe2f4",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Items",
            value: fmt(totalItems),
            icon: "fa-solid fa-boxes-stacked",
          },
          {
            label: "Total Weight",
            value: `${fmt(Math.round(totalWeightKg))} kg`,
            icon: "fa-solid fa-weight-hanging",
          },
          {
            label: "Total Value",
            value: fmtLakh(totalValue),
            icon: "fa-solid fa-indian-rupee-sign",
          },
        ].map(({ label, value, icon }) => (
          <StatCard key={label} label={label} value={value} icon={icon} />
        ))}
      </div>

      <ListToolbar
        onSelectModeChange={(on) => {
          if (!on) setSelectedIds([]);
        }}
        search={search}
        setSearch={setSearch}
        placeholder="Search material..."
        count={filtered.length}
        filterCount={
          (activeFilter !== "All" ? 1 : 0) +
          (stockStatusFilter !== "All" ? 1 : 0)
        }
        onFilter={() => setShowFilterModal(true)}
        exportOptions={
          canExportImport
            ? [
                {
                  label: "Excel",
                  icon: "fa-solid fa-file-excel",
                  onClick: handleExport,
                },
                {
                  label: "PDF",
                  icon: "fa-solid fa-file-pdf",
                  onClick: handleExportPDF,
                },
              ]
            : []
        }
        onImport={
          canExportImport && !isClient
            ? () => fileInputRef.current?.click()
            : undefined
        }
        onTemplate={() => {
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={handleImport}
      />

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          onReset={() => {
            setActiveFilter("All");
            setStockStatusFilter("All");
          }}
        >
          <Field label="Category">
            <SortSelect
              value={activeFilter}
              onChange={setActiveFilter}
              options={categories.map((c) => [c, c])}
            />
          </Field>
          <Field label="Stock status">
            <SortSelect
              value={stockStatusFilter}
              onChange={setStockStatusFilter}
              options={["All", "In Stock", "Low Stock", "Out of Stock"].map(
                (v) => [v, v],
              )}
            />
          </Field>
        </FilterModal>
      )}

      {!isClient && selectedIds.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            margin: "12px 0",
            background: "#0b0e2d",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            fontSize: 13,
            color: "#a9aed3",
          }}
        >
          {selectedIds.length} selected
          <button
            type="button"
            className="lg-btn lg-btn-danger"
            onClick={handleBulkDelete}
          >
            <i className="fa-solid fa-trash" /> Delete selected
          </button>
        </div>
      )}

      <div style={{ height: 12 }} />

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
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.muted,
                  whiteSpace: "nowrap",
                  width: 40,
                }}
              >
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
                { label: "Code", w: 100 },
                { label: "Material name", w: 260, grow: true },
                { label: "Category", w: 120 },
                { label: "Qty (sheets)", w: 110 },
                { label: "Qty (kg)", w: 100 },
                { label: "Reorder (kg)", w: 120 },
                { label: "Rate (₹/kg)", w: 110 },
                { label: "Value (₹)", w: 120 },
                { label: "Actions", w: 96, shrink: true },
              ].map((h) => (
                <th
                  key={h.label}
                  style={{
                    width: h.shrink ? "1%" : h.grow ? "auto" : undefined,
                    minWidth: h.w,
                    padding: "10px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.muted,
                    whiteSpace: "nowrap",
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
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: selectedIds.includes(s._id || s.id)
                      ? "rgba(174, 180, 238, 0.06)"
                      : idx % 2 === 0
                        ? "transparent"
                        : "rgba(255,255,255,0.01)",
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
                      padding: "12px 14px",
                      color: "#aeb4ee",
                      fontWeight: 500,
                      fontSize: 12,
                    }}
                  >
                    {s.code || "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <InitialsAvatar name={s.name || s.paperType} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: 13,
                            color: "#dfe2f4",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                            lineHeight: 1.4,
                          }}
                        >
                          {s.name || s.paperType}
                        </div>
                        {s.productCode && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#7b80ad",
                              marginTop: 2,
                            }}
                          >
                            {s.productCode}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#a9aed3",
                      }}
                    >
                      {s.category || s.paperCategory || "—"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: qty > 0 ? "#dfe2f4" : "#7b80ad",
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    {qty > 0 ? fmt(qty) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: weight > 0 ? "#dfe2f4" : "#7b80ad",
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    {weight > 0 ? `${fmt(weight)} kg` : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <ReorderEdit item={s} />
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#a9aed3",
                      fontSize: 12,
                    }}
                  >
                    {rate ? `₹${fmt(rate)}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#86b894",
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    {val > 0 ? `₹${fmt(Math.round(val))}` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isClient && canEdit && (
                        <IconBtn
                          icon="fa-pen-to-square"
                          label="Edit"
                          onClick={() => setEditingItem(s)}
                        />
                      )}
                      {!isClient && canDelete && (
                        <IconBtn
                          icon="fa-trash"
                          label="Delete"
                          danger
                          onClick={() => handleDelete(s._id || s.id)}
                        />
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
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "#7b80ad" }}>
            {filtered.length} items
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { c: "#e0705f", l: "Low" },
              { c: "#e0a84f", l: "Moderate" },
              { c: "#86b894", l: "Adequate" },
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
                <span style={{ fontSize: 11, color: "#a9aed3" }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
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
