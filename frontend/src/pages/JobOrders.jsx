import React, { useState, useEffect, useMemo } from "react";
import ConfirmModal from "../components/ConfirmModal";
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
  Modal,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import {
  jobOrdersAPI,
  salesOrdersAPI,
  rawMaterialStockAPI,
  printingDetailMasterAPI,
  categoryMasterAPI,
  itemMasterAPI,
} from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const calcSheets = (q, u) => {
  const qty = Number(q);
  const ups = Number(u);
  if (qty > 0 && ups > 0) {
    return Math.ceil(Math.ceil(qty / ups) / 100) * 100;
  }
  return "";
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
      fontWeight: 500,
      letterSpacing: "normal",
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
    companyMaster = [],
    deepLinkId,
    onDeepLinkConsumed,
    canCreate = true,
    canEdit = true,
    canDelete = true,
  } = props;
  const [jobOrders, setJobOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [paperCategories, setPaperCategories] = useState([]);
  const [paperTypesByItem, setPaperTypesByItem] = useState({});
  const [itemMasterItems, setItemMasterItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const blankHeader = {
    joDate: today(),
    soRef: "",
    companyName: "",
    companyCategory: "",
    itemName: "",
    size: "",
    orderDate: "",
    deliveryDate: "",
    orderQty: "",
    priority: "Standard",
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
    polycoatedWeightKg: "",
    polycoatedRmName: "",
    polycoatedRmStockId: null,
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
      const gsmFromField = (s.gsm || s.paperGsm || 0).toString();
      const gsmFromName = (sType.match(/(\d+)\s*gsm/) || [])[1] || "";
      const sGsm = gsmFromField !== "0" ? gsmFromField : gsmFromName;

      const basicMatch =
        sCat === hCat && sType.includes(hType) && sGsm === hGsm;

      if (!basicMatch) return false;

      if (isSheet) {
        const normalise = (str) =>
          (str || "").toLowerCase().replace(/\s+/g, "").replace(/×/g, "x");
        const sSize = normalise(s.sheetSize || s.name || "");
        const hSize = normalise(`${header.sheetW}x${header.sheetL}`);
        const hSizeWithUom = normalise(
          `${header.sheetW}x${header.sheetL}${header.sheetUom || "mm"}`,
        );
        return sSize.includes(hSize) || sSize.includes(hSizeWithUom);
      }

      if (isReel && header.reelWidthMm) {
        const sSize = (s.sheetSize || s.name || "")
          .toLowerCase()
          .replace(/\s+/g, "");
        const hWidth = `${header.reelWidthMm}mm`;
        const hWidthAlt = `${header.reelWidthMm}`;
        return sSize.includes(hWidth) || sSize.includes(hWidthAlt);
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
      const gsmFromField = (s.gsm || s.paperGsm || 0).toString();
      const gsmFromName = (sType.match(/(\d+)\s*gsm/) || [])[1] || "";
      const sGsm = gsmFromField !== "0" ? gsmFromField : gsmFromName;

      const basicMatch =
        sCat === hCat && sType.includes(hType) && sGsm === hGsm;
      if (!basicMatch) return false;

      const isSheet = hCat === "paper sheet";
      const isReel = hCat === "paper reel";

      if (isSheet && header.sheetW2 && header.sheetL2) {
        const normalise = (str) =>
          (str || "").toLowerCase().replace(/\s+/g, "").replace(/×/g, "x");
        const sSize = normalise(s.sheetSize || s.name || "");
        const hSize = normalise(`${header.sheetW2}x${header.sheetL2}`);
        const hSizeWithUom = normalise(
          `${header.sheetW2}x${header.sheetL2}${header.sheetUom2 || "mm"}`,
        );
        return sSize.includes(hSize) || sSize.includes(hSizeWithUom);
      }

      if (isReel && header.reelWidthMm2) {
        const sSize = (s.sheetSize || s.name || "")
          .toLowerCase()
          .replace(/\s+/g, "");
        const hWidth = `${header.reelWidthMm2}mm`.replace(/\s+/g, "");
        return sSize.includes(hWidth);
      }

      return true;
    });
  }, [
    rawStock,
    header.hasSecondPaper,
    header.paperCategory2,
    header.paperType2,
    header.paperGsm2,
  ]);
  const matchedPolycoatedStock = useMemo(() => {
    if (header.paperType !== "Polycoated Blanks" || !header.polycoatedRmName) return null;
    return (rawStock || []).find(
      (s) => (s.name || "").trim().toLowerCase() === header.polycoatedRmName.trim().toLowerCase(),
    );
  }, [rawStock, header.paperType, header.polycoatedRmName]);

  const [headerErrors, setHeaderErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const uniqueCompanyCategories = useMemo(() => {
    return [
      ...new Set((companyMaster || []).map((c) => c.category).filter(Boolean)),
    ];
  }, [companyMaster]);

  useEffect(() => {
    fetchJobOrders();
    fetchSalesOrders();
    fetchCategoryMaster();
    fetchItemMaster();
  }, []);

  const fetchItemMaster = async () => {
    try {
      const data = await itemMasterAPI.getAll();
      setItemMasterItems(data.items || []);
    } catch (err) {
      console.error("Failed to load item master:", err);
    }
  };

  const fetchCategoryMaster = async () => {
    try {
      const res = await categoryMasterAPI.getAll();
      const rawMat = (res.categories || []).find(
        (c) => c.type === "Raw Material",
      );
      if (rawMat?.subTypes) {
        const normalized = {};
        const cats = [];
        Object.entries(rawMat.subTypes).forEach(([key, vals]) => {
          normalized[key] = vals;
          normalized[key + "s"] = vals;
          cats.push(key);
        });
        setPaperCategories(cats);
        setPaperTypesByItem(normalized);
      }
    } catch (err) {
      console.error("Failed to load category master:", err);
    }
  };

  const handleEditJO = (jo) => {
    setEditId(jo._id);
    setHeader({
      joDate: new Date(jo.jobcardDate).toISOString().slice(0, 10),
      soRef: jo.soRef || "",
      companyName: jo.companyName || "",
      companyCategory: jo.companyCategory || "",
      itemName: jo.itemName || "",
      priority: jo.priority || "Standard",
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
      polycoatedWeightKg: jo.polycoatedWeightKg || "",
      polycoatedRmName: jo.polycoatedRmName || "",
      polycoatedRmStockId: jo.polycoatedRmStockId || null,
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (!deepLinkId || !jobOrders.length) return;
    const jo = jobOrders.find((j) => j.joNo === deepLinkId);
    if (jo) {
      setHighlightId(deepLinkId);
      onDeepLinkConsumed?.();
    }
  }, [deepLinkId, jobOrders]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-record-id="${highlightId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const clear = setTimeout(() => setHighlightId(null), 3500);
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
    };
  }, [highlightId]);

  const fetchJobOrders = async () => {
    try {
      const res = await jobOrdersAPI.getAll();
      setJobOrders(res || []);
    } catch (error) {
      toast?.("Failed to load job orders", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await jobOrdersAPI.delete(deleteTarget);
      toast("Job order moved to trash", "success");
      fetchJobOrders();
    } catch (error) {
      toast(
        error.response?.data?.error || "Failed to delete job order",
        "error",
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      setLoading(true);
      const results = await Promise.allSettled(
        ids.map((id) => jobOrdersAPI.delete(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      fetchJobOrders();
      setSelectedIds(new Set());
      if (failed === 0)
        toast(`${ids.length} job order(s) moved to trash`, "success");
      else
        toast(
          `${ids.length - failed} deleted, ${failed} failed`,
          failed === ids.length ? "error" : "warning",
        );
    } catch (error) {
      toast("Failed to delete selected job orders", "error");
    } finally {
      setLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids, allSelected) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await salesOrdersAPI.getAll();
      const list =
        res.salesOrders || res.data || (Array.isArray(res) ? res : []);
      setSalesOrders(list);
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
    }
  };

  useEffect(() => {
    if (header.itemName && header.companyName && showModal && !editId) {
      const fetchPrintingDetails = async () => {
        try {
          const res = await printingDetailMasterAPI.getByItemAndClient(
            header.itemName,
            header.companyName,
          );
          if (res) {
            setHeader((h) => ({
              ...h,
              printing: res.printing || h.printing,
              plate: res.plate || h.plate,
              processes:
                res.process && res.process.length > 0
                  ? res.process
                  : h.processes,
              paperCategory: res.paperCategory || h.paperCategory,
              paperType: res.paperType || h.paperType,
              paperGsm: res.paperGsm || h.paperGsm,
              noOfUps: res.noOfUps || h.noOfUps,
              sheetUom: res.sheetUom || h.sheetUom,
              sheetW: res.sheetW || h.sheetW,
              sheetL: res.sheetL || h.sheetL,
              reelWidthMm: res.reelWidthMm || h.reelWidthMm,
              cuttingLengthMm: res.cuttingLengthMm || h.cuttingLengthMm,
              noOfSheets: calcSheets(h.orderQty, res.noOfUps || h.noOfUps),
            }));
          }
        } catch (err) {}
      };
      fetchPrintingDetails();
    }
  }, [header.itemName, header.companyName, showModal, editId]);

  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");

  const soOptions = useMemo(
    () =>
      (salesOrders || []).filter(
        (s) =>
          !["Issued", "Completed", "Closed", "Cancelled"].includes(s.status),
      ),
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
          updated.companyName = so.companyName || "";
          updated.companyCategory = so.companyCategory || "";
          updated.orderDate = so.orderDate || "";
          updated.deliveryDate = so.deliveryDate || "";
          const soItems = so.items || [];
          if (soItems.length > 0) {
            const firstAvailable = soItems.find(
              (it) =>
                !jobOrders.some(
                  (jo) =>
                    jo.soRef === v &&
                    jo.itemName === it.itemName &&
                    jo._id !== editId,
                ),
            );
            const it = firstAvailable || soItems[0];

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
    if (header.paperType === "Polycoated Blanks") return true;
    if (header.paperCategory && header.paperType && header.paperGsm) {
      if (
        !matchedStock ||
        (Number(matchedStock.qty || 0) <= 0 &&
          Number(matchedStock.weight || 0) <= 0)
      ) {
        const stockName = `${header.paperCategory} | ${header.paperType} | ${header.paperGsm}gsm`;
        toast(`Insufficient RM stock: ${stockName}`, "error");
        return false;
      }
    }

    if (
      header.hasSecondPaper &&
      header.paperCategory2 &&
      header.paperType2 &&
      header.paperGsm2
    ) {
      if (
        !matchedStock2 ||
        (Number(matchedStock2.qty || 0) <= 0 &&
          Number(matchedStock2.weight || 0) <= 0)
      ) {
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
    if (
      header.paperCategory !== "Paper Reel" &&
      header.paperType !== "Polycoated Blanks"
    ) {
      if (!header.noOfSheets) he.noOfSheets = true;
      if (!header.sheetW) he.sheetW = true;
      if (!header.sheetL) he.sheetL = true;
    }
    if (header.paperType === "Polycoated Blanks") {
      if (!header.polycoatedRmName) he.polycoatedRmName = true;
      if (!header.polycoatedWeightKg) he.polycoatedWeightKg = true;
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
        companyName: header.companyName,
        companyCategory: header.companyCategory,
        itemName: header.itemName,
        priority: header.priority || "Standard",
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
          header.paperCategory === "Paper Reel" ||
          header.paperType === "Polycoated Blanks"
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
        polycoatedWeightKg: header.polycoatedWeightKg ? Number(header.polycoatedWeightKg) : null,
        polycoatedRmName: header.polycoatedRmName || null,
        polycoatedRmStockId: matchedPolycoatedStock?._id || header.polycoatedRmStockId || null,
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
      }

      setHeader(blankHeader);
      setHeaderErrors({});
      setShowModal(false);
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
              <span>${r.companyName}</span>
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
    <>
      <div className="fade">
        <SectionTitle
          icon="fa-solid fa-gears"
          title="Job Orders"
          sub="Create production job orders linked to sales orders"
        />

        <div style={{ marginBottom: 20 }}>
          {canCreate && <button
            onClick={() => {
              setEditId(null);
              setHeader(blankHeader);
              setHeaderErrors({});
              setShowModal(true);
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            + New Job Order
          </button>}
        </div>

        {}
        {showModal && (
          <Modal
            title={editId ? "Edit Job Order" : "New Job Order"}
            onClose={() => {
              setShowModal(false);
              setEditId(null);
              setHeader(blankHeader);
              setHeaderErrors({});
            }}
          >
            <Card>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 500,
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
                        {s.soNo} — {s.companyName}
                      </option>
                    ))}
                  </select>
                  {EHMsg("soRef")}
                </Field>
                <Field label="Order Date">
                  <AutoField
                    value={
                      header.orderDate
                        ? new Date(header.orderDate).toLocaleDateString("en-GB")
                        : ""
                    }
                    placeholder="DD/MM/YYYY"
                  />
                </Field>
                <Field label="Delivery Date">
                  <AutoField
                    value={
                      header.deliveryDate
                        ? new Date(header.deliveryDate).toLocaleDateString(
                            "en-GB",
                          )
                        : ""
                    }
                    placeholder="DD/MM/YYYY"
                  />
                </Field>
                <Field label="Priority">
                  <select
                    value={header.priority || "Standard"}
                    onChange={(e) => setH("priority", e.target.value)}
                    style={{
                      padding: "9px 12px",
                      border: `1px solid ${
                        header.priority === "VIP"
                          ? "#ef4444"
                          : header.priority === "Rush"
                            ? "#f97316"
                            : header.priority === "Fill-in"
                              ? "#6b7280"
                              : "#2a2a2a"
                      }`,
                      borderRadius: 6,
                      fontSize: 13,
                      background: "#141414",
                      color:
                        header.priority === "VIP"
                          ? "#ef4444"
                          : header.priority === "Rush"
                            ? "#f97316"
                            : header.priority === "Fill-in"
                              ? "#6b7280"
                              : "#e0e0e0",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                      fontWeight: header.priority !== "Standard" ? 700 : 400,
                    }}
                  >
                    <option value="VIP">VIP Client</option>
                    <option value="Rush">Rush Order</option>
                    <option value="Standard">Standard</option>
                    <option value="Fill-in">Fill-in</option>
                  </select>
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
                    value={header.companyName}
                    placeholder="Enter client name"
                  />
                </Field>
                <Field label="Client Category *">
                  <select
                    value={header.companyCategory}
                    onChange={(e) => setH("companyCategory", e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {uniqueCompanyCategories.map((c) => (
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
                        const so = soOptions.find(
                          (s) => s.soNo === header.soRef,
                        );
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
                        const so = soOptions.find(
                          (s) => s.soNo === header.soRef,
                        );
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
                              {alreadyHasJO ? "JO DONE" : ""}
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

              {}
              {(header.processes || []).length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <SubLabel text="Machine Assignment" />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {header.processes.map((proc) => {
                      const machineType =
                        PROCESS_MACHINE_TYPE[proc] || "Printing";
                      const filteredMachines = (
                        Array.isArray(machineMaster) ? machineMaster : []
                      ).filter((m) => {
                        const mType = m.type || "";
                        if (machineType === "Formation") {
                          return FORMATION_MACHINE_TYPES.includes(mType);
                        }
                        return (
                          mType.toLowerCase() === machineType.toLowerCase()
                        );
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
                              <option
                                key={m._id || m.name}
                                value={m._id || m.name}
                              >
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
              {}
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
                    <option value="">-- Select Category --</option>
                    {paperCategories.map((i) => (
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
                    {(paperTypesByItem[header.paperCategory] || []).map((p) => (
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
                {header.paperCategory !== "Paper Reel" &&
                  header.paperType !== "Polycoated Blanks" && (
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
                        (header.paperCategory === "Paper Reel"
                          ? !!header.reelWidthMm
                          : !!(header.sheetW && header.sheetL)) && (
                          <div
                            style={{
                              fontSize: 10,
                              color: matchedStock?.qty > 0 ? C.green : C.red,
                              marginTop: 4,
                              fontWeight: 500,
                            }}
                          >
                            {matchedStock?.qty > 0
                              ? `${fmt(matchedStock.qty)} sheets available`
                              : `0 sheets available`}
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
                      (header.paperCategory === "Paper Reel"
                        ? !!header.reelWidthMm
                        : !!(header.sheetW && header.sheetL)) && (
                        <div
                          style={{
                            fontSize: 10,
                            color: matchedStock?.weight > 0 ? C.green : C.red,
                            marginTop: 4,
                            fontWeight: 500,
                          }}
                        >
                          {matchedStock?.weight > 0
                            ? `${fmt(Math.round(matchedStock.weight))} kg available`
                            : `0 kg available`}
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

              {header.paperCategory !== "Paper Reel" &&
                header.paperType !== "Polycoated Blanks" && (
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
                <Field label="RM STOCK ITEM">
                  <input
                    readOnly
                    placeholder="Auto-matched item"
                    value={
                      matchedStock?.name ||
                      (header.paperCategory &&
                      header.paperType &&
                      header.paperGsm &&
                      header.paperType !== "Polycoated Blanks" &&
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
                      fontWeight: 500,
                      letterSpacing: "normal",
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

              {/* Polycoated Blanks RM selector + weight — separate from FG item name */}
              {header.paperType === "Polycoated Blanks" && (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 20 }}>
                  <Field label="POLYCOATED BLANK (RM ITEM) *">
                    <select
                      value={header.polycoatedRmName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        setH("polycoatedRmName", selectedName);
                        const matched = (rawStock || []).find(
                          (s) => (s.name || "").trim().toLowerCase() === selectedName.trim().toLowerCase(),
                        );
                        setH("polycoatedRmStockId", matched?._id || null);
                      }}
                      style={{ fontWeight: 600, ...(headerErrors.polycoatedRmName ? { border: `1px solid ${C.red}` } : {}) }}
                    >
                      <option value="">-- Select Polycoated Blank --</option>
                      {itemMasterItems
                        .filter(
                          (i) =>
                            i.type === "Raw Material" &&
                            (i.category === "Polycoated Blanks" ||
                              i.subCategory === "Polycoated Blanks"),
                        )
                        .map((i) => (
                          <option key={i._id || i.code} value={i.name}>
                            {i.code ? `${i.code} — ${i.name}` : i.name}
                          </option>
                        ))}
                    </select>
                    {EHMsg("polycoatedRmName")}
                  </Field>
                  <Field label="WEIGHT TO CONSUME (KG) *">
                    <input
                      type="number"
                      placeholder="Weight in kg"
                      value={header.polycoatedWeightKg}
                      onChange={(e) => setH("polycoatedWeightKg", e.target.value)}
                      style={headerErrors.polycoatedWeightKg ? { border: `1px solid ${C.red}` } : {}}
                    />
                    {matchedPolycoatedStock && (
                      <div style={{ fontSize: 10, marginTop: 4, fontWeight: 500,
                        color: (matchedPolycoatedStock.weight || matchedPolycoatedStock.qty || 0) > 0 ? C.green : C.red }}>
                        {`${(matchedPolycoatedStock.weight || matchedPolycoatedStock.qty || 0).toLocaleString("en-IN")} kg available`}
                      </div>
                    )}
                    {EHMsg("polycoatedWeightKg")}
                  </Field>
                </div>
              )}

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
                      <option value="">-- Select Category --</option>
                      {paperCategories.map((i) => (
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
                      {(paperTypesByItem[header.paperCategory2] || []).map(
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
                      setShowModal(false);
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
          </Modal>
        )}

        {}
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
                fontWeight: 500,
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

          {(() => {
            const filteredJOs = (jobOrders || [])
              .slice()
              .sort((a, b) => new Date(b.createdAt || b.jobcardDate || 0) - new Date(a.createdAt || a.jobcardDate || 0))
              .filter((r) => {
                if (!drDateFrom && !drDateTo) return true;
                const d = r.jobcardDate
                  ? new Date(r.jobcardDate).toISOString().slice(0, 10)
                  : "";
                if (drDateFrom && d < drDateFrom) return false;
                if (drDateTo && d > drDateTo) return false;
                return true;
              });
            const filteredIds = filteredJOs.map((r) => r._id || r.id);
            const allSelected =
              filteredIds.length > 0 &&
              filteredIds.every((id) => selectedIds.has(id));
            const someSelected = filteredIds.some((id) => selectedIds.has(id));
            const activeCount = filteredJOs.filter(
              (r) => r.status !== "Completed",
            ).length;
            const completedCount = filteredJOs.filter(
              (r) => r.status === "Completed",
            ).length;
            const totalQty = filteredJOs.reduce(
              (s, r) => s + +(r.orderQty || 0),
              0,
            );
            const statCards = [
              {
                label: "Total JOs",
                value: filteredJOs.length,
                icon: "fa-solid fa-gears",
              },
              {
                label: "Active",
                value: activeCount,
                icon: "fa-solid fa-spinner",
              },
              {
                label: "Completed",
                value: completedCount,
                icon: "fa-solid fa-circle-check",
              },
              {
                label: "Total Qty",
                value: fmt(totalQty) + " pcs",
                icon: "fa-solid fa-boxes-stacked",
              },
            ];
            return (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {statCards.map(({ label, value, icon }) => (
                    <div
                      key={label}
                      style={{
                        padding: "16px 20px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 19,
                            color: "#ffffff",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {label}
                        </span>
                        <i
                          className={icon}
                          style={{ color: C.muted, fontSize: 20, opacity: 0.9, display: "inline-flex", alignItems: "center", justifyContent: "center", height: 28, width: 28, lineHeight: 1 }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedIds.size > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      marginBottom: 8,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#fecaca",
                      }}
                    >
                      {selectedIds.size} selected
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 5,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setBulkDeleteOpen(true)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 5,
                          border: "1px solid rgba(239,68,68,0.4)",
                          background: "rgba(239,68,68,0.15)",
                          color: "#ef4444",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Delete Selected
                      </button>
                    </div>
                  </div>
                )}

                {filteredJOs.length === 0 ? (
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
                ) : (
                  <div
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <th
                            style={{
                              padding: "10px 14px",
                              textAlign: "left",
                              width: 36,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el)
                                  el.indeterminate =
                                    !allSelected && someSelected;
                              }}
                              onChange={() =>
                                toggleSelectAll(filteredIds, allSelected)
                              }
                              style={{
                                cursor: "pointer",
                                accentColor: C.accent || "#60a5fa",
                              }}
                            />
                          </th>
                          {[
                            "JO No",
                            "Date",
                            "Client",
                            "Item",
                            "Qty",
                            "Process",
                            "Priority",
                            "Status",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 14px",
                                textAlign: "left",
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJOs.map((r, i) => {
                          const handleEdit = (jo) => {
                            setEditId(jo._id);
                            setHeader({
                              joDate: new Date(jo.jobcardDate)
                                .toISOString()
                                .slice(0, 10),
                              soRef: jo.soRef || "",
                              companyName: jo.companyName || "",
                              companyCategory: jo.companyCategory || "",
                              itemName: jo.itemName || "",
                              priority: jo.priority || "Standard",
                              size: "",
                              orderDate: jo.orderDate
                                ? new Date(jo.orderDate)
                                    .toISOString()
                                    .slice(0, 10)
                                : "",
                              deliveryDate: jo.deliveryDate
                                ? new Date(jo.deliveryDate)
                                    .toISOString()
                                    .slice(0, 10)
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
                            setShowModal(true);
                          };

                          const handleDelete = (id) => setDeleteTarget(id);

                          const priorityColor =
                            r.priority === "VIP"
                              ? "#ef4444"
                              : r.priority === "Rush"
                                ? "#f97316"
                                : r.priority === "Fill-in"
                                  ? "#6b7280"
                                  : null;
                          const rowId = r._id || r.id;
                          return (
                            <tr
                              key={rowId}
                              data-record-id={r.joNo}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                background: selectedIds.has(rowId)
                                  ? "rgba(96,165,250,0.08)"
                                  : r.joNo === highlightId
                                    ? `${C.accent}11`
                                    : i % 2 === 0
                                      ? "transparent"
                                      : "rgba(255,255,255,0.01)",
                                transition: "all 0.4s ease",
                              }}
                            >
                              <td style={{ padding: "11px 14px", width: 36 }}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(rowId)}
                                  onChange={() => toggleSelect(rowId)}
                                  style={{
                                    cursor: "pointer",
                                    accentColor: C.accent || "#60a5fa",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "11px 14px",
                                  fontWeight: 700,
                                  color: "#facc15",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.joNo}
                              </td>
                              <td
                                style={{
                                  padding: "11px 14px",
                                  color: C.muted,
                                  whiteSpace: "nowrap",
                                  fontSize: 12,
                                }}
                              >
                                {r.jobcardDate
                                  ? new Date(r.jobcardDate).toLocaleDateString(
                                      "en-GB",
                                    )
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "11px 14px",
                                  fontWeight: 500,
                                }}
                              >
                                {r.companyName}
                              </td>
                              <td
                                style={{
                                  padding: "11px 14px",
                                  color: "#94a3b8",
                                  maxWidth: 220,
                                }}
                              >
                                <div style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  wordBreak: "break-word",
                                  lineHeight: 1.4,
                                }}>
                                  {r.itemName}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "11px 14px",
                                  color: "#e2e8f0",
                                }}
                              >
                                {fmt(r.orderQty)}
                              </td>
                              <td
                                style={{
                                  padding: "11px 14px",
                                  color: C.muted,
                                  fontSize: 12,
                                }}
                              >
                                {(r.process || r.processes || []).join(", ") ||
                                  "—"}
                              </td>
                              <td style={{ padding: "11px 14px" }}>
                                {priorityColor ? (
                                  <span
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontWeight: 800,
                                      background: priorityColor + "22",
                                      color: priorityColor,
                                      border: `1px solid ${priorityColor}44`,
                                    }}
                                  >
                                    {r.priority}
                                  </span>
                                ) : (
                                  <span
                                    style={{ color: C.muted, fontSize: 12 }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "11px 14px" }}>
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 5,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background:
                                      r.status === "Completed"
                                        ? "#06422233"
                                        : "#451a0333",
                                    color:
                                      r.status === "Completed"
                                        ? "#10b981"
                                        : "#f59e0b",
                                    border: `1px solid ${r.status === "Completed" ? "#065f4622" : "#78350f22"}`,
                                  }}
                                >
                                  {r.status || "Open"}
                                </span>
                              </td>
                              <td style={{ padding: "11px 14px" }}>
                                <div style={{ display: "flex", gap: 6 }}>
                                  {canEdit && <button
                                    onClick={() => handleEdit(r)}
                                    style={{
                                      background: "transparent",
                                      color: "#8082ff",
                                      border: "1px solid #8082ff98",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <i className="fa-solid fa-pen-to-square" /> Edit
                                  </button>}
                                  <button
                                    onClick={() => generateJobCardPDF(r)}
                                    style={{
                                      background: "transparent",
                                      color: "#8082ff",
                                      border: "1px solid #8082ff98",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <i className="fa-solid fa-file-pdf" /> PDF
                                  </button>
                                  {canDelete && <button
                                    onClick={() => handleDelete(r._id || r.id)}
                                    style={{
                                      background: "transparent",
                                      color: "#8082ff",
                                      border: "1px solid #8082ff98",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <i className="fa-solid fa-trash" /> Delete
                                  </button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Move to Trash"
        message="This job order will be moved to trash. RM stock will be reversed. You can restore it within 7 days."
        confirmText="Move to Trash"
        cancelText="Cancel"
        type="danger"
      />
      <ConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Move to Trash"
        message={`${selectedIds.size} job order(s) will be moved to trash. RM stock will be reversed. You can restore them within 7 days.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
