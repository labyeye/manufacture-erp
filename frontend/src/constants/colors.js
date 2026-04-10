// ── Color Palette ──────────────────────────────────────────────────────────
export const C = {
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

export const PROCESS_COLORS = {
  "Printing":         C.blue,
  "Varnish":          "#06b6d4",
  "Lamination":       C.purple,
  "Die Cutting":      C.accent,
  "Formation":        C.green,
  "Manual Formation": "#10b981",
};

export const PROCESS_ICONS = {
  "Printing":         "🖨️",
  "Varnish":          "✨",
  "Lamination":       "📋",
  "Die Cutting":      "✂️",
  "Formation":        "📦",
  "Manual Formation": "🤲",
};

export const MACHINE_TYPE_COLORS = {
  "Printing":      C.blue,
  "Cutting":       "#f97316",
  "Die Cutting":   C.accent,
  "Bag Making":    C.purple,
  "Sheeting":      "#06b6d4",
  "Sheet Cutting": "#06b6d4",
  "Formation":     C.green,
  "Handmade":      C.yellow,
};

export const MACHINE_TYPE_ICONS = {
  "Printing":      "🖨️",
  "Cutting":       "✂️",
  "Die Cutting":   "🔪",
  "Bag Making":    "🛍️",
  "Sheeting":      "📄",
  "Sheet Cutting": "📄",
  "Formation":     "🏭",
  "Handmade":      "🙌",
};

export const ITEM_TYPE_COLORS = {
  "Raw Material": "#3b82f6",
  "Consumable": "#eab308",
  "Finished Goods": "#22c55e",
  "Machine Spare": "#ef4444"
};

export const STAGES = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];
export const MACHINE_TYPES = Object.keys(MACHINE_TYPE_COLORS);
