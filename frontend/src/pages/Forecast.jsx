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
      {}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
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
                borderRadius: "8px 8px 0 0",
                border: active
                  ? "1px solid rgba(255,120,0,0.5)"
                  : "1px solid rgba(255,255,255,0.12)",
                borderBottom: active ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                background: active
                  ? "rgba(255,120,0,0.15)"
                  : "rgba(255,255,255,0.05)",
                color: active ? "#ff7800" : "#999",
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

      {}
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
