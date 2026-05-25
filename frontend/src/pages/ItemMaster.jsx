import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import {
  itemMasterAPI,
  categoryMasterAPI,
  companyMasterAPI,
  brandMasterAPI,
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
  "Paper Bag without Handle": {
    layout: "3D",
    f1: "WIDTH",
    f2: "GUSSETT",
    f3: "HEIGHT",
  },
  "Paper Bag with Handle": {
    layout: "3D",
    f1: "WIDTH",
    f2: "GUSSETT",
    f3: "HEIGHT",
  },
  Manual: { layout: "3D", f1: "WIDTH", f2: "GUSSETT", f3: "HEIGHT" },
  "Paper Pouch": { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
  "Paper Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
  "Corrugated Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
  "Mono Carton": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
  "Laminated Pouch": { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
  Sticker: { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
  Label: { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
};

// Dimension config for consumable categories that need size fields
const CONSUMABLE_DIM_CONFIG = {
  "LDPE Polybag": { fields: ["WIDTH", "HEIGHT"] },
  "Corrugated Box": { fields: ["WIDTH", "LENGTH", "HEIGHT"] },
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 6,
  fontSize: 13,
  background: "rgba(255,255,255,0.07)",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box",
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function ItemMaster({
  companyMaster = [],
  toast,
  refreshData,
  canExportImport = true,
}) {
  const [itemMasterFG, setItemMasterFG] = useState([]);
  const [categoryMaster, setCategoryMaster] = useState({});
  const [brandMaster, setBrandMaster] = useState([]);
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
  const [productCode, setProductCode] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showClientCodes, setShowClientCodes] = useState(null);
  const [manualClient, setManualClient] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, count: 0 });
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const fileInputRef = useRef(null);
  const companyCodesFileRef = useRef(null);
  const editInitRef = useRef(false); // suppresses name auto-gen during edit init
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await brandMasterAPI.getAll();
      setBrandMaster(Array.isArray(res) ? res : res?.brands || []);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    // Skip during edit form initialization — name is already set from saved data
    if (editInitRef.current) return;

    if (activeTab === "Raw Material" && selectedCategory) {
      // Polycoated Blanks: user types name manually, no auto-generation
      if (
        selectedSubCategory === "Polycoated Blanks" ||
        selectedCategory === "Polycoated Blanks"
      ) {
        return;
      }
      const catLabel = selectedCategory.startsWith("Paper ")
        ? selectedCategory.slice(6)
        : selectedCategory;
      const parts = [selectedSubCategory, catLabel];
      if (gsm) parts.push(gsm + "gsm");
      if (width && length) parts.push(width + "x" + length + "mm");
      else if (width) parts.push(width + "mm");

      setNewItemName(parts.filter(Boolean).join(" "));
    } else if (activeTab === "Finished Goods" && selectedCategory === "Other" || selectedCategory === "Others") {
      // "Other" category: user types name manually, no auto-generation
      return;
    } else if (activeTab === "Finished Goods" && selectedCategory) {
      let sizeStr = "";
      const fgCfg = CATEGORY_CONFIG[selectedCategory];
      const usesGussett = fgCfg?.f2 === "GUSSETT";
      if (usesGussett) {
        if (width && gussett && height)
          sizeStr = `${width}x${gussett}x${height}${uom}`;
        else if (width && gussett) sizeStr = `${width}x${gussett}${uom}`;
        else if (width) sizeStr = `${width}${uom}`;
      } else if (width && length && height)
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
    } else if (
      (activeTab === "Consumable" || activeTab === "Machine Spare") &&
      selectedCategory
    ) {
      const dimCfg = CONSUMABLE_DIM_CONFIG[selectedCategory];
      const parts = [selectedCategory];
      const uomSuffix = uom === "N/A" ? "" : uom;
      if (dimCfg) {
        const dims = [];
        if (dimCfg.fields.includes("WIDTH") && width) dims.push(width);
        if (dimCfg.fields.includes("LENGTH") && length) dims.push(length);
        if (dimCfg.fields.includes("HEIGHT") && height) dims.push(height);
        if (dims.length) parts.push(dims.join("x") + uomSuffix);
      } else if (selectedSubCategory) {
        parts.push(selectedSubCategory + uomSuffix);
      }
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
    return [...new Set(names)];
  }, [rawCategories, activeTab]);

  const tabSubCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const catObj = rawCategories.find(
      (c) => c.type === activeTab && c.subTypes?.[selectedCategory],
    );
    return catObj ? catObj.subTypes[selectedCategory] : [];
  }, [rawCategories, activeTab, selectedCategory]);

  const clientCategories = useMemo(() => {
    const clientDoc = rawCategories.find((c) => c.type === "Client");
    return Object.keys(clientDoc?.subTypes || {});
  }, [rawCategories]);

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
      const dateA = new Date(a.createdAt || a.addedOn || 0).getTime();
      const dateB = new Date(b.createdAt || b.addedOn || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
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
          code: productCode.trim() || undefined,
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
          companyName: activeTab === "Finished Goods" ? companyName : undefined,
          companyCategory:
            activeTab === "Finished Goods" ? companyCategory : undefined,
          gstRate: Number(gstRate),
          hsnCode,
          reorderLevel: Number(reorderLevel),
          type: activeTab,
        });
        toast("Item updated", "success");
        setEditingItem(null);
        setShowEditModal(false);
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
          companyName: activeTab === "Finished Goods" ? companyName : undefined,
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
      setGussett("");
      setHeight("");
      setGstRate("18");
      setHsnCode("");
      setReorderLevel("0");
      setProductCode("");
      fetchItems();
      refreshData?.();
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
      refreshData?.();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to delete item", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    editInitRef.current = true; // prevent useEffect from overwriting the name
    setActiveTab(item.type);
    setEditingItem(item);
    setNewItemName(item.name || "");
    setSelectedCategory(item.category || "");
    setSelectedSubCategory(item.subCategory || "");

    // Parse dims from name as fallback if DB fields are empty
    const parsedDims = (() => {
      const n = item.name || "";
      const gsmMatch = n.match(/(\d+(?:\.\d+)?)\s*gsm/i);
      const dim3 = n.match(
        /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|inch)/i,
      );
      const dim2 = n.match(
        /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|inch)/i,
      );
      const dim1 = n.match(/(\d+(?:\.\d+)?)\s*(mm|cm|inch)/i);
      return {
        gsm: gsmMatch ? gsmMatch[1] : "",
        width: dim3 ? dim3[1] : dim2 ? dim2[1] : dim1 ? dim1[1] : "",
        length: dim3 ? dim3[2] : dim2 ? dim2[2] : "",
        height: dim3 ? dim3[3] : "",
        uom: dim3 ? dim3[4] : dim2 ? dim2[3] : dim1 ? dim1[2] : "mm",
      };
    })();

    setGsm(item.gsm != null ? String(item.gsm) : parsedDims.gsm);
    setWidth(item.width != null ? String(item.width) : parsedDims.width);
    setLength(item.length != null ? String(item.length) : parsedDims.length);
    setGussett(item.gussett != null ? String(item.gussett) : "");
    setHeight(item.height != null ? String(item.height) : parsedDims.height);
    setUom(item.uom || parsedDims.uom || "mm");
    setGstRate(item.gstRate != null ? String(item.gstRate) : "18");
    setHsnCode(item.hsnCode || "");
    setReorderLevel(
      item.reorderLevel != null ? String(item.reorderLevel) : "0",
    );
    setCompanyName(item.companyName || "");
    setCompanyCategory(item.companyCategory || "");
    setProductCode(item.code || "");

    setShowEditModal(true);
    // Re-enable auto-name after all state setters have flushed
    setTimeout(() => {
      editInitRef.current = false;
    }, 0);
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await itemMasterAPI.bulkDelete(selectedIds);
      toast(`Successfully deleted ${confirmModal.count} items`, "success");
      setSelectedIds([]);
      fetchItems();
      refreshData?.();
    } catch (error) {
      toast("Bulk delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      const ids = tabItems.map((i) => i._id);
      await itemMasterAPI.bulkDelete(ids);
      toast(`Deleted all ${activeTab} items`, "success");
      setSelectedIds([]);
      fetchItems();
      refreshData?.();
    } catch (error) {
      toast("Delete all failed", "error");
    } finally {
      setLoading(false);
      setDeleteAllModal(false);
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
        { header: "Client Name", key: (i) => i.companyName || "" },
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

    ws["!cols"] = header.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeTab} Template`);
    XLSX.writeFile(wb, `${tab.prefix}_template.xlsx`);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rawData.length < 2) {
        toast("No data found in file", "error");
        return;
      }

      const [headers, ...rows] = rawData;
      const colsDef = getTabColumns();

      // Build Excel header → column index map (case-insensitive, trimmed)
      const xlColIdx = {};
      (headers || []).forEach((h, i) => {
        if (h != null) xlColIdx[String(h).toLowerCase().trim()] = i;
      });

      // Get a cell value: prefer matching by the actual Excel header name,
      // fall back to the definition's positional index.
      const getCell = (rowData, defHeader, defIdx) => {
        const key = defHeader.toLowerCase().trim();
        if (xlColIdx[key] !== undefined) return rowData[xlColIdx[key]];
        return rowData[defIdx];
      };

      const imported = [];
      for (const rowData of rows) {
        if (!rowData || rowData.length === 0) continue;

        if (!rowData[1] && !rowData[2]) continue;

        const item = { type: activeTab };

        colsDef.forEach((col, idx) => {
          const val = getCell(rowData, col.header, idx);
          if (val === undefined || val === null) return;

          const header = col.header.toLowerCase();
          if (header.includes("product code")) item.code = String(val).trim();
          else if (header.includes("item name")) item.name = String(val).trim();
          else if (header.includes("sub category"))
            item.subCategory = String(val).trim();
          else if (header.includes("category") && !header.includes("client"))
            item.category = String(val).trim();
          else if (header.includes("client name"))
            item.companyName = String(val).trim();
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
      let updatedCount = 0;
      let failedCount = 0;

      // Build a name→item map for this tab (case-insensitive lookup)
      const existingMap = new Map(
        (itemMasterFG || [])
          .filter((i) => i.type === activeTab)
          .map((i) => [(i.name || "").toLowerCase().trim(), i]),
      );

      for (let i = 0; i < imported.length; i++) {
        const item = imported[i];
        setImportProgress((prev) => ({
          ...prev,
          current: i + 1,
          status: `Processing: ${item.name}`,
        }));

        const key = (item.name || "").toLowerCase().trim();
        const existing = existingMap.get(key);

        try {
          if (existing) {
            // Update — override all fields from the import
            await itemMasterAPI.update(existing._id, item);
            updatedCount++;
          } else {
            await itemMasterAPI.create(item);
            successCount++;
            // Add to map so duplicates within the file don't double-create
            existingMap.set(key, {
              _id: key,
              name: item.name,
              type: activeTab,
            });
          }
        } catch (err) {
          console.error(`Failed to import ${item.name}:`, err);
          failedCount++;
        }
      }

      const parts = [];
      if (successCount) parts.push(`${successCount} added`);
      if (updatedCount) parts.push(`${updatedCount} updated`);
      if (failedCount) parts.push(`${failedCount} failed`);
      toast(
        `Import complete! ${parts.join(", ")}.`,
        successCount > 0 || updatedCount > 0 ? "success" : "error",
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
          style={{ fontSize: 22, fontWeight: 500, color: "#e0e0e0", margin: 0 }}
        >
          Item Master
        </h2>
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
          Manage your items, raw materials, and components
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          background: "transparent",
          padding: 4,
          borderRadius: 12,
          marginBottom: 20,
          border: "1px solid rgba(255,255,255,0.1)",
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
              background:
                activeTab === tab.key
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.05)",
              color: "#fff",
              boxShadow:
                activeTab === tab.key
                  ? "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "none",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showEditModal && editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 999,
          }}
          onClick={() => {
            setShowEditModal(false);
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
            setProductCode("");
          }}
        />
      )}

      <div
        style={
          showEditModal && editingItem
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1000,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "20px 24px",
                width: "90%",
                maxWidth: 960,
                maxHeight: "88vh",
                overflowY: "auto",
              }
            : {
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 14,
              }
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#2196F3",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {editingItem ? `Edit ${activeTab} Item` : `Add ${activeTab} Item`}
          </div>
          {showEditModal && editingItem && (
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingItem(null);
                setNewItemName("");
                setSelectedCategory("");
                setSelectedSubCategory("");
                setGsm("");
                setWidth("");
                setLength("");
                setGussett("");
                setHeight("");
                setGstRate("18");
                setHsnCode("");
                setReorderLevel("0");
                setProductCode("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#888",
                fontSize: 20,
                cursor: "pointer",
                lineHeight: 1,
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          )}
        </div>
        {editingItem && (
          <div style={{ marginBottom: 14 }}>
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
              PRODUCT CODE
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. RM0001"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
            />
          </div>
        )}

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
                setWidth("");
                setLength("");
                setHeight("");
                setNewItemName("");
                if (activeTab === "Consumable" || activeTab === "Machine Spare")
                  setUom("mm");
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
          {tabSubCategories.length > 0 ? (
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
                  : "SUB-CATEGORY / TYPE"}
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
          ) : (activeTab === "Consumable" || activeTab === "Machine Spare") &&
            selectedCategory ? (
            (() => {
              const dimCfg = CONSUMABLE_DIM_CONFIG[selectedCategory];
              const uomSelect = (
                <div key="uom">
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
                    UNIT (UOM)
                  </label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="inch">inch</option>
                    <option value="N/A">Not Applicable</option>
                  </select>
                </div>
              );
              if (dimCfg) {
                // Dimension fields for LDPE Polybag / Corrugated + UOM
                return [
                  uomSelect,
                  ...dimCfg.fields.map((field) => (
                    <div key={field}>
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
                        {field}
                        {uom !== "N/A" ? ` (${uom})` : ""}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 200"
                        style={inputStyle}
                        value={
                          field === "WIDTH"
                            ? width
                            : field === "LENGTH"
                              ? length
                              : height
                        }
                        onChange={(e) => {
                          if (field === "WIDTH") setWidth(e.target.value);
                          else if (field === "LENGTH")
                            setLength(e.target.value);
                          else setHeight(e.target.value);
                        }}
                      />
                    </div>
                  )),
                ];
              }
              // Default: free-text SIZE / TYPE + UOM
              return [
                <div key="size">
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
                    SIZE / TYPE
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. 100, A4, Large"
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                  />
                </div>,
                uomSelect,
              ];
            })()
          ) : null}
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
              <select
                style={inputStyle}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              >
                <option value="">-- Select Brand --</option>
                {brandMaster.map((b) => (
                  <option key={b._id} value={b.name}>
                    {b.name}
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
                CLIENT CATEGORY
              </label>
              <select
                style={inputStyle}
                value={companyCategory}
                onChange={(e) => setCompanyCategory(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                {clientCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeTab === "Finished Goods" && selectedCategory && selectedCategory !== "Other" && (
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
                  activeTab !== "Consumable" &&
                  activeTab !== "Machine Spare" &&
                  selectedSubCategory !== "Polycoated Blanks" &&
                  selectedCategory !== "Polycoated Blanks" &&
                  !(activeTab === "Finished Goods" && selectedCategory === "Other" || selectedCategory === "Others")
                    ? "rgba(255,255,255,0.03)"
                    : inputStyle.background,
              }}
              readOnly={
                activeTab !== "Consumable" &&
                activeTab !== "Machine Spare" &&
                selectedSubCategory !== "Polycoated Blanks" &&
                selectedCategory !== "Polycoated Blanks" &&
                !(activeTab === "Finished Goods" && selectedCategory === "Other" || selectedCategory === "Others")
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
                background: "rgba(255,255,255,0.04)",
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
                  fontWeight: 500,
                  color: "#4CAF50",
                }}
              >
                {newItemName || "—"}
              </span>
            </div>
            <div
              style={{
                width: 160,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
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
                  fontWeight: 500,
                  color: "#4CAF50",
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
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 6,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {editingItem ? "Update Item" : `+ Add ${activeTab} Item`}
          </button>
          {editingItem && (
            <button
              onClick={() => {
                setEditingItem(null);
                setShowEditModal(false);
                setNewItemName("");
                setSelectedCategory("");
                setSelectedSubCategory("");
                setGsm("");
                setWidth("");
                setLength("");
                setGstRate("18");
                setHsnCode("");
                setReorderLevel("0");
                setProductCode("");
              }}
              style={{
                background: "transparent",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-xmark" /> Cancel
            </button>
          )}
        </div>
      </div>

      {activeTab === "Finished Goods" && (
        <div
          style={{
            background: "rgba(79,70,229,0.12)",
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
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            <i className="fa-solid fa-industry" style={{ fontSize: 16 }} /> Bulk
            Import Company Product Codes
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
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Download Template
            </button>
            <button
              onClick={() => companyCodesFileRef.current.click()}
              style={{
                padding: "8px 16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Import Codes
            </button>
            <input
              type="file"
              ref={companyCodesFileRef}
              hidden
              accept=".xlsx,.xls"
              onChange={handleImportClientCodes}
            />
          </div>
          <div style={{ fontSize: 10, color: "#444" }}>
            Template columns: Our Product Code · Item Name · one column per
            client
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flex: 1,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <input
            placeholder="Search code or name..."
            style={{
              ...inputStyle,
              maxWidth: 300,
              minWidth: 120,
              background: "rgba(255,255,255,0.07)",
              borderColor: "rgba(255,255,255,0.13)",
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
              minWidth: 120,
              background: "rgba(255,255,255,0.07)",
              borderColor: "rgba(255,255,255,0.13)",
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

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {selectedIds.length > 0 && (
            <button
              onClick={() =>
                setConfirmModal({ isOpen: true, count: selectedIds.length })
              }
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 6,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginRight: 10,
              }}
            >
              Delete {selectedIds.length} Selected
            </button>
          )}
          {canExportImport && (
            <ExportBtn onClick={handleExport} label="Export" />
          )}
          <TemplateBtn onClick={handleTemplate} />
          {canExportImport && (
            <ImportBtn
              onClick={() => fileInputRef.current?.click()}
              label="Bulk Import"
            />
          )}
          {tabItems.length > 0 && activeTab === "Machine Spare" && (
            <button
              onClick={() => setDeleteAllModal(true)}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                whiteSpace: "nowrap",
              }}
            >
              Delete All
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".xlsx,.xls"
            onChange={handleImport}
          />
        </div>
      </div>

      {sorted.length > 0 && !isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
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
          <span style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>
            SELECT ALL {activeTab} ITEMS
          </span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#444",
          }}
        >
          No items found.
        </div>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.length === sorted.length}
              onChange={toggleSelectAll}
              style={{ cursor: "pointer", width: 16, height: 16 }}
            />
            <span style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>
              SELECT ALL ({sorted.length})
            </span>
          </div>
          {sorted.map((item) => (
            <div
              key={item._id}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              {/* top row: checkbox + code + name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item._id)}
                  onChange={() => toggleSelect(item._id)}
                  style={{
                    cursor: "pointer",
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div
                  onClick={() => handleEdit(item)}
                  style={{
                    padding: "3px 10px",
                    border: "1px solid #2196F344",
                    borderRadius: 6,
                    color: "#2196F3",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "#2196F30a",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {item.code}
                </div>
                <div
                  style={{
                    flex: 1,
                    color: "#e6edf3",
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {item.name}
                </div>
              </div>

              {/* badges */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {activeTab === "Finished Goods" && item.companyCategory && (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: "#9c27b01a",
                      color: "#ba68c8",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.companyCategory}
                  </span>
                )}
                {item.category && (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: "#1565C022",
                      color: "#64B5F6",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.category}
                  </span>
                )}
                {item.subCategory && (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: "#4CAF501a",
                      color: "#4CAF50",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.subCategory}
                  </span>
                )}
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 20,
                    background: "#64B5F614",
                    color: "#64B5F6",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  GST {item.gstRate || 0}%
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 20,
                    background: "#ff98001a",
                    color: "#ff9800",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  RL: {item.reorderLevel || 0}
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 20,
                    background: "#ffffff08",
                    color: "#484f58",
                    fontSize: 11,
                  }}
                >
                  {
                    new Date(item.addedOn || item.createdAt)
                      .toISOString()
                      .split("T")[0]
                  }
                </span>
              </div>

              {/* Co. codes (FG) */}
              {activeTab === "Finished Goods" && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => {
                      setManualClient("");
                      setManualCode("");
                      setShowClientCodes(
                        showClientCodes === item._id ? null : item._id,
                      );
                    }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      background: "#4f46e51a",
                      color: "#818cf8",
                      border: "1px solid #4f46e544",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    Co. Codes {showClientCodes === item._id ? "▲" : "▼"}
                  </button>
                  {showClientCodes === item._id && (
                    <div
                      style={{
                        marginTop: 8,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        padding: 10,
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
                                fontSize: 12,
                                padding: "5px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.06)",
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
                                  style={{ color: "#e0e0e0", fontWeight: 700 }}
                                >
                                  {code}
                                </span>
                                <button
                                  onClick={() => removeClientCode(item, client)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    color: "#ff4444",
                                    padding: 0,
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div
                          style={{
                            fontSize: 11,
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
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
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
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.13)",
                            borderRadius: 4,
                            fontSize: 11,
                            color: "#e0e0e0",
                            padding: 5,
                            marginBottom: 6,
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
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            placeholder="Code"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            style={{
                              flex: 1,
                              background: "rgba(255,255,255,0.07)",
                              border: "1px solid rgba(255,255,255,0.13)",
                              borderRadius: 4,
                              fontSize: 11,
                              color: "#e0e0e0",
                              padding: 5,
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={() => handleManualClientCodeSave(item)}
                            style={{
                              background: "transparent",
                              color: "#ffffff",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: 6,
                              padding: "6px 12px",
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <i className="fa-solid fa-floppy-disk" /> Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleEdit(item)}
                  style={{
                    background: "transparent",
                    color: "#8082ff",
                    border: "1px solid #8082ff98",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-pen-to-square" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  style={{
                    background: "transparent",
                    color: "#8082ff",
                    border: "1px solid #8082ff98",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-trash" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0 0 10px 10px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ minWidth: 860 }}>
            {/* header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                gap: 10,
                fontSize: 10,
                fontWeight: 800,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <div style={{ width: 16, flexShrink: 0 }} />
              <div style={{ width: 72, flexShrink: 0 }}>Code</div>
              <div style={{ flex: 1, minWidth: 180 }}>Item Name</div>
              {activeTab === "Finished Goods" && (
                <div style={{ width: 100, flexShrink: 0 }}>Client Cat</div>
              )}
              <div style={{ width: 110, flexShrink: 0 }}>Category</div>
              <div style={{ width: 110, flexShrink: 0 }}>Sub-Category</div>
              <div style={{ width: 50, flexShrink: 0, textAlign: "center" }}>
                GST
              </div>
              <div style={{ width: 70, flexShrink: 0, textAlign: "center" }}>
                Reorder
              </div>
              {activeTab === "Finished Goods" && (
                <div style={{ width: 110, flexShrink: 0 }}>Co. Codes</div>
              )}
              <div style={{ width: 88, flexShrink: 0 }}>Date</div>
              <div style={{ width: 160, flexShrink: 0, textAlign: "right" }}>
                Actions
              </div>
            </div>

            {/* rows */}
            {sorted.map((item, idx) => (
              <div
                key={item._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  background: "transparent",
                  borderBottom:
                    idx === sorted.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.06)",
                  gap: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item._id)}
                  onChange={() => toggleSelect(item._id)}
                  style={{
                    cursor: "pointer",
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: 72,
                    flexShrink: 0,
                    padding: "5px 0",
                    border: "1px solid #2196F344",
                    borderRadius: 6,
                    textAlign: "center",
                    color: "#2196F3",
                    fontSize: 11,
                    fontWeight: 500,
                    background: "#2196F30a",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => handleEdit(item)}
                >
                  {item.code}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 200,
                    color: "#e6edf3",
                    fontSize: 13,
                    fontWeight: 600,
                    wordBreak: "break-word",
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
                {activeTab === "Finished Goods" && (
                  <div
                    style={{
                      width: 100,
                      flexShrink: 0,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "#9c27b01a",
                      color: "#ba68c8",
                      fontSize: 11,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.companyCategory || "-"}
                  </div>
                )}
                <div
                  style={{
                    width: 110,
                    flexShrink: 0,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#1565C022",
                    color: "#64B5F6",
                    fontSize: 11,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.category || "-"}
                </div>
                <div
                  style={{
                    width: 110,
                    flexShrink: 0,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#4CAF501a",
                    color: "#4CAF50",
                    fontSize: 11,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.subCategory || "-"}
                </div>
                <div
                  style={{
                    width: 50,
                    flexShrink: 0,
                    padding: "4px 6px",
                    borderRadius: 6,
                    background: "#64B5F614",
                    color: "#64B5F6",
                    fontSize: 10,
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  {item.gstRate || 0}%
                </div>
                <div
                  style={{
                    width: 70,
                    flexShrink: 0,
                    padding: "4px 6px",
                    borderRadius: 6,
                    background: "#ff98001a",
                    color: "#ff9800",
                    fontSize: 10,
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  RL: {item.reorderLevel || 0}
                </div>

                {activeTab === "Finished Goods" && (
                  <div
                    style={{ position: "relative", width: 110, flexShrink: 0 }}
                  >
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
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        width: "100%",
                        boxShadow:
                          "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}
                    >
                      Co. Codes {showClientCodes === item._id ? "▲" : "▼"}
                    </button>
                    {showClientCodes === item._id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          zIndex: 100,
                          background: "rgba(20,20,30,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
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
                                  borderBottom:
                                    "1px solid rgba(255,255,255,0.06)",
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
                            borderTop: "1px solid rgba(255,255,255,0.08)",
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
                              background: "rgba(255,255,255,0.07)",
                              border: "1px solid rgba(255,255,255,0.13)",
                              borderRadius: 4,
                              fontSize: 10,
                              color: "#e0e0e0",
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
                                background: "rgba(255,255,255,0.07)",
                                border: "1px solid rgba(255,255,255,0.13)",
                                borderRadius: 4,
                                fontSize: 10,
                                color: "#e0e0e0",
                                padding: 4,
                                outline: "none",
                              }}
                            />
                            <button
                              onClick={() => handleManualClientCodeSave(item)}
                              style={{
                                background: "transparent",
                                color: "#ffffff",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: 6,
                                padding: "6px 12px",
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <i className="fa-solid fa-floppy-disk" /> Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    color: "#484f58",
                    fontSize: 11,
                    width: 88,
                    flexShrink: 0,
                  }}
                >
                  {
                    new Date(item.addedOn || item.createdAt)
                      .toISOString()
                      .split("T")[0]
                  }
                </div>
                <div
                  style={{
                    width: 160,
                    flexShrink: 0,
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => handleEdit(item)}
                    style={{
                      background: "transparent",
                      color: "#8082ff",
                      border: "1px solid #8082ff98",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    style={{
                      background: "transparent",
                      color: "#8082ff",
                      border: "1px solid #8082ff98",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fa-solid fa-trash" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <ConfirmModal
        isOpen={deleteAllModal}
        onClose={() => setDeleteAllModal(false)}
        onConfirm={handleDeleteAll}
        title={`Delete All ${activeTab} Items`}
        message={`This will permanently delete all ${tabItems.length} ${activeTab} items. This cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
