import React, { useState, useEffect, useMemo, useRef } from "react";
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
  operatorMasterAPI,
} from "./api/auth";
import { startLabelIcons } from "./utils/labelIcons";
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
import ERPConsole from "./pages/ERPConsole";
import Trash from "./pages/Trash";
import StockAdjustment from "./pages/StockAdjustment";
import Reports from "./pages/Reports";
import OperatorMaster from "./pages/OperatorMaster";
import companylogo from "../src/assets/logo.png";
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, logout, refreshUser } = useAuth();

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
          background: "#070924",
          color: C.text,
          flexDirection: "column",
          gap: 20,
        }}
      >
        <i
          className="fa-solid fa-industry"
          style={{
            fontSize: 36,
            color: "#aeb4ee",
          }}
        />
        <div
          style={{
            fontWeight: 500,
            color: C.muted,
            fontSize: 13,
          }}
        >
          Loading
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
  // For Admin, always use role defaults. For others, use stored allowedTabs if set by admin,
  // otherwise fall back to role defaults. Never merge — stored tabs are the restriction.
  const allowedTabs = (
    user.role === "Admin"
      ? userRole.tabs
      : Array.isArray(user.allowedTabs) && user.allowedTabs.length > 0
        ? user.allowedTabs
        : userRole.tabs
  ).filter((tabId) => user.role !== "Operator" || tabId !== "dashboard");
  const editableTabs = (
    Array.isArray(user.editableTabs) ? user.editableTabs : userRole.tabs
  ).filter((tabId) => user.role !== "Operator" || tabId !== "dashboard");

  return (
    <AppInner
      session={user}
      onLogout={logout}
      onRefreshUser={refreshUser}
      allowedTabs={allowedTabs}
      editableTabs={editableTabs}
    />
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function AppInner({
  session,
  onLogout,
  onRefreshUser,
  allowedTabs,
  editableTabs,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => {
    const lastTab = localStorage.getItem("erp_lastTab");
    const candidate = lastTab || "dashboard";
    return allowedTabs.includes(candidate)
      ? candidate
      : allowedTabs[0] || "dashboard";
  });
  const [deepLink, setDeepLink] = useState(null);
  const [toast, setToast] = useState(null);
  const pageRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => startLabelIcons(), []);

  const handleNavigate = (tab, recordId) => {
    setCurrentTab(tab);
    setDeepLink(recordId ? { tab, recordId } : null);
    if (isMobile) setSidebarOpen(false);
  };

  // Compute CRUD permissions for the currently active tab
  const tabPerms = React.useMemo(() => {
    if (session.role === "Admin")
      return { canCreate: true, canEdit: true, canDelete: true };
    const editable = Array.isArray(session.editableTabs)
      ? session.editableTabs
      : [];
    const create = Array.isArray(session.createTabs) ? session.createTabs : [];
    const del = Array.isArray(session.deleteTabs) ? session.deleteTabs : [];
    return {
      canCreate: create.includes(currentTab),
      canEdit: editable.includes(currentTab),
      canDelete: del.includes(currentTab),
    };
  }, [currentTab, session]);

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
    [],
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
  const [operatorMaster, setOperatorMaster] = useState([]);

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
      run(operatorMasterAPI.getAll, setOperatorMaster, "operators", "operator"),
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

    const normalTag = tag.trim().toLowerCase();

    if ((stockItem.companyCat || "").trim().toLowerCase() === normalTag)
      return true;

    const item = itemMasterFG.find((i) => i.code === stockItem.itemCode);
    return (item?.companyCategory || "").trim().toLowerCase() === normalTag;
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
        operatorMaster,
        setOperatorMaster,
        editableTabs,
        allowedTabs,
        currentTab,
        canExportImport: session?.allowExportImport !== false,
        refreshData: fetchMasters,
      };
    }

    const filteredFG = fgStock.filter((s) => matchesClient(s, tag));
    const filteredItemMaster = itemMasterFG.filter(
      (i) => i.companyCategory === tag,
    );
    const filteredSOs = salesOrders.filter((so) => so.companyCategory === tag);
    const filteredSONos = new Set(filteredSOs.map((so) => so.soNo));

    return {
      salesOrders: filteredSOs,
      jobOrders: jobOrders.filter((jo) => jo.companyCategory === tag),
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
      dispatches: dispatches.filter((d) => {
        if (filteredSONos.has(d.soRef)) return true;
        // Also match direct dispatches by company name belonging to the client's category
        const co = (companyMaster || []).find(
          (c) =>
            (c.name || "").toLowerCase() ===
            (d.companyName || "").toLowerCase(),
        );
        return co && co.category === tag;
      }),
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
      operatorMaster,
      setOperatorMaster,
      editableTabs,
      allowedTabs,
      currentTab,
      canExportImport: session?.allowExportImport !== false,
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
    operatorMaster,
  ]);

  const data = filteredData;

  const renderPage = () => {
    // Guard: if the current tab is not in allowedTabs, show access denied
    const allowedSet = new Set(allowedTabs);
    if (currentTab !== "dashboard" && !allowedSet.has(currentTab)) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            gap: 12,
          }}
        >
          <i
            className="fa-solid fa-lock"
            style={{ fontSize: 40, color: "#6f74a0" }}
          />
          <div style={{ fontSize: 16, fontWeight: 600, color: "#dfe2f4" }}>
            Access Denied
          </div>
          <div style={{ fontSize: 13, color: "#8b90b8" }}>
            You don't have permission to view this module.
          </div>
        </div>
      );
    }
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
      case "reports":
        return <Reports />;
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
        return (
          <PurchaseOrders
            {...data}
            {...tabPerms}
            deepLinkId={deepLink?.tab === "purchase" ? deepLink.recordId : null}
            onDeepLinkConsumed={() => setDeepLink(null)}
          />
        );
      case "inward":
        return (
          <MaterialInward
            {...data}
            {...tabPerms}
            toast={showToast}
            deepLinkId={deepLink?.tab === "inward" ? deepLink.recordId : null}
            onDeepLinkConsumed={() => setDeepLink(null)}
          />
        );
      case "sales":
        return (
          <SalesOrders
            {...data}
            {...tabPerms}
            session={session}
            toast={showToast}
            deepLinkId={deepLink?.tab === "sales" ? deepLink.recordId : null}
            onDeepLinkConsumed={() => setDeepLink(null)}
          />
        );
      case "jobs":
        return (
          <JobOrders
            {...data}
            {...tabPerms}
            toast={showToast}
            deepLinkId={deepLink?.tab === "jobs" ? deepLink.recordId : null}
            onDeepLinkConsumed={() => setDeepLink(null)}
          />
        );
      case "production":
        return (
          <ProductionUpdate
            {...data}
            operatorMaster={data.operatorMaster}
            session={session}
            toast={showToast}
          />
        );
      case "operatormaster":
        return (
          <OperatorMaster
            toast={showToast}
            canExportImport={session?.allowExportImport !== false}
          />
        );
      case "printingmaster":
        return <PrintingDetailMaster {...data} toast={showToast} />;
      case "calendar":
        return (
          <ProductionCalendar
            {...data}
            operatorMaster={data.operatorMaster}
            toast={showToast}
          />
        );
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
        return (
          <MachineTools
            machineMaster={data.machineMaster}
            itemMasterFG={data.itemMasterFG}
            categoryMaster={data.categoryMaster}
            vendorMaster={data.vendorMaster}
            toast={showToast}
            canExportImport={session?.allowExportImport !== false}
          />
        );
      case "pricemaster":
        return (
          <PriceMaster
            toast={showToast}
            canExportImport={session?.allowExportImport !== false}
          />
        );
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
        return <Dispatch {...data} {...tabPerms} toast={showToast} />;
      case "rawstock":
        return (
          <RMStock
            {...data}
            {...tabPerms}
            session={session}
            toast={showToast}
            canEdit={tabPerms.canEdit && session.allowEditStock !== false}
            canCreate={tabPerms.canCreate && session.allowEditStock !== false}
            canDelete={tabPerms.canDelete && session.allowEditStock !== false}
          />
        );
      case "fg":
        return (
          <FGStock
            {...data}
            {...tabPerms}
            session={session}
            toast={showToast}
            canEdit={tabPerms.canEdit && session.allowEditStock !== false}
            canCreate={tabPerms.canCreate && session.allowEditStock !== false}
            canDelete={tabPerms.canDelete && session.allowEditStock !== false}
          />
        );
      case "consumablestock":
        return (
          <ConsumableStock
            {...data}
            {...tabPerms}
            session={session}
            toast={showToast}
            canEdit={tabPerms.canEdit && session.allowEditStock !== false}
            canCreate={tabPerms.canCreate && session.allowEditStock !== false}
            canDelete={tabPerms.canDelete && session.allowEditStock !== false}
          />
        );
      case "stockadjustment":
        return (
          <StockAdjustment
            itemMasterFG={data.itemMasterFG}
            session={session}
            toast={showToast}
            refreshData={fetchMasters}
            canCreate={
              (tabPerms.canCreate || tabPerms.canEdit) &&
              session.allowEditStock !== false
            }
            canDelete={tabPerms.canDelete && session.allowEditStock !== false}
          />
        );
      case "vendormaster":
        return <VendorMaster {...data} toast={showToast} />;
      case "sizemaster":
        return <CategoryMaster {...data} toast={showToast} />;
      case "itemmaster":
        return <ItemMasterFG {...data} {...tabPerms} toast={showToast} />;
      case "machinemaster":
        return <MachineMaster {...data} toast={showToast} />;
      case "companymaster":
        return <CompanyMaster {...data} toast={showToast} />;
      case "brandmaster":
        return <BrandMaster {...data} toast={showToast} />;
      case "users":
        return (
          <UserManagement
            {...data}
            currentUser={session}
            toast={showToast}
            onRefreshUser={onRefreshUser}
          />
        );
      case "erpconsole":
        return <ERPConsole session={session} toast={showToast} />;
      case "trash":
        return <Trash session={session} toast={showToast} />;
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

  const sidebarContent = (
    <>
      <div
        style={{
          height: 56,
          padding: "0 16px",
          flexShrink: 0,
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src={companylogo}
            alt="Logo"
            style={{ width: 32, height: 32, objectFit: "contain" }}
          />
          <div style={{ color: "#dfe2f4", fontSize: 14, fontWeight: 500 }}>
            ManufactureIQ
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#dfe2f4",
              fontSize: 16,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
        {(() => {
          const TAB_GROUPS = [
            {
              label: "Overview",
              ids: [
                "dashboard",
                "notificationhub",
                "search",
                "reports",
                "forecast",
              ],
            },
            {
              label: "Operations",
              ids: [
                "purchase",
                "inward",
                "sales",
                "jobs",
                "production",
                "calendar",
                "dispatch",
              ],
            },
            {
              label: "Inventory",
              ids: ["rawstock", "fg", "consumablestock", "stockadjustment"],
            },
            {
              label: "Masters",
              ids: [
                "vendormaster",
                "companymaster",
                "brandmaster",
                "sizemaster",
                "itemmaster",
                "machinemaster",
                "pricemaster",
                "printingmaster",
                "operatormaster",
                "machinetools",
              ],
            },
            {
              label: "Process",
              ids: ["subcontracting", "qualityhub", "designhub"],
            },
            { label: "System", ids: ["users", "erpconsole", "trash"] },
          ];
          const tabById = Object.fromEntries(TABS.map((t) => [t.id, t]));
          const allowedSet = new Set(allowedTabs);
          const groupedIds = new Set(TAB_GROUPS.flatMap((g) => g.ids));
          const ungroupedTabs = TABS.filter(
            (t) => allowedSet.has(t.id) && !groupedIds.has(t.id),
          );

          const renderTab = (tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`lg-sidebar-item${isActive ? " active" : ""}`}
              >
                <i className={tab.icon} />
                <span>{tab.label}</span>
              </button>
            );
          };

          return (
            <>
              {TAB_GROUPS.map((group) => {
                const tabs = group.ids
                  .map((id) => tabById[id])
                  .filter((t) => t && allowedSet.has(t.id));
                if (!tabs.length) return null;
                return (
                  <div key={group.label} className="lg-sidebar-group">
                    <div className="lg-sidebar-group-label">{group.label}</div>
                    {tabs.map(renderTab)}
                  </div>
                );
              })}
              {ungroupedTabs.length > 0 && (
                <div className="lg-sidebar-group">
                  <div className="lg-sidebar-group-label">Other</div>
                  {ungroupedTabs.map(renderTab)}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div
        style={{
          padding: 16,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            lineHeight: "16px",
            color: C.muted,
            marginBottom: 12,
          }}
        >
          {session.username} · {session.role}
        </div>
        <button onClick={onLogout} className="lg-signout">
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#070924",
        backgroundSize: "cover",
        color: C.text,
        overflow: "hidden",
      }}
    >
      <div className="lg-scene" aria-hidden="true" />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Mobile overlay backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 40,
            }}
          />
        )}

        {/* Sidebar */}
        {!isMobile ? (
          <div
            style={{
              background: "#05071a",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              width: 230,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              maxHeight: "100%",
            }}
          >
            {sidebarContent}
          </div>
        ) : (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100%",
              width: 260,
              background: "#05071a",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              zIndex: 50,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s ease",
            }}
          >
            {sidebarContent}
          </div>
        )}

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Top header */}
          <div
            style={{
              height: 56,
              background: "#070924",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              padding: isMobile ? "0 12px" : "0 28px",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}
          >
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.muted,
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "4px",
                  flexShrink: 0,
                }}
              >
                <i className="fa-solid fa-bars" />
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="po-tbtn"
              aria-label="Notifications"
              onClick={() => setCurrentTab("notificationhub")}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#0b0e2d",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#dfe2f4",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-bell" style={{ fontSize: 14 }} />
            </button>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                type="button"
                className="po-tbtn"
                onClick={() => setProfileOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: isMobile ? "3px" : "3px 12px 3px 3px",
                  background: "#0b0e2d",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 999,
                  color: "#dfe2f4",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: C.accent,
                    color: "#070924",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {String(session.name || session.username || "?")
                    .trim()
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                {!isMobile && (
                  <span style={{ textAlign: "left", lineHeight: 1.2 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {session.name || session.username}
                    </span>
                    <span
                      style={{ display: "block", fontSize: 10, color: C.muted }}
                    >
                      {session.role}
                    </span>
                  </span>
                )}
              </button>
              {profileOpen && (
                <div
                  onClick={() => setProfileOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 49 }}
                />
              )}
              <div className="tb-menu" data-open={profileOpen || undefined}>
                <button
                  type="button"
                  className="tb-menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                >
                  <i
                    className="fa-solid fa-right-from-bracket"
                    style={{ width: 14, color: "#aeb4ee" }}
                  />
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div
            ref={pageRef}
            style={{
              flex: 1,
              padding: isMobile ? 16 : 32,
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}
          >
            {renderPage()}
          </div>
        </div>
      </div>

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
