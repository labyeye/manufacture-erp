import React, { useState } from "react";
import { C } from "../constants/colors";
import DemandForecast from "./DemandForecast";
import RMForecast from "./RMForecast";

const TABS = [
  { id: "demand", icon: "📈", label: "Demand Forecast" },
  { id: "rm",     icon: "🧮", label: "RM Forecast"     },
];

const ACCENT = "#ff7800";

export default function Forecast({
  salesOrders = [],
  itemMasterFG = [],
  rawStock = [],
  jobOrders = [],
  vendorMaster = [],
  toast,
  refreshData,
}) {
  const [activeTab, setActiveTab] = useState("demand");

  return (
    <div className="fade">
      {/* ── Sub-tab bar ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 0,
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                background: "transparent",
                color: active ? ACCENT : C.muted,
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "demand" && (
        <DemandForecast
          salesOrders={salesOrders}
          itemMasterFG={itemMasterFG}
        />
      )}

      {activeTab === "rm" && (
        <RMForecast
          rawStock={rawStock}
          jobOrders={jobOrders}
          vendorMaster={vendorMaster}
          toast={toast}
          refreshData={refreshData}
        />
      )}
    </div>
  );
}
