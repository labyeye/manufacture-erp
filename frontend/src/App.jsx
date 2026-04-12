import React, { useState, useEffect } from "react";
import { GLOBAL_STYLE } from "./constants/styles";
import { C } from "./constants/colors";
import {
  SEED_VERSION,
  TRANSACTION_KEYS,
  DEFAULT_ROLES,
  TABS,
  SEED_MACHINES,
} from "./constants/seedData";
import {
  getAuth,
  setAuth,
  getUsers,
  setUsers,
  getRoles,
  setRoles,
  usePersistedState,
} from "./utils/helpers";
import {
  materialInwardAPI,
  rawMaterialStockAPI,
  fgStockAPI,
  vendorMasterAPI,
  clientMasterAPI,
  categoryMasterAPI,
  itemMasterAPI,
  machineMasterAPI,
  jobOrdersAPI,
  salesOrdersAPI,
  purchaseOrdersAPI,
  dispatchAPI, // ✅ FIX: was missing — caused silent crash in fetchMasters
} from "./api/auth";
import { AuthContext, AuthProvider, useAuth } from "./context/AuthContext";
import { Toast } from "./components/ui/AdvancedComponents";

import { Dashboard } from "./pages/Dashboard";
import MaterialInward from "./pages/MaterialInward";
import SalesOrders from "./pages/SalesOrders";
import JobOrders from "./pages/JobOrders";
import ProductionUpdate from "./pages/ProductionUpdate";
import Dispatch from "./pages/Dispatch";
import ConsumableStock from "./pages/ConsumableStock";
import PurchaseOrders from "./pages/PurchaseOrders";
import VendorMaster from "./pages/VendorMaster";
import ClientMaster from "./pages/ClientMaster";
import CategoryMaster from "./pages/CategoryMaster";
import MachineMaster from "./pages/MachineMaster";
import ItemMasterFG from "./pages/ItemMaster";
import { GlobalSearch } from "./pages/GlobalSearch";
import ProductionCalendar from "./pages/ProductionCalendar";
import { LoginScreen } from "./pages/Auth";
import UserManagement from "./pages/UserManagement";
import PrintingDetailMaster from "./pages/PrintingDetailMaster";
import RMStock from "./pages/RMStock";
import FGStock from "./pages/FGStock";

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_STYLE;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
          color: C.text,
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 40, animation: "bounce 1s infinite" }}>🏭</div>
        <div style={{ fontWeight: 600, letterSpacing: 1 }}>
          LOADING SYSTEM...
        </div>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const userRole = DEFAULT_ROLES[user.role] || DEFAULT_ROLES["Sales"];
  const allowedTabs = userRole.tabs;

  return (
    <AppInner session={user} onLogout={logout} allowedTabs={allowedTabs} />
  );
}

