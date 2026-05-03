import React, { useState, useEffect, useMemo } from "react";
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
  categoryMasterAPI,
  itemMasterAPI,
  machineMasterAPI,
  jobOrdersAPI,
  salesOrdersAPI,
  purchaseOrdersAPI,
  dispatchAPI,
  companyMasterAPI,
  consumableStockAPI,
  priceListAPI,
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
import CompanyMaster from "./pages/CompanyMaster";
import BrandMaster from "./pages/BrandMaster";
import MachineTools from "./pages/MachineTools";
import PriceMaster from "./pages/PriceMaster";
import Forecast from "./pages/Forecast";
import Subcontracting from "./pages/Subcontracting";
import QualityHub from "./pages/QualityHub";
import DesignHub from "./pages/DesignHub";
import NotificationHub from "./pages/NotificationHub";

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
  let allowedTabs = userRole.tabs;
  let editableTabs = userRole.tabs;

  if (user.role !== "Admin") {
    if (user.allowedTabs && user.allowedTabs.length > 0) {
      allowedTabs = user.allowedTabs;
    }
    if (user.editableTabs && user.editableTabs.length > 0) {
      editableTabs = user.editableTabs;
    } else {
      editableTabs = user.editableTabs || userRole.tabs;
    }
  }

  return (
    <AppInner
      session={user}
      onLogout={logout}
      allowedTabs={allowedTabs}
      editableTabs={editableTabs}
    />
  );
}

