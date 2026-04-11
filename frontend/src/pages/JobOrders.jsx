import React, { useState, useEffect, useMemo } from "react";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Badge,
  Field,
  SubmitBtn,
  AutocompleteInput,
  DatePicker,
  DateRangeFilter,
} from "../components/ui/BasicComponents";
import { jobOrdersAPI, salesOrdersAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const RM_ITEMS = ["Paper Reel", "Paper Sheets"];
const PAPER_TYPES_BY_ITEM = {
  "Paper Reel": ["MG Kraft", "MF Kraft", "Bleached Kraft", "OGR"],
  "Paper Sheets": [
    "White PE Coated",
    "Kraft PE Coated",
    "Kraft Uncoated",
    "SBS/FBB",
    "Whiteback",
    "Greyback",
    "Art Paper",
    "Gumming Sheet",
  ],
};

const PRINTING_OPTIONS = [
  "No Printing",
  "1 Color",
  "2 Color",
  "3 Color",
  "4 Color",
  "5 Color",
  "6 Color",
  "Flexo",
  "Offset",
  "Digital",
];
const PLATE_OPTIONS = [
  "No Plate",
  "Polymer Plate",
  "Zinc Plate",
  "Flexo Plate",
  "Offset Plate",
];
const PROCESS_TAGS = [
  "Printing",
  "Varnish",
  "Lamination",
  "Die Cutting",
  "Formation",
  "Manual Formation",
  "Pasting",
  "Stitching",
  "Coating",
  "Slitting",
  "Folding",
  "Assembly",
  "Packing",
  "QC",
];
const SHEET_UOM_OPTIONS = ["mm", "inch", "cm"];


const SubLabel = ({ text }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.09em",
      color: C.yellow || "#facc15",
      textTransform: "uppercase",
      marginBottom: 14,
      marginTop: 4,
    }}
  >
    {text}
  </div>
);


const AutoField = ({ value, placeholder }) => (
  <div
    style={{
      padding: "9px 12px",
      background: C.inputBg,
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      fontSize: 13,
      color: value ? C.text || "#e5e7eb" : C.muted,
      minHeight: 38,
    }}
  >
    {value || placeholder}
  </div>
);