function AppInner({ session, onLogout, allowedTabs }) {
  const [currentTab, setCurrentTab] = useState(() => {
    const lastTab = localStorage.getItem("erp_lastTab");
    return lastTab || "dashboard";
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem("erp_lastTab", currentTab);
  }, [currentTab]);

  const [salesOrders, setSalesOrders] = usePersistedState(
    "erp_salesOrders",
    [],
  );
  const [jobOrders, setJobOrders] = usePersistedState("erp_jobOrders", []);
  const [purchaseOrders, setPurchaseOrders] = usePersistedState(
    "erp_purchaseOrders",
    [],
  );
  const [inward, setInward] = usePersistedState("erp_inward", []);
  const [rawStock, setRawStock] = usePersistedState("erp_rawStock", []);
  const [wipStock, setWipStock] = usePersistedState("erp_wipStock", []);
  const [fgStock, setFgStock] = usePersistedState("erp_fgStock", []);
  const [consumableStock, setConsumableStock] = usePersistedState(
    "erp_consumableStock",
    [],
  );
  const [dispatches, setDispatches] = usePersistedState("erp_dispatches", []);
  const [itemMasterFG, setItemMasterFG] = usePersistedState(
    "erp_itemMasterFG",
    [],
  );
  const [vendorMaster, setVendorMaster] = usePersistedState(
    "erp_vendorMaster",
    [],
  );
  const [clientMaster, setClientMaster] = usePersistedState(
    "erp_clientMaster",
    [],
  );
  const [machineMaster, setMachineMaster] = usePersistedState(
    "erp_machineMaster",
    SEED_MACHINES,
  );
  const [categoryMaster, setCategoryMaster] = usePersistedState(
    "erp_categoryMaster",
    {},
  );
  const [sizeMaster, setSizeMaster] = usePersistedState("erp_sizeMaster", {});
  const [printingMaster, setPrintingMaster] = usePersistedState(
    "erp_printingMaster",
    [],
  );

  const [soCounter, setSoCounter] = usePersistedState("erp_soCounter", {
    SO: 1,
  });
  const [joCounter, setJoCounter] = usePersistedState("erp_joCounter", {
    JO: 1,
  });
  const [dispatchCounter, setDispatchCounter] = usePersistedState(
    "erp_dispatchCounter",
    { DISP: 1 },
  );
  const [itemCounters, setItemCounters] = usePersistedState(
    "erp_itemCounters",
    { RM: 1, FG: 1, CG: 1, SP: 1 },
  );
  const [machineReportData, setMachineReportData] = usePersistedState(
    "erp_machineReportData",
    {},
  );

  useEffect(() => {
    fetchMasters();
  }, []); // ✅ FIX: was [currentTab] — now fetches once on mount, not on every tab switch

  // ✅ FIX: robust unwrap handles any API response shape
  const unwrap = (val, ...keys) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    // Try each provided key
    for (const key of keys) {
      if (val[key] && Array.isArray(val[key])) return val[key];
    }
    // Try common wrapper keys
    for (const key of ["data", "records", "result", "results", "list"]) {
      if (val[key] && Array.isArray(val[key])) return val[key];
    }
    // Last resort: first array value in object
    const firstArr = Object.values(val).find((v) => Array.isArray(v));
    if (firstArr) return firstArr;
    return [];
  };

  const fetchMasters = async () => {
    try {
      const results = await Promise.allSettled([
        vendorMasterAPI.getAll(), // 0
        clientMasterAPI.getAll(), // 1
        categoryMasterAPI.getAll(), // 2
        itemMasterAPI.getAll(), // 3
        rawMaterialStockAPI.getAll(), // 4
        machineMasterAPI.getAll(), // 5
        fgStockAPI.getAll(), // 6
        jobOrdersAPI.getAll(), // 7
        salesOrdersAPI.getAll(), // 8
        purchaseOrdersAPI.getAll(), // 9
        dispatchAPI.getAll(), // 10  ✅ FIX: dispatchAPI now imported properly
        materialInwardAPI.getAll(), // 11
      ]);

      const get = (i) =>
        results[i].status === "fulfilled" ? results[i].value : null;

      const vendors = get(0);
      const clients = get(1);
      const categories = get(2);
      const items = get(3);
      const stocks = get(4);
      const machines = get(5);
      const fgStockData = get(6);
      const jos = get(7);
      const sos = get(8);
      const pos = get(9);
      const disp = get(10);
      const inw = get(11);

      // ✅ FIX: pass all likely key names so unwrap finds the data
      if (vendors) setVendorMaster(unwrap(vendors, "vendors", "vendor"));
      if (clients) setClientMaster(unwrap(clients, "clients", "client"));
      if (categories)
        setCategoryMaster(unwrap(categories, "categories", "category"));
      if (items) setItemMasterFG(unwrap(items, "items", "item"));
      if (machines) setMachineMaster(unwrap(machines, "machines", "machine"));
      if (jos) setJobOrders(unwrap(jos, "jobOrders", "jobs", "job_orders"));
      if (sos)
        setSalesOrders(
          unwrap(sos, "salesOrders", "orders", "sales_orders", "so"),
        );
      if (pos)
        setPurchaseOrders(
          unwrap(pos, "purchaseOrders", "orders", "purchase_orders", "po"),
        );
      if (disp)
        setDispatches(unwrap(disp, "dispatches", "dispatch", "deliveries"));
      if (inw)
        setInward(unwrap(inw, "inwards", "inward", "grn", "material_inward"));

      if (stocks) setRawStock(unwrap(stocks, "stock", "stocks", "rawStock"));
      if (fgStockData)
        setFgStock(unwrap(fgStockData, "stock", "stocks", "fgStock"));
    } catch (err) {
      console.error("Global fetch error:", err);
    }
  };

  const showToast = (msg, type = "success") => {
    const id = Math.random();
    setToast({ id, msg, type });
  };

  const data = {
    salesOrders,
    setSalesOrders,
    jobOrders,
    setJobOrders,
    purchaseOrders,
    setPurchaseOrders,
    inward,
    setInward,
    rawStock,
    setRawStock,
    wipStock,
    setWipStock,
    fgStock,
    setFgStock,
    consumableStock,
    setConsumableStock,
    dispatches,
    setDispatches,
    itemMasterFG,
    setItemMasterFG,
    vendorMaster,
    setVendorMaster,
    clientMaster,
    setClientMaster,
    machineMaster,
    setMachineMaster,
    categoryMaster,
    setCategoryMaster,
    sizeMaster,
    setSizeMaster,
    printingMaster,
    setPrintingMaster,
    soCounter,
    setSoCounter,
    joCounter,
    setJoCounter,
    dispatchCounter,
    setDispatchCounter,
    itemCounters,
    setItemCounters,
    machineReportData,
    setMachineReportData,
    refreshData: fetchMasters,
  };

  const renderPage = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard
            data={data}
            onNavigate={setCurrentTab}
            machineReportData={machineReportData}
            setMachineReportData={setMachineReportData}
          />
        );
      case "search":
        return (
          <GlobalSearch
            salesOrders={salesOrders}
            jobOrders={jobOrders}
            purchaseOrders={purchaseOrders}
            inward={inward}
            fgStock={fgStock}
            rawStock={rawStock}
            dispatches={dispatches}
            clientMaster={clientMaster}
          />
        );
      case "purchase":
        return <PurchaseOrders {...data} />;
      case "inward":
        return <MaterialInward {...data} toast={showToast} />;
      case "sales":
        return <SalesOrders {...data} toast={showToast} />;
      case "jobs":
        return <JobOrders {...data} toast={showToast} />;
      case "production":
        return <ProductionUpdate {...data} toast={showToast} />;
      case "printingmaster":
        return <PrintingDetailMaster {...data} toast={showToast} />;
      case "calendar":
        return <ProductionCalendar {...data} />;
      case "dispatch":
        return <Dispatch {...data} toast={showToast} />;
      case "rawstock":
        return <RMStock {...data} toast={showToast} />;
      case "fg":
        return <FGStock {...data} toast={showToast} />;
      case "consumablestock":
        return <ConsumableStock {...data} toast={showToast} />;
      case "vendormaster":
        return <VendorMaster toast={showToast} />;
      case "clientmaster":
        return <ClientMaster toast={showToast} />;
      case "sizemaster":
        return <CategoryMaster toast={showToast} />;
      case "itemmaster":
        return <ItemMasterFG toast={showToast} />;
      case "machinemaster":
        return <MachineMaster toast={showToast} />;
      case "users":
        return <UserManagement currentUser={session} toast={showToast} />;
      default:
        return (
          <Dashboard
            data={data}
            onNavigate={setCurrentTab}
            machineReportData={machineReportData}
            setMachineReportData={setMachineReportData}
          />
        );
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        color: C.text,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🏭</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              Manufacturing ERP
            </h1>
            <p
              style={{ fontSize: 11, color: C.muted, margin: 0, marginTop: 2 }}
            >
              Production & Inventory
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            👤 {session.username}{" "}
            <span style={{ color: C.accent, fontWeight: 700 }}>
              ({session.role})
            </span>
          </span>
          <button
            onClick={onLogout}
            style={{
              background: C.red + "22",
              color: C.red,
              border: `1px solid ${C.red}44`,
              borderRadius: 6,
              padding: "6px 14px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            background: C.surface,
            borderRight: `1px solid ${C.border}`,
            width: 240,
            padding: "16px 0",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            maxHeight: "100%",
          }}
        >
          {TABS.filter((tab) => allowedTabs.includes(tab.id)).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                width: "100%",
                padding: "12px 16px",
                textAlign: "left",
                border: "none",
                background: currentTab === tab.id ? C.card : "transparent",
                color: currentTab === tab.id ? C.accent : C.muted,
                borderLeft:
                  currentTab === tab.id
                    ? `3px solid ${C.accent}`
                    : "3px solid transparent",
                cursor: "pointer",
                transition: "all .15s",
                fontSize: 13,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                if (currentTab !== tab.id)
                  e.currentTarget.style.background = C.border + "22";
              }}
              onMouseLeave={(e) => {
                if (currentTab !== tab.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  marginRight: 12,
                  width: 20,
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {renderPage()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
