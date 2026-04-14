import React, { useState, useEffect, useMemo } from "react";
import { C, PROCESS_COLORS } from "../constants/colors";
import {
  PROCESS_MACHINE_TYPE,
  FORMATION_MACHINE_TYPES,
} from "../constants/seedData";
import {
  Card,
  SectionTitle,
  Badge,
  Field,
  SubmitBtn,
  AutocompleteInput,
  DateRangeFilter,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import { jobOrdersAPI, salesOrdersAPI, rawMaterialStockAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const RM_ITEMS = ["Paper Reel", "Paper Sheets"];
const calcSheets = (q, u) => {
  const qty = Number(q);
  const ups = Number(u);
  if (qty > 0 && ups > 0) {
    return Math.ceil(Math.ceil(qty / ups) / 100) * 100;
  }
  return "";
};
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

const PRINTING_OPTIONS = ["No Printing", "1", "2", "3", "4", "5", "6"];
const PLATE_OPTIONS = ["No", "Old", "New"];
const PROCESS_TAGS = [
  "Printing",
  "Varnish",
  "Lamination",
  "Die Cutting",
  "Formation",
  "Manual Formation",
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
    noOfUps: "",
    noOfSheets: "",
    sheetW: "",
    sheetL: "",
    sheetUom: "mm",
    sheetSize: "",
    hasSecondPaper: false,
    paperCategory2: "",
    paperType2: "",
    paperGsm2: "",
    noOfSheets2: "",
    remarks: "",
    machineAssignments: {},
  };

  const [header, setHeader] = useState(blankHeader);

  const matchedStock = useMemo(() => {
    if (!header.paperCategory || !header.paperType || !header.paperGsm)
      return null;

    const hCat = header.paperCategory.toLowerCase().replace(/s$/, "");
    const hType = (header.paperType || "").toLowerCase();
    const hGsm = (header.paperGsm || "").toString();

    const isSheet = hCat === "paper sheet";
    const isReel = hCat === "paper reel";
    if (isSheet && (!header.sheetW || !header.sheetL)) return null;
    if (isReel && !header.reelWidthMm) return null;

    return (rawStock || []).find((s) => {
      const sCat = (s.category || s.paperCategory || "")
        .toLowerCase()
        .replace(/s$/, "");
      const sType = (s.name || s.paperType || "").toLowerCase();
      const sGsm = (s.gsm || s.paperGsm || 0).toString();

      const basicMatch =
        sCat === hCat && sType.includes(hType) && sGsm === hGsm;

      if (!basicMatch) return false;

      if (isSheet) {
        // Match dimensions if it's a sheet (e.g. "370x652mm")
        const sSize = (s.sheetSize || "").toLowerCase();
        const hSize = `${header.sheetW}x${header.sheetL}${header.sheetUom || "mm"}`;
        const hSizeAlt = `${header.sheetW}x${header.sheetL}`; // fallback without uom
        return sSize.includes(hSize) || sSize.includes(hSizeAlt);
      }

      if (isReel && header.reelWidthMm) {
        const sSize = (s.sheetSize || s.name || "").toLowerCase();
        const hWidth = `${header.reelWidthMm}mm`;
        return sSize.includes(hWidth);
      }

      return true;
    });
  }, [
    rawStock,
    header.paperCategory,
    header.paperType,
    header.paperGsm,
    header.sheetW,
    header.sheetL,
    header.sheetUom,
    header.reelWidthMm,
  ]);

  const matchedStock2 = useMemo(() => {
    if (
      !header.hasSecondPaper ||
      !header.paperCategory2 ||
      !header.paperType2 ||
      !header.paperGsm2
    )
      return null;

    const hCat = header.paperCategory2.toLowerCase().replace(/s$/, "");
    const hType = (header.paperType2 || "").toLowerCase();
    const hGsm = (header.paperGsm2 || "").toString();

    return (rawStock || []).find((s) => {
      const sCat = (s.category || s.paperCategory || "")
        .toLowerCase()
        .replace(/s$/, "");
      const sType = (s.name || s.paperType || "").toLowerCase();
      const sGsm = (s.gsm || s.paperGsm || 0).toString();

      return sCat === hCat && sType.includes(hType) && sGsm === hGsm;
    });
  }, [
    rawStock,
    header.hasSecondPaper,
    header.paperCategory2,
    header.paperType2,
    header.paperGsm2,
  ]);
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
    () => (salesOrders || []).filter((s) => !["Issued", "Completed", "Closed", "Cancelled"].includes(s.status)),
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
            // Find first item that doesn't have a JO yet
            const firstAvailable = soItems.find(
              (it) =>
                !jobOrders.some(
                  (jo) =>
                    jo.soRef === v &&
                    jo.itemName === it.itemName &&
                    jo._id !== editId,
                ),
            );
            const it = firstAvailable || soItems[0]; // fallback to first if all have JOs (e.g. for re-editing)

            updated.itemName = it.itemName || "";
            updated.size = it.size || "";
            updated.orderQty = it.orderQty || "";
            updated.noOfSheets = calcSheets(updated.orderQty, updated.noOfUps);
          }
        }
      }

      if (k === "orderQty" || k === "noOfUps") {
        updated.noOfSheets = calcSheets(
          k === "orderQty" ? v : updated.orderQty,
          k === "noOfUps" ? v : updated.noOfUps,
        );
      }

      if (
        ["paperCategory", "paperType", "paperGsm", "reelWidthMm"].includes(k)
      ) {
        const pCat = k === "paperCategory" ? v : updated.paperCategory;
        const pType = k === "paperType" ? v : updated.paperType;
        const pGsm = k === "paperGsm" ? v : updated.paperGsm;
        const pWidth = k === "reelWidthMm" ? v : updated.reelWidthMm;

        if (pCat === "Paper Reel" && pType && pGsm && pWidth) {
          updated.itemName = `${pType} ${pCat} ${pGsm}gsm ${pWidth}mm`;
        }
      }

      if (["sheetW", "sheetL", "sheetUom"].includes(k)) {
        const vW = k === "sheetW" ? v : updated.sheetW;
        const vL = k === "sheetL" ? v : updated.sheetL;
        const vUom = k === "sheetUom" ? v : updated.sheetUom;
        if (vW && vL) {
          updated.sheetSize = `${vW} x ${vL} ${vUom}`;
        } else {
          updated.sheetSize = "";
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
      const newProcs = exists
        ? procs.filter((p) => p !== proc)
        : [...procs, proc];

      const newAssignments = { ...(f.machineAssignments || {}) };
      if (exists) {
        delete newAssignments[proc];
      }

      return {
        ...f,
        processes: newProcs,
        machineAssignments: newAssignments,
      };
    });
  };

  const EH = (k) => (headerErrors[k] ? { border: `1px solid ${C.red}` } : {});
  const EHMsg = (k) =>
    headerErrors[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  const validateRMStock = () => {
    if (header.paperCategory && header.paperType && header.paperGsm) {
      if (!matchedStock || (Number(matchedStock.qty || 0) <= 0 && Number(matchedStock.weight || 0) <= 0)) {
        const stockName = `${header.paperCategory} | ${header.paperType} | ${header.paperGsm}gsm`;
        toast(`Insufficient RM stock: ${stockName}`, "error");
        return false;
      }
    }

    if (header.hasSecondPaper && header.paperCategory2 && header.paperType2 && header.paperGsm2) {
      if (!matchedStock2 || (Number(matchedStock2.qty || 0) <= 0 && Number(matchedStock2.weight || 0) <= 0)) {
        const stockName = `${header.paperCategory2} | ${header.paperType2} | ${header.paperGsm2}gsm`;
        toast(`Insufficient RM stock (Second Paper): ${stockName}`, "error");
        return false;
      }
    }
    return true;
  };

  const submit = async () => {
    const he = {};
    if (!header.joDate) he.joDate = true;
    if (!header.soRef) he.soRef = true;
    if (!header.orderQty) he.orderQty = true;
    if (!header.paperCategory) he.paperCategory = true;
    if (!header.paperType) he.paperType = true;
    if (!header.paperGsm) he.paperGsm = true;
    if (!header.noOfUps) he.noOfUps = true;
    if (header.paperCategory !== "Paper Reel") {
      if (!header.noOfSheets) he.noOfSheets = true;
      if (!header.sheetW) he.sheetW = true;
      if (!header.sheetL) he.sheetL = true;
    }
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
        orderDate: header.orderDate ? new Date(header.orderDate) : null,
        deliveryDate: header.deliveryDate
          ? new Date(header.deliveryDate)
          : null,
        process: header.processes,
        printing: header.printing,
        plate: header.plate,
        paperCategory: header.paperCategory,
        paperType: header.paperType,
        paperGsm: Number(header.paperGsm),
        sheetSize: header.sheetSize,
        sheetW: Number(header.sheetW),
        sheetL: Number(header.sheetL),
        sheetUom: header.sheetUom,
        noOfUps: Number(header.noOfUps),
        noOfSheets:
          header.paperCategory === "Paper Reel"
            ? null
            : Number(header.noOfSheets),
        hasSecondPaper: header.hasSecondPaper,
        paperCategory2: header.paperCategory2,
        paperType2: header.paperType2,
        paperGsm2: header.paperGsm2 ? Number(header.paperGsm2) : null,
        noOfSheets2:
          header.paperCategory2 === "Paper Reel"
            ? null
            : header.noOfSheets2
              ? Number(header.noOfSheets2)
              : null,
        remarks: header.remarks,
        machineAssignments: header.machineAssignments,
        reelWidthMm: header.reelWidthMm ? Number(header.reelWidthMm) : null,
        cuttingLengthMm: header.cuttingLengthMm
          ? Number(header.cuttingLengthMm)
          : null,
        reelWeightKg: header.reelWeightKg ? Number(header.reelWeightKg) : null,
        rmStockId: matchedStock?._id,
        rmStockId2: matchedStock2?._id,
      };

      if (editId) {
        await jobOrdersAPI.update(editId, payload);
        toast("Job Order updated successfully", "success");
        setEditId(null);
      } else {
        const res = await jobOrdersAPI.create(payload);
        toast(`Job Order ${res.joNo} created successfully`, "success");

        // --- STOCK DEDUCTION LOGIC ---
        const handleDeduction = async (
          stock,
          category,
          issuedQty,
          issuedWeight,
        ) => {
          if (!stock?._id) return;
          const updateData = { ...stock };
          if (category === "Paper Reel") {
            const kgToDeduct = Number(issuedWeight || 0);
            updateData.weight = Math.max(0, (stock.weight || 0) - kgToDeduct);
          } else {
            const sheetsToDeduct = Number(issuedQty || 0);
            const oldQty = Number(stock.qty || 0);
            const oldWeight = Number(stock.weight || 0);

            if (oldQty > 0) {
              const weightPerSheet = oldWeight / oldQty;
              updateData.qty = Math.max(0, oldQty - sheetsToDeduct);
              updateData.weight = Math.max(
                0,
                oldWeight - sheetsToDeduct * weightPerSheet,
              );
            }
          }
          await rawMaterialStockAPI.update(stock._id, updateData);
        };

        // Deduct for Primary Paper
        await handleDeduction(
          matchedStock,
          header.paperCategory,
          header.noOfSheets,
          header.reelWeightKg,
        );

        // Deduct for Second Paper
        if (header.hasSecondPaper) {
          await handleDeduction(
            matchedStock2,
            header.paperCategory2,
            header.noOfSheets2,
            header.reelWeightKg2, // Wait, check if JO has reelWeightKg2
          );
        }
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

  const generateJobCardPDF = (r) => {
    const fd = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
    const html = `
      <html>
        <head>
          <title>JobCard-${r.joNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px 30px; color: #1a1a1a; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; font-weight: 500; }
            
            .doc-title { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; }
            .doc-title h2 { margin: 0; font-size: 20px; font-weight: 700; color: #1e293b; }
            .status { color: #1e40af; font-weight: 700; font-size: 12px; }
            
            .hr { height: 1px; background: #e2e8f0; margin: 10px 0; border: none; }
            .jo-no { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 800; color: #1e40af; margin: 5px 0; }
            
            .section-label { font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 15px; margin-top: 25px; background: #f8fafc; padding: 4px 8px; border-radius: 4px; }
            
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px; }
            .info-item label { display: block; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
            .info-item span { font-size: 12px; font-weight: 600; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
            td { border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; color: #1e293b; }
            
            .process-tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-right: 5px; margin-bottom: 5px; border: 1px solid #bfdbfe; }
            
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #cbd5e1; width: 180px; text-align: center; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 600; }
            
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p style="text-align: right; font-size: 9px; margin-bottom: 15px;">Printed on: ${new Date().toLocaleString()}</p>
            <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
            <p>Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</p>
            <p>Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</p>
          </div>

          <div class="doc-title">
            <h2>JOB CARD / PRODUCTION ORDER</h2>
            <div class="status">Status: <span>${r.status || "Open"}</span></div>
          </div>
          <div class="jo-no">${r.joNo}</div>
          <div class="hr"></div>

          <div class="section-label">General Information</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Job Date</label>
              <span>${fd(r.jobcardDate)}</span>
            </div>
            <div class="info-item">
              <label>Order Date</label>
              <span>${fd(r.orderDate)}</span>
            </div>
            <div class="info-item">
              <label>Delivery Date</label>
              <span>${fd(r.deliveryDate)}</span>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <label>Client Name</label>
              <span>${r.clientName}</span>
            </div>
            <div class="info-item">
              <label>SO Reference</label>
              <span>${r.soRef || "—"}</span>
            </div>
            <div class="info-item">
              <label>Item Name</label>
              <span>${r.itemName}</span>
            </div>
          </div>

          <div class="section-label">Production Specs</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Order Qty</label>
              <span style="font-size: 14px; color: #1e40af;">${(r.orderQty || 0).toLocaleString()} pcs</span>
            </div>
            <div class="info-item">
              <label>No. of Ups</label>
              <span>${r.noOfUps || "—"}</span>
            </div>
            <div class="info-item">
              <label>Printing Detail</label>
              <span>${r.printing || "—"}</span>
            </div>
          </div>
          <div class="info-grid">
             <div class="info-item">
              <label>Plate Detail</label>
              <span>${r.plate || "—"}</span>
            </div>
             <div class="info-item">
              <label>Die Detail</label>
              <span>${r.die || "—"}</span>
            </div>
          </div>

          <div class="section-label">Paper Details</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Paper Category</label>
              <span>${r.paperCategory}</span>
            </div>
            <div class="info-item">
              <label>Paper Type</label>
              <span>${r.paperType}</span>
            </div>
            <div class="info-item">
              <label>GSM</label>
              <span>${r.paperGsm} gsm</span>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <label>Sheet Size</label>
              <span>${r.sheetSize || (r.sheetW ? r.sheetW + "x" + r.sheetL + r.sheetUom : "—")}</span>
            </div>
            <div class="info-item">
              <label>Total Sheets</label>
              <span style="font-weight: 800;">${(r.noOfSheets || 0).toLocaleString()}</span>
            </div>
            <div class="info-item">
              <label>Reel weight (total)</label>
              <span>${r.reelWeightKg ? r.reelWeightKg + " kg" : "—"}</span>
            </div>
          </div>

          ${
            r.hasSecondPaper
              ? `
          <div style="margin-top: 10px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 6px;">
            <label style="display: block; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Second Paper Details</label>
            <div class="info-grid">
               <div class="info-item">
                <label>Type</label>
                <span>${r.paperType2 || "—"}</span>
              </div>
               <div class="info-item">
                <label>GSM</label>
                <span>${r.paperGsm2 || "—"} gsm</span>
              </div>
               <div class="info-item">
                <label>Sheets/Qty</label>
                <span>${(r.noOfSheets2 || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          `
              : ""
          }

          <div class="section-label">Manufacturing Process</div>
          <div style="margin-top: 10px;">
            ${(r.process || []).map((p) => `<span class="process-tag">${p}</span>`).join("")}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30%;">Process</th>
                <th style="width: 40%;">Machine Assigned</th>
                <th style="width: 30%;">Completed Qty</th>
              </tr>
            </thead>
            <tbody>
              ${(r.process || [])
                .map((p) => {
                  const machineId = r.machineAssignments?.[p];
                  // Resolve machine name from machineMaster
                  const mList = Array.isArray(machineMaster)
                    ? machineMaster
                    : Object.values(machineMaster || {});
                  const mObj = mList.find(
                    (m) =>
                      (m._id || m.id) === machineId || m.name === machineId,
                  );
                  const machineName = mObj
                    ? mObj.name
                    : machineId || "— Not Assigned —";

                  return `
                  <tr>
                    <td style="font-weight: 700;">${p}</td>
                    <td>${machineName}</td>
                    <td>${(r.stageQtyMap?.[p] || 0).toLocaleString()}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>

          <div class="section-label">Special Remarks / Instructions</div>
          <div style="min-height: 40px; font-size: 11px; font-style: italic; color: #475569;">
            ${r.remarks || "No special instructions provided."}
          </div>

          <div class="footer">
            <div class="signature">Production In-charge</div>
            <div class="signature">Quality Control</div>
            <div class="signature">Authorised Signatory</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 500);
    };

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
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
            <Field label="Jobcard Date 📅 *">
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
            <Field label="Order Date 📅">
              <AutoField
                value={
                  header.orderDate
                    ? new Date(header.orderDate).toLocaleDateString("en-GB")
                    : ""
                }
                placeholder="DD/MM/YYYY"
              />
            </Field>
            <Field label="Delivery Date 📅">
              <AutoField
                value={
                  header.deliveryDate
                    ? new Date(header.deliveryDate).toLocaleDateString("en-GB")
                    : ""
                }
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
              {header.soRef ? (
                <select
                  value={header.itemName}
                  onChange={(e) => {
                    const iName = e.target.value;
                    const so = soOptions.find((s) => s.soNo === header.soRef);
                    const it = (so?.items || []).find(
                      (i) => i.itemName === iName,
                    );
                    if (it) {
                      setHeader((f) => {
                        const next = {
                          ...f,
                          itemName: it.itemName,
                          size: it.size || "",
                          orderQty: it.orderQty || "",
                        };
                        next.noOfSheets = calcSheets(
                          next.orderQty,
                          next.noOfUps,
                        );
                        return next;
                      });
                    } else {
                      setH("itemName", iName);
                    }
                  }}
                  style={EH("itemName")}
                >
                  <option value="">{`-- Select Item from SO (${(soOptions.find((s) => s.soNo === header.soRef)?.items || []).length} items found) --`}</option>
                  {(() => {
                    const so = soOptions.find((s) => s.soNo === header.soRef);
                    return (so?.items || []).map((it, i) => {
                      const alreadyHasJO = jobOrders.some(
                        (jo) =>
                          jo.soRef === header.soRef &&
                          jo.itemName === it.itemName &&
                          jo._id !== editId,
                      );
                      return (
                        <option
                          key={it._id || i}
                          value={it.itemName}
                          disabled={alreadyHasJO}
                          style={
                            alreadyHasJO
                              ? { color: "#888", fontStyle: "italic" }
                              : {}
                          }
                        >
                          {it.itemName} (Qty: {fmt(it.orderQty)}){" "}
                          {alreadyHasJO ? "✓ JO DONE" : ""}
                        </option>
                      );
                    });
                  })()}
                </select>
              ) : (
                <input
                  placeholder="Enter item name"
                  value={header.itemName}
                  onChange={(e) => setH("itemName", e.target.value)}
                />
              )}
              {EHMsg("itemName")}
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
            <Field label="Order Quantity *">
              <input
                type="number"
                placeholder="Order quantity"
                value={header.orderQty}
                onChange={(e) => setH("orderQty", e.target.value)}
                style={EH("orderQty")}
              />
              {EHMsg("orderQty")}
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

          {/* Machine Assignment Section */}
          {(header.processes || []).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SubLabel text="Machine Assignment" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 14,
                }}
              >
                {header.processes.map((proc) => {
                  const machineType = PROCESS_MACHINE_TYPE[proc] || "Printing";
                  const filteredMachines = (
                    Array.isArray(machineMaster) ? machineMaster : []
                  ).filter((m) => {
                    const mType = m.type || "";
                    if (machineType === "Formation") {
                      return FORMATION_MACHINE_TYPES.includes(mType);
                    }
                    return mType.toLowerCase() === machineType.toLowerCase();
                  });

                  const accentColor = PROCESS_COLORS[proc] || C.accent;

                  return (
                    <div
                      key={proc}
                      style={{
                        padding: 16,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: 4,
                          height: "100%",
                          background: accentColor,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: accentColor,
                          marginBottom: 12,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {proc}
                      </div>
                      <select
                        value={header.machineAssignments?.[proc] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHeader((prev) => ({
                            ...prev,
                            machineAssignments: {
                              ...(prev.machineAssignments || {}),
                              [proc]: val,
                            },
                          }));
                        }}
                        style={{
                          width: "100%",
                          background: C.inputBg,
                          border: `1px solid ${C.border}`,
                          color: C.text,
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 13,
                          outline: "none",
                        }}
                      >
                        <option value="">-- Select Machine --</option>
                        {filteredMachines.map((m) => (
                          <option key={m._id || m.name} value={m._id || m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {}
          <SubLabel text="Sheet / Reel Details" />

          {}
          {/* Row 1: 5 Columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                header.paperCategory === "Paper Reel"
                  ? "1fr 1fr 1fr 1fr 1fr"
                  : "1fr 1fr 1fr 1fr 1fr 1fr",
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

            <Field label="# OF UPS *">
              <input
                type="number"
                placeholder="No. of ups"
                value={header.noOfUps}
                onChange={(e) => setH("noOfUps", e.target.value)}
                style={EH("noOfUps")}
              />
              {EHMsg("noOfUps")}
            </Field>
            {header.paperCategory !== "Paper Reel" && (
              <Field label="# OF SHEETS *">
                <input
                  type="number"
                  placeholder="No. of sheets"
                  value={header.noOfSheets}
                  onChange={(e) => setH("noOfSheets", e.target.value)}
                  style={EH("noOfSheets")}
                />
                {EHMsg("noOfSheets")}
                {header.paperCategory &&
                  header.paperType &&
                  header.paperGsm &&
                  (header.paperCategory === "Paper Reel" ? !!header.reelWidthMm : !!(header.sheetW && header.sheetL)) && (
                    <div
                      style={{
                        fontSize: 10,
                        color: matchedStock?.qty > 0 ? C.green : C.red,
                        marginTop: 4,
                        fontWeight: 700,
                      }}
                    >
                      {matchedStock?.qty > 0
                        ? `✓ ${fmt(matchedStock.qty)} sheets available`
                        : `❌ 0 sheets available`}
                    </div>
                  )}
              </Field>
            )}

            {header.paperCategory === "Paper Reel" && (
              <Field label="REEL WEIGHT (KG) *">
                <input
                  type="number"
                  placeholder="Weight in kg"
                  value={header.reelWeightKg}
                  onChange={(e) => setH("reelWeightKg", e.target.value)}
                />
                {header.paperCategory &&
                  header.paperType &&
                  header.paperGsm &&
                  (header.paperCategory === "Paper Reel" ? !!header.reelWidthMm : !!(header.sheetW && header.sheetL)) && (
                    <div
                      style={{
                        fontSize: 10,
                        color: matchedStock?.weight > 0 ? C.green : C.red,
                        marginTop: 4,
                        fontWeight: 700,
                      }}
                    >
                      {matchedStock?.weight > 0
                        ? `✓ ${fmt(Math.round(matchedStock.weight))} kg available`
                        : `❌ 0 kg available`}
                    </div>
                  )}
              </Field>
            )}
          </div>

          {header.paperCategory === "Paper Reel" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1.5fr",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <Field label="REEL WIDTH (MM)">
                <input
                  type="number"
                  placeholder="Width"
                  value={header.reelWidthMm}
                  onChange={(e) => setH("reelWidthMm", e.target.value)}
                />
              </Field>
              <Field label="CUTTING LENGTH (MM)">
                <input
                  type="number"
                  placeholder="Length"
                  value={header.cuttingLengthMm}
                  onChange={(e) => setH("cuttingLengthMm", e.target.value)}
                />
              </Field>
            </div>
          )}

          {header.paperCategory !== "Paper Reel" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1.5fr",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <Field label="SHEET UOM">
                <select
                  value={header.sheetUom}
                  onChange={(e) => setH("sheetUom", e.target.value)}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </Field>
              <Field label="SHEET W *">
                <input
                  type="number"
                  placeholder="Width"
                  value={header.sheetW}
                  onChange={(e) => setH("sheetW", e.target.value)}
                  style={EH("sheetW")}
                />
                {EHMsg("sheetW")}
              </Field>
              <Field label="SHEET L *">
                <input
                  type="number"
                  placeholder="Length"
                  value={header.sheetL}
                  onChange={(e) => setH("sheetL", e.target.value)}
                  style={EH("sheetL")}
                />
                {EHMsg("sheetL")}
              </Field>
              <Field label="SHEET SIZE">
                <div
                  style={{
                    padding: "9px 12px",
                    background: C.inputBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    color: header.sheetSize ? C.text : C.muted,
                  }}
                >
                  {header.sheetSize || "— Auto from W x L x UOM —"}
                </div>
              </Field>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <Field label="ITEM NAME">
              <input
                readOnly
                placeholder="Auto-matched item"
                value={
                  matchedStock?.name ||
                  (header.paperCategory &&
                  header.paperType &&
                  header.paperGsm &&
                  (header.paperCategory === "Paper Reel"
                    ? !!header.reelWidthMm
                    : !!(header.sheetW && header.sheetL))
                    ? `${header.paperType} ${header.paperCategory} ${header.paperGsm}gsm ${
                        header.paperCategory === "Paper Reel"
                          ? (header.reelWidthMm || 0) + "mm"
                          : header.sheetSize
                      }`
                    : "")
                }
                style={{
                  background: "transparent",
                  color: matchedStock ? C.green : C.text,
                  fontWeight: 600,
                }}
              />
            </Field>
            <Field label="REMARKS">
              <input
                placeholder="Special instructions"
                value={header.remarks}
                onChange={(e) => setH("remarks", e.target.value)}
              />
            </Field>
            <div style={{ alignSelf: "end", paddingBottom: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  color: C.muted,
                  textTransform: "uppercase",
                  marginBottom: 6,
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
            </div>
          </div>

          {header.hasSecondPaper && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  header.paperCategory2 === "Paper Reel"
                    ? "1fr 1fr 1fr"
                    : "1.5fr 1fr 1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <Field label="Paper 2 Category">
                <select
                  value={header.paperCategory2}
                  onChange={(e) => setH("paperCategory2", e.target.value)}
                >
                  <option value="">-- Paper Reel or Sheet --</option>
                  {RM_ITEMS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Paper 2 Type">
                <select
                  value={header.paperType2}
                  onChange={(e) => setH("paperType2", e.target.value)}
                  disabled={!header.paperCategory2}
                >
                  <option value="">
                    {header.paperCategory2
                      ? "-- Select Paper Type --"
                      : "-- Select Category first --"}
                  </option>
                  {(PAPER_TYPES_BY_ITEM[header.paperCategory2] || []).map(
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
              {header.paperCategory2 !== "Paper Reel" && (
                <Field label="Paper 2 Sheets">
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={header.noOfSheets2}
                    onChange={(e) => setH("noOfSheets2", e.target.value)}
                  />
                </Field>
              )}
            </div>
          )}
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
                  orderDate: jo.orderDate
                    ? new Date(jo.orderDate).toISOString().slice(0, 10)
                    : "",
                  deliveryDate: jo.deliveryDate
                    ? new Date(jo.deliveryDate).toISOString().slice(0, 10)
                    : "",
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
                  sheetSize: jo.sheetSize || "",
                  hasSecondPaper: jo.hasSecondPaper || false,
                  paperCategory2: jo.paperCategory2 || "",
                  paperType2: jo.paperType2 || "",
                  paperGsm2: jo.paperGsm2 || "",
                  noOfSheets2: jo.noOfSheets2 || "",
                  remarks: jo.remarks || "",
                  machineAssignments: jo.machineAssignments || {},
                });
                setView("form");
                window.scrollTo({ top: 0, behavior: "smooth" });
              };

              const handleDelete = async (id) => {
                if (!confirm("Delete this job order?")) return;
                try {
                  await jobOrdersAPI.delete(id);
                  toast("Job order deleted successfully", "success");
                  fetchJobOrders();
                } catch (error) {
                  toast(
                    error.response?.data?.error || "Failed to delete job order",
                    "error",
                  );
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
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: C.yellow || "#facc15",
                          fontWeight: 700,
                        }}
                      >
                        {r.joNo}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {r.jobcardDate
                          ? new Date(r.jobcardDate).toLocaleDateString("en-GB")
                          : "N/A"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {r.clientName}
                      </span>
                      <Badge text={r.itemName} color={C.blue} />
                      <span style={{ fontSize: 13, color: C.muted }}>
                        Qty: {fmt(r.orderQty)}
                      </span>
                      <Badge
                        text={r.status}
                        color={r.status === "Completed" ? C.green : C.orange}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
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
                      <button
                        onClick={() => generateJobCardPDF(r)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 4,
                          border: `1px solid ${C.blue}`,
                          background: C.blue + "22",
                          color: C.blue,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        🖨️ PDF
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
