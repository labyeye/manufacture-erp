import React, { useState, useMemo, useRef } from "react";
import { C } from "../constants/colors";
import { Card, SectionTitle, Badge, ImportBtn, ExportBtn, TemplateBtn } from "../components/ui/BasicComponents";
import { rawMaterialStockAPI } from "../api/auth";

const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

export default function RMStock({
  rawStock = [],
  setRawStock,
  toast,
  refreshData,
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stock item?")) return;
    try {
      await rawMaterialStockAPI.delete(id);
      setRawStock((prev) => prev.filter((s) => s._id !== id && s.id !== id));
      toast?.("Successfully deleted", "success");
    } catch (err) {
      toast?.("Failed to delete", "error");
    }
  };

  const categories = useMemo(() => {
    const list = Array.isArray(rawStock) ? rawStock : [];
    const cats = [
      ...new Set(
        list.map((s) => s.category || s.paperCategory || "").filter(Boolean),
      ),
    ];
    return ["All", ...cats];
  }, [rawStock]);

  const filtered = useMemo(() => {
    let list = Array.isArray(rawStock) ? rawStock : [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || s.paperType || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q) ||
          (s.code || "").toLowerCase().includes(q) ||
          (s.productCode || "").toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "All") {
      list = list.filter(
        (s) => (s.category || s.paperCategory || "") === activeFilter,
      );
    }
    return list;
  }, [rawStock, search, activeFilter]);

  const handleUpdateReorder = async (id, newVal) => {
    try {
      await rawMaterialStockAPI.update(id, { reorderLevel: newVal });
      setRawStock((prev) =>
        prev.map((s) =>
          s.id === id || s._id === id ? { ...s, reorderLevel: newVal } : s,
        ),
      );
      toast?.("Reorder level updated", "success");
    } catch (err) {
      toast?.("Failed to update", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const id = editingItem._id || editingItem.id;
      await rawMaterialStockAPI.update(id, editingItem);
      setRawStock((prev) =>
        prev.map((s) => (s._id === id || s.id === id ? editingItem : s)),
      );
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

  const handleExport = () => {
    const headers = [
      "Code",
      "Material Name",
      "Category",
      "Qty (Sheets)",
      "Qty (KG)",
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
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RM_Stock_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split("\n").filter(Boolean);
        const [header, ...rows] = lines;
        const imported = rows
          .map((row) => {
            const vals = row.split(",");
            return {
              id: Math.random().toString(36).slice(2, 9),
              code: vals[0] || "",
              name: vals[1] || "",
              category: vals[2] || "",
              qty: parseFloat(vals[3] || 0),
              weight: parseFloat(vals[4] || 0),
              reorderLevel: parseFloat(vals[5] || 0),
              rate: parseFloat(vals[6] || 0),
            };
          })
          .filter((r) => r.name);
        setRawStock((prev) => [...prev, ...imported]);
        toast?.("Imported items successfully", "success");
      } catch {
        toast?.("Import failed", "error");
      }
    };
    reader.readAsText(file);
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
              await handleUpdateReorder(item._id || item.id, +val);
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: C.green,
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

  return (
    <div style={{ paddingBottom: 40 }}>
      {editingItem && (
        <div
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
            style={{
              background: "#141416",
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
                    fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    CATEGORY
                  </label>
                  <input
                    value={editingItem.category || editingItem.paperCategory || ""}
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
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                  fontWeight: 700,
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
                  border: "none",
                  background: C.blue,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
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
      </div>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 24, marginLeft: 36 }}>
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
              background: "#141416",
              border: "1px solid #2a2a2e",
              borderRadius: 6,
              color: "#fff",
              fontSize: 13,
            }}
          />
        </div>
        <TemplateBtn
          onClick={() => {
            const csv = "Code,Name,Category,QtySheets,WeightKg,ReorderKg,Rate\n";
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "rm_template.csv";
            a.click();
          }}
        />
        <ImportBtn onClick={() => fileInputRef.current.click()} />
        <ExportBtn onClick={handleExport} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
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
              fontWeight: 700,
              cursor: "pointer",
              background: activeFilter === cat ? C.blue : "#141416",
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
          background: "#141416",
          border: "1px solid #2a2a2e",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #2a2a2e" }}>
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
                    fontWeight: 700,
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
                  style={{ borderBottom: "1px solid #1e1e22" }}
                >
                  <td
                    style={{
                      padding: "16px",
                      color: C.blue,
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.code || "—"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#eee" }}>
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
                        fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    {val > 0 ? `₹${fmt(Math.round(val))}` : "—"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setEditingItem(s)}
                        style={{
                          padding: "6px 10px",
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
                </tr>
              );
            })}
          </tbody>
        </table>

        {}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#666" }}>{filtered.length} items</span>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { c: C.red, l: "Low" },
              { c: C.yellow, l: "Moderate" },
              { c: C.green, l: "Adequate" }
            ].map(x => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: x.c }} />
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
    <div style={{
      background: "#141416", border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`,
      padding: "16px 20px", borderRadius: 8
    }}>
      <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "monospace" }}>{prefix}{val}{suffix}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginTop: 4, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function ActionBtn({ label, icon, color, textColor, border, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: color, color: textColor, border: border ? `1px solid ${border}` : "none",
      padding: "8px 16px", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}
