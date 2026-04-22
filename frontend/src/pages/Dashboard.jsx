import React, { useState, useMemo, useEffect } from "react";
import { C, PROCESS_COLORS, STAGES } from "../constants/colors";
import {
  Badge,
  Card,
  SectionTitle,
  ExportBtn,
  DatePicker,
} from "../components/ui/BasicComponents";
import { fmt, today, xlsxDownload, daysSince } from "../utils/helpers";
import * as XLSX from "xlsx";
import { salesOrdersAPI } from "../api/auth";

const ALL_REPORT_TABS = [
  {
    id: "production",
    label: "Production",
    icon: "⚙️",
    roles: ["Admin", "Manager", "Operator", "Production", "Client"],
  },
  {
    id: "operator",
    label: "Operator",
    icon: "👤",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "machine",
    label: "Machine",
    icon: "🏭",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "po_recon",
    label: "PO Recon",
    icon: "🛒",
    roles: ["Admin", "Manager", "Store"],
  },
  {
    id: "so_recon",
    label: "SO Recon",
    icon: "📋",
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
    icon: "📈",
    roles: ["Admin", "Manager", "Production"],
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: "🚛",
    roles: ["Admin", "Manager", "Sales", "Client"],
  },
  {
    id: "low_stock",
    label: "Low Stock",
    icon: "⚠️",
    roles: ["Admin", "Manager", "Store", "Client"],
  },
  { id: "monthly", label: "Monthly", icon: "📅", roles: ["Admin", "Manager"] },
  {
    id: "vendor",
    label: "Vendor",
    icon: "🏭",
    roles: ["Admin", "Manager", "Store"],
  },
];

const TH = {
  padding: "10px 12px",
  background: "#1a1a1e",
  borderBottom: "1px solid #2a2a2e",
  fontSize: 11,
  fontWeight: 700,
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
  fontFamily: "'DM Mono', 'Fira Code', 'Consolas', monospace",
  fontStretch: "normal",
};

