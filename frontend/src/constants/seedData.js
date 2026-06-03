export const SO_SALESPERSONS = ["Ankit", "Direct Order"];
export const SO_CLIENT_CATEGORIES = ["HP", "ZPL", "Others"];

export const FG_SEED_CATEGORIES = [
  "Paper Dip Bowl",
  "Paper Dip Bowl Lid",
  "Paper Cup",
  "Paper Cup Lid",
  "Paper Soup Bowl",
  "Paper Soup Bowl Lid",
  "Paper Flat Bowl",
  "Paper Flat Bowl Lid",
  "Paper Salad Box",
  "Paper Burger Box",
  "Paper Boat Tray",
  "Wrapping Paper",
  "Cake Box",
  "Pastry Box",
  "Paper Bag with Handle",
  "Paper Bag without Handle",
  "Paper Bag Manual",
  "Insert",
  "Sleeve",
  "Sticker",
];

export const ITEM_TYPE_GROUPS = [
  "Raw Material",
  "Consumable",
  "Finished Goods",
  "Machine Spare",
];

export const SEED_CATEGORY_MASTER = {
  "Raw Material": ["Paper Reel", "Paper Sheet"],
  Consumable: ["Tape", "Corrugated Box", "LDPE Polybag", "Glue"],
  "Finished Goods": FG_SEED_CATEGORIES,
  "Machine Spare": [],
};

export const SEED_SIZE_MASTER = {
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
  "Paper Sheet": [
    "White PE Coated",
    "Kraft PE Coated",
    "Kraft Uncoated",
    "SBS/FBB",
    "Whiteback",
    "Greyback",
    "Art Paper",
    "Gumming Sheet",
  ],
  Tape: [],
  "Corrugated Box": [],
  "LDPE Polybag": [],
  Glue: [],
  "Paper Dip Bowl": ["40ml", "100ml", "125ml", "180ml"],
  "Paper Dip Bowl Lid": ["62mm", "76mm", "90mm"],
  "Paper Cup": ["240ml", "360ml", "480ml"],
  "Paper Cup Lid": ["80mm", "90mm"],
  "Paper Soup Bowl": [
    "250ml",
    "350ml",
    "400ml",
    "500ml",
    "650ml",
    "750ml",
    "1000ml",
  ],
  "Paper Soup Bowl Lid": ["110mm"],
  "Paper Flat Bowl": ["500ml", "750ml", "1000ml", "1000ml 184mm"],
  "Paper Flat Bowl Lid": ["150mm"],
  "Paper Salad Box": ["450ml", "700ml", "900ml", "1200ml", "1600ml"],
  "Paper Burger Box": [],
  "Paper Boat Tray": ["450ml", "700ml", "900ml", "1200ml", "1600ml"],
  "Wrapping Paper": [],
  "Cake Box": [],
  "Pastry Box": [],
  "Paper Bag with Handle": ["9x6x7inch 100gsm", "12x7x8inch 100gsm"],
  "Paper Bag without Handle": [
    "18x12x27cm 60gsm",
    "18x12x27cm 80gsm",
    "21x12x33cm 60gsm",
    "21x12x33cm 80gsm",
  ],
  "Paper Bag Manual": [],
  Insert: [],
  Sleeve: [],
  Sticker: [],
};

export const PAPER_TYPES_BY_ITEM = {
  "Paper Sheets": [
    "White PE Coated",
    "Kraft PE Coated",
    "SBS/FBB",
    "Whiteback",
    "Greyback",
    "Kraft Uncoated",
    "Art Paper",
    "Gumming Sheet",
  ],
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
};

export const RM_ITEMS = ["Paper Reel", "Paper Sheets"];
export const LOCATIONS = ["Vijay Nagar", "Lal Kuan"];

export const SHEET_STAGES = [
  "Printing",
  "Varnish",
  "Lamination",
  "Die Cutting",
];
export const FORMATION_STAGES_QTY = ["Formation", "Manual Formation"];
export const STAGES = [...SHEET_STAGES, ...FORMATION_STAGES_QTY];
export const FORMATION_MACHINE_TYPES = [
  "Formation",
  "Bag Making",
  "Sheeting",
  "Sheet Cutting",
  "Cutting",
];
export const MANUAL_FORMATION_MACHINE_TYPES = ["Manual Formation", "Handmade"];