function AppInner({ session, onLogout, allowedTabs, editableTabs }) {
  const [currentTab, setCurrentTab] = useState(() => {
    const lastTab = localStorage.getItem("erp_lastTab");
    return lastTab || "dashboard";
  });
  const [deepLink, setDeepLink] = useState(null);
  const [toast, setToast] = useState(null);

  const handleNavigate = (tab, recordId) => {
    setCurrentTab(tab);
    setDeepLink(recordId ? { tab, recordId } : null);
  };

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
  const [companyMaster, setCompanyMaster] = usePersistedState(
    "erp_companyMaster",
    [],
  );
  const [priceList, setPriceList] = usePersistedState("erp_priceList", []);

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
  }, []);

  const unwrap = (val, ...keys) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;

    for (const key of keys) {
      if (val[key] && Array.isArray(val[key])) return val[key];
    }

    for (const key of ["data", "records", "result", "results", "list"]) {
      if (val[key] && Array.isArray(val[key])) return val[key];
    }

    const firstArr = Object.values(val).find((v) => Array.isArray(v));
    if (firstArr) return firstArr;
    return [];
  };

  const fetchMasters = async () => {
    const run = async (apiCall, setter, ...keys) => {
      try {
        const res = await apiCall();
        if (res) setter(unwrap(res, ...keys));
        return res;
      } catch (err) {
        console.error(`Fetch error for ${keys[0] || "unknown"}:`, err);
      }
    };

    await Promise.all([
      run(vendorMasterAPI.getAll, setVendorMaster, "vendors", "vendor"),
      run(
        categoryMasterAPI.getAll,
        setCategoryMaster,
        "categories",
        "category",
      ),
      run(itemMasterAPI.getAll, setItemMasterFG, "items", "item"),
      run(
        rawMaterialStockAPI.getAll,
        setRawStock,
        "stock",
        "stocks",
        "rawStock",
      ),
      run(machineMasterAPI.getAll, setMachineMaster, "machines", "machine"),
      run(fgStockAPI.getAll, setFgStock, "stock", "stocks", "fgStock"),
      run(jobOrdersAPI.getAll, setJobOrders, "jobOrders", "jobs", "job_orders"),
      run(
        salesOrdersAPI.getAll,
        setSalesOrders,
        "salesOrders",
        "orders",
        "sales_orders",
        "so",
      ),
      run(
        purchaseOrdersAPI.getAll,
        setPurchaseOrders,
        "purchaseOrders",
        "orders",
        "purchase_orders",
      ),
      run(
        dispatchAPI.getAll,
        setDispatches,
        "dispatches",
        "dispatch",
        "deliveries",
      ),
      run(
        materialInwardAPI.getAll,
        setInward,
        "inwards",
        "inward",
        "grn",
        "material_inward",
      ),
      run(
        companyMasterAPI.getAll,
        setCompanyMaster,
        "companies",
        "company",
        "entities",
      ),
      run(
        consumableStockAPI.getAll,
        setConsumableStock,
        "stock",
        "stocks",
        "consumableStock",
      ),
      run(priceListAPI.getAll, setPriceList, "priceLists", "priceList"),
    ]);
  };

  const showToast = (msg, type = "success") => {
    setToast({ id: Date.now(), msg, type });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCurrentTab("search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const matchesClient = (stockItem, tag) => {
    if (!tag) return true;

    if (stockItem.companyCat === tag) return true;

    const item = itemMasterFG.find((i) => i.code === stockItem.itemCode);
    return item?.clientCategory === tag;
  };

  const filteredData = useMemo(() => {
    const isClient = session.role === "Client";
    const tag = session.clientTag;

    if (!isClient || !tag) {
      return {
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
        companyMaster,
        setCompanyMaster,
        priceList,
        editableTabs,
        allowedTabs,
        currentTab,
        refreshData: fetchMasters,
      };
    }

    const filteredFG = fgStock.filter((s) => matchesClient(s, tag));
    const filteredItemMaster = itemMasterFG.filter(
      (i) => i.clientCategory === tag,
    );
    const filteredCodes = new Set(filteredItemMaster.map((i) => i.code));

    return {
      salesOrders: salesOrders.filter((so) =>
        (so.items || []).some((it) => filteredCodes.has(it.productCode)),
      ),
      jobOrders: jobOrders.filter((jo) => filteredCodes.has(jo.productCode)),
      purchaseOrders: [],
      setPurchaseOrders,
      inward: [],
      setInward,
      rawStock: [],
      setRawStock,
      wipStock: [],
      setWipStock,
      fgStock: filteredFG,
      setFgStock,
      consumableStock: [],
      setConsumableStock,
      dispatches: dispatches.filter((d) =>
        (d.items || []).some((it) =>
          filteredCodes.has(it.productCode || it.code),
        ),
      ),
      setDispatches,
      itemMasterFG: filteredItemMaster,
      setItemMasterFG,
      vendorMaster: [],
      setVendorMaster,
      machineMaster,
      setMachineMaster,
      categoryMaster,
      setCategoryMaster,
      sizeMaster,
      setSizeMaster,
      printingMaster: [],
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
      companyMaster,
      setCompanyMaster,
      priceList,
      editableTabs,
      allowedTabs,
      currentTab,
      refreshData: fetchMasters,
    };
  }, [
    session,
    salesOrders,
    jobOrders,
    purchaseOrders,
    inward,
    rawStock,
    wipStock,
    fgStock,
    consumableStock,
    dispatches,
    itemMasterFG,
    vendorMaster,
    machineMaster,
    categoryMaster,
    sizeMaster,
    printingMaster,
    companyMaster,
    priceList,
  ]);

  const data = filteredData;

  const renderPage = () => {
    console.log("Current Tab:", currentTab);
    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard
            data={data}
            session={session}
            onNavigate={setCurrentTab}
            machineReportData={machineReportData}
            setMachineReportData={setMachineReportData}
          />
        );
      case "search":
        return (
          <GlobalSearch
            salesOrders={data.salesOrders}
            jobOrders={data.jobOrders}
            purchaseOrders={data.purchaseOrders}
            inward={data.inward}
            fgStock={data.fgStock}
            rawStock={data.rawStock}
            dispatches={data.dispatches}
            consumableStock={data.consumableStock}
            vendorMaster={data.vendorMaster}
            companyMaster={data.companyMaster}
            itemMasterFG={data.itemMasterFG}
            machineMaster={data.machineMaster}
            priceList={data.priceList}
            printingMaster={data.printingMaster}
            categoryMaster={data.categoryMaster}
            onNavigate={handleNavigate}
          />
        );
      case "purchase":
        return <PurchaseOrders {...data} deepLinkId={deepLink?.tab === "purchase" ? deepLink.recordId : null} onDeepLinkConsumed={() => setDeepLink(null)} />;
      case "inward":
        return <MaterialInward {...data} toast={showToast} deepLinkId={deepLink?.tab === "inward" ? deepLink.recordId : null} onDeepLinkConsumed={() => setDeepLink(null)} />;
      case "sales":
        return <SalesOrders {...data} session={session} toast={showToast} deepLinkId={deepLink?.tab === "sales" ? deepLink.recordId : null} onDeepLinkConsumed={() => setDeepLink(null)} />;
      case "jobs":
        return <JobOrders {...data} toast={showToast} deepLinkId={deepLink?.tab === "jobs" ? deepLink.recordId : null} onDeepLinkConsumed={() => setDeepLink(null)} />;
      case "production":
        return <ProductionUpdate {...data} toast={showToast} />;
      case "printingmaster":
        return <PrintingDetailMaster {...data} toast={showToast} />;
      case "calendar":
        return <ProductionCalendar {...data} toast={showToast} />;
      case "subcontracting":
        return (
          <Subcontracting
            jobOrders={data.jobOrders}
            vendorMaster={data.vendorMaster}
            toast={showToast}
          />
        );
      case "qualityhub":
        return (
          <QualityHub
            jobOrders={data.jobOrders}
            purchaseOrders={data.purchaseOrders}
            inward={data.inward}
            vendorMaster={data.vendorMaster}
            toast={showToast}
          />
        );
      case "designhub":
        return (
          <DesignHub
            salesOrders={data.salesOrders}
            jobOrders={data.jobOrders}
            toast={showToast}
          />
        );
      case "notificationhub":
        return (
          <NotificationHub
            salesOrders={data.salesOrders}
            jobOrders={data.jobOrders}
            dispatches={data.dispatches}
            purchaseOrders={data.purchaseOrders}
            consumableStock={data.consumableStock}
            allEntries={data.allEntries}
            activeMachines={data.activeMachines}
            toast={showToast}
          />
        );
      case "machinetools":
        return <MachineTools machineMaster={data.machineMaster} itemMasterFG={data.itemMasterFG} categoryMaster={data.categoryMaster} toast={showToast} />;
      case "pricemaster":
        return <PriceMaster toast={showToast} />;
      case "forecast":
        return (
          <Forecast
            salesOrders={data.salesOrders}
            itemMasterFG={data.itemMasterFG}
            rawStock={data.rawStock}
            jobOrders={data.jobOrders}
            vendorMaster={data.vendorMaster}
            toast={showToast}
            refreshData={fetchMasters}
          />
        );
case "dispatch":
        return <Dispatch {...data} toast={showToast} />;
      case "rawstock":
        return <RMStock {...data} session={session} toast={showToast} />;
      case "fg":
        return <FGStock {...data} session={session} toast={showToast} />;
      case "consumablestock":
        return (
          <ConsumableStock {...data} session={session} toast={showToast} />
        );
      case "vendormaster":
        return <VendorMaster {...data} toast={showToast} />;
      case "sizemaster":
        return <CategoryMaster {...data} toast={showToast} />;
      case "itemmaster":
        return <ItemMasterFG {...data} toast={showToast} />;
      case "machinemaster":
        return <MachineMaster {...data} toast={showToast} />;
      case "companymaster":
        return <CompanyMaster {...data} toast={showToast} />;
      case "brandmaster":
        return <BrandMaster {...data} toast={showToast} />;
      case "users":
        return (
          <UserManagement {...data} currentUser={session} toast={showToast} />
        );
      default:
        return (
          <Dashboard
            data={data}
            session={session}
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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {}
        <div
          style={{
            background: "#0a0a0a",
            borderRight: `1px solid ${C.border}`,
            width: 240,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            maxHeight: "100%",
          }}
        >
          {}
          <div
            style={{
              padding: "24px 20px",
              borderBottom: `1px solid ${C.border}44`,
            }}
          >
            <div
              style={{
                color: C.accent,
                fontWeight: 900,
                fontSize: 13,
                letterSpacing: "normal",
                textTransform: "uppercase",
              }}
            >
              MANUFACTUREIQ
            </div>
            <div
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 22,
                marginTop: -2,
              }}
            >
              ERP System
            </div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
              Manufacturing Suite
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
            {TABS.filter((tab) => allowedTabs.includes(tab.id)).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  textAlign: "left",
                  border: "none",
                  background:
                    currentTab === tab.id
                      ? "rgba(255, 120, 0, 0.08)"
                      : "transparent",
                  color: currentTab === tab.id ? "#ff7800" : "#94a3b8",
                  borderLeft: `4px solid ${currentTab === tab.id ? "#ff7800" : "transparent"}`,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontSize: 13,
                  fontWeight: currentTab === tab.id ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
                onMouseEnter={(e) => {
                  if (currentTab !== tab.id) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentTab !== tab.id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#94a3b8";
                  }
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    opacity: currentTab === tab.id ? 1 : 0.6,
                    filter:
                      currentTab === tab.id
                        ? "drop-shadow(0 0 5px #ff780044)"
                        : "none",
                  }}
                >
                  {tab.icon}
                </span>
                <span style={{ letterSpacing: "0.02em" }}>{tab.label}</span>
              </button>
            ))}
          </div>

          {}
          <div
            style={{
              padding: 16,
              borderTop: `1px solid ${C.border}44`,
              background: "#0a0a0a",
            }}
          >
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              👤 {session.username} ({session.role})
            </div>
            <button
              onClick={onLogout}
              style={{
                width: "100%",
                background: "#450a0a",
                color: "#ef4444",
                border: "1px solid #7f1d1d",
                borderRadius: 6,
                padding: "8px",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Logout System
            </button>
          </div>
        </div>

        {}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {}
          <div
            style={{
              height: 60,
              background: "#0d0d0d",
              borderBottom: `1px solid ${C.border}44`,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                background: "#1a1a1a",
                borderRadius: 8,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: 300,
                color: "#555",
                fontSize: 13,
                cursor: "pointer",
              }}
              onClick={() => setCurrentTab("search")}
            >
              <span>🔍</span> Search anything...
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  background: "#333",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                Ctrl+K
              </span>
            </div>
          </div>

          {}
          <div
            style={{
              flex: 1,
              padding: 24,
              overflowY: "auto",
              position: "relative",
            }}
          >
            {renderPage()}
          </div>
        </div>
      </div>

      {}
      {toast && (
        <Toast
          key={toast.id}
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
