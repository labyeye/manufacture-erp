import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { fgStockAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

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

export default function FGStock({ fgStock = [], setFgStock, toast }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
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
          style={{
            width: 65,
            padding: "5px 8px",
            background: "#0c0c0e",
            border: `1px solid ${hasChanged ? "#FF9800" : "#2a2a2e"}`,
            borderRadius: 4,
            color: "#fff",
            fontSize: 12,
            outline: "none",
            textAlign: "right",
          }}
          placeholder="—"
        />
        {hasChanged && (
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
          style={{
            width: 75,
            padding: "5px 8px",
            background: "#0c0c0e",
            border: `1px solid ${hasChanged ? "#2196F3" : "#2a2a2e"}`,
            borderRadius: 4,
            color: "#2196F3",
            fontSize: 12,
            fontWeight: 700,
            outline: "none",
            textAlign: "right",
          }}
          placeholder="0.00"
        />
        {hasChanged && (
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
      "Client Category",
      "Qty",
      "Reorder Level",
      "Price (Rs)",
    ];
    const rows = fgStock.map((s) => [
      s.code || "",
      s.itemName,
      s.category || "",
      s.clientCat || "",
      s.qty || 0,
      s.reorder || 0,
      s.price || 0,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fg_stock.csv";
    a.click();
    toast("Exported!", "success");
  };

  const handleTemplate = () => {
    const csv =
      '"Code","Item Name","Category","Client Category","Qty","Reorder Level","Price (Rs)"\n"","Example Product","HP","HP",100,50,25';
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fg_stock_template.csv";
    a.click();
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
        // Skip header row
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (row && (row[0] || row[1])) {
            imported.push({
              _id: uid(),
              code: row[0] || `FG${String(i).padStart(3, "0")}`,
              itemName: row[1] || "Unnamed Item",
              category: row[2] || "",
              clientCat: row[3] || "",
              qty: parseFloat(row[4]) || 0,
              reorder: parseFloat(row[5]) || 0,
              price: parseFloat(row[6]) || 0,
            });
          }
        }

        if (imported.length > 0) {
          setFgStock((prev) => [...prev, ...imported]);
          toast(`Successfully imported ${imported.length} items`, "success");
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
      value: totalQty,
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
        <button
          onClick={handleTemplate}
          style={{
            padding: "8px 16px",
            background: "#7B1FA2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ⬇ Template
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "8px 16px",
            background: "#7B1FA2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ⬆ Import Excel
        </button>
        <button
          onClick={handleExport}
          style={{
            padding: "8px 16px",
            background: "#4CAF50",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ⬇ Export Excel
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}
      >
        {["All", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: "5px 16px",
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: filterCat === cat ? "#2196F3" : "transparent",
              color: filterCat === cat ? "#fff" : "#888",
              border: `1px solid ${filterCat === cat ? "#2196F3" : "#333"}`,
            }}
          >
            {cat}
          </button>
        ))}
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
                  "CLIENT CAT.",
                  "IN STOCK",
                  "QTY",
                  "REORDER",
                  "PRICE (₹)",
                  "VALUE (₹)",
                  "ACTION",
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
                        {s.joNo || s.code || "-"}
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
                        {s.clientName || s.clientCat || "-"}
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
                        {s.qty || 0}
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
                      <td style={{ padding: "10px 14px" }}>
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
                            padding: "4px 9px",
                            background: "#f4433622",
                            color: "#f44336",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          🗑️
                        </button>
                      </td>
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
    </div>
  );
}
