export const C = {
  bg: "#131313",
  surface: "#1a1a1a",
  card: "#1a1a1a",
  border: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.08)",
  accent: "#c8955a",
  accentBg: "rgba(200,149,90,0.14)",
  badge: "rgba(255,255,255,0.06)",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  red: "#ef4444",
  purple: "#a78bfa",
  mint: "#8fcfb4",
  text: "#ededed",
  muted: "#8a8a8a",
  placeholder: "#6b6b6b",
  inputBg: "#1a1a1a",
  scrollbar: "rgba(255,255,255,0.16)",
};

export const GLASS = {
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.08)",
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

// Muted avatar fills that sit well with the copper/neutral palette.
export const AVATAR_COLORS = [
  "#c8955a", // copper
  "#8fcfb4", // mint
  "#d9b98a", // sand
  "#9fb3c8", // slate
  "#d49a8a", // clay
  "#b5c99a", // sage
];

export const avatarColor = (name = "") => {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