export const PROCESS_MACHINE_TYPE = {
  Printing: "Printing",
  Varnish: "Printing",
  Lamination: "Lamination",
  "Die Cutting": "Die Cutting",
  Formation: "Formation",
  "Manual Formation": "Manual Formation",
};

export const FG_BOX_CATS = ["Cake Box", "Pastry Box"];
export const FG_FLAT_CATS = ["Insert", "Sleeve", "Sticker"];
export const FG_BAG_CATS = [
  "Paper Bag with Handle",
  "Paper Bag without Handle",
  "Paper Bag Manual",
];
export const FG_WRAP_CATS = ["Wrapping Paper"];

export const CONSUMABLE_BOX_CATS = ["Corrugated Box"];
export const CONSUMABLE_BAG_CATS = ["LDPE Polybag", "Polybag"];

export const FG_SIZE_CLIENT_CATS = [
  "Paper Dip Bowl",
  "Paper Dip Bowl Lid",
  "Paper Cup",
  "Paper Cup Lid",
  "Paper Soup Bowl",
  "Paper Soup Bowl Lid",
  "Paper Flat Bowl",
  "Paper Flat Bowl Lid",
  "Paper Salad Box",
  "Paper Boat Tray",
];

export const PARALLEL_MACHINE_GROUPS = [
  "",
  "SBBM 360 Pair",
  "Lamination Pair",
  "Manual Die Cutter Pair",
  "Lid 110mm Pair",
  "Flat Bowl Pair",
  "Carton Erection Pair",
];

export const ALL_SKU_FAMILIES = [
  "Paper Dip Bowl",
  "Paper Dip Bowl Lid",
  "Paper Cup",
  "Paper Cup Lid",
  "Paper Soup Bowl",
  "Paper Soup Bowl Lid",
  "Paper Flat Bowl",
  "Paper Flat Bowl Lid",
  "Paper Salad Box",
  "Paper Burger Box",
  "Paper Boat Tray",

  "Paper Bag with Handle",
  "Paper Bag without Handle",
  "Wrapping Paper",

  "Cake Box",
  "Pastry Box",
  "Paper Bag Manual",
  "Insert",
  "Sleeve",
  "Sticker",
];

const _SHEET_FG = [
  "Paper Dip Bowl",
  "Paper Dip Bowl Lid",
  "Paper Cup",
  "Paper Soup Bowl",
  "Paper Soup Bowl Lid",
  "Paper Flat Bowl",
  "Paper Flat Bowl Lid",
  "Paper Salad Box",
  "Paper Boat Tray",
  "Paper Burger Box",
];

