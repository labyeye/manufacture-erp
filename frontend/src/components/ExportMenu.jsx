import React, { useEffect, useRef, useState } from "react";
import { readTables, exportExcel, exportPDF } from "../utils/exportTable";

// Header export menu. Exports whatever table(s) the current page is showing.
export default function ExportMenu({ getRoot, title, toast }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const run = (kind) => {
    setOpen(false);
    const tables = readTables(getRoot());
    if (!tables.length) {
      toast?.("No table to export on this page", "error");
      return;
    }
    if (kind === "xlsx") exportExcel(tables, title);
    else exportPDF(tables, title);
  };

  const item = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 36,
    padding: "0 12px",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    color: "#dfe2f4",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="lg-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ height: 36 }}
      >
        <i className="fa-solid fa-file-export" style={{ fontSize: 12 }} />
        Export
        <i
          className="fa-solid fa-chevron-down"
          style={{ fontSize: 10, opacity: 0.7 }}
        />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            width: 184,
            padding: 4,
            background: "#101339",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 60,
          }}
        >
          <button
            role="menuitem"
            style={item}
            className="export-item"
            onClick={() => run("xlsx")}
          >
            <i
              className="fa-solid fa-file-excel"
              style={{ width: 16, color: "#a9aed3" }}
            />
            Excel (.xlsx)
          </button>
          <button
            role="menuitem"
            style={item}
            className="export-item"
            onClick={() => run("pdf")}
          >
            <i
              className="fa-solid fa-file-pdf"
              style={{ width: 16, color: "#a9aed3" }}
            />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
