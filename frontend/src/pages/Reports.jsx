import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import { SectionTitle } from "../components/ui/BasicComponents";
import {
  purchaseOrdersAPI,
  salesOrdersAPI,
  jobOrdersAPI,
  materialInwardAPI,
} from "../api/auth";

const SUBCONTRACTING_KEY = "subcontracting_records";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtQty = (n) => Math.round(Number(n || 0)).toLocaleString("en-IN");

const fd = (d) => (d ? d.toString().split("T")[0] : "—");

const MODULES = [
  { id: "po", label: "Purchase Orders", icon: "fa-solid fa-cart-shopping", color: "#60a5fa" },
  { id: "so", label: "Sales Orders", icon: "fa-solid fa-file-invoice-dollar", color: "#4ade80" },
  { id: "jo", label: "Job Orders", icon: "fa-solid fa-gears", color: "#facc15" },
  { id: "mi", label: "Material Inward (GRN)", icon: "fa-solid fa-truck-ramp-box", color: "#38bdf8" },
  { id: "mr", label: "Material Return", icon: "fa-solid fa-right-left", color: "#f472b6" },
];

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

const filterByDate = (arr, dateField, from, to) => {
  return arr.filter((r) => {
    const d = (r[dateField] || "").toString().split("T")[0];
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
};

const buildPOReport = (records, dateFrom, dateTo, logoSrc) => {
  const filtered = filterByDate(records, "poDate", dateFrom, dateTo);
  const withTax = filtered.map((po) => {
    const items = (po.items || []).map((it) => {
      const amt = Number(it.amount || 0);
      const gst = Number(it.gstRate !== undefined ? it.gstRate : 18);
      const tax = (amt * gst) / 100;
      return { ...it, rowTax: tax, gross: amt + tax, usedGst: gst };
    });
    const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const totalTax = items.reduce((s, it) => s + it.rowTax, 0);
    return { ...po, _items: items, subtotal, totalTax, netTotal: subtotal + totalTax };
  });

  const grandSubtotal = withTax.reduce((s, r) => s + r.subtotal, 0);
  const grandTax = withTax.reduce((s, r) => s + r.totalTax, 0);
  const grandTotal = withTax.reduce((s, r) => s + r.netTotal, 0);
  const openCount = withTax.filter((r) => (r.status || "Open") !== "Received").length;
  const receivedCount = withTax.filter((r) => r.status === "Received").length;

  const rows = withTax
    .map(
      (po, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td class="mono">${po.poNo}</td>
      <td>${fd(po.poDate)}</td>
      <td>${fd(po.deliveryDate)}</td>
      <td>${po.vendor || "—"}</td>
      <td class="center">${(po._items || []).length}</td>
      <td class="right">₹${fmt(po.subtotal)}</td>
      <td class="right">₹${fmt(po.totalTax)}</td>
      <td class="right bold">₹${fmt(po.netTotal)}</td>
      <td class="center"><span class="badge ${po.status === "Received" ? "green" : "blue"}">${po.status || "Open"}</span></td>
    </tr>`,
    )
    .join("");

  return { rows, grandSubtotal, grandTax, grandTotal, count: withTax.length, openCount, receivedCount, title: "Purchase Orders Report", color: "#1e40af", accentLight: "#dbeafe" };
};

const buildSOReport = (records, dateFrom, dateTo) => {
  const filtered = filterByDate(records, "orderDate", dateFrom, dateTo);
  const withTax = filtered.map((so) => {
    const items = (so.items || []).map((it) => {
      const amt = Number(it.amount || 0);
      const gst = Number(it.gstRate !== undefined ? it.gstRate : 18);
      const tax = (amt * gst) / 100;
      return { ...it, rowTax: tax, gross: amt + tax, usedGst: gst };
    });
    const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const totalTax = items.reduce((s, it) => s + it.rowTax, 0);
    return { ...so, subtotal, totalTax, netTotal: subtotal + totalTax };
  });

  const grandSubtotal = withTax.reduce((s, r) => s + r.subtotal, 0);
  const grandTax = withTax.reduce((s, r) => s + r.totalTax, 0);
  const grandTotal = withTax.reduce((s, r) => s + r.netTotal, 0);
  const openCount = withTax.filter((r) => !["Completed","Complated","Received"].includes(r.status)).length;
  const completedCount = withTax.filter((r) => ["Completed","Complated","Received"].includes(r.status)).length;

  const rows = withTax
    .map(
      (so, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td class="mono">${so.soNo || "—"}</td>
      <td>${fd(so.orderDate)}</td>
      <td>${fd(so.deliveryDate)}</td>
      <td>${so.client || "—"}</td>
      <td>${so.salesPerson || "—"}</td>
      <td class="center">${(so.items || []).length}</td>
      <td class="right">₹${fmt(so.subtotal)}</td>
      <td class="right">₹${fmt(so.totalTax)}</td>
      <td class="right bold">₹${fmt(so.netTotal)}</td>
      <td class="center"><span class="badge ${["Completed","Complated","Received"].includes(so.status) ? "green" : "amber"}">${so.status || "Open"}</span></td>
    </tr>`,
    )
    .join("");

  return { rows, grandSubtotal, grandTax, grandTotal, count: withTax.length, openCount, completedCount, title: "Sales Orders Report", color: "#166534", accentLight: "#dcfce7" };
};

const buildJOReport = (records, dateFrom, dateTo) => {
  const filtered = filterByDate(records, "jobcardDate", dateFrom, dateTo);
  const totalQty = filtered.reduce((s, r) => s + Number(r.qty || r.quantity || 0), 0);
  const activeCount = filtered.filter((r) => r.status !== "Completed").length;
  const completedCount = filtered.filter((r) => r.status === "Completed").length;

  const rows = filtered
    .map(
      (jo, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td class="mono">${jo.joNo || "—"}</td>
      <td>${fd(jo.jobcardDate)}</td>
      <td>${fd(jo.deliveryDate)}</td>
      <td>${jo.client || "—"}</td>
      <td>${jo.itemName || "—"}</td>
      <td class="center">${fmtQty(jo.qty || jo.quantity || 0)}</td>
      <td>${jo.process || "—"}</td>
      <td class="center"><span class="badge ${jo.priority === "VIP" ? "red" : jo.priority === "Rush" ? "amber" : "gray"}">${jo.priority || "Normal"}</span></td>
      <td class="center"><span class="badge ${jo.status === "Completed" ? "green" : "blue"}">${jo.status || "Active"}</span></td>
    </tr>`,
    )
    .join("");

  return { rows, grandSubtotal: 0, grandTax: 0, grandTotal: totalQty, count: filtered.length, activeCount, completedCount, title: "Job Orders Report", color: "#713f12", accentLight: "#fef9c3", showQty: true };
};

const buildMIReport = (records, dateFrom, dateTo) => {
  const filtered = filterByDate(records, "inwardDate", dateFrom, dateTo);
  const withTax = filtered.map((mi) => {
    const items = (mi.items || []).map((it) => {
      const amt = Number(it.amount || 0);
      const gst = Number(it.gstRate !== undefined ? it.gstRate : 18);
      const tax = (amt * gst) / 100;
      return { ...it, rowTax: tax, gross: amt + tax, usedGst: gst };
    });
    const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const totalTax = items.reduce((s, it) => s + it.rowTax, 0);
    return { ...mi, _items: items, subtotal, totalTax, netTotal: subtotal + totalTax };
  });

  const grandSubtotal = withTax.reduce((s, r) => s + r.subtotal, 0);
  const grandTax = withTax.reduce((s, r) => s + r.totalTax, 0);
  const grandTotal = withTax.reduce((s, r) => s + r.netTotal, 0);

  const rows = withTax
    .map(
      (mi, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td class="mono">${mi.inwardNo || "—"}</td>
      <td>${fd(mi.inwardDate)}</td>
      <td>${mi.vendorName || "—"}</td>
      <td>${mi.invoiceNo || "—"}</td>
      <td>${mi.poRef || "Direct"}</td>
      <td>${mi.location || "—"}</td>
      <td class="center">${(mi._items || []).length}</td>
      <td class="right">₹${fmt(mi.subtotal)}</td>
      <td class="right">₹${fmt(mi.totalTax)}</td>
      <td class="right bold">₹${fmt(mi.netTotal)}</td>
    </tr>`,
    )
    .join("");

  return { rows, grandSubtotal, grandTax, grandTotal, count: withTax.length, title: "Material Inward Report (GRN)", color: "#0e7490", accentLight: "#e0f2fe" };
};

const buildMRReport = (records, dateFrom, dateTo) => {
  const filtered = filterByDate(records, "issueDate", dateFrom, dateTo);
  const issuedCount = filtered.filter((r) => r.status === "Issued").length;
  const receivedCount = filtered.filter((r) => ["Received", "Reconciled"].includes(r.status)).length;
  const partialCount = filtered.filter((r) => r.status === "Partially Received").length;
  const totalIssued = filtered.reduce((s, r) => s + Number(r.qtyIssued || 0), 0);
  const totalReceived = filtered.reduce((s, r) => {
    const recs = r.receipts || [];
    return s + recs.reduce((a, rec) => a + Number(rec.qtyReceived || 0), 0);
  }, 0);

  const rows = filtered
    .map((r, i) => {
      const received = (r.receipts || []).reduce((a, rec) => a + Number(rec.qtyReceived || 0), 0);
      const pending = Math.max(0, Number(r.qtyIssued || 0) - received);
      const statusClass = ["Received", "Reconciled"].includes(r.status) ? "green" : r.status === "Partially Received" ? "amber" : r.status === "Cancelled" ? "red" : "blue";
      return `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td class="mono">${r.id || r._id || "—"}</td>
      <td>${fd(r.issueDate)}</td>
      <td>${r.stage || "—"}</td>
      <td>${r.vendor || "—"}</td>
      <td>${r.materialDesc || "—"}</td>
      <td class="center">${fmtQty(r.qtyIssued || 0)}</td>
      <td class="center">${fmtQty(received)}</td>
      <td class="center">${fmtQty(pending)}</td>
      <td>${fd(r.expectedReturn)}</td>
      <td class="center"><span class="badge ${statusClass}">${r.status || "Issued"}</span></td>
    </tr>`;
    })
    .join("");

  return { rows, grandSubtotal: totalIssued, grandTax: totalReceived, grandTotal: totalIssued - totalReceived, count: filtered.length, issuedCount, receivedCount, partialCount, totalIssued, totalReceived, title: "Material Return Report", color: "#9d174d", accentLight: "#fce7f3", showMR: true };
};

const HEADER_COLS = {
  po: ["PO No", "PO Date", "Delivery", "Vendor", "Items", "Taxable", "GST", "Net Total", "Status"],
  so: ["SO No", "SO Date", "Delivery", "Client", "Sales Person", "Items", "Taxable", "GST", "Net Total", "Status"],
  jo: ["JO No", "JO Date", "Delivery", "Client", "Item", "Qty", "Process", "Priority", "Status"],
  mi: ["GRN No", "Date", "Vendor", "Invoice", "PO Ref", "Location", "Items", "Taxable", "GST", "Net Total"],
  mr: ["Issue ID", "Issue Date", "Stage", "Vendor", "Material", "Qty Issued", "Qty Received", "Pending", "Expected Return", "Status"],
};

const generateReportHTML = ({ module, dateFrom, dateTo, reportData, logoSrc }) => {
  const { rows, grandSubtotal, grandTax, grandTotal, count, title, color, accentLight, showQty, showMR } = reportData;
  const cols = HEADER_COLS[module];
  const now = new Date().toLocaleString("en-IN");

  const statCards = (() => {
    if (module === "po") {
      return [
        { label: "Total POs", value: count, color: "#1e40af" },
        { label: "Open", value: reportData.openCount, color: "#92400e" },
        { label: "Received", value: reportData.receivedCount, color: "#166534" },
        { label: "Net Value", value: `₹${fmt(grandTotal)}`, color: "#581c87" },
      ];
    } else if (module === "so") {
      return [
        { label: "Total SOs", value: count, color: "#166534" },
        { label: "Open", value: reportData.openCount, color: "#92400e" },
        { label: "Completed", value: reportData.completedCount, color: "#1e40af" },
        { label: "Net Value", value: `₹${fmt(grandTotal)}`, color: "#581c87" },
      ];
    } else if (module === "jo") {
      return [
        { label: "Total JOs", value: count, color: "#713f12" },
        { label: "Active", value: reportData.activeCount, color: "#92400e" },
        { label: "Completed", value: reportData.completedCount, color: "#166534" },
        { label: "Total Qty", value: fmtQty(grandTotal), color: "#1e40af" },
      ];
    } else if (module === "mr") {
      return [
        { label: "Total Records", value: count, color: "#9d174d" },
        { label: "Issued", value: reportData.issuedCount, color: "#92400e" },
        { label: "Partially Received", value: reportData.partialCount, color: "#1d4ed8" },
        { label: "Received/Reconciled", value: reportData.receivedCount, color: "#166534" },
      ];
    } else {
      return [
        { label: "Total GRNs", value: count, color: "#0e7490" },
        { label: "Taxable Amt", value: `₹${fmt(grandSubtotal)}`, color: "#92400e" },
        { label: "Total GST", value: `₹${fmt(grandTax)}`, color: "#1d4ed8" },
        { label: "Net Value", value: `₹${fmt(grandTotal)}`, color: "#581c87" },
      ];
    }
  })();

  const dateRangeLabel =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
      ? `From ${dateFrom}`
      : dateTo
      ? `Till ${dateTo}`
      : "All Time";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; background: #fff; padding: 24px 28px; font-size: 11px; }

    /* ─── HEADER ─── */
    .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px solid ${color}; margin-bottom: 18px; }
    .company-info { flex: 1; }
    .company-name { font-size: 18px; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1; }
    .company-addr { font-size: 9.5px; color: #475569; margin-top: 4px; line-height: 1.5; }
    .company-contact { font-size: 9px; color: #64748b; margin-top: 3px; }
    .logo-wrap { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
    .logo-wrap img { width: 72px; height: 72px; object-fit: contain; }

    /* ─── REPORT META ─── */
    .report-meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
    .report-title { font-size: 16px; font-weight: 800; color: #0f172a; }
    .report-period { font-size: 9px; color: #64748b; text-align: right; line-height: 1.6; }
    .period-badge { display: inline-block; background: ${accentLight}; color: ${color}; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 9px; }

    /* ─── STAT CARDS ─── */
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .stat-card { border: 1.5px solid; border-radius: 8px; padding: 10px 12px; }
    .stat-card-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.75; margin-bottom: 4px; }
    .stat-card-value { font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }

    /* ─── TABLE ─── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    thead tr { background: ${color}; color: #fff; }
    th { padding: 6px 7px; text-align: left; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
    td { padding: 5px 7px; font-size: 9.5px; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr.even td { background: #fff; }
    tr.odd td { background: #f8fafc; }
    tr:hover td { background: ${accentLight} !important; }

    .mono { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }

    /* ─── BADGES ─── */
    .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge.green { background: #dcfce7; color: #166534; }
    .badge.blue { background: #dbeafe; color: #1e40af; }
    .badge.amber { background: #fef3c7; color: #92400e; }
    .badge.red { background: #fee2e2; color: #991b1b; }
    .badge.gray { background: #f1f5f9; color: #475569; }

    /* ─── TOTALS BOX ─── */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden; min-width: 240px; }
    .totals-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
    .totals-row:last-child { border-bottom: none; background: ${color}; color: #fff; padding: 9px 12px; }
    .totals-row:last-child .t-label { font-weight: 700; font-size: 11px; }
    .totals-row:last-child .t-val { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 800; }
    .t-label { color: #64748b; font-weight: 600; }
    .t-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; }

    /* ─── FOOTER ─── */
    .sig-row { display: flex; justify-content: space-between; margin-top: 30px; }
    .sig-box { width: 140px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 5px; font-size: 9px; color: #64748b; }
    .print-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }

    @media print {
      body { padding: 12px 16px; }
      @page { margin: 0.8cm; size: A4 landscape; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="company-info">
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

  <!-- REPORT META -->
  <div class="report-meta">
    <div class="report-title">${title}</div>
    <div class="report-period">
      Period: <span class="period-badge">${dateRangeLabel}</span><br>
      Generated: ${now}<br>
      Total Records: <strong>${count}</strong>
    </div>
  </div>

  <!-- STAT CARDS -->
  <div class="stat-grid">
    ${statCards
      .map(
        (sc) => `
    <div class="stat-card" style="border-color: ${sc.color}22; background: ${sc.color}08;">
      <div class="stat-card-label" style="color: ${sc.color};">${sc.label}</div>
      <div class="stat-card-value" style="color: ${sc.color};">${sc.value}</div>
    </div>`,
      )
      .join("")}
  </div>

  <!-- DATA TABLE -->
  <table>
    <thead>
      <tr>
        ${cols.map((c) => `<th>${c}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="${cols.length}" style="text-align:center; color:#94a3b8; padding: 20px;">No records found for selected period.</td></tr>`}
    </tbody>
  </table>

  <!-- TOTALS -->
  ${reportData.showMR ? `
  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="t-label">Total Qty Issued</span>
        <span class="t-val">${fmtQty(reportData.totalIssued)}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Total Qty Received</span>
        <span class="t-val">${fmtQty(reportData.totalReceived)}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Pending Return</span>
        <span class="t-val">${fmtQty(Math.max(0, reportData.totalIssued - reportData.totalReceived))}</span>
      </div>
    </div>
  </div>` : !showQty ? `
  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="t-label">Taxable Amount</span>
        <span class="t-val">₹${fmt(grandSubtotal)}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Total GST</span>
        <span class="t-val">₹${fmt(grandTax)}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Net Total</span>
        <span class="t-val">₹${fmt(grandTotal)}</span>
      </div>
    </div>
  </div>` : `
  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="t-label">Total Job Orders</span>
        <span class="t-val">${count}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Total Quantity</span>
        <span class="t-val">${fmtQty(grandTotal)}</span>
      </div>
    </div>
  </div>`}

  <!-- SIGNATURES -->
  <div class="sig-row">
    <div class="sig-box">Prepared By</div>
    <div class="sig-box">Reviewed By</div>
    <div class="sig-box">Authorized Signatory</div>
  </div>

  <div class="print-footer">
    <span>AARAY PACKAGING PRIVATE LIMITED — CONFIDENTIAL</span>
    <span>${title} | ${dateRangeLabel}</span>
  </div>

</body>
</html>`;
};

export default function Reports() {
  const [selectedModule, setSelectedModule] = useState("po");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const fieldStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#fff",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  const labelStyle = {
    fontSize: 11,
    color: C.muted,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: 6,
    display: "block",
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let records = [];
      if (selectedModule === "po") {
        const data = await purchaseOrdersAPI.getAll();
        records = data.purchaseOrders || [];
      } else if (selectedModule === "so") {
        const data = await salesOrdersAPI.getAll();
        records = data.salesOrders || [];
      } else if (selectedModule === "jo") {
        const data = await jobOrdersAPI.getAll();
        records = Array.isArray(data) ? data : data.jobOrders || [];
      } else if (selectedModule === "mi") {
        const data = await materialInwardAPI.getAll();
        records = Array.isArray(data) ? data : data.inwards || [];
      } else if (selectedModule === "mr") {
        try {
          const stored = localStorage.getItem(SUBCONTRACTING_KEY);
          records = stored ? JSON.parse(stored) : [];
        } catch {
          records = [];
        }
      }

      const logoSrc = await getLogoBase64();

      let reportData;
      if (selectedModule === "po") reportData = buildPOReport(records, dateFrom, dateTo, logoSrc);
      else if (selectedModule === "so") reportData = buildSOReport(records, dateFrom, dateTo);
      else if (selectedModule === "jo") reportData = buildJOReport(records, dateFrom, dateTo);
      else if (selectedModule === "mr") reportData = buildMRReport(records, dateFrom, dateTo);
      else reportData = buildMIReport(records, dateFrom, dateTo);

      const html = generateReportHTML({ module: selectedModule, dateFrom, dateTo, reportData, logoSrc });
      setPreviewData({ html, reportData, module: selectedModule, _records: records });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    if (!previewData) return;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(previewData.html);
    iframe.contentWindow.document.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 600);
    };
  };

  const downloadExcel = () => {
    if (!previewData) return;
    const { reportData, module } = previewData;
    const cols = HEADER_COLS[module];

    const rawRecords = (() => {
      if (module === "po") {
        return filterByDate(previewData._records || [], "poDate", dateFrom, dateTo).map((po) => {
          const items = (po.items || []).map((it) => {
            const amt = Number(it.amount || 0);
            const gst = Number(it.gstRate !== undefined ? it.gstRate : 18);
            return { ...it, rowTax: (amt * gst) / 100 };
          });
          const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
          const totalTax = items.reduce((s, it) => s + it.rowTax, 0);
          return { "PO No": po.poNo, "PO Date": fd(po.poDate), "Delivery": fd(po.deliveryDate), "Vendor": po.vendor || "—", "Items": (po.items || []).length, "Taxable": subtotal, "GST": totalTax, "Net Total": subtotal + totalTax, "Status": po.status || "Open" };
        });
      }
      if (module === "so") {
        return filterByDate(previewData._records || [], "orderDate", dateFrom, dateTo).map((so) => {
          const items = (so.items || []).map((it) => {
            const amt = Number(it.amount || 0);
            const gst = Number(it.gstRate !== undefined ? it.gstRate : 18);
            return { ...it, rowTax: (amt * gst) / 100 };
          });
          const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
          const totalTax = items.reduce((s, it) => s + it.rowTax, 0);
          return { "SO No": so.soNo || "—", "SO Date": fd(so.orderDate), "Delivery": fd(so.deliveryDate), "Client": so.client || "—", "Sales Person": so.salesPerson || "—", "Items": (so.items || []).length, "Taxable": subtotal, "GST": totalTax, "Net Total": subtotal + totalTax, "Status": so.status || "Open" };
        });
      }
      if (module === "jo") {
        return filterByDate(previewData._records || [], "jobcardDate", dateFrom, dateTo).map((jo) => ({
          "JO No": jo.joNo || "—", "JO Date": fd(jo.jobcardDate), "Delivery": fd(jo.deliveryDate), "Client": jo.client || "—", "Item": jo.itemName || "—", "Qty": Number(jo.qty || jo.quantity || 0), "Process": jo.process || "—", "Priority": jo.priority || "Normal", "Status": jo.status || "Active",
        }));
      }
      if (module === "mr") {
        return filterByDate(previewData._records || [], "issueDate", dateFrom, dateTo).map((r) => {
          const received = (r.receipts || []).reduce((a, rec) => a + Number(rec.qtyReceived || 0), 0);
          return {
            "Issue ID": r.id || r._id || "—",
            "Issue Date": fd(r.issueDate),
            "Stage": r.stage || "—",
            "Vendor": r.vendor || "—",
            "Material": r.materialDesc || "—",
            "Qty Issued": Number(r.qtyIssued || 0),
            "Qty Received": received,
            "Pending": Math.max(0, Number(r.qtyIssued || 0) - received),
            "Expected Return": fd(r.expectedReturn),
            "Status": r.status || "Issued",
          };
        });
      }
      return filterByDate(previewData._records || [], "inwardDate", dateFrom, dateTo).map((mi) => {
        const items = (mi.items || []).map((it) => {
          const amt = Number(it.amount || 0);
          const gst = Number(it.gstRate !== undefined ? it.gstRate : 18);
          return { ...it, rowTax: (amt * gst) / 100 };
        });
        const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
        const totalTax = items.reduce((s, it) => s + it.rowTax, 0);
        return { "GRN No": mi.inwardNo || "—", "Date": fd(mi.inwardDate), "Vendor": mi.vendorName || "—", "Invoice": mi.invoiceNo || "—", "PO Ref": mi.poRef || "Direct", "Location": mi.location || "—", "Items": (mi._items || mi.items || []).length, "Taxable": subtotal, "GST": totalTax, "Net Total": subtotal + totalTax };
      });
    })();

    const ws = XLSX.utils.json_to_sheet(rawRecords, { header: cols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportData.title.slice(0, 31));
    const dateRangeLabel = `${dateFrom}_${dateTo}`;
    XLSX.writeFile(wb, `${reportData.title.replace(/\s+/g, "_")}_${dateRangeLabel}.xlsx`);
  };

  const openPDF = () => {
    if (!previewData) return;
    const blob = new Blob([previewData.html], { type: "text/html" });
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
  };

  const mod = MODULES.find((m) => m.id === selectedModule);

  return (
    <div className="fade">
      <SectionTitle
        icon="fa-solid fa-chart-bar"
        title="Reports"
        sub="Generate tally-style reports for any module with date range"
      />

      {/* Controls */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 180px auto", gap: 16, alignItems: "flex-end" }}>
          {/* Module */}
          <div>
            <label style={labelStyle}>Module</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModule(m.id); setPreviewData(null); }}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: selectedModule === m.id ? `1.5px solid ${m.color}` : "1px solid rgba(255,255,255,0.1)",
                    background: selectedModule === m.id ? `${m.color}18` : "rgba(255,255,255,0.03)",
                    color: selectedModule === m.id ? m.color : C.muted,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: selectedModule === m.id ? 700 : 500,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  <i className={m.icon} style={{ fontSize: 16 }} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date From */}
          <div>
            <label style={labelStyle}>From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPreviewData(null); }}
              style={fieldStyle}
            />
          </div>

          {/* Date To */}
          <div>
            <label style={labelStyle}>To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPreviewData(null); }}
              style={fieldStyle}
            />
          </div>

          {/* Generate Button */}
          <div>
            <button
              onClick={generateReport}
              disabled={loading}
              style={{
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background: loading ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.85)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Generating...</>
              ) : (
                <><i className="fa-solid fa-file-chart-column" /> Generate</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Stats (quick summary before printing) */}
      {previewData && (
        <div>
          {/* Summary stat cards */}
          {(() => {
            const { reportData, module } = previewData;
            const cards = (() => {
              if (module === "po") return [
                { label: "Total POs", value: reportData.count, color: "#60a5fa" },
                { label: "Open", value: reportData.openCount, color: "#f59e0b" },
                { label: "Received", value: reportData.receivedCount, color: "#10b981" },
                { label: "Net Value", value: `₹${fmt(reportData.grandTotal)}`, color: "#a78bfa" },
              ];
              if (module === "so") return [
                { label: "Total SOs", value: reportData.count, color: "#4ade80" },
                { label: "Open", value: reportData.openCount, color: "#f59e0b" },
                { label: "Completed", value: reportData.completedCount, color: "#10b981" },
                { label: "Net Value", value: `₹${fmt(reportData.grandTotal)}`, color: "#a78bfa" },
              ];
              if (module === "jo") return [
                { label: "Total JOs", value: reportData.count, color: "#facc15" },
                { label: "Active", value: reportData.activeCount, color: "#f97316" },
                { label: "Completed", value: reportData.completedCount, color: "#10b981" },
                { label: "Total Qty", value: Number(reportData.grandTotal).toLocaleString("en-IN"), color: "#60a5fa" },
              ];
              if (module === "mr") return [
                { label: "Total Records", value: reportData.count, color: "#f472b6" },
                { label: "Issued", value: reportData.issuedCount, color: "#f97316" },
                { label: "Partial", value: reportData.partialCount, color: "#60a5fa" },
                { label: "Received", value: reportData.receivedCount, color: "#10b981" },
              ];
              return [
                { label: "Total GRNs", value: reportData.count, color: "#38bdf8" },
                { label: "Taxable Amt", value: `₹${fmt(reportData.grandSubtotal)}`, color: "#f59e0b" },
                { label: "Total GST", value: `₹${fmt(reportData.grandTax)}`, color: "#60a5fa" },
                { label: "Net Value", value: `₹${fmt(reportData.grandTotal)}`, color: "#a78bfa" },
              ];
            })();

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                {cards.map((card, i) => (
                  <div
                    key={i}
                    style={{
                      background: `${card.color}10`,
                      border: `1px solid ${card.color}30`,
                      borderRadius: 12,
                      padding: "14px 18px",
                    }}
                  >
                    <div style={{ fontSize: 10, color: card.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Action bar */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: C.muted }}>
              <i className={`${mod.icon} mr-2`} style={{ color: mod.color, marginRight: 8 }} />
              <strong style={{ color: "#fff" }}>{MODULES.find((m) => m.id === selectedModule)?.label}</strong>
              &nbsp;·&nbsp; {previewData.reportData.count} records &nbsp;·&nbsp;
              {dateFrom} → {dateTo}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={downloadExcel}
                style={{
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "none",
                  background: "rgba(34,197,94,0.85)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i className="fa-solid fa-file-excel" /> Excel
              </button>
              <button
                onClick={openPDF}
                style={{
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "none",
                  background: "rgba(239,68,68,0.85)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i className="fa-solid fa-file-pdf" /> PDF
              </button>
              <button
                onClick={printReport}
                style={{
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "none",
                  background: "rgba(16,185,129,0.85)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i className="fa-solid fa-print" /> Print
              </button>
            </div>
          </div>

          {/* Inline HTML preview */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <iframe
              srcDoc={previewData.html}
              style={{ width: "100%", height: 700, border: "none", display: "block" }}
              title="Report Preview"
            />
          </div>
        </div>
      )}

      {!previewData && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: C.muted,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 14,
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          <i className="fa-solid fa-chart-bar" style={{ fontSize: 40, marginBottom: 14, opacity: 0.25 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Select a module and date range</div>
          <div style={{ fontSize: 12 }}>Click Generate to preview and print a tally-style report</div>
        </div>
      )}
    </div>
  );
}
