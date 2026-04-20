import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { fgStockAPI } from "../api/auth";
import {
  ImportBtn,
  ExportBtn,
  TemplateBtn,
} from "../components/ui/BasicComponents";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);

const inputStyle = {
  padding: "8px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#141414",
  color: "#e0e0e0",
  outline: "none",
};

export default function FGStock({
  fgStock = [],
  setFgStock,
  session,
  toast,
  refreshData,
}) {
  const isClient = session?.role === "Client";
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpdateReorder = async (id, newVal) => {
    try {
      await fgStockAPI.update(id, { reorder: newVal });
      setFgStock((prev) =>
        prev.map((s) => (s._id === id ? { ...s, reorder: newVal } : s)),
      );
      toast("Reorder level updated", "success");
    } catch (err) {
      toast("Failed to update reorder level", "error");
    }
  };

  const handleUpdatePrice = async (id, newVal) => {
    try {
      await fgStockAPI.update(id, { price: newVal });
      setFgStock((prev) =>
        prev.map((s) => (s._id === id ? { ...s, price: newVal } : s)),
      );
      toast("Price updated", "success");
    } catch (err) {
      toast("Failed to update price", "error");
    }
  };

  const ReorderEdit = ({ item }) => {
    const [val, setVal] = useState(item.reorder || "");
    const [saving, setSaving] = useState(false);
    const hasChanged = val !== (item.reorder || "") && val !== "";

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "flex-end",
        }}
      >
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          readOnly={isClient}
          style={{
            width: 65,
            padding: "5px 8px",
            background: "#0c0c0e",
            border: `1px solid ${hasChanged && !isClient ? "#FF9800" : "#2a2a2e"}`,
            borderRadius: 4,
            color: "#fff",
            fontSize: 12,
            outline: "none",
            textAlign: "right",
          }}
          placeholder="—"
        />
        {!isClient && hasChanged && (
          <button
            onClick={async () => {
              setSaving(true);
              await handleUpdateReorder(item._id, +val);
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: "#4CAF50",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            {saving ? "..." : "✓"}
          </button>
        )}
      </div>
    );
  };

  const PriceEdit = ({ item }) => {
    const [val, setVal] = useState(item.price || "");
    const [saving, setSaving] = useState(false);
    const hasChanged = val !== (item.price || "") && val !== "";

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "flex-end",
        }}
      >
        <input
          type="number"
          step="0.01"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          readOnly={isClient}
          style={{
            width: 75,
            padding: "5px 8px",
            background: "#0c0c0e",
            border: `1px solid ${hasChanged && !isClient ? "#2196F3" : "#2a2a2e"}`,
            borderRadius: 4,
            color: "#2196F3",
            fontSize: 12,
            fontWeight: 700,
            outline: "none",
            textAlign: "right",
          }}
          placeholder="0.00"
        />
        {!isClient && hasChanged && (
          <button
            onClick={async () => {
              setSaving(true);
              await handleUpdatePrice(item._id, +val);
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: "#2196F3",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            {saving ? "..." : "✓"}
          </button>
        )}
      </div>
    );
  };

  const QtyEdit = ({ item }) => {
    const [val, setVal] = useState(item.qty || 0);
    const [saving, setSaving] = useState(false);
    const hasChanged = Number(val) !== (item.qty || 0);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "flex-end",
        }}
      >
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          readOnly={isClient}
          style={{
            width: 80,
            padding: "5px 8px",
            background: "#0c0c0e",
            border: `1px solid ${hasChanged && !isClient ? "#4CAF50" : "#2a2a2e"}`,
            borderRadius: 4,
            color: hasChanged && !isClient ? "#4CAF50" : "#e0e0e0",
            fontSize: 12,
            fontWeight: 700,
            outline: "none",
            textAlign: "right",
          }}
        />
        {!isClient && hasChanged && (
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await fgStockAPI.update(item._id, { qty: +val });
                setFgStock((prev) =>
                  prev.map((s) =>
                    s._id === item._id ? { ...s, qty: +val } : s,
                  ),
                );
                toast("Quantity updated", "success");
              } catch (err) {
                toast("Failed to update qty", "error");
              }
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: "#4CAF50",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            {saving ? "..." : "✓"}
          </button>
        )}
      </div>
    );
  };

  const categories = useMemo(
    () => [...new Set((fgStock || []).map((s) => s.category).filter(Boolean))],
    [fgStock],
  );

  const filtered = useMemo(
    () =>
      (fgStock || []).filter((s) => {
        const matchSearch =
          !search ||
          s.itemName?.toLowerCase().includes(search.toLowerCase()) ||
          s.code?.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === "All" || s.category === filterCat;
        return matchSearch && matchCat;
      }),
    [fgStock, search, filterCat],
  );

  const totalItems = filtered.length;
  const inStock = filtered.filter((s) => (s.qty || 0) > 0).length;
  const totalQty = filtered.reduce((sum, s) => sum + (s.qty || 0), 0);
  const totalValue = filtered.reduce(
    (sum, s) => sum + (s.qty || 0) * (s.price || 0),
    0,
  );

  const handleExport = () => {
    if (!fgStock.length) {
      toast("No data to export", "error");
      return;
    }
    const header = [
      "Code",
      "Item Name",
      "Category",
      "Company Cat",
      "Qty",
      "Reorder",
      "Price",
      "Value",
    ];
    const rows = fgStock.map((s) => [
      s.itemCode || s.code || "",
      s.itemName || "",
      s.category || "",
      s.companyCat || "",
      s.qty || 0,
      s.reorder || 0,
      s.price || 0,
      (s.qty || 0) * (s.price || 0),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FG Stock");
    XLSX.writeFile(workbook, `fg_stock_${today().slice(0, 10)}.xlsx`);

    toast("Exported as Excel successfully", "success");
  };

  const handleTemplate = () => {
    const header = [
      "Code",
      "Item Name",
      "Category",
      "Company Cat",
      "Qty",
      "Reorder",
      "Price",
      "Value",
    ];
    const example = [
      "FG001",
      "Example Finished Good",
      "Category Name",
      "Company Name",
      "1000",
      "100",
      "2.50",
      "2500",
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([header, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "fg_stock_template.xlsx");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const importedItems = [];

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (row && (row[0] || row[1])) {
            importedItems.push({
              code: (row[0] || "").toString(),
              itemName: (row[1] || "").toString(),
              category: (row[2] || "").toString(),
              companyCat: (row[3] || "").toString(),
              qty: parseFloat(row[4] || 0),
              reorder: parseFloat(row[5] || 0),
              price: parseFloat(row[6] || 0),
            });
          }
        }

        if (importedItems.length > 0) {
          toast(`Processing ${importedItems.length} items...`, "info");
          let successCount = 0;
          let updateCount = 0;

          for (const item of importedItems) {
            const existing = (fgStock || []).find(
              (s) =>
                s.itemName.toLowerCase().trim() ===
                item.itemName.toLowerCase().trim(),
            );

            try {
              if (existing) {
                await fgStockAPI.adjustStock(existing._id, item.qty);
                updateCount++;
              } else {
                await fgStockAPI.create(item);
                successCount++;
              }
            } catch (err) {
              console.error(`Failed to process ${item.itemName}:`, err);
            }
          }

          toast(
            `Import complete: ${successCount} new, ${updateCount} updated`,
            "success",
          );
          if (refreshData) refreshData();
        } else {
          toast("No valid data found in file", "error");
        }
      } catch (err) {
        console.error("Import error:", err);
        toast("Failed to parse Excel file", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const statCards = [
    {
      label: "Total Items",
      value: totalItems,
      color: "#9C27B0",
      borderColor: "#9C27B0",
    },
    {
      label: "In Stock",
      value: inStock,
      color: "#4CAF50",
      borderColor: "#4CAF50",
    },
    {
      label: "Total Qty",
      value: `${totalQty.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      color: "#2196F3",
      borderColor: "#2196F3",
    },
    {
      label: "Total Value",
      value: `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      color: "#FF9800",
      borderColor: "#FF9800",
    },
  ];

  return (
    <div className="fade">
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}
        >
          🎪 FG Stock
        </h2>
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
          Finished goods inventory — all items from Item Master
        </p>
      </div>

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#1a1a1a",
              border: `1px solid ${card.borderColor}44`,
              borderRadius: 10,
              padding: "16px 18px",
              borderTop: `2px solid ${card.borderColor}`,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: card.color,
                lineHeight: 1,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          style={{ ...inputStyle, width: 200 }}
          placeholder="🔍 Search item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TemplateBtn onClick={handleTemplate} />
        {!isClient && (
          <ImportBtn onClick={() => fileInputRef.current?.click()} />
        )}
        <ExportBtn onClick={handleExport} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          style={{
            ...inputStyle,
            width: 250,
            cursor: "pointer",
            fontWeight: 700,
            background: filterCat !== "All" ? "#2196F311" : "#141414",
            borderColor: filterCat !== "All" ? "#2196F3" : "#2a2a2a",
          }}
        >
          <option value="All">All Categories ({fgStock.length})</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #2a2a2a",
                  background: "#111",
                }}
              >
                {[
                  "CODE",
                  "ITEM NAME",
                  "CATEGORY",
                  "COMPANY CAT.",
                  "IN STOCK",
                  "QTY",
                  "REORDER",
                  "PRICE (₹)",
                  "VALUE (₹)",
                  ...(!isClient ? ["ACTION"] : []),
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: [
                        "QTY",
                        "REORDER",
                        "PRICE (₹)",
                        "VALUE (₹)",
                      ].includes(h)
                        ? "right"
                        : "left",
                      padding: "10px 14px",
                      fontWeight: 600,
                      color: "#555",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      textAlign: "center",
                      padding: "60px 0",
                      color: "#444",
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🎪</div>
                    <div style={{ fontSize: 13 }}>
                      No items yet. Add items to Item Master → Finished Goods.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const value = (s.qty || 0) * (s.price || 0);
                  const isLow =
                    (s.reorder || 0) > 0 && (s.qty || 0) <= (s.reorder || 0);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #1e1e1e" }}>
                      <td
                        style={{
                          padding: "10px 14px",
                          color: "#666",
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        {s.itemCode ||
                          (s.code && !s.code.startsWith("JO-") ? s.code : "-")}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 600,
                          color: "#e0e0e0",
                        }}
                      >
                        {s.itemName}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            background: "#7B1FA222",
                            color: "#CE93D8",
                          }}
                        >
                          {s.category || "-"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          color: "#777",
                          fontSize: 11,
                        }}
                      >
                        {s.companyCat || "-"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              (s.qty || 0) > 0 ? "#4CAF5022" : "#f4433622",
                            color: (s.qty || 0) > 0 ? "#4CAF50" : "#f44336",
                          }}
                        >
                          {(s.qty || 0) > 0 ? "Yes" : "No"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: isLow ? "#f44336" : "#e0e0e0",
                        }}
                      >
                        <QtyEdit item={s} />
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "#555",
                        }}
                      >
                        <ReorderEdit item={s} />
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "#888",
                        }}
                      >
                        <PriceEdit item={s} />
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: "#FF9800",
                        }}
                      >
                        ₹
                        {value.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      {!isClient && (
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
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
                                fontWeight: 700,
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm("Delete this item from stock?")) {
                                  try {
                                    if (s._id) {
                                      await fgStockAPI.delete(s._id);
                                    }
                                    setFgStock((prev) =>
                                      prev.filter((item) => item._id !== s._id),
                                    );
                                    toast("Deleted successfully", "success");
                                  } catch (err) {
                                    toast("Failed to delete", "error");
                                  }
                                }
                              }}
                              style={{
                                background: "#450a0a",
                                color: "#ef4444",
                                border: "1px solid #7f1d1d",
                                borderRadius: 6,
                                padding: "4px 14px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div
          style={{
            borderTop: "1px solid #2a2a2a",
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#555",
          }}
        >
          <span>{filtered.length} items</span>
          <span style={{ color: "#FF9800", fontWeight: 700 }}>
            Total: ₹
            {totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (updatedData) => {
            try {
              await fgStockAPI.update(editingItem._id, updatedData);
              setFgStock((prev) =>
                prev.map((s) =>
                  s._id === editingItem._id ? { ...s, ...updatedData } : s,
                ),
              );
              setEditingItem(null);
              toast("Stock item updated", "success");
            } catch (err) {
              toast("Failed to update item", "error");
            }
          }}
        />
      )}
    </div>
  );
}

