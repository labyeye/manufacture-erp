import React, { useState, useMemo, useEffect } from "react";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Field,
  Badge,
  SubmitBtn,
  AutocompleteInput,
  DateRangeFilter,
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
  props = {},
}) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");

  
  const rmItems = useMemo(() => {
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );
    const fromMaster =
      rmCat && rmCat.subTypes ? Object.keys(rmCat.subTypes) : [];

    const fromItems = itemMasterItems
      .filter((it) => it.type === "Raw Material")
      .map((it) => it.category)
      .filter(Boolean);

    return [...new Set([...fromMaster, ...fromItems])].map((k) => k.trim());
  }, [categoryMaster, itemMasterItems]);

  
  const subCategoriesByItem = useMemo(() => {
    const result = {};
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );

    rmItems.forEach((item) => {
      const fromMaster =
        (rmCat && rmCat.subTypes ? rmCat.subTypes[item] : []) || [];
      const fromItems = itemMasterItems
        .filter((it) => it.type === "Raw Material" && it.category === item)
        .map((it) => it.subCategory)
        .filter(Boolean);

      result[item] = [...new Set([...fromMaster, ...fromItems])].map((p) =>
        p.trim(),
      );
    });
    return result;
  }, [categoryMaster, rmItems, itemMasterItems]);

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
                weight: isConsumable ? "" : "",
                rate: pit.rate || "",
                itemName: pit.itemName || "",
                qty: "",
                noOfSheets: "",
                productCode: pit.productCode || "",
                gstRate: pit.gstRate || 18,
                hsnCode: pit.hsnCode || "",
                taxAmount: pit.taxAmount || "",
                totalWithTax: pit.totalWithTax || "",
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
            if (name.includes("Paper Reel")) {
              it.category = "Paper Reel";
              const gsmMatch = name.match(/(\d+)gsm/);
              const widthMatch = name.match(/(\d+)mm/);
              const paperTypes = [
                "MG Kraft",
                "MF Kraft",
                "Bleached Kraft",
                "OGR",
              ];
              const foundType = paperTypes.find((t) => name.includes(t));
              if (gsmMatch) it.gsm = gsmMatch[1];
              if (widthMatch) it.widthMm = widthMatch[1];
              if (foundType) it.subCategory = foundType;
            } else if (name.includes("Sheet")) {
              it.category = "Paper Sheets";
              const gsmMatch = name.match(/(\d+)gsm/);
              const dimMatch = name.match(/(\d+)x(\d+)mm/);
              const widthMatch = name.match(/(\d+)mm/);
              const paperTypes = [
                "White PE Coated",
                "Kraft PE Coated",
                "Kraft Uncoated",
                "SBS/FBB",
                "Whiteback",
                "Greyback",
                "Art Paper",
                "Gumming Sheet",
              ];
              const foundType = paperTypes.find((t) => name.includes(t));
              if (gsmMatch) it.gsm = gsmMatch[1];
              if (dimMatch) {
                it.widthMm = dimMatch[1];
                it.lengthMm = dimMatch[2];
              } else if (widthMatch) it.widthMm = widthMatch[1];
              if (foundType) it.subCategory = foundType;
            }
          } else if (it.materialType === "Consumable") {
            const lowName = (it.itemName || "").toLowerCase();
            if (lowName.includes("ldpe polybag")) it.category = "LDPE Polybag";
            else if (lowName.includes("box") || lowName.includes("corrugated"))
              it.category = "Corrugated Box";
            else if (lowName.includes("tape")) it.category = "Tape";
            else if (lowName.includes("glue")) it.category = "Glue";

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

      if (it.materialType === "Consumable") {
        const uom = it.uom || "nos";
        if (it.category === "Corrugated Box") {
          const dims = [it.widthMm, it.lengthMm, it.height].filter(Boolean);
          const sizePart = it.size || (dims.length > 0 ? dims.join("x") : "");
          it.itemName = `Corrugated Box ${sizePart}${uom}`;
        } else if (it.category === "LDPE Polybag") {
          const dims = [it.widthMm, it.height].filter(Boolean);
          const sizePart = it.size || (dims.length > 0 ? dims.join("x") : "");
          it.itemName = `LDPE Polybag ${sizePart}${uom}`;
        } else if (it.category === "Tape" || it.category === "Glue") {
          const sizePart = it.size ? ` ${it.size}` : "";
          it.itemName = `${it.category}${sizePart}${uom}`;
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
        if (!it.widthMm) e.widthMm = true;
        if (it.category !== "Paper Reel" && !it.lengthMm) e.lengthMm = true;
        if (!it.gsm) e.gsm = true;
        if (
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
        toast("Material Inward updated successfully", "success");
        setEditId(null);
      } else {
        await materialInwardAPI.create(payload);
        toast("Material Inward created successfully", "success");
        if (props.refreshData) props.refreshData();
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setHeader(blankHeader);
        setItems([{ ...blankItem, _id: uid() }]);
        setHeaderErrors({});
        setItemErrors([{}]);
        fetchInwards();
      }, 2000);
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

      setItems(data.items || [{ ...blankItem, _id: uid() }]);
      setItemErrors((data.items || []).map(() => ({})));
      setEditId(data._id);
      setView("form");
    } catch (error) {
      toast("Failed to load inward details", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this inward?")) return;

    try {
      setLoading(true);
      await materialInwardAPI.delete(id);
      toast("Material Inward deleted successfully", "success");
      fetchInwards();
    } catch (error) {
      toast("Failed to delete", "error");
      console.error(error);
    } finally {
      setLoading(false);
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

  const handleExportCSV = () => {
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

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `GRN_Records_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateGRNPDF = (r) => {
    const total = (r.items || []).reduce((s, it) => s + +(it.amount || 0), 0);
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
                <th class="col-amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(r.items || [])
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
                  <td class="col-amt">${fmt(it.rate)}</td>
                  <td class="col-amt">${fmt(it.amount)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-row">
            <div class="total-box">₹${fmt(total)}</div>
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
    <div className="fade">
      <SectionTitle
        icon="🚚"
        title="Material Inward"
        sub="Record incoming paper / board material receipts"
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["form", "📝 New Entry"],
          ["records", `📋 Records (${inward.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? C.blue : C.border}`,
              background: view === v ? C.blue + "22" : "transparent",
              color: view === v ? C.blue : C.muted,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {view === "form" && (
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
                ✎ Edit Mode
              </span>
              <button
                onClick={() => {
                  setEditId(null);
                  setHeader(blankHeader);
                  setItems([{ ...blankItem, _id: uid() }]);
                  setHeaderErrors({});
                  setItemErrors([{}]);
                }}
                style={{
                  background: "transparent",
                  color: C.blue,
                  border: `1px solid ${C.blue}`,
                  borderRadius: 5,
                  padding: "4px 12px",
                  fontWeight: 700,
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
                fontWeight: 700,
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
              <Field label="Date 📅 *">
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
                  {(poList && poList.length > 0 ? poList : purchaseOrders || [])
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
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>
              Material Items ({items.length})
            </h3>
            <button
              onClick={addItem}
              style={{
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              + Add Item
            </button>
          </div>

          {items.map((it, idx) => (
            <Card
              key={it._id}
              style={{ marginBottom: 12, borderLeft: `3px solid ${C.accent}` }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}
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
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    ✕ Remove
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
                    {(it.category === "Paper Sheets" ||
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
                        onChange={(e) => setItem(idx, "weight", e.target.value)}
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
                          fontWeight: 700,
                          color: it.amount ? C.green : C.muted,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
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
                              fontWeight: 700,
                              minHeight: 40,
                              fontSize: 13,
                            }}
                          >
                            {it.itemName}
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
                              fontWeight: 700,
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
                              fontWeight: 700,
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
                fontWeight: 700,
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
                  padding: "9px 16px",
                  background: C.green + "22",
                  border: `1px solid ${C.green}44`,
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12, color: C.muted }}>
                  Total Amount:{" "}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    color: C.green,
                    fontSize: 14,
                  }}
                >
                  ₹{fmt(items.reduce((sum, it) => sum + +(it.amount || 0), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "records" && (
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
                  🔍
                </span>
                <input
                  placeholder="Search records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    background: "#141416",
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
                onClick={handleExportCSV}
                style={{
                  background: "#141416",
                  color: C.green,
                  border: `1px solid ${C.green}44`,
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                📥 Export CSV
              </button>
              <span style={{ fontSize: 12, color: C.muted }}>
                {filteredInwards.length} records found
              </span>
            </div>
          </div>

          {filteredInwards.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 40, color: C.muted }}>
              No material inward records found.
            </Card>
          ) : (
            filteredInwards
              .slice()
              .reverse()
              .map((r) => {
                const total = (r.items || []).reduce(
                  (s, it) => s + +(it.amount || 0),
                  0,
                );
                return (
                  <Card
                    key={r._id}
                    style={{
                      padding: "16px 20px",
                      borderLeft: `4px solid ${C.blue}`,
                      background: "#111114",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: C.blue,
                            fontFamily: "monospace",
                          }}
                        >
                          {r.inwardNo}
                        </span>
                        <div
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            background: "#064e3b",
                            color: "#10b981",
                            borderRadius: 4,
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          Verified
                        </div>
                        <span style={{ color: "#555", fontSize: 13 }}>
                          {formatDateForInput(r.inwardDate)} ·{" "}
                          <b style={{ color: "#aaa" }}>{r.vendorName}</b>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleEdit(r)}
                          style={{
                            background: "#1e293b",
                            color: C.blue,
                            border: "1px solid #334155",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => generateGRNPDF(r)}
                          style={{
                            background: "#2a1a45",
                            color: "#a855f7",
                            border: "1px solid #4c1d95",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          🖨️ PDF
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          style={{
                            background: "#450a0a",
                            color: "#ef4444",
                            border: "1px solid #7f1d1d",
                            borderRadius: 6,
                            padding: "4px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {(r.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            fontSize: 12,
                            color: "#888",
                            padding: "8px 0",
                            borderBottom: "1px solid #ffffff05",
                          }}
                        >
                          <span
                            style={{ fontWeight: 700, flex: 1, color: "#ddd" }}
                          >
                            {it.rmItem}{" "}
                            <span style={{ color: "#555", fontWeight: 400 }}>
                              · {it.itemName}
                            </span>
                          </span>
                          <span style={{ width: 120 }}>
                            Sheets:{" "}
                            <b>{it.noOfSheets ? fmt(it.noOfSheets) : "—"}</b>
                          </span>
                          <span style={{ width: 100 }}>
                            Weight: <b>{fmt(it.weight)} kg</b>
                          </span>
                          <span style={{ width: 80 }}>
                            Rate: ₹{fmt(it.rate)}
                          </span>
                          <span
                            style={{
                              color: C.green,
                              fontWeight: 800,
                              width: 110,
                              textAlign: "right",
                              fontFamily: "monospace",
                            }}
                          >
                            ₹{fmt(it.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 12,
                        borderTop: "1px solid #ffffff05",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 24,
                          fontSize: 11,
                          color: "#444",
                        }}
                      >
                        <span>
                          Invoice:{" "}
                          <b style={{ color: "#777" }}>{r.invoiceNo}</b>
                        </span>
                        <span>
                          Vehicle:{" "}
                          <b style={{ color: "#777" }}>{r.vehicleNo}</b>
                        </span>
                        <span>
                          Location:{" "}
                          <b style={{ color: "#777" }}>{r.location}</b>
                        </span>
                        <span>
                          Received by:{" "}
                          <b style={{ color: "#777" }}>{r.receivedBy}</b>
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: C.blue,
                          fontFamily: "monospace",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "#444",
                            fontWeight: 600,
                          }}
                        >
                          Total Value:{" "}
                        </span>
                        ₹{fmt(total)}
                      </div>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      )}

      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
              maxWidth: 280,
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                fontSize: 64,
                marginBottom: 16,
                animation: "bounce 0.6s ease-out",
              }}
            >
              ✓
            </div>
            <h2
              style={{
                color: C.green,
                fontSize: 18,
                fontWeight: 700,
                margin: "0 0 8px 0",
              }}
            >
              {editId ? "Updated Successfully" : "Created Successfully"}
            </h2>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              {editId
                ? "Material inward has been updated"
                : "Material inward has been created"}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
