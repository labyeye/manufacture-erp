import React, { useState, useMemo, useEffect, useRef } from "react";
import { C, PROCESS_COLORS, STAGES } from "../constants/colors";
import {
  Badge,
  Card,
  SectionTitle,
  ExportBtn,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import { fmt, today, xlsxDownload, daysSince } from "../utils/helpers";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
import * as XLSX from "xlsx";
import { salesOrdersAPI } from "../api/auth";

const ALL_REPORT_TABS = [
  {
    id: "production",
    label: "Production",
    icon: "fa-solid fa-gears",
    roles: ["Admin", "Manager", "Operator", "Production", "Client"],
  },
  {
    id: "operator",
    label: "Operator",
    icon: "fa-solid fa-user",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "machine",
    label: "Machine",
    icon: "fa-solid fa-industry",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "po_recon",
    label: "PO Recon",
    icon: "fa-solid fa-cart-shopping",
    roles: ["Admin", "Manager", "Store"],
  },
  {
    id: "so_recon",
    label: "SO Recon",
    icon: "fa-solid fa-clipboard-list",
    roles: ["Admin", "Manager", "Sales", "Client"],
  },
  {
    id: "so_ageing",
    label: "SO Ageing",
    icon: "⏳",
    roles: ["Admin", "Manager", "Sales", "Client"],
  },
  {
    id: "yield",
    label: "Yield",
    icon: "fa-solid fa-chart-line",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: "fa-solid fa-truck",
    roles: ["Admin", "Manager", "Sales", "Client"],
  },
  {
    id: "low_stock",
    label: "Low Stock",
    icon: "fa-solid fa-triangle-exclamation",
    roles: ["Admin", "Manager", "Store", "Client"],
  },
  {
    id: "monthly",
    label: "Monthly",
    icon: "fa-solid fa-calendar-days",
    roles: ["Admin", "Manager"],
  },
  {
    id: "vendor",
    label: "Vendor",
    icon: "fa-solid fa-industry",
    roles: ["Admin", "Manager", "Store"],
  },
  {
    id: "oee",
    label: "OEE",
    icon: "fa-solid fa-bullseye",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "bottleneck",
    label: "Bottleneck",
    icon: "fa-solid fa-circle",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "scorecards",
    label: "Scorecards",
    icon: "fa-solid fa-trophy",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: "fa-solid fa-bell",
    roles: ["Admin", "Manager", "Production", "Sales", "Store", "Accounts"],
  },
  {
    id: "funnel",
    label: "Funnel",
    icon: "fa-solid fa-chevron-down",
    roles: ["Admin", "Manager", "Production", "Sales"],
  },
];

const TH = {
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontSize: 11,
  fontWeight: 500,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  fontStretch: "normal",
};

const TD = {
  padding: "12px 12px",
  borderBottom: "1px solid #1e1e22",
  fontSize: 12,
  fontWeight: 400,
  color: "#e0e0e0",
  whiteSpace: "nowrap",
  fontStretch: "normal",
};

const TABLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontStretch: "normal",
  minWidth: 900,
};

const getLogoBase64 = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = "/logo.png";
  });
};

