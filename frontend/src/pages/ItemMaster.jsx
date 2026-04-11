import React, { useState, useRef, useMemo, useEffect } from "react";
import { itemMasterAPI, categoryMasterAPI } from "../api/auth";
import * as XLSX from "xlsx";

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

export default function ItemMaster({ toast }) {
  const [itemMasterFG, setItemMasterFG] = useState([]);
  const [categoryMaster, setCategoryMaster] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Raw Material");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [gsm, setGsm] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [rawCategories, setRawCategories] = useState([]);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === "Raw Material" && selectedCategory) {
      const parts = [selectedSubCategory, selectedCategory];
      if (gsm) parts.push(gsm + "gsm");
      if (width && length) parts.push(width + "x" + length + "mm");
      else if (width) parts.push(width + "mm");

      setNewItemName(parts.filter(Boolean).join(" "));
    }
  }, [selectedCategory, selectedSubCategory, gsm, width, length, activeTab]);

  const fetchItems = async () => {
    try {
      const res = await itemMasterAPI.getAll();
      setItemMasterFG(res.items || []);
    } catch (error) {
      toast?.("Failed to load items", "error");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryMasterAPI.getAll();
      const categories = res.categories || [];
      setRawCategories(categories);

      const grouped = {};
      categories.forEach((cat) => {
        if (!grouped[cat.type]) {
          grouped[cat.type] = [];
        }

        if (cat.subTypes && typeof cat.subTypes === "object") {
          const categoryNames = Object.keys(cat.subTypes);
          grouped[cat.type] = [
            ...new Set([...grouped[cat.type], ...categoryNames]),
          ];
        }
      });

      setCategoryMaster(grouped);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const tabItems = useMemo(
    () => (itemMasterFG || []).filter((i) => i.type === activeTab),
    [itemMasterFG, activeTab],
  );

  const tabCategories = useMemo(() => {
    const categoriesFromMaster = rawCategories.filter(
      (c) => c.type === activeTab,
    );
    const names = [];
    categoriesFromMaster.forEach((c) => {
      if (c.subTypes) {
        names.push(...Object.keys(c.subTypes));
      }
    });

    const fromItems = [
      ...new Set(tabItems.map((i) => i.category).filter(Boolean)),
    ];
    return [...new Set([...names, ...fromItems])];
  }, [rawCategories, activeTab, tabItems]);

  const tabSubCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const catObj = rawCategories.find(
      (c) => c.type === activeTab && c.subTypes?.[selectedCategory],
    );
    return catObj ? catObj.subTypes[selectedCategory] : [];
  }, [rawCategories, activeTab, selectedCategory]);

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

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
  }, [filtered]);

  const handleAddItem = async () => {
    if (!selectedCategory) {
      toast("Please select a category", "error");
      return;
    }
    if (!newItemName.trim()) {
      toast("Please enter item name", "error");
      return;
    }

    setLoading(true);
    try {
      const tab = ITEM_TABS.find((t) => t.key === activeTab);

      if (editingItem) {
        await itemMasterAPI.update(editingItem._id, {
          name: newItemName,
          category: selectedCategory,
          subCategory: selectedSubCategory,
          gsm: activeTab === "Raw Material" ? Number(gsm) : undefined,
          width: activeTab === "Raw Material" ? Number(width) : undefined,
          length: activeTab === "Raw Material" ? Number(length) : undefined,
          type: activeTab,
        });
        toast("Item updated", "success");
        setEditingItem(null);
      } else {
        await itemMasterAPI.create({
          name: newItemName,
          type: activeTab,
          category: selectedCategory,
          subCategory: selectedSubCategory,
          gsm: activeTab === "Raw Material" ? Number(gsm) : undefined,
          width: activeTab === "Raw Material" ? Number(width) : undefined,
          length: activeTab === "Raw Material" ? Number(length) : undefined,
          code: "",
        });
        toast("Item added successfully", "success");
      }
      setNewItemName("");
      setSelectedCategory("");
      setSelectedSubCategory("");
      setGsm("");
      setWidth("");
      setLength("");
      fetchItems();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save item", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setSelectedCategory(item.category || "");
    setSelectedSubCategory(item.subCategory || "");
    setGsm(item.gsm || "");
    setWidth(item.width || "");
    setLength(item.length || "");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    try {
      await itemMasterAPI.delete(item._id);
      toast("Deleted", "success");
      fetchItems();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to delete item", "error");
    }
  };

  const handleTemplate = () => {
    const tab = ITEM_TABS.find((t) => t.key === activeTab);
    const csv = `"Product Code","Item Name","Category","Type"\n"","Example Item","${tabCategories[0] || "Category Name"}","${tabSubCategories[0] || "Type Name"}"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tab.prefix}_template.csv`;
    a.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let lines = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        lines = data.map((row) => row.map((v) => `"${v ?? ""}"`).join(","));
      } else {
        const text = await file.text();
        lines = text.split("\n").filter(Boolean);
      }

      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((v) => v.replace(/^"|"$/g, "").trim());

        if (cols[1]) {
          imported.push({
            name: cols[1],
            type: activeTab,
            category: cols[2] || "",
            subCategory: cols[3] || "",
            code: cols[0] || "",
          });
        }
      }

      if (imported.length === 0) {
        toast("No valid items to import", "error");
        return;
      }

      setImportProgress({
        show: true,
        current: 0,
        total: imported.length,
        status: "Starting import...",
      });

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < imported.length; i++) {
        const item = imported[i];
        setImportProgress((prev) => ({
          ...prev,
          current: i + 1,
          status: `Importing: ${item.name}`,
        }));

        try {
          await itemMasterAPI.create(item);
          successCount++;
        } catch (err) {
          console.error(`Failed to import ${item.name}:`, err);
          failedCount++;
        }
      }

      toast(
        `Import complete! ${successCount} successful, ${failedCount} failed.`,
        "success",
      );
      fetchItems();
    } catch (error) {
      console.error("Import error:", error);
      toast("Failed to process file", "error");
    } finally {
      setTimeout(() => {
        setImportProgress({ show: false, current: 0, total: 0, status: "" });
      }, 1000);
    }

    e.target.value = "";
  };

  const handleExport = () => {
    if (!tabItems.length) {
      toast("No items to export", "error");
      return;
    }
    const header = ["Product Code", "Item Name", "Category", "Type", "Status"];
    const rows = tabItems.map((i) => [
      i.code || "",
      i.name,
      i.category || "",
      i.subCategory || "",
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

  return (
    <div className="fade">
      {importProgress.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 16,
              padding: 30,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e0e0e0",
                marginBottom: 8,
              }}
            >
              🚀 Importing Items
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
              Processing {importProgress.total} items for {activeTab}
            </div>

            <div
              style={{
                height: 8,
                width: "100%",
                background: "#0d0d0d",
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  background: "linear-gradient(90deg, #2196F3, #64B5F6)",
                  transition: "width 0.3s ease",
                  boxShadow: "0 0 10px #2196F388",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 700,
                color: "#888",
                marginBottom: 20,
              }}
            >
              <span style={{ color: "#2196F3" }}>
                {importProgress.current} done
              </span>
              <span>of {importProgress.total} total</span>
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#555",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {importProgress.status}
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}
        >
          📋 Item Master
        </h2>
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
          Manage your items, raw materials, and components
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          background: "#1a1a1a",
          padding: 4,
          borderRadius: 12,
          marginBottom: 20,
          border: "1px solid #2a2a2a",
        }}
      >
        {ITEM_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setFilterCat("All");
              setEditingItem(null);
              setNewItemName("");
              setSelectedCategory("");
              setSelectedSubCategory("");
              setGsm("");
              setWidth("");
              setLength("");
            }}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: activeTab === tab.key ? "#2196F3" : "transparent",
              color: activeTab === tab.key ? "#fff" : "#888",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory("");
              }}
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
          {tabSubCategories.length > 0 && (
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
                SUB-CATEGORY / TYPE *
              </label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Select Sub-Category --</option>
                {tabSubCategories.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeTab === "Raw Material" && (
            <>
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
                  GSM
                </label>
                <input
                  type="number"
                  placeholder="e.g. 70"
                  value={gsm}
                  onChange={(e) => setGsm(e.target.value)}
                  style={inputStyle}
                />
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
                  WIDTH (mm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {selectedCategory !== "Paper Reel" && (
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
                    LENGTH (mm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 700"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
            </>
          )}
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
              style={{
                ...inputStyle,
                background:
                  activeTab === "Raw Material"
                    ? "#0a0a0a"
                    : inputStyle.background,
              }}
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
                setSelectedSubCategory("");
                setGsm("");
                setWidth("");
                setLength("");
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 10, flex: 1 }}>
          <input
            placeholder="Search code or name..."
            style={{
              ...inputStyle,
              maxWidth: 300,
              background: "#1a1a1a",
              borderColor: "#2a2a2a",
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{
              ...inputStyle,
              maxWidth: 160,
              background: "#1a1a1a",
              borderColor: "#2a2a2a",
            }}
          >
            <option value="All">All Categories</option>
            {tabCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExport}
            style={{
              padding: "8px 14px",
              background: "#222",
              color: "#aaa",
              border: "1px solid #333",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📤 Export
          </button>
          <button
            onClick={handleTemplate}
            style={{
              padding: "8px 14px",
              background: "#222",
              color: "#aaa",
              border: "1px solid #333",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📄 Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "8px 16px",
              background: "#4CAF5022",
              color: "#4CAF50",
              border: "1px solid #4CAF5044",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📥 Bulk Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "#1a1a1a",
              borderRadius: 10,
              color: "#444",
            }}
          >
            No items found.
          </div>
        ) : (
          sorted.map((item) => (
            <div
              key={item._id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 8,
                gap: 16,
              }}
            >
              <div
                style={{
                  minWidth: 70,
                  padding: "6px 0",
                  border: "1px solid #2196F344",
                  borderRadius: 6,
                  textAlign: "center",
                  color: "#2196F3",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#2196F30a",
                  fontFamily: "monospace",
                  cursor: "pointer",
                }}
                onClick={() => handleEdit(item)}
              >
                {item.code}
              </div>
              <div
                style={{
                  flex: 1,
                  color: "#e6edf3",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: "#1565C022",
                  color: "#64B5F6",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {item.category || "-"}
              </div>
              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: "#4CAF501a",
                  color: "#4CAF50",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {item.subCategory || "-"}
              </div>
              <div style={{ color: "#484f58", fontSize: 11, minWidth: 80 }}>
                {
                  new Date(item.addedOn || item.createdAt)
                    .toISOString()
                    .split("T")[0]
                }
              </div>
              <button
                onClick={() => handleDelete(item)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f85149",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: 6,
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#f8514911")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
