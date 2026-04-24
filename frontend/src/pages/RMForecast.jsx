import React, { useState, useMemo } from "react";
import {
  Card,
  SectionTitle,
  Input,
  Select,
  Button,
  Modal,
} from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import { purchaseOrdersAPI } from "../api/auth";
import moment from "moment";




const mkey = (type, gsm) =>
  `${(type || "").toLowerCase().replace(/\s+/g, "")}|${Math.round(Number(gsm) || 0)}`;





function estimateJobKg(jo, paperIdx) {
  if (paperIdx === 1) {
    if (Number(jo.reelWeightKg) > 0) return Number(jo.reelWeightKg);
    const sheets = Number(jo.noOfSheets) || 0;
    const gsm    = Number(jo.paperGsm)   || 0;
    const w      = Number(jo.sheetW)     || 0; 
    const l      = Number(jo.sheetL)     || 0; 
    if (sheets && gsm && w && l) {
      
      return (sheets * gsm * (w / 1000) * (l / 1000)) / 1000;
    }
  } else if (paperIdx === 2 && jo.hasSecondPaper) {
    const sheets = Number(jo.noOfSheets2) || 0;
    const gsm    = Number(jo.paperGsm2)   || 0;
    const w      = Number(jo.sheetW)      || 0;
    const l      = Number(jo.sheetL)      || 0;
    if (sheets && gsm && w && l) {
      return (sheets * gsm * (w / 1000) * (l / 1000)) / 1000;
    }
  }
  return 0;
}





function buildVelocityMap(jobOrders) {
  const ACTIVE = new Set(["Scheduled", "In Progress", "Completed"]);
  const cut30  = moment().subtract(30, "days");
  const cut60  = moment().subtract(60, "days");
  const cut90  = moment().subtract(90, "days");

  const map = {};

  const add = (key, kg, date) => {
    if (!key || !kg || kg <= 0) return;
    const d = moment(date);
    if (!d.isValid() || d.isBefore(cut90)) return;
    if (!map[key]) map[key] = { kg30: 0, kg60: 0, kg90: 0 };
    map[key].kg90 += kg;
    if (d.isAfter(cut60)) map[key].kg60 += kg;
    if (d.isAfter(cut30)) map[key].kg30 += kg;
  };

  (jobOrders || []).forEach((jo) => {
    if (!ACTIVE.has(jo.status)) return;
    const date = jo.jobcardDate || jo.createdAt;
    if (!date) return;

    if (jo.paperType) add(mkey(jo.paperType, jo.paperGsm), estimateJobKg(jo, 1), date);
    if (jo.hasSecondPaper && jo.paperType2)
      add(mkey(jo.paperType2, jo.paperGsm2), estimateJobKg(jo, 2), date);
  });

  
  Object.values(map).forEach((v) => {
    v.v30 = v.kg30 / 30;
    v.v60 = v.kg60 / 60;
    v.v90 = v.kg90 / 90;
  });

  return map;
}


const S = {
  critical: { color: "#ef4444", label: "Critical",   bg: "#450a0a99", icon: "🔴" },
  warning:  { color: "#f59e0b", label: "Warning",    bg: "#451a0399", icon: "🟡" },
  ok:       { color: "#22c55e", label: "OK",         bg: "#052e1699", icon: "🟢" },
  dead:     { color: "#818cf8", label: "Dead Stock", bg: "#1e1b4b99", icon: "⚫" },
  nodata:   { color: "#555",   label: "No Data",    bg: "#11111199", icon: "—"  },
};

const ACCENT = "#ff7800";
const fmtN = (n, d = 1) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(d));
const fmtKg = (n) => (n == null || isNaN(n) || n === 0 ? "—" : `${Number(n).toFixed(1)} kg`);


