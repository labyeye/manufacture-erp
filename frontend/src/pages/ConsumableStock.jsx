import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import {
  ListToolbar,
  FilterModal,
  SortSelect,
  Card,
  SectionTitle,
  Badge,
  Field,
  SubmitBtn,
  DateRangeFilter,
  ImportModal,
  NameWithAvatar,
} from "../components/ui/BasicComponents";
import { consumableStockAPI, spareIssueLogAPI } from "../api/auth";
import { IconBtn } from "../components/ui/IconBtn";
import { StatCard } from "../components/ui/StatCard";

import { fmtLakh } from "../utils/formatINR";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const TYPE_FILTERS = ["All", "Consumable", "Other"];

export default function ConsumableStock({
  consumableStock = [],
  setConsumableStock,
  categoryMaster = [],
  itemMasterFG = [],
  machineMaster = [],
  session,
  toast,
  refreshData,
  canExportImport = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const isClient = session?.role === "Client";
  const [view, setView] = useState("stock");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedStock, setSelectedStock] = useState(null);
  const [issueQty, setIssueQty] = useState("");
  const [issueMachine, setIssueMachine] = useState(null);
  const [issueRemarks, setIssueRemarks] = useState("");
  const [issueCategoryFilter, setIssueCategoryFilter] = useState("");
  const [fetchedLogs, setFetchedLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected item(s)?`))
      return;
    try {
      await Promise.allSettled(
        selectedIds.filter(Boolean).map((id) => consumableStockAPI.delete(id)),
      );
      if (refreshData) await refreshData();
      setSelectedIds([]);
      toast?.(`${selectedIds.length} item(s) deleted`, "success");
    } catch {
      toast?.("Failed to delete some items", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm("Delete this item?")) return;
    try {
      await consumableStockAPI.delete(id);
      if (refreshData) await refreshData();
      toast?.("Item deleted", "success");
    } catch {
      toast?.("Failed to delete item", "error");
    }
  };

  // Categories from CategoryMaster where type === 'Machine Spare'
  const machineSpareCategories = useMemo(() => {
    const entry = (Array.isArray(categoryMaster) ? categoryMaster : []).find(
      (c) => c.type === "Machine Spare",
    );
    if (!entry) return [];
    const fromSubTypes = entry.subTypes ? Object.keys(entry.subTypes) : [];
    const fromCategories = entry.categories || [];
    const all = [...new Set([...fromCategories, ...fromSubTypes])];
    return all.filter(Boolean).sort();
  }, [categoryMaster]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = {};
      if (drDateFrom) params.from = drDateFrom;
      if (drDateTo) params.to = drDateTo;
      const res = await spareIssueLogAPI.getAll(params);
      setFetchedLogs(res.logs || []);
    } catch {
      // silently fail; logs just won't show
    } finally {
      setLogsLoading(false);
    }
  }, [drDateFrom, drDateTo]);

  useEffect(() => {
    if (view === "log") fetchLogs();
  }, [view, fetchLogs]);

  const allItems = useMemo(() => {
    const masterItems = itemMasterFG.filter(
      (i) => i.type === "Consumable" || i.type === "Other",
    );
    const stockMap = new Map();
    (consumableStock || []).forEach((s) => {
      if (s.code) stockMap.set(s.code, s);
    });

    return masterItems.map((m) => {
      const s = stockMap.get(m.code);
      return {
        ...m,
        _id: s?._id || m._id,
        isFromMaster: !s,
        qty: s?.qty || 0,
        rate: s?.rate || m.rate || 0,
        reorderLevel: s?.reorderLevel || m.reorderLevel || 0,
        unit: s?.unit || m.uom || "nos",
      };
    });
  }, [itemMasterFG, consumableStock]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "All") {
      list = list.filter((s) => (s.type || s.category || "") === typeFilter);
    }
    list = list.filter(
      (s) => !(s.code || "").trim().toUpperCase().startsWith("CN"),
    );
    if (!showZeroStock) {
      list = list.filter((s) => (s.qty || 0) > 0);
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
  }, [allItems, search, typeFilter, showZeroStock]);

  const totalItemsCount = filtered.length;
  const inStockCount = filtered.filter((s) => (s.qty || 0) > 0).length;
  const outOfStockCount = filtered.filter((s) => (s.qty || 0) <= 0).length;
  const belowReorderCount = filtered.filter(
    (s) => (s.reorderLevel || 0) > 0 && (s.qty || 0) <= (s.reorderLevel || 0),
  ).length;
  const totalValueSum = filtered.reduce(
    (sum, s) => sum + +(s.qty || 0) * +(s.rate || 0),
    0,
  );

  const handleIssue = async () => {
    if (!selectedStock || !issueQty) {
      toast("Please select item and enter quantity", "error");
      return;
    }
    const qty = +issueQty;
    if (qty <= 0) {
      toast("Quantity must be > 0", "error");
      return;
    }
    if (!selectedStock.isFromMaster && qty > (selectedStock.qty || 0)) {
      toast(`Insufficient qty. Available: ${selectedStock.qty}`, "error");
      return;
    }

    try {
      await spareIssueLogAPI.create({
        itemCode: selectedStock.code,
        itemName: selectedStock.name,
        category: selectedStock.category,
        machineId: issueMachine?._id || issueMachine?.id || undefined,
        machineName: issueMachine?.name || "",
        qty,
        unit: selectedStock.unit || selectedStock.uom || "nos",
        issuedBy: session?.name || session?.username || "",
        remarks: issueRemarks,
        stockId: selectedStock.isFromMaster
          ? undefined
          : selectedStock._id || selectedStock.id,
      });

      toast(
        `Issued ${qty} units of ${selectedStock.name}${issueMachine ? ` to ${issueMachine.name}` : ""}`,
        "success",
      );
      setSelectedStock(null);
      setIssueQty("");
      setIssueMachine(null);
      setIssueRemarks("");
      if (refreshData) refreshData();
    } catch (error) {
      const msg = error?.response?.data?.error || "Failed to update stock";
      toast(msg, "error");
      console.error(error);
    }
  };

  const handleExport = () => {
    const headers = [
      "Code",
      "Name",
      "Category",
      "Type",
      "Qty",
      "Unit",
      "Reorder Level",
      "Rate (₹)",
    ];
    const rows = filtered.map((s) => [
      s.code || "",
      s.name || "",
      s.category || "",
      s.type || "",
      s.qty || 0,
      s.unit || "nos",
      s.reorderLevel || "",
      s.rate || "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consumables");
    XLSX.writeFile(workbook, "consumable_stock.xlsx");
    toast && toast("Exported as Excel successfully", "success");
  };

  const handleExportPDF = () => {
    if (!filtered.length) {
      toast?.("No data to export", "error");
      return;
    }
    const fmtN = (n) => (+n || 0).toLocaleString("en-IN");
    const rfmt = (n) =>
      (+n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const totalQty = filtered.reduce((s, r) => s + (+r.qty || 0), 0);
    const totalVal = filtered.reduce(
      (s, r) => s + (+r.qty || 0) * (+r.rate || 0),
      0,
    );
    const rowsHtml = filtered
      .map(
        (s) => `
        <tr>
          <td>${s.code || ""}</td>
          <td>${s.name || ""}</td>
          <td>${s.category || ""}</td>
          <td>${s.type || ""}</td>
          <td class="num">${fmtN(s.qty || 0)}</td>
          <td>${s.unit || "nos"}</td>
          <td class="num">${fmtN(s.reorderLevel || 0)}</td>
          <td class="num">${fmtN(s.rate || 0)}</td>
          <td class="num">₹${rfmt((s.qty || 0) * (s.rate || 0))}</td>
        </tr>`,
      )
      .join("");
    const html = `
      <html>
        <head>
          <title>Consumable Stock</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; padding: 20px 30px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 16px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #6b6b6b; }
            .doc-title { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .doc-title h2 { margin: 0; font-size: 16px; font-weight: 700; }
            .meta { font-size: 10px; color: #8a8a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #c7c7c7; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #3a3a3a; }
            td { border: 1px solid #ededed; padding: 5px 8px; font-size: 10px; }
            .num { text-align: right; font-family: 'JetBrains Mono', monospace; }
            tfoot td { font-weight: 800; background: #f8fafc; }
            @media print { @page { margin: 1cm; size: A4 landscape; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
            <p>Consumable Stock Report</p>
          </div>
          <div class="doc-title">
            <h2>Consumable Stock</h2>
            <div class="meta">Generated: ${new Date().toLocaleString()}<br/>Records: ${filtered.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Category</th><th>Type</th>
                <th class="num">Qty</th><th>Unit</th><th class="num">Reorder</th>
                <th class="num">Rate</th><th class="num">Value</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="4">Totals</td>
                <td class="num">${fmtN(totalQty)}</td>
                <td></td><td></td><td></td>
                <td class="num">₹${rfmt(totalVal)}</td>
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
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (row && (row[0] || row[1])) {
            imported.push({
              id: uid(),
              code: (row[0] || "").toString(),
              name: (row[1] || "").toString(),
              category: (row[2] || "").toString(),
              type: (row[3] || "Consumable").toString(),
              qty: parseFloat(row[4] || 0),
              unit: (row[5] || "nos").toString(),
              reorderLevel: parseFloat(row[6] || 0),
              rate: parseFloat(row[7] || 0),
            });
          }
        }

        if (imported.length > 0) {
          setImportProgress({
            show: true,
            current: 0,
            total: imported.length,
            status: "Starting import...",
          });

          (async () => {
            let successCount = 0;
            let updateCount = 0;

            for (let i = 0; i < imported.length; i++) {
              const item = imported[i];
              setImportProgress((p) => ({
                ...p,
                current: i + 1,
                status: `Processing: ${item.name}`,
              }));

              const existing = (consumableStock || []).find(
                (s) =>
                  s.name.toLowerCase().trim() ===
                  item.name.toLowerCase().trim(),
              );

              try {
                if (existing) {
                  await consumableStockAPI.adjustStock(existing._id, item.qty);
                  updateCount++;
                } else {
                  await consumableStockAPI.create(item);
                  successCount++;
                }
              } catch (err) {
                console.error(`Failed to process ${item.name}:`, err);
              }
            }

            toast(
              `Import complete: ${successCount} new, ${updateCount} updated`,
              "success",
            );
            setImportProgress({
              show: false,
              current: 0,
              total: 0,
              status: "",
            });
            if (refreshData) refreshData();
          })();
        }
      } catch (err) {
        console.error("Import error:", err);
        toast && toast("Failed to parse Excel file", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="fade">
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Consumable Stock"
      />
      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["stock", "Stock"],
          ["issue", "Issue item"],
          ["log", `Records (${fetchedLogs.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              height: 32,
              padding: "0 16px",
              borderRadius: 8,
              border: `1px solid ${view === v ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"}`,
              background: view === v ? "#242424" : "transparent",
              color: view === v ? "#ededed" : "#a3a3a3",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "background-color .15s, color .15s",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {}
      {view === "stock" && (
        <div>
          {}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              {
                label: "Total Items",
                value: fmt(totalItemsCount),
                icon: "fa-solid fa-boxes-stacked",
              },
              {
                label: "In Stock",
                value: fmt(inStockCount),
                icon: "fa-solid fa-warehouse",
              },
              {
                label: "Out of Stock",
                value: fmt(outOfStockCount),
                icon: "fa-solid fa-circle-exclamation",
              },
              {
                label: "Below Reorder",
                value: fmt(belowReorderCount),
                icon: "fa-solid fa-triangle-exclamation",
              },
              {
                label: "Total Value",
                value: fmtLakh(totalValueSum),
                icon: "fa-solid fa-indian-rupee-sign",
              },
            ].map(({ label, value, icon }) => (
              <StatCard key={label} label={label} value={value} icon={icon} />
            ))}
          </div>

          <ListToolbar
            onSelectModeChange={(on) => {
              if (!on) setSelectedIds([]);
            }}
            search={search}
            setSearch={setSearch}
            placeholder="Search item..."
            count={filtered.length}
            filterCount={typeFilter !== "All" ? 1 : 0}
            onFilter={() => setShowFilterModal(true)}
            actions={
              <button
                type="button"
                className="lg-btn"
                aria-pressed={showZeroStock}
                onClick={() => setShowZeroStock(!showZeroStock)}
                style={showZeroStock ? { background: "#242424" } : undefined}
              >
                {showZeroStock ? "Hide zero stock" : "Show zero stock"}
              </button>
            }
            exportOptions={
              canExportImport
                ? [
                    {
                      label: "Excel",
                      icon: "fa-solid fa-file-excel",
                      onClick: handleExport,
                    },
                    {
                      label: "PDF",
                      icon: "fa-solid fa-file-pdf",
                      onClick: handleExportPDF,
                    },
                  ]
                : []
            }
            onImport={
              canExportImport && !isClient
                ? () => fileInputRef.current?.click()
                : undefined
            }
            onTemplate={() => {
              const headers = [
                "Code",
                "Name",
                "Category",
                "Type",
                "Qty",
                "Unit",
                "Reorder Level",
                "Rate (₹)",
              ];
              const example = [
                "CS001",
                "Example Item",
                "General",
                "Consumable",
                "0",
                "nos",
                "10",
                "100",
              ];
              const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
              XLSX.writeFile(workbook, "consumable_template.xlsx");
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={handleImport}
          />

          {showFilterModal && (
            <FilterModal
              onClose={() => setShowFilterModal(false)}
              onReset={() => setTypeFilter("All")}
            >
              <Field label="Type">
                <SortSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={TYPE_FILTERS.map((t) => [t, t])}
                />
              </Field>
            </FilterModal>
          )}

          {!isClient && canDelete && selectedIds.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                margin: "12px 0",
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                fontSize: 13,
                color: "#a3a3a3",
              }}
            >
              {selectedIds.length} selected
              <button
                type="button"
                className="lg-btn lg-btn-danger"
                onClick={handleBulkDelete}
              >
                <i className="fa-solid fa-trash" /> Delete selected
              </button>
            </div>
          )}

          <div style={{ height: 12 }} />

          {}
          <div
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: C.muted,
                }}
              >
                <i
                  className="fa-solid fa-box"
                  style={{ fontSize: 32, marginBottom: 12, color: "#6b6b6b" }}
                />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: C.text || "#e5e7eb",
                  }}
                >
                  {search ? "No items found" : "No consumable stock yet"}
                </div>
                {!search && (
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Stock auto-updates when you record a GRN with Consumable or
                    Other items
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
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
                          fontWeight: 600,
                          color: C.muted,
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
                              setSelectedIds(
                                filtered.map((s) => s._id || s.id),
                              );
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </th>
                      {[
                        "Code",
                        "Item name",
                        "Category",
                        "Type",
                        "Qty",
                        "Unit",
                        "Reorder",
                        "Rate (₹)",
                        "Value (₹)",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            textAlign: [
                              "Qty",
                              "Reorder",
                              "Rate (₹)",
                              "Value (₹)",
                            ].includes(h)
                              ? "right"
                              : "left",
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.muted,
                            whiteSpace: "nowrap",
                            width: h === "Actions" ? "1%" : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const low =
                        (s.reorderLevel || 0) > 0 &&
                        (s.qty || 0) <= (s.reorderLevel || 0);
                      const out = (s.qty || 0) <= 0;
                      const statusColor = out
                        ? "#e0705f"
                        : low
                          ? "#c8955a"
                          : "#86b894";
                      const statusLabel = out
                        ? "Out of Stock"
                        : low
                          ? "Low Stock"
                          : "In Stock";
                      return (
                        <tr
                          key={s.id || i}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: selectedIds.includes(s._id || s.id)
                              ? "rgba(200, 149, 90, 0.06)"
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
                              color: "#c8955a",
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            {s.code || "—"}
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                            <NameWithAvatar name={s.name} />
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontSize: 12,
                            }}
                          >
                            {s.category || "—"}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12 }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "rgba(255,255,255,0.06)",
                                color: "#a3a3a3",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {s.type || "Consumable"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              fontWeight: 500,
                              textAlign: "right",
                              color: out ? "#e0705f" : "#ededed",
                            }}
                          >
                            {fmt(s.qty || 0)}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontSize: 12,
                            }}
                          >
                            {s.unit || "nos"}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              fontSize: 12,
                              textAlign: "right",
                            }}
                          >
                            {s.reorderLevel ? fmt(s.reorderLevel) : "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              color: C.muted,
                              textAlign: "right",
                            }}
                          >
                            {s.rate ? `₹${fmt(s.rate)}` : "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              fontWeight: 500,
                              textAlign: "right",
                              color: "#86b894",
                            }}
                          >
                            {s.rate && s.qty
                              ? `₹${fmt(Math.round((s.qty || 0) * (s.rate || 0)))}`
                              : "—"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: statusColor + "22",
                                color: statusColor,
                                fontWeight: 500,
                              }}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {!isClient && canDelete && (
                                <IconBtn
                                  icon="fa-trash"
                                  label="Delete"
                                  danger
                                  onClick={() => handleDelete(s._id || s.id)}
                                />
                              )}
                              {!isClient && (
                                <IconBtn
                                  icon="fa-arrow-right-from-bracket"
                                  label="Issue item"
                                  onClick={() => {
                                    setSelectedStock(s);
                                    setView("issue");
                                  }}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {view === "issue" && (
        <Card>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: C.accent,
              marginBottom: 16,
            }}
          >
            Issue Spare / Consumable Item
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {machineSpareCategories.length > 0 && (
              <Field label="Filter by Category">
                <select
                  value={issueCategoryFilter}
                  onChange={(e) => {
                    setIssueCategoryFilter(e.target.value);
                    setSelectedStock(null);
                  }}
                >
                  <option value="">-- All Categories --</option>
                  {machineSpareCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Select Item *">
              <select
                value={selectedStock?._id || selectedStock?.id || ""}
                onChange={(e) => {
                  const found = allItems.find(
                    (s) => (s._id || s.id) === e.target.value,
                  );
                  setSelectedStock(found || null);
                }}
              >
                <option value="">-- Select Item --</option>
                {allItems
                  .filter(
                    (s) =>
                      !issueCategoryFilter ||
                      s.category === issueCategoryFilter,
                  )
                  .map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name}
                      {s.category ? ` [${s.category}]` : ""} — Avail:{" "}
                      {fmt(s.qty || 0)} {s.unit || "nos"}
                    </option>
                  ))}
              </select>
            </Field>
            {selectedStock && (
              <>
                <Field label="Available Quantity">
                  <div
                    style={{
                      padding: "9px 12px",
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {fmt(selectedStock.qty || 0)} {selectedStock.unit || "nos"}
                  </div>
                </Field>
                <Field label="Quantity to Issue *">
                  <input
                    type="number"
                    placeholder="Enter quantity"
                    value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Issue to Machine">
              <select
                value={issueMachine?._id || issueMachine?.id || ""}
                onChange={(e) => {
                  const m = machineMaster.find(
                    (m) => (m._id || m.id) === e.target.value,
                  );
                  setIssueMachine(m || null);
                }}
              >
                <option value="">-- Select Machine (optional) --</option>
                {(machineMaster || [])
                  .filter((m) => m.status === "Active" || !m.status)
                  .map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name}
                      {m.type ? ` (${m.type})` : ""}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Remarks">
              <input
                type="text"
                placeholder="Purpose / notes (optional)"
                value={issueRemarks}
                onChange={(e) => setIssueRemarks(e.target.value)}
              />
            </Field>
          </div>
          {selectedStock && issueQty && (
            <div
              style={{
                padding: "12px 16px",
                background: "#c8955a" + "11",
                border: `1px solid ${"#c8955a"}44`,
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              Issue{" "}
              <strong style={{ color: "#c8955a" }}>{fmt(+issueQty)}</strong>{" "}
              {selectedStock.unit || "nos"} of{" "}
              <strong>{selectedStock.name}</strong>
              {issueMachine && (
                <>
                  {" "}
                  → Machine:{" "}
                  <strong style={{ color: "#c8955a" || "#c8955a" }}>
                    {issueMachine.name}
                  </strong>
                </>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <SubmitBtn
              label="Issue Item"
              color={"#86b894"}
              onClick={handleIssue}
            />
            <button
              onClick={() => {
                setSelectedStock(null);
                setIssueQty("");
                setIssueMachine(null);
                setIssueRemarks("");
                setIssueCategoryFilter("");
              }}
              style={{
                padding: "9px 20px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.inputBg,
                color: C.muted,
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </Card>
      )}

      {}
      {view === "log" && (
        <Card>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: C.muted,
                margin: 0,
              }}
            >
              Spare Issue History
            </h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <button
              onClick={fetchLogs}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.inputBg,
                color: C.muted,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {logsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {logsLoading ? (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              Loading records…
            </div>
          ) : fetchedLogs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No issues recorded yet
            </div>
          ) : (
            <div
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {[
                      "DATE",
                      "ITEM",
                      "CATEGORY",
                      "QTY",
                      "ISSUED TO MACHINE",
                      "REMARKS",
                      "ISSUED BY",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fetchedLogs.map((log, i) => (
                    <tr
                      key={log._id || i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td
                        style={{
                          padding: "9px 12px",
                          color: C.muted,
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(log.issuedAt)}
                      </td>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>
                        {log.itemName}
                        {log.itemCode && (
                          <span
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              marginLeft: 6,
                            }}
                          >
                            {log.itemCode}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "9px 12px",
                          fontSize: 12,
                          color: C.muted,
                        }}
                      >
                        {log.category || "—"}
                      </td>
                      <td
                        style={{
                          padding: "9px 12px",
                          fontWeight: 500,
                          color: "#c8955a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        -{fmt(log.qty)} {log.unit || "nos"}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        {log.machineName ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: ("#c8955a" || "#c8955a") + "22",
                              color: "#a3a3a3",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {log.machineName}
                          </span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>
                            —
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "9px 12px",
                          color: C.muted,
                          fontSize: 12,
                        }}
                      >
                        {log.remarks || "—"}
                      </td>
                      <td
                        style={{
                          padding: "9px 12px",
                          color: C.muted,
                          fontSize: 12,
                        }}
                      >
                        {log.issuedBy || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 14px",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.08)",
        color: "#fff",
        fontWeight: 500,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      {label}
    </button>
  );
}
