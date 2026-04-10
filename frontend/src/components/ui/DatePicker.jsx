import { useState, useEffect, useRef } from 'react';
import { COLORS } from '../../constants';

export function DatePicker({ value, onChange, style = {} }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDays = (year, month) => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  };

  const cells = getDays(viewDate.year, viewDate.month);
  const selDate = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () =>
    setViewDate(v =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }
    );
  const nextMonth = () =>
    setViewDate(v =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }
    );

  const select = (day) => {
    if (!day) return;
    const m = String(viewDate.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewDate.year}-${m}-${d}`);
    setOpen(false);
  };

  const display = value
    ? (() => {
        const d = new Date(value + "T00:00:00");
        return `${String(d.getDate()).padStart(2, "0")}/${String(
          d.getMonth() + 1
        ).padStart(2, "0")}/${d.getFullYear()}`;
      })()
    : "";

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: COLORS.inputBg,
          border: `1px solid ${open ? COLORS.accent : COLORS.border}`,
          borderRadius: 6,
          padding: "9px 12px",
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: display ? COLORS.text : COLORS.muted,
          userSelect: "none",
          transition: "border .2s"
        }}
      >
        <span>{display || "DD/MM/YYYY"}</span>
        <span style={{ fontSize: 14, color: COLORS.muted }}>📅</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 9999,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 14,
            width: 260,
            boxShadow: "0 8px 32px #0004"
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted,
                fontSize: 18,
                cursor: "pointer",
                padding: "0 4px"
              }}
            >
              ‹
            </button>
            <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.text }}>
              {MONTHS[viewDate.month]} {viewDate.year}
            </span>
            <button
              onClick={nextMonth}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted,
                fontSize: 18,
                cursor: "pointer",
                padding: "0 4px"
              }}
            >
              ›
            </button>
          </div>

          {/* Day names */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2,
              marginBottom: 4
            }}
          >
            {DAYS.map(d => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: COLORS.muted,
                  fontWeight: 700,
                  padding: "2px 0"
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2
            }}
          >
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisDate = new Date(viewDate.year, viewDate.month, day);
              const isSelected = selDate && thisDate.getTime() === selDate.getTime();
              const isToday = thisDate.getTime() === today.getTime();
              return (
                <div
                  key={i}
                  onClick={() => select(day)}
                  style={{
                    textAlign: "center",
                    padding: "5px 0",
                    borderRadius: 5,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: isSelected || isToday ? 700 : 400,
                    background: isSelected
                      ? COLORS.accent
                      : isToday
                      ? COLORS.accent + "22"
                      : "transparent",
                    color: isSelected ? "#fff" : isToday ? COLORS.accent : COLORS.text,
                    transition: "background .1s"
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = COLORS.surface;
                  }}
                  onMouseLeave={e => {
                    if (!isSelected)
                      e.currentTarget.style.background = isToday
                        ? COLORS.accent + "22"
                        : "transparent";
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div
            style={{
              marginTop: 10,
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: 8,
              textAlign: "center"
            }}
          >
            <button
              onClick={() => {
                const now = new Date();
                setViewDate({ year: now.getFullYear(), month: now.getMonth() });
                select(now.getDate());
              }}
              style={{
                background: "none",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 5,
                color: COLORS.muted,
                fontSize: 11,
                padding: "3px 12px",
                cursor: "pointer",
                fontFamily: "'Syne',sans-serif"
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
