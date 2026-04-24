import React, { useState, useMemo } from "react";
import { Card, SectionTitle, Input } from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import moment from "moment";

// ─── Pure computation helpers ─────────────────────────────────────────────────

/** Last N months as ['YYYY-MM', …], oldest first */
function getMonthRange(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--)
    out.push(moment().subtract(i, "months").format("YYYY-MM"));
  return out;
}

/**
 * { productCode → { 'YYYY-MM' → qty } }
 * Also captures companyCategory per SO so client breakdown works.
 */
function buildMonthlyDemand(salesOrders) {
  const map = {};
  (salesOrders || []).forEach((so) => {
    if (!so.orderDate) return;
    const month = moment(so.orderDate).format("YYYY-MM");
    (so.items || []).forEach((it) => {
      const code = it.productCode;
      if (!code) return;
      if (!map[code]) map[code] = {};
      map[code][month] = (map[code][month] || 0) + (Number(it.orderQty) || 0);
    });
  });
  return map;
}

/** { productCode → { HP: qty, ZPL: qty, Others: qty } } */
function buildClientBreakdown(salesOrders) {
  const map = {};
  (salesOrders || []).forEach((so) => {
    const cat = so.companyCategory || "Others";
    (so.items || []).forEach((it) => {
      const code = it.productCode;
      if (!code) return;
      if (!map[code]) map[code] = { HP: 0, ZPL: 0, Others: 0 };
      const key = cat === "HP" || cat === "ZPL" ? cat : "Others";
      map[code][key] = (map[code][key] || 0) + (Number(it.orderQty) || 0);
    });
  });
  return map;
}

/** { productCode → { 1: qty, 2: qty, 3: qty, 4: qty } } for one client category */
function buildWeeklyDemand(salesOrders, clientCat) {
  const map = {};
  (salesOrders || []).forEach((so) => {
    if (!so.orderDate) return;
    if (so.companyCategory !== clientCat) return;
    const week = Math.min(Math.ceil(moment(so.orderDate).date() / 7), 4);
    (so.items || []).forEach((it) => {
      const code = it.productCode;
      if (!code) return;
      if (!map[code]) map[code] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      map[code][week] = (map[code][week] || 0) + (Number(it.orderQty) || 0);
    });
  });
  return map;
}

/** Average of last N values in series (treating zeros as real zeros) */
function rollingAvg(series, n) {
  const slice = series.slice(-n);
  return slice.reduce((s, v) => s + v, 0) / n;
}

/**
 * Weighted 3-month forecast.
 * Weights: most-recent 50 %, prior 33 %, two months ago 17 %.
 */
function weightedForecast(series) {
  const [c, b, a] = series.slice(-3); // a = oldest of the three
  return (c || 0) * 0.5 + (b || 0) * 0.33 + (a || 0) * 0.17;
}

/** Population standard deviation of the non-zero values in series */
function stdDev(series) {
  const vals = series.filter((v) => v > 0);
  if (vals.length < 2) return 0;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
}

function getTrend(series) {
  const last = series[series.length - 1] || 0;
  const prev = series[series.length - 2] || 0;
  const total = series.reduce((s, v) => s + v, 0);
  if (total === 0) return "nodata";
  if (prev === 0 && last > 0) return "new";
  if (prev === 0) return "nodata";
  const pct = ((last - prev) / prev) * 100;
  if (pct > 20) return "up";
  if (pct < -20) return "down";
  return "stable";
}

function getMoMPct(series) {
  const last = series[series.length - 1] || 0;
  const prev = series[series.length - 2] || 0;
  if (prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

// ─── Visual constants ─────────────────────────────────────────────────────────
const TREND_CFG = {
  up:     { color: "#22c55e", label: "Trending ↑", bg: "#052e1688" },
  down:   { color: "#ef4444", label: "Declining ↓", bg: "#450a0a88" },
  stable: { color: "#f59e0b", label: "Stable →",   bg: "#451a0388" },
  new:    { color: "#3b82f6", label: "New ✦",      bg: "#17254488" },
  nodata: { color: "#555",    label: "No Data",    bg: "#11111188" },
};

const ACCENT = "#ff7800";
const fmt  = (n) => (n == null || isNaN(n)) ? "—" : Math.round(n).toLocaleString("en-IN");
const fmtD = (n) => (n == null || isNaN(n)) ? "—" : n.toFixed(1);

// ─── Sortable header cell ─────────────────────────────────────────────────────
function SortTh({ label, k, sortKey, sortDir, onSort, style = {} }) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onSort(k)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        padding: "10px 10px",
        fontSize: 10,
        fontWeight: 700,
        color: active ? ACCENT : C.muted,
        letterSpacing: "0.05em",
        borderBottom: `1px solid ${C.border}`,
        textAlign: "right",
        ...style,
      }}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}

