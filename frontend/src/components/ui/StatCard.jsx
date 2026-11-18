import React, { useEffect, useRef, useState } from "react";

// Splits "₹2,02,85,991.5" / "3,43,447 kg" / 135 into prefix, number, decimals, suffix.
// Returns null when there isn't exactly one number (dates, "12 / 20", nodes...).
function parseValue(v) {
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = (String(v).split(".")[1] || "").length;
    return { pre: "", num: v, dec: d, suf: "" };
  }
  if (typeof v !== "string") return null;
  const m = v.match(/-?\d[\d,]*\.?\d*/g);
  if (!m || m.length !== 1) return null;
  const raw = m[0];
  const at = v.indexOf(raw);
  const num = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  return {
    pre: v.slice(0, at),
    num,
    dec: (raw.split(".")[1] || "").length,
    suf: v.slice(at + raw.length),
  };
}

// Counts from the previous shown value (0 on first render) to the new one.
function CountUp({ value }) {
  const parsed = parseValue(value);
  const [shown, setShown] = useState(parsed ? 0 : null);
  const from = useRef(0);
  const key = parsed
    ? `${parsed.pre}|${parsed.num}|${parsed.dec}|${parsed.suf}`
    : "";
  useEffect(() => {
    if (!parsed) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    const end = parsed.num;
    if (reduce || start === end) {
      from.current = end;
      setShown(end);
      return;
    }
    let raf;
    const t0 = performance.now();
    const dur = 800;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = start + (end - start) * e;
      from.current = cur;
      setShown(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!parsed) return <>{value}</>;
  const text = (shown ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: parsed.dec,
    maximumFractionDigits: parsed.dec,
  });
  return (
    <>
      {parsed.pre}
      {text}
      {parsed.suf}
    </>
  );
}

// Summary card: label, large value, optional change line, icon tile on the right.
// Styles live in .dash-stat (liquid-glass.css).
export function StatCard({
  label,
  value,
  unit,
  icon,
  dot,
  change,
  changeGood,
  note,
  selected,
  onClick,
}) {
  const interactive = typeof onClick === "function";
  return (
    <div
      className="dash-stat"
      data-selected={selected || undefined}
      data-static={interactive ? undefined : true}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e)
          : undefined
      }
    >
      <div className="dash-stat-body">
        <div className="dash-stat-label">
          {dot && (
            <span className="dash-stat-dot" style={{ background: dot }} />
          )}
          {label}
        </div>
        <div className="dash-stat-value">
          <CountUp value={value} />
          {unit && <span className="dash-stat-unit">{unit}</span>}
        </div>
        <div className="dash-stat-meta">
          {change != null ? (
            <>
              <span style={{ color: changeGood ? "#86b894" : "#e08a7a" }}>
                {change}
              </span>
              <span> vs last week</span>
            </>
          ) : (
            note || null
          )}
        </div>
      </div>
      {icon && (
        <div className="dash-stat-icon">
          <i className={icon} />
        </div>
      )}
    </div>
  );
}

export default StatCard;
