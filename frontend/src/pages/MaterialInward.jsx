import React, { useState, useMemo, useEffect } from "react";
import ConfirmModal from "../components/ConfirmModal";
import * as XLSX from "xlsx";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Field,
  Badge,
  SubmitBtn,
  AutocompleteInput,
  DateRangeFilter,
  Modal,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import {
  materialInwardAPI,
  purchaseOrdersAPI,
  itemMasterAPI,
} from "../api/auth";

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
};

const LOCATIONS = ["Vijay Nagar", "Lal Kaun"];
const consumableCategories = ["Tape", "Glue", "Corrugated Box", "LDPE Polybag"];

export default function MaterialInward({
  inward = [],
  setInward,
  purchaseOrders = [],
  vendorMaster = [],
  categoryMaster = {},
  sizeMaster = {},
  itemMasterFG = {},
  setItemMasterFG,
  rawStock = [],
  setRawStock,
  consumableStock = [],
  setConsumableStock,
  itemCounters = {},
  setItemCounters,
  toast,
  editableTabs = [],
  props = {},
  deepLinkId,
  onDeepLinkConsumed,
}) {
  const canEdit = editableTabs.includes("inward");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const today = () => new Date().toISOString().split("T")[0];
  const uid = () => Math.random().toString(36).substr(2, 9);
  const fmt = (n) => (+n || 0).toLocaleString("en-IN");

  const blankHeader = {
    date: today(),
    vendorName: "",
    invoiceNo: "",
    vehicleNo: "",
    location: "",
    receivedBy: "",
    remarks: "",
    poRef: "",
    inwardNo: "",
  };
  const blankItem = {
    _id: uid(),
    materialType: "Raw Material",
    productCode: "",
    category: "",
    subCategory: "",
    widthMm: "",
    lengthMm: "",
    gsm: "",
    noOfSheets: "",
    noOfReels: "",
    weight: "",
    rate: "",
    amount: "",
    itemName: "",
    qty: "",
    unit: "nos",
    size: "",
    uom: "nos",
    gstRate: 18,
    hsnCode: "",
    taxAmount: "",
    totalWithTax: "",
  };

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([{ ...blankItem, _id: uid() }]);
  const [itemMasterItems, setItemMasterItems] = useState([]);
  const [poList, setPoList] = useState([]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [highlightId, setHighlightId] = useState(null);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");

  const rmItems = useMemo(() => {
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );
    const fromMaster =
      rmCat && rmCat.subTypes ? Object.keys(rmCat.subTypes) : [];

    return [...new Set(fromMaster)].map((k) => k.trim());
  }, [categoryMaster]);

  const subCategoriesByItem = useMemo(() => {
    const result = {};
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );

    rmItems.forEach((item) => {
      const fromMaster =
        (rmCat && rmCat.subTypes ? rmCat.subTypes[item] : []) || [];
      result[item] = [...new Set(fromMaster)].map((p) => p.trim());
    });
    return result;
  }, [categoryMaster, rmItems]);

  const sortedItemMasterItems = useMemo(() => {
    return [...itemMasterItems].sort((a, b) => {
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
  }, [itemMasterItems]);

  useEffect(() => {
    fetchInwards();
    fetchItemMaster();
    fetchPOs();
  }, []);

  useEffect(() => {
    if (!deepLinkId || !inward.length) return;
    const record = inward.find((r) => (r.inwardNo || r.grnNo) === deepLinkId);
    if (record) {
      setHighlightId(deepLinkId);
      onDeepLinkConsumed?.();
    }
  }, [deepLinkId, inward]);

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

  const fetchItemMaster = async () => {
    try {
      const data = await itemMasterAPI.getAll();
      setItemMasterItems(data.items || []);
    } catch (error) {
      console.error("Failed to fetch item master:", error);
    }
  };

  const fetchPOs = async () => {
    try {
      const data = await purchaseOrdersAPI.getAll();
      setPoList(data.purchaseOrders || []);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    }
  };

  const fetchInwards = async () => {
    try {
      setLoading(true);
      const data = await materialInwardAPI.getAll();
      setInward(data);
    } catch (error) {
      toast("Failed to load material inwards", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const setH = (k, v) => {
    setHeader((f) => {
      const updated = { ...f, [k]: v };
      if (k === "poRef" && v) {
        let po = poList.find((p) => p.poNo === v);
        if (!po) {
          po = purchaseOrders.find((p) => p.poNo === v);
        }

        if (po) {
          updated.vendorName =
            typeof po.vendor === "object"
              ? po.vendor.name
              : po.vendor || po.vendorName || f.vendorName;
          const poItems = po.items || [];
          if (poItems.length > 0) {
            const newItems = poItems.map((pit) => {
              const lowCat = (pit.category || "").toLowerCase();
              const lowName = (pit.itemName || "").toLowerCase();
              const isConsumable =
                pit.materialType === "Consumable" ||
                consumableCategories.some((c) =>
                  lowCat.includes(c.toLowerCase()),
                ) ||
                ["polybag", "box", "tape", "glue"].some((k) =>
                  lowName.includes(k),
                );

              return {
                ...blankItem,
                _id: uid(),
                materialType: isConsumable ? "Consumable" : "Raw Material",
                category: pit.category || "",
                subCategory: pit.subCategory || pit.paperType || "",
                widthMm:
                  pit.width ||
                  (pit.sheetSize
                    ? pit.sheetSize.split("x")[0].replace("mm", "")
                    : ""),
                lengthMm:
                  pit.length ||
                  (pit.sheetSize
                    ? pit.sheetSize.split("x")[1]?.replace("mm", "")
                    : ""),
                height: pit.height || "",
                size: pit.size || pit.sheetSize || "",
                uom: pit.unit || pit.uom || "nos",
                unit: pit.unit || "nos",
                gsm: pit.gsm || "",
                weight: "",
                rate: pit.rate || "",
                itemName: pit.itemName || "",
                qty: "",
                noOfSheets: "",
                productCode: pit.productCode || "",
                gstRate: pit.gstRate || 18,
                hsnCode: pit.hsnCode || "",
                taxAmount: pit.taxAmount || "",
                totalWithTax: pit.totalWithTax || "",
                poRemarks: pit.remarks || "",
              };
            });
            setItems(newItems);
            setItemErrors(newItems.map(() => ({})));
          }
        }
      }
      if (k === "poRef" && !v) {
        setItems([{ ...blankItem, _id: uid() }]);
        setItemErrors([{}]);
      }
      return updated;
    });
    setHeaderErrors((e) => ({ ...e, [k]: false }));
  };

  const EH = (k) => (headerErrors[k] ? { border: `1px solid ${C.red}` } : {});
  const EHMsg = (k) =>
    headerErrors[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  const setItem = (idx, k, v) => {
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[idx], [k]: v };

      if (k === "productCode" && v) {
        let code = v;
        if (v.includes(" — ")) {
          code = v.split(" — ")[0].trim();
        }
        it.productCode = code;

        let masterItem = itemMasterItems.find(
          (x) =>
            (x.code || "").trim().toLowerCase() === code.trim().toLowerCase(),
        );

        if (masterItem) {
          const name = masterItem.name || "";
          it.itemName = masterItem.name;
          it.materialType = masterItem.type || "Raw Material";

          if (it.materialType === "Raw Material") {
            it.category = (masterItem.category || "").trim();
            it.subCategory = (masterItem.subCategory || "").trim();
            it.gsm = masterItem.gsm || "";
            it.widthMm = masterItem.width || "";
            it.lengthMm = masterItem.length || "";
            it.gstRate = masterItem.gstRate || 18;
            it.hsnCode = masterItem.hsnCode || "";

            if (!it.gsm) {
              const gsmMatch = name.match(/(\d+)[\s-]*gsm/i);
              if (gsmMatch) it.gsm = gsmMatch[1];
            }
            if (!it.widthMm) {
              const dimMatch = name.match(/(\d+)[\s-]*x[\s-]*(\d+)[\s-]*mm/i);
              const widthMatch = name.match(/(\d+)[\s-]*mm/i);
              if (dimMatch) {
                it.widthMm = dimMatch[1];
                it.lengthMm = dimMatch[2];
              } else if (widthMatch) {
                it.widthMm = widthMatch[1];
              }
            }
          } else if (it.materialType === "Consumable") {
            if (masterItem.category) {
              it.category = masterItem.category.trim();
            } else {
              const lowName = (it.itemName || "").toLowerCase();
              if (lowName.includes("ldpe polybag"))
                it.category = "LDPE Polybag";
              else if (
                lowName.includes("box") ||
                lowName.includes("corrugated")
              )
                it.category = "Corrugated Box";
              else if (lowName.includes("tape")) it.category = "Tape";
              else if (lowName.includes("glue")) it.category = "Glue";
            }

            const consDimMatch = (it.itemName || "").match(
              /(\d+)[\s-]*x[\s-]*(\d+)(?:[\s-]*x[\s-]*(\d+))?[\s-]*(\w+)/i,
            );
            if (consDimMatch) {
              it.widthMm = consDimMatch[1];
              if (consDimMatch[3]) {
                it.lengthMm = consDimMatch[2];
                it.height = consDimMatch[3];
                it.uom = consDimMatch[4];
              } else {
                it.height = consDimMatch[2];
                it.uom = consDimMatch[4];
              }
            }
          }
        }
      }

      if (k === "materialType") {
        it.category = "";
        it.subCategory = "";
        it.itemName = "";
        it.productCode = "";
        it.widthMm = "";
        it.lengthMm = "";
        it.gsm = "";
        it.noOfSheets = "";
        it.noOfReels = "";
        it.weight = "";
        it.qty = "";
        it.size = "";
        it.uom = "nos";
        it.width = "";
        it.length = "";
        it.height = "";
      }

      if (k === "category") {
        it.subCategory = "";
        it.itemName = "";
        it.productCode = "";
      }

      const isRM = it.materialType === "Raw Material" || !it.materialType;
      const weight = k === "weight" ? +v : +(it.weight || 0);
      const qty = k === "qty" ? +v : +(it.qty || 0);
      const rate = k === "rate" ? +v : +(it.rate || 0);
      it.amount = isRM
        ? weight && rate
          ? (weight * rate).toFixed(2)
          : ""
        : qty && rate
          ? (qty * rate).toFixed(2)
          : "";

      const amt = +it.amount || 0;
      const gst = +it.gstRate || 0;
      const tax = (amt * gst) / 100;
      it.taxAmount = tax.toFixed(2);
      it.totalWithTax = (amt + tax).toFixed(2);

      if (it.materialType === "Consumable" && !it.productCode) {
        const uom = it.uom || "";
        const uomPart = uom ? ` ${uom}` : "";
        if (it.category === "Corrugated Box") {
          const dims = [it.widthMm, it.lengthMm, it.height].filter(Boolean);
          const sizePart = it.size || (dims.length > 0 ? dims.join("x") : "");
          it.itemName = `Corrugated Box ${sizePart}${uomPart}`.trim();
        } else if (it.category === "LDPE Polybag") {
          const dims = [it.widthMm, it.height].filter(Boolean);
          const sizePart = it.size || (dims.length > 0 ? dims.join("x") : "");
          it.itemName = `LDPE Polybag ${sizePart}${uomPart}`.trim();
        } else if (it.category === "Tape" || it.category === "Glue") {
          const sizePart = it.size ? ` ${it.size}` : "";
          it.itemName = `${it.category}${sizePart}${uomPart}`.trim();
        }
      }

      updated[idx] = it;
      return updated;
    });
    setItemErrors((prev) => {
      const e = [...prev];
      e[idx] = { ...(e[idx] || {}), [k]: false };
      return e;
    });
  };

  const EI = (idx, k) =>
    (itemErrors[idx] || {})[k] ? { border: `1px solid ${C.red}` } : {};
  const EIMsg = (idx, k) =>
    (itemErrors[idx] || {})[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  const addItem = () => {
    setItems((prev) => [...prev, { ...blankItem, _id: uid() }]);
    setItemErrors((prev) => [...prev, {}]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    const he = {};
    if (!header.date) he.date = true;
    if (!header.vendorName) he.vendorName = true;
    if (!header.invoiceNo) he.invoiceNo = true;
    if (!header.vehicleNo) he.vehicleNo = true;
    if (!header.location) he.location = true;
    if (!header.receivedBy) he.receivedBy = true;
    if (!header.remarks) he.remarks = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (it.materialType === "Raw Material" || !it.materialType) {
        if (!it.category) e.category = true;
        if (!it.subCategory) e.subCategory = true;
        if (it.subCategory !== "Polycoated Blanks" && !it.widthMm)
          e.widthMm = true;
        if (
          it.subCategory !== "Polycoated Blanks" &&
          it.category !== "Paper Reel" &&
          !it.lengthMm
        )
          e.lengthMm = true;
        if (!it.gsm) e.gsm = true;
        if (
          it.subCategory !== "Polycoated Blanks" &&
          (it.category === "Paper Sheets" || it.category === "Paper Sheet") &&
          !it.noOfSheets
        )
          e.noOfSheets = true;
        if (!it.weight) e.weight = true;
        if (!it.rate) e.rate = true;
      } else if (it.materialType === "Consumable") {
        if (!it.category) e.category = true;
        if (
          (it.category === "Corrugated Box" ||
            it.category === "LDPE Polybag") &&
          !it.widthMm
        )
          e.widthMm = true;
        if (it.category === "Corrugated Box" && !it.lengthMm) e.lengthMm = true;
        if (
          (it.category === "Corrugated Box" ||
            it.category === "LDPE Polybag") &&
          !it.height
        )
          e.height = true;
        if (!it.qty) e.qty = true;
        if (!it.rate) e.rate = true;
      }
      return e;
    });
    setItemErrors(allItemErrors);

    if (
      Object.keys(he).length > 0 ||
      allItemErrors.some((e) => Object.keys(e).length > 0)
    ) {
      toast("Please fill all required fields", "error");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        inwardDate: header.date,
        poRef: header.poRef,
        vendorName: header.vendorName,
        invoiceNo: header.invoiceNo,
        vehicleNo: header.vehicleNo,
        location: header.location,
        receivedBy: header.receivedBy,
        remarks: header.remarks,
        items,
        status: "Received",
      };

      if (editId) {
        await materialInwardAPI.update(editId, payload);
        toast?.("Material Inward updated successfully", "success");
        setEditId(null);
      } else {
        await materialInwardAPI.create(payload);
        toast?.("Material Inward created successfully", "success");
        if (props.refreshData) props.refreshData();
      }

      setHeader(blankHeader);
      setItems([{ ...blankItem, _id: uid() }]);
      setHeaderErrors({});
      setItemErrors([{}]);
      fetchInwards();
    } catch (error) {
      toast(error.response?.data?.message || "Failed to save", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (record) => {
    try {
      setLoading(true);
      const data = await materialInwardAPI.getOne(record._id);

      setHeader({
        date: formatDateForInput(data.inwardDate),
        vendorName: data.vendorName || "",
        invoiceNo: data.invoiceNo || "",
        vehicleNo: data.vehicleNo || "",
        location: data.location || "",
        receivedBy: data.receivedBy || "",
        remarks: data.remarks || "",
        poRef: data.poRef || "",
        inwardNo: data.inwardNo || "",
      });

      const loadedItems = (data.items || [{ ...blankItem, _id: uid() }]).map((it) => {
        // Try to enrich missing fields from item master
        const master = it.productCode
          ? itemMasterItems.find(
              (x) => (x.code || "").trim().toLowerCase() === (it.productCode || "").trim().toLowerCase()
            )
          : null;

        const subCategory = it.subCategory || it.paperType || master?.subCategory || "";
        const category = it.category || master?.category || "";
        const widthMm = it.widthMm || master?.width || "";
        const lengthMm = it.lengthMm || master?.length || "";
        const gsm = it.gsm || master?.gsm || "";
        const gstRate = it.gstRate || master?.gstRate || 18;
        const hsnCode = it.hsnCode || master?.hsnCode || "";
        const itemName = it.itemName || master?.name || "";

        const qty = +(it.qty || 0);
        const rate = +(it.rate || 0);
        const gst = +gstRate;
        const amount = +(it.amount || 0) || qty * rate;
        const tax = (amount * gst) / 100;

        return {
          ...it,
          itemName,
          category,
          subCategory,
          widthMm,
          lengthMm,
          gsm,
          gstRate,
          hsnCode,
          amount: it.amount || (amount > 0 ? amount.toFixed(2) : ""),
          taxAmount: (it.taxAmount && +it.taxAmount !== 0) ? it.taxAmount : (tax > 0 ? tax.toFixed(2) : ""),
          totalWithTax: (it.totalWithTax && +it.totalWithTax !== 0) ? it.totalWithTax : (amount > 0 ? (amount + tax).toFixed(2) : ""),
        };
      });
      setItems(loadedItems);
      setItemErrors(loadedItems.map(() => ({})));
      setEditId(data._id);
      setShowModal(true);
    } catch (error) {
      toast("Failed to load inward details", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await materialInwardAPI.delete(deleteTarget);
      toast("Material Inward moved to trash", "success");
      fetchInwards();
    } catch (error) {
      toast("Failed to delete", "error");
      console.error(error);
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  const [search, setSearch] = useState("");

  const filteredInwards = useMemo(() => {
    let list = [...(inward || [])];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.inwardNo || "").toLowerCase().includes(q) ||
          (r.vendorName || "").toLowerCase().includes(q) ||
          (r.invoiceNo || "").toLowerCase().includes(q) ||
          (r.items || []).some((it) =>
            (it.rmItem || "").toLowerCase().includes(q),
          ),
      );
    }
    if (drDateFrom && drDateTo) {
      list = list.filter((r) => {
        const d = r.inwardDate?.slice(0, 10);
        return d >= drDateFrom && d <= drDateTo;
      });
    }
    return list;
  }, [inward, search, drDateFrom, drDateTo]);

  const handleExportExcel = () => {
    const headers = [
      "GRN No",
      "Date",
      "Vendor",
      "Invoice",
      "Vehicle",
      "Location",
      "Received By",
      "Item Code",
      "Item Name",
      "Category",
      "Type",
      "GSM",
      "Size",
      "Sheets",
      "Weight (kg)",
      "Rate",
      "Amount",
    ];

    const rows = [];
    filteredInwards.forEach((r) => {
      r.items.forEach((it) => {
        rows.push([
          r.inwardNo,
          formatDateForInput(r.inwardDate),
          r.vendorName,
          r.invoiceNo,
          r.vehicleNo,
          r.location,
          r.receivedBy,
          it.productCode,
          it.itemName || it.rmItem,
          it.category,
          it.subCategory,
          it.gsm,
          it.widthMm && it.lengthMm
            ? `${it.widthMm}x${it.lengthMm}`
            : it.widthMm || "",
          it.noOfSheets || "",
          it.weight || "",
          it.rate || "",
          it.amount || "",
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GRN Records");
    XLSX.writeFile(
      workbook,
      `GRN_Records_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const generateGRNPDF = (r) => {
    const rfmt = (n) => Math.round(n ?? 0).toLocaleString("en-IN");
    const itemsArr = (r.items || []).map((it) => {
      const amt = Number(it.amount || 0);
      const gst = Number(
        it.gstRate !== undefined && it.gstRate !== null ? it.gstRate : 18,
      );
      const rowTax = (amt * gst) / 100;
      return { ...it, rowTax, gross: amt + rowTax, usedGst: gst };
    });
    const subtotal = itemsArr.reduce((s, it) => s + Number(it.amount || 0), 0);
    const totalTax = itemsArr.reduce((s, it) => s + it.rowTax, 0);
    const total = subtotal + totalTax;
    const fd = (d) => (d ? d.toString().split("T")[0] : "—");

    const html = `
      <html>
        <head>
          <title>GRN-${r.inwardNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px 30px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #0e7490; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; font-weight: 500; }
            
            .doc-title { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; }
            .doc-title h2 { margin: 0; font-size: 18px; font-weight: 700; }
            .status { color: #0891b2; font-weight: 700; font-size: 12px; }
            
            .hr { height: 1px; background: #e2e8f0; margin: 10px 0; border: none; }
            .po-no { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 5px 0; }
            
            .section-label { font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; margin-top: 20px; }
            
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
            .info-item label { display: block; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
            .info-item span { font-size: 11px; font-weight: 600; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
            td { border: 1px solid #e2e8f0; padding: 4px 6px; font-size: 9px; color: #1e293b; }
            .col-qty { text-align: center; }
            .col-amt { text-align: right; font-weight: 700; }
            
            .total-row { display: flex; justify-content: flex-end; margin-top: 15px; }
            .total-box { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: #1a1a1a; }
            
            @media print { body { padding: 0; } @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
            <p>GRN DOCUMENT — MATERIAL INWARD RECEIPT</p>
          </div>

          <div class="doc-title">
            <h2>Material Inward Record (GRN)</h2>
            <div class="status">Type<br><span>VERIFIED RECEIPT</span></div>
          </div>
          <div class="po-no">${r.inwardNo}</div>
          <div class="hr"></div>

          <div class="section-label">General Information</div>
          <div class="info-grid">
            <div class="info-item"><label>GRN Date</label><span>${fd(r.inwardDate)}</span></div>
            <div class="info-item"><label>PO Reference</label><span>${r.poRef || "DIRECT INWARD"}</span></div>
            <div class="info-item"><label>Vendor</label><span>${r.vendorName}</span></div>
          </div>
          <div class="info-grid">
            <div class="info-item"><label>Invoice No</label><span>${r.invoiceNo}</span></div>
            <div class="info-item"><label>Vehicle No</label><span>${r.vehicleNo}</span></div>
            <div class="info-item"><label>Location</label><span>${r.location}</span></div>
          </div>

          <div class="section-label">Received Materials</div>
          <table>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>GSM</th>
                <th>Size</th>
                <th class="col-qty">No of Sheets</th>
                <th class="col-qty">Weight</th>
                <th class="col-amt">Rate</th>
                <th style="width:5%;">GST(%)</th>
                <th class="col-amt">Taxable</th>
                <th class="col-amt">GST Amt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsArr
                .map(
                  (it) => `
                <tr>
                  <td>${it.productCode || "—"}</td>
                  <td>${it.itemName || it.rmItem}</td>
                  <td>${it.category}</td>
                  <td>${it.gsm || "—"}</td>
                  <td>${it.widthMm}${it.lengthMm ? "x" + it.lengthMm : ""}mm</td>
                  <td class="col-qty">${it.noOfSheets ? fmt(it.noOfSheets) : "—"}</td>
                  <td class="col-qty">${fmt(it.weight)} kg</td>
                  <td class="col-amt">₹${rfmt(it.rate)}</td>
                  <td style="text-align:center;">${it.usedGst}%</td>
                  <td class="col-amt" style="white-space:nowrap;">₹${rfmt(it.amount)}</td>
                  <td class="col-amt" style="white-space:nowrap;">₹${rfmt(it.rowTax)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-row">
            <div style="width: 220px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <label>Taxable Amount:</label>
                <span>₹${rfmt(subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <label>Total GST:</label>
                <span>₹${rfmt(totalTax)}</span>
              </div>
              <div class="hr"></div>
              <div class="total-box">
                <label>Net Total:</label>
                ₹${rfmt(total)}
              </div>
            </div>
          </div>

          <div style="margin-top: 50px; display: flex; justify-content: space-between;">
             <div style="border-top: 1px solid #ccc; width: 140px; text-align: center; padding-top: 5px; font-size: 10px;">Store Keeper</div>
             <div style="border-top: 1px solid #ccc; width: 140px; text-align: center; padding-top: 5px; font-size: 10px;">Security</div>
             <div style="border-top: 1px solid #ccc; width: 140px; text-align: center; padding-top: 5px; font-size: 10px;">QC / Manager</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    };
  };

  return (
    <>
    <div className="fade">
      <SectionTitle
        icon="fa-solid fa-truck-ramp-box"
        title="Material Inward"
        sub="Record incoming paper / board material receipts"
      />

      {canEdit && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => {
              setEditId(null);
              setHeader(blankHeader);
              setItems([{ ...blankItem, _id: uid() }]);
              setHeaderErrors({});
              setItemErrors([{}]);
              setShowModal(true);
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px) saturate(180%)",
              WebkitBackdropFilter: "blur(12px) saturate(180%)",
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
            + New Material Inward
          </button>
        </div>
      )}

      {showModal && (
        <Modal
          title={editId ? "Edit Material Inward" : "New Material Inward"}
          onClose={() => {
            setShowModal(false);
            setEditId(null);
            setHeader(blankHeader);
            setItems([{ ...blankItem, _id: uid() }]);
            setHeaderErrors({});
            setItemErrors([{}]);
          }}
        >
          <div>
            {editId && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  background: C.blue + "11",
                  border: `1px solid ${C.blue}22`,
                  borderRadius: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: C.blue, fontWeight: 600 }}>
                  Edit Mode
                </span>
                <button
                  onClick={() => {
                    setEditId(null);
                    setHeader(blankHeader);
                    setItems([{ ...blankItem, _id: uid() }]);
                    setHeaderErrors({});
                    setItemErrors([{}]);
                    setShowModal(false);
                  }}
                  style={{
                    background: "transparent",
                    color: C.blue,
                    border: `1px solid ${C.blue}`,
                    borderRadius: 5,
                    padding: "4px 12px",
                    fontWeight: 500,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            <Card style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.blue,
                  marginBottom: 16,
                }}
              >
                Invoice Details
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <Field label="GRN No">
                  <input
                    readOnly
                    placeholder="— Auto-generated —"
                    value={header.inwardNo}
                    style={{ color: C.muted, background: "transparent" }}
                  />
                </Field>
                <Field label="Date *">
                  <DatePicker
                    value={header.date}
                    onChange={(v) => setH("date", v)}
                    style={EH("date")}
                  />
                  {EHMsg("date")}
                </Field>
                <Field label="PO Reference">
                  <select
                    value={header.poRef || ""}
                    onChange={(e) => setH("poRef", e.target.value)}
                  >
                    <option value="">-- Link to PO (optional) --</option>
                    {(poList && poList.length > 0
                      ? poList
                      : purchaseOrders || []
                    )
                      .filter((p) => {
                        const s = (p.status || p.poStatus || "Open")
                          .toString()
                          .trim()
                          .toLowerCase();
                        return (
                          s !== "received" &&
                          s !== "fulfilled" &&
                          s !== "closed" &&
                          s !== "completed"
                        );
                      })
                      .map((p) => (
                        <option key={p.poNo} value={p.poNo}>
                          {p.poNo} ({p.status || p.poStatus || "Open"}) —{" "}
                          {p.vendor?.name ||
                            p.vendor ||
                            p.vendorName ||
                            "Unknown Vendor"}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Vendor Name *">
                  <AutocompleteInput
                    value={header.vendorName}
                    onChange={(v) => setH("vendorName", v)}
                    suggestions={(vendorMaster || []).map((v) => v.name)}
                    placeholder="Supplier / Vendor name"
                    inputStyle={EH("vendorName")}
                  />
                  {EHMsg("vendorName")}
                </Field>
                <Field label="Invoice Number *">
                  <input
                    placeholder="Invoice / DC number"
                    value={header.invoiceNo}
                    onChange={(e) => setH("invoiceNo", e.target.value)}
                    style={EH("invoiceNo")}
                  />
                  {EHMsg("invoiceNo")}
                </Field>
                <Field label="Vehicle Number *">
                  <input
                    placeholder="e.g. DL01AB1234"
                    value={header.vehicleNo}
                    onChange={(e) => setH("vehicleNo", e.target.value)}
                    style={EH("vehicleNo")}
                  />
                  {EHMsg("vehicleNo")}
                </Field>
                <Field label="Location / Store *">
                  <select
                    value={header.location}
                    onChange={(e) => setH("location", e.target.value)}
                    style={EH("location")}
                  >
                    <option value="">-- Select Location --</option>
                    {LOCATIONS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  {EHMsg("location")}
                </Field>
                <Field label="Received By *">
                  <input
                    placeholder="Staff name"
                    value={header.receivedBy}
                    onChange={(e) => setH("receivedBy", e.target.value)}
                    style={EH("receivedBy")}
                  />
                  {EHMsg("receivedBy")}
                </Field>
                <Field label="Remarks *" span={2}>
                  <input
                    placeholder="Condition of material, special notes..."
                    value={header.remarks}
                    onChange={(e) => setH("remarks", e.target.value)}
                    style={EH("remarks")}
                  />
                  {EHMsg("remarks")}
                </Field>
              </div>
            </Card>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 500, color: C.accent }}>
                Material Items ({items.length})
              </h3>
              <button
                onClick={addItem}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px) saturate(180%)",
                  WebkitBackdropFilter: "blur(12px) saturate(180%)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontWeight: 500,
                  fontSize: 13,
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                + Add Item
              </button>
            </div>

            {items.map((it, idx) => (
              <Card key={it._id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{ fontWeight: 500, color: C.accent, fontSize: 13 }}
                  >
                    Item {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        background: C.red + "22",
                        color: C.red,
                        border: "none",
                        borderRadius: 5,
                        padding: "4px 12px",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 12,
                  }}
                >
                  <Field label="Product Code">
                    <AutocompleteInput
                      value={it.productCode}
                      onChange={(v) => setItem(idx, "productCode", v)}
                      suggestions={sortedItemMasterItems.map(
                        (i) => `${i.code} — ${i.name}`,
                      )}
                      placeholder="Type or select code (optional)"
                    />
                  </Field>
                  <Field label="Material Type *">
                    <select
                      value={it.materialType || "Raw Material"}
                      onChange={(e) =>
                        setItem(idx, "materialType", e.target.value)
                      }
                    >
                      <option value="Raw Material">Raw Material</option>
                      <option value="Consumable">Consumable</option>
                      <option value="Finished Goods">Finished Goods</option>
                    </select>
                  </Field>
                  {(it.materialType === "Raw Material" || !it.materialType) && (
                    <>
                      <Field label="RM Item *">
                        <select
                          value={it.category}
                          onChange={(e) =>
                            setItem(idx, "category", e.target.value)
                          }
                          style={EI(idx, "category")}
                        >
                          <option value="">-- Select Item --</option>
                          {rmItems.map((i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          ))}
                        </select>
                        {EIMsg(idx, "category")}
                      </Field>
                      <Field label="Paper Type *">
                        <select
                          value={it.subCategory}
                          onChange={(e) =>
                            setItem(idx, "subCategory", e.target.value)
                          }
                          disabled={!it.category}
                          style={EI(idx, "subCategory")}
                        >
                          <option value="">
                            {it.category
                              ? "-- Select Paper Type --"
                              : "-- Select RM Item first --"}
                          </option>
                          {(subCategoriesByItem[it.category] || []).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        {EIMsg(idx, "subCategory")}
                      </Field>
                      {it.subCategory !== "Polycoated Blanks" && (
                        <Field label="Width (mm) *">
                          <input
                            type="number"
                            placeholder="e.g. 700"
                            value={it.widthMm}
                            onChange={(e) =>
                              setItem(idx, "widthMm", e.target.value)
                            }
                            style={EI(idx, "widthMm")}
                          />
                          {EIMsg(idx, "widthMm")}
                        </Field>
                      )}

                      {it.subCategory !== "Polycoated Blanks" &&
                        (it.category === "Paper Sheets" ||
                          it.category === "Paper Sheet") && (
                          <Field label="Length (mm) *">
                            <input
                              type="number"
                              placeholder="e.g. 1000"
                              value={it.lengthMm}
                              onChange={(e) =>
                                setItem(idx, "lengthMm", e.target.value)
                              }
                              style={EI(idx, "lengthMm")}
                            />
                            {EIMsg(idx, "lengthMm")}
                          </Field>
                        )}
                      <Field label="GSM *">
                        <input
                          type="number"
                          placeholder="e.g. 90, 130, 250"
                          value={it.gsm}
                          onChange={(e) => setItem(idx, "gsm", e.target.value)}
                          style={EI(idx, "gsm")}
                        />
                        {EIMsg(idx, "gsm")}
                      </Field>
                      {it.subCategory !== "Polycoated Blanks" &&
                        (it.category === "Paper Sheets" ||
                          it.category === "Paper Sheet") && (
                          <Field label="# of Sheets *">
                            <input
                              type="number"
                              placeholder="No. of sheets"
                              value={it.noOfSheets}
                              onChange={(e) =>
                                setItem(idx, "noOfSheets", e.target.value)
                              }
                              style={EI(idx, "noOfSheets")}
                            />
                            {EIMsg(idx, "noOfSheets")}
                          </Field>
                        )}
                      <Field label="Weight (kg) *">
                        <input
                          type="number"
                          placeholder="Total weight"
                          value={it.weight}
                          onChange={(e) =>
                            setItem(idx, "weight", e.target.value)
                          }
                          style={EI(idx, "weight")}
                        />
                        {EIMsg(idx, "weight")}
                      </Field>
                      <Field label="Rate (₹/kg) *">
                        <input
                          type="number"
                          placeholder="Rate per kg"
                          value={it.rate}
                          onChange={(e) => setItem(idx, "rate", e.target.value)}
                          style={EI(idx, "rate")}
                        />
                        {EIMsg(idx, "rate")}
                      </Field>
                      <Field label="Amount (₹)">
                        <input
                          readOnly
                          value={
                            it.amount
                              ? `₹${fmt(+it.amount)}`
                              : "-- Weight × Rate --"
                          }
                          style={{
                            background: C.border + "22",
                            fontWeight: 500,
                            color: it.amount ? C.green : C.muted,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        />
                      </Field>
                      <div style={{ gridColumn: "span 3" }} />
                    </>
                  )}
                  {it.materialType === "Finished Goods" && (
                    <>
                      <Field label="Category">
                        <input
                          placeholder="e.g. Corrugated Box"
                          value={it.category}
                          onChange={(e) =>
                            setItem(idx, "category", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Qty *">
                        <input
                          type="number"
                          placeholder="0"
                          value={it.qty}
                          onChange={(e) => setItem(idx, "qty", e.target.value)}
                          style={EI(idx, "qty")}
                        />
                      </Field>
                      <div style={{ gridColumn: "span 3" }} />
                    </>
                  )}

                  {it.materialType === "Consumable" && (
                    <>
                      <Field label="Category *">
                        <select
                          value={it.category}
                          onChange={(e) =>
                            setItem(idx, "category", e.target.value)
                          }
                          style={EI(idx, "category")}
                        >
                          <option value="">-- Select Category --</option>
                          {consumableCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {EIMsg(idx, "category")}
                      </Field>

                      <Field label="Size">
                        <input
                          placeholder="e.g. 200mm"
                          value={it.size}
                          onChange={(e) => setItem(idx, "size", e.target.value)}
                        />
                      </Field>

                      {it.category === "Corrugated Box" ||
                      it.category === "LDPE Polybag" ? (
                        <>
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              height: 1,
                              margin: "4px 0",
                            }}
                          />
                          <Field label="UOM">
                            <select
                              value={it.uom || "nos"}
                              onChange={(e) =>
                                setItem(idx, "uom", e.target.value)
                              }
                            >
                              <option value="nos">nos</option>
                              <option value="kg">kg</option>
                              <option value="set">set</option>
                              <option value="pcs">pcs</option>
                              <option value="pkt">pkt</option>
                              <option value="mm">mm</option>
                              <option value="cm">cm</option>
                              <option value="inch">inch</option>
                            </select>
                          </Field>
                          {it.category === "Corrugated Box" && (
                            <>
                              <Field label="Width *">
                                <input
                                  type="number"
                                  placeholder="Width"
                                  value={it.widthMm || ""}
                                  onChange={(e) =>
                                    setItem(idx, "widthMm", e.target.value)
                                  }
                                  style={EI(idx, "widthMm")}
                                />
                              </Field>
                              <Field label="Length *">
                                <input
                                  type="number"
                                  placeholder="Length"
                                  value={it.lengthMm || ""}
                                  onChange={(e) =>
                                    setItem(idx, "lengthMm", e.target.value)
                                  }
                                  style={EI(idx, "lengthMm")}
                                />
                              </Field>
                              <Field label="Height *">
                                <input
                                  type="number"
                                  placeholder="Height"
                                  value={it.height || ""}
                                  onChange={(e) =>
                                    setItem(idx, "height", e.target.value)
                                  }
                                  style={EI(idx, "height")}
                                />
                              </Field>
                              <div style={{ gridColumn: "span 1" }} />
                            </>
                          )}
                          {it.category === "LDPE Polybag" && (
                            <>
                              <Field label="Width *">
                                <input
                                  type="number"
                                  placeholder="Width"
                                  value={it.widthMm || ""}
                                  onChange={(e) =>
                                    setItem(idx, "widthMm", e.target.value)
                                  }
                                  style={EI(idx, "widthMm")}
                                />
                              </Field>
                              <Field label="Height *">
                                <input
                                  type="number"
                                  placeholder="Height"
                                  value={it.height || ""}
                                  onChange={(e) =>
                                    setItem(idx, "height", e.target.value)
                                  }
                                  style={EI(idx, "height")}
                                />
                              </Field>
                              <div style={{ gridColumn: "span 2" }} />
                            </>
                          )}

                          <div
                            style={{
                              gridColumn: "1 / -1",
                              height: 1,
                              margin: "4px 0",
                            }}
                          />
                          <Field
                            label="ITEM NAME"
                            style={{ gridColumn: "span 2" }}
                          >
                            <div
                              style={{
                                padding: "10px 14px",
                                background: "#0c0c0e",
                                border: "1px solid #2a2a2e",
                                borderRadius: 6,
                                color: "#4ade80",
                                fontWeight: 500,
                                minHeight: 40,
                                fontSize: 13,
                              }}
                            >
                              {it.itemName}
                              {it.poRemarks && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#3b82f6",
                                    marginTop: 4,
                                    fontStyle: "italic",
                                  }}
                                >
                                  PO Note: {it.poRemarks}
                                </div>
                              )}
                            </div>
                          </Field>
                          <Field label="QUANTITY *">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={it.qty}
                              onChange={(e) =>
                                setItem(idx, "qty", e.target.value)
                              }
                              style={EI(idx, "qty")}
                            />
                          </Field>
                          <Field label="UNIT *">
                            <select
                              value={it.unit || "nos"}
                              onChange={(e) =>
                                setItem(idx, "unit", e.target.value)
                              }
                            >
                              <option value="nos">nos</option>
                              <option value="kg">kg</option>
                              <option value="pcs">pcs</option>
                              <option value="mm">mm</option>
                              <option value="cm">cm</option>
                              <option value="inch">inch</option>
                            </select>
                          </Field>
                          <Field label="RATE (₹/NOS) *">
                            <input
                              type="number"
                              placeholder="Rate per unit"
                              value={it.rate}
                              onChange={(e) =>
                                setItem(idx, "rate", e.target.value)
                              }
                              style={EI(idx, "rate")}
                            />
                          </Field>

                          <div
                            style={{
                              gridColumn: "1 / -1",
                              height: 1,
                              margin: "4px 0",
                            }}
                          />
                          <Field label="AMOUNT (₹)">
                            <input
                              readOnly
                              value={
                                it.amount
                                  ? `₹${fmt(+it.amount)}`
                                  : "— Qty × Rate —"
                              }
                              style={{
                                background: "#0c0c0e",
                                color: it.amount ? C.green : C.muted,
                                fontWeight: 500,
                              }}
                            />
                          </Field>
                          <div style={{ gridColumn: "span 4" }} />
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              height: 1,
                              margin: "4px 0",
                            }}
                          />
                          <Field label="UOM">
                            <select
                              value={it.uom || "nos"}
                              onChange={(e) =>
                                setItem(idx, "uom", e.target.value)
                              }
                            >
                              <option value="nos">nos</option>
                              <option value="kg">kg</option>
                              <option value="set">set</option>
                              <option value="pcs">pcs</option>
                              <option value="pkt">pkt</option>
                              <option value="mtr">mtr</option>
                            </select>
                          </Field>
                          <Field label="QUANTITY *">
                            <input
                              type="number"
                              placeholder="e.g. 10"
                              value={it.qty}
                              onChange={(e) =>
                                setItem(idx, "qty", e.target.value)
                              }
                              style={EI(idx, "qty")}
                            />
                          </Field>
                          <Field label="UNIT">
                            <select
                              value={it.unit || "nos"}
                              onChange={(e) =>
                                setItem(idx, "unit", e.target.value)
                              }
                            >
                              <option value="nos">nos</option>
                              <option value="kg">kg</option>
                              <option value="pcs">pcs</option>
                              <option value="mm">mm</option>
                              <option value="cm">cm</option>
                              <option value="inch">inch</option>
                            </select>
                          </Field>
                          <Field label="RATE (₹/NOS) *">
                            <input
                              type="number"
                              placeholder="Rate per unit"
                              value={it.rate}
                              onChange={(e) =>
                                setItem(idx, "rate", e.target.value)
                              }
                              style={EI(idx, "rate")}
                            />
                          </Field>
                          <Field label="AMOUNT (₹)">
                            <input
                              readOnly
                              value={
                                it.amount
                                  ? `₹${fmt(+it.amount)}`
                                  : "— Qty × Rate —"
                              }
                              style={{
                                background: "#0c0c0e",
                                color: it.amount ? C.green : C.muted,
                                fontWeight: 500,
                              }}
                            />
                          </Field>
                        </>
                      )}
                    </>
                  )}

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      height: 1,
                      borderTop: `1px dashed ${C.border}`,
                      margin: "4px 0",
                    }}
                  />

                  <Field label="GST (%)">
                    <input
                      type="number"
                      placeholder="18"
                      value={it.gstRate || 18}
                      onChange={(e) => setItem(idx, "gstRate", e.target.value)}
                    />
                  </Field>
                  <Field label="HSN">
                    <input
                      placeholder="HSN code"
                      value={it.hsnCode || ""}
                      onChange={(e) => setItem(idx, "hsnCode", e.target.value)}
                    />
                  </Field>
                  <Field label="Total (incl Tax)">
                    <div
                      style={{
                        padding: "9px 12px",
                        background: "#0c0c0e",
                        border: "1px solid #2a2a2e",
                        borderRadius: 6,
                        fontSize: 13,
                        color: it.totalWithTax ? C.green : C.muted,
                        fontWeight: it.totalWithTax ? 700 : 400,
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                    >
                      {it.totalWithTax ? `₹${fmt(+it.totalWithTax)}` : "—"}
                    </div>
                  </Field>
                  <div style={{ gridColumn: "span 2" }} />
                </div>
                <Field label="Item Name" span={2}>
                  <input
                    readOnly
                    placeholder="Auto-filled from material details"
                    value={it.itemName || ""}
                    style={{ background: C.border + "22", fontSize: 13 }}
                  />
                </Field>
              </Card>
            ))}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 4,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={addItem}
                style={{
                  background: C.accent + "22",
                  color: C.accent,
                  border: `1px solid ${C.accent}44`,
                  borderRadius: 6,
                  padding: "9px 20px",
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                + Add Another Item
              </button>
              <SubmitBtn
                label={`Submit GRN (${items.length} item${items.length > 1 ? "s" : ""})`}
                color={C.blue}
                onClick={submit}
              />
              {items.some((it) => it.amount) && (
                <div
                  style={{
                    marginLeft: "auto",
                    padding: "12px 20px",
                    background: C.green + "11",
                    border: `1px solid ${C.green}33`,
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minWidth: 200,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                    <span>Basic Amount:</span>
                    <span>₹{fmt(items.reduce((sum, it) => sum + +(it.amount || 0), 0))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                    <span>Tax Amount:</span>
                    <span>₹{fmt(items.reduce((sum, it) => sum + +(it.taxAmount || 0), 0))}</span>
                  </div>
                  <div style={{ height: 1, background: C.green + "22", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: C.green, fontSize: 15 }}>
                    <span>Total:</span>
                    <span>₹{fmt(items.reduce((sum, it) => sum + +(it.totalWithTax || 0), 0))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 12, flex: 1 }}>
            <div style={{ position: "relative", width: 300 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#555",
                }}
              >
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                placeholder="Search records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  background: "transparent",
                  border: "1px solid #2a2a2e",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 13,
                }}
              />
            </div>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={handleExportExcel}
              style={{
                background: "transparent",
                color: C.green,
                border: `1px solid ${C.green}44`,
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Export Excel
            </button>
            <span style={{ fontSize: 12, color: C.muted }}>
              {filteredInwards.length} records found
            </span>
          </div>
        </div>

        {(() => {
          const listData = filteredInwards.slice().reverse();
          const totalValue = listData.reduce(
            (s, r) =>
              s + (r.items || []).reduce((ss, it) => ss + +(it.amount || 0), 0),
            0,
          );
          const totalWeight = listData.reduce(
            (s, r) =>
              s + (r.items || []).reduce((ss, it) => ss + +(it.weight || 0), 0),
            0,
          );
          const thisMonth = new Date().toISOString().slice(0, 7);
          const thisMonthCount = listData.filter(
            (r) => (r.inwardDate || "").slice(0, 7) === thisMonth,
          ).length;
          const statCards = [
            {
              label: "Total GRNs",
              value: listData.length,
              icon: "fa-solid fa-truck-ramp-box",
            },
            {
              label: "This Month",
              value: thisMonthCount,
              icon: "fa-solid fa-calendar-days",
            },
            {
              label: "Total Weight",
              value: fmt(Math.round(totalWeight)) + " kg",
              icon: "fa-solid fa-weight-hanging",
            },
            {
              label: "Total Value",
              value: `₹${fmt(totalValue)}`,
              icon: "fa-solid fa-indian-rupee-sign",
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
                {statCards.map(({ label, value, icon, color }) => (
                  <div
                    key={label}
                    style={{
                      padding: "16px 20px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      borderLeft: `3px solid ${color}`,
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
                          color: C.muted,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {label}
                      </span>
                      <i
                        className={icon}
                        style={{
                          color,
                          fontSize: 20,
                          opacity: 0.9,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 28,
                          width: 28,
                          lineHeight: 1,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {listData.length === 0 ? (
                <Card
                  style={{ textAlign: "center", padding: 40, color: C.muted }}
                >
                  No material inward records found.
                </Card>
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
                        {[
                          "GRN No",
                          "PO No",
                          "Date",
                          "Vendor",
                          "Invoice",
                          "Location",
                          "Items",
                          "Total",
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
                      {listData.map((r, i) => {
                        const total = (r.items || []).reduce(
                          (s, it) => s + +(it.amount || 0),
                          0,
                        );
                        return (
                          <tr
                            key={r._id}
                            data-record-id={r.inwardNo || r.grnNo}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                              background:
                                (r.inwardNo || r.grnNo) === highlightId
                                  ? `${C.accent}11`
                                  : i % 2 === 0
                                    ? "transparent"
                                    : "rgba(255,255,255,0.01)",
                              transition: "all 0.4s ease",
                            }}
                          >
                            <td
                              style={{
                                padding: "12px 14px",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                color: "#60a5fa",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.inwardNo}
                            </td>
                            <td
                              style={{
                                padding: "12px 14px",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 12,
                                color: C.muted,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.poRef || "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 14px",
                                color: C.muted,
                                whiteSpace: "nowrap",
                                fontSize: 12,
                              }}
                            >
                              {formatDateForInput(r.inwardDate)}
                            </td>
                            <td
                              style={{ padding: "12px 14px", fontWeight: 500 }}
                            >
                              {r.vendorName}
                            </td>
                            <td
                              style={{
                                padding: "12px 14px",
                                color: C.muted,
                                fontSize: 12,
                              }}
                            >
                              {r.invoiceNo || "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 14px",
                                color: C.muted,
                                fontSize: 12,
                              }}
                            >
                              {r.location || "—"}
                            </td>
                            <td
                              style={{ padding: "12px 14px", color: C.muted }}
                            >
                              {(r.items || []).length} item
                              {(r.items || []).length !== 1 ? "s" : ""}
                            </td>
                            <td
                              style={{
                                padding: "12px 14px",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                color: "#10b981",
                                whiteSpace: "nowrap",
                              }}
                            >
                              ₹{fmt(total)}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                {canEdit && (
                                  <button
                                    onClick={() => handleEdit(r)}
                                    style={{
                                      background: "#1e293b",
                                      color: C.blue,
                                      border: "1px solid #334155",
                                      borderRadius: 6,
                                      padding: "6px 14px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => generateGRNPDF(r)}
                                  style={{
                                    background: "#2a1a45",
                                    color: "#a855f7",
                                    border: "1px solid #4c1d95",
                                    borderRadius: 6,
                                    padding: "6px 14px",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                  }}
                                >
                                  PDF
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => setDeleteTarget(r._id)}
                                    style={{
                                      background: "#450a0a",
                                      color: "#ef4444",
                                      border: "1px solid #7f1d1d",
                                      borderRadius: 6,
                                      padding: "6px 14px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
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
      </div>
    </div>

    <ConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDelete}
      title="Move to Trash"
      message="This material inward will be moved to trash. Stock will be reversed. You can restore it within 7 days."
      confirmText="Move to Trash"
      cancelText="Cancel"
      type="danger"
    />
    </>
  );
}
