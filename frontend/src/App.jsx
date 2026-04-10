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
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { Toast } from "./components/ui/AdvancedComponents";

// Import all pages
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
  const [session, setSession] = useState(() => {
    const auth = getAuth();
    return auth;
  });

  const handleLogin = (user) => {
    setAuth(user);
    setSession(user);
  };

  const handleLogout = () => {
    setAuth(null);
    setSession(null);
  };

  if (!session) {
    return (
      <AuthProvider>
        <LoginScreen onLogin={handleLogin} />
      </AuthProvider>
    );
  }

  // Get allowed tabs for this user
  const userRole = DEFAULT_ROLES[session.role] || DEFAULT_ROLES["Sales"];
  const allowedTabs = userRole.tabs;
  const editableTabs = session.editableTabs;

  return (
    <AuthProvider>
      <AuthContext.Provider
        value={{
          isAdmin: session.isAdmin,
          editableTabs,
          canEdit: (tabId) =>
            session.isAdmin ||
            editableTabs === null ||
            editableTabs.includes(tabId),
        }}
      >
        <AppInner
          session={session}
          onLogout={handleLogout}
          allowedTabs={allowedTabs}
          editableTabs={editableTabs}
        />
      </AuthContext.Provider>
    </AuthProvider>
  );
}

/**
 * App Inner Component
 * ──────────────────────────────────────────────────────────────────────────
 * Main application with navigation and state management
 */
function AppInner({ session, onLogout, allowedTabs, editableTabs }) {
  const [currentTab, setCurrentTab] = useState(() => {
    // Restore last visited tab from localStorage
    const lastTab = localStorage.getItem("erp_lastTab");
    return lastTab || "dashboard";
  });
  const [toast, setToast] = useState(null);

  // Save current tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("erp_lastTab", currentTab);
  }, [currentTab]);

  // Persisted state for all data collections
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

  // Counters for auto-increment
  const [soCounter, setSoCounter] = usePersistedState("erp_soCounter", {
    SO: 1,
  });
  const [joCounter, setJoCounter] = usePersistedState("erp_joCounter", {
    JO: 1,
  });
  const [poCounter, setPoCounter] = usePersistedState("erp_poCounter", {
    PO: 1,
  });
  const [grnCounter, setGrnCounter] = usePersistedState("erp_grnCounter", {
    GRN: 1,
  });
  const [dispatchCounter, setDispatchCounter] = usePersistedState(
    "erp_dispatchCounter",
    { DISP: 1 },
  );
  const [itemCounters, setItemCounters] = usePersistedState(
    "erp_itemCounters",
    { RM: 1, FG: 1, CG: 1, SP: 1 },
  );

  // Reporting data
  const [machineReportData, setMachineReportData] = usePersistedState(
    "erp_machineReportData",
    {},
  );

  // Inject global styles
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_STYLE;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Helper to show toast notification
  const showToast = (msg, type = "success") => {
    const id = Math.random();
    setToast({ id, msg, type });
  };

  // Data package for page components
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
    poCounter,
    setPoCounter,
    grnCounter,
    setGrnCounter,
    dispatchCounter,
    setDispatchCounter,
    itemCounters,
    setItemCounters,
    machineReportData,
    setMachineReportData,
  };

  // Page routing
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
        return (
          <VendorMaster
            vendorMaster={vendorMaster}
            setVendorMaster={setVendorMaster}
            toast={showToast}
          />
        );
      case "clientmaster":
        return (
          <ClientMaster
            clientMaster={clientMaster}
            setClientMaster={setClientMaster}
            toast={showToast}
          />
        );
      case "sizemaster":
        return (
          <CategoryMaster
            toast={showToast}
          />
        );
      case "itemmaster":
        return <ItemMasterFG {...data} toast={showToast} />;
      case "machinemaster":
        return (
          <MachineMaster
            machineMaster={machineMaster}
            setMachineMaster={setMachineMaster}
          />
        );
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
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        color: C.text,
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

      {/* Main Layout */}
      <div style={{ display: "flex", flex: 1, overflowY: "auto" }}>
        {/* Sidebar Navigation */}
        <div
          style={{
            background: C.surface,
            borderRight: `1px solid ${C.border}`,
            width: 240,
            padding: "16px 0",
            overflowY: "auto",
            maxHeight: "calc(100vh - 80px)",
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
              <span style={{ marginRight: 8 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {renderPage()}
        </div>
      </div>

      {/* Toast Notification */}
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
