import React, { useState, useRef, useMemo } from "react";

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
      const lines = ev.target.result.split("\n").filter(Boolean);
      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((v) => v.replace(/^"|"$/g, "").trim());
        if (cols[1])
          imported.push({
            id: uid(),
            code: cols[0] || `FG${String(i).padStart(3, "0")}`,
            itemName: cols[1],
            category: cols[2] || "",
            clientCat: cols[3] || "",
            qty: parseFloat(cols[4]) || 0,
            reorder: parseFloat(cols[5]) || 0,
            price: parseFloat(cols[6]) || 0,
          });
      }
      setFgStock((prev) => [...prev, ...imported]);
      toast(`Imported ${imported.length} items`, "success");
    };
    reader.readAsText(file);
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

      {/* Stat Cards */}
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

      {/* Search + Buttons Row */}
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
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {/* Category Filter Tabs */}
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

      {/* Table */}
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
                        {s.code || "-"}
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
                        {s.clientCat || "-"}
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
                        {s.reorder || "-"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "#888",
                        }}
                      >
                        {s.price ? `₹${s.price}` : "-"}
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
                          onClick={() => {
                            if (confirm("Delete this item?")) {
                              setFgStock((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              );
                              toast("Deleted", "success");
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