function EditModal({ item, onClose, onSave }) {
  const [formData, setFormData] = useState({
    itemName: item.itemName || "",
    joNo: item.joNo || "",
    soRef: item.soRef || "",
    companyName: item.companyName || "",
    category: item.category || "",
    qty: item.qty || 0,
    price: item.price || 0,
    reorder: item.reorder || 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  };

  const contentStyle = {
    background: "#1a1a1a",
    padding: 30,
    borderRadius: 12,
    width: 500,
    maxWidth: "90%",
    border: "1px solid #333",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  };

  const fieldStyle = {
    marginBottom: 16,
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
    fontWeight: 600,
    textTransform: "uppercase",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "#0c0c0e",
    border: "1px solid #2a2a2e",
    borderRadius: 6,
    color: "#fff",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={modalStyle} className="modal-backdrop">
      <div style={contentStyle} className="fade-in">
        <h3 style={{ margin: "0 0 20px 0", color: "#2196F3", fontSize: 18 }}>
          Edit Stock Item
        </h3>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>Item Name</label>
            <input
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Company Name</label>
            <input
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            <input
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Job Order #</label>
            <input
              name="joNo"
              value={formData.joNo}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>Quantity</label>
            <input
              type="number"
              name="qty"
              value={formData.qty}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Price (₹)</label>
            <input
              type="number"
              step="0.01"
              name="price"
              value={formData.price}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Reorder Level</label>
            <input
              type="number"
              name="reorder"
              value={formData.reorder}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid #333",
              color: "#888",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const cleaned = { ...formData };
              cleaned.qty = Number(cleaned.qty);
              cleaned.price = Number(cleaned.price);
              cleaned.reorder = Number(cleaned.reorder);
              onSave(cleaned);
            }}
            style={{
              padding: "10px 24px",
              background: "#2196F3",
              border: "none",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
