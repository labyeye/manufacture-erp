import React, { useState } from "react";
import { C, PROCESS_COLORS, PROCESS_ICONS } from "../constants/colors";
import { Card, SectionTitle, Badge } from "../components/ui/BasicComponents";
import { SHEET_STAGES, FORMATION_STAGES_QTY } from "../constants/seedData";
const STAGES = [...SHEET_STAGES, ...FORMATION_STAGES_QTY];
import { today, fmt, daysSince } from "../utils/helpers";









export function Dashboard({
  data,
  onNavigate,
  machineReportData,
  setMachineReportData,
}) {
  const {
    jobOrders,
    machineMaster,
    purchaseOrders,
    inward,
    salesOrders,
    dispatches,
    rawStock,
    fgStock,
    itemMasterFG,
  } = data;

  const [reportTab, setReportTab] = useState("production");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [drill, setDrill] = useState(null);
  const [selMachineId, setSelMachineId] = useState("");
  const [selOperator, setSelOperator] = useState("");

  
  const { activeJOs, processPendingMap, totalActiveJOs } = React.useMemo(() => {
    const activeJOs = jobOrders.filter(
      (j) => j.status !== "Completed" && j.status !== "Cancelled",
    );
    const processPendingMap = {};
    STAGES.forEach((proc) => {
      processPendingMap[proc] = activeJOs.filter((j) => {
        const jobProcs = j.process || [];
        if (!jobProcs.includes(proc)) return false;
        if ((j.completedProcesses || []).includes(proc)) return false;
        const orderedJobProcs = STAGES.filter((p) => jobProcs.includes(p));
        const procIdx = orderedJobProcs.indexOf(proc);
        if (procIdx <= 0) return true;
        return orderedJobProcs
          .slice(0, procIdx)
          .every((p) => (j.completedProcesses || []).includes(p));
      });
    });
    return { activeJOs, processPendingMap, totalActiveJOs: activeJOs.length };
  }, [jobOrders]);

  return (
    <div className="fade">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          📊 Production Dashboard
        </h2>
      </div>

      {}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
        }}
      >
        {[
          ["production", "⚙️ Production Report"],
          ["operator", "👤 Operator Report"],
          ["machine", "🏭 Machine Report"],
          ["po_recon", "🛒 PO Reconciliation"],
          ["so_recon", "📋 SO Reconciliation"],
          ["so_ageing", "⏳ SO Ageing"],
          ["prod_target", "🎯 Prod vs Target"],
          ["yield", "📈 Yield Tracking"],
          ["delivery", "🚛 Delivery Status"],
          ["low_stock", "⚠️ Low Stock"],
          ["monthly", "📅 Monthly Summary"],
          ["vendor", "🏭 Vendor Performance"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => {
              setReportTab(v);
              setDrill(null);
            }}
            style={{
              padding: "9px 20px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 700,
              fontSize: 13,
              border: `1px solid ${reportTab === v ? C.accent : C.border}`,
              borderBottom:
                reportTab === v
                  ? `1px solid ${C.card}`
                  : `1px solid ${C.border}`,
              background: reportTab === v ? C.card : "transparent",
              color: reportTab === v ? C.accent : C.muted,
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {}
      {reportTab === "production" && (
        <div>
          <SectionTitle
            icon="⚙️"
            title="Active Production"
            sub="Open orders and pending work by process"
          />

          {}
          <div
            onClick={() => setDrill("open_orders")}
            style={{
              background: C.card,
              border: `2px solid ${C.yellow}44`,
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 24,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "border-color .2s, background .2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.yellow;
              e.currentTarget.style.background = C.yellow + "0d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.yellow + "44";
              e.currentTarget.style.background = C.card;
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 36 }}>⚙️</span>
              <div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: C.yellow,
                    fontFamily: "'JetBrains Mono',monospace",
                    lineHeight: 1,
                  }}
                >
                  {totalActiveJOs}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.text,
                    marginTop: 4,
                  }}
                >
                  Open Orders
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  Active job orders in production
                </div>
              </div>
            </div>
            <div style={{ color: C.yellow, fontSize: 22 }}>→</div>
          </div>

          {}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 14,
            }}
          >
            Pending by Process
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            {STAGES.map((proc) => {
              const jobs = processPendingMap[proc] || [];
              const col = PROCESS_COLORS[proc];
              const isEmpty = jobs.length === 0;

              const ages = jobs.map((j) => {
                const slot = (j.schedule || []).find((s) => s.process === proc);
                const refDate =
                  slot?.startDate || j.jobcardDate || j.date || "";
                if (!refDate) return 0;
                // Ensure refDate is a serializable string for daysSince
                const d = typeof refDate === 'string' ? refDate : new Date(refDate).toISOString();
                return daysSince(d);
              });
              const maxAge = ages.length > 0 ? Math.max(...ages) : 0;
              const ageCol =
                maxAge > 7 ? C.red : maxAge > 3 ? C.yellow : C.green;
              const ageLabel =
                maxAge === 0
                  ? "Today"
                  : maxAge === 1
                    ? "1 day"
                    : `${maxAge} days`;

              return (
                <div
                  key={proc}
                  onClick={() => !isEmpty && setDrill(proc)}
                  style={{
                    background: C.card,
                    border: `1px solid ${isEmpty ? C.border : col + "44"}`,
                    borderLeft: `4px solid ${isEmpty ? C.border : col}`,
                    borderRadius: 10,
                    padding: "16px 18px",
                    cursor: isEmpty ? "default" : "pointer",
                    opacity: isEmpty ? 0.55 : 1,
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isEmpty) {
                      e.currentTarget.style.background = col + "0d";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.card;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 800,
                          color: isEmpty ? C.border : col,
                          fontFamily: "'JetBrains Mono',monospace",
                          lineHeight: 1,
                        }}
                      >
                        {jobs.length}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isEmpty ? C.muted : C.text,
                          marginTop: 6,
                        }}
                      >
                        {proc}
                      </div>
                      <div
                        style={{ fontSize: 11, color: C.muted, marginTop: 2 }}
                      >
                        {isEmpty
                          ? "All clear"
                          : `job${jobs.length !== 1 ? "s" : ""} pending`}
                      </div>
                    </div>
                    <span style={{ fontSize: 26, opacity: isEmpty ? 0.4 : 1 }}>
                      {PROCESS_ICONS[proc]}
                    </span>
                  </div>
                  {!isEmpty && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: col, fontWeight: 700 }}
                      >
                        Click to view →
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: ageCol,
                          background: ageCol + "22",
                          borderRadius: 4,
                          padding: "2px 7px",
                          border: `1px solid ${ageCol}44`,
                        }}
                      >
                        ⏱ {ageLabel} max
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {}
      {reportTab === "operator" && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          👤 Operator Report - Coming Soon
        </Card>
      )}
      {reportTab === "machine" && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          🏭 Machine Report - Coming Soon
        </Card>
      )}
      {reportTab === "po_recon" && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          🛒 PO Reconciliation - Coming Soon
        </Card>
      )}
      {reportTab === "so_recon" && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          📋 SO Reconciliation - Coming Soon
        </Card>
      )}

      {}
      {drill === "open_orders" && (
        <div className="fade" style={{ marginTop: 20 }}>
          <button
            onClick={() => setDrill(null)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 6,
              padding: "6px 14px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            ← Back
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
            All Open Orders{" "}
            <Badge label={`${totalActiveJOs} jobs`} color={C.yellow} />
          </h2>
          <div
            style={{
              textAlign: "center",
              color: C.muted,
              padding: "60px 20px",
            }}
          >
            Job details will be displayed here when implemented
          </div>
        </div>
      )}
    </div>
  );
}
