// ── Seed Data & Constants ──────────────────────────────────────────────────
export const SO_SALESPERSONS = ["Ankit", "Direct Order"];
export const SO_CLIENT_CATEGORIES = ["HP", "ZPL", "Others"];

export const FG_SEED_CATEGORIES = [
  "Paper Dip Bowl", "Paper Dip Bowl Lid", "Paper Cup", "Paper Cup Lid",
  "Paper Soup Bowl", "Paper Soup Bowl Lid", "Paper Flat Bowl", "Paper Flat Bowl Lid",
  "Paper Salad Box", "Paper Burger Box", "Paper Boat Tray", "Wrapping Paper",
  "Cake Box", "Pastry Box", "Paper Bag with Handle", "Paper Bag without Handle",
  "Paper Bag Manual", "Insert", "Sleeve", "Sticker"
];

export const ITEM_TYPE_GROUPS = ["Raw Material", "Consumable", "Finished Goods", "Machine Spare"];

export const SEED_CATEGORY_MASTER = {
  "Raw Material": ["Paper Reel", "Paper Sheet"],
  "Consumable": ["Tape", "Corrugated Box", "LDPE Polybag", "Glue"],
  "Finished Goods": FG_SEED_CATEGORIES,
  "Machine Spare": [],
};

export const SEED_SIZE_MASTER = {
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
  "Paper Sheet": ["White PE Coated", "Kraft PE Coated", "Kraft Uncoated", "SBS/FBB", "Whiteback", "Greyback", "Art Paper", "Gumming Sheet"],
  "Tape": [],
  "Corrugated Box": [],
  "LDPE Polybag": [],
  "Glue": [],
  "Paper Dip Bowl": ["40ml", "100ml", "125ml", "180ml"],
  "Paper Dip Bowl Lid": ["62mm", "76mm", "90mm"],
  "Paper Cup": ["240ml", "360ml", "480ml"],
  "Paper Cup Lid": ["80mm", "90mm"],
  "Paper Soup Bowl": ["250ml", "350ml", "400ml", "500ml", "650ml", "750ml", "1000ml"],
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
  "Paper Bag without Handle": ["18x12x27cm 60gsm", "18x12x27cm 80gsm", "21x12x33cm 60gsm", "21x12x33cm 80gsm"],
  "Paper Bag Manual": [],
  "Insert": [],
  "Sleeve": [],
  "Sticker": [],
};

export const PAPER_TYPES_BY_ITEM = {
  "Paper Sheets": ["White PE Coated", "Kraft PE Coated", "SBS/FBB", "Whiteback", "Greyback", "Kraft Uncoated", "Art Paper", "Gumming Sheet"],
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
};

export const RM_ITEMS = ["Paper Reel", "Paper Sheets"];
export const LOCATIONS = ["Vijay Nagar", "Lal Kuan"];

export const SHEET_STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting"];
export const FORMATION_STAGES_QTY = ["Formation", "Manual Formation"];
export const STAGES = [...SHEET_STAGES, ...FORMATION_STAGES_QTY];
export const FORMATION_MACHINE_TYPES = ["Formation", "Bag Making", "Sheeting", "Sheet Cutting", "Cutting"];
export const MANUAL_FORMATION_MACHINE_TYPES = ["Handmade"];

export const PROCESS_MACHINE_TYPE = {
  "Printing":         "Printing",
  "Varnish":          "Printing",
  "Lamination":       "Printing",
  "Die Cutting":      "Die Cutting",
  "Formation":        "Formation",
  "Manual Formation": "Formation",
};

export const FG_BOX_CATS  = ["Cake Box", "Pastry Box"];
export const FG_FLAT_CATS = ["Insert", "Sleeve", "Sticker"];
export const FG_BAG_CATS  = ["Paper Bag with Handle", "Paper Bag without Handle", "Paper Bag Manual"];
export const FG_WRAP_CATS = ["Wrapping Paper"];

export const CONSUMABLE_BOX_CATS  = ["Corrugated Box"];
export const CONSUMABLE_BAG_CATS  = ["LDPE Polybag", "Polybag"];

export const FG_SIZE_CLIENT_CATS = [
  "Paper Dip Bowl", "Paper Dip Bowl Lid", "Paper Cup", "Paper Cup Lid",
  "Paper Soup Bowl", "Paper Soup Bowl Lid", "Paper Flat Bowl", "Paper Flat Bowl Lid",
  "Paper Salad Box", "Paper Boat Tray"
];