export const SEED_MACHINES = [
  {
    name: "Komori 28x40inch Machine",
    type: "Printing",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: _SHEET_FG,
    parallelMachineGroup: "",
  },

  {
    name: "Manual Die Cutting Machine 1",
    type: "Die Cutting",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: _SHEET_FG,
    parallelMachineGroup: "Manual Die Cutter Pair",
    priorityRank: 2,
  },
  {
    name: "Manual Die Cutting Machine 2",
    type: "Die Cutting",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: _SHEET_FG,
    parallelMachineGroup: "Manual Die Cutter Pair",
    priorityRank: 2,
  },
  {
    name: "Automatic Die Cutting",
    type: "Die Cutting",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: _SHEET_FG,
    parallelMachineGroup: "",
    priorityRank: 1,
  },

  {
    name: "Laminator Machine 1",
    type: "Lamination",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: _SHEET_FG,
    parallelMachineGroup: "Lamination Pair",
  },
  {
    name: "Laminator Machine 2",
    type: "Lamination",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: _SHEET_FG,
    parallelMachineGroup: "Lamination Pair",
  },

  {
    name: "Dip Bowl",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Dip Bowl"],
    parallelMachineGroup: "",
  },
  {
    name: "Single Layer Lid",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Dip Bowl Lid"],
    parallelMachineGroup: "",
  },

  {
    name: "Single Wall Cup",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Cup"],
    parallelMachineGroup: "",
  },
  {
    name: "Double Wall Cup",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Cup"],
    parallelMachineGroup: "",
  },

  {
    name: "Bowl 250ml",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Soup Bowl"],
    parallelMachineGroup: "",
  },
  {
    name: "Bowl 350ml",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Soup Bowl"],
    parallelMachineGroup: "",
  },
  {
    name: "Bowl 500ml",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Soup Bowl"],
    parallelMachineGroup: "",
  },
  {
    name: "Bowl 750ml",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Soup Bowl"],
    parallelMachineGroup: "",
  },

  {
    name: "Lid 110mm 1",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Soup Bowl Lid"],
    parallelMachineGroup: "Lid 110mm Pair",
  },
  {
    name: "Lid 110mm 2",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Soup Bowl Lid"],
    parallelMachineGroup: "Lid 110mm Pair",
  },

  {
    name: "Flat Bowl Machine 1",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Flat Bowl"],
    parallelMachineGroup: "Flat Bowl Pair",
  },
  {
    name: "Flat Bowl Machine 2",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Flat Bowl"],
    parallelMachineGroup: "Flat Bowl Pair",
  },
  {
    name: "Flat Bowl Lid Machine",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Flat Bowl Lid"],
    parallelMachineGroup: "",
  },

  {
    name: "Carton Erection 1",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: [
      "Paper Salad Box",
      "Paper Boat Tray",
      "Paper Burger Box",
    ],
    parallelMachineGroup: "Carton Erection Pair",
  },
  {
    name: "Carton Erection 2",
    type: "Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: [
      "Paper Salad Box",
      "Paper Boat Tray",
      "Paper Burger Box",
    ],
    parallelMachineGroup: "Carton Erection Pair",
  },

  {
    name: "Flexo Printing Machine",
    type: "Printing",
    division: "Reel",
    capacityUnit: "Kg",
    productCompatibility: ["Paper Bag with Handle", "Paper Bag without Handle"],
    parallelMachineGroup: "",
  },
  {
    name: "SBBM 360 Machine 1",
    type: "Bag Making",
    division: "Reel",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Bag with Handle", "Paper Bag without Handle"],
    parallelMachineGroup: "SBBM 360 Pair",
  },
  {
    name: "SBBM 360 Machine 2",
    type: "Bag Making",
    division: "Reel",
    capacityUnit: "Pcs",
    productCompatibility: ["Paper Bag with Handle", "Paper Bag without Handle"],
    parallelMachineGroup: "SBBM 360 Pair",
  },
  {
    name: "Sheet Cutting Machine",
    type: "Sheet Cutting",
    division: "Reel",
    capacityUnit: "Pcs",
    productCompatibility: ["Wrapping Paper"],
    parallelMachineGroup: "",
  },

  {
    name: "Akiyama 19x26inch Machine",
    type: "Printing",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: [],
    parallelMachineGroup: "",
  },
  {
    name: "Half Cutting Machine",
    type: "Die Cutting",
    division: "Sheet",
    capacityUnit: "Sheets",
    productCompatibility: [],
    parallelMachineGroup: "",
  },
  {
    name: "Handmade",
    type: "Manual Formation",
    division: "Sheet",
    capacityUnit: "Pcs",
    productCompatibility: [],
    parallelMachineGroup: "",
  },
];

export const DEFAULT_ROLES = {
  Admin: {
    label: "Admin",
    color: "#ef4444",
    tabs: [
      "dashboard",
      "search",
      "purchase",
      "inward",
      "sales",
      "jobs",
      "production",
      "printingmaster",
      "calendar",
      "subcontracting",
      "qualityhub",
      "designhub",
      "notificationhub",
      "machinetools",
      "dispatch",
      "rawstock",
      "fg",
      "consumablestock",
      "stockadjustment",
      "vendormaster",
      "clientmaster",
      "sizemaster",
      "itemmaster",
      "machinemaster",
      "operatormaster",
      "companymaster",
      "brandmaster",
      "pricemaster",
      "forecast",
      "reports",
      "users",
      "erpconsole",
      "trash",
    ],
  },
  Operator: {
    label: "Operator",
    color: "#2196F3",
    tabs: ["production"],
  },
  Production: {
    label: "Production",
    color: "#f59e0b",
    tabs: [
      "dashboard",
      "production",
      "printingmaster",
      "calendar",
      "subcontracting",
      "qualityhub",
      "jobs",
      "machinetools",
      "forecast",
    ],
  },
  Store: {
    label: "Store",
    color: "#3b82f6",
    tabs: [
      "dashboard",
      "inward",
      "rawstock",
      "fg",
      "consumablestock",
      "stockadjustment",
      "itemmaster",
      "purchase",
      "forecast",
    ],
  },
  Sales: {
    label: "Sales",
    color: "#22c55e",
    tabs: [
      "dashboard",
      "sales",
      "dispatch",
      "fg",
      "clientmaster",
      "brandmaster",
      "pricemaster",
      "forecast",
      "search",
      "designhub",
      "notificationhub",
    ],
  },
  Accounts: {
    label: "Accounts",
    color: "#a855f7",
    tabs: [
      "dashboard",
      "purchase",
      "sales",
      "pricemaster",
      "search",
      "rawstock",
      "fg",
    ],
  },
  Client: {
    label: "Client",
    color: "#888",
    tabs: ["sales", "jobs", "dispatch", "fg"],
  },
};

