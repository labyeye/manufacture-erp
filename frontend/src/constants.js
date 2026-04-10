export const COLORS = {
  bg: "#0d1117",
  surface: "#161b22",
  card: "#1c2128",
  border: "#30363d",
  accent: "#f97316",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  red: "#ef4444",
  purple: "#a855f7",
  text: "#e6edf3",
  muted: "#8b949e",
  inputBg: "#0d1117",
};

export const STAGES = [
  "Printing",
  "Varnish",
  "Lamination",
  "Die Cutting",
  "Formation",
  "Manual Formation"
];

export const PROCESS_COLORS = {
  "Printing": COLORS.blue,
  "Varnish": "#06b6d4",
  "Lamination": COLORS.purple,
  "Die Cutting": COLORS.accent,
  "Formation": COLORS.green,
  "Manual Formation": "#10b981",
};

export const PROCESS_ICONS = {
  "Printing": "🖨️",
  "Varnish": "✨",
  "Lamination": "📋",
  "Die Cutting": "✂️",
  "Formation": "📦",
  "Manual Formation": "🤲",
};

export const SIDEBAR_TABS = [
  { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
  { id: 'search', label: '🔍 Search', icon: '🔍' },
  { id: 'purchase', label: '🛒 Purchase Orders', icon: '🛒' },
  { id: 'inward', label: '📥 Material Inward', icon: '📥' },
  { id: 'sales', label: '📋 Sales Orders', icon: '📋' },
  { id: 'jobs', label: '⚙️ Job Orders', icon: '⚙️' },
  { id: 'production', label: '🏭 Production', icon: '🏭' },
  { id: 'calendar', label: '📅 Calendar', icon: '📅' },
  { id: 'dispatch', label: '🚛 Dispatch', icon: '🚛' },
  { id: 'rawstock', label: '📦 Raw Stock', icon: '📦' },
  { id: 'fg', label: '✅ FG Stock', icon: '✅' },
  { id: 'consumablestock', label: '🔧 Consumables', icon: '🔧' },
  { id: 'sizemaster', label: '📏 Size Master', icon: '📏' },
  { id: 'vendormaster', label: '🏪 Vendors', icon: '🏪' },
  { id: 'clientmaster', label: '👥 Clients', icon: '👥' },
  { id: 'itemmaster', label: '📝 Items', icon: '📝' },
  { id: 'machinemaster', label: '⚙️ Machines', icon: '⚙️' },
  { id: 'printingmaster', label: '🖨️ Printing Details', icon: '🖨️' },
  { id: 'users', label: '👤 Users', icon: '👤' }
];