export const SEED_MACHINES = [
  { name: "SBBM 360 Machine 1",           type: "Bag Making"   },
  { name: "SBBM 360 Machine 2",           type: "Bag Making"   },
  { name: "Flexo Printing Machine",       type: "Printing"     },
  { name: "Sheet Cutting Machine",        type: "Cutting"      },
  { name: "Handmade",                     type: "Handmade"     },
  { name: "Komori 28x40inch Machine",     type: "Printing"     },
  { name: "Akiyama 19x26inch Machine",    type: "Printing"     },
  { name: "Manual Die Cutting Machine 1", type: "Die Cutting"  },
  { name: "Manual Die Cutting Machine 2", type: "Die Cutting"  },
  { name: "Half Cutting Machine",         type: "Die Cutting"  },
  { name: "Automatic Die Cutting",        type: "Die Cutting"  },
  { name: "Carton Erection 1",            type: "Formation"    },
  { name: "Carton Erection 2",            type: "Formation"    },
  { name: "Bowl 250ml",                   type: "Formation"    },
  { name: "Bowl 350ml",                   type: "Formation"    },
  { name: "Bowl 500ml",                   type: "Formation"    },
  { name: "Bowl 750ml",                   type: "Formation"    },
  { name: "Lid 110mm 1",                  type: "Formation"    },
  { name: "Lid 110mm 2",                  type: "Formation"    },
  { name: "Single Layer Lid",             type: "Formation"    },
  { name: "Dip Bowl",                     type: "Formation"    },
  { name: "Single Wall Cup",              type: "Formation"    },
  { name: "Double Wall Cup",              type: "Formation"    },
  { name: "Flat Bowl Machine 1",          type: "Formation"    },
  { name: "Flat Bowl Machine 2",          type: "Formation"    },
  { name: "Flat Bowl Lid Machine",        type: "Formation"    },
];

export const DEFAULT_ROLES = {
  Admin: {
    label: "Admin",
    color: "#ef4444",
    tabs: ["dashboard","search","purchase","inward","sales","jobs","production","calendar","dispatch","rawstock","fg","consumablestock","vendormaster","clientmaster","sizemaster","itemmaster","machinemaster","users"],
  },
  Production: {
    label: "Production",
    color: "#f59e0b",
    tabs: ["dashboard","production","calendar","jobs"],
  },
  Store: {
    label: "Store",
    color: "#3b82f6",
    tabs: ["dashboard","inward","rawstock","fg","itemmaster","purchase"],
  },
  Sales: {
    label: "Sales",
    color: "#22c55e",
    tabs: ["dashboard","sales","dispatch","fg","clientmaster","search"],
  },
  Accounts: {
    label: "Accounts",
    color: "#a855f7",
    tabs: ["dashboard","purchase","sales","search","rawstock","fg"],
  },
};

export const TABS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "search", icon: "🔍", label: "Global Search" },
  { id: "purchase", icon: "🛒", label: "Purchase Orders" },
  { id: "inward", icon: "🚚", label: "Material Inward" },
  { id: "sales", icon: "🧾", label: "Sales Orders" },
  { id: "jobs", icon: "⚙️", label: "Job Orders" },
  { id: "production", icon: "🔧", label: "Production" },
  { id: "printingmaster", icon: "🖨️", label: "Printing Detail Master" },
  { id: "calendar", icon: "📅", label: "Production Calendar" },
  { id: "dispatch", icon: "🚛", label: "Dispatch" },
  { id: "rawstock", icon: "📦", label: "RM Stock" },
  { id: "fg", icon: "🏭", label: "FG Stock" },
  { id: "consumablestock", icon: "🗂️", label: "Consumable Stock" },
  { id: "vendormaster", icon: "🏪", label: "Vendor Master" },
  { id: "clientmaster", icon: "👥", label: "Client Master" },
  { id: "sizemaster", icon: "📐", label: "Category Master" },
  { id: "itemmaster", icon: "📋", label: "Item Master" },
  { id: "machinemaster", icon: "🏗️", label: "Machine Master" },
  { id: "users", icon: "👥", label: "User Management" },
];

export const SEED_VERSION = "v13";

export const TRANSACTION_KEYS = [
  "erp_purchaseOrders", "erp_dispatches", "erp_rawStock", "erp_inward",
  "erp_salesOrders", "erp_jobOrders", "erp_wipStock", "erp_fgStock",
  "erp_consumableStock", "erp_itemMasterFG", "erp_itemCounters",
  "erp_soCounter", "erp_joCounter", "erp_poCounter", "erp_grnCounter",
  "erp_dispatchCounter", "erp_machineReportData", "erp_consumableIssueLog",
  "erp_clear_inward_rmstock_v2",
];