export const TABS = [
  { id: "notificationhub", icon: "fa-solid fa-bell", label: "Notifications" },
  {
    id: "search",
    icon: "fa-solid fa-magnifying-glass",
    label: "Global Search",
  },
  { id: "dashboard", icon: "fa-solid fa-chart-pie", label: "Dashboard" },
  { id: "reports", icon: "fa-solid fa-chart-bar", label: "Reports" },
  { id: "forecast", icon: "fa-solid fa-chart-line", label: "Forecast" },
  {
    id: "calendar",
    icon: "fa-solid fa-calendar-days",
    label: "Production Calendar",
  },
  {
    id: "purchase",
    icon: "fa-solid fa-cart-shopping",
    label: "Purchase Orders",
  },
  {
    id: "inward",
    icon: "fa-solid fa-truck-ramp-box",
    label: "Material Inward",
  },
  {
    id: "sales",
    icon: "fa-solid fa-file-invoice-dollar",
    label: "Sales Orders",
  },
  { id: "jobs", icon: "fa-solid fa-gears", label: "Job Orders" },
  {
    id: "production",
    icon: "fa-solid fa-industry",
    label: "Production Update",
  },
  { id: "dispatch", icon: "fa-solid fa-truck-fast", label: "Dispatch" },
  { id: "rawstock", icon: "fa-solid fa-boxes-stacked", label: "RM Stock" },
  { id: "fg", icon: "fa-solid fa-warehouse", label: "FG Stock" },
  {
    id: "consumablestock",
    icon: "fa-solid fa-layer-group",
    label: "Consumable Stock",
  },
  {
    id: "stockadjustment",
    icon: "fa-solid fa-sliders",
    label: "Stock Adjustment",
  },
  {
    id: "printingmaster",
    icon: "fa-solid fa-print",
    label: "Printing Detail Master",
  },
  {
    id: "operatormaster",
    icon: "fa-solid fa-hard-hat",
    label: "Operator Master",
  },
  { id: "vendormaster", icon: "fa-solid fa-store", label: "Vendor Master" },
  {
    id: "companymaster",
    icon: "fa-solid fa-building",
    label: "Company Master",
  },
  { id: "brandmaster", icon: "fa-solid fa-tag", label: "Brand Master" },
  {
    id: "sizemaster",
    icon: "fa-solid fa-ruler-combined",
    label: "Category Master",
  },
  { id: "itemmaster", icon: "fa-solid fa-list-check", label: "Item Master" },
  {
    id: "machinemaster",
    icon: "fa-solid fa-screwdriver-wrench",
    label: "Machine Master",
  },
  { id: "pricemaster", icon: "fa-solid fa-tags", label: "Price List Master" },
  {
    id: "machinetools",
    icon: "fa-solid fa-wrench",
    label: "Machine & Tooling",
  },
  {
    id: "subcontracting",
    icon: "fa-solid fa-arrows-spin",
    label: "Sub Contracting",
  },
  { id: "qualityhub", icon: "fa-solid fa-microscope", label: "Quality Hub" },
  { id: "designhub", icon: "fa-solid fa-pen-ruler", label: "Design Hub" },
  { id: "users", icon: "fa-solid fa-users", label: "User Management" },
  { id: "erpconsole", icon: "fa-solid fa-terminal", label: "ERP Console" },
  { id: "trash", icon: "fa-solid fa-trash", label: "Trash" },
];

export const SEED_VERSION = "v14";

export const TRANSACTION_KEYS = [
  "erp_purchaseOrders",
  "erp_dispatches",
  "erp_rawStock",
  "erp_inward",
  "erp_salesOrders",
  "erp_jobOrders",
  "erp_wipStock",
  "erp_fgStock",
  "erp_consumableStock",
  "erp_itemMasterFG",
  "erp_itemCounters",
  "erp_soCounter",
  "erp_joCounter",
  "erp_poCounter",
  "erp_grnCounter",
  "erp_dispatchCounter",
  "erp_machineReportData",
  "erp_consumableIssueLog",
  "erp_clear_inward_rmstock_v2",
];