function DraftPOModal({ row, vendors, leadDays, bufferDays, toast, onClose, onCreated }) {
  const targetDays = leadDays + bufferDays + 7;
  const defaultQty = row.v30 > 0
    ? Math.max(0, targetDays * row.v30 - row.currentKg)
    : 0;

  const [vendorName, setVendorName] = useState("");
  const [qty,        setQty]        = useState(fmtN(defaultQty, 1) === "—" ? "" : fmtN(defaultQty, 1));
  const [rate,       setRate]       = useState(row.rate || "");
  const [loading,    setLoading]    = useState(false);

  const amount = (Number(qty) || 0) * (Number(rate) || 0);

  const handleCreate = async () => {
    if (!vendorName) { toast?.("Select a vendor", "error"); return; }
    if (!qty || Number(qty) <= 0) { toast?.("Enter valid qty", "error"); return; }
    try {
      setLoading(true);
      const today = moment().format("YYYY-MM-DD");
      const deliveryDate = moment().add(leadDays, "days").format("YYYY-MM-DD");
      await purchaseOrdersAPI.create({
        poDate: today,
        deliveryDate,
        vendor: vendorName,
        status: "Open",
        remarks: `Auto-generated draft — RM Forecast (${row.name})`,
        items: [{
          materialType: "Raw Material",
          itemName:   row.name,
          paperType:  row.paperType || "",
          gsm:        row.gsm       || 0,
          unit:       "kg",
          weight:     Number(qty),
          qty:        Number(qty),
          rate:       Number(rate) || 0,
          amount,
          gstRate:    12,
          category:   row.category  || "Raw Material",
        }],
      });
      toast?.(`Draft PO created for ${row.name}`, "success");
      onCreated?.();
      onClose();
    } catch {
      toast?.("Failed to create PO", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Draft PO — ${row.name}`} onClose={onClose}>
      {}
      <div style={{ background: "#111", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          ["Current Stock",   fmtKg(row.currentKg)],
          ["30d Velocity",    row.v30 > 0 ? `${fmtN(row.v30)} kg/day` : "—"],
          ["Days of Cover",   row.daysOfCover != null ? `${fmtN(row.daysOfCover)} days` : "—"],
          ["Target Coverage", `${targetDays} days`],
          ["Suggested Qty",   fmtKg(defaultQty)],
          ["Paper Type",      row.paperType ? `${row.paperType} ${row.gsm ? row.gsm + " GSM" : ""}` : "—"],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Select
            label="Vendor *"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            options={[
              { label: "— Select Vendor —", value: "" },
              ...(vendors || []).filter(v => v.status !== "Inactive").map(v => ({ label: v.name, value: v.name })),
            ]}
          />
        </div>
        <Input
          label="Order Qty (kg) *"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Input
          label="Rate (₹/kg)"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </div>

      {amount > 0 && (
        <div style={{ marginTop: 10, padding: "8px 14px", background: "#0a1628", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>
          Estimated PO Value: ₹{amount.toLocaleString("en-IN")}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Button text="Cancel" color="#666" onClick={onClose} />
        <Button type="button" text="Create Draft PO" color={C.blue} loading={loading} onClick={handleCreate} />
      </div>
    </Modal>
  );
}


export default function RMForecast({ rawStock = [], jobOrders = [], vendorMaster = [], toast, refreshData }) {
  const [leadDays,      setLeadDays]     = useState(7);
  const [bufferDays,    setBufferDays]   = useState(5);
  const [search,        setSearch]       = useState("");
  const [statusFilter,  setStatusFilter] = useState("all");
  const [sortKey,       setSortKey]      = useState("daysOfCover");
  const [sortDir,       setSortDir]      = useState("asc");
  const [draftRow,      setDraftRow]     = useState(null);

  
  const velocityMap = useMemo(() => buildVelocityMap(jobOrders), [jobOrders]);

  const rows = useMemo(() => {
    return (rawStock || [])
      .filter((item) => Number(item.weight) > 0 || Number(item.qty) > 0)
      .map((item) => {
        const key       = mkey(item.paperType, item.gsm);
        const vel       = velocityMap[key] || { v30: 0, v60: 0, v90: 0 };
        const currentKg = Number(item.weight) || 0;
        const { v30, v60, v90 } = vel;

        const daysOfCover = v30 > 0 ? currentKg / v30 : null;
        const threshold   = leadDays + bufferDays;

        let status;
        if (v90 === 0 && currentKg > 0) status = "dead";
        else if (daysOfCover != null && daysOfCover < threshold) status = "critical";
        else if (daysOfCover != null && daysOfCover < threshold * 2) status = "warning";
        else if (v30 > 0 || currentKg > 0) status = "ok";
        else status = "nodata";

        const suggestedKg = v30 > 0
          ? Math.max(0, (threshold + 7) * v30 - currentKg)
          : 0;

        return { ...item, key, currentKg, v30, v60, v90, daysOfCover, status, suggestedKg };
      });
  }, [rawStock, velocityMap, leadDays, bufferDays]);

  
  const summary = useMemo(() => ({
    total:    rows.length,
    critical: rows.filter(r => r.status === "critical").length,
    warning:  rows.filter(r => r.status === "warning").length,
    ok:       rows.filter(r => r.status === "ok").length,
    dead:     rows.filter(r => r.status === "dead").length,
  }), [rows]);

  
  const filtered = useMemo(() => {
    return rows
      .filter(r => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!(r.name || "").toLowerCase().includes(q) &&
              !(r.code || "").toLowerCase().includes(q) &&
              !(r.paperType || "").toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        
        const av = a[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
        const bv = b[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
        if (av === bv) return 0;
        return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
  }, [rows, statusFilter, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const thStyle = (k) => ({
    padding: "10px 12px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: sortKey === k ? ACCENT : C.muted,
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    textAlign: "right",
  });

  const tdR = { padding: "10px 12px", textAlign: "right", fontSize: 12 };
  const tdL = { padding: "10px 12px", textAlign: "left",  fontSize: 12 };

  return (
    <div className="fade">
      <SectionTitle
        icon="📦"
        title="RM Forecasting & Reorder"
        sub="Consumption velocity from job orders · Days-of-cover · Dead stock detection"
      />

      {}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Items Tracked", value: summary.total,    color: ACCENT       },
          { label: "🔴 Critical",   value: summary.critical, color: "#ef4444"    },
          { label: "🟡 Warning",    value: summary.warning,  color: "#f59e0b"    },
          { label: "🟢 OK",         value: summary.ok,       color: "#22c55e"    },
          { label: "⚫ Dead Stock", value: summary.dead,     color: "#818cf8"    },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {}
      <Card style={{ marginBottom: 16, padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            placeholder="Search name, code, paper type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 230 }}
          />

          {}
          <div style={{ display: "flex", gap: 5 }}>
            {["all", "critical", "warning", "ok", "dead"].map((s) => {
              const cfg = S[s] || {};
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: "5px 13px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border:      `1px solid ${active ? (cfg.color || ACCENT) : C.border}`,
                    background:  active ? (cfg.bg || ACCENT + "22") : "transparent",
                    color:       active ? (cfg.color || ACCENT) : C.muted,
                  }}
                >
                  {s === "all" ? "All" : `${cfg.icon} ${cfg.label}`}
                </button>
              );
            })}
          </div>

          {}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>Lead time:</span>
            <input
              type="number" min={1} max={60}
              value={leadDays}
              onChange={(e) => setLeadDays(Math.max(1, Number(e.target.value)))}
              style={{ width: 52, padding: "5px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "#1a1a1a", color: C.text, fontSize: 12, textAlign: "center" }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>days</span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>Buffer:</span>
            <input
              type="number" min={0} max={30}
              value={bufferDays}
              onChange={(e) => setBufferDays(Math.max(0, Number(e.target.value)))}
              style={{ width: 52, padding: "5px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "#1a1a1a", color: C.text, fontSize: 12, textAlign: "center" }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>days</span>
          </div>
        </div>
      </Card>

      {}
      <Card>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: C.muted, fontSize: 13 }}>
            No RM stock items match the current filters.
            <br />
            <span style={{ fontSize: 11, display: "block", marginTop: 6 }}>
              Stock items need a <b>Paper Type</b> and <b>GSM</b> that match your Job Orders for velocity to be computed.
            </span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle("name"), textAlign: "left" }}       onClick={() => handleSort("name")}>ITEM{sortKey === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={{ ...thStyle("paperType"), textAlign: "left" }}  onClick={() => handleSort("paperType")}>PAPER TYPE / GSM{sortKey === "paperType" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={thStyle("currentKg")}   onClick={() => handleSort("currentKg")}>STOCK (kg){sortKey === "currentKg" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={thStyle("v30")}          onClick={() => handleSort("v30")}>30d vel (kg/d){sortKey === "v30" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={thStyle("v60")}          onClick={() => handleSort("v60")}>60d vel (kg/d){sortKey === "v60" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={thStyle("v90")}          onClick={() => handleSort("v90")}>90d vel (kg/d){sortKey === "v90" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={thStyle("daysOfCover")}  onClick={() => handleSort("daysOfCover")}>DAYS COVER{sortKey === "daysOfCover" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={{ ...thStyle("status"), textAlign: "center" }}   onClick={() => handleSort("status")}>STATUS</th>
                  <th style={thStyle("suggestedKg")}  onClick={() => handleSort("suggestedKg")}>SUGGESTED ORDER{sortKey === "suggestedKg" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th style={{ ...thStyle("action"), cursor: "default" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const sc = S[r.status];
                  const isActionable = r.status === "critical" || r.status === "warning";
                  const coverColor =
                    r.status === "critical" ? "#ef4444" :
                    r.status === "warning"  ? "#f59e0b" :
                    r.status === "ok"       ? "#22c55e" : C.muted;

                  return (
                    <tr key={r._id || r.code || i} style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? "transparent" : "#ffffff03" }}>
                      {}
                      <td style={{ ...tdL, fontWeight: 700, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <div>{r.name}</div>
                        {r.code && <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{r.code}</div>}
                      </td>

                      {}
                      <td style={tdL}>
                        {r.paperType
                          ? <><span style={{ fontWeight: 600 }}>{r.paperType}</span>{r.gsm ? <span style={{ color: C.muted, fontSize: 11 }}> · {r.gsm} GSM</span> : ""}</>
                          : <span style={{ color: C.muted }}>—</span>}
                      </td>

                      {}
                      <td style={{ ...tdR, fontWeight: 700, color: r.currentKg > 0 ? "#fff" : C.muted }}>
                        {r.currentKg > 0 ? `${r.currentKg.toLocaleString("en-IN")} kg` : "—"}
                      </td>

                      {}
                      {[r.v30, r.v60, r.v90].map((v, vi) => (
                        <td key={vi} style={{ ...tdR, color: v > 0 ? C.text : C.muted }}>
                          {v > 0 ? fmtN(v) : "—"}
                        </td>
                      ))}

                      {}
                      <td style={{ ...tdR, fontWeight: 700, color: coverColor }}>
                        {r.daysOfCover != null
                          ? <>{fmtN(r.daysOfCover)} <span style={{ fontWeight: 400, fontSize: 10, color: C.muted }}>days</span></>
                          : <span style={{ color: C.muted }}>—</span>}
                      </td>

                      {}
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          background: sc.bg, color: sc.color,
                          borderRadius: 5, padding: "3px 9px",
                          fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                          border: `1px solid ${sc.color}44`,
                        }}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>

                      {}
                      <td style={{ ...tdR, color: r.suggestedKg > 0 ? "#f59e0b" : C.muted, fontWeight: r.suggestedKg > 0 ? 700 : 400 }}>
                        {r.suggestedKg > 0 ? `${fmtN(r.suggestedKg, 0)} kg` : "—"}
                      </td>

                      {}
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {isActionable && r.suggestedKg > 0 ? (
                          <button
                            onClick={() => setDraftRow(r)}
                            style={{
                              padding: "5px 12px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer",
                              background: "#1e293b", color: "#3b82f6",
                              border: "1px solid #1e3a5f",
                            }}
                          >
                            Draft PO
                          </button>
                        ) : r.status === "dead" ? (
                          <span style={{ fontSize: 11, color: "#818cf8" }}>Review</span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {}
      {summary.dead > 0 && (statusFilter === "all" || statusFilter === "dead") && (
        <div style={{ marginTop: 16, padding: "14px 18px", background: "#1e1b4b44", border: "1px solid #818cf844", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, color: "#818cf8", marginBottom: 6, fontSize: 13 }}>
            ⚫ Dead Stock Alert — {summary.dead} item{summary.dead > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            These raw materials have <b>no consumption recorded in the last 90 days</b> via job orders.
            They are tying up working capital. Consider:<br />
            • Verifying if paperType + GSM in Job Orders matches these stock items<br />
            • Writing off / returning to vendor if genuinely unused<br />
            • Repurposing for alternate products
          </div>
        </div>
      )}

      {}
      <div style={{ marginTop: 10, padding: "10px 16px", background: "#0d0d0d", borderRadius: 8, border: `1px solid ${C.border}22`, fontSize: 11, color: "#444" }}>
        <b style={{ color: "#555" }}>How velocity is computed:</b>{" "}
        Matches RM stock to Job Orders by <b>Paper Type + GSM</b>. Weight per job =
        {" "}<code>reelWeightKg</code> (if set) or <code>noOfSheets × gsm × area(m²) / 1000</code>.
        Includes Scheduled, In Progress, and Completed jobs.
        Days-of-cover = <code>current stock ÷ 30-day velocity</code>.
        Critical threshold = lead time ({leadDays}d) + buffer ({bufferDays}d) = <b>{leadDays + bufferDays} days</b>.
        Suggested order covers lead time + buffer + 7-day safety stock.
      </div>

      {}
      {draftRow && (
        <DraftPOModal
          row={draftRow}
          vendors={vendorMaster}
          leadDays={leadDays}
          bufferDays={bufferDays}
          toast={toast}
          onClose={() => setDraftRow(null)}
          onCreated={refreshData}
        />
      )}
    </div>
  );
}