// ─── Weekly heatmap cell ──────────────────────────────────────────────────────
function HeatCell({ qty, maxQty }) {
  const intensity = maxQty > 0 ? qty / maxQty : 0;
  return (
    <td style={{ padding: "8px 6px", textAlign: "center" }}>
      <div style={{
        background: `rgba(255,120,0,${intensity * 0.75})`,
        border: `1px solid rgba(255,120,0,${intensity * 0.4})`,
        borderRadius: 5,
        padding: "2px 6px",
        color: intensity > 0.5 ? "#fff" : C.muted,
        fontWeight: intensity > 0.3 ? 700 : 400,
        fontSize: 11,
        minWidth: 38,
      }}>
        {qty > 0 ? fmt(qty) : "—"}
      </div>
    </td>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DemandForecast({ salesOrders = [], itemMasterFG = [] }) {
  const [search,       setSearch]       = useState("");
  const [trendFilter,  setTrendFilter]  = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [sortKey,      setSortKey]      = useState("forecast");
  const [sortDir,      setSortDir]      = useState("desc");

  // ── Build demand maps (expensive — memoised) ──
  const MONTHS_12     = useMemo(() => getMonthRange(12), []);
  const monthlyDemand = useMemo(() => buildMonthlyDemand(salesOrders), [salesOrders]);
  const clientMap     = useMemo(() => buildClientBreakdown(salesOrders), [salesOrders]);
  const weeklyHP      = useMemo(() => buildWeeklyDemand(salesOrders, "HP"),  [salesOrders]);
  const weeklyZPL     = useMemo(() => buildWeeklyDemand(salesOrders, "ZPL"), [salesOrders]);

  // Union of codes from item master + SO history
  const allCodes = useMemo(() => {
    const fromMaster = (itemMasterFG || [])
      .filter((i) => i.type === "Finished Good" || i.type === "Finished Goods")
      .map((i) => i.code)
      .filter(Boolean);
    const fromSOs = Object.keys(monthlyDemand);
    return [...new Set([...fromMaster, ...fromSOs])];
  }, [itemMasterFG, monthlyDemand]);

  // ── Compute one row per product ──
  const rows = useMemo(() => {
    return allCodes.map((code) => {
      const master  = (itemMasterFG || []).find((i) => i.code === code);
      const demMap  = monthlyDemand[code] || {};
      const series  = MONTHS_12.map((m) => demMap[m] || 0);

      const avg3     = rollingAvg(series, 3);
      const avg6     = rollingAvg(series, 6);
      const avg12    = rollingAvg(series, 12);
      const fcast    = weightedForecast(series);
      const sd       = stdDev(series);
      const trend    = getTrend(series);
      const mom      = getMoMPct(series);
      const clients  = clientMap[code] || { HP: 0, ZPL: 0, Others: 0 };

      return {
        code,
        name:     master?.name     || code,
        category: master?.category || "—",
        series,
        avg3, avg6, avg12,
        forecast: fcast,
        lower:    Math.max(0, fcast - sd),
        upper:    fcast + sd,
        sd,
        trend,
        mom,
        hp:      clients.HP,
        zpl:     clients.ZPL,
        others:  clients.Others,
        total:   series.reduce((s, v) => s + v, 0),
        weeklyHP:  weeklyHP[code]  || { 1: 0, 2: 0, 3: 0, 4: 0 },
        weeklyZPL: weeklyZPL[code] || { 1: 0, 2: 0, 3: 0, 4: 0 },
      };
    });
  }, [allCodes, itemMasterFG, monthlyDemand, clientMap, MONTHS_12, weeklyHP, weeklyZPL]);

  // ── Filters + sort ──
  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        if (r.trend === "nodata") return false;
        if (trendFilter !== "all" && r.trend !== trendFilter) return false;
        if (clientFilter === "HP"  && r.hp  === 0) return false;
        if (clientFilter === "ZPL" && r.zpl === 0) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!r.code.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let av = a[sortKey] ?? 0;
        let bv = b[sortKey] ?? 0;
        if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
        if (av === bv) return 0;
        return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
  }, [rows, trendFilter, clientFilter, search, sortKey, sortDir]);

  // ── Summary ──
  const summary = useMemo(() => {
    const active = rows.filter((r) => r.trend !== "nodata");
    return {
      tracked: active.length,
      up:      active.filter((r) => r.trend === "up").length,
      down:    active.filter((r) => r.trend === "down").length,
      stable:  active.filter((r) => r.trend === "stable").length,
      newItem: active.filter((r) => r.trend === "new").length,
    };
  }, [rows]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const thBase = {
    padding: "10px 10px",
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  };

  const tdBase = { padding: "9px 10px", fontSize: 12 };

  const showWeekly = clientFilter === "HP" || clientFilter === "ZPL";
  const weeklyKey  = clientFilter === "HP" ? "weeklyHP" : "weeklyZPL";

  return (
    <div className="fade">
      <SectionTitle
        icon="📈"
        title="Demand Forecast"
        sub="Rolling avg + trend detection · Next-month forecast per SKU from SO history"
      />

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Items Tracked",  value: summary.tracked, color: ACCENT },
          { label: "Trending Up ↑",  value: summary.up,      color: "#22c55e" },
          { label: "Declining ↓",    value: summary.down,    color: "#ef4444" },
          { label: "Stable →",       value: summary.stable,  color: "#f59e0b" },
          { label: "New Items ✦",    value: summary.newItem, color: "#3b82f6" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card style={{ marginBottom: 16, padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            placeholder="Search item code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />

          {/* Trend filter pills */}
          <div style={{ display: "flex", gap: 5 }}>
            {["all", "up", "down", "stable", "new"].map((t) => {
              const active = trendFilter === t;
              const cfg = TREND_CFG[t] || {};
              return (
                <button
                  key={t}
                  onClick={() => setTrendFilter(t)}
                  style={{
                    padding: "5px 13px",
                    borderRadius: 6,
                    border: `1px solid ${active ? (cfg.color || ACCENT) : C.border}`,
                    background: active ? (cfg.bg || ACCENT + "22") : "transparent",
                    color: active ? (cfg.color || ACCENT) : C.muted,
                    fontWeight: 600, fontSize: 11, cursor: "pointer",
                  }}
                >
                  {t === "all" ? "All Trends" : cfg.label}
                </button>
              );
            })}
          </div>

          {/* Client filter pills */}
          <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
            {[
              { id: "all", label: "All Clients",  color: C.muted },
              { id: "HP",  label: "Hyperpure",    color: "#3b82f6" },
              { id: "ZPL", label: "Zepto",        color: "#a855f7" },
            ].map(({ id, label, color }) => {
              const active = clientFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setClientFilter(id)}
                  style={{
                    padding: "5px 13px",
                    borderRadius: 6,
                    border: `1px solid ${active ? color : C.border}`,
                    background: active ? color + "22" : "transparent",
                    color: active ? color : C.muted,
                    fontWeight: 600, fontSize: 11, cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Forecast table ── */}
      <Card>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: C.muted, fontSize: 13 }}>
            No items with demand history match the current filters.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: "block" }}>
              Sales Orders must have a Product Code on line items for forecasting to work.
            </span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {/* Left-aligned text cols */}
                  {[
                    { label: "CODE",  k: "code",  align: "left" },
                    { label: "ITEM",  k: "name",  align: "left" },
                  ].map(({ label, k, align }) => (
                    <SortTh key={k} label={label} k={k} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} style={{ ...thBase, textAlign: align }} />
                  ))}

                  <th style={{ ...thBase, textAlign: "left" }}>TREND</th>
                  <th style={{ ...thBase, textAlign: "right" }}>MoM %</th>

                  {[
                    { label: "3M AVG",  k: "avg3"  },
                    { label: "6M AVG",  k: "avg6"  },
                    { label: "12M AVG", k: "avg12" },
                  ].map(({ label, k }) => (
                    <SortTh key={k} label={label} k={k} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} style={thBase} />
                  ))}

                  <th style={{ ...thBase, textAlign: "right", color: ACCENT, fontSize: 11 }}>
                    ▶ NEXT MONTH FORECAST
                  </th>
                  <th style={{ ...thBase, textAlign: "right" }}>± BAND</th>

                  {showWeekly && [1, 2, 3, 4].map((w) => (
                    <th key={w} style={{ ...thBase, textAlign: "center" }}>WK {w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const tc = TREND_CFG[r.trend] || TREND_CFG.stable;
                  const weekRow = r[weeklyKey];
                  const maxWqty = showWeekly ? Math.max(...[1,2,3,4].map((w) => weekRow[w] || 0)) : 0;

                  return (
                    <tr
                      key={r.code}
                      style={{ borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? "transparent" : "#ffffff04" }}
                    >
                      {/* Code */}
                      <td style={{ ...tdBase, fontFamily: "monospace", fontWeight: 700, color: ACCENT, paddingLeft: 14 }}>
                        {r.code}
                      </td>

                      {/* Name */}
                      <td style={{ ...tdBase, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </td>

                      {/* Trend badge */}
                      <td style={tdBase}>
                        <span style={{
                          background: tc.bg, color: tc.color,
                          borderRadius: 5, padding: "3px 8px",
                          fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                          border: `1px solid ${tc.color}44`,
                        }}>
                          {tc.label}
                        </span>
                      </td>

                      {/* MoM % */}
                      <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, fontFamily: "monospace",
                        color: r.mom == null ? C.muted : r.mom > 0 ? "#22c55e" : r.mom < 0 ? "#ef4444" : C.muted }}>
                        {r.mom == null ? "—" : `${r.mom > 0 ? "+" : ""}${fmtD(r.mom)}%`}
                      </td>

                      {/* Rolling avgs */}
                      {["avg3", "avg6", "avg12"].map((k) => (
                        <td key={k} style={{ ...tdBase, textAlign: "right", color: C.muted }}>
                          {fmt(r[k])}
                        </td>
                      ))}

                      {/* Forecast (highlighted) */}
                      <td style={{ ...tdBase, textAlign: "right" }}>
                        <span style={{
                          fontWeight: 800, fontSize: 15,
                          color: r.forecast > 0 ? "#fff" : C.muted,
                          fontFamily: "monospace",
                        }}>
                          {fmt(r.forecast)}
                        </span>
                        {r.forecast > 0 && (
                          <span style={{ color: C.muted, fontSize: 10, marginLeft: 4 }}>units</span>
                        )}
                      </td>

                      {/* Confidence band */}
                      <td style={{ ...tdBase, textAlign: "right", color: C.muted, fontSize: 11, fontFamily: "monospace" }}>
                        {r.forecast > 0 ? `${fmt(r.lower)} – ${fmt(r.upper)}` : "—"}
                      </td>

                      {/* Weekly heat cells */}
                      {showWeekly && [1, 2, 3, 4].map((w) => (
                        <HeatCell key={w} qty={weekRow[w] || 0} maxQty={maxWqty} />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Weekly pattern legend (shown only when HP/ZPL active) ── */}
      {showWeekly && (
        <div style={{ marginTop: 12, padding: "10px 16px", background: "#111", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
          <b style={{ color: "#999" }}>Weekly Pattern:</b>{" "}
          Columns WK1–WK4 show total ordered qty per week-of-month for{" "}
          <b style={{ color: clientFilter === "HP" ? "#3b82f6" : "#a855f7" }}>
            {clientFilter === "HP" ? "Hyperpure" : "Zepto"}
          </b>{" "}
          orders. Darker cell = higher demand in that week. Use this to anticipate which weeks production needs to front-load.
        </div>
      )}

      {/* ── Methodology note ── */}
      <div style={{ marginTop: 8, padding: "10px 16px", background: "#0d0d0d", borderRadius: 8, border: `1px solid ${C.border}22`, fontSize: 11, color: "#444" }}>
        <b style={{ color: "#555" }}>Model:</b>{" "}
        Forecast = weighted 3-month moving avg (last month 50 % · prior 33 % · two months ago 17 %).
        Band = forecast ± 1σ of monthly series (≈68 % of outcomes fall in range).
        Trend flags: MoM &gt; +20 % = Trending Up · &lt; −20 % = Declining.
        Items with zero SO history are hidden.
      </div>
    </div>
  );
}