export function Dashboard({ data, session, toast }) {
  const userRole = session?.role || "Viewer";

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
      // Exclude Completed/Cancelled
      if (j.status === "Completed" || j.status === "Cancelled") return false;

      // Also exclude if all processes are done or no processes assigned
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
      .map((s) => ({
        name: s.name || s.paperType || "Unnamed RM",
        category: s.category || "Raw Material",
        stock: s.weight || 0,
        reorder: s.reorderLevel || 0,
        unit: "kg",
        type: "RM",
      }));

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
          background: "#1a1a1e",
          color: "#e0e0e0",
          border: "1px solid #2a2a2e",
          borderRadius: 6,
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
          background: "#1a1a1e",
          color: "#e0e0e0",
          border: "1px solid #2a2a2e",
          borderRadius: 6,
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
        background: "#0c0c0e",
        minHeight: "100vh",
        color: "#e0e0e0",
        paddingBottom: 40,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
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
        <span style={{ fontSize: 22 }}>📊</span>
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
              icon: "⚙️",
              tab: "production",
              color: C.yellow,
              trend: trend(prodThis, prodLast),
              unit: "pcs",
            },
            {
              label: "Sales Orders",
              val: soThis,
              icon: "🧾",
              tab: "so_recon",
              color: C.blue,
              trend: trend(soThis, soLast),
              roles: ["Admin", "Manager", "Sales", "Client"],
            },
            {
              label: "Dispatched",
              val: fmt(dispThis),
              icon: "🚛",
              tab: "delivery",
              color: C.purple,
              trend: trend(dispThis, dispLast),
            },
            {
              label: "Active Jobs",
              val: activeJOs.length,
              icon: "📋",
              tab: "production",
              color: C.yellow,
              roles: ["Admin", "Manager", "Production", "Client"],
            },
            {
              label: "Aged Orders",
              val: agedOrders,
              icon: "⏳",
              tab: "so_ageing",
              color: C.orange || "#f97316",
              roles: ["Admin", "Manager", "Sales", "Client"],
            },
            {
              label: "Rejections",
              val: fmt(rejThis),
              icon: "✕",
              tab: "yield",
              color: C.red,
              trend: trend(rejThis, rejLast),
              inverse: true,
              roles: ["Admin", "Manager", "Production"],
            },
            {
              label: "Low Stock",
              val: lowStockItems.length,
              icon: "⚠️",
              tab: "low_stock",
              color: C.red,
            },
          ]
            .filter((card) => !card.roles || card.roles.includes(userRole))
            .map((card) => (
              <div
                key={card.label}
                onClick={() => setReportTab(card.tab)}
                style={{
                  background: "rgba(20, 20, 22, 0.7)",
                  backdropFilter: "blur(10px)",
                  border: `1px solid ${reportTab === card.tab ? card.color : "rgba(255, 255, 255, 0.05)"}`,
                  borderRadius: 16,
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow:
                    reportTab === card.tab
                      ? `0 0 20px ${card.color}22`
                      : "none",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = `0 15px 30px -10px ${card.color}44`;
                  e.currentTarget.style.borderColor = card.color + "66";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    reportTab === card.tab
                      ? `0 0 20px ${card.color}22`
                      : "none";
                  e.currentTarget.style.borderColor =
                    reportTab === card.tab
                      ? card.color
                      : "rgba(255, 255, 255, 0.05)";
                }}
              >
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
                    {card.icon}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    {card.trend && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: card.inverse
                            ? card.trend.isUp
                              ? C.red
                              : C.green
                            : card.trend.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 2,
                        }}
                      >
                        <span style={{ fontSize: 10 }}>
                          {card.trend.isUp ? "▲" : "▼"}
                        </span>
                        {card.trend.val}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 9,
                        color: "#666",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginTop: 2,
                      }}
                    >
                      vs last week
                    </div>
                  </div>
                </div>

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
                    marginTop: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255, 255, 255, 0.03)",
                  }}
                >
                  <div
                    style={{ fontSize: 10, color: "#555", fontStyle: "italic" }}
                  >
                    {card.label === "Low Stock"
                      ? "items below min"
                      : "In production"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: card.color,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: 0.8,
                    }}
                  >
                    Details <span style={{ fontSize: 14 }}>→</span>
                  </div>
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
                        ? "rgba(255, 120, 0, 0.15)"
                        : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${reportTab === t.id ? "#ff7800" : "rgba(255, 255, 255, 0.1)"}`,
                    color: reportTab === t.id ? "#ff7800" : "#999",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: reportTab === t.id ? 700 : 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.2s ease",
                    boxShadow:
                      reportTab === t.id
                        ? "0 4px 15px rgba(255, 120, 0, 0.1)"
                        : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (reportTab !== t.id) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor =
                        "rgba(255, 255, 255, 0.2)";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (reportTab !== t.id) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.02)";
                      e.currentTarget.style.borderColor =
                        "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.color = "#999";
                    }
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ whiteSpace: "nowrap" }}>{t.label} Report</span>
                </button>
              ))}
            </div>
          ));
        })()}
      </div>

      {}
      {reportTab === "production" && (
        <div>
          <div
            style={{
              padding: 20,
              background: "#141416",
              borderRadius: 10,
              border: "1px solid #2a2a2e",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <span style={{ fontSize: 36 }}>⚙️</span>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
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
              fontWeight: 700,
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
                    background: isSelected ? "#1a1a20" : "#141416",
                    border: `1px solid ${isSelected ? C.blue : count > 0 ? C.blue + "55" : "#2a2a2e"}`,
                    borderRadius: 8,
                    padding: 14,
                    cursor: count > 0 ? "pointer" : "default",
                    boxShadow: isSelected ? `0 0 10px ${C.blue}44` : "none",
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
                    style={{ fontSize: 13, fontWeight: 700, margin: "4px 0" }}
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
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #2a2a2e",
                  background: "#141416",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #2a2a2e",
                    fontWeight: 700,
                    color: C.blue,
                  }}
                >
                  Jobs Pending for {selectedProcessPending}
                </div>
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
                    {processPendingMap[selectedProcessPending].map((jo, i) => (
                      <tr
                        key={jo._id || i}
                        style={{
                          background: i % 2 === 0 ? "#0e0e12" : "#121216",
                        }}
                      >
                        <td style={{ ...TD, color: C.yellow, fontWeight: 700 }}>
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
                          style={{ ...TD, color: "#ccc", whiteSpace: "normal" }}
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
                    ))}
                  </tbody>
                </table>
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
              background: "#141416",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #2a2a2e",
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
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
                    ? [
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
                  fontWeight: 700,
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
                  fontWeight: 700,
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
                background: C.accent || "#4CAF50",
                color: "#000",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                height: 38,
              }}
            >
              Generate Report
            </button>
          </div>

          {(reportTab === "operator" && appliedFilters.operator) ||
          (reportTab === "machine" && appliedFilters.machine) ? (
            filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#555" }}>
                No entries found for selected filters.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #2a2a2e",
                }}
              >
                <table style={TABLE}>
                  <colgroup>
                    <col style={{ width: 120 }} />
                    <col style={{ width: "40%" }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 120 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["Date", "Item / JO", "Process", "Qty Done"].map((h) => (
                        <th key={h} style={TH}>
                          {h}
                        </th>
                      ))}
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
                        <td style={TD}>{e.date || "—"}</td>
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
                              fontWeight: 700,
                            }}
                          >
                            {e.stage || "—"}
                          </span>
                        </td>
                        <td style={{ ...TD, color: C.green, fontWeight: 700 }}>
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
              Select {reportTab === "operator" ? "an operator" : "a machine"} to
              view logs
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
            const orderedWt = items.reduce((s, it) => s + +(it.weight || 0), 0);
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
                s + (r.items || []).reduce((a, it) => a + +(it.weight || 0), 0),
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

            const fillRate = orderedWt > 0 ? (receivedWt / orderedWt) * 100 : 0;

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
              <div style={{ textAlign: "center", padding: 60, color: "#555" }}>
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
                  background: "#141416",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid #2a2a2e",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                  { label: "SKUs Ordered", val: stats.skusOrd, color: C.blue },
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
                      background: "#141416",
                      border: `1px solid ${s.color}44`,
                      borderLeft: `4px solid ${s.color}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 24, fontWeight: 900, color: s.color }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
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
                    background: "#141416",
                    border: `1px solid ${C.red}44`,
                    borderLeft: `4px solid ${C.red}`,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.red }}>
                    {stats.overallFill}%
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
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
                    background: "#141416",
                    border: `1px solid ${C.red}44`,
                    borderLeft: `4px solid ${C.red}`,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.red }}>
                    {fmt(stats.pendingWt)} kg
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
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
                  overflow: "hidden",
                  border: "1px solid #2a2a2e",
                }}
              >
                <table style={TABLE}>
                  <colgroup>
                    <col style={{ width: 110 }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 120 }} />
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
                        <td style={{ ...TD }}>
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
                        <td style={TD}>
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
                        <td style={TD}>
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
            dispatchPending: rows.filter((r) => r.status === "Dispatch Pending")
              .length,
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
                  background: "#141416",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid #2a2a2e",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      background: "#141416",
                      border: `1px solid ${s.color}44`,
                      borderLeft: `4px solid ${s.color}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 26, fontWeight: 900, color: s.color }}
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
                    overflow: "hidden",
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
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              maxWidth: 0,
                            }}
                          >
                            {r.itemsStr}
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
                                fontWeight: 700,
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
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ✓ Close SO
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
            const client = d.companyName || d.company || d.customerName || "—";
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
                  background: "#141416",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid #2a2a2e",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                  { label: "Dispatches Today", val: dispToday, color: C.blue },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "#141416",
                      border: `1px solid ${s.color}44`,
                      borderLeft: `4px solid ${s.color}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 26, fontWeight: 900, color: s.color }}
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
                    overflow: "hidden",
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
                          <td style={{ ...TD, color: C.blue, fontWeight: 700 }}>
                            {r.dispNo}
                          </td>
                          <td style={{ ...TD, color: C.green }}>{r.soRef}</td>
                          <td style={{ ...TD, fontWeight: 600 }}>{r.client}</td>
                          <td
                            style={{
                              ...TD,
                              color: "#888",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              maxWidth: 0,
                            }}
                          >
                            {r.itemsStr}
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
                                fontWeight: 700,
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
              const age = daysSince(s.orderDate);
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
                  { label: "8-14 days", rows: bucket(8, 14), color: C.yellow },
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
                      background: "#141416",
                      border: `1px solid ${st.color}44`,
                      borderLeft: `5px solid ${st.color}`,
                      borderRadius: 8,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{ fontSize: 32, fontWeight: 900, color: st.color }}
                    >
                      {st.rows.length}
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}
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
                    overflow: "hidden",
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
                              style={{ ...TD, color: C.green, fontWeight: 700 }}
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
                overflow: "hidden",
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
                          style={{ ...TD, color: target > 0 ? C.blue : "#555" }}
                        >
                          {target > 0 ? fmt(target) : "—"}
                        </td>
                        <td
                          style={{
                            ...TD,
                            fontWeight: 700,
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
                              setPvtTargets((prev) => ({ ...prev, [d]: val }));
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

          return (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 20,
                  alignItems: "flex-end",
                  background: "#141416",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid #2a2a2e",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                      background: "#141416",
                      border: `1px solid ${y.pct > 95 ? C.green : C.yellow}44`,
                      borderTop: `4px solid ${y.pct > 95 ? C.green : C.yellow}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: "#888" }}
                    >
                      {y.stage}
                    </div>
                    <div
                      style={{ fontSize: 30, fontWeight: 900, margin: "8px 0" }}
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
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #2a2a2e",
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
                        <td style={{ ...TD, color: y.rj > 0 ? C.red : "#555" }}>
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
                background: "#141416",
                borderRadius: 8,
                border: "1px solid #2a2a2e",
              }}
            >
              ✅ All items are within healthy stock levels.
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                {low.length} items below reorder level
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
                      fontWeight: 700,
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
              </div>

              <div
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #2a2a2e",
                }}
              >
                <table style={TABLE}>
                  <colgroup>
                    <col style={{ width: "35%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        "Item Name",
                        "Category",
                        "Current Stock",
                        "Reorder Level",
                        "Status",
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
                      .map((f, i) => (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? "#0e0e12" : "#121216",
                          }}
                        >
                          <td style={{ ...TD, fontWeight: 700 }}>{f.name}</td>
                          <td style={{ ...TD, color: "#888" }}>{f.category}</td>
                          <td style={{ ...TD, color: C.red, fontWeight: 800 }}>
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
                        </tr>
                      ))}
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
                    fontWeight: 700,
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
                    background: "#141416",
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
                  { label: "Total Rejected", val: fmt(totalRej), color: C.red },
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
                      background: "#141416",
                      border: `1px solid ${s.color}44`,
                      borderLeft: `4px solid ${s.color}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 26, fontWeight: 900, color: s.color }}
                    >
                      {s.val}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #2a2a2e",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#1a1a1e",
                    fontSize: 11,
                    fontWeight: 700,
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
                      {["Process", "Produced", "Rejected", "Yield", "Bar"].map(
                        (h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ),
                      )}
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
                        ok + rj > 0 ? Math.round((ok / (ok + rj)) * 100) : 100;
                      return (
                        <tr
                          key={proc}
                          style={{
                            background: i % 2 === 0 ? "#0e0e12" : "#121216",
                          }}
                        >
                          <td style={{ ...TD, fontWeight: 700 }}>{proc}</td>
                          <td style={{ ...TD, color: C.green }}>{fmt(ok)}</td>
                          <td style={{ ...TD, color: rj > 0 ? C.red : "#555" }}>
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
                    overflow: "hidden",
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#1a1a1e",
                      fontSize: 11,
                      fontWeight: 700,
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
                        {["JO #", "Item", "Status", "Ordered Qty"].map((h) => (
                          <th key={h} style={TH}>
                            {h}
                          </th>
                        ))}
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
                            style={{ ...TD, color: C.yellow, fontWeight: 700 }}
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
                                  j.status === "Completed" ? C.green : C.yellow,
                                fontSize: 11,
                                fontWeight: 700,
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

          const vRows = Object.values(vendorMap)
            .map((v) => {
              const ordQty = v.pos.reduce(
                (s, p) =>
                  s +
                  (p.items || []).reduce(
                    (sa, it) => sa + +(it.qty || it.quantity || 0),
                    0,
                  ),
                0,
              );
              const ordAmt = v.pos.reduce(
                (s, p) => s + +(p.totalAmount || p.total || p.amount || 0),
                0,
              );
              const recQty = v.grns.reduce(
                (s, g) =>
                  s +
                  (g.items || []).reduce(
                    (sa, it) => sa + +(it.qty || it.quantity || 0),
                    0,
                  ),
                0,
              );
              const openPOs = v.pos.filter(
                (p) =>
                  p.status !== "Received" &&
                  p.status !== "Closed" &&
                  p.status !== "Completed",
              ).length;
              const pendQty = Math.max(0, ordQty - recQty);
              const fulfillRate =
                ordQty > 0 ? Math.round((recQty / ordQty) * 100) : 0;
              return {
                name: v.name,
                poCount: v.pos.length,
                grnCount: v.grns.length,
                ordQty,
                ordAmt,
                recQty,
                pendQty,
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

          return (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 20,
                  alignItems: "flex-end",
                  background: "#141416",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid #2a2a2e",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
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
                      fontWeight: 700,
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
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Unique Vendors (from POs)",
                    val: uniqueVendors,
                    color: C.blue,
                  },
                  {
                    label: "Total Purchase Orders",
                    val: totalPOs,
                    color: C.blue,
                  },
                  {
                    label: "Total GRNs Received",
                    val: totalGRNs,
                    color: C.green,
                  },
                  {
                    label: "Open / Pending POs",
                    val: pendingPOs,
                    color: C.red,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "#141416",
                      border: `1px solid ${s.color}44`,
                      borderLeft: `4px solid ${s.color}`,
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 26, fontWeight: 900, color: s.color }}
                    >
                      {s.val}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
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
                    overflow: "hidden",
                    border: "1px solid #2a2a2e",
                  }}
                >
                  <table style={TABLE}>
                    <colgroup>
                      <col style={{ width: "22%" }} />
                      <col style={{ width: 60 }} />
                      <col style={{ width: 60 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 80 }} />
                      <col style={{ width: 100 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          "Vendor",
                          "POs",
                          "GRNs",
                          "Ordered Qty",
                          "Received Qty",
                          "Pending Qty",
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
                          <td style={{ ...TD, fontWeight: 700 }}>{r.name}</td>
                          <td style={{ ...TD, color: C.blue, fontWeight: 700 }}>
                            {r.poCount}
                          </td>
                          <td
                            style={{ ...TD, color: C.green, fontWeight: 700 }}
                          >
                            {r.grnCount}
                          </td>
                          <td style={TD}>{fmt(r.ordQty)}</td>
                          <td style={{ ...TD, color: C.green }}>
                            {fmt(r.recQty)}
                          </td>
                          <td
                            style={{
                              ...TD,
                              color: r.pendQty > 0 ? C.red : C.green,
                            }}
                          >
                            {fmt(r.pendQty)}
                          </td>
                          <td
                            style={{
                              ...TD,
                              color: r.openPOs > 0 ? C.yellow : "#555",
                              fontWeight: 700,
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
    </div>
  );
}
