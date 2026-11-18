import * as XLSX from "xlsx";
import { xlsxDownload } from "./helpers";

// Reads the tables currently rendered on a page (so filters, search and the
// visible tab apply) and exports them to Excel or PDF. No per-page wiring.

const SKIP_HEADERS = new Set(["", "actions", "action", "#", "select"]);

const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

function toCell(text) {
  // keep codes like 00123 or 2026-11-03 as text, convert plain amounts to numbers
  const t = text.replace(/^₹\s*/, "").replace(/,/g, "");
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(t) && text !== "") return Number(t);
  return text;
}

export function readTables(root) {
  if (!root) return [];
  const out = [];
  root.querySelectorAll("table").forEach((table) => {
    if (table.offsetParent === null) return; // hidden
    if (table.closest("[data-export-ignore]")) return;
    const headRow =
      table.querySelector("thead tr:last-child") || table.querySelector("tr");
    if (!headRow) return;
    const ths = [...headRow.children];
    const keep = [];
    const headers = [];
    ths.forEach((th, i) => {
      const label = clean(th.innerText);
      if (th.querySelector('input[type="checkbox"]')) return;
      if (SKIP_HEADERS.has(label.toLowerCase())) return;
      keep.push(i);
      headers.push(label);
    });
    if (!headers.length) return;
    const rows = [];
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const cells = [...tr.children];
      if (cells.length < ths.length / 2) return; // empty state / colspan rows
      rows.push(keep.map((i) => clean(cells[i]?.innerText)));
    });
    if (!rows.length) return;
    // nearest preceding heading, for a readable sheet / section name
    let name = "";
    let el = table;
    for (let d = 0; d < 6 && el && !name; d++) {
      let p = el.previousElementSibling;
      while (p && !name) {
        const h = p.matches?.("h1,h2,h3,h4")
          ? p
          : p.querySelector?.("h2,h3,h4");
        if (h) name = clean(h.innerText);
        p = p.previousElementSibling;
      }
      el = el.parentElement;
    }
    out.push({ name, headers, rows });
  });
  return out;
}

const safeSheet = (s, used) => {
  let n =
    (s || "Sheet")
      .replace(/[\\/?*[\]:]/g, " ")
      .slice(0, 28)
      .trim() || "Sheet";
  let k = n,
    i = 2;
  while (used.has(k)) k = `${n.slice(0, 25)} ${i++}`;
  used.add(k);
  return k;
};

const stamp = () => new Date().toISOString().slice(0, 10);
const fileBase = (title) =>
  `${title.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "export"}_${stamp()}`;

export function exportExcel(tables, title) {
  const wb = XLSX.utils.book_new();
  const used = new Set();
  tables.forEach((t, i) => {
    const aoa = [t.headers, ...t.rows.map((r) => r.map(toCell))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = t.headers.map((h, c) => ({
      wch: Math.min(
        40,
        Math.max(
          h.length,
          ...t.rows.slice(0, 200).map((r) => (r[c] || "").length),
        ) + 2,
      ),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      safeSheet(
        tables.length === 1 ? title : t.name || `${title} ${i + 1}`,
        used,
      ),
    );
  });
  xlsxDownload(wb, fileBase(title));
}

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

export function exportPDF(tables, title) {
  const when = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const sections = tables
    .map(
      (t) => `
    ${t.name && tables.length > 1 ? `<h2>${esc(t.name)}</h2>` : ""}
    <table>
      <thead><tr>${t.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${t.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>
    </table>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(fileBase(title))}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; color: #111; font-size: 10px; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 12px; }
    h1 { font-size: 16px; font-weight: 600; margin: 0; }
    h2 { font-size: 12px; font-weight: 600; margin: 16px 0 6px; }
    .meta { color: #666; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { text-align: left; font-weight: 600; background: #f3f3f3; }
    th, td { border: 1px solid #ddd; padding: 4px 6px; vertical-align: top; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  </style></head><body>
  <header><h1>${esc(title)}</h1><div class="meta">${esc(when)}</div></header>${sections}</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  };
  // some browsers fire load before onload is attached
  setTimeout(() => {
    if (document.body.contains(frame) && !frame.dataset.printed) {
      frame.dataset.printed = "1";
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 2000);
    }
  }, 400);
}