const buildOpMachineTallyHTML = ({
  tab,
  machineType,
  headerName,
  entries,
  dateFrom,
  dateTo,
  logoSrc,
}) => {
  const title = tab === "operator" ? "Operator Report" : "Machine Report";
  const color = tab === "operator" ? "#1e40af" : "#7c2d12";
  const accentLight = tab === "operator" ? "#dbeafe" : "#fed7aa";
  const now = new Date().toLocaleString("en-IN");
  const dateRangeLabel =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
        ? `From ${dateFrom}`
        : dateTo
          ? `Till ${dateTo}`
          : "All Time";
  const totalQty = entries.reduce((s, e) => s + Number(e.qtyCompleted || 0), 0);
  const fmtINR = (n) => Math.round(Number(n || 0)).toLocaleString("en-IN");
  const fd = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

  let cols, rows;
  if (tab === "operator") {
    cols = ["Date", "JO No", "Item", "Process", "Qty Done"];
    rows = entries
      .map(
        (e, i) => `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td>${fd(e.date)}</td>
        <td class="mono accent bold">${e.joNo || "—"}</td>
        <td>${e.itemName || "—"}</td>
        <td>${e.stage || "—"}</td>
        <td class="right bold">${fmtINR(e.qtyCompleted)}</td>
      </tr>`,
      )
      .join("");
  } else {
    cols = ["Date", "JO No", "Item", "Process", "Operator", "Qty Done"];
    rows = entries
      .map(
        (e, i) => `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td>${fd(e.date)}</td>
        <td class="mono">${e.joNo || "—"}</td>
        <td>${e.itemName || "—"}</td>
        <td>${e.stage || "—"}</td>
        <td>${e.operator || "—"}</td>
        <td class="right bold">${fmtINR(e.qtyCompleted)}</td>
      </tr>`,
      )
      .join("");
  }

  const subjectLabel = tab === "operator" ? "Operator" : "Machine";
  const subjectValue =
    tab === "machine" && machineType
      ? `${headerName} (${machineType})`
      : headerName || "—";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; background: #fff; padding: 24px 28px; font-size: 11px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px solid ${color}; margin-bottom: 18px; }
    .company-name { font-size: 18px; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1; }
    .company-addr { font-size: 9.5px; color: #475569; margin-top: 4px; line-height: 1.5; }
    .company-contact { font-size: 9px; color: #64748b; margin-top: 3px; }
    .logo-wrap { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
    .logo-wrap img { width: 72px; height: 72px; object-fit: contain; }
    .report-meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
    .report-title { font-size: 16px; font-weight: 800; color: #0f172a; }
    .report-period { font-size: 9px; color: #64748b; text-align: right; line-height: 1.6; }
    .period-badge { display: inline-block; background: ${accentLight}; color: ${color}; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 9px; }
    .subject-box { background: ${accentLight}; border-left: 4px solid ${color}; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; display: flex; gap: 24px; align-items: center; }
    .subject-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: ${color}; opacity: 0.8; }
    .subject-value { font-size: 14px; font-weight: 800; color: ${color}; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
    .stat-card { border: 1.5px solid; border-radius: 8px; padding: 10px 12px; }
    .stat-card-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.75; margin-bottom: 4px; }
    .stat-card-value { font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    thead tr { background: ${color}; color: #fff; }
    th { padding: 6px 7px; text-align: left; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
    td { padding: 5px 7px; font-size: 9.5px; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr.even td { background: #fff; }
    tr.odd td { background: #f8fafc; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600; }
    .accent { color: ${color}; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden; min-width: 240px; }
    .totals-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
    .totals-row:last-child { border-bottom: none; background: ${color}; color: #fff; padding: 9px 12px; }
    .totals-row:last-child .t-label { font-weight: 700; font-size: 11px; }
    .totals-row:last-child .t-val { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 800; }
    .t-label { color: #64748b; font-weight: 600; }
    .t-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 30px; }
    .sig-box { width: 140px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 5px; font-size: 9px; color: #64748b; }
    .print-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
    @media print { body { padding: 12px 16px; } @page { margin: 0.8cm; size: A4 landscape; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">Aaray Packaging Private Limited</div>
      <div class="company-addr">
        Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad<br>
        Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad
      </div>
      <div class="company-contact">
        www.rapackaging.in &nbsp;|&nbsp; orders@rapackaging.in &nbsp;|&nbsp; +91 9311802540
      </div>
    </div>
    ${logoSrc ? `<div class="logo-wrap"><img src="${logoSrc}" alt="Logo" /></div>` : ""}
  </div>

  <div class="report-meta">
    <div class="report-title">${title}</div>
    <div class="report-period">
      Period: <span class="period-badge">${dateRangeLabel}</span><br>
      Generated: ${now}<br>
      Total Records: <strong>${entries.length}</strong>
    </div>
  </div>

  <div class="subject-box">
    <div>
      <div class="subject-label">${subjectLabel}</div>
      <div class="subject-value">${subjectValue}</div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card" style="border-color: ${color}22; background: ${color}08;">
      <div class="stat-card-label" style="color: ${color};">Total Entries</div>
      <div class="stat-card-value" style="color: ${color};">${entries.length}</div>
    </div>
    <div class="stat-card" style="border-color: #16653422; background: #16653408;">
      <div class="stat-card-label" style="color: #166534;">Total Qty Done</div>
      <div class="stat-card-value" style="color: #166534;">${fmtINR(totalQty)}</div>
    </div>
    <div class="stat-card" style="border-color: #92400e22; background: #92400e08;">
      <div class="stat-card-label" style="color: #92400e;">Period</div>
      <div class="stat-card-value" style="color: #92400e; font-size: 12px;">${dateRangeLabel}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="${cols.length}" style="text-align:center; color:#94a3b8; padding: 20px;">No records found for selected period.</td></tr>`}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="t-label">Total Entries</span>
        <span class="t-val">${entries.length}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Total Quantity</span>
        <span class="t-val">${fmtINR(totalQty)}</span>
      </div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-box">Prepared By</div>
    <div class="sig-box">Reviewed By</div>
    <div class="sig-box">Authorized Signatory</div>
  </div>

  <div class="print-footer">
    <span>AARAY PACKAGING PRIVATE LIMITED — CONFIDENTIAL</span>
    <span>${title} | ${subjectValue} | ${dateRangeLabel}</span>
  </div>
</body>
</html>`;
};

export function Dashboard({ data, session, toast, onNavigate }) {
  const userRole = session?.role || "Viewer";
  const reportSectionRef = useRef(null);

  const buildOpMachineExcel = ({
    tab,
    machineType,
    headerName,
    entries,
    dateFrom,
    dateTo,
  }) => {
    const title = tab === "operator" ? "Operator Report" : "Machine Report";
    const dateRangeLabel =
      dateFrom && dateTo
        ? `${dateFrom} to ${dateTo}`
        : dateFrom
          ? `From ${dateFrom}`
          : dateTo
            ? `Till ${dateTo}`
            : "All Time";
    const totalQty = entries.reduce(
      (s, e) => s + Number(e.qtyCompleted || 0),
      0,
    );
    const subjectLabel = tab === "operator" ? "Operator" : "Machine";
    const subjectValue =
      tab === "machine" && machineType
        ? `${headerName} (${machineType})`
        : headerName || "—";

    const aoa = [
      ["Aaray Packaging Private Limited"],
      ["Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad"],
      ["Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad"],
      ["www.rapackaging.in | orders@rapackaging.in | +91 9311802540"],
      [],
      [title],
      [subjectLabel, subjectValue],
      ["Period", dateRangeLabel],
      ["Generated", new Date().toLocaleString("en-IN")],
      ["Total Entries", entries.length],
      ["Total Qty Done", totalQty],
      [],
    ];

    let headers, dataRows;
    if (tab === "operator") {
      headers = ["Date", "JO No", "Item", "Process", "Qty Done"];
      dataRows = entries.map((e) => [
        fmtDate(e.date),
        e.joNo || "",
        e.itemName || "",
        e.stage || "",
        Number(e.qtyCompleted || 0),
      ]);
    } else {
      headers = ["Date", "JO No", "Item", "Process", "Operator", "Qty Done"];
      dataRows = entries.map((e) => [
        fmtDate(e.date),
        e.joNo || "",
        e.itemName || "",
        e.stage || "",
        e.operator || "",
        Number(e.qtyCompleted || 0),
      ]);
    }
    aoa.push(headers);
    aoa.push(...dataRows);
    aoa.push([]);
    const totalRow = new Array(headers.length).fill("");
    totalRow[0] = "TOTAL";
    totalRow[headers.length - 1] = totalQty;
    aoa.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = headers.map((h, i) =>
      i === 0
        ? { wch: 12 }
        : i === headers.length - 1
          ? { wch: 14 }
          : h === "JO No"
            ? { wch: 14 }
            : h === "Process"
              ? { wch: 16 }
              : { wch: 28 },
    );
    const lastCol = headers.length - 1;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: lastCol } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    const safeName = String(subjectValue).replace(/[^a-zA-Z0-9]+/g, "_");
    XLSX.writeFile(
      wb,
      `${title.replace(/\s+/g, "_")}_${safeName}_${dateFrom || "All"}_${dateTo || "All"}.xlsx`,
    );
  };

  const getOpMachineContext = () => {
    if (reportTab === "operator") {
      return {
        tab: "operator",
        headerName: appliedFilters.operator || "—",
        machineType: "",
      };
    }
    const m = machineMaster.find(
      (mm) => String(mm._id) === String(appliedFilters.machine),
    );
    return {
      tab: "machine",
      headerName: m?.name || appliedFilters.machine || "—",
      machineType: m?.type || "",
    };
  };

  const exportReportExcel = () => {
    if (reportTab === "operator" || reportTab === "machine") {
      const hasFilter =
        (reportTab === "operator" && appliedFilters.operator) ||
        (reportTab === "machine" && appliedFilters.machine);
      if (!hasFilter || !filteredEntries.length) {
        toast?.("Generate the report first", "error");
        return;
      }
      const ctx = getOpMachineContext();
      buildOpMachineExcel({
        ...ctx,
        entries: filteredEntries,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
      });
      return;
    }

    if (!reportSectionRef.current) return;
    const tables = reportSectionRef.current.querySelectorAll("table");
    if (!tables.length) return;
    const wb = XLSX.utils.book_new();
    tables.forEach((tbl, i) => {
      const ws = XLSX.utils.table_to_sheet(tbl);
      XLSX.utils.book_append_sheet(wb, ws, `Sheet${i + 1}`);
    });
    XLSX.writeFile(wb, `Dashboard_${reportTab}_Report.xlsx`);
  };

  const exportReportPDF = async () => {
    if (reportTab === "operator" || reportTab === "machine") {
      const hasFilter =
        (reportTab === "operator" && appliedFilters.operator) ||
        (reportTab === "machine" && appliedFilters.machine);
      if (!hasFilter || !filteredEntries.length) {
        toast?.("Generate the report first", "error");
        return;
      }
      const logoSrc = await getLogoBase64();
      const ctx = getOpMachineContext();
      const html = buildOpMachineTallyHTML({
        ...ctx,
        entries: filteredEntries,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        logoSrc,
      });
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => {
          setTimeout(() => {
            win.print();
            URL.revokeObjectURL(url);
          }, 800);
        };
      }
      return;
    }

    if (!reportSectionRef.current) return;
    const tables = reportSectionRef.current.querySelectorAll("table");
    if (!tables.length) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:sans-serif;font-size:11px;padding:20px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#1e40af;color:#fff}
      tr:nth-child(even) td{background:#f8fafc}
      h2{margin-bottom:12px}
    </style></head><body>
    <h2>${reportTab.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Report</h2>
    ${Array.from(tables)
      .map((t) => t.outerHTML)
      .join("<br>")}
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win)
      win.onload = () => {
        setTimeout(() => {
          win.print();
          URL.revokeObjectURL(url);
        }, 600);
      };
  };

  const handleCloseSO = async (soId) => {
    if (
      !window.confirm(
        "Are you sure you want to mark this Sales Order as Completed? This will reconcile it manually.",
      )
    )
      return;
    try {
      await salesOrdersAPI.update(soId, { status: "Completed" });
      toast?.("Sales Order marked as Completed", "success");
      if (refreshData) refreshData();
    } catch (err) {
      toast?.("Failed to update Sales Order", "error");
    }
  };

  const reportTabs = useMemo(() => {
    return ALL_REPORT_TABS.filter(
      (t) => !t.roles || t.roles.includes(userRole),
    );
  }, [userRole]);
  const {
    jobOrders = [],
    salesOrders = [],
    fgStock = [],
    rawStock = [],
    machineMaster = [],
    purchaseOrders = [],
    dispatches = [],
    inward = [],
    vendorMaster = [],
    consumableStock = [],
    operatorMaster = [],
    refreshData,
  } = data;

  useEffect(() => {
    if (refreshData) refreshData();
  }, []);

  const [reportTab, setReportTab] = useState("production");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [drill, setDrill] = useState(null);

  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    operator: "",
    machine: "",
    dateFrom: "",
    dateTo: "",
  });
  const [selectedProcessPending, setSelectedProcessPending] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [pvtTargets, setPvtTargets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("erp_pvtTargets") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("erp_pvtTargets", JSON.stringify(pvtTargets));
  }, [pvtTargets]);

  const [oeeGranularity, setOeeGranularity] = useState("weekly");
  const [oeeSelectedMachine, setOeeSelectedMachine] = useState("all");
  const [yieldSelectedMachine, setYieldSelectedMachine] = useState("all");
  const [oeeTargetEdit, setOeeTargetEdit] = useState(null);

  useEffect(() => {
    setAppliedFilters({
      operator: "",
      machine: "",
      dateFrom: "",
      dateTo: "",
    });
    setSelectedOperator("");
    setSelectedMachine("");
  }, [reportTab]);

  const [lowStockFilter, setLowStockFilter] = useState("All");
  const [lowStockSelected, setLowStockSelected] = useState(new Set());
  const [dashboardSearch, setDashboardSearch] = useState("");

  useEffect(() => {
    setDashboardSearch("");
  }, [reportTab]);

  useEffect(() => {
    if (!reportSectionRef.current) return;
    const q = dashboardSearch.trim().toLowerCase();
    const rows = reportSectionRef.current.querySelectorAll("tbody tr");
    rows.forEach((tr) => {
      if (!q) {
        tr.style.display = "";
        return;
      }
      const text = (tr.textContent || "").toLowerCase();
      tr.style.display = text.includes(q) ? "" : "none";
    });
  });
  const [poReconStatus, setPoReconStatus] = useState("All");
  const [soReconStatus, setSoReconStatus] = useState("All");

  const allEntries = useMemo(() => {
    const list = [];
    jobOrders.forEach((jo) => {
      (jo.stageHistory || []).forEach((h) => {
        list.push({
          ...h,
          joNo: jo.joNo,
          companyName: jo.companyName,
          itemName: jo.itemName,
          machineId:
            h.machineId ||
            (jo.machineAssignments && jo.machineAssignments[h.stage]),
        });
      });
    });
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [jobOrders]);

  const activeJOs = useMemo(() => {
    return jobOrders.filter((j) => {
      if (j.status === "Completed" || j.status === "Cancelled") return false;

      const jobProcs = j.process || [];
      if (jobProcs.length === 0) return false;

      const completed = j.completedProcesses || [];
      const hasPending = jobProcs.some((p) => !completed.includes(p));
      return hasPending;
    });
  }, [jobOrders]);

  const activeMachines = useMemo(() => {
    const usedIds = new Set(
      allEntries
        .map((e) => String(e.machineId || e.machine || ""))
        .filter(Boolean),
    );
    if (usedIds.size === 0) return machineMaster;
    return machineMaster.filter((m) => {
      return usedIds.has(String(m._id)) || usedIds.has(String(m.name));
    });
  }, [allEntries, machineMaster]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((e) => {
      if (reportTab === "operator") {
        if (appliedFilters.dateFrom && e.date < appliedFilters.dateFrom)
          return false;
        if (appliedFilters.dateTo && e.date > appliedFilters.dateTo)
          return false;
        if (appliedFilters.operator && e.operator !== appliedFilters.operator)
          return false;
      } else if (reportTab === "machine") {
        if (appliedFilters.dateFrom && e.date < appliedFilters.dateFrom)
          return false;
        if (appliedFilters.dateTo && e.date > appliedFilters.dateTo)
          return false;
        if (appliedFilters.machine) {
          const mid = String(appliedFilters.machine);
          const m = machineMaster.find(
            (mm) => String(mm._id) === mid || mm.name === mid,
          );
          const match =
            String(e.machineId) === mid ||
            e.machine === mid ||
            e.machine === m?.name;
          if (!match) return false;
        }
      } else {
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;
      }
      return true;
    });
  }, [allEntries, dateFrom, dateTo, reportTab, appliedFilters, machineMaster]);

  const processPendingMap = useMemo(() => {
    const map = {};
    STAGES.forEach((proc) => {
      map[proc] = activeJOs.filter((j) => {
        const jobProcs = j.process || [];
        if (!jobProcs.includes(proc)) return false;
        if ((j.completedProcesses || []).includes(proc)) return false;
        const ordProcs = STAGES.filter((p) => jobProcs.includes(p));
        const idx = ordProcs.indexOf(proc);
        if (idx <= 0) return true;
        return ordProcs
          .slice(0, idx)
          .every((p) => (j.completedProcesses || []).includes(p));
      });
    });
    return map;
  }, [activeJOs]);

  const dispMap = useMemo(() => {
    const map = {};
    dispatches.forEach((d) => {
      const ref = d.soRef || d.soNo || d.so || "";
      if (!ref) return;
      if (!map[ref]) map[ref] = 0;
      (d.items || []).forEach((it) => {
        map[ref] += +(it.qty || it.quantity || 0);
      });
    });
    return map;
  }, [dispatches]);

  const lowStockItems = useMemo(() => {
    const raw = (rawStock || [])
      .filter((s) => {
        const current = +(s.weight || 0);
        const thresh = +(s.reorderLevel || 0);
        return thresh > 0 && current < thresh;
      })
      .map((s) => {
        const nm = s.name || s.paperType || "Unnamed RM";
        const gsmMatch = nm.match(/(\d+)\s*gsm/i);
        const dimMatch = nm.match(/(\d+)\s*[x×]\s*(\d+)\s*mm/i);
        const singleDimMatch = nm.match(/(\d+)\s*mm/i);
        return {
          name: nm,
          category: s.category || "Raw Material",
          stock: s.weight || 0,
          reorder: s.reorderLevel || 0,
          unit: "kg",
          type: "RM",
          productCode: s.productCode || s.code || "",
          subCategory: s.subCategory || s.paperType || "",
          gsm: s.gsm || (gsmMatch ? gsmMatch[1] : ""),
          widthMm:
            s.widthMm ||
            s.width ||
            (dimMatch ? dimMatch[1] : singleDimMatch ? singleDimMatch[1] : ""),
          lengthMm:
            s.lengthMm || s.length || (dimMatch ? dimMatch[2] : ""),
          hsnCode: s.hsnCode || "",
        };
      });

    const fg = (fgStock || [])
      .filter((s) => {
        const current = +(s.qty || 0);
        const thresh = +(s.reorder || 0);
        return thresh > 0 && current < thresh;
      })
      .map((s) => ({
        name: s.itemName || "Unnamed FG",
        category: "Finished Goods",
        stock: s.qty || 0,
        reorder: s.reorder || 0,
        unit: s.unit || "pcs",
        type: "FG",
      }));

    const cg = (consumableStock || [])
      .filter((s) => {
        const current = +(s.qty || 0);
        const thresh = +(s.reorderLevel || 0);
        return thresh > 0 && current < thresh;
      })
      .map((s) => ({
        name: s.name || "Unnamed CG",
        category: s.category || "Consumable",
        stock: s.qty || 0,
        reorder: s.reorderLevel || 0,
        unit: s.unit || "nos",
        type: "CG",
        productCode: s.productCode || s.code || "",
        subCategory: s.subCategory || "",
        hsnCode: s.hsnCode || "",
        size: s.size || "",
        width: s.width || "",
        length: s.length || "",
        height: s.height || "",
      }));

    if (userRole === "Client") {
      return fg;
    }
    return [...raw, ...fg, ...cg];
  }, [rawStock, fgStock, consumableStock, userRole]);

  const soRows = useMemo(() => {
    const list = salesOrders
      .filter((so) => {
        if (!dateFrom && !dateTo) return true;
        const d = (so.orderDate || so.createdAt || "").slice(0, 10);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      })
      .map((so) => {
        const soKey = so.soNo || so._id || "";
        const ord = (so.items || []).reduce(
          (s, it) => s + +(it.orderQty || it.qty || 0),
          0,
        );

        const joForSO = jobOrders.filter((jo) => jo.soRef === soKey);
        const producedQty = joForSO.reduce((s, jo) => {
          const lastStage = (jo.process || []).slice(-1)[0];
          return s + +(jo.stageQtyMap?.[lastStage] || 0);
        }, 0);

        const disp = dispMap[soKey] || 0;

        let status = "";
        if (so.status === "Completed" || so.status === "Closed") {
          status = "Complete";
        } else if (producedQty < 0.95 * ord) {
          status = "Production Pending";
        } else if (disp < 0.98 * producedQty) {
          status = "Dispatch Pending";
        } else {
          status = "Complete";
        }

        const pend = Math.max(0, ord - disp);
        const pct = ord > 0 ? Math.round((disp / ord) * 100) : 0;

        const itemsStr =
          (so.items || [])
            .map((it) => it.itemName || it.name || "")
            .filter(Boolean)
            .join(", ") || "—";
        return {
          so,
          ord,
          disp,
          pend,
          pct,
          status,
          itemsStr,
          soKey,
          producedQty,
        };
      });

    if (soReconStatus === "All") return list;
    return list.filter((r) => r.status === soReconStatus);
  }, [salesOrders, dispMap, jobOrders, dateFrom, dateTo, soReconStatus]);

  const allAlerts = useMemo(() => {
    const alerts = [];
    const todayMs = Date.now();
    const now = new Date();

    (salesOrders || []).forEach((so) => {
      if (so.status === "Completed" || so.status === "Closed") return;
      const dueStr = so.deliveryDate || so.expectedDelivery || so.dueDate;
      if (!dueStr) return;
      const dueMs = new Date(dueStr);
      if (isNaN(dueMs) || dueMs < now) return;
      const daysLeft = (dueMs - todayMs) / 86400000;
      if (daysLeft > 45) return;

      const soKey = so.soNo || so._id || "";
      const relatedJOs = (jobOrders || []).filter(
        (jo) => jo.soRef === soKey || jo.soNo === soKey,
      );
      const ordered = (so.items || []).reduce(
        (s, it) => s + +(it.orderQty || it.qty || 0),
        0,
      );
      const produced = relatedJOs.reduce((s, jo) => {
        const last = (jo.process || []).slice(-1)[0];
        return s + (last ? +(jo.stageQtyMap?.[last] || 0) : 0);
      }, 0);
      const remaining = Math.max(0, ordered - produced);
      if (remaining === 0) return;

      const cut7 = new Date(now);
      cut7.setDate(cut7.getDate() - 7);
      const cut7str = cut7.toISOString().slice(0, 10);
      const recentQty = relatedJOs
        .flatMap((jo) =>
          (jo.stageHistory || []).filter((h) => (h.date || "") >= cut7str),
        )
        .reduce((s, h) => s + +(h.qtyCompleted || 0), 0);
      const velocity = recentQty / 7;

      const daysNeeded = velocity > 0 ? remaining / velocity : Infinity;
      if (daysNeeded > daysLeft + 1) {
        alerts.push({
          id: `delivery_${soKey}`,
          type: "delivery_risk",
          severity: velocity === 0 ? "critical" : "high",
          icon: "fa-solid fa-circle-exclamation",
          title: `${soKey} at risk of missing delivery`,
          detail: `${remaining.toLocaleString("en-IN")} units remaining · ${daysLeft.toFixed(0)} days left · ${
            velocity > 0
              ? `needs ${daysNeeded.toFixed(0)}d at current rate`
              : "no recent production activity"
          }`,
          meta: `Client: ${so.companyName || "—"} · Due: ${dueStr.slice(0, 10)}`,
          action: "Expedite production or negotiate delivery date",
        });
      }
    });

    const vendorPts = {};
    (purchaseOrders || []).forEach((po) => {
      const v = po.vendor || po.vendorName;
      if (!v || !po.poDate) return;
      const grn = (inward || []).find(
        (g) =>
          g.poNo === po.poNo || g.poRef === po.poNo || g.poNumber === po.poNo,
      );
      const rcv = grn
        ? grn.date || grn.grnDate || grn.receivedDate
        : po.deliveryDate;
      if (!rcv) return;
      const lt = (new Date(rcv) - new Date(po.poDate)) / 86400000;
      if (lt <= 0 || lt > 180) return;
      if (!vendorPts[v]) vendorPts[v] = [];
      vendorPts[v].push({ date: po.poDate, lt });
    });

    Object.entries(vendorPts).forEach(([vendor, pts]) => {
      if (pts.length < 4) return;
      const sorted = [...pts].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
      const recent = sorted.slice(0, 3).map((p) => p.lt);
      const older = sorted.slice(3, 6).map((p) => p.lt);
      if (!older.length) return;
      const avgR = recent.reduce((s, v) => s + v, 0) / recent.length;
      const avgO = older.reduce((s, v) => s + v, 0) / older.length;
      if (avgR > avgO * 1.3 && avgR - avgO > 2) {
        const pctUp = Math.round((avgR / avgO - 1) * 100);
        alerts.push({
          id: `vendor_${vendor}`,
          type: "vendor_lead",
          severity: pctUp >= 75 ? "high" : "medium",
          icon: "fa-solid fa-store",
          title: `${vendor}'s avg lead time up ${pctUp}%`,
          detail: `Lead time: ${avgO.toFixed(0)}d → ${avgR.toFixed(0)}d over last 3 POs`,
          meta: `Based on ${pts.length} purchase orders`,
          action: "Review contract SLA or evaluate alternate vendors",
        });
      }
    });

    const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevM = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`;

    const cc = {};
    (salesOrders || []).forEach((so) => {
      const m = (so.orderDate || so.createdAt || "").slice(0, 7);
      const c = so.companyName || "Unknown";
      if (!cc[c]) cc[c] = { cur: 0, prev: 0 };
      if (m === thisM) cc[c].cur++;
      if (m === prevM) cc[c].prev++;
    });

    Object.entries(cc).forEach(([client, { cur, prev }]) => {
      if (prev < 2) return;
      const drop = ((prev - cur) / prev) * 100;
      if (drop >= 40) {
        alerts.push({
          id: `churn_${client}`,
          type: "client_churn",
          severity: drop >= 70 ? "high" : "medium",
          icon: "fa-solid fa-chart-line-down",
          title: `${client}'s order frequency dropped ${Math.round(drop)}%`,
          detail: `Previous month: ${prev} orders · This month so far: ${cur} orders`,
          meta: "Churn early warning",
          action: "Schedule an account review call or offer a follow-up quote",
        });
      }
    });

    (consumableStock || []).forEach((item) => {
      const qty = +(item.qty || 0);
      const reorder = +(item.reorderLevel || 0);
      if (qty <= 0 || reorder <= 0) return;

      const dailyRate = reorder / 14;
      const daysLeft = qty / dailyRate;
      if (daysLeft < 14) {
        alerts.push({
          id: `consumable_${item._id || item.name}`,
          type: "consumable_low",
          severity:
            daysLeft < 5 ? "critical" : daysLeft < 7 ? "high" : "medium",
          icon: "fa-solid fa-bucket",
          title: `${item.name || "Consumable"} will run out in ~${Math.round(daysLeft)} days`,
          detail: `Stock: ${qty} ${item.unit || "units"} · Reorder level: ${reorder} · Est. usage: ${dailyRate.toFixed(1)}/day`,
          meta: item.category || "Consumable",
          action: "Raise a purchase order immediately",
        });
      }
    });

    const daysElapsedThis = now.getDate();
    const daysInLast = new Date(now.getFullYear(), now.getMonth(), 0).getDate();

    activeMachines.forEach((m) => {
      const mid = String(m._id);
      const match = (e) =>
        String(e.machineId) === mid || String(e.machine) === mid;

      const thisActive = new Set(
        allEntries
          .filter((e) => e.date?.slice(0, 7) === thisM && match(e))
          .map((e) => e.date),
      ).size;
      const lastActive = new Set(
        allEntries
          .filter((e) => e.date?.slice(0, 7) === prevM && match(e))
          .map((e) => e.date),
      ).size;

      const thisDown = Math.max(0, daysElapsedThis - thisActive);
      const lastDown = Math.max(0, daysInLast - lastActive);

      if (lastDown > 0 && thisDown >= lastDown * 2 && thisDown >= 3) {
        alerts.push({
          id: `mdowntime_${mid}`,
          type: "machine_downtime",
          severity: thisDown >= lastDown * 3 ? "high" : "medium",
          icon: "fa-solid fa-gears",
          title: `${m.name} downtime up ${Math.round(thisDown / Math.max(lastDown, 1))}× vs last month`,
          detail: `This month: ${thisDown} inactive days · Last month: ${lastDown}`,
          meta: `Machine type: ${m.type || "—"}`,
          action: "Schedule preventive maintenance inspection",
        });
      }
    });

    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort(
      (a, b) => (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3),
    );
  }, [
    salesOrders,
    jobOrders,
    purchaseOrders,
    inward,
    consumableStock,
    allEntries,
    activeMachines,
  ]);

  const DateFilter = () => (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ color: "#888", fontSize: 11 }}>From:</span>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        style={{
          fontSize: 12,
          padding: "6px 10px",
          background: "rgba(255,255,255,0.07)",
          color: "#e0e0e0",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 8,
          colorScheme: "dark",
          fontStretch: "normal",
        }}
      />
      <span style={{ color: "#888", fontSize: 11 }}>To:</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        style={{
          fontSize: 12,
          padding: "6px 10px",
          background: "rgba(255,255,255,0.07)",
          color: "#e0e0e0",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 8,
          colorScheme: "dark",
          fontStretch: "normal",
        }}
      />
    </div>
  );

  const statusColor = (s) =>
    s === "Fully Dispatched" ? C.green : s === "Partial" ? C.yellow : C.red;

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#e0e0e0",
        paddingBottom: 40,
        fontStretch: "normal",
        fontStyle: "normal",
      }}
    >
      {}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <i className="fa-solid fa-chart-pie" style={{ fontSize: 22 }} />
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
            fontStretch: "normal",
          }}
        >
          Production Dashboard
        </h1>
        <div style={{ marginLeft: "auto" }}>
          <DateFilter />
        </div>
      </div>
      {}
      {}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {(() => {
          const startOfWeek = (d) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
          };

          const isThisWeek = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr.slice(0, 10));
            const now = new Date();
            const start = startOfWeek(now);
            start.setHours(0, 0, 0, 0);
            return d >= start;
          };

          const isLastWeek = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr.slice(0, 10));
            const now = new Date();
            const startThis = startOfWeek(now);
            const startLast = new Date(startThis);
            startLast.setDate(startLast.getDate() - 7);
            startThis.setHours(0, 0, 0, 0);
            startLast.setHours(0, 0, 0, 0);
            return d >= startLast && d < startThis;
          };

          const prodThis = allEntries
            .filter((e) => isThisWeek(e.date))
            .reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
          const prodLast = allEntries
            .filter((e) => isLastWeek(e.date))
            .reduce((s, e) => s + +(e.qtyCompleted || 0), 0);

          const soThis = salesOrders.filter((so) =>
            isThisWeek(so.orderDate || so.createdAt),
          ).length;
          const soLast = salesOrders.filter((so) =>
            isLastWeek(so.orderDate || so.createdAt),
          ).length;

          const dispThis = dispatches
            .filter((d) => isThisWeek(d.date))
            .reduce(
              (s, d) =>
                s + (d.items || []).reduce((ss, i) => ss + +(i.qty || 0), 0),
              0,
            );
          const dispLast = dispatches
            .filter((d) => isLastWeek(d.date))
            .reduce(
              (s, d) =>
                s + (d.items || []).reduce((ss, i) => ss + +(i.qty || 0), 0),
              0,
            );

          const rejThis = allEntries
            .filter((e) => isThisWeek(e.date))
            .reduce((s, e) => s + +(e.qtyRejected || 0), 0);
          const rejLast = allEntries
            .filter((e) => isLastWeek(e.date))
            .reduce((s, e) => s + +(e.qtyRejected || 0), 0);

          const trend = (curr, prev) => {
            if (!prev) return null;
            const diff = ((curr - prev) / prev) * 100;
            return {
              val: `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`,
              isUp: diff > 0,
              color: diff > 0 ? C.green : C.red,
            };
          };

          const agedOrders = salesOrders.filter((so) => {
            const age = daysSince(so.orderDate || so.createdAt);
            return (
              age > 7 && so.status !== "Closed" && so.status !== "Cancelled"
            );
          }).length;

          return [
            {
              label: "Production",
              val: fmt(prodThis),
              icon: "fa-solid fa-gears",
              tab: "production",
              trend: trend(prodThis, prodLast),
              unit: "pcs",
            },
            {
              label: "Sales Orders",
              val: soThis,
              icon: "fa-solid fa-receipt",
              tab: "so_recon",
              trend: trend(soThis, soLast),
              roles: ["Admin", "Manager", "Sales", "Client"],
            },
            {
              label: "Dispatched",
              val: fmt(dispThis),
              icon: "fa-solid fa-truck",
              tab: "delivery",
              trend: trend(dispThis, dispLast),
            },
            {
              label: "Active Jobs",
              val: activeJOs.length,
              icon: "fa-solid fa-clipboard-list",
              tab: "production",
              roles: ["Admin", "Manager", "Production", "Client"],
            },
            {
              label: "Aged Orders",
              val: agedOrders,
              icon: "⏳",
              tab: "so_ageing",
              roles: ["Admin", "Manager", "Sales", "Client"],
            },
            {
              label: "Rejections",
              val: fmt(rejThis),
              icon: "fa-solid fa-xmark",
              tab: "yield",
              trend: trend(rejThis, rejLast),
              inverse: true,
              roles: ["Admin", "Manager", "Production"],
            },
            {
              label: "Low Stock",
              val: lowStockItems.length,
              icon: "fa-solid fa-triangle-exclamation",
              tab: "low_stock",
            },
          ]
            .filter((card) => !card.roles || card.roles.includes(userRole))
            .map((card) => (
              <div
                key={card.label}
                onClick={() => setReportTab(card.tab)}
                style={{
                  background: "transparent",
                  borderRadius: 18,
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  boxShadow:
                    "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow = `0 16px 36px -8px ${card.color}44, inset 0 1px 0 rgba(255,255,255,0.15)`;
                  e.currentTarget.style.borderColor = card.color + "77";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background =
                    reportTab === card.tab
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(255,255,255,0.05)";
                  e.currentTarget.style.boxShadow =
                    reportTab === card.tab
                      ? `0 0 24px ${card.color}28, inset 0 1px 0 rgba(255,255,255,0.12)`
                      : "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor =
                    reportTab === card.tab
                      ? card.color + "88"
                      : "rgba(255,255,255,0.12)";
                }}
              >
                <div>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 3 }}
                  >
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 900,
                        color: "#fff",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {card.val}
                    </div>
                    {card.unit && (
                      <span
                        style={{ fontSize: 12, color: "#666", fontWeight: 600 }}
                      >
                        {card.unit}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#999",
                      marginTop: 2,
                    }}
                  >
                    {card.label}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      padding: 10,
                      borderRadius: 12,
                      background: card.color + "11",
                    }}
                  >
                    <i className={card.icon} />
                  </span>
                </div>
                {reportTab === card.tab && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: 16,
                      boxShadow: `inset 0 0 15px ${card.color}11`,
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            ));
        })()}
      </div>
      {}
      {allAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#555",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {allAlerts.length} alert{allAlerts.length > 1 ? "s" : ""}
            </span>
            {allAlerts.slice(0, 5).map((a) => {
              const col =
                a.severity === "critical"
                  ? "#ef4444"
                  : a.severity === "high"
                    ? "#f97316"
                    : "#f59e0b";
              return (
                <div
                  key={a.id}
                  onClick={() => setReportTab("alerts")}
                  style={{
                    flexShrink: 0,
                    background: `${col}11`,
                    border: `1px solid ${col}44`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    maxWidth: 260,
                  }}
                >
                  <i className={a.icon} style={{ fontSize: 13 }} />
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: col,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {a.title}
                    </div>
                    <div style={{ fontSize: 9, color: "#555" }}>{a.meta}</div>
                  </div>
                </div>
              );
            })}
            {allAlerts.length > 5 && (
              <div
                onClick={() => setReportTab("alerts")}
                style={{
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.13)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  color: "#aaa",
                  fontSize: 10,
                  fontWeight: 500,
                }}
              >
                +{allAlerts.length - 5} more →
              </div>
            )}
          </div>
        </div>
      )}
      {}
      <div style={{ marginBottom: 24 }}>
        {(() => {
          const rows = [];
          for (let i = 0; i < reportTabs.length; i += 6) {
            rows.push(reportTabs.slice(i, i + 6));
          }
          return rows.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${row.length}, 1fr)`,
                gap: 10,
                marginBottom: 10,
              }}
            >
              {row.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setReportTab(t.id);
                    setDrill(null);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background:
                      reportTab === t.id
                        ? "rgba(255,120,0,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${reportTab === t.id ? "#ff7800aa" : "rgba(255,255,255,0.12)"}`,
                    color: reportTab === t.id ? "#ff7800" : "#999",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: reportTab === t.id ? 700 : 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                    boxShadow:
                      reportTab === t.id
                        ? "0 4px 20px rgba(255,120,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1)"
                        : "0 2px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    if (reportTab !== t.id) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.09)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.22)";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (reportTab !== t.id) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                      e.currentTarget.style.color = "#999";
                    }
                  }}
                >
                  <i className={t.icon} style={{ fontSize: 16 }} />
                  <span style={{ whiteSpace: "nowrap" }}>{t.label} Report</span>
                </button>
              ))}
            </div>
          ));
        })()}
      </div>
      {/* Search + Export toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            maxWidth: 420,
          }}
        >
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666",
              fontSize: 12,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={dashboardSearch}
            onChange={(e) => setDashboardSearch(e.target.value)}
            placeholder="Search rows in this tab…"
            style={{
              width: "100%",
              padding: "8px 32px 8px 34px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "#e0e0e0",
              fontSize: 13,
              outline: "none",
            }}
          />
          {dashboardSearch && (
            <button
              onClick={() => setDashboardSearch("")}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#999",
                cursor: "pointer",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Clear search"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        <button
          onClick={exportReportExcel}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "rgba(34,197,94,0.85)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <i className="fa-solid fa-file-excel" /> Excel
        </button>
        <button
          onClick={exportReportPDF}
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
        ><i className="fa-solid fa-file-pdf" /> PDF</button>
        </div>
      </div>
      <div ref={reportSectionRef}>
        {reportTab === "production" && (
          <div>
            <div
              style={{
                padding: 20,
                background: "transparent",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <i
                className="fa-solid fa-gears"
                style={{ fontSize: 36, color: "inherit" }}
              />
              <div>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 10 }}
                >
                  <span
                    style={{ fontSize: 44, fontWeight: 900, color: C.yellow }}
                  >
                    {activeJOs.length}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>
                    Open Job Orders
                  </span>
                </div>
                <div style={{ color: "#888", fontSize: 12 }}>
                  Active orders currently in production
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Pending by Process
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 10,
              }}
            >
              {STAGES.map((proc) => {
                const count = processPendingMap[proc]?.length || 0;
                const isSelected = selectedProcessPending === proc;
                return (
                  <div
                    key={proc}
                    onClick={() =>
                      setSelectedProcessPending(isSelected ? null : proc)
                    }
                    style={{
                      background: isSelected
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isSelected ? C.blue + "99" : count > 0 ? C.blue + "44" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 12,
                      padding: 14,
                      cursor: count > 0 ? "pointer" : "default",
                      boxShadow: isSelected
                        ? `0 0 16px ${C.blue}44, inset 0 1px 0 rgba(255,255,255,0.1)`
                        : "0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.07)",
                      transform: isSelected ? "scale(1.02)" : "scale(1)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 900,
                        color: count > 0 ? C.blue : "#333",
                      }}
                    >
                      {count}
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 500, margin: "4px 0" }}
                    >
                      {proc}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {count > 0 ? "jobs pending" : "All clear"}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedProcessPending &&
              processPendingMap[selectedProcessPending]?.length > 0 && (
                <div
                  style={{
                    marginTop: 20,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    boxShadow:
                      "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #2a2a2e",
                      fontWeight: 500,
                      color: C.blue,
                    }}
                  >
                    Jobs Pending for {selectedProcessPending}
                  </div>
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <table style={TABLE}>
                    <colgroup>
                      <col style={{ width: 120 }} />
                      <col style={{ width: 140 }} />
                      <col style={{ width: "auto" }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          "Job Order #",
                          "Sales Order / Client",
                          "Item Name",
                          "Order Qty",
                          "Prod Qty",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processPendingMap[selectedProcessPending].map(
                        (jo, i) => (
                          <tr
                            key={jo._id || i}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td
                              style={{
                                ...TD,
                                color: C.yellow,
                                fontWeight: 700,
                              }}
                            >
                              {jo.joNo}
                            </td>
                            <td style={TD}>
                              <div style={{ color: C.green, fontSize: 12 }}>
                                {jo.soRef}
                              </div>
                              <div
                                style={{
                                  color: "#aaa",
                                  fontSize: 12,
                                  marginTop: 4,
                                }}
                              >
                                {jo.companyName}
                              </div>
                            </td>
                            <td
                              style={{
                                ...TD,
                                color: "#ccc",
                                whiteSpace: "normal",
                              }}
                            >
                              {jo.itemName}
                            </td>
                            <td style={{ ...TD, fontWeight: 700 }}>
                              {fmt(jo.orderQty)}
                            </td>
                            <td style={{ ...TD, color: C.green }}>
                              {fmt(jo.producedQty)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
          </div>
        )}

        {}
        {(reportTab === "operator" || reportTab === "machine") && (
          <div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 20,
                alignItems: "flex-end",
                background: "transparent",
                padding: 16,
                borderRadius: 8,
                border: "1px solid #2a2a2e",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#888",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Select {reportTab === "operator" ? "Operator" : "Machine"}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <select
                    value={
                      reportTab === "operator"
                        ? selectedOperator
                        : selectedMachine
                    }
                    onChange={(e) =>
                      reportTab === "operator"
                        ? setSelectedOperator(e.target.value)
                        : setSelectedMachine(e.target.value)
                    }
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      background: "#0c0c0e",
                      border: "1px solid #3a3a3e",
                      color: "#e0e0e0",
                      borderRadius: 6,
                      fontSize: 13,
                      fontStretch: "normal",
                    }}
                  >
                    <option value="">
                      -- Select{" "}
                      {reportTab === "operator" ? "Operator" : "Machine"} --
                    </option>
                    {reportTab === "operator"
                      ? operatorMaster.length > 0
                        ? operatorMaster
                            .filter((op) => op.isActive !== false)
                            .map((op) => (
                              <option key={op._id} value={op.name}>
                                {op.name}
                              </option>
                            ))
                        : [
                            ...new Set(
                              allEntries.map((e) => e.operator).filter(Boolean),
                            ),
                          ]
                            .sort()
                            .map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))
                      : activeMachines.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.type})
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#888",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Date From
                </div>
                <DatePicker
                  value={dateFrom}
                  onChange={(v) => setDateFrom(v)}
                  style={{ background: "#0c0c0e", border: "1px solid #3a3a3e" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#888",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Date To
                </div>
                <DatePicker
                  value={dateTo}
                  onChange={(v) => setDateTo(v)}
                  style={{ background: "#0c0c0e", border: "1px solid #3a3a3e" }}
                />
              </div>

              <button
                onClick={() => {
                  setAppliedFilters({
                    operator: selectedOperator,
                    machine: selectedMachine,
                    dateFrom,
                    dateTo,
                  });
                }}
                style={{
                  padding: "10px 24px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  height: 38,
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                  transition: "all 0.18s ease",
                }}
              >
                Generate Report
              </button>
            </div>

            {(reportTab === "operator" && appliedFilters.operator) ||
            (reportTab === "machine" && appliedFilters.machine) ? (
              filteredEntries.length === 0 ? (
                <div
                  style={{ textAlign: "center", padding: 60, color: "#555" }}
                >
                  No entries found for selected filters.
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                  }}
                >
                  {/* Header with Operator/Machine Details */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid #2a2a2e",
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "#aaa",
                    }}
                  >
                    {reportTab === "operator" ? (
                      <div>
                        <span style={{ fontWeight: 600, color: "#e0e0e0" }}>
                          Operator:{" "}
                        </span>
                        <span>{appliedFilters.operator || "—"}</span>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontWeight: 600, color: "#e0e0e0" }}>
                          Machine:{" "}
                        </span>
                        <span>
                          {machineMaster.find(
                            (m) =>
                              String(m._id) === String(appliedFilters.machine),
                          )?.name ||
                            appliedFilters.machine ||
                            "—"}
                        </span>
                      </div>
                    )}
                  </div>

                  <table style={TABLE}>
                    <colgroup>
                      <col style={{ width: 120 }} />
                      <col style={{ width: "40%" }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {["Date", "Item / JO", "Process", "Qty Done"].map(
                          (h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((e, idx) => (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? "#0e0e12" : "#121216",
                          }}
                        >
                          <td style={TD}>{fmtDate(e.date)}</td>
                          <td style={TD}>
                            <div style={{ fontWeight: 600 }}>
                              {e.itemName || "—"}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: C.yellow,
                                marginTop: 2,
                              }}
                            >
                              {e.joNo || ""}
                            </div>
                          </td>
                          <td style={TD}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                background:
                                  (PROCESS_COLORS[e.stage] || "#555") + "33",
                                color: PROCESS_COLORS[e.stage] || "#aaa",
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              {e.stage || "—"}
                            </span>
                          </td>
                          <td
                            style={{ ...TD, color: C.green, fontWeight: 700 }}
                          >
                            {fmt(e.qtyCompleted)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div style={{ textAlign: "center", padding: 60, color: "#555" }}>
                Select {reportTab === "operator" ? "an operator" : "a machine"}{" "}
                to view logs
              </div>
            )}
          </div>
        )}

        {}
        {}
        {reportTab === "po_recon" &&
          (() => {
            const filteredPOs = purchaseOrders.filter((po) => {
              const d = po.poDate || po.createdAt || "";
              if (dateFrom && d < dateFrom) return false;
              if (dateTo && d > dateTo) return false;
              return true;
            });

            const allRows = filteredPOs.map((po) => {
              const items = po.items || [];
              const orderedQty = items.reduce((s, it) => {
                if (it.category === "Paper Reel") return s;
                return s + +(it.noOfSheets || it.qty || 0);
              }, 0);
              const orderedWt = items.reduce(
                (s, it) => s + +(it.weight || 0),
                0,
              );
              const skuCount = items.length;

              const inRecords = inward.filter(
                (inw) =>
                  String(inw.poRef || inw.poNo || "") ===
                  String(po.poNo || po._id || ""),
              );

              const receivedQty = inRecords.reduce(
                (s, r) =>
                  s +
                  (r.items || []).reduce((a, it) => {
                    if (it.category === "Paper Reel") return a;
                    return a + +(it.noOfSheets || it.qty || 0);
                  }, 0),
                0,
              );
              const receivedWt = inRecords.reduce(
                (s, r) =>
                  s +
                  (r.items || []).reduce((a, it) => a + +(it.weight || 0), 0),
                0,
              );
              const skusReceived = [
                ...new Set(
                  inRecords.flatMap((r) =>
                    (r.items || [])
                      .filter((it) => (it.qty || it.weight) > 0)
                      .map((it) => it.productCode),
                  ),
                ),
              ].length;

              const fillRate =
                orderedWt > 0 ? (receivedWt / orderedWt) * 100 : 0;

              let status = "Open";
              if (fillRate >= 90) status = "Received";
              else if (fillRate > 0) status = "Partial";

              return {
                po,
                orderedQty,
                orderedWt,
                receivedQty,
                receivedWt,
                skuCount,
                skusReceived,
                fillRate: Math.round(fillRate),
                status,
                pendingQty: Math.max(0, orderedQty - receivedQty),
                pendingWt: Math.max(0, orderedWt - receivedWt),
              };
            });

            const rows = allRows.filter((r) => {
              if (poReconStatus !== "All" && r.status !== poReconStatus)
                return false;
              return true;
            });

            const stats = {
              total: rows.length,
              notOpen: rows.filter((r) => r.status !== "Open").length,
              skusOrd: rows.reduce((s, r) => s + r.skuCount, 0),
              skusRec: rows.reduce((s, r) => s + r.skusReceived, 0),
              totOrdWt: rows.reduce((s, r) => s + r.orderedWt, 0),
              totRecWt: rows.reduce((s, r) => s + r.receivedWt, 0),
              pendingWt: rows.reduce((s, r) => s + r.pendingWt, 0),
            };
            stats.overallFill =
              stats.totOrdWt > 0
                ? Math.round((stats.totRecWt / stats.totOrdWt) * 100)
                : 0;

            if (rows.length === 0)
              return (
                <div
                  style={{ textAlign: "center", padding: 60, color: "#555" }}
                >
                  No Purchase Orders found.
                </div>
              );

            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 20,
                    alignItems: "flex-end",
                    background: "transparent",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE FROM
                    </div>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => setDateFrom(v)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE TO
                    </div>
                    <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      STATUS
                    </div>
                    <select
                      value={poReconStatus}
                      onChange={(e) => setPoReconStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "#0c0c0e",
                        border: "1px solid #3a3a3e",
                        color: "#e0e0e0",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Open">Open</option>
                      <option value="Partial">Partial</option>
                      <option value="Received">Received</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    { label: "Total POs", val: stats.total, color: C.blue },
                    {
                      label: "Open / Partial",
                      val:
                        stats.total -
                        rows.filter((r) => r.status === "Received").length,
                      color: C.yellow,
                    },
                    {
                      label: "SKUs Ordered",
                      val: stats.skusOrd,
                      color: C.blue,
                    },
                    {
                      label: "SKUs Received",
                      val: stats.skusRec,
                      color: C.green,
                    },
                    {
                      label: "Total Ordered (kg)",
                      val: fmt(stats.totOrdWt),
                      color: C.blue,
                    },
                    {
                      label: "Total Received (kg)",
                      val: fmt(stats.totRecWt),
                      color: C.green,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${s.color}44`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 900,
                          color: s.color,
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: "#888",
                          textTransform: "uppercase",
                          marginTop: 4,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.red}44`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 24, fontWeight: 900, color: C.red }}
                    >
                      {stats.overallFill}%
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#888",
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      Overall Fill Rate
                    </div>
                  </div>
                  <div
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.red}44`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 24, fontWeight: 900, color: C.red }}
                    >
                      {fmt(stats.pendingWt)} kg
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#888",
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      Pending (kg)
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <table style={{ ...TABLE, minWidth: 980 }}>
                    <colgroup>
                      <col style={{ minWidth: 110, width: "10%" }} />
                      <col style={{ minWidth: 160, width: "20%" }} />
                      <col style={{ minWidth: 100, width: "10%" }} />
                      <col style={{ minWidth: 100, width: "10%" }} />
                      <col style={{ minWidth: 170, width: "17%" }} />
                      <col style={{ minWidth: 190, width: "20%" }} />
                      <col style={{ minWidth: 120, width: "13%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          "PO #",
                          "Vendor",
                          "PO Date",
                          "Status",
                          "Ordered",
                          "Received",
                          "Fill Rate",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? "#0e0e12" : "#121216",
                          }}
                        >
                          <td style={{ ...TD, color: C.blue, fontWeight: 700 }}>
                            {r.po.poNo || "—"}
                          </td>
                          <td style={{ ...TD, whiteSpace: "normal" }}>
                            <div style={{ fontWeight: 600 }}>
                              {r.po.vendor || r.po.vendorName || "—"}
                            </div>
                            <div style={{ fontSize: 9, color: "#666" }}>
                              {r.skuCount} SKU
                            </div>
                          </td>
                          <td style={{ ...TD, color: "#888" }}>
                            {r.po.poDate?.slice(0, 10) || "—"}
                          </td>
                          <td style={TD}>
                            <Badge
                              label={r.status}
                              color={
                                r.status === "Received"
                                  ? C.green
                                  : r.status === "Partial"
                                    ? C.yellow
                                    : C.blue
                              }
                            />
                          </td>
                          <td style={{ ...TD, whiteSpace: "normal" }}>
                            <div style={{ fontWeight: 600 }}>
                              {r.orderedQty > 0
                                ? `${fmt(r.orderedQty)} sheets / `
                                : ""}
                              {fmt(r.orderedWt)} kg
                            </div>
                            <div style={{ fontSize: 9, color: "#666" }}>
                              {r.skuCount} SKU
                            </div>
                          </td>
                          <td style={{ ...TD, whiteSpace: "normal" }}>
                            <div style={{ fontWeight: 600, color: C.green }}>
                              {r.receivedQty > 0
                                ? `${fmt(r.receivedQty)} sheets / `
                                : ""}
                              {fmt(r.receivedWt)} kg
                            </div>
                            {r.pendingWt > 0 && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: C.red,
                                  marginTop: 4,
                                }}
                              >
                                ▼{" "}
                                {r.pendingQty > 0
                                  ? `${fmt(r.pendingQty)} sheets / `
                                  : ""}
                                {fmt(r.pendingWt)} kg pending
                              </div>
                            )}
                          </td>
                          <td style={TD}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: r.fillRate >= 90 ? C.green : C.yellow,
                                }}
                              >
                                {r.fillRate}%
                              </span>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: 4,
                                background: "#2a2a2e",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${r.fillRate}%`,
                                  height: "100%",
                                  background:
                                    r.fillRate >= 90 ? C.green : C.yellow,
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        {}
        {reportTab === "so_recon" &&
          (() => {
            const rows = soRows;
            const stats = {
              total: rows.length,
              productionPending: rows.filter(
                (r) => r.status === "Production Pending",
              ).length,
              dispatchPending: rows.filter(
                (r) => r.status === "Dispatch Pending",
              ).length,
              complete: rows.filter((r) => r.status === "Complete").length,
              totalPend: rows.reduce((s, r) => s + r.pend, 0),
            };

            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 20,
                    alignItems: "flex-end",
                    background: "transparent",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE FROM
                    </div>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => setDateFrom(v)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE TO
                    </div>
                    <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      STATUS
                    </div>
                    <select
                      value={soReconStatus}
                      onChange={(e) => setSoReconStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "#0c0c0e",
                        border: "1px solid #3a3a3e",
                        color: "#e0e0e0",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Production Pending">
                        Production Pending
                      </option>
                      <option value="Dispatch Pending">Dispatch Pending</option>
                      <option value="Complete">Complete</option>
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Total Sales Orders",
                      val: stats.total,
                      color: C.blue,
                    },
                    {
                      label: "Production Pending",
                      val: stats.productionPending,
                      color: C.yellow,
                    },
                    {
                      label: "Dispatch Pending",
                      val: stats.dispatchPending,
                      color: C.blue,
                    },
                    { label: "Complete", val: stats.complete, color: C.green },
                    {
                      label: "Total Pending (pcs)",
                      val: fmt(stats.totalPend),
                      color: C.red,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${s.color}44`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 900,
                          color: s.color,
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          marginTop: 4,
                          color: "#bbb",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {rows.length === 0 ? (
                  <div
                    style={{ textAlign: "center", padding: 60, color: "#555" }}
                  >
                    No Sales Orders found.
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      border: "1px solid #2a2a2e",
                    }}
                  >
                    <table style={TABLE}>
                      <colgroup>
                        <col style={{ width: 110 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 85 }} />
                        <col style={{ width: 85 }} />
                        <col style={{ width: 85 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 100 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {[
                            "SO #",
                            "Client",
                            "Items",
                            "S.O. Date",
                            "Ordered",
                            "Produced",
                            "Dispatched",
                            "Status",
                            "Actions",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr
                            key={r.soKey + i}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td style={TD}>
                              <div style={{ color: C.green, fontWeight: 700 }}>
                                {r.soNo}
                              </div>
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "#666",
                                  marginTop: 2,
                                }}
                              >
                                {r.so.status}
                              </div>
                            </td>
                            <td style={{ ...TD, fontWeight: 600 }}>
                              {r.so.companyName || r.so.company || "—"}
                            </td>
                            <td
                              style={{
                                ...TD,
                                color: "#888",
                                maxWidth: 220,
                                whiteSpace: "normal",
                              }}
                            >
                              <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word", lineHeight: 1.4 }}>
                                {r.itemsStr}
                              </div>
                            </td>
                            <td style={{ ...TD, color: "#888" }}>
                              {(r.so.orderDate || "").slice(0, 10) || "—"}
                            </td>
                            <td style={TD}>{r.ord > 0 ? fmt(r.ord) : "—"}</td>
                            <td style={{ ...TD, color: C.yellow }}>
                              {r.producedQty > 0 ? fmt(r.producedQty) : "—"}
                            </td>
                            <td style={{ ...TD, color: C.green }}>
                              {r.disp > 0 ? fmt(r.disp) : "—"}
                            </td>
                            <td style={TD}>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: statusColor(r.status),
                                  marginBottom: 4,
                                }}
                              >
                                {r.status}
                                {r.ord > 0 && r.status !== "Fully Dispatched"
                                  ? ` (${r.pct}%)`
                                  : ""}
                              </div>
                              {r.status === "Fully Dispatched" &&
                                r.disp < r.ord && (
                                  <div style={{ fontSize: 9, color: C.green }}>
                                    Reconciled @ {r.pct}%
                                  </div>
                                )}
                              <div
                                style={{
                                  width: "100%",
                                  height: 3,
                                  background: "#1e1e22",
                                  borderRadius: 2,
                                  marginTop: 4,
                                }}
                              >
                                <div
                                  style={{
                                    width: Math.min(r.pct, 100) + "%",
                                    height: "100%",
                                    background: statusColor(r.status),
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </td>
                            <td style={TD}>
                              {r.status !== "Complete" && (
                                <button
                                  onClick={() => handleCloseSO(r.so._id)}
                                  style={{
                                    padding: "4px 8px",
                                    background: C.green + "22",
                                    color: C.green,
                                    border: `1px solid ${C.green}44`,
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                  }}
                                >
                                  Close SO
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {}
        {reportTab === "delivery" &&
          (() => {
            const filteredDispatches = dispatches.filter((d) => {
              const dDate = d.dispatchDate || d.date || d.createdAt || "";
              if (dateFrom && dDate < dateFrom) return false;
              if (dateTo && dDate > dateTo) return false;
              return true;
            });
            const rows = filteredDispatches.map((d, idx) => {
              const dispNo =
                d.dispatchNo ||
                d.dispNo ||
                d.invoiceNo ||
                d._id ||
                `DISP-${idx + 1}`;
              const soRef = d.soRef || d.soNo || d.so || "—";
              const client =
                d.companyName || d.company || d.customerName || "—";
              const dispDate = d.dispatchDate || d.date || d.createdAt || "";
              const vehicle = d.vehicleNo || d.vehicle || d.transport || "—";
              const carrier =
                d.carrier || d.transporterName || d.transporter || "—";
              const items = Array.isArray(d.items) ? d.items : [];
              const totalQty = items.reduce(
                (s, it) => s + +(it.qty || it.quantity || 0),
                0,
              );
              const itemsStr =
                items
                  .map((it) => it.itemName || it.name || "")
                  .filter(Boolean)
                  .join(", ") || "—";
              const status = d.status || (dispDate ? "Dispatched" : "Pending");
              return {
                dispNo,
                soRef,
                client,
                dispDate,
                vehicle,
                carrier,
                totalQty,
                itemsStr,
                status,
                d,
              };
            });

            const totalQtyDispatched = rows.reduce((s, r) => s + r.totalQty, 0);
            const uniqueClients = new Set(
              rows.map((r) => r.client).filter((c) => c !== "—"),
            ).size;
            const today_ = new Date().toISOString().slice(0, 10);
            const dispToday = rows.filter(
              (r) => r.dispDate?.slice(0, 10) === today_,
            ).length;

            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 20,
                    alignItems: "flex-end",
                    background: "transparent",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE FROM
                    </div>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => setDateFrom(v)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE TO
                    </div>
                    <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Total Dispatches",
                      val: rows.length,
                      color: C.blue,
                    },
                    {
                      label: "Total Qty Dispatched",
                      val: fmt(totalQtyDispatched),
                      color: C.green,
                    },
                    {
                      label: "Unique Clients",
                      val: uniqueClients,
                      color: C.yellow,
                    },
                    {
                      label: "Dispatches Today",
                      val: dispToday,
                      color: C.blue,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${s.color}44`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 900,
                          color: s.color,
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          marginTop: 4,
                          color: "#bbb",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {rows.length === 0 ? (
                  <div
                    style={{ textAlign: "center", padding: 60, color: "#555" }}
                  >
                    No Dispatches found.
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      border: "1px solid #2a2a2e",
                    }}
                  >
                    <table style={TABLE}>
                      <colgroup>
                        <col style={{ width: 120 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 85 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 100 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {[
                            "Dispatch #",
                            "SO Ref",
                            "Client",
                            "Items",
                            "Dispatch Date",
                            "Qty",
                            "Vehicle / Carrier",
                            "Status",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr
                            key={r.dispNo + i}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td
                              style={{ ...TD, color: C.blue, fontWeight: 700 }}
                            >
                              {r.dispNo}
                            </td>
                            <td style={{ ...TD, color: C.green }}>{r.soRef}</td>
                            <td style={{ ...TD, fontWeight: 600 }}>
                              {r.client}
                            </td>
                            <td
                              style={{
                                ...TD,
                                color: "#888",
                                maxWidth: 220,
                                whiteSpace: "normal",
                              }}
                            >
                              <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word", lineHeight: 1.4 }}>
                                {r.itemsStr}
                              </div>
                            </td>
                            <td style={{ ...TD, color: "#888" }}>
                              {r.dispDate?.slice(0, 10) || "—"}
                            </td>
                            <td
                              style={{ ...TD, color: C.green, fontWeight: 700 }}
                            >
                              {r.totalQty > 0 ? fmt(r.totalQty) : "—"}
                            </td>
                            <td style={{ ...TD, color: "#888" }}>
                              <div>{r.vehicle}</div>
                              {r.carrier !== "—" && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#555",
                                    marginTop: 2,
                                  }}
                                >
                                  {r.carrier}
                                </div>
                              )}
                            </td>
                            <td style={TD}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: C.green + "22",
                                  color: C.green,
                                  fontSize: 11,
                                  fontWeight: 500,
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {}
        {reportTab === "so_ageing" &&
          (() => {
            const rows = salesOrders
              .filter((o) => o.status !== "Closed" && o.status !== "Cancelled")
              .map((s) => {
                const baseDate = (s.orderDate || s.createdAt || "").toString().slice(0, 10);
                const age = baseDate ? daysSince(baseDate) : 0;
                const ord = (s.items || []).reduce(
                  (a, i) => a + +(i.orderQty || i.qty || 0),
                  0,
                );
                const soKey = s.soNo || s._id || "";
                const disp = dispMap[soKey] || 0;
                return { s, age, ord, disp, soKey };
              });

            const bucket = (lo, hi) =>
              rows.filter((r) => r.age >= lo && (hi === null || r.age <= hi));

            return (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  {[
                    { label: "0-7 days", rows: bucket(0, 7), color: C.green },
                    {
                      label: "8-14 days",
                      rows: bucket(8, 14),
                      color: C.yellow,
                    },
                    {
                      label: "15-30 days",
                      rows: bucket(15, 30),
                      color: C.orange || "#f97316",
                    },
                    { label: "30+ days", rows: bucket(31, null), color: C.red },
                  ].map((st) => (
                    <div
                      key={st.label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${st.color}44`,
                        borderRadius: 8,
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 900,
                          color: st.color,
                        }}
                      >
                        {st.rows.length}
                      </div>
                      <div
                        style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}
                      >
                        {st.label}
                      </div>
                    </div>
                  ))}
                </div>

                {rows.length === 0 ? (
                  <div
                    style={{ textAlign: "center", padding: 60, color: "#555" }}
                  >
                    No open Sales Orders found.
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      border: "1px solid #2a2a2e",
                    }}
                  >
                    <table style={TABLE}>
                      <colgroup>
                        <col style={{ width: 100 }} />
                        <col style={{ width: 140 }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 90 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {[
                            "SO #",
                            "Client",
                            "Items",
                            "Order Date",
                            "Age (Days)",
                            "Ordered",
                            "Dispatched",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const ageColor =
                            r.age <= 7
                              ? C.green
                              : r.age <= 14
                                ? C.yellow
                                : r.age <= 30
                                  ? C.orange || "#f97316"
                                  : C.red;
                          return (
                            <tr
                              key={r.soKey || i}
                              style={{
                                background: i % 2 === 0 ? "#0e0e12" : "#121216",
                              }}
                            >
                              <td
                                style={{
                                  ...TD,
                                  color: C.green,
                                  fontWeight: 700,
                                }}
                              >
                                {r.s.soNo || "—"}
                              </td>
                              <td style={{ ...TD, fontWeight: 600 }}>
                                {r.s.companyName || "—"}
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  color: "#888",
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                  maxWidth: 0,
                                }}
                              >
                                {(r.s.items || [])
                                  .map((it) => it.itemName || it.name || "")
                                  .filter(Boolean)
                                  .join(", ") || "—"}
                              </td>
                              <td style={{ ...TD, color: "#888" }}>
                                {r.s.orderDate?.slice(0, 10) || "—"}
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  color: ageColor,
                                  fontWeight: 800,
                                }}
                              >
                                {r.age}
                              </td>
                              <td style={TD}>{fmt(r.ord)}</td>
                              <td style={{ ...TD, color: C.green }}>
                                {fmt(r.disp)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {}
        {reportTab === "prod_target" &&
          (() => {
            const dates = [];
            for (let i = 0; i < 15; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              dates.push(d.toISOString().slice(0, 10));
            }

            return (
              <div
                style={{
                  borderRadius: 8,
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  border: "1px solid #2a2a2e",
                }}
              >
                <table style={TABLE}>
                  <colgroup>
                    <col style={{ width: 140 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: "auto" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["Date", "Day", "Target", "Actual", "Set Target"].map(
                        (h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((d, i) => {
                      const actual = allEntries
                        .filter((e) => e.date === d)
                        .reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
                      const target = pvtTargets[d] || 0;
                      const dayLabel = new Date(d).toLocaleDateString("en-US", {
                        weekday: "short",
                      });
                      return (
                        <tr
                          key={d}
                          style={{
                            background: i % 2 === 0 ? "#0e0e12" : "#121216",
                          }}
                        >
                          <td style={TD}>{d}</td>
                          <td style={{ ...TD, color: "#888" }}>{dayLabel}</td>
                          <td
                            style={{
                              ...TD,
                              color: target > 0 ? C.blue : "#555",
                            }}
                          >
                            {target > 0 ? fmt(target) : "—"}
                          </td>
                          <td
                            style={{
                              ...TD,
                              fontWeight: 500,
                              color: actual > 0 ? C.green : "#555",
                            }}
                          >
                            {actual > 0 ? fmt(actual) : "—"}
                          </td>
                          <td style={TD}>
                            <input
                              type="number"
                              placeholder="Set target..."
                              defaultValue={pvtTargets[d] || ""}
                              onBlur={(e) => {
                                const val = +e.target.value;
                                setPvtTargets((prev) => ({
                                  ...prev,
                                  [d]: val,
                                }));
                              }}
                              style={{
                                padding: "4px 8px",
                                width: 110,
                                background: "#0c0c0e",
                                border: "1px solid #2a2a2e",
                                color: "#e0e0e0",
                                borderRadius: 4,
                                fontSize: 12,
                                fontStretch: "normal",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

        {}
        {reportTab === "yield" &&
          (() => {
            const ySummary = STAGES.map((stage) => {
              const logs = filteredEntries.filter((e) => e.stage === stage);
              const ok = logs.reduce((s, l) => s + +(l.qtyCompleted || 0), 0);
              const rj = logs.reduce((s, l) => s + +(l.qtyRejected || 0), 0);
              const tot = ok + rj;
              const pct = tot > 0 ? Math.round((ok / tot) * 100) : 100;
              return { stage, ok, rj, tot, pct };
            });

            const mSummaryAll = activeMachines
              .map((m) => {
                const mid = String(m._id);
                const logs = filteredEntries.filter(
                  (e) =>
                    String(e.machineId) === mid ||
                    e.machine === mid ||
                    e.machine === m.name,
                );
                const ok = logs.reduce(
                  (s, l) => s + +(l.qtyCompleted || 0),
                  0,
                );
                const rj = logs.reduce(
                  (s, l) => s + +(l.qtyRejected || 0),
                  0,
                );
                const tot = ok + rj;
                const pct = tot > 0 ? Math.round((ok / tot) * 100) : 100;
                return { machine: m, ok, rj, tot, pct };
              })
              .filter((m) => m.tot > 0)
              .sort((a, b) => b.tot - a.tot);

            const mSummary =
              yieldSelectedMachine === "all"
                ? mSummaryAll
                : mSummaryAll.filter(
                    (m) => String(m.machine._id) === yieldSelectedMachine,
                  );

            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 20,
                    alignItems: "flex-end",
                    background: "transparent",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE FROM
                    </div>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => setDateFrom(v)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE TO
                    </div>
                    <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 14,
                    marginBottom: 24,
                  }}
                >
                  {ySummary.map((y) => (
                    <div
                      key={y.stage}
                      style={{
                        background: "transparent",
                        border: `1px solid ${y.pct > 95 ? C.green : C.yellow}44`,
                        borderTop: `4px solid ${y.pct > 95 ? C.green : C.yellow}`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{ fontSize: 12, fontWeight: 500, color: "#888" }}
                      >
                        {y.stage}
                      </div>
                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 900,
                          margin: "8px 0",
                        }}
                      >
                        {y.pct}%
                      </div>
                      <div style={{ fontSize: 11 }}>
                        <span style={{ color: C.green }}>{fmt(y.ok)} ok</span>{" "}
                        <span style={{ color: "#555" }}>/</span>{" "}
                        <span style={{ color: C.red }}>{fmt(y.rj)} rej</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 3,
                          background: "#1e1e22",
                          borderRadius: 2,
                          marginTop: 10,
                        }}
                      >
                        <div
                          style={{
                            width: y.pct + "%",
                            height: "100%",
                            background: y.pct > 95 ? C.green : C.yellow,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.yellow,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Stage-wise Yield
                </div>
                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                    marginBottom: 28,
                  }}
                >
                  <table style={TABLE}>
                    <colgroup>
                      <col style={{ width: "30%" }} />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 90 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          "Stage",
                          "Total Produced",
                          "Accepted",
                          "Rejected",
                          "Yield %",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ySummary.map((y, i) => (
                        <tr
                          key={y.stage}
                          style={{
                            background: i % 2 === 0 ? "#0e0e12" : "#121216",
                          }}
                        >
                          <td style={{ ...TD, fontWeight: 700 }}>{y.stage}</td>
                          <td style={TD}>{fmt(y.tot)}</td>
                          <td style={{ ...TD, color: C.green }}>{fmt(y.ok)}</td>
                          <td
                            style={{ ...TD, color: y.rj > 0 ? C.red : "#555" }}
                          >
                            {fmt(y.rj)}
                          </td>
                          <td
                            style={{
                              ...TD,
                              fontWeight: 800,
                              color: y.pct > 95 ? C.green : C.yellow,
                            }}
                          >
                            {y.pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.blue,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Machine-wise Yield
                  </div>
                  <select
                    value={yieldSelectedMachine}
                    onChange={(e) => setYieldSelectedMachine(e.target.value)}
                    style={{
                      padding: "7px 10px",
                      background: "#0c0c0e",
                      border: "1px solid #3a3a3e",
                      color: "#e0e0e0",
                      borderRadius: 6,
                      fontSize: 12,
                      minWidth: 220,
                    }}
                  >
                    <option value="all">All Machines ({mSummaryAll.length})</option>
                    {mSummaryAll.map((m) => (
                      <option key={m.machine._id} value={String(m.machine._id)}>
                        {m.machine.name}
                        {m.machine.type ? ` (${m.machine.type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {mSummary.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#555",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      border: "1px dashed #2a2a2e",
                    }}
                  >
                    No machine activity in selected period.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 14,
                        marginBottom: 16,
                      }}
                    >
                      {mSummary.map((m) => (
                        <div
                          key={m.machine._id}
                          style={{
                            background: "transparent",
                            border: `1px solid ${m.pct > 95 ? C.green : C.yellow}44`,
                            borderTop: `4px solid ${m.pct > 95 ? C.green : C.yellow}`,
                            borderRadius: 8,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#ddd",
                            }}
                          >
                            {m.machine.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#666",
                              marginBottom: 4,
                            }}
                          >
                            {m.machine.type || "—"}
                          </div>
                          <div
                            style={{
                              fontSize: 28,
                              fontWeight: 900,
                              margin: "6px 0",
                            }}
                          >
                            {m.pct}%
                          </div>
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: C.green }}>
                              {fmt(m.ok)} ok
                            </span>{" "}
                            <span style={{ color: "#555" }}>/</span>{" "}
                            <span style={{ color: C.red }}>{fmt(m.rj)} rej</span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 3,
                              background: "#1e1e22",
                              borderRadius: 2,
                              marginTop: 10,
                            }}
                          >
                            <div
                              style={{
                                width: m.pct + "%",
                                height: "100%",
                                background: m.pct > 95 ? C.green : C.yellow,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        borderRadius: 8,
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        border: "1px solid #2a2a2e",
                      }}
                    >
                      <table style={TABLE}>
                        <colgroup>
                          <col style={{ width: "25%" }} />
                          <col style={{ width: 130 }} />
                          <col style={{ width: 120 }} />
                          <col style={{ width: 100 }} />
                          <col style={{ width: 100 }} />
                          <col style={{ width: 90 }} />
                        </colgroup>
                        <thead>
                          <tr>
                            {[
                              "Machine",
                              "Type",
                              "Total Produced",
                              "Accepted",
                              "Rejected",
                              "Yield %",
                            ].map((h) => (
                              <th key={h} style={TH}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mSummary.map((m, i) => (
                            <tr
                              key={m.machine._id}
                              style={{
                                background:
                                  i % 2 === 0 ? "#0e0e12" : "#121216",
                              }}
                            >
                              <td style={{ ...TD, fontWeight: 700 }}>
                                {m.machine.name}
                              </td>
                              <td style={{ ...TD, color: "#888" }}>
                                {m.machine.type || "—"}
                              </td>
                              <td style={TD}>{fmt(m.tot)}</td>
                              <td style={{ ...TD, color: C.green }}>
                                {fmt(m.ok)}
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  color: m.rj > 0 ? C.red : "#555",
                                }}
                              >
                                {fmt(m.rj)}
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  fontWeight: 800,
                                  color: m.pct > 95 ? C.green : C.yellow,
                                }}
                              >
                                {m.pct}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        {}
        {reportTab === "low_stock" &&
          (() => {
            const low = lowStockItems;
            return low.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: C.green,
                  background: "transparent",
                  borderRadius: 8,
                  border: "1px solid #2a2a2e",
                }}
              >
                All items are within healthy stock levels.
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#888",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  {low.length} items below reorder level
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {["All", "RM", "CG", "FG"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLowStockFilter(f)}
                      style={{
                        padding: "6px 16px",
                        borderRadius: 6,
                        border: `1px solid ${lowStockFilter === f ? C.red : "#2a2a2e"}`,
                        background:
                          lowStockFilter === f ? C.red + "22" : "transparent",
                        color: lowStockFilter === f ? C.red : "#888",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      {f === "All"
                        ? "View All"
                        : f === "RM"
                          ? "Raw Material"
                          : f === "CG"
                            ? "Consumables"
                            : "Finished Goods"}
                    </button>
                  ))}
                  {lowStockSelected.size > 0 && (
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#aaa", fontSize: 12 }}>
                        {lowStockSelected.size} selected
                      </span>
                      <button
                        onClick={() => setLowStockSelected(new Set())}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid #2a2a2e",
                          background: "transparent",
                          color: "#888",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          const selectedItems = low
                            .filter(
                              (item) =>
                                lowStockFilter === "All" ||
                                item.type === lowStockFilter,
                            )
                            .filter((it) =>
                              lowStockSelected.has(`${it.type}::${it.name}`),
                            );

                          const matchItem = (it, target) => {
                            if (
                              target.productCode &&
                              (it.productCode === target.productCode ||
                                it.code === target.productCode)
                            )
                              return true;
                            const nm = (it.itemName || "")
                              .trim()
                              .toLowerCase();
                            return (
                              nm && nm === target.name.trim().toLowerCase()
                            );
                          };

                          const enrichedItems = selectedItems.map((f) => {
                            const suggestedQty = Math.max(
                              Math.ceil(f.reorder - f.stock),
                              Math.ceil(f.reorder),
                            );
                            const matchingPOs = (purchaseOrders || [])
                              .filter((po) =>
                                (po.items || []).some((it) =>
                                  matchItem(it, f),
                                ),
                              )
                              .sort((a, b) =>
                                (b.poDate || b.createdAt || "").localeCompare(
                                  a.poDate || a.createdAt || "",
                                ),
                              );
                            const lastPO = matchingPOs[0];
                            const lastItem = lastPO
                              ? (lastPO.items || []).find((it) =>
                                  matchItem(it, f),
                                )
                              : null;
                            return {
                              itemName: f.name,
                              category: f.category,
                              unit: f.unit,
                              type: f.type,
                              suggestedQty,
                              productCode:
                                f.productCode || lastItem?.productCode || "",
                              subCategory:
                                f.subCategory || lastItem?.subCategory || "",
                              gsm: f.gsm || lastItem?.gsm || "",
                              widthMm:
                                f.widthMm || lastItem?.widthMm || "",
                              lengthMm:
                                f.lengthMm || lastItem?.lengthMm || "",
                              hsnCode:
                                f.hsnCode || lastItem?.hsnCode || "",
                              lastVendor:
                                lastPO?.vendor || lastPO?.vendorName || "",
                              lastVendorContact: lastPO?.vendorContact || "",
                              lastRate: lastItem?.rate || "",
                              lastGstRate: lastItem?.gstRate ?? "",
                              lastPONo: lastPO?.poNo || "",
                            };
                          });

                          const vendors = enrichedItems
                            .map((it) => it.lastVendor)
                            .filter(Boolean);
                          const uniqueVendors = [...new Set(vendors)];
                          const sharedVendor =
                            uniqueVendors.length === 1 ? uniqueVendors[0] : "";
                          const sharedContact = sharedVendor
                            ? enrichedItems.find(
                                (it) => it.lastVendor === sharedVendor,
                              )?.lastVendorContact || ""
                            : "";

                          sessionStorage.setItem(
                            "po_prefill",
                            JSON.stringify({
                              multi: true,
                              items: enrichedItems,
                              sharedVendor,
                              sharedVendorContact: sharedContact,
                              vendorMismatch: uniqueVendors.length > 1,
                            }),
                          );
                          setLowStockSelected(new Set());
                          onNavigate?.("purchase");
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 6,
                          border: `1px solid ${C.blue}66`,
                          background: C.blue + "22",
                          color: C.blue,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <i className="fa-solid fa-cart-plus" /> Make Combined PO ({lowStockSelected.size})
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <table style={TABLE}>
                    <colgroup>
                      <col style={{ width: 44 }} />
                      <col style={{ width: "28%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={TH}>
                          <input
                            type="checkbox"
                            checked={(() => {
                              const visible = low
                                .filter(
                                  (item) =>
                                    lowStockFilter === "All" ||
                                    item.type === lowStockFilter,
                                )
                                .filter(
                                  (it) => it.type === "RM" || it.type === "CG",
                                );
                              return (
                                visible.length > 0 &&
                                visible.every((it) =>
                                  lowStockSelected.has(
                                    `${it.type}::${it.name}`,
                                  ),
                                )
                              );
                            })()}
                            onChange={(e) => {
                              const visible = low
                                .filter(
                                  (item) =>
                                    lowStockFilter === "All" ||
                                    item.type === lowStockFilter,
                                )
                                .filter(
                                  (it) => it.type === "RM" || it.type === "CG",
                                );
                              if (e.target.checked) {
                                setLowStockSelected(
                                  new Set(
                                    visible.map((it) => `${it.type}::${it.name}`),
                                  ),
                                );
                              } else {
                                setLowStockSelected(new Set());
                              }
                            }}
                            style={{ cursor: "pointer" }}
                            title="Select all"
                          />
                        </th>
                        {[
                          "Item Name",
                          "Category",
                          "Current Stock",
                          "Reorder Level",
                          "Status",
                          "Action",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {low
                        .filter(
                          (item) =>
                            lowStockFilter === "All" ||
                            item.type === lowStockFilter,
                        )
                        .map((f, i) => {
                          const suggestedQty = Math.max(
                            Math.ceil(f.reorder - f.stock),
                            Math.ceil(f.reorder),
                          );
                          const canMakePO = f.type === "RM" || f.type === "CG";
                          const rowKey = `${f.type}::${f.name}`;
                          const isSelected = lowStockSelected.has(rowKey);
                          return (
                          <tr
                            key={i}
                            style={{
                              background: isSelected
                                ? C.blue + "18"
                                : i % 2 === 0
                                  ? "#0e0e12"
                                  : "#121216",
                            }}
                          >
                            <td style={TD}>
                              {canMakePO ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    setLowStockSelected((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(rowKey);
                                      else next.delete(rowKey);
                                      return next;
                                    });
                                  }}
                                  style={{ cursor: "pointer" }}
                                />
                              ) : null}
                            </td>
                            <td style={{ ...TD, fontWeight: 700 }}>{f.name}</td>
                            <td style={{ ...TD, color: "#888" }}>
                              {f.category}
                            </td>
                            <td
                              style={{ ...TD, color: C.red, fontWeight: 800 }}
                            >
                              {fmt(f.stock)} {f.unit}
                            </td>
                            <td style={{ ...TD, color: "#888" }}>
                              {fmt(f.reorder)} {f.unit}
                            </td>
                            <td style={TD}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: C.red + "22",
                                  color: C.red,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                }}
                              >
                                Critical
                              </span>
                            </td>
                            <td style={TD}>
                              {canMakePO ? (
                                <button
                                  onClick={() => {
                                    const matchItem = (it) => {
                                      if (
                                        f.productCode &&
                                        (it.productCode === f.productCode ||
                                          it.code === f.productCode)
                                      )
                                        return true;
                                      const nm = (it.itemName || "")
                                        .trim()
                                        .toLowerCase();
                                      return nm && nm === f.name.trim().toLowerCase();
                                    };
                                    const matchingPOs = (purchaseOrders || [])
                                      .filter((po) =>
                                        (po.items || []).some(matchItem),
                                      )
                                      .sort((a, b) =>
                                        (b.poDate || b.createdAt || "").localeCompare(
                                          a.poDate || a.createdAt || "",
                                        ),
                                      );
                                    const lastPO = matchingPOs[0];
                                    const lastItem = lastPO
                                      ? (lastPO.items || []).find(matchItem)
                                      : null;

                                    sessionStorage.setItem(
                                      "po_prefill",
                                      JSON.stringify({
                                        itemName: f.name,
                                        category: f.category,
                                        unit: f.unit,
                                        type: f.type,
                                        suggestedQty,
                                        productCode:
                                          f.productCode ||
                                          lastItem?.productCode ||
                                          "",
                                        subCategory:
                                          f.subCategory ||
                                          lastItem?.subCategory ||
                                          "",
                                        gsm: f.gsm || lastItem?.gsm || "",
                                        widthMm:
                                          f.widthMm || lastItem?.widthMm || "",
                                        lengthMm:
                                          f.lengthMm || lastItem?.lengthMm || "",
                                        hsnCode:
                                          f.hsnCode || lastItem?.hsnCode || "",
                                        size: f.size || "",
                                        width: f.width || "",
                                        length: f.length || "",
                                        height: f.height || "",
                                        lastVendor:
                                          lastPO?.vendor ||
                                          lastPO?.vendorName ||
                                          "",
                                        lastVendorContact:
                                          lastPO?.vendorContact || "",
                                        lastRate: lastItem?.rate || "",
                                        lastGstRate:
                                          lastItem?.gstRate ?? "",
                                        lastPONo: lastPO?.poNo || "",
                                      }),
                                    );
                                    onNavigate?.("purchase");
                                  }}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: 5,
                                    border: `1px solid ${C.blue}66`,
                                    background: C.blue + "22",
                                    color: C.blue,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                  title={`Suggested qty: ${suggestedQty} ${f.unit}`}
                                >
                                  <i className="fa-solid fa-cart-plus" /> Make
                                  PO
                                </button>
                              ) : (
                                <span style={{ color: "#444", fontSize: 11 }}>
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        {}
        {reportTab === "monthly" &&
          (() => {
            const monthStr = selectedMonth;
            const mEntries = allEntries.filter((e) =>
              (e.date || "").startsWith(monthStr),
            );
            const mJOs = jobOrders.filter(
              (j) =>
                (j.createdAt || "").startsWith(monthStr) ||
                activeJOs.some((aj) => aj._id === j._id),
            );

            const totalProd = mEntries.reduce(
              (s, e) => s + +(e.qtyCompleted || 0),
              0,
            );
            const totalRej = mEntries.reduce(
              (s, e) => s + +(e.qtyRejected || 0),
              0,
            );
            const yieldPct =
              totalProd + totalRej > 0
                ? Math.round((totalProd / (totalProd + totalRej)) * 100)
                : 100;

            return (
              <div>
                <div
                  style={{
                    marginBottom: 20,
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#888",
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    Month:
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      padding: "7px 12px",
                      background: "transparent",
                      border: "1px solid #2a2a2e",
                      color: "#e0e0e0",
                      borderRadius: 6,
                      fontSize: 13,
                      fontStretch: "normal",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Total Produced",
                      val: fmt(totalProd),
                      color: C.green,
                    },
                    {
                      label: "Total Rejected",
                      val: fmt(totalRej),
                      color: C.red,
                    },
                    { label: "Active JOs", val: mJOs.length, color: C.blue },
                    {
                      label: "Overall Yield",
                      val: yieldPct + "%",
                      color: C.green,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${s.color}44`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 900,
                          color: s.color,
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "transparent",
                      fontSize: 11,
                      fontWeight: 500,
                      color: C.yellow,
                      textTransform: "uppercase",
                    }}
                  >
                    Production by Process — {monthStr}
                  </div>
                  <table style={TABLE}>
                    <colgroup>
                      <col style={{ width: "30%" }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 100 }} />
                      <col style={{ width: 90 }} />
                      <col style={{ width: "auto" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          "Process",
                          "Produced",
                          "Rejected",
                          "Yield",
                          "Bar",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {STAGES.map((proc, i) => {
                        const logs = mEntries.filter((e) => e.stage === proc);
                        const ok = logs.reduce(
                          (s, l) => s + +(l.qtyCompleted || 0),
                          0,
                        );
                        const rj = logs.reduce(
                          (s, l) => s + +(l.qtyRejected || 0),
                          0,
                        );
                        const y =
                          ok + rj > 0
                            ? Math.round((ok / (ok + rj)) * 100)
                            : 100;
                        return (
                          <tr
                            key={proc}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td style={{ ...TD, fontWeight: 700 }}>{proc}</td>
                            <td style={{ ...TD, color: C.green }}>{fmt(ok)}</td>
                            <td
                              style={{ ...TD, color: rj > 0 ? C.red : "#555" }}
                            >
                              {fmt(rj)}
                            </td>
                            <td
                              style={{
                                ...TD,
                                fontWeight: 800,
                                color: y > 95 ? C.green : C.yellow,
                              }}
                            >
                              {y}%
                            </td>
                            <td style={TD}>
                              <div
                                style={{
                                  width: "100%",
                                  height: 4,
                                  background: "#1e1e22",
                                  borderRadius: 2,
                                }}
                              >
                                <div
                                  style={{
                                    width: y + "%",
                                    height: "100%",
                                    background: y > 95 ? C.green : C.yellow,
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {}
                {mJOs.length > 0 && (
                  <div
                    style={{
                      borderRadius: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      border: "1px solid #2a2a2e",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "transparent",
                        fontSize: 11,
                        fontWeight: 500,
                        color: C.yellow,
                        textTransform: "uppercase",
                      }}
                    >
                      Job Orders — {monthStr}
                    </div>
                    <table style={TABLE}>
                      <colgroup>
                        <col style={{ width: 110 }} />
                        <col style={{ width: "35%" }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 100 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {["JO #", "Item", "Status", "Ordered Qty"].map(
                            (h) => (
                              <th key={h} style={TH}>
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {mJOs.map((j, i) => (
                          <tr
                            key={j._id || i}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td
                              style={{
                                ...TD,
                                color: C.yellow,
                                fontWeight: 700,
                              }}
                            >
                              {j.joNo || "—"}
                            </td>
                            <td style={TD}>{j.itemName || "—"}</td>
                            <td style={TD}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background:
                                    (j.status === "Completed"
                                      ? C.green
                                      : C.yellow) + "22",
                                  color:
                                    j.status === "Completed"
                                      ? C.green
                                      : C.yellow,
                                  fontSize: 11,
                                  fontWeight: 500,
                                }}
                              >
                                {j.status || "—"}
                              </span>
                            </td>
                            <td style={TD}>{fmt(j.orderQty)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {}
        {reportTab === "vendor" &&
          (() => {
            const filteredPOs = purchaseOrders.filter((po) => {
              const d = po.poDate || po.createdAt || "";
              if (dateFrom && d < dateFrom) return false;
              if (dateTo && d > dateTo) return false;
              return true;
            });
            const filteredInward = inward.filter((grn) => {
              const d = grn.date || grn.createdAt || "";
              if (dateFrom && d < dateFrom) return false;
              if (dateTo && d > dateTo) return false;
              return true;
            });

            const vendorMap = {};
            filteredPOs.forEach((po) => {
              const vName =
                po.vendor || po.vendorName || po.supplierName || "Unknown";
              if (!vendorMap[vName]) {
                vendorMap[vName] = { name: vName, pos: [], grns: [] };
              }
              vendorMap[vName].pos.push(po);
            });

            filteredInward.forEach((grn) => {
              const vName =
                grn.vendorName ||
                grn.vendor?.name ||
                grn.vendor ||
                grn.supplierName ||
                "";
              if (vName && vendorMap[vName]) {
                vendorMap[vName].grns.push(grn);
              } else if (vName) {
                if (!vendorMap[vName])
                  vendorMap[vName] = { name: vName, pos: [], grns: [] };
                vendorMap[vName].grns.push(grn);
              }
            });

            const sumItemQty = (items) =>
              (items || []).reduce((sa, it) => {
                if (it.category === "Paper Reel") return sa;
                return sa + +(it.noOfSheets || it.qty || it.quantity || 0);
              }, 0);
            const sumItemWt = (items) =>
              (items || []).reduce(
                (sa, it) => sa + +(it.weight || 0),
                0,
              );

            const vRows = Object.values(vendorMap)
              .map((v) => {
                const ordQty = v.pos.reduce(
                  (s, p) => s + sumItemQty(p.items),
                  0,
                );
                const ordWt = v.pos.reduce(
                  (s, p) => s + sumItemWt(p.items),
                  0,
                );
                const ordAmt = v.pos.reduce(
                  (s, p) => s + +(p.totalAmount || p.total || p.amount || 0),
                  0,
                );
                const recQty = v.grns.reduce(
                  (s, g) => s + sumItemQty(g.items),
                  0,
                );
                const recWt = v.grns.reduce(
                  (s, g) => s + sumItemWt(g.items),
                  0,
                );
                const openPOs = v.pos.filter(
                  (p) =>
                    p.status !== "Received" &&
                    p.status !== "Closed" &&
                    p.status !== "Completed",
                ).length;
                const pendQty = Math.max(0, ordQty - recQty);
                const pendWt = Math.max(0, ordWt - recWt);
                const fulfillRate =
                  ordWt > 0
                    ? Math.round((recWt / ordWt) * 100)
                    : ordQty > 0
                      ? Math.round((recQty / ordQty) * 100)
                      : 0;
                return {
                  name: v.name,
                  poCount: v.pos.length,
                  grnCount: v.grns.length,
                  ordQty,
                  ordWt,
                  ordAmt,
                  recQty,
                  recWt,
                  pendQty,
                  pendWt,
                  openPOs,
                  fulfillRate,
                };
              })
              .sort((a, b) => b.poCount - a.poCount);

            const totalPOs = filteredPOs.length;
            const totalGRNs = filteredInward.length;
            const pendingPOs = filteredPOs.filter(
              (p) =>
                p.status !== "Received" &&
                p.status !== "Closed" &&
                p.status !== "Completed",
            ).length;
            const uniqueVendors = Object.keys(vendorMap).length;
            const totalOrdWt = vRows.reduce((s, r) => s + r.ordWt, 0);
            const totalRecWt = vRows.reduce((s, r) => s + r.recWt, 0);
            const totalOrdQty = vRows.reduce((s, r) => s + r.ordQty, 0);
            const totalRecQty = vRows.reduce((s, r) => s + r.recQty, 0);
            const overallFulfill =
              totalOrdWt > 0
                ? Math.round((totalRecWt / totalOrdWt) * 100)
                : totalOrdQty > 0
                  ? Math.round((totalRecQty / totalOrdQty) * 100)
                  : 0;

            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 20,
                    alignItems: "flex-end",
                    background: "transparent",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE FROM
                    </div>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => setDateFrom(v)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        marginBottom: 6,
                      }}
                    >
                      DATE TO
                    </div>
                    <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} />
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Unique Vendors",
                      val: uniqueVendors,
                      color: C.blue,
                    },
                    {
                      label: "Total POs",
                      val: totalPOs,
                      color: C.blue,
                    },
                    {
                      label: "Total GRNs",
                      val: totalGRNs,
                      color: C.green,
                    },
                    {
                      label: "Open POs",
                      val: pendingPOs,
                      color: C.red,
                    },
                    {
                      label: "Total Ordered (kg)",
                      val: Math.round(totalOrdWt).toLocaleString("en-IN"),
                      color: C.blue,
                    },
                    {
                      label: "Total Received (kg)",
                      val: Math.round(totalRecWt).toLocaleString("en-IN"),
                      color: C.green,
                    },
                    {
                      label: "Pending (kg)",
                      val: Math.round(
                        Math.max(0, totalOrdWt - totalRecWt),
                      ).toLocaleString("en-IN"),
                      color: C.red,
                    },
                    {
                      label: "Overall Fulfillment",
                      val: `${overallFulfill}%`,
                      color:
                        overallFulfill >= 95
                          ? C.green
                          : overallFulfill > 0
                            ? C.yellow
                            : C.red,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${s.color}44`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 900,
                          color: s.color,
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {vRows.length === 0 ? (
                  <div
                    style={{ textAlign: "center", padding: 60, color: "#555" }}
                  >
                    No Purchase Orders found. Add POs to see vendor performance.
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      border: "1px solid #2a2a2e",
                    }}
                  >
                    <table style={TABLE}>
                      <colgroup>
                        <col style={{ minWidth: 180, width: "20%" }} />
                        <col style={{ minWidth: 60, width: "6%" }} />
                        <col style={{ minWidth: 60, width: "6%" }} />
                        <col style={{ minWidth: 160, width: "17%" }} />
                        <col style={{ minWidth: 170, width: "18%" }} />
                        <col style={{ minWidth: 150, width: "15%" }} />
                        <col style={{ minWidth: 80, width: "8%" }} />
                        <col style={{ minWidth: 110, width: "10%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {[
                            "Vendor",
                            "POs",
                            "GRNs",
                            "Ordered",
                            "Received",
                            "Pending",
                            "Open POs",
                            "Fulfillment",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vRows.map((r, i) => (
                          <tr
                            key={r.name}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td style={{ ...TD, fontWeight: 700, whiteSpace: "normal" }}>{r.name}</td>
                            <td
                              style={{ ...TD, color: C.blue, fontWeight: 700 }}
                            >
                              {r.poCount}
                            </td>
                            <td
                              style={{ ...TD, color: C.green, fontWeight: 700 }}
                            >
                              {r.grnCount}
                            </td>
                            <td style={{ ...TD, whiteSpace: "normal" }}>
                              <div style={{ fontWeight: 600 }}>
                                {Math.round(r.ordWt).toLocaleString("en-IN")} kg
                              </div>
                              {r.ordQty > 0 && (
                                <div style={{ fontSize: 9, color: "#666" }}>
                                  {Math.round(r.ordQty).toLocaleString("en-IN")} sheets
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                ...TD,
                                color: C.green,
                                whiteSpace: "normal",
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>
                                {Math.round(r.recWt).toLocaleString("en-IN")} kg
                              </div>
                              {r.recQty > 0 && (
                                <div style={{ fontSize: 9, color: "#888" }}>
                                  {Math.round(r.recQty).toLocaleString("en-IN")} sheets
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                ...TD,
                                color: r.pendWt > 0 ? C.red : C.green,
                                whiteSpace: "normal",
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>
                                {Math.round(r.pendWt).toLocaleString("en-IN")} kg
                              </div>
                              {r.pendQty > 0 && (
                                <div style={{ fontSize: 9, color: "#666" }}>
                                  {Math.round(r.pendQty).toLocaleString("en-IN")} sheets
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                ...TD,
                                color: r.openPOs > 0 ? C.yellow : "#555",
                                fontWeight: 500,
                              }}
                            >
                              {r.openPOs}
                            </td>
                            <td style={TD}>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color:
                                    r.fulfillRate >= 95
                                      ? C.green
                                      : r.fulfillRate > 0
                                        ? C.yellow
                                        : C.red,
                                  marginBottom: 3,
                                }}
                              >
                                {r.fulfillRate}%
                              </div>
                              <div
                                style={{
                                  width: "100%",
                                  height: 3,
                                  background: "#1e1e22",
                                  borderRadius: 2,
                                }}
                              >
                                <div
                                  style={{
                                    width: Math.min(r.fulfillRate, 100) + "%",
                                    height: "100%",
                                    background:
                                      r.fulfillRate >= 95
                                        ? C.green
                                        : r.fulfillRate > 0
                                          ? C.yellow
                                          : C.red,
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {}
        {reportTab === "oee" &&
          (() => {
            const BENCHMARK = 85;

            const pct = (n) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
            const oeeColor = (v) =>
              v == null
                ? "#555"
                : v >= 0.85
                  ? C.green
                  : v >= 0.65
                    ? C.yellow
                    : C.red;
            const oeeLabel = (v) =>
              v == null
                ? "—"
                : v >= 0.85
                  ? "World-class"
                  : v >= 0.65
                    ? "Average"
                    : "Poor";

            const isoWeek = (dateStr) => {
              if (!dateStr) return "unknown";
              const d = new Date(dateStr);
              const jan1 = new Date(d.getFullYear(), 0, 1);
              const wk = Math.ceil(
                ((d - jan1) / 86400000 + jan1.getDay() + 1) / 7,
              );
              return `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`;
            };
            const monthKey = (dateStr) =>
              dateStr ? dateStr.slice(0, 7) : "unknown";

            const oeeEntries = allEntries.filter((e) => {
              if (dateFrom && e.date < dateFrom) return false;
              if (dateTo && e.date > dateTo) return false;
              return true;
            });

            const fleetCombos = new Set(
              oeeEntries.map((e) => `${e.date}|${e.shift || "_"}`),
            );

            const machineData = activeMachines.map((m) => {
              const mid = String(m._id);
              const ents = oeeEntries.filter(
                (e) => String(e.machineId) === mid || String(e.machine) === mid,
              );
              const good = ents.reduce((s, e) => s + +(e.qtyCompleted || 0), 0);
              const rejected = ents.reduce(
                (s, e) => s + +(e.qtyRejected || 0),
                0,
              );
              const total = good + rejected;
              const Q = total > 0 ? good / total : null;

              const machineCombos = new Set(
                ents.map((e) => `${e.date}|${e.shift || "_"}`),
              );
              const A =
                fleetCombos.size > 0
                  ? machineCombos.size / fleetCombos.size
                  : null;

              const tgt = Number(pvtTargets[mid]?.targetPerShift) || 0;
              const P =
                tgt > 0 && machineCombos.size > 0
                  ? Math.min(1, good / (machineCombos.size * tgt))
                  : null;

              const oee = A != null && P != null && Q != null ? A * P * Q : Q;

              const byShift = {};
              ents.forEach((e) => {
                const sh = e.shift || "Unknown";
                if (!byShift[sh])
                  byShift[sh] = { good: 0, rejected: 0, combos: new Set() };
                byShift[sh].good += +(e.qtyCompleted || 0);
                byShift[sh].rejected += +(e.qtyRejected || 0);
                byShift[sh].combos.add(`${e.date}|${sh}`);
              });

              return {
                m,
                mid,
                good,
                rejected,
                total,
                Q,
                A,
                P,
                oee,
                activeShifts: machineCombos.size,
                byShift,
                ents,
              };
            });

            const fleetGood = machineData.reduce((s, r) => s + r.good, 0);
            const fleetRej = machineData.reduce((s, r) => s + r.rejected, 0);
            const fleetTotal = fleetGood + fleetRej;
            const fleetQ = fleetTotal > 0 ? fleetGood / fleetTotal : null;

            const machinesWithA = machineData.filter((r) => r.A != null);
            const fleetA = machinesWithA.length
              ? machinesWithA.reduce((s, r) => s + r.A, 0) /
                machinesWithA.length
              : null;

            const machinesWithP = machineData.filter((r) => r.P != null);
            const fleetP = machinesWithP.length
              ? machinesWithP.reduce((s, r) => s + r.P, 0) /
                machinesWithP.length
              : null;

            const fleetOEE =
              fleetA != null && fleetP != null && fleetQ != null
                ? fleetA * fleetP * fleetQ
                : fleetQ;

            const trendEntries =
              oeeSelectedMachine === "all"
                ? oeeEntries
                : oeeEntries.filter((e) => {
                    const mid = oeeSelectedMachine;
                    return (
                      String(e.machineId) === mid || String(e.machine) === mid
                    );
                  });

            const trendBuckets = {};
            trendEntries.forEach((e) => {
              const k =
                oeeGranularity === "weekly"
                  ? isoWeek(e.date)
                  : monthKey(e.date);
              if (!trendBuckets[k])
                trendBuckets[k] = { good: 0, rejected: 0, combos: new Set() };
              trendBuckets[k].good += +(e.qtyCompleted || 0);
              trendBuckets[k].rejected += +(e.qtyRejected || 0);
              trendBuckets[k].combos.add(`${e.date}|${e.shift || "_"}`);
            });

            const trendRows = Object.entries(trendBuckets)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-16)
              .map(([label, b]) => {
                const tot = b.good + b.rejected;
                const q = tot > 0 ? b.good / tot : 0;

                return { label, q: q * 100 };
              });

            const TrendChart = () => {
              if (trendRows.length === 0) return null;
              const chartH = 180;
              const padB = 28;
              const padTop = 20;
              const inner = chartH - padB - padTop;
              const barW = `${(100 / trendRows.length).toFixed(2)}%`;
              const benchmarkY = padTop + inner * (1 - BENCHMARK / 100);

              return (
                <svg
                  width="100%"
                  height={chartH}
                  style={{ display: "block", overflow: "visible" }}
                >
                  {}
                  {[0, 25, 50, 65, 85, 100].map((v) => {
                    const y = padTop + inner * (1 - v / 100);
                    return (
                      <g key={v}>
                        <line
                          x1="0"
                          y1={y}
                          x2="100%"
                          y2={y}
                          stroke={v === 85 ? "#22c55e" : "#2a2a2e"}
                          strokeWidth={v === 85 ? 1.5 : 1}
                          strokeDasharray={v === 85 ? "5 4" : "none"}
                          opacity={v === 85 ? 0.7 : 0.4}
                        />
                        <text
                          x={2}
                          y={y - 2}
                          fontSize={8}
                          fill={v === 85 ? "#22c55e" : "#555"}
                          fontWeight={v === 85 ? 700 : 400}
                        >
                          {v === 85 ? "85%" : `${v}%`}
                        </text>
                      </g>
                    );
                  })}

                  {}
                  {trendRows.map((row, i) => {
                    const barH = (row.q / 100) * inner;
                    const x = `${(i / trendRows.length) * 100}%`;
                    const y = padTop + inner - barH;
                    const col =
                      row.q >= 85
                        ? "#22c55e"
                        : row.q >= 65
                          ? "#f59e0b"
                          : "#ef4444";
                    const wPct = `${(100 / trendRows.length - 0.8).toFixed(2)}%`;
                    return (
                      <g key={i}>
                        <rect
                          x={x}
                          y={y}
                          width={wPct}
                          height={Math.max(barH, 1)}
                          fill={col}
                          opacity={0.82}
                          rx={2}
                        />
                        {barH > 14 && (
                          <text
                            x={`${(i / trendRows.length) * 100 + 100 / trendRows.length / 2}%`}
                            y={y + Math.min(barH, 14)}
                            textAnchor="middle"
                            fontSize={8}
                            fill="#fff"
                            fontWeight={700}
                          >
                            {row.q.toFixed(0)}
                          </text>
                        )}
                        <text
                          x={`${(i / trendRows.length) * 100 + 100 / trendRows.length / 2}%`}
                          y={chartH - 6}
                          textAnchor="middle"
                          fontSize={7}
                          fill="#555"
                        >
                          {row.label.replace(/^\d{4}-/, "")}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            };

            const rootCause = (() => {
              const factors = [
                {
                  key: "A",
                  label: "Availability",
                  val: fleetA,
                  fix: "Machine downtime or unplanned stops",
                },
                {
                  key: "P",
                  label: "Performance",
                  val: fleetP,
                  fix: "Speed loss or minor stoppages",
                },
                {
                  key: "Q",
                  label: "Quality",
                  val: fleetQ,
                  fix: "Defects / rework reducing yield",
                },
              ].filter((f) => f.val != null);
              if (factors.length === 0) return null;
              return factors.reduce((a, b) => (a.val < b.val ? a : b));
            })();

            return (
              <div>
                {}
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    background: "transparent",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #2a2a2e",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        fontWeight: 500,
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      Date From
                    </div>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => setDateFrom(v)}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        fontWeight: 500,
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      Date To
                    </div>
                    <DatePicker value={dateTo} onChange={(v) => setDateTo(v)} />
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {["weekly", "monthly"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setOeeGranularity(g)}
                        style={{
                          padding: "7px 16px",
                          borderRadius: 6,
                          border: `1px solid ${oeeGranularity === g ? "#ff7800" : "#3a3a3e"}`,
                          background:
                            oeeGranularity === g ? "#ff780022" : "transparent",
                          color: oeeGranularity === g ? "#ff7800" : "#888",
                          fontWeight: 500,
                          fontSize: 11,
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Fleet OEE",
                      val: fleetOEE,
                      note: fleetP == null ? "Quality proxy" : "A×P×Q",
                    },
                    {
                      label: "Availability",
                      val: fleetA,
                      note: "Active shifts / fleet planned",
                    },
                    {
                      label: "Performance",
                      val: fleetP,
                      note:
                        fleetP == null
                          ? "Set shift target ↓"
                          : "Output vs target",
                    },
                    {
                      label: "Quality Rate",
                      val: fleetQ,
                      note: "Good / (Good+Rejected)",
                    },
                    {
                      label: "Gap to 85%",
                      val:
                        fleetOEE != null ? Math.max(0, 0.85 - fleetOEE) : null,
                      note:
                        fleetOEE != null && fleetOEE >= 0.85
                          ? "World-class"
                          : "vs benchmark",
                      isGap: true,
                    },
                  ].map(({ label, val, note, isGap }) => {
                    const col = isGap
                      ? val === 0
                        ? C.green
                        : val != null
                          ? C.red
                          : "#555"
                      : oeeColor(val);
                    return (
                      <div
                        key={label}
                        style={{
                          background: "transparent",
                          border: `1px solid ${col}44`,
                          borderRadius: 8,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 30,
                            fontWeight: 900,
                            color: col,
                          }}
                        >
                          {val == null
                            ? "—"
                            : isGap
                              ? val === 0
                                ? "0%"
                                : pct(val)
                              : pct(val)}
                        </div>
                        <div
                          style={{ fontSize: 10, color: "#555", marginTop: 4 }}
                        >
                          {note}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {}
                {rootCause && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: "12px 18px",
                      borderRadius: 8,
                      background: `${oeeColor(rootCause.val)}11`,
                      border: `1px solid ${oeeColor(rootCause.val)}44`,
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <i
                      className="fa-solid fa-triangle-exclamation"
                      style={{ fontSize: 22, color: "#f59e0b" }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: oeeColor(rootCause.val),
                          fontSize: 13,
                        }}
                      >
                        Lowest factor: {rootCause.label} ({pct(rootCause.val)})
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#888", marginTop: 2 }}
                      >
                        Root cause:{" "}
                        <b style={{ color: "#bbb" }}>{rootCause.fix}</b>. This
                        is dragging OEE below world-class levels.
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        textAlign: "right",
                        fontSize: 11,
                        color: "#555",
                      }}
                    >
                      World-class = 85% OEE
                      <br />
                      (ISO 22400 / discrete mfg benchmark)
                    </div>
                  </div>
                )}

                {}
                <div
                  style={{
                    background: "transparent",
                    border: "1px solid #2a2a2e",
                    borderRadius: 8,
                    padding: "16px 20px",
                    marginBottom: 20,
                  }}
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
                      style={{ fontSize: 12, fontWeight: 500, color: "#bbb" }}
                    >
                      Quality Rate Trend —{" "}
                      {oeeGranularity === "weekly" ? "Weekly" : "Monthly"}{" "}
                      <span style={{ fontSize: 10, color: "#555" }}>
                        (basis: Good / Total produced)
                      </span>
                    </div>
                    <select
                      value={oeeSelectedMachine}
                      onChange={(e) => setOeeSelectedMachine(e.target.value)}
                      style={{
                        padding: "5px 10px",
                        background: "#0c0c0e",
                        border: "1px solid #3a3a3e",
                        color: "#e0e0e0",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <option value="all">All Machines</option>
                      {activeMachines.map((m) => (
                        <option key={m._id} value={String(m._id)}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {trendRows.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "#555",
                      }}
                    >
                      No production data in selected range.
                    </div>
                  ) : (
                    <TrendChart />
                  )}
                </div>

                {}
                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "transparent",
                      borderBottom: "1px solid #2a2a2e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{ fontWeight: 500, color: "#bbb", fontSize: 12 }}
                    >
                      Per-Machine OEE Breakdown
                    </span>
                    <span style={{ fontSize: 10, color: "#555" }}>
                      A = Availability · P = Performance (needs shift target) ·
                      Q = Quality · OEE = A×P×Q
                    </span>
                  </div>
                  <table style={{ ...TABLE, tableLayout: "auto" }}>
                    <thead>
                      <tr>
                        {[
                          "Machine",
                          "Type",
                          "Active Shifts",
                          "Good / Total",
                          "Availability (A)",
                          "Performance (P)",
                          "Quality (Q)",
                          "OEE",
                          "Status",
                          "Shift Target",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {machineData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              ...TD,
                              textAlign: "center",
                              color: "#555",
                              padding: 40,
                            }}
                          >
                            No production entries found. Add production records
                            to see OEE.
                          </td>
                        </tr>
                      ) : (
                        machineData.map((r, i) => {
                          const col = oeeColor(r.oee);
                          const mid = r.mid;
                          const isEditing = oeeTargetEdit === mid;
                          return (
                            <tr
                              key={mid}
                              style={{
                                background: i % 2 === 0 ? "#0e0e12" : "#121216",
                              }}
                            >
                              <td style={{ ...TD, fontWeight: 700 }}>
                                {r.m.name}
                              </td>
                              <td style={{ ...TD, color: "#888" }}>
                                {r.m.type || "—"}
                              </td>
                              <td style={{ ...TD, textAlign: "right" }}>
                                {r.activeShifts}
                              </td>
                              <td style={{ ...TD, textAlign: "right" }}>
                                <span style={{ color: C.green }}>
                                  {r.good.toLocaleString("en-IN")}
                                </span>
                                {" / "}
                                <span style={{ color: "#888" }}>
                                  {r.total.toLocaleString("en-IN")}
                                </span>
                              </td>
                              {}
                              <td style={{ ...TD, textAlign: "right" }}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: oeeColor(r.A),
                                  }}
                                >
                                  {pct(r.A)}
                                </div>
                                <div
                                  style={{
                                    height: 3,
                                    background: "#2a2a2e",
                                    borderRadius: 2,
                                    marginTop: 3,
                                    width: 60,
                                  }}
                                >
                                  <div
                                    style={{
                                      height: 3,
                                      borderRadius: 2,
                                      background: oeeColor(r.A),
                                      width: `${((r.A ?? 0) * 100).toFixed(0)}%`,
                                    }}
                                  />
                                </div>
                              </td>
                              {}
                              <td style={{ ...TD, textAlign: "right" }}>
                                {r.P != null ? (
                                  <>
                                    <div
                                      style={{
                                        fontWeight: 500,
                                        color: oeeColor(r.P),
                                      }}
                                    >
                                      {pct(r.P)}
                                    </div>
                                    <div
                                      style={{
                                        height: 3,
                                        background: "#2a2a2e",
                                        borderRadius: 2,
                                        marginTop: 3,
                                        width: 60,
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: 3,
                                          borderRadius: 2,
                                          background: oeeColor(r.P),
                                          width: `${((r.P ?? 0) * 100).toFixed(0)}%`,
                                        }}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span style={{ color: "#555", fontSize: 10 }}>
                                    Set target →
                                  </span>
                                )}
                              </td>
                              {}
                              <td style={{ ...TD, textAlign: "right" }}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: oeeColor(r.Q),
                                  }}
                                >
                                  {pct(r.Q)}
                                </div>
                                <div
                                  style={{
                                    height: 3,
                                    background: "#2a2a2e",
                                    borderRadius: 2,
                                    marginTop: 3,
                                    width: 60,
                                  }}
                                >
                                  <div
                                    style={{
                                      height: 3,
                                      borderRadius: 2,
                                      background: oeeColor(r.Q),
                                      width: `${((r.Q ?? 0) * 100).toFixed(0)}%`,
                                    }}
                                  />
                                </div>
                              </td>
                              {}
                              <td style={{ ...TD, textAlign: "right" }}>
                                <span
                                  style={{
                                    fontWeight: 900,
                                    fontSize: 16,
                                    color: col,
                                  }}
                                >
                                  {pct(r.oee)}
                                </span>
                                {r.P == null && (
                                  <div style={{ fontSize: 9, color: "#555" }}>
                                    Q only
                                  </div>
                                )}
                              </td>
                              {}
                              <td style={{ ...TD, textAlign: "center" }}>
                                <span
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    background: `${col}22`,
                                    color: col,
                                    border: `1px solid ${col}44`,
                                  }}
                                >
                                  {oeeLabel(r.oee)}
                                </span>
                              </td>
                              {}
                              <td style={{ ...TD, textAlign: "right" }}>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    defaultValue={
                                      pvtTargets[mid]?.targetPerShift || ""
                                    }
                                    onBlur={(e) => {
                                      const v = Number(e.target.value);
                                      setPvtTargets((prev) => ({
                                        ...prev,
                                        [mid]: {
                                          ...(prev[mid] || {}),
                                          targetPerShift: v || 0,
                                        },
                                      }));
                                      setOeeTargetEdit(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.target.blur();
                                      if (e.key === "Escape")
                                        setOeeTargetEdit(null);
                                    }}
                                    style={{
                                      width: 70,
                                      padding: "4px 6px",
                                      background: "#0c0c0e",
                                      border: "1px solid #ff7800",
                                      color: "#e0e0e0",
                                      borderRadius: 4,
                                      fontSize: 12,
                                    }}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setOeeTargetEdit(mid)}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid #3a3a3e",
                                      color: pvtTargets[mid]?.targetPerShift
                                        ? "#e0e0e0"
                                        : "#555",
                                      borderRadius: 4,
                                      padding: "3px 10px",
                                      fontSize: 11,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {pvtTargets[mid]?.targetPerShift
                                      ? `${pvtTargets[mid].targetPerShift} pcs/shift`
                                      : "Set target"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {}
                {machineData.some((r) => Object.keys(r.byShift).length > 0) && (
                  <div
                    style={{
                      borderRadius: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      border: "1px solid #2a2a2e",
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "transparent",
                        borderBottom: "1px solid #2a2a2e",
                        fontWeight: 500,
                        color: "#bbb",
                        fontSize: 12,
                      }}
                    >
                      Shift-wise Quality Breakdown
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 400,
                          color: "#555",
                          marginLeft: 10,
                        }}
                      >
                        Reveals operator / supervision patterns across shifts
                      </span>
                    </div>
                    <table style={{ ...TABLE, tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          {[
                            "Machine",
                            "Shift",
                            "Good Output",
                            "Rejected",
                            "Quality (Q)",
                            "Q vs Fleet",
                            "Observation",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {machineData.flatMap((r) =>
                          Object.entries(r.byShift)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([sh, sd], si) => {
                              const tot = sd.good + sd.rejected;
                              const q = tot > 0 ? sd.good / tot : null;
                              const delta =
                                q != null && r.Q != null ? q - r.Q : null;
                              const obs =
                                q == null
                                  ? "—"
                                  : q >= 0.97
                                    ? "Excellent"
                                    : q >= 0.92
                                      ? "Good"
                                      : q >= 0.85
                                        ? "Acceptable"
                                        : "Needs attention";
                              const col = oeeColor(q);
                              return (
                                <tr
                                  key={`${r.mid}-${sh}`}
                                  style={{
                                    background:
                                      si % 2 === 0 ? "#0e0e12" : "#121216",
                                  }}
                                >
                                  <td style={{ ...TD, fontWeight: 700 }}>
                                    {r.m.name}
                                  </td>
                                  <td style={TD}>
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        background:
                                          sh === "Morning"
                                            ? "#17254422"
                                            : sh === "Night"
                                              ? "#1e1b4b22"
                                              : "#1a110022",
                                        color:
                                          sh === "Morning"
                                            ? "#60a5fa"
                                            : sh === "Night"
                                              ? "#818cf8"
                                              : "#fb923c",
                                        fontSize: 11,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {sh === "Morning"
                                        ? "AM"
                                        : sh === "Night"
                                          ? "PM"
                                          : "EV"}{" "}
                                      {sh}
                                    </span>
                                  </td>
                                  <td
                                    style={{
                                      ...TD,
                                      textAlign: "right",
                                      color: C.green,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {sd.good.toLocaleString("en-IN")}
                                  </td>
                                  <td
                                    style={{
                                      ...TD,
                                      textAlign: "right",
                                      color: sd.rejected > 0 ? C.red : "#555",
                                    }}
                                  >
                                    {sd.rejected > 0
                                      ? sd.rejected.toLocaleString("en-IN")
                                      : "—"}
                                  </td>
                                  <td
                                    style={{
                                      ...TD,
                                      textAlign: "right",
                                      fontWeight: 500,
                                      color: col,
                                    }}
                                  >
                                    {pct(q)}
                                  </td>
                                  <td
                                    style={{
                                      ...TD,
                                      textAlign: "right",
                                      color:
                                        delta == null
                                          ? "#555"
                                          : delta >= 0
                                            ? C.green
                                            : C.red,
                                      fontSize: 11,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {delta == null
                                      ? "—"
                                      : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`}
                                  </td>
                                  <td
                                    style={{
                                      ...TD,
                                      fontSize: 11,
                                      color:
                                        obs === "Needs attention"
                                          ? C.red
                                          : obs === "Excellent"
                                            ? C.green
                                            : "#888",
                                    }}
                                  >
                                    {obs}
                                  </td>
                                </tr>
                              );
                            }),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {}
                <div
                  style={{
                    padding: "10px 16px",
                    background: "#0d0d0d",
                    borderRadius: 8,
                    border: "1px solid #2a2a2e22",
                    fontSize: 10,
                    color: "#444",
                    lineHeight: 1.7,
                  }}
                >
                  <b style={{ color: "#666" }}>
                    OEE = Availability × Performance × Quality
                  </b>
                  {" · "}
                  <b>A</b> = machine active shifts / total fleet shifts in
                  period. <b>P</b> = units produced / (active shifts × shift
                  target) — set per machine in table above. <b>Q</b> = good
                  units / (good + rejected) from production records. When P is
                  not configured, Quality is shown as proxy. World-class
                  benchmark: <b style={{ color: "#22c55e" }}>85% OEE</b> (ISO
                  22400, discrete manufacturing).
                </div>
              </div>
            );
          })()}

        {}
        {reportTab === "alerts" &&
          (() => {
            const SEV_CFG = {
              critical: {
                color: "#ef4444",
                bg: "#450a0a99",
                label: "Critical",
                dot: "●",
              },
              high: {
                color: "#f97316",
                bg: "#431407aa",
                label: "High",
                dot: "●",
              },
              medium: {
                color: "#f59e0b",
                bg: "#451a0399",
                label: "Medium",
                dot: "●",
              },
              low: {
                color: "#22c55e",
                bg: "#052e1699",
                label: "Low",
                dot: "●",
              },
            };
            const TYPE_LABELS = {
              delivery_risk: "Delivery Risk",
              vendor_lead: "Vendor Lead Time",
              client_churn: "Client Churn",
              consumable_low: "Stock Runout",
              machine_downtime: "Machine Downtime",
            };

            const counts = Object.fromEntries(
              ["critical", "high", "medium", "low"].map((s) => [
                s,
                allAlerts.filter((a) => a.severity === s).length,
              ]),
            );

            const byType = {};
            allAlerts.forEach((a) => {
              if (!byType[a.type]) byType[a.type] = [];
              byType[a.type].push(a);
            });

            return (
              <div>
                {}
                {allAlerts.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 60,
                      background: "transparent",
                      borderRadius: 12,
                      border: "1px solid #2a2a2e",
                    }}
                  >
                    <i
                      className="fa-solid fa-circle-check"
                      style={{
                        fontSize: 40,
                        marginBottom: 12,
                        display: "block",
                        color: "#22c55e",
                      }}
                    />
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 16,
                        color: C.green,
                        marginBottom: 8,
                      }}
                    >
                      All Clear — No Active Alerts
                    </div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      All delivery schedules, vendor lead times, client orders,
                      stock levels, and machine availability look healthy.
                    </div>
                  </div>
                ) : (
                  <>
                    {}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4,1fr)",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      {["critical", "high", "medium", "low"].map((s) => {
                        const cfg = SEV_CFG[s];
                        return (
                          <div
                            key={s}
                            style={{
                              background: "transparent",
                              border: `1px solid ${cfg.color}44`,
                              borderRadius: 8,
                              padding: 16,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                fontWeight: 500,
                                textTransform: "uppercase",
                                marginBottom: 4,
                              }}
                            >
                              {cfg.label}
                            </div>
                            <div
                              style={{
                                fontSize: 32,
                                fontWeight: 900,
                                color: cfg.color,
                              }}
                            >
                              {counts[s]}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#555",
                                marginTop: 2,
                              }}
                            >
                              alert{counts[s] !== 1 ? "s" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {}
                    {Object.entries(byType).map(([type, typeAlerts]) => (
                      <div key={type} style={{ marginBottom: 20 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "#888",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            marginBottom: 10,
                          }}
                        >
                          {TYPE_LABELS[type] || type} ({typeAlerts.length})
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {typeAlerts.map((a) => {
                            const cfg = SEV_CFG[a.severity] || SEV_CFG.medium;
                            return (
                              <div
                                key={a.id}
                                style={{
                                  background: "transparent",
                                  border: `1px solid ${cfg.color}44`,
                                  borderRadius: 10,
                                  padding: "14px 18px",
                                  display: "grid",
                                  gridTemplateColumns: "auto 1fr auto",
                                  gap: 14,
                                  alignItems: "start",
                                }}
                              >
                                {}
                                <div style={{ textAlign: "center" }}>
                                  <i
                                    className={a.icon}
                                    style={{ fontSize: 22 }}
                                  />
                                  <div
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 500,
                                      color: cfg.color,
                                      marginTop: 4,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {cfg.dot} {cfg.label}
                                  </div>
                                </div>

                                {}
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 500,
                                      fontSize: 14,
                                      color: "#e0e0e0",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {a.title}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#888",
                                      lineHeight: 1.5,
                                      marginBottom: 6,
                                    }}
                                  >
                                    {a.detail}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#555" }}>
                                    {a.meta}
                                  </div>
                                </div>

                                {}
                                <div
                                  style={{
                                    minWidth: 200,
                                    background: `${cfg.color}0d`,
                                    border: `1px solid ${cfg.color}33`,
                                    borderRadius: 7,
                                    padding: "10px 14px",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 500,
                                      color: cfg.color,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 5,
                                    }}
                                  >
                                    Recommended Action
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "#bbb",
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {a.action}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {}
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "#0d0d0d",
                        borderRadius: 8,
                        border: "1px solid #2a2a2e22",
                        fontSize: 10,
                        color: "#444",
                        lineHeight: 1.8,
                      }}
                    >
                      <b style={{ color: "#666" }}>Alert logic:</b>{" "}
                      <b>Delivery Risk</b> — production velocity (last 7d) ×
                      remaining units &gt; days until SO delivery date.{" "}
                      <b>Vendor Lead Time</b> — avg lead time of last 3 POs vs
                      prior 3 POs; flags &gt;30% increase. <b>Client Churn</b> —
                      this month's SO count vs previous month per client; flags
                      ≥40% drop. <b>Consumable Runout</b> — current qty ÷
                      estimated daily rate (reorderLevel ÷ 14); flags &lt;14
                      days cover. <b>Machine Downtime</b> — inactive calendar
                      days this month vs last month; flags 2× increase.
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        {/* ─── Bottleneck Analyzer ──────────────────────────────────────────── */}
        {reportTab === "bottleneck" &&
          (() => {
            const todayMs = Date.now();
            const FEEDER_STAGES = [
              "Printing",
              "Varnish",
              "Lamination",
              "Die Cutting",
            ];
            const SINK_STAGES = ["Formation", "Manual Formation"];
            const ALL_BN_STAGES = [...FEEDER_STAGES, ...SINK_STAGES];

            const jobWaitDays = (jo) => {
              const hist = jo.stageHistory || [];
              if (hist.length === 0) {
                const d = new Date(jo.createdAt || jo.jobcardDate || jo.joDate);
                return isNaN(d) ? 0 : Math.max(0, (todayMs - d) / 86400000);
              }
              const latest = hist.reduce((best, h) => {
                const t = new Date(h.enteredAt || h.date);
                return t > best ? t : best;
              }, new Date(0));
              return Math.max(0, (todayMs - latest) / 86400000);
            };

            const stageStats = ALL_BN_STAGES.map((stage) => {
              const jobs = processPendingMap[stage] || [];
              const waits = jobs.map(jobWaitDays);
              const count = jobs.length;
              const avgWait = waits.length
                ? waits.reduce((s, v) => s + v, 0) / waits.length
                : 0;
              const maxWait = waits.length ? Math.max(...waits) : 0;
              const pressure = count * avgWait;
              const isFeeder = FEEDER_STAGES.includes(stage);
              return {
                stage,
                count,
                avgWait,
                maxWait,
                pressure,
                jobs,
                isFeeder,
              };
            });

            const feederStats = stageStats.filter((s) => s.isFeeder);
            const sinkStats = stageStats.filter((s) => !s.isFeeder);
            const feederDepth = feederStats.reduce((s, r) => s + r.count, 0);
            const sinkDepth = sinkStats.reduce((s, r) => s + r.count, 0);
            const dieCuttingCount = (processPendingMap["Die Cutting"] || [])
              .length;
            const earlyPipeDepth = feederDepth - dieCuttingCount;

            const maxCount = Math.max(...stageStats.map((s) => s.count), 1);
            const maxPressure = Math.max(
              ...stageStats.map((s) => s.pressure),
              0.001,
            );
            const bottleneck = stageStats.reduce(
              (b, s) => (s.pressure > b.pressure ? s : b),
              stageStats[0],
            );
            const totalWIP = feederDepth + sinkDepth;

            const noWIP = totalWIP === 0;
            const starvationRisk = noWIP
              ? "none"
              : sinkDepth === 0 && dieCuttingCount === 0
                ? "high"
                : sinkDepth <= 1 && dieCuttingCount <= 1
                  ? "medium"
                  : "low";

            const starvationColor =
              starvationRisk === "high"
                ? C.red
                : starvationRisk === "medium"
                  ? C.yellow
                  : starvationRisk === "none"
                    ? "#555"
                    : C.green;
            const starvationLabel =
              starvationRisk === "high"
                ? "High Risk"
                : starvationRisk === "medium"
                  ? "Moderate"
                  : starvationRisk === "none"
                    ? "No WIP"
                    : "Healthy";

            const starvationText = (() => {
              if (starvationRisk === "high") {
                if (earlyPipeDepth > 0)
                  return `Formation & Manual Formation queues are empty. Die Cutting is also clear — ${earlyPipeDepth} job${earlyPipeDepth > 1 ? "s are" : " is"} still in early stages (Printing / Varnish / Lamination) and haven't reached Die Cutting yet. Formation machines may go idle shortly.`;
                return "Formation & Manual Formation queues are empty and no jobs are in the feeder pipeline. Formation machines are currently idle.";
              }
              if (starvationRisk === "medium")
                return `Formation queues are thin (${sinkDepth} job${sinkDepth !== 1 ? "s" : ""}) and Die Cutting has only ${dieCuttingCount} job${dieCuttingCount !== 1 ? "s" : ""} to feed them. Monitor closely to avoid idle time on Formation machines.`;
              return "";
            })();

            const rec = (() => {
              if (noWIP || bottleneck.count === 0)
                return "No active WIP queue. Production is flowing smoothly.";
              const { stage, count, avgWait, isFeeder } = bottleneck;
              const tips = {
                Printing:
                  "Consider overtime or redistributing jobs across available printing machines.",
                Varnish:
                  "Batch smaller jobs together to cut setup time. Check varnish machine drum speed.",
                Lamination:
                  "Lamination queues build fast — review laminator speed or add a parallel pass.",
                "Die Cutting":
                  "Inspect dies for wear; worn dies slow throughput significantly. Die Cutting directly gates Formation — clearing this queue is highest priority.",
                Formation:
                  "Formation machines are backed up. Consider adding a night shift or a second operator per machine.",
                "Manual Formation":
                  "Manual Formation is operator-bound. Overtime or cross-training provides the fastest relief.",
              };
              const tip =
                tips[stage] ||
                "Review machine capacity and operator allocation for this stage.";
              const cascade = isFeeder
                ? ` As a feeder stage, this congestion will propagate downstream and starve Formation machines if not addressed.`
                : "";
              return `${stage} is your bottleneck — ${count} job${count > 1 ? "s" : ""} queued, avg ${avgWait.toFixed(1)} days waiting.${cascade} ${tip}`;
            })();

            const TankNode = ({ s, height = 90, fontSize = 24 }) => {
              const fillPct = s.count / maxCount;
              const isBN = s.stage === bottleneck.stage && s.count > 0;
              const border = isBN
                ? "#ef4444"
                : fillPct > 0.5
                  ? C.yellow
                  : fillPct > 0
                    ? s.isFeeder
                      ? "#3b82f6"
                      : "#22c55e"
                    : "#2a2a2e";
              const fillBg = isBN
                ? "#ef444422"
                : fillPct > 0.5
                  ? "#f59e0b22"
                  : s.isFeeder
                    ? "#3b82f622"
                    : "#22c55e22";
              return (
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ height: 22 }}>
                    {isBN && (
                      <i
                        className="fa-solid fa-crown"
                        style={{ fontSize: 15, color: "#f59e0b" }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      width: 82,
                      height,
                      border: `2px solid ${border}`,
                      borderRadius: 6,
                      background: "#0c0c0e",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${fillPct * 100}%`,
                        background: fillBg,
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize,
                          fontWeight: 900,
                          color:
                            s.count > 0
                              ? isBN
                                ? "#ef4444"
                                : "#e0e0e0"
                              : "#2a2a2e",
                          lineHeight: 1,
                        }}
                      >
                        {s.count}
                      </div>
                      {s.count > 0 && (
                        <div style={{ fontSize: 9, color: "#888" }}>
                          ~{s.avgWait.toFixed(1)}d
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: isBN ? "#ef4444" : "#666",
                      fontWeight: isBN ? 700 : 400,
                      marginTop: 6,
                      textAlign: "center",
                      lineHeight: 1.3,
                      maxWidth: 86,
                    }}
                  >
                    {s.stage}
                  </div>
                </div>
              );
            };

            const Arrow = ({ color = "#2a2a2e", wide = false }) => (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  marginBottom: 32,
                }}
              >
                <div
                  style={{
                    width: wide ? 20 : 14,
                    height: 2,
                    background: color,
                  }}
                />
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: `${wide ? 6 : 5}px solid transparent`,
                    borderBottom: `${wide ? 6 : 5}px solid transparent`,
                  }}
                />
              </div>
            );

            return (
              <div>
                {/* ── Summary cards ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5,1fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Total WIP Jobs",
                      val: totalWIP,
                      color: C.yellow,
                      isText: false,
                    },
                    {
                      label: "Bottleneck Stage",
                      val: bottleneck.count > 0 ? bottleneck.stage : "None",
                      color: C.red,
                      isText: true,
                    },
                    {
                      label: "Avg Wait at Bottleneck",
                      val:
                        bottleneck.count > 0
                          ? `${bottleneck.avgWait.toFixed(1)}d`
                          : "—",
                      color: "#f97316",
                      isText: true,
                    },
                    {
                      label: "Feeder Pipeline Depth",
                      val: feederDepth,
                      color: "#3b82f6",
                      isText: false,
                    },
                    {
                      label: "Formation Starvation",
                      val: starvationLabel,
                      color: starvationColor,
                      isText: true,
                    },
                  ].map(({ label, val, color, isText }) => (
                    <div
                      key={label}
                      style={{
                        background: "transparent",
                        border: `1px solid ${color}44`,
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#888",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: isText ? 18 : 30,
                          fontWeight: 900,
                          color,
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Recommendation ── */}
                {!noWIP && bottleneck.count > 0 && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: "14px 18px",
                      borderRadius: 8,
                      background: "#1a0a0a",
                      border: "1px solid #ef444466",
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                    }}
                  >
                    <i
                      className="fa-solid fa-lightbulb"
                      style={{ fontSize: 20, flexShrink: 0, color: "#f59e0b" }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: "#ef4444",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 4,
                        }}
                      >
                        Bottleneck Recommendation
                      </div>
                      <div
                        style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}
                      >
                        {rec}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Starvation alert ── */}
                {(starvationRisk === "high" || starvationRisk === "medium") &&
                  starvationText && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: "14px 18px",
                        borderRadius: 8,
                        background:
                          starvationRisk === "high" ? "#1a0505" : "#1a1400",
                        border: `1px solid ${starvationColor}66`,
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <i
                        className="fa-solid fa-triangle-exclamation"
                        style={{
                          fontSize: 20,
                          flexShrink: 0,
                          color: "#f59e0b",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: 500,
                            color: starvationColor,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 4,
                          }}
                        >
                          Formation Starvation{" "}
                          {starvationRisk === "high" ? "Warning" : "Notice"}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#bbb",
                            lineHeight: 1.6,
                          }}
                        >
                          {starvationText}
                        </div>
                      </div>
                    </div>
                  )}

                {/* ── Pipeline flow diagram ── */}
                <div
                  style={{
                    background: "transparent",
                    border: "1px solid #2a2a2e",
                    borderRadius: 8,
                    padding: "20px 20px 16px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#888",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Production Pipeline — Feeder Stages → Formation Sinks
                    </div>
                    <div style={{ display: "flex", gap: 14 }}>
                      <span style={{ fontSize: 10, color: "#3b82f6" }}>
                        ■ Feeder
                      </span>
                      <span style={{ fontSize: 10, color: "#22c55e" }}>
                        ■ Sink
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      overflowX: "auto",
                      paddingBottom: 8,
                    }}
                  >
                    {/* Feeder chain */}
                    {feederStats.map((s, i) => (
                      <React.Fragment key={s.stage}>
                        {i > 0 && <Arrow />}
                        <TankNode s={s} />
                      </React.Fragment>
                    ))}

                    {/* Transition arrow: feeder → sinks */}
                    <Arrow color="#3b82f6" wide />

                    {/* Sink column: Formation + Manual Formation stacked */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "#22c55e88",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          textAlign: "center",
                        }}
                      >
                        Formation Sinks
                      </div>
                      {sinkStats.map((s) => (
                        <TankNode
                          key={s.stage}
                          s={s}
                          height={72}
                          fontSize={20}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: "#444", marginTop: 8 }}>
                    Fill = relative WIP queue depth · * = highest pressure (jobs
                    × avg wait) · Blue arrow = feeder → Formation flow · Varnish
                    & Lamination apply to ~20–25% of jobs
                  </div>
                </div>

                {/* ── Stage detail table ── */}
                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "transparent",
                      borderBottom: "1px solid #2a2a2e",
                      fontWeight: 500,
                      color: "#bbb",
                      fontSize: 12,
                    }}
                  >
                    Stage-wise Queue Detail
                  </div>
                  <table style={{ ...TABLE, tableLayout: "auto" }}>
                    <thead>
                      <tr>
                        {[
                          "Stage",
                          "Role",
                          "Jobs Queued",
                          "Avg Wait (d)",
                          "Max Wait (d)",
                          "Pressure Index",
                          "Status",
                        ].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stageStats.map((s, i) => {
                        const isBN =
                          s.stage === bottleneck.stage && s.count > 0;
                        const col = isBN
                          ? C.red
                          : s.count > 2
                            ? C.yellow
                            : s.count > 0
                              ? C.green
                              : "#555";
                        const label =
                          s.count === 0
                            ? "Clear"
                            : isBN
                              ? "Bottleneck"
                              : s.count > 2
                                ? "Congested"
                                : "Manageable";
                        const roleCol = s.isFeeder ? "#3b82f6" : "#22c55e";
                        const roleLabel = s.isFeeder ? "Feeder" : "Sink";
                        return (
                          <tr
                            key={s.stage}
                            style={{
                              background: i % 2 === 0 ? "#0e0e12" : "#121216",
                            }}
                          >
                            <td style={{ ...TD, fontWeight: 700 }}>
                              {s.stage}
                            </td>
                            <td style={{ ...TD }}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  background: `${roleCol}22`,
                                  color: roleCol,
                                  border: `1px solid ${roleCol}44`,
                                }}
                              >
                                {roleLabel}
                              </span>
                            </td>
                            <td
                              style={{
                                ...TD,
                                textAlign: "right",
                                fontWeight: 500,
                                color: s.count > 0 ? col : "#555",
                              }}
                            >
                              {s.count || "—"}
                            </td>
                            <td
                              style={{
                                ...TD,
                                textAlign: "right",
                                color:
                                  s.avgWait > 3
                                    ? C.red
                                    : s.avgWait > 1
                                      ? C.yellow
                                      : "#888",
                              }}
                            >
                              {s.count > 0 ? s.avgWait.toFixed(1) : "—"}
                            </td>
                            <td
                              style={{
                                ...TD,
                                textAlign: "right",
                                color:
                                  s.maxWait > 5
                                    ? C.red
                                    : s.maxWait > 2
                                      ? C.yellow
                                      : "#888",
                              }}
                            >
                              {s.count > 0 ? s.maxWait.toFixed(1) : "—"}
                            </td>
                            <td style={{ ...TD }}>
                              {s.pressure > 0 ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 60,
                                      height: 4,
                                      background: "#2a2a2e",
                                      borderRadius: 2,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${(s.pressure / maxPressure) * 100}%`,
                                        height: "100%",
                                        background: col,
                                        borderRadius: 2,
                                      }}
                                    />
                                  </div>
                                  <span
                                    style={{
                                      color: col,
                                      fontWeight: 500,
                                      fontSize: 11,
                                    }}
                                  >
                                    {s.pressure.toFixed(1)}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: "#555" }}>—</span>
                              )}
                            </td>
                            <td style={{ ...TD }}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  background: `${col}22`,
                                  color: col,
                                  border: `1px solid ${col}44`,
                                }}
                              >
                                {label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Longest-waiting jobs ── */}
                {(() => {
                  const stuck = stageStats
                    .flatMap((s) =>
                      s.jobs.map((jo) => ({
                        jo,
                        stage: s.stage,
                        isFeeder: s.isFeeder,
                        wait: jobWaitDays(jo),
                      })),
                    )
                    .sort((a, b) => b.wait - a.wait)
                    .slice(0, 8);
                  if (!stuck.length) return null;
                  return (
                    <div
                      style={{
                        borderRadius: 8,
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        border: "1px solid #2a2a2e",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "transparent",
                          borderBottom: "1px solid #2a2a2e",
                          fontWeight: 500,
                          color: "#bbb",
                          fontSize: 12,
                        }}
                      >
                        Longest-Waiting Jobs (top 8)
                      </div>
                      <table style={{ ...TABLE, tableLayout: "auto" }}>
                        <thead>
                          <tr>
                            {[
                              "JO #",
                              "Item",
                              "Client",
                              "Stuck at Stage",
                              "Role",
                              "Days Waiting",
                            ].map((h) => (
                              <th key={h} style={TH}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stuck.map(({ jo, stage, isFeeder, wait }, i) => {
                            const roleCol = isFeeder ? "#3b82f6" : "#22c55e";
                            return (
                              <tr
                                key={jo._id || i}
                                style={{
                                  background:
                                    i % 2 === 0 ? "#0e0e12" : "#121216",
                                }}
                              >
                                <td
                                  style={{
                                    ...TD,
                                    color: C.yellow,
                                    fontWeight: 500,
                                  }}
                                >
                                  {jo.joNo}
                                </td>
                                <td style={TD}>{jo.itemName || "—"}</td>
                                <td style={{ ...TD, color: "#888" }}>
                                  {jo.companyName || "—"}
                                </td>
                                <td style={TD}>
                                  <span
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      background:
                                        (PROCESS_COLORS[stage] || "#555") +
                                        "33",
                                      color: PROCESS_COLORS[stage] || "#aaa",
                                      fontSize: 11,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {stage}
                                  </span>
                                </td>
                                <td style={{ ...TD }}>
                                  <span
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontWeight: 500,
                                      background: `${roleCol}22`,
                                      color: roleCol,
                                      border: `1px solid ${roleCol}44`,
                                    }}
                                  >
                                    {isFeeder ? "Feeder" : "Sink"}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...TD,
                                    textAlign: "right",
                                    fontWeight: 500,
                                    color:
                                      wait > 5
                                        ? C.red
                                        : wait > 2
                                          ? C.yellow
                                          : "#888",
                                  }}
                                >
                                  {wait.toFixed(1)}d
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

        {/* ─── Operator & Machine Scorecards ───────────────────────────────── */}
        {reportTab === "scorecards" &&
          (() => {
            const isoWeekSC = (dateStr) => {
              if (!dateStr) return "unknown";
              const d = new Date(dateStr);
              const jan1 = new Date(d.getFullYear(), 0, 1);
              const wk = Math.ceil(
                ((d - jan1) / 86400000 + jan1.getDay() + 1) / 7,
              );
              return `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`;
            };

            // Default last 30 days if no date filter set
            const cut30 = new Date();
            cut30.setDate(cut30.getDate() - 30);
            const cut30str = cut30.toISOString().slice(0, 10);
            const rangeEntries = allEntries.filter((e) => {
              const lo = dateFrom || cut30str;
              if (e.date < lo) return false;
              if (dateTo && e.date > dateTo) return false;
              return true;
            });

            // ── Operator productivity ─────────────────────────────────────────
            const opMap = {};
            rangeEntries.forEach((e) => {
              const op = e.operator || "Unknown";
              if (!opMap[op])
                opMap[op] = {
                  good: 0,
                  rejected: 0,
                  days: new Set(),
                  shifts: new Set(),
                  weekly: {},
                };
              opMap[op].good += +(e.qtyCompleted || 0);
              opMap[op].rejected += +(e.qtyRejected || 0);
              opMap[op].days.add(e.date);
              opMap[op].shifts.add(`${e.date}|${e.shift || "_"}`);
              const wk = isoWeekSC(e.date);
              opMap[op].weekly[wk] =
                (opMap[op].weekly[wk] || 0) + +(e.qtyCompleted || 0);
            });

            const opRows = Object.entries(opMap)
              .map(([op, d]) => {
                const productivity =
                  d.shifts.size > 0 ? d.good / d.shifts.size : 0;
                const quality =
                  d.good + d.rejected > 0
                    ? d.good / (d.good + d.rejected)
                    : null;
                const weeks = Object.entries(d.weekly).sort(([a], [b]) =>
                  a.localeCompare(b),
                );
                const lastWeeks = weeks.slice(-6).map(([, v]) => v);

                let trend = "—";
                if (lastWeeks.length >= 2) {
                  const last = lastWeeks[lastWeeks.length - 1] || 0;
                  const first = lastWeeks[0] || 0;
                  if (first === 0) {
                    trend = "new";
                  } else {
                    const chg = ((last - first) / first) * 100;
                    trend =
                      chg >= 10
                        ? "improving"
                        : chg <= -10
                          ? "declining"
                          : "plateau";
                  }
                }
                return {
                  op,
                  good: d.good,
                  rejected: d.rejected,
                  activeDays: d.days.size,
                  activeShifts: d.shifts.size,
                  productivity,
                  quality,
                  trend,
                  lastWeeks,
                };
              })
              .sort((a, b) => b.productivity - a.productivity);

            // ── Machine utilization ───────────────────────────────────────────
            const fleetCombosSC = new Set(
              rangeEntries.map((e) => `${e.date}|${e.shift || "_"}`),
            );
            const machineRows = activeMachines
              .map((m) => {
                const mid = String(m._id);
                const ents = rangeEntries.filter(
                  (e) =>
                    String(e.machineId) === mid || String(e.machine) === mid,
                );
                const machCombos = new Set(
                  ents.map((e) => `${e.date}|${e.shift || "_"}`),
                );
                const util =
                  fleetCombosSC.size > 0
                    ? machCombos.size / fleetCombosSC.size
                    : 0;
                const good = ents.reduce(
                  (s, e) => s + +(e.qtyCompleted || 0),
                  0,
                );
                const rej = ents.reduce((s, e) => s + +(e.qtyRejected || 0), 0);
                const quality = good + rej > 0 ? good / (good + rej) : null;

                const opCount = {};
                ents.forEach((e) => {
                  const k = e.operator || "?";
                  opCount[k] = (opCount[k] || 0) + +(e.qtyCompleted || 0);
                });
                const topOp =
                  Object.entries(opCount).sort(
                    ([, a], [, b]) => b - a,
                  )[0]?.[0] || "—";

                const stgCount = {};
                ents.forEach((e) => {
                  const k = e.stage || "?";
                  stgCount[k] = (stgCount[k] || 0) + +(e.qtyCompleted || 0);
                });
                const topStage =
                  Object.entries(stgCount).sort(
                    ([, a], [, b]) => b - a,
                  )[0]?.[0] || "—";

                // Weekly utilization trend (last 6 weeks)
                const wkUtil = {};
                ents.forEach((e) => {
                  const wk = isoWeekSC(e.date);
                  if (!wkUtil[wk]) wkUtil[wk] = new Set();
                  wkUtil[wk].add(`${e.date}|${e.shift || "_"}`);
                });
                // Fleet combos per week for normalization
                const fleetWk = {};
                rangeEntries.forEach((e) => {
                  const wk = isoWeekSC(e.date);
                  if (!fleetWk[wk]) fleetWk[wk] = new Set();
                  fleetWk[wk].add(`${e.date}|${e.shift || "_"}`);
                });
                const utilWkVals = Object.keys(fleetWk)
                  .sort()
                  .slice(-6)
                  .map((wk) =>
                    fleetWk[wk].size > 0
                      ? ((wkUtil[wk]?.size || 0) / fleetWk[wk].size) * 100
                      : 0,
                  );

                return {
                  m,
                  util,
                  good,
                  rej,
                  quality,
                  topOp,
                  topStage,
                  activeShifts: machCombos.size,
                  utilWkVals,
                };
              })
              .sort((a, b) => b.util - a.util);

            // Helpers
            const pctFmt = (n) =>
              n == null ? "—" : `${(n * 100).toFixed(1)}%`;
            const utilColor = (v) =>
              v >= 0.7 ? C.green : v >= 0.4 ? C.yellow : C.red;
            const trendColor = (t) =>
              t === "improving"
                ? C.green
                : t === "declining"
                  ? C.red
                  : t === "plateau"
                    ? C.yellow
                    : "#555";
            const trendLabel = (t) =>
              t === "improving"
                ? "↑ Improving"
                : t === "declining"
                  ? "↓ Declining"
                  : t === "plateau"
                    ? "→ Plateau"
                    : t === "new"
                      ? "New"
                      : "—";

            // Mini SVG sparkline
            const Sparkline = ({ vals, color }) => {
              if (!vals || vals.length < 2)
                return <span style={{ color: "#555", fontSize: 10 }}>—</span>;
              const max = Math.max(...vals, 1);
              const W = 52;
              const H = 22;
              const pts = vals
                .map(
                  (v, i) =>
                    `${(i / (vals.length - 1)) * W},${H - 2 - (v / max) * (H - 4)}`,
                )
                .join(" ");
              const col =
                color || (vals[vals.length - 1] >= vals[0] ? C.green : C.red);
              return (
                <svg
                  width={W}
                  height={H}
                  style={{
                    display: "inline-block",
                    verticalAlign: "middle",
                    overflow: "visible",
                  }}
                >
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={col}
                    strokeWidth={1.5}
                  />
                  {vals.map((v, i) => (
                    <circle
                      key={i}
                      cx={(i / (vals.length - 1)) * W}
                      cy={H - 2 - (v / max) * (H - 4)}
                      r={2.5}
                      fill={col}
                      opacity={0.8}
                    />
                  ))}
                </svg>
              );
            };

            return (
              <div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>
                  Period: {dateFrom || cut30str} → {dateTo || "today"} · Adjust
                  using the Date From / To filter above.
                </div>

                {/* ── Operator scorecards table ── */}
                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "transparent",
                      borderBottom: "1px solid #2a2a2e",
                    }}
                  >
                    <span
                      style={{ fontWeight: 500, color: "#bbb", fontSize: 12 }}
                    >
                      Operator Productivity Scorecards
                    </span>
                    <span
                      style={{ fontSize: 10, color: "#555", marginLeft: 10 }}
                    >
                      Ranked by units/shift · Sparkline = last 6 weeks output ·
                      Learning curve flag
                    </span>
                  </div>
                  {opRows.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "#555",
                      }}
                    >
                      No production records with operator names in this period.
                    </div>
                  ) : (
                    <table style={{ ...TABLE, tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          {[
                            "Rank",
                            "Operator",
                            "Total Output",
                            "Active Shifts",
                            "Units / Shift",
                            "Quality Rate",
                            "6-Wk Trend",
                            "Learning Curve",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {opRows.map((r, i) => {
                          const medal =
                            i === 0
                              ? "1st"
                              : i === 1
                                ? "2nd"
                                : i === 2
                                  ? "3rd"
                                  : `#${i + 1}`;
                          const prodCol =
                            i === 0 ? C.green : i < 3 ? C.yellow : "#e0e0e0";
                          const qualCol =
                            r.quality == null
                              ? "#555"
                              : r.quality >= 0.95
                                ? C.green
                                : r.quality >= 0.85
                                  ? C.yellow
                                  : C.red;
                          return (
                            <tr
                              key={r.op}
                              style={{
                                background: i % 2 === 0 ? "#0e0e12" : "#121216",
                              }}
                            >
                              <td
                                style={{
                                  ...TD,
                                  textAlign: "center",
                                  fontSize: 16,
                                }}
                              >
                                {medal}
                              </td>
                              <td style={{ ...TD, fontWeight: 700 }}>{r.op}</td>
                              <td
                                style={{
                                  ...TD,
                                  textAlign: "right",
                                  color: C.green,
                                  fontWeight: 500,
                                }}
                              >
                                {r.good.toLocaleString("en-IN")}
                                {r.rejected > 0 && (
                                  <div style={{ fontSize: 9, color: C.red }}>
                                    +{r.rejected} rej
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  textAlign: "right",
                                  color: "#888",
                                }}
                              >
                                {r.activeShifts}
                              </td>
                              <td style={{ ...TD, textAlign: "right" }}>
                                <span
                                  style={{
                                    fontWeight: 900,
                                    fontSize: 15,
                                    color: prodCol,
                                  }}
                                >
                                  {r.productivity.toFixed(0)}
                                </span>
                                <span
                                  style={{
                                    color: "#555",
                                    fontSize: 10,
                                    marginLeft: 3,
                                  }}
                                >
                                  u/shift
                                </span>
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  textAlign: "right",
                                  fontWeight: 500,
                                  color: qualCol,
                                }}
                              >
                                {pctFmt(r.quality)}
                              </td>
                              <td style={{ ...TD, textAlign: "center" }}>
                                <Sparkline vals={r.lastWeeks} />
                              </td>
                              <td style={{ ...TD }}>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    background: `${trendColor(r.trend)}22`,
                                    color: trendColor(r.trend),
                                    border: `1px solid ${trendColor(r.trend)}44`,
                                  }}
                                >
                                  {trendLabel(r.trend)}
                                </span>
                                {r.trend === "plateau" &&
                                  r.activeShifts > 4 && (
                                    <div
                                      style={{
                                        fontSize: 9,
                                        color: C.yellow,
                                        marginTop: 3,
                                      }}
                                    >
                                      Consider retraining
                                    </div>
                                  )}
                                {r.trend === "declining" && (
                                  <div
                                    style={{
                                      fontSize: 9,
                                      color: C.red,
                                      marginTop: 3,
                                    }}
                                  >
                                    Investigate cause
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* ── Machine utilization ── */}
                <div
                  style={{
                    borderRadius: 8,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "transparent",
                      borderBottom: "1px solid #2a2a2e",
                    }}
                  >
                    <span
                      style={{ fontWeight: 500, color: "#bbb", fontSize: 12 }}
                    >
                      Machine Utilization
                    </span>
                    <span
                      style={{ fontSize: 10, color: "#555", marginLeft: 10 }}
                    >
                      Active shifts ÷ fleet shifts · Weekly utilization
                      sparkline · Capacity planning input
                    </span>
                  </div>
                  {machineRows.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "#555",
                      }}
                    >
                      No machine data in this period. Select a Machine in
                      Production Update entries.
                    </div>
                  ) : (
                    <table style={{ ...TABLE, tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          {[
                            "Machine",
                            "Type",
                            "Active Shifts",
                            "Utilization %",
                            "6-Wk Trend",
                            "Good Output",
                            "Quality",
                            "Top Operator",
                            "Top Stage",
                          ].map((h) => (
                            <th key={h} style={TH}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {machineRows.map((r, i) => {
                          const col = utilColor(r.util);
                          const qualCol =
                            r.quality == null
                              ? "#555"
                              : r.quality >= 0.95
                                ? C.green
                                : r.quality >= 0.85
                                  ? C.yellow
                                  : C.red;
                          return (
                            <tr
                              key={r.m._id}
                              style={{
                                background: i % 2 === 0 ? "#0e0e12" : "#121216",
                              }}
                            >
                              <td style={{ ...TD, fontWeight: 700 }}>
                                {r.m.name}
                              </td>
                              <td style={{ ...TD, color: "#888" }}>
                                {r.m.type || "—"}
                              </td>
                              <td style={{ ...TD, textAlign: "right" }}>
                                {r.activeShifts}
                              </td>
                              <td style={{ ...TD }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      flex: 1,
                                      height: 5,
                                      background: "#2a2a2e",
                                      borderRadius: 3,
                                      overflow: "hidden",
                                      minWidth: 64,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(r.util, 1) * 100}%`,
                                        height: "100%",
                                        background: col,
                                        borderRadius: 3,
                                      }}
                                    />
                                  </div>
                                  <span
                                    style={{
                                      fontWeight: 500,
                                      color: col,
                                      fontSize: 12,
                                      minWidth: 36,
                                    }}
                                  >
                                    {(r.util * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td style={{ ...TD, textAlign: "center" }}>
                                <Sparkline vals={r.utilWkVals} color={col} />
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  textAlign: "right",
                                  color: C.green,
                                  fontWeight: 500,
                                }}
                              >
                                {r.good.toLocaleString("en-IN")}
                              </td>
                              <td
                                style={{
                                  ...TD,
                                  textAlign: "right",
                                  fontWeight: 500,
                                  color: qualCol,
                                }}
                              >
                                {pctFmt(r.quality)}
                              </td>
                              <td
                                style={{ ...TD, color: "#888", fontSize: 11 }}
                              >
                                {r.topOp}
                              </td>
                              <td style={{ ...TD }}>
                                {r.topStage && (
                                  <span
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      background:
                                        (PROCESS_COLORS[r.topStage] || "#555") +
                                        "33",
                                      color:
                                        PROCESS_COLORS[r.topStage] || "#aaa",
                                      fontSize: 10,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {r.topStage}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

        {/* ── SO → Dispatch Funnel ── */}
        {reportTab === "funnel" &&
          (() => {
            const avgFn = (arr) =>
              arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
            const medFn = (arr) => {
              if (!arr.length) return null;
              const s = [...arr].sort((a, b) => a - b);
              const m = Math.floor(s.length / 2);
              return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
            };

            const journey = (salesOrders || []).map((so) => {
              const soKey = so.soNo || so._id || "";
              const relJOs = (jobOrders || []).filter(
                (jo) => jo.soRef === soKey || jo.soNo === soKey,
              );
              const hasJO = relJOs.length > 0;
              const allHistory = relJOs.flatMap((jo) => jo.stageHistory || []);
              const hasProduction = allHistory.length > 0;
              const relDisps = (dispatches || []).filter(
                (d) => d.soRef === soKey || d.soNo === soKey || d.so === soKey,
              );
              const hasDispatch = relDisps.length > 0;

              const soTs = +new Date(so.orderDate || so.createdAt);
              const joTs = hasJO
                ? Math.min(
                    ...relJOs.map(
                      (jo) => +new Date(jo.jobcardDate || jo.createdAt),
                    ),
                  )
                : null;
              const prodStartTs = hasProduction
                ? Math.min(
                    ...allHistory.map((h) => +new Date(h.date || h.enteredAt)),
                  )
                : null;
              const prodEndTs = hasProduction
                ? Math.max(
                    ...allHistory.map((h) => +new Date(h.date || h.enteredAt)),
                  )
                : null;
              const dispTs = hasDispatch
                ? Math.min(
                    ...relDisps.map((d) => +new Date(d.date || d.dispatchDate)),
                  )
                : null;

              const soToJO =
                joTs && soTs && joTs > soTs ? (joTs - soTs) / 86400000 : null;
              const joToProd =
                joTs && prodStartTs && prodStartTs > joTs
                  ? (prodStartTs - joTs) / 86400000
                  : null;
              const prodToDisp =
                prodEndTs && dispTs && dispTs > prodEndTs
                  ? (dispTs - prodEndTs) / 86400000
                  : null;
              const totalCycle =
                dispTs && soTs && dispTs > soTs
                  ? (dispTs - soTs) / 86400000
                  : null;

              const currentStage = hasDispatch
                ? "Dispatched"
                : hasProduction
                  ? "In Production"
                  : hasJO
                    ? "JO Created"
                    : "SO Only";

              const latestTs = dispTs || prodEndTs || joTs || soTs;
              const daysAtStage = latestTs
                ? Math.max(0, (Date.now() - latestTs) / 86400000)
                : 0;

              return {
                so,
                soKey,
                hasJO,
                hasProduction,
                hasDispatch,
                soToJO,
                joToProd,
                prodToDisp,
                totalCycle,
                currentStage,
                daysAtStage,
              };
            });

            const total = journey.length;
            const withJO = journey.filter((d) => d.hasJO).length;
            const withProd = journey.filter((d) => d.hasProduction).length;
            const withDisp = journey.filter((d) => d.hasDispatch).length;

            const convSoToJO = total > 0 ? (withJO / total) * 100 : 0;
            const convJOToProd = withJO > 0 ? (withProd / withJO) * 100 : 0;
            const convProdToDisp =
              withProd > 0 ? (withDisp / withProd) * 100 : 0;

            const soToJOTimes = journey
              .map((d) => d.soToJO)
              .filter((v) => v != null);
            const joToProdTimes = journey
              .map((d) => d.joToProd)
              .filter((v) => v != null);
            const prodToDispTimes = journey
              .map((d) => d.prodToDisp)
              .filter((v) => v != null);
            const totalTimes = journey
              .map((d) => d.totalCycle)
              .filter((v) => v != null);

            const FUNNEL_STAGES = [
              {
                label: "SO Created",
                count: total,
                color: "#3b82f6",
                icon: "fa-solid fa-clipboard-list",
              },
              {
                label: "JO Created",
                count: withJO,
                color: "#8b5cf6",
                icon: "fa-solid fa-file-pen",
              },
              {
                label: "In Production",
                count: withProd,
                color: "#f97316",
                icon: "fa-solid fa-gears",
              },
              {
                label: "Dispatched",
                count: withDisp,
                color: "#22c55e",
                icon: "fa-solid fa-truck",
              },
            ];

            const convRates = [convSoToJO, convJOToProd, convProdToDisp];
            const cycleLabels = [
              "SO → JO",
              "JO → Prod",
              "Prod → Dispatch",
              "Total",
            ];
            const cycleTimes = [
              soToJOTimes,
              joToProdTimes,
              prodToDispTimes,
              totalTimes,
            ];
            const cycleColors = ["#3b82f6", "#8b5cf6", "#f97316", "#22c55e"];

            const inFlight = journey
              .filter((d) => !d.hasDispatch)
              .sort((a, b) => b.daysAtStage - a.daysAtStage);

            // Monthly cycle time trend
            const monthBuckets = {};
            journey.forEach((d) => {
              if (d.totalCycle != null && d.so) {
                const ds = d.so.orderDate || d.so.createdAt || "";
                const mo = ds.slice(0, 7);
                if (mo) {
                  if (!monthBuckets[mo]) monthBuckets[mo] = [];
                  monthBuckets[mo].push(d.totalCycle);
                }
              }
            });
            const monthKeys = Object.keys(monthBuckets).sort().slice(-6);
            const monthAvgs = monthKeys.map((k) => avgFn(monthBuckets[k]) ?? 0);
            const maxMonthAvg = Math.max(...monthAvgs, 1);

            return (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    SO → Dispatch Funnel
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    Conversion rates and cycle times across {total} sales orders
                  </div>
                </div>

                {/* Funnel bars */}
                <div
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 24,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 16 }}>
                    Pipeline Funnel
                  </div>
                  {FUNNEL_STAGES.map((stage, i) => {
                    const pct = total > 0 ? (stage.count / total) * 100 : 0;
                    const conv = i > 0 ? convRates[i - 1] : null;
                    return (
                      <div key={stage.label} style={{ marginBottom: 8 }}>
                        {i > 0 && conv != null && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                              paddingLeft: 16,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color:
                                  conv >= 80
                                    ? "#22c55e"
                                    : conv >= 50
                                      ? "#f59e0b"
                                      : "#ef4444",
                                fontWeight: 500,
                              }}
                            >
                              ↓ {conv.toFixed(1)}% conversion
                            </div>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 100,
                              fontSize: 12,
                              color: "#aaa",
                              flexShrink: 0,
                              textAlign: "right",
                            }}
                          >
                            <i className={stage.icon} /> {stage.label}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              background: "transparent",
                              borderRadius: 4,
                              height: 32,
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: stage.color + "cc",
                                borderRadius: 4,
                                transition: "width 0.4s",
                                display: "flex",
                                alignItems: "center",
                                paddingLeft: 10,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: "#fff",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {stage.count}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              width: 50,
                              fontSize: 11,
                              color: "#aaa",
                              flexShrink: 0,
                            }}
                          >
                            {pct.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cycle time cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {cycleLabels.map((lbl, i) => {
                    const times = cycleTimes[i];
                    const avg = avgFn(times);
                    const med = medFn(times);
                    const col = cycleColors[i];
                    return (
                      <div
                        key={lbl}
                        style={{
                          background: C.card,
                          border: `1px solid ${C.border}`,
                          borderRadius: 10,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#888",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 8,
                          }}
                        >
                          {lbl}
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 800,
                            color: col,
                            lineHeight: 1,
                          }}
                        >
                          {avg != null ? avg.toFixed(1) : "—"}
                          <span
                            style={{
                              fontSize: 12,
                              color: "#888",
                              fontWeight: 400,
                            }}
                          >
                            {" "}
                            d avg
                          </span>
                        </div>
                        {med != null && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#888",
                              marginTop: 4,
                            }}
                          >
                            Median: {med.toFixed(1)}d
                          </div>
                        )}
                        <div
                          style={{ fontSize: 10, color: "#666", marginTop: 2 }}
                        >
                          {times.length} completed
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Monthly trend */}
                {monthKeys.length > 1 && (
                  <div
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 24,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 16 }}>
                      Monthly Avg Total Cycle Time (days)
                    </div>
                    <svg
                      width="100%"
                      height={120}
                      style={{ overflow: "visible" }}
                    >
                      {monthKeys.map((mo, i) => {
                        const barH =
                          maxMonthAvg > 0
                            ? (monthAvgs[i] / maxMonthAvg) * 90
                            : 0;
                        const barW = Math.max(1, 100 / monthKeys.length - 1);
                        const x = (i / monthKeys.length) * 100;
                        const col =
                          monthAvgs[i] <= 7
                            ? "#22c55e"
                            : monthAvgs[i] <= 14
                              ? "#f59e0b"
                              : "#ef4444";
                        return (
                          <g key={mo}>
                            <rect
                              x={`${x + 0.5}%`}
                              y={110 - barH}
                              width={`${barW}%`}
                              height={barH}
                              fill={col}
                              rx={2}
                              opacity={0.85}
                            />
                            <text
                              x={`${x + barW / 2 + 0.5}%`}
                              y={120}
                              textAnchor="middle"
                              fontSize={9}
                              fill="#666"
                            >
                              {mo.slice(5)}
                            </text>
                            {barH > 0 && (
                              <text
                                x={`${x + barW / 2 + 0.5}%`}
                                y={105 - barH}
                                textAnchor="middle"
                                fontSize={9}
                                fill={col}
                                fontWeight={700}
                              >
                                {monthAvgs[i].toFixed(1)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                    <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
                      <span style={{ color: "#22c55e" }}>■</span> ≤7d &nbsp;
                      <span style={{ color: "#f59e0b" }}>■</span> ≤14d &nbsp;
                      <span style={{ color: "#ef4444" }}>■</span> &gt;14d
                    </div>
                  </div>
                )}

                {/* In-flight SOs */}
                {inFlight.length > 0 && (
                  <div
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 24,
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>
                      In-Flight Orders ({inFlight.length})
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            {[
                              "SO No",
                              "Client",
                              "Current Stage",
                              "Days at Stage",
                              "SO→JO",
                              "JO→Prod",
                            ].map((h) => (
                              <th key={h} style={TH}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {inFlight.slice(0, 30).map((d) => {
                            const stuck = d.daysAtStage > 7;
                            const stageColor =
                              d.currentStage === "In Production"
                                ? "#f97316"
                                : d.currentStage === "JO Created"
                                  ? "#8b5cf6"
                                  : "#3b82f6";
                            return (
                              <tr key={d.soKey}>
                                <td style={TD}>
                                  {stuck && (
                                    <i
                                      className="fa-solid fa-triangle-exclamation"
                                      style={{
                                        color: "#f59e0b",
                                        marginRight: 4,
                                      }}
                                    />
                                  )}
                                  <span style={{ fontWeight: 600 }}>
                                    {d.soKey}
                                  </span>
                                </td>
                                <td style={{ ...TD, color: "#aaa" }}>
                                  {d.so.clientName || d.so.client || "—"}
                                </td>
                                <td style={TD}>
                                  <span
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      background: stageColor + "22",
                                      color: stageColor,
                                      fontSize: 11,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {d.currentStage}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    ...TD,
                                    color: stuck ? "#f59e0b" : "#aaa",
                                    fontWeight: stuck ? 700 : 400,
                                    textAlign: "right",
                                  }}
                                >
                                  {d.daysAtStage.toFixed(1)}d
                                </td>
                                <td
                                  style={{
                                    ...TD,
                                    color: "#aaa",
                                    textAlign: "right",
                                  }}
                                >
                                  {d.soToJO != null
                                    ? `${d.soToJO.toFixed(1)}d`
                                    : "—"}
                                </td>
                                <td
                                  style={{
                                    ...TD,
                                    color: "#aaa",
                                    textAlign: "right",
                                  }}
                                >
                                  {d.joToProd != null
                                    ? `${d.joToProd.toFixed(1)}d`
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </div>{" "}
      {/* end reportSectionRef */}
    </div>
  );
}
