import React, { useState, useRef, useMemo } from "react";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const ITEM_TABS = [
  { key: "Raw Material", label: "Raw Material", prefix: "RM" },
  { key: "Consumable", label: "Consumable", prefix: "CN" },
  { key: "Finished Goods", label: "Finished Goods", prefix: "FG" },
  { key: "Machine Spare", label: "Machine Spare", prefix: "MS" },
];

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#141414",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box",
};

export default function ItemMaster({
  itemMasterFG = [],
  setItemMasterFG,
  categoryMaster = {},
  toast,
}) {
  const [activeTab, setActiveTab] = useState("Raw Material");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef(null);

  // Get items for current tab
  const tabItems = useMemo(
    () => (itemMasterFG || []).filter((i) => i.type === activeTab),
    [itemMasterFG, activeTab],
  );

  // Get categories for current tab from categoryMaster or from items
  const tabCategories = useMemo(() => {
    const fromMaster = categoryMaster[activeTab] || [];
    const fromItems = [
      ...new Set(tabItems.map((i) => i.category).filter(Boolean)),
    ];
    return [...new Set([...fromMaster, ...fromItems])];
  }, [categoryMaster, activeTab, tabItems]);

  // Filtered items
  const filtered = useMemo(
    () =>
      tabItems.filter((i) => {
        const matchSearch =
          !search ||
          i.name?.toLowerCase().includes(search.toLowerCase()) ||
          i.code?.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === "All" || i.category === filterCat;
        return matchSearch && matchCat;
      }),
    [tabItems, search, filterCat],
  );

  const getNextCode = (type) => {
    const tab = ITEM_TABS.find((t) => t.key === type);
    const prefix = tab?.prefix || "IT";
    const existing = (itemMasterFG || []).filter((i) => i.type === type);
    const num = existing.length + 1;
    return `${prefix}${String(num).padStart(4, "0")}`;
  };

  const handleAddItem = () => {
    if (!selectedCategory) {
      toast("Please select a category", "error");
      return;
    }
    if (!newItemName.trim()) {
      toast("Please enter item name", "error");
      return;
    }

    if (editingItem) {
      setItemMasterFG((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, name: newItemName, category: selectedCategory }
            : i,
        ),
      );
      toast("Item updated", "success");
      setEditingItem(null);
    } else {
      const code = getNextCode(activeTab);
      setItemMasterFG((prev) => [
        ...(prev || []),
        {
          id: uid(),
          code,
          name: newItemName,
          type: activeTab,
          category: selectedCategory,
          status: "Active",
          createdAt: new Date().toISOString().split("T")[0],
        },
      ]);
      toast("Item added", "success");
    }
    setNewItemName("");
    setSelectedCategory("");
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setSelectedCategory(item.category || "");
  };

  const handleDelete = (id) => {
    if (confirm("Delete this item?")) {
      setItemMasterFG((prev) => prev.filter((i) => i.id !== id));
      toast("Deleted", "success");
    }
  };

  const handleToggleStatus = (item) => {
    setItemMasterFG((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, status: i.status === "Active" ? "Inactive" : "Active" }
          : i,
      ),
    );
  };

  const handleTemplate = () => {
    const tab = ITEM_TABS.find((t) => t.key === activeTab);
    const csv = `"Product Code","Item Name","Category"\n"","Example Item","${tabCategories[0] || "Category Name"}"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tab.prefix}_template.csv`;
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
        if (cols[1]) {
          const code = cols[0] || getNextCode(activeTab);
          imported.push({
            id: uid(),
            code,
            name: cols[1],
            type: activeTab,
            category: cols[2] || "",
            status: "Active",
            createdAt: new Date().toISOString().split("T")[0],
          });
        }
      }
      setItemMasterFG((prev) => [...(prev || []), ...imported]);
      toast(`Imported ${imported.length} items`, "success");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExport = () => {
    if (!tabItems.length) {
      toast("No items to export", "error");
      return;
    }
    const header = ["Product Code", "Item Name", "Category", "Status"];
    const rows = tabItems.map((i) => [
      i.code || "",
      i.name,
      i.category || "",
      i.status || "Active",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v ?? ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab.replace(" ", "_")}_items.csv`;
    a.click();
    toast("Exported!", "success");
  };

  const activeTabInfo = ITEM_TABS.find((t) => t.key === activeTab);

  return (
    <div className="fade">
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}
        >
          📋 Item Master
        </h2>
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
          All items — categories and sub-types driven by Category Master
        </p>
      </div>

      {/* Type Tabs */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        {ITEM_TABS.map((tab) => {
          const count = (itemMasterFG || []).filter(
            (i) => i.type === tab.key,
          ).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setFilterCat("All");
                setSearch("");
                setEditingItem(null);
                setNewItemName("");
                setSelectedCategory("");
              }}
              style={{
                padding: "8px 18px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: isActive ? "transparent" : "transparent",
                color: isActive ? "#e0e0e0" : "#666",
                border: isActive ? "1px solid #555" : "1px solid #2a2a2a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {tab.label}
              <span
                style={{
                  padding: "1px 7px",
                  borderRadius: 20,
                  fontSize: 11,
                  background: isActive ? "#2196F3" : "#333",
                  color: isActive ? "#fff" : "#777",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk Import Section */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>
            Bulk Import:
          </span>
          <button
            onClick={handleTemplate}
            style={{
              padding: "7px 16px",
              background: "#1565C0",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ⬇ Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "7px 16px",
              background: "#1565C0",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ⬆ Import Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <span style={{ fontSize: 11, color: "#555" }}>
            Template has 3 columns:{" "}
            <strong style={{ color: "#888" }}>Product Code</strong> (leave blank
            — auto-assigned as {activeTabInfo?.prefix}0001,{" "}
            {activeTabInfo?.prefix}0002...),{" "}
            <strong style={{ color: "#888" }}>Item Name</strong>,{" "}
            <strong style={{ color: "#888" }}>Category</strong>
          </span>
        </div>
      </div>

      {/* Add Item Form */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#2196F3",
            letterSpacing: "1px",
            marginBottom: 14,
            textTransform: "uppercase",
          }}
        >
          {editingItem ? `Edit ${activeTab} Item` : `Add ${activeTab} Item`}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                display: "block",
                marginBottom: 6,
                letterSpacing: "0.5px",
              }}
            >
              CATEGORY *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select Category --</option>
              {tabCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                display: "block",
                marginBottom: 6,
                letterSpacing: "0.5px",
              }}
            >
              ITEM NAME *
            </label>
            <input
              style={inputStyle}
              placeholder={`Enter ${activeTab} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleAddItem}
            style={{
              padding: "9px 20px",
              background: "#2196F3",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {editingItem ? "✅ Update Item" : `+ Add ${activeTab} Item`}
          </button>
          {editingItem && (
            <button
              onClick={() => {
                setEditingItem(null);
                setNewItemName("");
                setSelectedCategory("");
              }}
              style={{
                padding: "9px 18px",
                background: "#222",
                color: "#aaa",
                border: "1px solid #333",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* List Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2196F3" }}>
            {activeTab} Items ({tabItems.length})
          </span>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              style={{ ...inputStyle, width: 180, padding: "7px 10px" }}
              placeholder="🔍 Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setFilterCat("All")}
              style={{
                padding: "6px 12px",
                background: filterCat === "All" ? "#2196F3" : "#222",
                color: filterCat === "All" ? "#fff" : "#888",
                border: "1px solid #333",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              All
            </button>
            {tabCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: "6px 12px",
                  background: filterCat === cat ? "#1565C0" : "#222",
                  color: filterCat === cat ? "#fff" : "#888",
                  border: "1px solid #333",
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={handleExport}
              style={{
                padding: "6px 14px",
                background: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ⬇ Export Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  background: "#111",
                  borderBottom: "1px solid #2a2a2a",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    color: "#555",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  CODE
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    color: "#555",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  ITEM NAME
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    color: "#555",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  CATEGORY
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    color: "#555",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "10px 14px",
                    color: "#555",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#444",
                      fontSize: 13,
                    }}
                  >
                    No {activeTab} items yet.
                    <br />
                    <span style={{ fontSize: 12, color: "#555" }}>
                      Add items above.
                    </span>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #1e1e1e" }}
                  >
                    <td
                      style={{
                        padding: "10px 14px",
                        color: "#555",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {item.code}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 600,
                        color: "#e0e0e0",
                      }}
                    >
                      {item.name}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          background: "#1565C022",
                          color: "#64B5F6",
                        }}
                      >
                        {item.category || "-"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            item.status === "Active"
                              ? "#4CAF5022"
                              : "#f4433622",
                          color:
                            item.status === "Active" ? "#4CAF50" : "#f44336",
                        }}
                      >
                        {item.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => handleEdit(item)}
                          style={{
                            padding: "4px 10px",
                            background: "#1976D222",
                            color: "#64B5F6",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          style={{
                            padding: "4px 10px",
                            background: "#FF980022",
                            color: "#FF9800",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {item.status === "Active" ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            padding: "4px 10px",
                            background: "#f4433622",
                            color: "#f44336",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
