import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { fgStockAPI } from "../api/auth";
import { C } from "../constants/colors";
import {
  ImportBtn,
  ExportBtn,
  TemplateBtn,
  ImportModal,
  AutocompleteInput,
} from "../components/ui/BasicComponents";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);

const inputStyle = {
  padding: "8px 12px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 13,
  background: "transparent",
  color: "#e0e0e0",
  outline: "none",
};

export default function FGStock({
  fgStock = [],
  setFgStock,
  itemMasterFG = [],
  categoryMaster,
  companyMaster = [],
  jobOrders = [],
  dispatches = [],
  session,
  toast,
  refreshData,
  canExportImport = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const isClient = session?.role === "Client";
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [stockStatusFilter, setStockStatusFilter] = useState("All");
  const [editingItem, setEditingItem] = useState(null);
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAgeing, setShowAgeing] = useState(false);
  const [expandedBucket, setExpandedBucket] = useState(null);
  const [ageingModalItem, setAgeingModalItem] = useState(null);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const fileInputRef = useRef(null);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected item(s)?`))
      return;
    try {
      await Promise.allSettled(
        selectedIds.filter(Boolean).map((id) => fgStockAPI.delete(id)),
      );
      if (refreshData) await refreshData();
      setSelectedIds([]);
      toast?.(`${selectedIds.length} item(s) deleted`, "success");
    } catch {
      toast?.("Failed to delete some items", "error");
    }
  };

  const handleUpdateReorder = async (item, newVal) => {
    try {
      const id = item._id;
      if (item.isFromMaster) {
        await fgStockAPI.create({
          itemName: item.itemName,
          itemCode: item.itemCode,
          category: item.category,
          companyCat: item.companyCat,
          reorder: newVal,
          qty: 0,
          price: item.price || 0,
        });
      } else {
        await fgStockAPI.update(id, { reorder: newVal });
      }
      if (refreshData) await refreshData();
      toast("Reorder level updated", "success");
    } catch (err) {
      toast("Failed to update reorder level", "error");
    }
  };

  const handleUpdatePrice = async (item, newVal) => {
    try {
      const id = item._id;
      if (item.isFromMaster) {
        await fgStockAPI.create({
          itemName: item.itemName,
          itemCode: item.itemCode,
          category: item.category,
          companyCat: item.companyCat,
          reorder: item.reorder || 0,
          qty: 0,
          price: newVal,
        });
      } else {
        await fgStockAPI.update(id, { price: newVal });
      }
      if (refreshData) await refreshData();
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
              await handleUpdateReorder(item, +val);
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {saving ? "..." : "✓"}
          </button>
        )}
      </div>
    );
  };

  const PriceEdit = ({ item }) => {
    return (
      <span style={{ color: "#2196F3", fontSize: 12, fontWeight: 500 }}>
        {item.price ? `₹${Number(item.price).toLocaleString("en-IN")}` : "—"}
      </span>
    );
  };

  const QtyEdit = ({ item }) => {
    return (
      <span style={{ color: "#e0e0e0", fontSize: 12, fontWeight: 500 }}>
        {(item.qty || 0).toLocaleString("en-IN")}
      </span>
    );
  };

  const _QtyEditUnused = ({ item }) => {
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
            fontWeight: 500,
            outline: "none",
            textAlign: "right",
          }}
        />
        {!isClient && hasChanged && (
          <button
            onClick={async () => {
              setSaving(true);
              try {
                if (item.isFromMaster) {
                  await fgStockAPI.create({
                    itemName: item.itemName,
                    itemCode: item.itemCode,
                    category: item.category,
                    companyCat: item.companyCat,
                    qty: +val,
                    price: item.price || 0,
                    reorder: item.reorder || 0,
                  });
                } else {
                  await fgStockAPI.update(item._id, { qty: +val });
                }
                if (refreshData) await refreshData();
                toast("Quantity updated", "success");
              } catch (err) {
                toast("Failed to update qty", "error");
              }
              setSaving(false);
            }}
            disabled={saving}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 4,
              color: "#fff",
              padding: "4px 8px",
              fontSize: 10,
              cursor: "pointer",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {saving ? "..." : "✓"}
          </button>
        )}
      </div>
    );
  };

  const allItems = useMemo(() => {
    const masterItems = itemMasterFG.filter((i) => i.type === "Finished Goods");
    const stockMap = new Map();
    (fgStock || []).forEach((s) => {
      const code = s.itemCode || s.code;
      if (code) stockMap.set(code, s);
    });

    const masterCodes = new Set(masterItems.map((m) => m.code).filter(Boolean));

    const fromMaster = masterItems.map((m) => {
      const s = stockMap.get(m.code);
      return {
        ...m,
        _id: s?._id || m._id,
        isFromMaster: !s,
        qty: s?.qty || 0,
        price: s?.price || m.price || 0,
        reorder: s?.reorder || m.reorderLevel || 0,
        itemName: m.name,
        itemCode: m.code,
        category: m.category || "",
        companyCat: m.companyCategory || s?.companyCat || "",
      };
    });

    // Also show fgStock items that are not in Item Master
    // Items with no code are matched by _id to avoid duplicates
    const masterStockIds = new Set(
      (fgStock || [])
        .filter((s) => {
          const code = s.itemCode || s.code;
          return code && masterCodes.has(code);
        })
        .map((s) => s._id?.toString()),
    );

    const fromStockOnly = (fgStock || [])
      .filter((s) => {
        const code = s.itemCode || s.code;
        // Include: items with a code not in master, OR items with no code at all
        if (!code) return !masterStockIds.has(s._id?.toString());
        return !masterCodes.has(code);
      })
      .map((s) => ({
        ...s,
        isFromMaster: false,
        itemName: s.itemName,
        itemCode: s.itemCode || s.code || "",
        category: s.category || "",
        companyCat: s.companyCat || "",
      }));

    return [...fromMaster, ...fromStockOnly];
  }, [itemMasterFG, fgStock]);

  const categories = useMemo(() => {
    const masterArr = Array.isArray(categoryMaster) ? categoryMaster : [];
    const fgType = masterArr.find((c) => c.type === "Finished Goods");
    const masterCats = Object.keys(fgType?.subTypes || {});
    if (masterCats.length) return masterCats;
    return [...new Set(allItems.map((s) => s.category).filter(Boolean))];
  }, [categoryMaster, allItems]);

  const filtered = useMemo(() => {
    const result = allItems.filter((s) => {
      const matchSearch =
        !search ||
        s.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        s.itemCode?.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "All" || s.category === filterCat;
      const qty = +(s.qty || 0);
      const reorder = +(s.reorder || 0);
      let matchStatus = true;
      if (stockStatusFilter !== "All") {
        if (stockStatusFilter === "In Stock")
          matchStatus = qty > 0 && (reorder === 0 || qty > reorder);
        else if (stockStatusFilter === "Low Stock")
          matchStatus = qty > 0 && reorder > 0 && qty <= reorder;
        else if (stockStatusFilter === "Out of Stock") matchStatus = qty <= 0;
      }
      const matchZero = stockStatusFilter !== "All" || showZeroStock || qty > 0;
      return matchSearch && matchCat && matchStatus && matchZero;
    });
    return result.sort((a, b) => {
      const dateA = new Date(
        a.createdAt || a.lastUpdated || a.addedOn || 0,
      ).getTime();
      const dateB = new Date(
        b.createdAt || b.lastUpdated || b.addedOn || 0,
      ).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const ca = a.itemCode || a.code || "";
      const cb = b.itemCode || b.code || "";
      return ca.localeCompare(cb, undefined, { numeric: true });
    });
  }, [allItems, search, filterCat, stockStatusFilter, showZeroStock]);

  const totalItems = filtered.length;
  const inStock = filtered.filter((s) => (s.qty || 0) > 0).length;
  const totalQty = filtered.reduce((sum, s) => sum + (s.qty || 0), 0);
  const totalValue = filtered.reduce(
    (sum, s) => sum + (s.qty || 0) * (s.price || 0),
    0,
  );

  const fifoAgeingMap = useMemo(() => {
    const now = Date.now();
    const map = new Map();

    // Index FG outward dispatches by itemName (lowercase)
    const dispatchOutflows = new Map();
    (dispatches || []).forEach((d) => {
      if (d.type !== "Outward") return;
      (d.items || []).forEach((di) => {
        const key = (di.itemName || "").toLowerCase().trim();
        if (!key || !(di.qty > 0)) return;
        if (!dispatchOutflows.has(key)) dispatchOutflows.set(key, []);
        dispatchOutflows.get(key).push({ date: new Date(d.date), qty: di.qty, ref: d.dispatchNo || d._id });
      });
    });

    // Index completed job order inflows by itemName (lowercase)
    const productionInflows = new Map();
    (jobOrders || []).filter((jo) => jo.status === "Completed").forEach((jo) => {
      const key = (jo.itemName || jo.product || "").toLowerCase().trim();
      if (!key || !(jo.orderQty > 0)) return;
      const lastStage = jo.stageHistory?.[jo.stageHistory.length - 1];
      const date = new Date(lastStage?.enteredAt || jo.updatedAt || jo.jobcardDate);
      if (isNaN(date.getTime())) return;
      if (!productionInflows.has(key)) productionInflows.set(key, []);
      productionInflows.get(key).push({ date, qty: jo.orderQty, ref: jo.joNo || jo._id });
    });

    filtered.filter((s) => (s.qty || 0) > 0).forEach((s) => {
      const key = (s.itemName || "").toLowerCase().trim();
      if (!key) return;

      const inflows = [...(productionInflows.get(key) || [])].sort((a, b) => a.date - b.date);
      const outflows = [...(dispatchOutflows.get(key) || [])].sort((a, b) => a.date - b.date);

      // Build FIFO lots from production inflows
      const lots = inflows.map((i) => ({ ...i }));

      // Apply outflows to consume oldest lots first
      const txHistory = [
        ...inflows.map((i) => ({ ...i, txType: "production" })),
        ...outflows.map((o) => ({ ...o, txType: "dispatch" })),
      ].sort((a, b) => a.date - b.date);

      outflows.forEach((o) => {
        let remaining = o.qty;
        for (let li = 0; li < lots.length && remaining > 0; li++) {
          if (lots[li].qty <= remaining) {
            remaining -= lots[li].qty;
            lots[li].qty = 0;
          } else {
            lots[li].qty -= remaining;
            remaining = 0;
          }
        }
      });

      const remainingLots = lots.filter((l) => l.qty > 0).map((l) => ({
        ...l,
        ageDays: Math.max(0, Math.floor((now - l.date.getTime()) / 86400000)),
      }));

      const trackedQty = remainingLots.reduce((sum, l) => sum + l.qty, 0);
      const untrackedQty = (s.qty || 0) - trackedQty;

      // Opening balance lot (stock not explained by tracked job orders)
      const allLots = [...remainingLots];
      if (untrackedQty > 0) {
        const openDate = new Date(s.addedOn || s.createdAt || s.lastUpdated || now);
        allLots.unshift({
          date: openDate,
          qty: untrackedQty,
          ref: "Opening Balance",
          ageDays: Math.max(0, Math.floor((now - openDate.getTime()) / 86400000)),
        });
      }

      // Sort all lots oldest first
      allLots.sort((a, b) => a.date - b.date);

      // Bucket summary
      const BUCKETS = [
        { key: "0-7d", label: "0–7 days", min: 0, max: 7, color: "#10b981" },
        { key: "8-15d", label: "8–15 days", min: 8, max: 15, color: "#60a5fa" },
        { key: "16-30d", label: "16–30 days", min: 16, max: 30, color: "#f59e0b" },
        { key: "31-60d", label: "31–60 days", min: 31, max: 60, color: "#f97316" },
        { key: "60+d", label: "60+ days", min: 61, max: Infinity, color: "#ef4444" },
      ];
      const buckets = {};
      BUCKETS.forEach((b) => { buckets[b.key] = { ...b, qty: 0 }; });
      allLots.forEach((l) => {
        const b = BUCKETS.find((b) => l.ageDays >= b.min && l.ageDays <= b.max);
        if (b) buckets[b.key].qty += l.qty;
      });

      const oldestLot = allLots[0];
      const worstAge = allLots.length > 0 ? Math.max(...allLots.map((l) => l.ageDays)) : null;

      map.set(key, { lots: allLots, buckets, txHistory, trackedQty, untrackedQty, oldestLot, worstAge });
    });

    return map;
  }, [filtered, jobOrders, dispatches]);

  const ageingData = useMemo(() => {
    const BUCKETS = [
      { label: "0–15 days", days: [0, 15], items: [] },
      { label: "16–30 days", days: [16, 30], items: [] },
      { label: "31–60 days", days: [31, 60], items: [] },
      { label: "60+ days", days: [61, Infinity], items: [] },
    ];
    const now = Date.now();
    filtered.filter((s) => (s.qty || 0) > 0).forEach((s) => {
      const key = (s.itemName || "").toLowerCase().trim();
      const fifo = fifoAgeingMap.get(key);
      let ageDays;
      if (fifo && fifo.worstAge !== null) {
        ageDays = fifo.worstAge;
      } else {
        const d = s.lastUpdated || s.addedOn || s.createdAt;
        ageDays = d ? Math.floor((now - new Date(d).getTime()) / 86400000) : null;
      }
      if (ageDays === null) return;
      const bucket = BUCKETS.find((b) => ageDays >= b.days[0] && ageDays <= b.days[1]);
      if (bucket) bucket.items.push({ ...s, ageDays });
    });
    return BUCKETS;
  }, [filtered, fifoAgeingMap]);

  const handleExport = () => {
    if (!filtered.length) {
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
      "Ageing (Days)",
      "Ageing Bucket",
    ];
    const rows = filtered.map((s) => {
      const ageingDate = s.lastUpdated || s.addedOn || s.createdAt;
      const ageDays =
        ageingDate && (s.qty || 0) > 0
          ? Math.floor((Date.now() - new Date(ageingDate).getTime()) / 86400000)
          : "";
      const ageBucket =
        ageDays === ""
          ? ""
          : ageDays <= 15
            ? "0–15 days"
            : ageDays <= 30
              ? "16–30 days"
              : ageDays <= 60
                ? "31–60 days"
                : "60+ days";
      return [
        s.itemCode || s.code || "",
        s.itemName || "",
        s.category || "",
        s.companyCat || "",
        s.qty || 0,
        s.reorder || 0,
        s.price || 0,
        (s.qty || 0) * (s.price || 0),
        ageDays,
        ageBucket,
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FG Stock");
    XLSX.writeFile(workbook, `fg_stock_${today().slice(0, 10)}.xlsx`);

    toast("Exported as Excel successfully", "success");
  };

  const handleExportPDF = () => {
    if (!filtered.length) {
      toast("No data to export", "error");
      return;
    }
    const fmtN = (n) => (+n || 0).toLocaleString("en-IN");
    const rfmt = (n) => (+n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalQty = filtered.reduce((s, r) => s + (+r.qty || 0), 0);
    const totalVal = filtered.reduce(
      (s, r) => s + (+r.qty || 0) * (+r.price || 0),
      0,
    );
    const rowsHtml = filtered
      .map((s) => {
        const ageingDate = s.lastUpdated || s.addedOn || s.createdAt;
        const ageDays =
          ageingDate && (s.qty || 0) > 0
            ? Math.floor(
                (Date.now() - new Date(ageingDate).getTime()) / 86400000,
              )
            : null;
        const ageBucket =
          ageDays === null
            ? "—"
            : ageDays <= 15
              ? "0–15d"
              : ageDays <= 30
                ? "16–30d"
                : ageDays <= 60
                  ? "31–60d"
                  : "60+d";
        const ageColor =
          ageDays === null
            ? "#94a3b8"
            : ageDays <= 15
              ? "#16a34a"
              : ageDays <= 30
                ? "#2563eb"
                : ageDays <= 60
                  ? "#d97706"
                  : "#dc2626";
        return `
        <tr>
          <td>${s.itemCode || s.code || ""}</td>
          <td>${s.itemName || ""}</td>
          <td>${s.category || ""}</td>
          <td>${s.companyCat || ""}</td>
          <td class="num">${fmtN(s.qty || 0)}</td>
          <td class="num">${fmtN(s.reorder || 0)}</td>
          <td class="num">${fmtN(s.price || 0)}</td>
          <td class="num">₹${rfmt((s.qty || 0) * (s.price || 0))}</td>
          <td class="num">${ageDays !== null ? ageDays + "d" : "—"}</td>
          <td style="text-align:center;"><span style="background:${ageColor}18;color:${ageColor};padding:1px 6px;border-radius:4px;font-weight:700;font-size:9px;">${ageBucket}</span></td>
        </tr>`;
      })
      .join("");
    const html = `
      <html>
        <head>
          <title>FG Stock</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; padding: 20px 30px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 16px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; }
            .doc-title { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .doc-title h2 { margin: 0; font-size: 16px; font-weight: 700; }
            .meta { font-size: 10px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #334155; }
            td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10px; }
            .num { text-align: right; font-family: 'JetBrains Mono', monospace; }
            tfoot td { font-weight: 800; background: #f8fafc; }
            @media print { @page { margin: 1cm; size: A4 landscape; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
            <p>Finished Goods Stock Report</p>
          </div>
          <div class="doc-title">
            <h2>FG Stock</h2>
            <div class="meta">Generated: ${new Date().toLocaleString()}<br/>Records: ${filtered.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Item Name</th><th>Category</th><th>Company Cat</th>
                <th class="num">Qty</th><th class="num">Reorder</th>
                <th class="num">Price</th><th class="num">Value</th>
                <th class="num">Age (Days)</th><th style="text-align:center">Bucket</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="4">Totals</td>
                <td class="num">${fmtN(totalQty)}</td>
                <td></td><td></td>
                <td class="num">₹${rfmt(totalVal)}</td>
                <td></td><td></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    };
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

        // Build a name→master lookup for FG items
        const masterFGItems = (itemMasterFG || []).filter(
          (i) => i.type === "Finished Goods",
        );
        const masterByName = new Map(
          masterFGItems.map((m) => [m.name?.toLowerCase().trim(), m]),
        );

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (row && (row[0] || row[1])) {
            const itemName = (row[1] || "").toString().trim();
            const excelCode = (row[0] || "").toString().trim();

            // Match by name against Item Master to get the correct FG code
            const masterMatch = masterByName.get(itemName.toLowerCase());
            const itemCode = masterMatch?.code || excelCode || "";

            importedItems.push({
              itemCode,
              itemName,
              category: masterMatch?.category || (row[2] || "").toString(),
              companyCat:
                masterMatch?.companyCategory || (row[3] || "").toString(),
              qty: parseFloat(row[4] || 0),
              reorder: parseFloat(row[5] || 0),
              price: parseFloat(row[6] || 0),
            });
          }
        }

        if (importedItems.length > 0) {
          setImportProgress({
            show: true,
            current: 0,
            total: importedItems.length,
            status: "Starting import...",
          });

          let successCount = 0;
          let updateCount = 0;

          for (let i = 0; i < importedItems.length; i++) {
            const item = importedItems[i];
            setImportProgress((p) => ({
              ...p,
              current: i + 1,
              status: `Processing: ${item.itemName}`,
            }));

            // Search directly in fgStock (DB source of truth) by itemCode or itemName
            const existingFGStockItem = (fgStock || []).find(
              (s) =>
                (item.itemCode &&
                  (s.itemCode || "").toLowerCase().trim() ===
                    item.itemCode.toLowerCase().trim()) ||
                (item.itemName &&
                  (s.itemName || "").toLowerCase().trim() ===
                    item.itemName.toLowerCase().trim()),
            );

            try {
              if (existingFGStockItem) {
                // Item exists in DB — replace qty; also backfill code if master matched
                const updatePayload = {
                  qty: item.qty,
                  reorder: item.reorder,
                  price: item.price,
                };
                if (item.itemCode && !existingFGStockItem.itemCode) {
                  updatePayload.itemCode = item.itemCode;
                }
                await fgStockAPI.update(existingFGStockItem._id, updatePayload);
                updateCount++;
              } else {
                // Item not in DB yet — create it fresh
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
          setImportProgress({ show: false, current: 0, total: 0, status: "" });
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
      icon: "fa-solid fa-boxes-stacked",
    },
    { label: "In Stock", value: inStock, icon: "fa-solid fa-warehouse" },
    {
      label: "Total Qty",
      value: totalQty.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
      icon: "fa-solid fa-cubes",
    },
    {
      label: "Total Value",
      value: `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      icon: "fa-solid fa-indian-rupee-sign",
    },
  ];

  return (
    <div className="fade">
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Finished Goods Stock"
      />
      <div style={{ display: "flex", alignItems: "center" }}>
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#e0e0e0",
              margin: 0,
            }}
          >
            🎪 FG Stock
          </h2>
          <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
            Finished goods inventory — all items from Item Master
          </p>
        </div>
        <button
          onClick={() => setShowZeroStock(!showZeroStock)}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: showZeroStock
              ? "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.04)",
            color: showZeroStock ? "#fff" : "rgba(255,255,255,0.45)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {showZeroStock ? "Hide Zero Stock" : "Show Zero Stock"}
        </button>
      </div>

      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {statCards.map(({ label, value, icon }) => (
          <div
            key={label}
            style={{
              padding: "16px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 19,
                  color: "#ffffff",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
              <i
                className={icon}
                style={{
                  color: C.muted,
                  fontSize: 20,
                  opacity: 0.9,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 28,
                  width: 28,
                  lineHeight: 1,
                }}
              />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
              {value}
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
          placeholder="Search item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TemplateBtn onClick={handleTemplate} />
        {canExportImport && !isClient && (
          <ImportBtn onClick={() => fileInputRef.current?.click()} />
        )}
        {canExportImport && <ExportBtn onClick={handleExport} />}
        {canExportImport && (
          <ExportBtn onClick={handleExportPDF} label="Export PDF" />
        )}
        <button
          onClick={() => setShowAgeing((v) => !v)}
          style={{
            padding: "7px 14px",
            borderRadius: 6,
            border: `1px solid ${showAgeing ? "#f59e0b" : "#2a2a2a"}`,
            background: showAgeing ? "rgba(245,158,11,0.15)" : "transparent",
            color: showAgeing ? "#f59e0b" : "#888",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <i
            className="fa-solid fa-clock-rotate-left"
            style={{ marginRight: 6 }}
          />
          Stock Ageing
        </button>
        {!isClient && canDelete && selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />
            Delete Selected ({selectedIds.length})
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {showAgeing && (
        <div
          style={{
            marginBottom: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              padding: "12px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fa-solid fa-clock-rotate-left"
              style={{ color: "#f59e0b" }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              FG Stock Ageing Analysis
            </span>
            <span style={{ fontSize: 11, color: "#666" }}>
              — FIFO basis: production lots consumed by dispatches oldest-first · click ageing cell for item detail
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
            }}
          >
            {ageingData.map((bucket, bi) => {
              const colors = ["#10b981", "#60a5fa", "#f59e0b", "#ef4444"];
              const col = colors[bi];
              const isExpanded = expandedBucket === bi;
              const totalQtyBucket = bucket.items.reduce(
                (s, i) => s + (i.qty || 0),
                0,
              );
              const totalValBucket = bucket.items.reduce(
                (s, i) => s + (i.qty || 0) * (i.price || 0),
                0,
              );
              const visibleItems = isExpanded
                ? bucket.items
                : bucket.items.slice(0, 5);
              const remaining = bucket.items.length - 5;
              return (
                <div
                  key={bi}
                  style={{
                    borderRight:
                      bi < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: col,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 8,
                    }}
                  >
                    {bucket.label}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: col,
                      marginBottom: 2,
                    }}
                  >
                    {bucket.items.length}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: 6,
                    }}
                  >
                    items
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      marginBottom: 2,
                    }}
                  >
                    Qty: {totalQtyBucket.toLocaleString("en-IN")}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      marginBottom: 8,
                    }}
                  >
                    Value: ₹
                    {totalValBucket.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  {visibleItems.map((it, ii) => (
                    <div
                      key={ii}
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.4)",
                        padding: "3px 0",
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.itemName}
                      </span>
                      <span
                        style={{ color: col, fontWeight: 600, flexShrink: 0 }}
                      >
                        {it.ageDays}d
                      </span>
                    </div>
                  ))}
                  {!isExpanded && remaining > 0 && (
                    <button
                      onClick={() => setExpandedBucket(bi)}
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        color: col,
                        background: "transparent",
                        border: `1px solid ${col}40`,
                        borderRadius: 4,
                        padding: "2px 8px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      +{remaining} more
                    </button>
                  )}
                  {isExpanded && bucket.items.length > 5 && (
                    <button
                      onClick={() => setExpandedBucket(null)}
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        color: "rgba(255,255,255,0.35)",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        padding: "2px 8px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Show less
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {["All", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              background:
                filterCat === cat ? "rgba(128,130,255,0.12)" : "transparent",
              color: filterCat === cat ? "#8082ff" : "#888",
              border: `1px solid ${filterCat === cat ? "#8082ff98" : "#2a2a2e"}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div
        style={{
          marginBottom: 14,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {["All", "In Stock", "Low Stock", "Out of Stock"].map((s) => (
          <button
            key={s}
            onClick={() => setStockStatusFilter(s)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              background:
                stockStatusFilter === s
                  ? "rgba(128,130,255,0.12)"
                  : "transparent",
              color: stockStatusFilter === s ? "#8082ff" : "#888",
              border: `1px solid ${stockStatusFilter === s ? "#8082ff98" : "#2a2a2e"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i
              className={
                s === "In Stock"
                  ? "fa-solid fa-warehouse"
                  : s === "Low Stock"
                    ? "fa-solid fa-triangle-exclamation"
                    : s === "Out of Stock"
                      ? "fa-solid fa-circle-exclamation"
                      : "fa-solid fa-layer-group"
              }
            />
            {s}
          </button>
        ))}
      </div>

      {}
      <div
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  background: "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                    width: 40,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      selectedIds.length === filtered.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map((s) => s._id || s.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
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
                  "AGEING",
                  ...(!isClient ? ["ACTION"] : []),
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: [
                        "QTY",
                        "REORDER",
                        "PRICE (₹)",
                        "VALUE (₹)",
                        "AGEING",
                      ].includes(h)
                        ? "right"
                        : "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
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
                    colSpan={11}
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
                  const fifoKey = (s.itemName || "").toLowerCase().trim();
                  const fifoData = fifoAgeingMap.get(fifoKey);
                  const ageDays = fifoData?.worstAge ?? (s.lastUpdated || s.addedOn || s.createdAt
                    ? Math.floor((Date.now() - new Date(s.lastUpdated || s.addedOn || s.createdAt).getTime()) / 86400000)
                    : null);
                  const ageColor =
                    ageDays === null ? "#555" : ageDays <= 7 ? "#10b981" : ageDays <= 15 ? "#60a5fa" : ageDays <= 30 ? "#f59e0b" : ageDays <= 60 ? "#f97316" : "#ef4444";
                  const ageLabel =
                    ageDays === null ? "—" : ageDays <= 7 ? "0–7d" : ageDays <= 15 ? "8–15d" : ageDays <= 30 ? "16–30d" : ageDays <= 60 ? "31–60d" : "60+d";
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: selectedIds.includes(s._id || s.id)
                          ? "rgba(255,255,255,0.07)"
                          : i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td style={{ padding: "10px 14px" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s._id || s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [
                                ...prev,
                                s._id || s.id,
                              ]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((id) => id !== (s._id || s.id)),
                              );
                            }
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          color: "#666",
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
                          minWidth: 250,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                        title={s.itemName}
                      >
                        {s.itemName}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            background: "rgba(255,255,255,0.07)",
                            color: "rgba(255,255,255,0.55)",
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
                            fontWeight: 500,
                            background: "rgba(255,255,255,0.06)",
                            color:
                              (s.qty || 0) > 0
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(255,255,255,0.25)",
                          }}
                        >
                          {(s.qty || 0) > 0 ? "Yes" : "No"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 500,
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
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        ₹
                        {value.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        {(s.qty || 0) > 0 && ageDays !== null ? (
                          <span
                            onClick={() => setAgeingModalItem(s)}
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 2,
                              cursor: "pointer",
                            }}
                            title="Click to view FIFO ageing detail"
                          >
                            {fifoData && Object.values(fifoData.buckets).some((b) => b.qty > 0) ? (
                              <span style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
                                {Object.values(fifoData.buckets).filter((b) => b.qty > 0).map((b) => (
                                  <span key={b.key} style={{ fontSize: 10, fontWeight: 600, color: b.color, background: `${b.color}18`, padding: "1px 6px", borderRadius: 8, whiteSpace: "nowrap" }}>
                                    {b.label}: {b.qty.toLocaleString("en-IN")}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: ageColor,
                                  background: `${ageColor}18`,
                                  padding: "2px 7px",
                                  borderRadius: 10,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ageLabel}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: "#555" }}>
                              {ageDays}d
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: "#333", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      {!isClient && (canEdit || canDelete) && (
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {canEdit && (
                              <button
                                onClick={() => setEditingItem(s)}
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
                            )}
                            {canDelete && (
                              <button
                                onClick={async () => {
                                  if (s.isFromMaster) {
                                    toast(
                                      "This item has no stock record to delete. Remove it from Item Master if needed.",
                                      "error",
                                    );
                                    return;
                                  }
                                  if (confirm("Delete this item from stock?")) {
                                    try {
                                      await fgStockAPI.delete(s._id);
                                      if (refreshData) await refreshData();
                                      else
                                        setFgStock((prev) =>
                                          prev.filter(
                                            (item) => item._id !== s._id,
                                          ),
                                        );
                                      toast("Deleted successfully", "success");
                                    } catch (err) {
                                      toast("Failed to delete", "error");
                                    }
                                  }
                                }}
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
                            )}
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
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          <span>{filtered.length} items</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
            Total: ₹
            {totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      {editingItem && (
        <EditModal
          item={editingItem}
          companyMaster={companyMaster}
          onClose={() => setEditingItem(null)}
          onSave={async (updatedData) => {
            try {
              if (editingItem.isFromMaster) {
                await fgStockAPI.create({
                  ...updatedData,
                  itemCode: editingItem.itemCode,
                  itemName: editingItem.itemName,
                });
              } else {
                await fgStockAPI.update(editingItem._id, updatedData);
              }
              if (refreshData) await refreshData();
              setEditingItem(null);
              toast("Stock item updated", "success");
            } catch (err) {
              toast("Failed to update item", "error");
            }
          }}
        />
      )}
      {ageingModalItem && (
        <FifoAgeingModal
          item={ageingModalItem}
          fifoData={fifoAgeingMap.get((ageingModalItem.itemName || "").toLowerCase().trim())}
          onClose={() => setAgeingModalItem(null)}
        />
      )}
    </div>
  );
}

function EditModal({ item, onClose, onSave, companyMaster = [] }) {
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
            <AutocompleteInput
              value={formData.companyName}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, companyName: v }))
              }
              suggestions={companyMaster.map((c) => c.name)}
              placeholder="Type to search company..."
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
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function FifoAgeingModal({ item, fifoData, onClose }) {
  const fmtN = (n) => Number(n || 0).toLocaleString("en-IN");
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const totalQty = item.qty || 0;

  const BUCKET_ORDER = ["0-7d", "8-15d", "16-30d", "31-60d", "60+d"];

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 1100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#141418", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, width: 680, maxWidth: "95vw", maxHeight: "90vh",
          overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                FIFO Stock Ageing
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{item.itemName}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {item.itemCode && <span style={{ marginRight: 12 }}>{item.itemCode}</span>}
                {item.category && <span>{item.category}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>×</button>
          </div>

          {/* Summary bar */}
          <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Stock in Hand</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fmtN(totalQty)}</div>
            </div>
            {fifoData && (
              <>
                <div>
                  <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Tracked via JO</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{fmtN(fifoData.trackedQty)}</div>
                </div>
                {fifoData.untrackedQty > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Opening Balance</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{fmtN(fifoData.untrackedQty)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Ageing Buckets */}
        {fifoData && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Age Breakdown (FIFO)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BUCKET_ORDER.map((bk) => {
                const b = fifoData.buckets[bk];
                if (!b || b.qty <= 0) return null;
                const pct = totalQty > 0 ? Math.round((b.qty / totalQty) * 100) : 0;
                return (
                  <div key={bk} style={{ background: `${b.color}12`, border: `1px solid ${b.color}40`, borderRadius: 8, padding: "8px 14px", minWidth: 110 }}>
                    <div style={{ fontSize: 10, color: b.color, fontWeight: 700, marginBottom: 3 }}>{b.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: b.color }}>{fmtN(b.qty)}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{pct}% of stock</div>
                  </div>
                );
              })}
            </div>
            {/* Visual bar */}
            <div style={{ marginTop: 12, height: 8, borderRadius: 4, overflow: "hidden", display: "flex" }}>
              {BUCKET_ORDER.map((bk) => {
                const b = fifoData.buckets[bk];
                if (!b || b.qty <= 0) return null;
                const pct = totalQty > 0 ? (b.qty / totalQty) * 100 : 0;
                return <div key={bk} style={{ width: `${pct}%`, background: b.color, minWidth: 1 }} title={`${b.label}: ${fmtN(b.qty)}`} />;
              })}
            </div>
          </div>
        )}

        {/* Stock Lots */}
        {fifoData && fifoData.lots.length > 0 && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Current Stock Lots (oldest first)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fifoData.lots.map((lot, i) => {
                const bc = lot.ageDays <= 7 ? "#10b981" : lot.ageDays <= 15 ? "#60a5fa" : lot.ageDays <= 30 ? "#f59e0b" : lot.ageDays <= 60 ? "#f97316" : "#ef4444";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.025)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: bc, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#aaa" }}>
                        {lot.ref === "Opening Balance" ? "Opening Balance" : `Production: ${lot.ref}`}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{fmtDate(lot.date)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0" }}>{fmtN(lot.qty)}</div>
                      <div style={{ fontSize: 10, color: bc, fontWeight: 600 }}>{lot.ageDays}d old</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction History */}
        {fifoData && fifoData.txHistory.length > 0 && (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Transaction History</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {fifoData.txHistory.map((tx, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 6, background: tx.txType === "production" ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)" }}>
                  <i
                    className={tx.txType === "production" ? "fa-solid fa-plus" : "fa-solid fa-arrow-up-right-from-square"}
                    style={{ color: tx.txType === "production" ? "#10b981" : "#ef4444", fontSize: 10, width: 14 }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, color: tx.txType === "production" ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                      {tx.txType === "production" ? "Production" : "Dispatch"}
                    </span>
                    <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>{tx.ref}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#666" }}>{fmtDate(tx.date)}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tx.txType === "production" ? "#10b981" : "#ef4444", minWidth: 80, textAlign: "right" }}>
                    {tx.txType === "production" ? "+" : "-"}{fmtN(tx.qty)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!fifoData && (
          <div style={{ padding: 32, textAlign: "center", color: "#555" }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontSize: 13 }}>No production or dispatch data found for this item.</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Ageing is based on stock record date only.</div>
          </div>
        )}
      </div>
    </div>
  );
}
