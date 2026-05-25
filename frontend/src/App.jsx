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
  operatorMasterAPI,
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
import ERPConsole from "./pages/ERPConsole";
import Trash from "./pages/Trash";
import StockAdjustment from "./pages/StockAdjustment";
import Reports from "./pages/Reports";
import OperatorMaster from "./pages/OperatorMaster";
import companylogo from "../src/assets/logo.png";
import bgImage from "./assets/bg.png";
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
          background:
            "linear-gradient(135deg, #07070f 0%, #0c0c1a 50%, #09090e 100%)",
          color: C.text,
          flexDirection: "column",
          gap: 20,
        }}
      >
        <i
          className="fa-solid fa-industry"
          style={{
            fontSize: 36,
            color: "#6366f1",
            animation: "bounce 1s infinite",
          }}
        />
        <div
          style={{
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: C.muted,
            fontSize: 13,
          }}
        >
          Loading system...
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
  const [currentTab, setCurrentTab] = useState(() => {
    const lastTab = localStorage.getItem("erp_lastTab");
    const candidate = lastTab || "dashboard";
    return allowedTabs.includes(candidate) ? candidate : (allowedTabs[0] || "dashboard");
  });
  const [deepLink, setDeepLink] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleNavigate = (tab, recordId) => {
    setCurrentTab(tab);
    setDeepLink(recordId ? { tab, recordId } : null);
    if (isMobile) setSidebarOpen(false);
  };

  // Compute CRUD permissions for the currently active tab
  const tabPerms = React.useMemo(() => {
    if (session.role === "Admin") return { canCreate: true, canEdit: true, canDelete: true };
    const editable = Array.isArray(session.editableTabs) ? session.editableTabs : [];
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

    if ((stockItem.companyCat || "").trim().toLowerCase() === normalTag) return true;

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
      dispatches: dispatches.filter((d) => filteredSONos.has(d.soRef)),
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 40, color: "#555" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "#e0e0e0" }}>Access Denied</div>
          <div style={{ fontSize: 13, color: "#888" }}>You don't have permission to view this module.</div>
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
            toast={showToast}
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
        return <RMStock {...data} {...tabPerms} session={session} toast={showToast}
          canEdit={tabPerms.canEdit && session.allowEditStock !== false}
          canCreate={tabPerms.canCreate && session.allowEditStock !== false}
          canDelete={tabPerms.canDelete && session.allowEditStock !== false}
        />;
      case "fg":
        return <FGStock {...data} {...tabPerms} session={session} toast={showToast}
          canEdit={tabPerms.canEdit && session.allowEditStock !== false}
          canCreate={tabPerms.canCreate && session.allowEditStock !== false}
          canDelete={tabPerms.canDelete && session.allowEditStock !== false}
        />;
      case "consumablestock":
        return (
          <ConsumableStock {...data} {...tabPerms} session={session} toast={showToast}
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
            canCreate={tabPerms.canCreate && session.allowEditStock !== false}
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
          padding: "22px 20px 18px",
          borderBottom: `1px solid rgba(255,255,255,0.07)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <img
            src={companylogo}
            alt="Logo"
            style={{
              width: 64,
              height: 64,
              marginRight: 12,
            }}
          />
          <div
            style={{
              color: "#ffffff",
              fontSize: 14,
              marginTop: 3,
              fontWeight: 400,
            }}
          >
            Manufacturing ERP
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: 16,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
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
            { label: "Inventory", ids: ["rawstock", "fg", "consumablestock", "stockadjustment"] },
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
                  <div key={group.label}>
                    <div className="lg-sidebar-group-label">{group.label}</div>
                    {tabs.map(renderTab)}
                  </div>
                );
              })}
              {ungroupedTabs.length > 0 && (
                <div>
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
          padding: "14px 16px",
          borderTop: `1px solid rgba(255,255,255,0.07)`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            marginBottom: 10,
            fontWeight: 400,
          }}
        >
          {session.username} · {session.role}
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            background: "rgba(239,68,68,0.1)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            padding: "8px",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
          }}
        >
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
        background: `url(${bgImage})`,
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
              background: "rgba(0, 0, 0, 0)",
              //
              borderRight: "1px solid rgba(255,255,255,0.18)",
              width: 230,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              maxHeight: "100%",
              boxShadow: "2px 0 24px rgba(0,0,0,0.3)",
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
              background: "rgba(0, 0, 0, 0)",
              //
              borderRight: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              flexDirection: "column",
              zIndex: 50,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.25s ease",
              boxShadow: "4px 0 32px rgba(0,0,0,0.4)",
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
              height: 54,
              background: "rgba(0, 0, 0, 0)",
              //
              borderBottom: "1px solid rgba(255,255,255,0.18)",
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
            <div
              style={{
                background: "rgba(0, 0, 0, 0)",
                //
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 12,
                padding: isMobile ? "7px 12px" : "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flex: 1,
                maxWidth: isMobile ? "100%" : 320,
                color: C.placeholder,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                transition: "all 0.18s ease",
              }}
              onClick={() => {
                setCurrentTab("search");
                if (isMobile) setSidebarOpen(false);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.muted}
                strokeWidth="2"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m15 15 3 3" />
              </svg>
              <span style={{ flex: 1, fontWeight: 300, fontStyle: "italic" }}>
                Search anything...
              </span>
              {!isMobile && (
                <span
                  style={{
                    fontSize: 10,
                    background: "rgba(255,255,255,0.08)",
                    color: C.muted,
                    padding: "2px 7px",
                    borderRadius: 10,
                    flexShrink: 0,
                    fontWeight: 500,
                  }}
                >
                  Ctrl+K
                </span>
              )}
            </div>
          </div>

          {/* Page content */}
          <div
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
