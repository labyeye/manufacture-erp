import React, { useState, useRef, useEffect } from "react";
import { categoryMasterAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const ITEM_TABS = [
  { key: "Raw Material", label: "Raw Material" },
  { key: "Consumable", label: "Consumable" },
  { key: "Finished Goods", label: "Finished Goods" },
  { key: "Machine Spare", label: "Machine Spare" },
];

const inputStyle = {
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

export default function CategoryMaster({ toast }) {
  const [activeTab, setActiveTab] = useState("Raw Material");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [newSubType, setNewSubType] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryMasterAPI.getAll();
      console.log("Categories loaded:", response.categories);
      setCategories(response.categories || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Failed to load categories");
      toast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  
  const typeData = categories.find(c => c.type === activeTab);
  const tabData = typeData?.subTypes || {};
  const categoryNames = Object.keys(tabData);

  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const typeDoc = categories.find(c => c.type === tab);
    const names = Object.keys(typeDoc?.subTypes || {});
    setSelectedCategory(names[0] || null);
    setNewCatName("");
    setNewSubType("");
  };

  
  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      toast("Enter category name", "error");
      return;
    }
    
    try {
      let typeDoc = categories.find(c => c.type === activeTab);
      
      if (!typeDoc) {
        
        const created = await categoryMasterAPI.create({
          type: activeTab,
          categories: [newCatName.trim()],
          subTypes: { [newCatName.trim()]: [] }
        });
        await loadCategories();
      } else {
        
        const newCategories = typeDoc.categories || [];
        
        if (newCategories.includes(newCatName.trim())) {
          toast("Category already exists", "error");
          return;
        }
        
        const updated = {
          ...typeDoc,
          name: newCatName.trim(),
          type: activeTab,
          categories: [...newCategories, newCatName.trim()],
          subTypes: {
            ...typeDoc.subTypes,
            [newCatName.trim()]: []
          }
        };
        
        await categoryMasterAPI.update(typeDoc._id, updated);
        await loadCategories();
      }
      
      setSelectedCategory(newCatName.trim());
      setNewCatName("");
      toast("Category added successfully", "success");
    } catch (err) {
      console.error("Failed to add category:", err);
      toast(err.response?.data?.error || "Failed to add category", "error");
    }
  };

  
  const handleDeleteCategory = async (catName) => {
    if (!confirm(`Delete "${catName}" and all its sub-types?`)) return;
    
    try {
      const typeDoc = categories.find(c => c.type === activeTab);
      if (!typeDoc) {
        toast("Type not found", "error");
        return;
      }
      
      const updated = {
        ...typeDoc,
        categories: (typeDoc.categories || []).filter(c => c !== catName)
      };
      
      await categoryMasterAPI.update(typeDoc._id, updated);
      await loadCategories();
      
      if (selectedCategory === catName) {
        const remaining = (typeDoc.categories || []).filter(c => c !== catName);
        setSelectedCategory(remaining[0] || null);
      }
      toast("Category deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete category:", err);
      toast(err.response?.data?.error || "Failed to delete category", "error");
    }
  };

  
  const handleAddSubType = async () => {
    if (!selectedCategory) return;
    if (!newSubType.trim()) {
      toast("Enter sub-type name", "error");
      return;
    }
    
    try {
      const typeDoc = categories.find(c => c.type === activeTab);
      if (!typeDoc) {
        toast("Type not found", "error");
        return;
      }
      
      const currentSubTypes = typeDoc.subTypes?.[selectedCategory] || [];
      if (currentSubTypes.includes(newSubType.trim())) {
        toast("Sub-type already exists", "error");
        return;
      }
      
      const updated = {
        ...typeDoc,
        subTypes: {
          ...typeDoc.subTypes,
          [selectedCategory]: [...currentSubTypes, newSubType.trim()]
        }
      };
      
      await categoryMasterAPI.update(typeDoc._id, updated);
      await loadCategories();
      setNewSubType("");
      toast("Sub-type added successfully", "success");
    } catch (err) {
      console.error("Failed to add sub-type:", err);
      toast(err.response?.data?.error || "Failed to add sub-type", "error");
    }
  };

  
  const handleRemoveSubType = async (subType) => {
    try {
      const typeDoc = categories.find(c => c.type === activeTab);
      if (!typeDoc) {
        toast("Type not found", "error");
        return;
      }
      
      const currentSubTypes = (typeDoc.subTypes?.[selectedCategory] || []).filter(
        s => s !== subType
      );
      
      const updated = {
        ...typeDoc,
        subTypes: {
          ...typeDoc.subTypes,
          [selectedCategory]: currentSubTypes
        }
      };
      
      await categoryMasterAPI.update(typeDoc._id, updated);
      await loadCategories();
      toast("Sub-type removed", "success");
    } catch (err) {
      console.error("Failed to remove sub-type:", err);
      toast(err.response?.data?.error || "Failed to remove sub-type", "error");
    }
  };

  
  const handleTemplate = () => {
    const csv =
      '"Category Name","Sub-Type 1","Sub-Type 2","Sub-Type 3"\n"Paper Reel","MG Kraft","MF Kraft","Bleached Kraft"\n"Paper Sheet","Art Paper","Duplex Board",""';
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab.replace(" ", "_")}_categories_template.csv`;
    a.click();
  };

  
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const lines = ev.target.result.split("\n").filter(Boolean);
        let count = 0;
        
        const typeDoc = categories.find(c => c.type === activeTab);
        if (!typeDoc) {
          toast("Type data not found", "error");
          return;
        }
        
        const newCategories = { ...typeDoc.subTypes };
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]
            .split(",")
            .map((v) => v.replace(/^"|"$/g, "").trim());
          const catName = cols[0];
          if (!catName) continue;
          
          const subTypes = cols.slice(1).filter(Boolean);
          
          if (!newCategories[catName]) {
            newCategories[catName] = [];
          }
          subTypes.forEach((s) => {
            if (!newCategories[catName].includes(s)) {
              newCategories[catName].push(s);
            }
          });
          count++;
        }
        
        const updated = {
          ...typeDoc,
          subTypes: newCategories
        };
        
        await categoryMasterAPI.update(typeDoc._id, updated);
        await loadCategories();
        toast(`Imported ${count} categories`, "success");
        const firstCat = Object.keys(newCategories)[0];
        if (firstCat) setSelectedCategory(firstCat);
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("Import failed:", err);
      toast("Import failed", "error");
    }
    e.target.value = "";
  };

  const selectedSubTypes = selectedCategory
    ? (categories.find(c => c.type === activeTab)?.subTypes?.[selectedCategory] || [])
    : [];
  const totalCats = categoryNames.length;

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#777", fontSize: 14 }}>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="fade">
      {}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}
        >
          📂 Category Master
        </h2>
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
          Manage item categories and their sizes across all types
        </p>
      </div>

      {}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        {ITEM_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: "8px 20px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: "transparent",
              color: activeTab === tab.key ? "#e0e0e0" : "#555",
              border:
                activeTab === tab.key ? "1px solid #555" : "1px solid #222",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 0,
          minHeight: 400,
        }}
      >
        {}
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "10px 0 0 10px",
            padding: "16px",
            borderRight: "none",
          }}
        >
          {}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#2196F3",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {activeTab.replace(" ", " ")}
            </span>
            <span style={{ fontSize: 11, color: "#555" }}>
              {totalCats} {totalCats === 1 ? "category" : "categories"}
            </span>
          </div>

          {}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              style={{
                ...inputStyle,
                flex: 1,
                padding: "7px 10px",
                fontSize: 12,
              }}
              placeholder="New category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              style={{
                padding: "7px 12px",
                background: "#2196F3",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              +
            </button>
          </div>

          {}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              onClick={handleTemplate}
              style={{
                flex: 1,
                padding: "6px 0",
                background: "#1565C0",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ⬇ Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                padding: "6px 0",
                background: "#1565C0",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 11,
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
          </div>

          {}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {categoryNames.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#444",
                  padding: "20px 0",
                  fontSize: 12,
                }}
              >
                No categories yet
              </div>
            ) : (
              categoryNames.map((cat) => {
                const isSelected = selectedCategory === cat;
                const subCount = (tabData[cat] || []).length;
                return (
                  <div
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: isSelected ? "#2196F322" : "transparent",
                      border: isSelected
                        ? "1px solid #2196F355"
                        : "1px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 400,
                        color: isSelected ? "#64B5F6" : "#aaa",
                      }}
                    >
                      {cat}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isSelected ? "#2196F3" : "#555",
                          background: isSelected ? "#2196F322" : "#222",
                          padding: "1px 7px",
                          borderRadius: 20,
                        }}
                      >
                        {subCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#444",
                          fontSize: 14,
                          cursor: "pointer",
                          padding: "0 2px",
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {}
        <div
          style={{
            background: "#161616",
            border: "1px solid #2a2a2a",
            borderRadius: "0 10px 10px 0",
            padding: "20px 24px",
          }}
        >
          {!selectedCategory ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#444",
                fontSize: 13,
              }}
            >
              Select a category from the left to manage its sub-types
            </div>
          ) : (
            <>
              {}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#e0e0e0",
                      margin: 0,
                    }}
                  >
                    {selectedCategory}
                  </h3>
                  <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>
                    {selectedSubTypes.length} {activeTab.toLowerCase()} types
                  </p>
                </div>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#2196F322",
                    color: "#64B5F6",
                    border: "1px solid #2196F344",
                  }}
                >
                  {activeTab} Types
                </span>
              </div>

              {}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={`Add ${activeTab.toLowerCase()} type for ${selectedCategory}...`}
                  value={newSubType}
                  onChange={(e) => setNewSubType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubType()}
                />
                <button
                  onClick={handleAddSubType}
                  style={{
                    padding: "9px 20px",
                    background: "#2196F3",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Add
                </button>
              </div>

              {}
              {selectedSubTypes.length === 0 ? (
                <div style={{ color: "#444", fontSize: 13 }}>
                  No sub-types yet. Add one above.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {selectedSubTypes.map((sub) => (
                    <div
                      key={sub}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        background: "#222",
                        border: "1px solid #333",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "#ccc",
                      }}
                    >
                      <span>{sub}</span>
                      <button
                        onClick={() => handleRemoveSubType(sub)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f44336",
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: 1,
                          padding: "0 2px",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