export default function JobOrders(props) {
  const {
    machineMaster = {},
    rawStock = [],
    setRawStock,
    toast,
    clientMaster = [],
  } = props;
  const [jobOrders, setJobOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const blankHeader = {
    joDate: today(),
    soRef: "",
    clientName: "",
    clientCategory: "",
    itemName: "",
    size: "",
    orderDate: "",
    deliveryDate: "",
    orderQty: "",
    printing: "",
    plate: "",
    processes: [],
    paperCategory: "",
    paperType: "",
    paperGsm: "",
    reelSize: "",
    reelWidth: "",
    cuttingLength: "",
    reelWeight: "",
    hasSecondPaper: false,
    paperType2: "",
    paperGsm2: "",
    remarks: "",
  };

  const [header, setHeader] = useState(blankHeader);
  const [headerErrors, setHeaderErrors] = useState({});
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);

  const uniqueClientCategories = useMemo(() => {
    return [
      ...new Set((clientMaster || []).map((c) => c.category).filter(Boolean)),
    ];
  }, [clientMaster]);

  
  useEffect(() => {
    fetchJobOrders();
    fetchSalesOrders();
  }, []);

  const fetchJobOrders = async () => {
    try {
      const res = await jobOrdersAPI.getAll();
      setJobOrders(res || []);
    } catch (error) {
      toast?.("Failed to load job orders", "error");
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await salesOrdersAPI.getAll();
      setSalesOrders(res.salesOrders || []);
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
    }
  };
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");

  const soOptions = useMemo(
    () => (salesOrders || []).filter((s) => s.status !== "Completed"),
    [salesOrders],
  );

  
  const sheetSize = useMemo(() => {
    if (header.sheetW && header.sheetL && header.sheetUom)
      return `${header.sheetW} × ${header.sheetL} ${header.sheetUom}`;
    return "";
  }, [header.sheetW, header.sheetL, header.sheetUom]);

  const setH = (k, v) => {
    setHeader((f) => {
      const updated = { ...f, [k]: v };
      if (k === "soRef" && v) {
        const so = soOptions.find((s) => s.soNo === v);
        if (so) {
          updated.clientName = so.clientName || "";
          updated.clientCategory = so.clientCategory || "";
          updated.orderDate = so.orderDate || "";
          updated.deliveryDate = so.deliveryDate || "";
          const soItems = so.items || [];
          if (soItems.length > 0) {
            updated.itemName = soItems[0].itemName || "";
            updated.size = soItems[0].size || "";
            updated.orderQty = soItems[0].orderQty || "";
          }
        }
      }
      return updated;
    });
    setHeaderErrors((e) => ({ ...e, [k]: false }));
  };

  const toggleProcess = (proc) => {
    setHeader((f) => {
      const procs = f.processes || [];
      const exists = procs.includes(proc);
      return {
        ...f,
        processes: exists ? procs.filter((p) => p !== proc) : [...procs, proc],
      };
    });
  };

  const EH = (k) => (headerErrors[k] ? { border: `1px solid ${C.red}` } : {});
  const EHMsg = (k) =>
    headerErrors[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  const validateRMStock = () => {
    if (!header.paperType || !header.paperGsm) return true;
    
    // Find stock matching category, type and gsm
    const stock = (rawStock || []).find((s) => {
      const sCat = (s.category || s.paperCategory || "").toLowerCase();
      const sType = (s.name || s.paperType || "").toLowerCase();
      const sGsm = (s.gsm || s.paperGsm || 0).toString();

      return (
        sCat === header.paperCategory.toLowerCase() &&
        sType.includes(header.paperType.toLowerCase()) &&
        sGsm === header.paperGsm.toString()
      );
    });

    if (!stock || (stock.qty <= 0 && stock.weight <= 0)) {
      const stockName = `${header.paperCategory} | ${header.paperType} | ${header.paperGsm}gsm`;
      toast(`Insufficient RM stock: ${stockName}`, "error");
      return false;
    }
    return true;
  };

  const submit = async () => {
    const he = {};
    if (!header.joDate) he.joDate = true;
    if (!header.soRef) he.soRef = true;
    if (!header.paperCategory) he.paperCategory = true;
    if (!header.paperType) he.paperType = true;
    if (!header.paperGsm) he.paperGsm = true;
    setHeaderErrors(he);

    if (Object.keys(he).length > 0) {
      toast("Please fill all required fields", "error");
      return;
    }
    if (!validateRMStock()) return;

    setLoading(true);
    try {
      const payload = {
        jobcardDate: new Date(header.joDate),
        soRef: header.soRef,
        clientName: header.clientName,
        clientCategory: header.clientCategory,
        itemName: header.itemName,
        orderQty: Number(header.orderQty),
        deliveryDate: header.deliveryDate ? new Date(header.deliveryDate) : null,
        process: header.processes,
        printing: header.printing,
        plate: header.plate,
        paperCategory: header.paperCategory,
        paperType: header.paperType,
        paperGsm: Number(header.paperGsm),
        reelSize: header.reelSize,
        reelWidthMm: Number(header.reelWidth),
        cuttingLengthMm: Number(header.cuttingLength),
        reelWeightKg: Number(header.reelWeight),
        hasSecondPaper: header.hasSecondPaper,
        paperType2: header.paperType2,
        paperGsm2: header.paperGsm2 ? Number(header.paperGsm2) : null,
        remarks: header.remarks,
      };

      if (editId) {
        await jobOrdersAPI.update(editId, payload);
        toast("Job Order updated successfully", "success");
        setEditId(null);
      } else {
        const res = await jobOrdersAPI.create(payload);
        toast(`Job Order ${res.joNo} created successfully`, "success");
      }

      setHeader(blankHeader);
      setHeaderErrors({});
      setView("records");
      fetchJobOrders();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save job order", "error");
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div className="fade">
      <SectionTitle
        icon="⚙️"
        title="Job Orders"
        sub="Create production job orders linked to sales orders"
      />

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["form", "📝 New Job Order"],
          ["records", `📋 Records (${jobOrders.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? C.yellow || "#facc15" : C.border}`,
              background: view === v ? C.yellow || "#facc15" : "transparent",
              color: view === v ? "#000" : C.muted,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {}
      {view === "form" && (
        <Card>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.yellow || "#facc15",
              marginBottom: 24,
            }}
          >
            New Job Card
          </h3>

          {}
          <SubLabel text="Basic Details" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <Field label="Jobcard Date *">
              <DatePicker
                value={header.joDate}
                onChange={(v) => setH("joDate", v)}
                style={EH("joDate")}
              />
              {EHMsg("joDate")}
            </Field>
            <Field label="Sales Order # *">
              <select
                value={header.soRef}
                onChange={(e) => setH("soRef", e.target.value)}
                style={EH("soRef")}
              >
                <option value="">-- Select Sales Order --</option>
                {soOptions.map((s) => (
                  <option key={s.soNo} value={s.soNo}>
                    {s.soNo} — {s.clientName}
                  </option>
                ))}
              </select>
              {EHMsg("soRef")}
            </Field>
            <Field label="Order Date">
              <AutoField 
                value={header.orderDate ? new Date(header.orderDate).toLocaleDateString('en-GB') : ""} 
                placeholder="DD/MM/YYYY" 
              />
            </Field>
            <Field label="Delivery Date">
              <AutoField 
                value={header.deliveryDate ? new Date(header.deliveryDate).toLocaleDateString('en-GB') : ""} 
                placeholder="DD/MM/YYYY" 
              />
            </Field>
          </div>

          {}
          <SubLabel text="Client & Item Details" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <Field label="Client Name">
              <AutoField
                value={header.clientName}
                placeholder="Enter client name"
              />
            </Field>
            <Field label="Client Category *">
              <select
                value={header.clientCategory}
                onChange={(e) => setH("clientCategory", e.target.value)}
              >
                <option value="">-- Select --</option>
                {uniqueClientCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Item Name *">
              <input
                placeholder="Enter item name"
                value={header.itemName}
                onChange={(e) => setH("itemName", e.target.value)}
              />
            </Field>
            <Field label="Size *">
              <input
                placeholder="Size"
                value={header.size}
                onChange={(e) => setH("size", e.target.value)}
              />
            </Field>
          </div>

          {}
          <SubLabel text="Production Details" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 2fr",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <Field label="Order Quantity">
              <input
                type="number"
                placeholder="Order quantity"
                value={header.orderQty}
                onChange={(e) => setH("orderQty", e.target.value)}
              />
            </Field>
            <Field label="Printing *">
              <select
                value={header.printing}
                onChange={(e) => setH("printing", e.target.value)}
              >
                <option value="">-- Select Printing --</option>
                {PRINTING_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Plate *">
              <select
                value={header.plate}
                onChange={(e) => setH("plate", e.target.value)}
              >
                <option value="">-- Select Plate --</option>
                {PLATE_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Process *">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  paddingTop: 2,
                }}
              >
                {PROCESS_TAGS.map((proc) => {
                  const active = (header.processes || []).includes(proc);
                  return (
                    <button
                      key={proc}
                      onClick={() => toggleProcess(proc)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 5,
                        border: `1px solid ${active ? C.yellow || "#facc15" : C.border}`,
                        background: active
                          ? (C.yellow || "#facc15") + "22"
                          : "transparent",
                        color: active ? C.yellow || "#facc15" : C.muted,
                        fontWeight: active ? 700 : 400,
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {proc}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {}
          <SubLabel text="Sheet / Reel Details" />

          {}
          {/* Row 1: 5 Columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.5fr 1fr 1.2fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <Field label="PAPER CATEGORY *">
              <select
                value={header.paperCategory}
                onChange={(e) => setH("paperCategory", e.target.value)}
                style={EH("paperCategory")}
              >
                <option value="">-- Paper Reel or Sheet --</option>
                {RM_ITEMS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
              {EHMsg("paperCategory")}
            </Field>
            <Field label="PAPER TYPE *">
              <select
                value={header.paperType}
                onChange={(e) => setH("paperType", e.target.value)}
                disabled={!header.paperCategory}
                style={EH("paperType")}
              >
                <option value="">
                  {header.paperCategory
                    ? "-- Select Paper Type --"
                    : "-- Select Category first --"}
                </option>
                {(PAPER_TYPES_BY_ITEM[header.paperCategory] || []).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              {EHMsg("paperType")}
            </Field>
            <Field label="PAPER GSM *">
              <input
                type="number"
                placeholder="e.g. 300"
                value={header.paperGsm}
                onChange={(e) => setH("paperGsm", e.target.value)}
                style={EH("paperGsm")}
              />
              {EHMsg("paperGsm")}
            </Field>
            <Field label="REEL SIZE *">
              <AutocompleteInput
                value={header.reelSize}
                onChange={(v) => setH("reelSize", v)}
                suggestions={[]} // Add relevant suggestions if available
                placeholder="Select or type reel"
              />
            </Field>
            <Field label="REEL WIDTH (MM)">
              <input
                type="number"
                placeholder="e.g. 690"
                value={header.reelWidth}
                onChange={(e) => setH("reelWidth", e.target.value)}
              />
            </Field>
          </div>

          {/* Row 2: 3 Columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr 2.5fr",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <Field label="CUTTING LENGTH (MM)">
              <input
                type="number"
                placeholder="e.g. 920"
                value={header.cuttingLength}
                onChange={(e) => setH("cuttingLength", e.target.value)}
              />
            </Field>
            <Field label="REEL WEIGHT REQUIRED (KG) *">
              <input
                type="number"
                placeholder="e.g. 200"
                value={header.reelWeight}
                onChange={(e) => setH("reelWeight", e.target.value)}
              />
            </Field>
            <Field label="REMARKS">
              <input
                placeholder="Special instructions"
                value={header.remarks}
                onChange={(e) => setH("remarks", e.target.value)}
              />
            </Field>
          </div>

          {}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                color: C.muted,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Second Paper
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={header.hasSecondPaper}
                onChange={(e) => setH("hasSecondPaper", e.target.checked)}
              />
              <span style={{ color: C.muted }}>
                This job uses a second paper
              </span>
            </label>

            {header.hasSecondPaper && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr",
                  gap: 14,
                  marginTop: 14,
                }}
              >
                <Field label="Paper 2 Type">
                  <select
                    value={header.paperType2}
                    onChange={(e) => setH("paperType2", e.target.value)}
                  >
                    <option value="">-- Select Type --</option>
                    {(PAPER_TYPES_BY_ITEM[header.paperCategory] || []).map(
                      (p) => (
                        <option key={p}>{p}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Paper 2 GSM">
                  <input
                    type="number"
                    placeholder="e.g. 130"
                    value={header.paperGsm2}
                    onChange={(e) => setH("paperGsm2", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SubmitBtn
              label={editId ? "Update Job Order" : "Create Job Order"}
              color={C.yellow || "#facc15"}
              onClick={submit}
              disabled={loading}
            />
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setHeader(blankHeader);
                  setHeaderErrors({});
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: "transparent",
                  color: C.muted,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      )}

      {}
      {view === "records" && (
        <Card>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.muted,
                margin: 0,
              }}
            >
              Job Orders
            </h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {jobOrders.length} jobs
            </span>
          </div>

          {jobOrders.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No job orders yet.
            </div>
          )}

          {(jobOrders || [])
            .slice()
            .reverse()
            .map((r) => {
              const handleEdit = (jo) => {
                setEditId(jo._id);
                setHeader({
                  joDate: new Date(jo.jobcardDate).toISOString().slice(0, 10),
                  soRef: jo.soRef || "",
                  clientName: jo.clientName || "",
                  clientCategory: jo.clientCategory || "",
                  itemName: jo.itemName || "",
                  size: "",
                  orderDate: "",
                  deliveryDate: jo.deliveryDate ? new Date(jo.deliveryDate).toISOString().slice(0, 10) : "",
                  orderQty: jo.orderQty || "",
                  printing: jo.printing || "",
                  plate: jo.plate || "",
                  processes: jo.process || [],
                  paperCategory: jo.paperCategory || "",
                  paperType: jo.paperType || "",
                  paperGsm: jo.paperGsm || "",
                  noOfUps: jo.noOfUps || "",
                  noOfSheets: jo.noOfSheets || "",
                  sheetUom: jo.sheetUom || "mm",
                  sheetW: jo.sheetW || "",
                  sheetL: jo.sheetL || "",
                  hasSecondPaper: jo.hasSecondPaper || false,
                  paperType2: jo.paperType2 || "",
                  paperGsm2: jo.paperGsm2 || "",
                  remarks: jo.remarks || "",
                });
                setView("form");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              };

              const handleDelete = async (id) => {
                if (!confirm('Delete this job order?')) return;
                try {
                  await jobOrdersAPI.delete(id);
                  toast('Job order deleted successfully', 'success');
                  fetchJobOrders();
                } catch (error) {
                  toast(error.response?.data?.error || 'Failed to delete job order', 'error');
                }
              };

              return (
              <div
                key={r._id || r.id}
                style={{
                  borderBottom: `1px solid ${C.border}22`,
                  padding: "12px 4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.yellow || "#facc15", fontWeight: 700 }}>
                        {r.joNo}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {r.jobcardDate ? new Date(r.jobcardDate).toLocaleDateString('en-GB') : "N/A"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {r.clientName}
                      </span>
                      <Badge text={r.itemName} color={C.blue} />
                      <span style={{ fontSize: 13, color: C.muted }}>
                        Qty: {fmt(r.orderQty)}
                      </span>
                      <Badge text={r.status} color={r.status === "Completed" ? C.green : C.orange} />
                    </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleEdit(r)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 4,
                        border: `1px solid ${C.yellow || "#facc15"}`,
                        background: (C.yellow || "#facc15") + "22",
                        color: C.yellow || "#facc15",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r._id || r.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 4,
                        border: `1px solid ${C.red}`,
                        background: C.red + "22",
                        color: C.red,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {r.soRef && (
                    <span
                      style={{
                        fontSize: 11,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 4,
                        padding: "2px 8px",
                        color: C.muted,
                      }}
                    >
                      SO: {r.soRef}
                    </span>
                  )}
                  {r.itemName && (
                    <span
                      style={{
                        fontSize: 11,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 4,
                        padding: "2px 8px",
                        color: C.muted,
                      }}
                    >
                      {r.itemName}
                    </span>
                  )}
                  {r.paperType && (
                    <span
                      style={{
                        fontSize: 11,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 4,
                        padding: "2px 8px",
                        color: C.muted,
                      }}
                    >
                      {r.paperType} {r.paperGsm}gsm
                    </span>
                  )}
                  {(r.processes || []).length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 4,
                        padding: "2px 8px",
                        color: C.muted,
                      }}
                    >
                      {(r.processes || []).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
        </Card>
      )}
    </div>
  );
}
