import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  itemMasterAPI,
  categoryMasterAPI,
  companyMasterAPI,
} from "../api/auth";
import {
  ImportBtn,
  ExportBtn,
  TemplateBtn,
  ImportModal,
} from "../components/ui/BasicComponents";
import ConfirmModal from "../components/ConfirmModal";
import * as XLSX from "xlsx";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const ITEM_TABS = [
  { key: "Raw Material", label: "Raw Material", prefix: "RM" },
  { key: "Consumable", label: "Consumable", prefix: "CG" },
  { key: "Finished Goods", label: "Finished Goods", prefix: "FG" },
  { key: "Machine Spare", label: "Machine Spare", prefix: "MS" },
];

const CATEGORY_CONFIG = {
  "Paper Bag": { layout: "3D", f1: "WIDTH", f2: "GUSSETT", f3: "HEIGHT" },
  "Paper Pouch": { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
  "Paper Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
  "Corrugated Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
  "Mono Carton": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
  "Laminated Pouch": { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
  Sticker: { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
  Label: { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
};

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

export default function ItemMaster({ companyMaster = [], toast }) {
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
  const [gussett, setGussett] = useState("");
  const [height, setHeight] = useState("");
  const [uom, setUom] = useState("mm");
  const [newItemName, setNewItemName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCategory, setCompanyCategory] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [rawCategories, setRawCategories] = useState([]);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showClientCodes, setShowClientCodes] = useState(null);
  const [manualClient, setManualClient] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, count: 0 });
  const fileInputRef = useRef(null);
  const companyCodesFileRef = useRef(null);

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
    } else if (activeTab === "Finished Goods" && selectedCategory) {
      let sizeStr = "";
      if (width && length && height)
        sizeStr = `${width}x${length}x${height}${uom}`;
      else if (width && length) sizeStr = `${width}x${length}${uom}`;
      else if (width) sizeStr = `${width}${uom}`;

      const parts = [
        selectedCategory,
        selectedSubCategory,
        sizeStr,
        companyName,
      ];
      setNewItemName(parts.filter(Boolean).join(" "));
    }
  }, [
    selectedCategory,
    selectedSubCategory,
    gsm,
    width,
    length,
    gussett,
    height,
    uom,
    activeTab,
    companyName,
  ]);

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
          gsm:
            activeTab === "Raw Material" || activeTab === "Finished Goods"
              ? Number(gsm)
              : undefined,
          width: Number(width) || undefined,
          length: Number(length) || undefined,
          gussett: Number(gussett) || undefined,
          height: Number(height) || undefined,
          uom: uom,
          clientName: activeTab === "Finished Goods" ? companyName : undefined,
          companyCategory:
            activeTab === "Finished Goods" ? companyCategory : undefined,
          gstRate: Number(gstRate),
          hsnCode,
          reorderLevel: Number(reorderLevel),
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
          gsm:
            activeTab === "Raw Material" || activeTab === "Finished Goods"
              ? Number(gsm)
              : undefined,
          width: Number(width) || undefined,
          length: Number(length) || undefined,
          gussett: Number(gussett) || undefined,
          height: Number(height) || undefined,
          uom: uom,
          clientName: activeTab === "Finished Goods" ? companyName : undefined,
          companyCategory:
            activeTab === "Finished Goods" ? companyCategory : undefined,
          gstRate: Number(gstRate),
          hsnCode,
          reorderLevel: Number(reorderLevel),
          code: "",
        });
        toast("Item added successfully", "success");
      }
      setNewItemName("");
      setCompanyName("");
      setCompanyCategory("");
      setSelectedCategory("");
      setSelectedSubCategory("");
      setGsm("");
      setWidth("");
      setLength("");
      setGstRate("18");
      setHsnCode("");
      setReorderLevel("0");
      fetchItems();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save item", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      setLoading(true);
      await itemMasterAPI.delete(item._id);
      toast("Item deleted successfully", "success");
      fetchItems();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to delete item", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setActiveTab(item.type);
    setEditingItem(item);
    setNewItemName(item.name || "");
    setSelectedCategory(item.category || "");
    setSelectedSubCategory(item.subCategory || "");
    setGsm(item.gsm || "");
    setWidth(item.width || "");
    setLength(item.length || "");
    setGussett(item.gussett || "");
    setHeight(item.height || "");
    setUom(item.uom || "mm");
    setGstRate(item.gstRate || "18");
    setHsnCode(item.hsnCode || "");
    setReorderLevel(item.reorderLevel || "0");
    setCompanyName(item.brandName || item.clientName || "");
    setCompanyCategory(item.companyCategory || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await itemMasterAPI.bulkDelete(selectedIds);
      toast(`Successfully deleted ${confirmModal.count} items`, "success");
      setSelectedIds([]);
      fetchItems();
    } catch (error) {
      toast("Bulk delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSizeChange = (v) => {
    setSelectedSubCategory(v);
    if (activeTab !== "Finished Goods" || !v) return;

    const config = CATEGORY_CONFIG[selectedCategory] || {
      layout: "2D",
      f1: "WIDTH",
      f2: "LENGTH",
    };

    const match3D = v
      .toLowerCase()
      .match(
        /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*(?:(\d+)\s*gsm)?/,
      );

    const match2D = v
      .toLowerCase()
      .match(
        /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*(?:(\d+)\s*gsm)?/,
      );

    if (match3D) {
      setWidth(match3D[1]);
      if (config?.f2 === "LENGTH") {
        setLength(match3D[2]);
        setGussett("");
      } else {
        setGussett(match3D[2]);
        setLength("");
      }
      setHeight(match3D[3]);
      if (match3D[4] && ["mm", "cm", "inch"].includes(match3D[4]))
        setUom(match3D[4]);
      if (match3D[5]) setGsm(match3D[5]);
    } else if (match2D) {
      setWidth(match2D[1]);
      if (config?.f2 === "HEIGHT") {
        setHeight(match2D[2]);
        setLength("");
      } else {
        setLength(match2D[2]);
        setHeight("");
      }
      setGussett("");
      if (match2D[3] && ["mm", "cm", "inch"].includes(match2D[3]))
        setUom(match2D[3]);
      if (match2D[4]) setGsm(match2D[4]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sorted.length && sorted.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sorted.map((i) => i._id));
    }
  };

  const getTabColumns = () => {
    const common = [
      { header: "Product Code", key: (i) => i.code || "" },
      { header: "Item Name", key: (i) => i.name || "" },
      { header: "Category", key: (i) => i.category || "" },
      { header: "Sub Category", key: (i) => i.subCategory || "" },
    ];

    const dims = [
      { header: "GSM", key: (i) => i.gsm ?? "" },
      { header: "Width (mm)", key: (i) => i.width ?? "" },
      { header: "Length (mm)", key: (i) => i.length ?? "" },
    ];

    const tail = [
      { header: "GST Rate (%)", key: (i) => i.gstRate ?? "" },
      { header: "HSN Code", key: (i) => i.hsnCode || "" },
      { header: "Reorder Level", key: (i) => i.reorderLevel ?? "" },
      { header: "Status", key: (i) => i.status || "Active" },
      {
        header: "Date Added",
        key: (i) =>
          i.addedOn || i.createdAt
            ? new Date(i.addedOn || i.createdAt).toISOString().split("T")[0]
            : "",
      },
    ];

    if (activeTab === "Finished Goods") {
      return [
        ...common,
        { header: "Client Name", key: (i) => i.clientName || "" },
        { header: "Client Category", key: (i) => i.companyCategory || "" },
        { header: "UOM", key: (i) => i.uom || "mm" },
        { header: "GSM", key: (i) => i.gsm ?? "" },
        { header: "Width", key: (i) => i.width ?? "" },
        { header: "Length", key: (i) => i.length ?? "" },
        { header: "Gussett", key: (i) => i.gussett ?? "" },
        { header: "Height", key: (i) => i.height ?? "" },
        ...tail,
      ];
    }

    if (activeTab === "Raw Material") {
      return [...common, ...dims, ...tail];
    }

    // Consumable / Machine Spare
    return [...common, ...tail];
  };

  const handleTemplate = () => {
    const tab = ITEM_TABS.find((t) => t.key === activeTab);
    const cols = getTabColumns();
    const header = cols.map((c) => c.header);

    const exampleItem = {
      code: "",
      name: "Example Item Name",
      category: tabCategories[0] || "Category",
      subCategory: tabSubCategories[0] || "Sub Category",
      clientName: "Client Name",
      companyCategory: "Modern Trade",
      uom: "mm",
      gsm: 100,
      width: 200,
      length: 300,
      gussett: 50,
      height: 150,
      gstRate: 18,
      hsnCode: "4819",
      reorderLevel: 0,
      status: "Active",
      addedOn: "",
    };

    const row = cols.map((c) => c.key(exampleItem));

    const ws = XLSX.utils.aoa_to_sheet([header, row]);
    // Style header row width
    ws["!cols"] = header.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeTab} Template`);
    XLSX.writeFile(wb, `${tab.prefix}_template.xlsx`);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let rawData = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      } else {
        const text = await file.text();
        rawData = text
          .split("\n")
          .filter(Boolean)
          .map((line) =>
            line.split(",").map((v) => v.replace(/^"|"$/g, "").trim()),
          );
      }

      if (rawData.length < 2) {
        toast("No data found in file", "error");
        return;
      }

      const [headers, ...rows] = rawData;
      const colsDef = getTabColumns();

      const imported = [];
      for (const rowData of rows) {
        if (!rowData || rowData.length === 0) continue;

        // Skip if row is mostly empty
        if (!rowData[1] && !rowData[2]) continue;

        const item = { type: activeTab };

        // Map columns based on template order (same as getTabColumns)
        colsDef.forEach((col, idx) => {
          const val = rowData[idx];
          if (val === undefined || val === null) return;

          // Reverse mapping: we need to know which property to set
          // Since we can't easily get the property name from the key function (i) => i.prop
          // Let's manually map the most important ones or use a smarter approach

          const header = col.header.toLowerCase();
          if (header.includes("product code")) item.code = String(val).trim();
          else if (header.includes("item name")) item.name = String(val).trim();
          else if (header.includes("category") && !header.includes("client"))
            item.category = String(val).trim();
          else if (header.includes("sub category"))
            item.subCategory = String(val).trim();
          else if (header.includes("client name"))
            item.clientName = String(val).trim();
          else if (header.includes("client category"))
            item.companyCategory = String(val).trim();
          else if (header.includes("uom")) item.uom = String(val).trim();
          else if (header.includes("gsm")) item.gsm = Number(val) || undefined;
          else if (header.includes("width"))
            item.width = Number(val) || undefined;
          else if (header.includes("length"))
            item.length = Number(val) || undefined;
          else if (header.includes("gussett"))
            item.gussett = Number(val) || undefined;
          else if (header.includes("height"))
            item.height = Number(val) || undefined;
          else if (header.includes("gst rate"))
            item.gstRate = Number(val) || undefined;
          else if (header.includes("hsn code"))
            item.hsnCode = String(val).trim();
          else if (header.includes("reorder level"))
            item.reorderLevel = Number(val) || 0;
          else if (header.includes("status")) item.status = String(val).trim();
        });

        if (!item.name && item.category) {
          item.name = [item.category, item.subCategory, item.clientName]
            .filter(Boolean)
            .join(" ");
        }

        if (item.name) {
          imported.push(item);
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
    const cols = getTabColumns();
    const header = cols.map((c) => c.header);
    const rows = tabItems.map((item) => cols.map((c) => c.key(item)));

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `${activeTab.replace(/ /g, "_")}_items.xlsx`);
    toast("Exported!", "success");
  };

  const handleDownloadClientCodeTemplate = () => {
    const fgItems = itemMasterFG.filter((i) => i.type === "Finished Goods");
    if (!fgItems.length) {
      toast("No Finished Goods items found", "error");
      return;
    }

    const uniqueClients = [
      ...new Set(itemMasterFG.map((i) => i.clientName).filter(Boolean)),
    ];

    const header = ["Our Product Code", "Item Name", ...uniqueClients];
    const data = fgItems.map((item) => {
      const row = [item.code, item.name];
      uniqueClients.forEach((client) => {
        row.push(item.companyCodes?.[client] || "");
      });
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client Codes");
    XLSX.writeFile(wb, "Client_Product_Codes_Template.xlsx");
  };

  const handleImportClientCodes = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const [header, ...rows] = data;
      const clientNames = header.slice(2);

      let successCount = 0;
      for (const row of rows) {
        const ourCode = row[0];
        if (!ourCode) continue;

        const item = itemMasterFG.find((i) => i.code === ourCode);
        if (!item) continue;

        const newClientCodes = { ...(item.companyCodes || {}) };
        let hasChanges = false;

        clientNames.forEach((client, idx) => {
          const clientCode = row[idx + 2];
          if (clientCode !== undefined) {
            newClientCodes[client] = String(clientCode).trim();
            hasChanges = true;
          }
        });

        if (hasChanges) {
          try {
            await itemMasterAPI.update(item._id, {
              companyCodes: newClientCodes,
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to update ${ourCode}:`, err);
          }
        }
      }

      toast(`Successfully updated ${successCount} items`, "success");
      fetchItems();
    } catch (err) {
      console.error("Import client codes logic error:", err);
      toast("Failed to process file", "error");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleManualClientCodeSave = async (item) => {
    if (!manualClient || !manualCode) {
      toast("Select client and enter code", "error");
      return;
    }

    try {
      const newCodes = {
        ...(item.companyCodes || {}),
        [manualClient]: manualCode,
      };
      await itemMasterAPI.update(item._id, { companyCodes: newCodes });
      toast("Client code updated", "success");
      setManualClient("");
      setManualCode("");
      fetchItems();
    } catch (err) {
      toast("Failed to update client code", "error");
    }
  };

  const removeClientCode = async (item, client) => {
    try {
      const newCodes = { ...(item.companyCodes || {}) };
      delete newCodes[client];
      await itemMasterAPI.update(item._id, { companyCodes: newCodes });
      toast("Client code removed", "success");
      fetchItems();
    } catch (err) {
      toast("Failed to remove code", "error");
    }
  };

  return (
    <div className="fade">
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Items"
      />
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
              setCompanyName("");
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
                {activeTab === "Finished Goods"
                  ? "SIZE *"
                  : "SUB-CATEGORY / TYPE *"}
              </label>
              <select
                value={selectedSubCategory}
                onChange={(e) => handleSizeChange(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Manual / Custom --</option>
                {tabSubCategories.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeTab === "Finished Goods" && (
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
                BRAND NAME *
              </label>
              <input
                style={inputStyle}
                placeholder="e.g. Brand Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          )}
          {activeTab === "Finished Goods" && (
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
                COMPANY NAME
              </label>
              <input
                style={inputStyle}
                placeholder="e.g. Modern Trade"
                value={companyCategory}
                onChange={(e) => setCompanyCategory(e.target.value)}
              />
            </div>
          )}
          {activeTab === "Finished Goods" && selectedCategory && (
            <>
              {(() => {
                const config = CATEGORY_CONFIG[selectedCategory] || {
                  layout: "2D",
                  f1: "WIDTH",
                  f2: "LENGTH",
                };
                const f1 = config.f1;
                const f2 = config.f2;
                const f3 = config.f3;

                return (
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
                        UOM
                      </label>
                      <select
                        value={uom}
                        onChange={(e) => setUom(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="inch">inch</option>
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
                        GSM
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
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
                        {f1} ({uom})
                      </label>
                      <input
                        type="number"
                        placeholder={`e.g. 10`}
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    {f2 && (
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
                          {f2} ({uom})
                        </label>
                        <input
                          type="number"
                          placeholder={`e.g. 10`}
                          value={f2 === "GUSSETT" ? gussett : length}
                          onChange={(e) =>
                            f2 === "GUSSETT"
                              ? setGussett(e.target.value)
                              : setLength(e.target.value)
                          }
                          style={inputStyle}
                        />
                      </div>
                    )}
                    {f3 && (
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
                          {f3} ({uom})
                        </label>
                        <input
                          type="number"
                          placeholder={`e.g. 10`}
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </>
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
                  activeTab === "Raw Material" || activeTab === "Finished Goods"
                    ? "#0a0a0a"
                    : inputStyle.background,
              }}
              readOnly={
                activeTab === "Raw Material" || activeTab === "Finished Goods"
              }
              placeholder={`Enter ${activeTab} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
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
              GST RATE (%)
            </label>
            <input
              type="number"
              placeholder="e.g. 18"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
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
              HSN CODE
            </label>
            <input
              placeholder="e.g. 4819"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
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
              REORDER LEVEL
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {}
        {(activeTab === "Raw Material" || activeTab === "Finished Goods") && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "#111",
                border: "1px dashed #2196F344",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 11, color: "#555" }}>Preview:</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#4CAF50",
                  fontFamily: "monospace",
                }}
              >
                {newItemName || "—"}
              </span>
            </div>
            <div
              style={{
                width: 160,
                padding: "12px 16px",
                background: "#0d0d0d",
                border: "1px solid #222",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 10, color: "#444" }}>Auto Code:</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#4CAF50",
                  fontFamily: "monospace",
                }}
              >
                {ITEM_TABS.find((t) => t.key === activeTab)?.prefix}
                {"????"}
              </span>
            </div>
          </div>
        )}

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
                setGstRate("18");
                setHsnCode("");
                setReorderLevel("0");
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

      {activeTab === "Finished Goods" && (
        <div
          style={{
            background: "linear-gradient(135deg, #1e1b4b, #0d0d0d)",
            border: "1px solid #4f46e544",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#818cf8",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 16 }}>🏭</span> Bulk Import Company Product
            Codes
          </div>
          <div style={{ fontSize: 12, color: "#6366f199", lineHeight: 1.5 }}>
            Download the template → fill in client codes → re-import. One column
            per client. Leave blank if that client doesn't have a code for that
            item.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={handleDownloadClientCodeTemplate}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid #4f46e5",
                borderRadius: 6,
                color: "#818cf8",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⬇️ Download Template
            </button>
            <button
              onClick={() => companyCodesFileRef.current.click()}
              style={{
                padding: "8px 16px",
                background: "#4f46e5",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⬆️ Import Codes
            </button>
            <input
              type="file"
              ref={companyCodesFileRef}
              hidden
              accept=".xlsx,.xls"
              onChange={handleImportClientCodes}
            />
          </div>
          <div style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>
            Template columns: Our Product Code · Item Name · one column per
            client
          </div>
        </div>
      )}

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

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectedIds.length > 0 && (
            <button
              onClick={() =>
                setConfirmModal({ isOpen: true, count: selectedIds.length })
              }
              style={{
                background: "#450a0a",
                color: "#ef4444",
                border: "1px solid #7f1d1d",
                borderRadius: 6,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginRight: 10,
              }}
            >
              🗑️ Delete {selectedIds.length} Selected
            </button>
          )}
          <ExportBtn onClick={handleExport} label="Export" />
          <TemplateBtn onClick={handleTemplate} />
          <ImportBtn
            onClick={() => fileInputRef.current?.click()}
            label="Bulk Import"
          />
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
          />
        </div>
      </div>

      {sorted.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "8px 8px 0 0",
            marginBottom: -1,
            gap: 16,
          }}
        >
          <input
            type="checkbox"
            checked={sorted.length > 0 && selectedIds.length === sorted.length}
            onChange={toggleSelectAll}
            style={{ cursor: "pointer", width: 16, height: 16 }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>
            SELECT ALL {activeTab} ITEMS
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          border: "1px solid #2a2a2a",
          borderRadius: sorted.length > 0 ? "0 0 10px 10px" : "10px",
          overflow: "hidden",
        }}
      >
        {sorted.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "#1a1a1a",
              color: "#444",
            }}
          >
            No items found.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "#0a0a0a",
                borderBottom: "1px solid #2a2a2a",
                gap: 16,
                fontSize: 10,
                fontWeight: 800,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <div style={{ width: 16 }} />
              <div style={{ minWidth: 70, textAlign: "left" }}>Code</div>
              <div style={{ minWidth: 260, textAlign: "left" }}>Item Name</div>
              {activeTab === "Finished Goods" && (
                <div style={{ width: 70, textAlign: "left" }}>Client Cat</div>
              )}
              <div style={{ width: 90, textAlign: "left" }}>Category</div>

              <div style={{ width: 60, textAlign: "left" }}>Sub-Category</div>
              <div style={{ minWidth: 40, textAlign: "center" }}>GST</div>
              <div style={{ minWidth: 130, textAlign: "left" }}>Reorder</div>
              <div style={{ width: 220, textAlign: "right" }}>Actions</div>
            </div>
            {sorted.map((item, idx) => (
              <div
                key={item._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  background: idx % 2 === 0 ? "#0d1117" : "#11151c",
                  borderBottom:
                    idx === sorted.length - 1 ? "none" : "1px solid #21262d",
                  gap: 16,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item._id)}
                  onChange={() => toggleSelect(item._id)}
                  style={{ cursor: "pointer", width: 16, height: 16 }}
                />
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
                {activeTab === "Finished Goods" && (
                  <div
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: "#9c27b01a",
                      color: "#ba68c8",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.companyCategory || "-"}
                  </div>
                )}
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
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#64B5F614",
                    color: "#64B5F6",
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 40,
                    textAlign: "center",
                  }}
                >
                  {item.gstRate || 0}%
                </div>
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#ff98001a",
                    color: "#ff9800",
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 50,
                    textAlign: "center",
                  }}
                >
                  RL: {item.reorderLevel || 0}
                </div>

                {activeTab === "Finished Goods" && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => {
                        setManualClient("");
                        setManualCode("");
                        setShowClientCodes(
                          showClientCodes === item._id ? null : item._id,
                        );
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "#4f46e51a",
                        color: "#818cf8",
                        border: "1px solid #4f46e544",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        minWidth: 100,
                      }}
                    >
                      🎟️ Co. Codes {showClientCodes === item._id ? "▲" : "▼"}
                    </button>
                    {showClientCodes === item._id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          zIndex: 100,
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                          padding: 8,
                          minWidth: 150,
                          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                          marginTop: 4,
                        }}
                      >
                        {item.companyCodes &&
                        Object.entries(item.companyCodes).filter(([_, v]) => v)
                          .length > 0 ? (
                          Object.entries(item.companyCodes)
                            .filter(([_, v]) => v)
                            .map(([client, code]) => (
                              <div
                                key={client}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 11,
                                  padding: "4px 0",
                                  borderBottom: "1px solid #222",
                                  gap: 10,
                                }}
                              >
                                <span style={{ color: "#666" }}>{client}:</span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "#e0e0e0",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {code}
                                  </span>
                                  <button
                                    onClick={() =>
                                      removeClientCode(item, client)
                                    }
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: 10,
                                      color: "#ff4444",
                                      padding: 0,
                                    }}
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#444",
                              textAlign: "center",
                              marginBottom: 8,
                            }}
                          >
                            No client codes
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 10,
                            borderTop: "1px solid #333",
                            paddingTop: 8,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              color: "#818cf8",
                              marginBottom: 4,
                              fontWeight: 700,
                            }}
                          >
                            + ADD CLIENT CODE
                          </div>
                          <select
                            value={manualClient}
                            onChange={(e) => setManualClient(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#000",
                              border: "1px solid #333",
                              borderRadius: 4,
                              fontSize: 10,
                              color: "#fff",
                              padding: 4,
                              marginBottom: 4,
                              outline: "none",
                            }}
                          >
                            <option value="">-- Select Company --</option>
                            {(companyMaster || []).map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              placeholder="Code"
                              value={manualCode}
                              onChange={(e) => setManualCode(e.target.value)}
                              style={{
                                flex: 1,
                                background: "#000",
                                border: "1px solid #333",
                                borderRadius: 4,
                                fontSize: 10,
                                color: "#fff",
                                padding: 4,
                                outline: "none",
                              }}
                            />
                            <button
                              onClick={() => handleManualClientCodeSave(item)}
                              style={{
                                background: "#4f46e5",
                                border: "none",
                                borderRadius: 4,
                                color: "#fff",
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              SAVE
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ color: "#484f58", fontSize: 11, minWidth: 80 }}>
                  {
                    new Date(item.addedOn || item.createdAt)
                      .toISOString()
                      .split("T")[0]
                  }
                </div>
                <button
                  onClick={() => handleEdit(item)}
                  style={{
                    background: "#1e293b",
                    color: "#64b5f6",
                    border: "1px solid #334155",
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
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
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
            ))}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, count: 0 })}
        onConfirm={handleBulkDelete}
        title="Delete Items"
        message={`Are you sure you want to delete ${confirmModal.count} item${confirmModal.count !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
