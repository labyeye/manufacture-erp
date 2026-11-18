// Compact rupee format used on summary cards: ₹3.08Cr, ₹2.50L, ₹12.5K.
export const fmtLakh = (n) => {
  const v = +(n || 0);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

// Compact plain number for quantity cards: 65.52L, 1.20Cr, 12.5K.
export const fmtCompact = (n) => {
  const v = +(n || 0);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
