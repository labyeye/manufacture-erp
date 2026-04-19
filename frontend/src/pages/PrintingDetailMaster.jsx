import React, { useState, useEffect, useMemo } from "react";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Badge,
  Field,
  SubmitBtn,
  ImportBtn,
  ExportBtn,
  TemplateBtn,
} from "../components/ui/BasicComponents";
import { printingDetailMasterAPI, companyMasterAPI } from "../api/auth";
import * as XLSX from "xlsx";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

export default function PrintingDetailMaster({ toast }) {
  const [printingMaster, setPrintingMaster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyMaster, setCompanyMaster] = useState([]);
  const fileInputRef = React.useRef(null);

  const blankEntry = {
    itemName: "",
    companyName: "",
    companyCategory: "",
    itemCategory: "",
    printing: "",
    plate: "",
    process: [],
    paperCategory: "Paper Sheets",
    paperType: "",
    paperGsm: "",
    noOfUps: "",
    sheetUom: "mm",
    sheetW: "",
    sheetL: "",
    reelSize: "",
    reelWidthMm: "",
    cuttingLengthMm: "",
  };

  const [entry, setEntry] = useState(blankEntry);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState("records"); 
  const [editingId, setEditingId] = useState(null);
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    fetchPrintingDetails();
    fetchCompanies();
  }, []);

  const fetchPrintingDetails = async () => {
    setLoading(true);
    try {
      const res = await printingDetailMasterAPI.getAll();
      setPrintingMaster(res.printingDetails || []);
    } catch (error) {
      toast?.("Failed to load printing details", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await companyMasterAPI.getAll();
      setCompanyMaster(res || []);
    } catch (error) {
      console.error("Fetch companies error:", error);
    }
  };

  const setField = (k, v) => {
    setEntry((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: false }));
  };

  const toggleProcess = (proc) => {
    setEntry((f) => ({
      ...f,
      process: f.process.includes(proc)
        ? f.process.filter((p) => p !== proc)
        : [...f.process, proc],
    }));
  };

  const filteredData = useMemo(() => {
    return printingMaster.filter((item) => {
      const matchesSearch =
        item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemCategory?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = catFilter === "All" || item.itemCategory === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [printingMaster, searchTerm, catFilter]);

  const uniqueCategories = useMemo(() => {
    const cats = printingMaster.map((i) => i.itemCategory).filter(Boolean);
    return ["All", ...new Set(cats)];
  }, [printingMaster]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      printingMaster.map((item) => ({
        "Item Name": item.itemName,
        "Company Name": item.companyName,
        "Company Category": item.companyCategory,
        Printing: item.printing,
        Plate: item.plate,
        Process: item.process?.join(", "),
        "Paper Category": item.paperCategory,
        "Paper Type": item.paperType,
        "Paper GSM": item.paperGsm,
        "No. of Ups": item.noOfUps,
        "Sheet UOM": item.sheetUom,
        "Sheet W": item.sheetW,
        "Sheet L": item.sheetL,
        "Reel Width (mm)": item.reelWidthMm,
        "Cutting Length (mm)": item.cuttingLengthMm,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PrintingDetails");
    XLSX.writeFile(wb, "Printing_Detail_Master.xlsx");
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Item Name": "Paper Soup Bowl 250ml",
        "Company Name": "Kanak",
        "Company Category": "HP",
        Printing: "4",
        Plate: "Old",
        Process: "Printing, Die Cutting, Formation",
        "Paper Category": "Paper Sheets",
        "Paper Type": "White PE Coated",
        "Paper GSM": 330,
        "No. of Ups": 24,
        "Sheet UOM": "mm",
        "Sheet W": 660,
        "Sheet L": 920,
        "Reel Width (mm)": "",
        "Cutting Length (mm)": "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Printing_Detail_Template.xlsx");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const details = data.map((row) => ({
          itemName: row["Item Name"],
          companyName: row["Company Name"],
          companyCategory: row["Company Category"],
          printing: row["Printing"],
          plate: row["Plate"],
          process: row["Process"]
            ? row["Process"].split(",").map((s) => s.trim())
            : [],
          paperCategory: row["Paper Category"] || "Paper Sheets",
          paperType: row["Paper Type"],
          paperGsm: Number(row["Paper GSM"]),
          noOfUps: Number(row["No. of Ups"]),
          sheetUom: row["Sheet UOM"] || "mm",
          sheetW: Number(row["Sheet W"]),
          sheetL: Number(row["Sheet L"]),
          reelWidthMm: row["Reel Width (mm)"]
            ? Number(row["Reel Width (mm)"])
            : undefined,
          cuttingLengthMm: row["Cutting Length (mm)"]
            ? Number(row["Cutting Length (mm)"])
            : undefined,
        }));

        await printingDetailMasterAPI.bulkImport(details);
        toast?.("Import successful", "success");
        fetchPrintingDetails();
      } catch (err) {
        toast?.("Import failed: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const submit = async () => {
    const err = {};
    if (!entry.itemName) err.itemName = true;
    if (!entry.companyName) err.companyName = true;
    setErrors(err);

    if (Object.keys(err).length > 0) {
      toast("Item Name and Company Name are required", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await printingDetailMasterAPI.update(editingId, entry);
        toast("Detail updated successfully", "success");
        setEditingId(null);
      } else {
        await printingDetailMasterAPI.create(entry);
        toast("Detail saved successfully", "success");
      }
      setEntry(blankEntry);
      setView("records");
      fetchPrintingDetails();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save detail", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setEntry({ ...item });
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this detail?")) return;
    try {
      await printingDetailMasterAPI.delete(id);
      toast("Detail deleted", "success");
      fetchPrintingDetails();
    } catch (error) {
      toast("Delete failed", "error");
    }
  };

  const TABLE_HEADER_STYLE = {
    fontSize: 11,

    color: "#94a3b8",
    textTransform: "uppercase",
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: `1px solid ${C.border}44`,
  };

  const CELL_STYLE = {
    padding: "16px",
    fontSize: 13,
    color: "#e2e8f0",
    borderBottom: `1px solid ${C.border}22`,
  };

  return (
    <div className="fade" style={{ color: "#e2e8f0" }}>
      <SectionTitle
        icon="🖨️"
        title="Printing Detail Master"
        sub="Saved printing specs per item — auto-populates new Job Orders"
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", width: 280 }}>
            <input
              placeholder="Search items, clients or sizes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                background: "#1e293b",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            >
              🔍
            </span>
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{
              padding: "9px 12px",
              background: "#1e293b",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 13,
              color: "#e2e8f0",
              outline: "none",
              cursor: "pointer",
              minWidth: 150,
            }}
          >
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <TemplateBtn onClick={downloadTemplate} />

          <ImportBtn onClick={() => fileInputRef.current?.click()} />
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".xlsx, .xls"
            onChange={handleImport}
          />

          <ExportBtn onClick={exportToExcel} />

          <button
            onClick={() => setView("form")}
            style={{
              background: "#FF7F11",
              color: "#fff",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 14px 0 rgba(255, 127, 17, 0.39)",
            }}
          >
            {editingId ? (
              <span style={{ fontSize: 16 }}>✏️</span>
            ) : (
              <span style={{ fontSize: 16 }}>➕</span>
            )}
            {editingId ? "Edit Spec" : "Add Spec"}
          </button>
        </div>
      </div>

      {view === "form" && (
        <Card style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#FF7F11" }}>
              {editingId
                ? "Edit Printing Specification"
                : "New Printing Specification"}
            </h3>
            <button
              onClick={() => {
                setView("records");
                setEditingId(null);
                setEntry(blankEntry);
              }}
              style={{
                color: C.muted,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕ Close
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            <Field label="Item Name *">
              <input
                placeholder="Item name"
                value={entry.itemName}
                onChange={(e) => setField("itemName", e.target.value)}
                style={{ border: errors.itemName ? "1px solid red" : "" }}
              />
            </Field>
            <Field label="Company Name *">
              <input
                placeholder="Company name"
                value={entry.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                style={{ border: errors.companyName ? "1px solid red" : "" }}
              />
            </Field>
            <Field label="Company Category">
              <input
                placeholder="e.g. HP"
                value={entry.companyCategory}
                onChange={(e) => setField("companyCategory", e.target.value)}
              />
            </Field>
            <Field label="Item Category">
              <input
                placeholder="e.g. Stickers, Labels"
                value={entry.itemCategory}
                onChange={(e) => setField("itemCategory", e.target.value)}
              />
            </Field>
            <Field label="Printing">
              <select
                value={entry.printing}
                onChange={(e) => setField("printing", e.target.value)}
              >
                <option value="">-- Printing --</option>
                {["No Printing", "1", "2", "3", "4", "5", "6"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plate">
              <select
                value={entry.plate}
                onChange={(e) => setField("plate", e.target.value)}
              >
                <option value="">-- Plate --</option>
                {["Plain", "Old", "New"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paper Category">
              <select
                value={entry.paperCategory}
                onChange={(e) => setField("paperCategory", e.target.value)}
              >
                {["Paper Sheets", "Paper Reel"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paper Type">
              <input
                placeholder="Paper type"
                value={entry.paperType}
                onChange={(e) => setField("paperType", e.target.value)}
              />
            </Field>
            <Field label="Paper GSM">
              <input
                type="number"
                placeholder="GSM"
                value={entry.paperGsm}
                onChange={(e) => setField("paperGsm", e.target.value)}
              />
            </Field>

            <Field label="# of Ups">
              <input
                type="number"
                placeholder="Ups"
                value={entry.noOfUps}
                onChange={(e) => setField("noOfUps", e.target.value)}
              />
            </Field>

            {entry.paperCategory === "Paper Sheets" ? (
              <>
                <Field label="Sheet UOM">
                  <select
                    value={entry.sheetUom}
                    onChange={(e) => setField("sheetUom", e.target.value)}
                  >
                    {["mm", "inch", "cm"].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sheet Width">
                  <input
                    type="number"
                    placeholder="Width"
                    value={entry.sheetW}
                    onChange={(e) => setField("sheetW", e.target.value)}
                  />
                </Field>
                <Field label="Sheet Length">
                  <input
                    type="number"
                    placeholder="Length"
                    value={entry.sheetL}
                    onChange={(e) => setField("sheetL", e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Reel Width (mm)">
                  <input
                    type="number"
                    placeholder="Width"
                    value={entry.reelWidthMm}
                    onChange={(e) => setField("reelWidthMm", e.target.value)}
                  />
                </Field>
                <Field label="Cutting Length (mm)">
                  <input
                    type="number"
                    placeholder="Length"
                    value={entry.cuttingLengthMm}
                    onChange={(e) =>
                      setField("cuttingLengthMm", e.target.value)
                    }
                  />
                </Field>
              </>
            )}

            <Field label="Processes" span={4}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                {[
                  "Printing",
                  "Varnish",
                  "Lamination",
                  "Die Cutting",
                  "Formation",
                  "Manual Formation",
                ].map((proc) => (
                  <label
                    key={proc}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      background: entry.process.includes(proc)
                        ? "#FF7F1122"
                        : "#1e293b",
                      padding: "6px 12px",
                      borderRadius: 20,
                      border: `1px solid ${entry.process.includes(proc) ? "#FF7F11" : "#334155"}`,
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      hidden
                      checked={entry.process.includes(proc)}
                      onChange={() => toggleProcess(proc)}
                    />
                    <span
                      style={{
                        color: entry.process.includes(proc)
                          ? "#FF7F11"
                          : "#94a3b8",
                      }}
                    >
                      {entry.process.includes(proc) ? "✓" : "+"} {proc}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <SubmitBtn
              label={editingId ? "Update Specification" : "Save Specification"}
              color="#FF7F11"
              onClick={submit}
            />
            <button
              onClick={() => {
                setView("records");
                setEditingId(null);
                setEntry(blankEntry);
              }}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.muted,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a" }}>
                <th style={TABLE_HEADER_STYLE}>Item Name / Company</th>
                <th style={TABLE_HEADER_STYLE}>Item Cat.</th>
                <th style={TABLE_HEADER_STYLE}>Company Cat.</th>
                <th style={TABLE_HEADER_STYLE}>Printing Plate</th>
                <th style={TABLE_HEADER_STYLE}>Process</th>
                <th style={TABLE_HEADER_STYLE}>Paper Type</th>
                <th style={TABLE_HEADER_STYLE}>GSM</th>
                <th style={TABLE_HEADER_STYLE}>Ups / Reel</th>
                <th style={TABLE_HEADER_STYLE}>Size / Width</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    style={{ padding: 48, textAlign: "center", color: C.muted }}
                  >
                    No records found.
                  </td>
                </tr>
              )}
              {filteredData.map((item) => (
                <tr key={item._id} className="row-hover">
                  <td style={CELL_STYLE}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {item.itemName}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {item.companyName}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button
                        onClick={() => handleEdit(item)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#FF7F11",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                  <td style={CELL_STYLE}>
                    {item.itemCategory ? (
                      <Badge text={item.itemCategory} color="#FF7F11" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={CELL_STYLE}>
                    {item.companyCategory ? (
                      <Badge text={item.companyCategory} color="#3b82f6" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={CELL_STYLE}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {item.plate && (
                        <Badge text={item.plate} color="#3b82f6" />
                      )}
                      <span style={{ fontWeight: 700 }}>
                        {item.printing || "0"}
                      </span>
                    </div>
                  </td>
                  <td style={CELL_STYLE}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                        maxWidth: 200,
                      }}
                    >
                      {(item.process || []).map((p) => (
                        <span
                          key={p}
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#FF7F1115",
                            color: "#FF7F11",
                            fontWeight: 800,
                            border: "1px solid #FF7F1133",
                          }}
                        >
                          {p.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={CELL_STYLE}>{item.paperType || "—"}</td>
                  <td style={CELL_STYLE}>
                    <span style={{ color: "#3b82f6", fontWeight: 700 }}>
                      {item.paperGsm}g
                    </span>
                  </td>
                  <td style={CELL_STYLE}>
                    <div style={{ fontWeight: 700 }}>
                      {item.paperCategory === "Paper Sheets"
                        ? item.noOfUps || "—"
                        : "—"}
                    </div>
                  </td>
                  <td style={CELL_STYLE}>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>
                      {item.paperCategory === "Paper Reel"
                        ? `${item.reelWidthMm || "—"}mm`
                        : item.sheetW && item.sheetL
                          ? `${item.sheetW}x${item.sheetL}${item.sheetUom}`
                          : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <style>{`
        .row-hover:hover { background: #1e293b44; }
        .row-hover { transition: background 0.2s; }
        input, select { 
          width: 100%; 
          padding: 10px 12px; 
          background: #1e293b; 
          border: 1px solid #334155; 
          border-radius: 8px; 
          color: #fff; 
          font-size: 13px;
        }
        input:focus { outline: none; border-color: #FF7F11; }
      `}</style>
    </div>
  );
}
