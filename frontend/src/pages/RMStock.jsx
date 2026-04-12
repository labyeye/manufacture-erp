import React, { useState, useMemo, useRef } from "react";
import { C } from "../constants/colors";
import { Card, SectionTitle, Badge } from "../components/ui/BasicComponents";

const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

export default function RMStock({ rawStock = [], setRawStock, toast }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const fileInputRef = useRef(null);

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
          (s.code || "").toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "All") {
      list = list.filter(
        (s) => (s.category || s.paperCategory || "") === activeFilter,
      );
    }
    return list;
  }, [rawStock, search, activeFilter]);

  const totalItems = filtered.length;
  const totalWeightKg = filtered.reduce(
    (sum, s) => sum + +(s.weight || s.weightKg || 0),
    0,
  );
  const totalValue = filtered.reduce((sum, s) => {
    const qty = +(s.qty || s.qtyKg || 0);
    const rate = +(s.rate || s.ratePerKg || 0);
    return sum + qty * rate;
  }, 0);

  const levelColor = (s) => {
    const qty = +(s.qty || s.qtyKg || 0);
    const reorder = +(s.reorderLevel || s.reorderKg || 0);
    if (qty <= 0) return C.red || "#ef4444";
    if (reorder && qty <= reorder) return C.orange || "#f97316";
    return C.green || "#22c55e";
  };

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
    const rows = (rawStock || []).map((s) => [
      s.code || "",
      s.name || s.paperType || "",
      s.category || "",
      s.qty || 0,
      s.weight || s.weightKg || 0,
      s.reorderLevel || "",
      s.rate || s.ratePerKg || "",
      (+(s.qty || 0) * +(s.rate || 0)).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rm_stock.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast && toast("Exported successfully", "success");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split("\n").filter(Boolean);
        const [header, ...rows] = lines;
        const keys = header.split(",").map((k) => k.trim().toLowerCase());
        const imported = rows
          .map((row) => {
            const vals = row.split(",");
            const obj = {};
            keys.forEach((k, i) => {
              obj[k] = vals[i]?.trim() || "";
            });
            return {
              id: Math.random().toString(36).slice(2),
              code: obj["code"] || "",
              name: obj["material name"] || obj["name"] || "",
              category: obj["category"] || "",
              qty: parseFloat(obj["qty (sheets)"] || obj["qty"] || 0),
              weight: parseFloat(obj["qty (kg)"] || obj["weight"] || 0),
              reorderLevel: parseFloat(
                obj["reorder (kg)"] || obj["reorderlevel"] || 0,
              ),
              rate: parseFloat(obj["rate (₹/kg)"] || obj["rate"] || 0),
            };
          })
          .filter((r) => r.name);
        setRawStock((prev) => [...prev, ...imported]);
        toast && toast(`Imported ${imported.length} items`, "success");
      } catch {
        toast && toast("Import failed — check file format", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="📦"
        title="Raw Material Stock"
        sub="Live inventory of all raw materials"
      />

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <StatCard
          value={fmt(totalItems)}
          label="Total Items"
          color={C.blue || "#3b82f6"}
          prefix=""
        />
        <StatCard
          value={fmt(Math.round(totalWeightKg))}
          label="Total Weight (kg)"
          color={C.orange || "#f97316"}
          suffix=" kg"
        />
        <StatCard
          value={fmt(Math.round(totalValue))}
          label="Total Value"
          color={C.green || "#22c55e"}
          prefix="₹"
        />
      </div>

      {}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: C.muted,
              fontSize: 14,
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
              padding: "9px 12px 9px 32px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 13,
              background: C.inputBg,
              color: C.text || "#e5e7eb",
              boxSizing: "border-box",
            }}
          />
        </div>
        <ActionBtn
          label="↓ Template"
          color="#6366f1"
          onClick={() => {
            const csv =
              "Code,Material Name,Category,Qty (Sheets),Qty (KG),Reorder (KG),Rate (₹/KG)\n,,,,,,";
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "rm_stock_template.csv";
            a.click();
          }}
        />
        <ActionBtn
          label="↑ Import Excel"
          color={C.blue || "#3b82f6"}
          onClick={() => fileInputRef.current?.click()}
        />
        <ActionBtn
          label="↓ Export Excel"
          color={C.green || "#22c55e"}
          onClick={handleExport}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              border: `1px solid ${activeFilter === cat ? C.blue || "#3b82f6" : C.border}`,
              background:
                activeFilter === cat ? C.blue || "#3b82f6" : "transparent",
              color: activeFilter === cat ? "#fff" : C.muted,
              fontWeight: activeFilter === cat ? 700 : 400,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {}
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: C.surface,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  "CODE",
                  "MATERIAL NAME",
                  "CATEGORY",
                  "QTY (SHEETS)",
                  "QTY (KG)",
                  "REORDER\n(KG)",
                  "RATE (₹/KG)",
                  "VALUE (₹)",
                  "ACTION",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 14px",
                      textAlign:
                        h.includes("QTY") ||
                        h.includes("RATE") ||
                        h.includes("VALUE")
                          ? "right"
                          : "left",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: C.muted,
                      whiteSpace: "pre-line",
                      background: C.surface,
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
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: C.muted,
                      fontSize: 13,
                    }}
                  >
                    No materials found
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const qty = +(s.qty || 0);
                  const weightKg = +(s.weight || s.weightKg || 0);
                  const reorder = +(s.reorderLevel || s.reorderKg || 0);
                  const rate = +(s.rate || s.ratePerKg || 0);
                  const value = qty * rate || weightKg * rate;
                  const lc = levelColor(s);
                  return (
                    <tr
                      key={s.id || i}
                      style={{
                        borderBottom: `1px solid ${C.border}22`,
                        background:
                          i % 2 === 1
                            ? C.inputBg || "#ffffff08"
                            : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 14px",
                          color: C.muted,
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono',monospace",
                        }}
                      >
                        {s.code || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: lc,
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          {s.name || s.paperType || "—"}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          color: C.muted,
                          fontSize: 12,
                        }}
                      >
                        {s.category || s.paperCategory || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: C.muted,
                          fontFamily: "'JetBrains Mono',monospace",
                        }}
                      >
                        {(s.category === "Paper Sheet" ||
                          s.category === "Paper Sheets") &&
                        s.qty
                          ? fmt(s.qty)
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontFamily: "'JetBrains Mono',monospace",
                        }}
                      >
                        {fmt(Math.round(weightKg)) || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: C.muted,
                        }}
                      >
                        {reorder ? fmt(reorder) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: C.muted,
                        }}
                      >
                        {rate ? `₹${fmt(rate)}` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: C.green || "#22c55e",
                        }}
                      >
                        {value ? `₹${fmt(Math.round(value))}` : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          onClick={() => {
                            setRawStock((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            );
                            toast && toast("Item removed", "success");
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: `1px solid ${C.red || "#ef4444"}44`,
                            background: (C.red || "#ef4444") + "11",
                            color: C.red || "#ef4444",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 16px",
            borderTop: `1px solid ${C.border}22`,
            fontSize: 12,
            color: C.muted,
          }}
        >
          <span>{filtered.length} items</span>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {[
              ["#ef4444", "Low"],
              ["#f97316", "Moderate"],
              ["#22c55e", "Adequate"],
            ].map(([color, label]) => (
              <span
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, prefix = "", suffix = "" }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        border: `1px solid ${color}44`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        background: color + "08",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color,
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        {prefix}
        {value}
        {suffix}
      </div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 16px",
        borderRadius: 6,
        border: "none",
        background: color,
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
