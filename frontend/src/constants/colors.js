export const C = {
  bg: "#07070f",
  surface: "#0d0d1a",
  card: "rgba(255,255,255,0.23)",
  border: "rgba(255,255,255,0.18)",
  divider: "rgba(255,255,255,0.1)",
  accent: "#6366f1",
  accentBg: "rgba(99,102,241,0.15)",
  badge: "rgba(255,255,255,0.15)",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  red: "#ef4444",
  purple: "#a78bfa",
  text: "#ffffff",
  muted: "#64748b",
  placeholder: "#475569",
  inputBg: "rgba(255,255,255,0.23)",
  scrollbar: "rgba(255,255,255,0.18)",
};

export const GLASS = {
  background: "rgba(255,255,255,0.23)",
  border: "1px solid rgba(255,255,255,0.18)",
};

export const PROCESS_COLORS = {
  Printing: C.blue,
  Varnish: "#0891b2",
  Lamination: C.purple,
  "Die Cutting": "#ea580c",
  Formation: C.green,
  "Manual Formation": "#059669",
};

export const PROCESS_ICONS = {
  Printing: "fa-solid fa-print",
  Varnish: "fa-solid fa-droplet",
  Lamination: "fa-solid fa-layer-group",
  "Die Cutting": "fa-solid fa-scissors",
  Formation: "fa-solid fa-box",
  "Manual Formation": "fa-solid fa-hands",
};

export const MACHINE_TYPE_COLORS = {
  Printing: C.blue,
  Cutting: "#ea580c",
  "Die Cutting": "#ea580c",
  "Bag Making": C.purple,
  Sheeting: "#0891b2",
  "Sheet Cutting": "#0891b2",
  Formation: C.green,
  Handmade: C.yellow,
};

export const MACHINE_TYPE_ICONS = {
  Printing: "fa-solid fa-print",
  Cutting: "fa-solid fa-scissors",
  "Die Cutting": "fa-solid fa-scissors",
  "Bag Making": "fa-solid fa-bag-shopping",
  Sheeting: "fa-solid fa-file",
  "Sheet Cutting": "fa-solid fa-file",
  Formation: "fa-solid fa-industry",
  Handmade: "fa-solid fa-hands",
};

export const ITEM_TYPE_COLORS = {
  "Raw Material": C.blue,
  Consumable: C.yellow,
  "Finished Goods": C.green,
  "Machine Spare": C.red,
};

export const STAGES = [
  "Printing",
  "Varnish",
  "Lamination",
  "Die Cutting",
  "Formation",
  "Manual Formation",
];
export const MACHINE_TYPES = Object.keys(MACHINE_TYPE_COLORS);
