import React, { useState, useMemo, useEffect } from "react";
import { C } from "../constants/colors";
import { purchaseOrdersAPI, itemMasterAPI } from "../api/auth";
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

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const computeRMItemName = (it) => {
  if (it.category === "Paper Reel") {
    return [
      it.subCategory,
      "Paper Reel",
      it.gsm ? it.gsm + "gsm" : "",
      it.widthMm ? it.widthMm + "mm" : "",
    ]
      .filter(Boolean)
      .join(" ");
  } else if (it.category === "Paper Sheets" || it.category === "Paper Sheet") {
    return [
      it.subCategory,
      "Sheet",
      it.gsm ? it.gsm + "gsm" : "",
      it.widthMm && it.lengthMm
        ? it.widthMm + "x" + it.lengthMm + "mm"
        : it.widthMm
          ? it.widthMm + "mm"
          : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return it.itemName || "";
};

export default function PurchaseOrders({
  purchaseOrders = [],
  setPurchaseOrders,
  vendorMaster = [],
  categoryMaster = {},
  sizeMaster = {},
  toast,
  editableTabs = [],
  deepLinkId,
  onDeepLinkConsumed,
}) {
  const canEdit = editableTabs.includes("purchase");
  const blankHeader = {
    poDate: today(),
    deliveryDate: "",
    vendorName: "",
    vendorContact: "",
    poStatus: "Open",
    remarks: "",
    poNumber: "",
  };
  const blankItem = () => ({
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
    qty: "",
    rate: "",
    amount: "",
    gstRate: 18,
    hsnCode: "",
    itemName: "",
    size: "",
    width: "",
    length: "",
    height: "",
    uom: "nos",
    unit: "nos",
    remarks: "",
  });

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const [itemMasterItems, setItemMasterItems] = useState([]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    fetchPOs();
    fetchItemMaster();
  }, []);

  useEffect(() => {
    if (!deepLinkId || !purchaseOrders.length) return;
    const po = purchaseOrders.find((p) => p.poNo === deepLinkId);
    if (po) {
      setView("records");
      setHighlightId(deepLinkId);
      onDeepLinkConsumed?.();
    }
  }, [deepLinkId, purchaseOrders]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-record-id="${highlightId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const clear = setTimeout(() => setHighlightId(null), 3500);
    return () => { clearTimeout(timer); clearTimeout(clear); };
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
      setLoading(true);
      const data = await purchaseOrdersAPI.getAll();
      setPurchaseOrders(data.purchaseOrders || []);
    } catch (error) {
      console.error("Failed to fetch POs:", error);
      toast("Failed to load purchase orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const rmItems = useMemo(() => {
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );
    const fromMaster =
      rmCat && rmCat.subTypes ? Object.keys(rmCat.subTypes) : [];

    return [...new Set(fromMaster)].map((k) => k.trim());
  }, [categoryMaster]);

  const consumableCategories = useMemo(() => {
    const consCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "consumable",
    );
    const fromMaster =
      consCat && consCat.subTypes ? Object.keys(consCat.subTypes) : [];
    return [...new Set(fromMaster)];
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

  const setH = (k, v) => {
    setHeader((f) => ({ ...f, [k]: v }));
    setHeaderErrors((e) => ({ ...e, [k]: false }));
  };

  const generatePOPDF = (po) => {
    const itemsArr = (po.items || []).map((it) => {
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
          <title>PO-${po.poNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px 30px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; font-weight: 500; }
            .header a { color: #1e40af; text-decoration: none; }
            
            .doc-title { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; }
            .doc-title h2 { margin: 0; font-size: 18px; font-weight: 700; }
            .status { color: #1e40af; font-weight: 700; font-size: 12px; }
            
            .hr { height: 1px; background: #e2e8f0; margin: 10px 0; border: none; }
            .po-no { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 5px 0; }
            
            .section-label { font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; margin-top: 20px; }
            
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
            .info-item label { display: block; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
            .info-item span { font-size: 11px; font-weight: 600; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; white-space: nowrap; }
            td { border: 1px solid #e2e8f0; padding: 4px 6px; font-size: 9px; color: #1e293b; line-height: 1.2; word-wrap: break-word; }
            .col-qty { text-align: center; }
            .col-amt { text-align: right; font-weight: 700; }
            
            .total-row { display: flex; justify-content: flex-end; margin-top: 15px; }
            .total-box { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: #1a1a1a; }
            .total-box label { font-size: 14px; color: #64748b; font-weight: 700; }
            
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p style="text-align: right; font-size: 9px; margin-bottom: 20px;">${new Date().toLocaleString()}</p>
            <h1>AARAY PACKAGING PRIVATE LIMITED</h1>
            <p>Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</p>
            <p>Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</p>
            <p>
              <a href="https://www.rapackaging.in">www.rapackaging.in</a> | 
              <a href="mailto:orders@rapackaging.in">orders@rapackaging.in</a> | 
              +91 9311802540
            </p>
          </div>

          <div class="doc-title">
            <h2>Purchase Order</h2>
            <div class="status">Status<br><span style="color:${po.status === "Received" ? "#10b981" : "#1e40af"}">${po.status || "Open"}</span></div>
          </div>
          <div class="po-no">${po.poNo}</div>
          <div class="hr"></div>

          <div class="section-label">Order Details</div>
          <div class="info-grid">
            <div class="info-item">
              <label>PO Date</label>
              <span>${fd(po.poDate)}</span>
            </div>
            <div class="info-item">
              <label>Delivery Date</label>
              <span>${fd(po.deliveryDate)}</span>
            </div>
            <div class="info-item">
              <label>Vendor Name</label>
              <span>${po.vendor}</span>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <label>Vendor Contact</label>
              <span>${po.vendorContact || "—"}</span>
            </div>
          </div>

          <div class="section-label">Items</div>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Item Name</th>
                <th style="width: 10%;">RM Item</th>
                <th style="width: 10%;">Paper Type</th>
                <th style="width: 5%;">GSM</th>
                <th style="width: 8%;">Size</th>
                <th style="width: 8%;">Sheets</th>
                <th style="width: 8%;" class="col-qty">Weight</th>
                <th style="width: 8%;">Rate</th>
                <th style="width: 5%;">GST(%)</th>
                <th style="width: 8%;" class="col-amt">Taxable</th>
                <th style="width: 8%;" class="col-amt">GST</th>
              </tr>
            </thead>
            <tbody>
              ${itemsArr
                .map(
                  (it) => `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${it.itemName}</div>
                    <div style="font-size: 8px; color: #64748b;">${it.productCode || ""}</div>
                    ${it.remarks ? `<div style="font-size: 8px; color: #1e40af; font-style: italic; margin-top: 2px;">Note: ${it.remarks}</div>` : ""}
                  </td>
                  <td style="white-space: nowrap;">${it.category || "—"}</td>
                  <td style="white-space: nowrap;">${it.paperType || "—"}</td>
                  <td>${it.gsm ? it.gsm + "gsm" : "—"}</td>
                  <td style="white-space: nowrap;">${it.sheetSize || (it.widthMm ? it.widthMm + (it.lengthMm ? "x" + it.lengthMm : "") + "mm" : "—")}</td>
                  <td style="text-align: center;">${it.noOfSheets || (it.category?.includes("Sheet") ? fmt(it.qty) : "—") || "—"}</td>
                  <td class="col-qty" style="white-space: nowrap;">${fmt(it.weight || 0)} kg</td>
                  <td style="white-space: nowrap;">₹${fmt(it.rate)}</td>
                  <td style="text-align: center;">${it.usedGst}%</td>
                  <td class="col-amt" style="white-space: nowrap;">₹${fmt(it.amount)}</td>
                  <td class="col-amt" style="white-space: nowrap;">₹${fmt(it.rowTax)}</td>
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
                <span>₹${fmt(subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <label>Total GST:</label>
                <span>₹${fmt(totalTax)}</span>
              </div>
              <div class="hr"></div>
              <div class="total-box">
                <label>Net Total:</label>
                ₹${fmt(total)}
              </div>
            </div>
          </div>

          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
             <div style="border-top: 1px solid #ccc; width: 150px; text-align: center; padding-top: 5px; font-size: 11px; color: #666;">Authorized Signatory</div>
             <div style="border-top: 1px solid #ccc; width: 150px; text-align: center; padding-top: 5px; font-size: 11px; color: #666;">Vendor Confirmation</div>
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
    document.body.appendChild(iframe);

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    };
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

        const masterItem = itemMasterItems.find(
          (x) =>
            (x.code || "").trim().toLowerCase() === code.trim().toLowerCase(),
        );

        if (masterItem) {
          it.itemName = (masterItem.name || "").trim();
          it.materialType = masterItem.type || "Raw Material";
          it.productCode = masterItem.code;

          if (it.materialType === "Raw Material") {
            it.category = (masterItem.category || "").trim();
            it.subCategory = (masterItem.subCategory || "").trim();
            it.gsm = masterItem.gsm || "";
            it.widthMm = masterItem.width || "";
            it.lengthMm = masterItem.length || "";
            it.gstRate = masterItem.gstRate || 18;
            it.hsnCode = masterItem.hsnCode || "";

            if (!it.gsm) {
              const gsmMatch = it.itemName.match(/(\d+)[\s-]*gsm/i);
              if (gsmMatch) it.gsm = gsmMatch[1];
            }
            if (!it.widthMm) {
              const dimMatch = it.itemName.match(
                /(\d+)[\s-]*x[\s-]*(\d+)[\s-]*mm/i,
              );
              const widthMatch = it.itemName.match(/(\d+)[\s-]*mm/i);
              if (dimMatch) {
                it.widthMm = dimMatch[1];
                it.lengthMm = dimMatch[2];
              } else if (widthMatch) {
                it.widthMm = widthMatch[1];
              }
            }
          } else if (it.materialType === "Consumable") {
            const name = it.itemName.toLowerCase();
            if (name.includes("ldpe polybag")) it.category = "LDPE Polybag";
            else if (name.includes("box") || name.includes("corrugated"))
              it.category = "Corrugated Box";
            else if (name.includes("tape")) it.category = "Tape";
            else if (name.includes("glue")) it.category = "Glue";

            const consDimMatch = it.itemName.match(
              /(\d+)[\s-]*x[\s-]*(\d+)(?:[\s-]*x[\s-]*(\d+))?[\s-]*(\w+)/i,
            );
            if (consDimMatch) {
              it.width = consDimMatch[1];
              if (consDimMatch[3]) {
                it.length = consDimMatch[2];
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
        it.widthMm = "";
        it.lengthMm = "";
        it.gsm = "";
        it.noOfSheets = "";
        it.noOfReels = "";
        it.weight = "";
        it.qty = "";
        it.productCode = "";
      }

      if (k === "category") {
        it.subCategory = "";
        it.itemName = "";
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

      const amt = Number(it.amount || 0);
      const gst = Number(it.gstRate || 0);
      it.taxAmount = ((amt * gst) / 100).toFixed(2);
      it.totalWithTax = (amt + Number(it.taxAmount)).toFixed(2);

      it.itemName =
        isRM && !it.productCode ? computeRMItemName(it) : it.itemName;

      if (it.materialType === "Consumable") {
        const uom = it.uom || "nos";
        if (it.category === "Corrugated Box") {
          const dims = [it.width, it.length, it.height].filter(Boolean);
          const sizePart = dims.length ? dims.join("x") : it.size || "";
          it.itemName = `${it.category} ${sizePart}${uom}`;
        } else if (it.category === "LDPE Polybag") {
          const dims = [it.width, it.height].filter(Boolean);
          const sizePart = dims.length ? dims.join("x") : it.size || "";
          it.itemName = `${it.category} ${sizePart}${uom}`;
        } else if (it.category) {
          const sizePart = it.size ? " " + it.size : "";
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
  const EIMsg = (idx, k) => {
    if ((itemErrors[idx] || {})[k]) {
      const msg = k === "productCode" ? "Required / Invalid Code" : "Required";
      return (
        <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>{msg}</div>
      );
    }
    return null;
  };

  const addItem = () => {
    setItems((prev) => [...prev, blankItem()]);
    setItemErrors((prev) => [...prev, {}]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    const he = {};
    if (!header.poDate) he.poDate = true;
    if (!header.deliveryDate) he.deliveryDate = true;
    if (!header.vendorName) he.vendorName = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      const isRM = it.materialType === "Raw Material" || !it.materialType;

      const masterItem = itemMasterItems.find(
        (x) =>
          (x.code || "").trim().toLowerCase() ===
          (it.productCode || "").trim().toLowerCase(),
      );

      if (!it.productCode || !masterItem) {
        e.productCode = true;
      }

      if (isRM) {
        if (!it.category) e.category = true;
        if (!it.subCategory) e.subCategory = true;
        if (!it.widthMm) e.widthMm = true;
        if (it.category !== "Paper Reel" && !it.lengthMm) e.lengthMm = true;
        if (!it.gsm) e.gsm = true;
        if (!it.weight) e.weight = true;
      } else {
        if (!it.qty) e.qty = true;
      }
      if (!it.rate) e.rate = true;
      return e;
    });
    setItemErrors(allItemErrors);

    if (
      Object.keys(he).length > 0 ||
      allItemErrors.some((e) => Object.keys(e).length > 0)
    ) {
      toast("Please fill all required fields correctly", "error");
      return;
    }

    try {
      setLoading(true);
      let result;

      const poData = {
        poNo: header.poNumber,
        poDate: header.poDate,
        vendor: header.vendorName,
        items: items.map((it) => {
          const isRM = it.materialType === "Raw Material" || !it.materialType;
          return {
            itemName: it.itemName,
            productCode: it.productCode,
            category: it.category || it.materialType,
            paperType: it.subCategory,
            gsm: it.gsm,
            width: it.widthMm || it.width,
            length: it.lengthMm || it.length,
            height: it.height,
            sheetSize:
              it.sheetSize ||
              it.size ||
              `${it.widthMm}${it.lengthMm ? "x" + it.lengthMm : ""}mm`,
            unit: isRM ? "kg" : it.unit || "nos",
            qty: it.qty || it.weight || 0,
            weight: it.weight || null,
            noOfSheets: it.noOfSheets ? Number(it.noOfSheets) : null,
            rate: it.rate,
            gstRate: it.gstRate,
            hsnCode: it.hsnCode,
            taxAmount: Number(it.taxAmount || 0),
            amount: Number(it.amount || 0),
            remarks: it.remarks,
          };
        }),
        deliveryDate: header.deliveryDate,
        remarks: header.remarks,
      };

      if (editingId) {
        result = await purchaseOrdersAPI.update(editingId, poData);
        toast?.("Purchase Order updated successfully!", "success");
      } else {
        result = await purchaseOrdersAPI.create(poData);
        toast?.(
          `Purchase Order ${result.purchaseOrder.poNo} created successfully!`,
          "success",
        );
      }

      setEditingId(null);
      fetchPOs();
      setHeader(blankHeader);
      setItems([blankItem()]);
      setHeaderErrors({});
      setItemErrors([{}]);
      setView("records");
    } catch (error) {
      console.error("Save error:", error);
      toast(error.response?.data?.error || "Failed to save PO", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (po) => {
    const vendorName =
      typeof po.vendor === "object" ? po.vendor.name : po.vendor;

    const formatDateForInput = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    };

    setHeader({
      poNumber: po.poNo,
      poDate: formatDateForInput(po.poDate),
      deliveryDate: formatDateForInput(po.deliveryDate),
      vendorName: vendorName,
      vendorContact: po.vendorContact || "",
      poStatus: po.status || "Open",
      remarks: po.remarks || "",
    });

    setItems(
      (po.items || []).map((it) => {
        const masterItem = itemMasterItems.find(
          (x) =>
            (x.code || "").trim().toLowerCase() ===
            (it.productCode || "").trim().toLowerCase(),
        );

        return {
          _id: uid(),
          materialType:
            it.category === "Machine Spare" || it.category === "Consumable"
              ? it.category
              : masterItem?.type || "Raw Material",
          itemName: it.itemName || masterItem?.name || "",
          productCode: it.productCode || "",
          category: it.category || masterItem?.category || "",
          subCategory: it.paperType || masterItem?.subCategory || "",
          gsm: it.gsm || masterItem?.gsm || "",
          size: it.sheetSize || masterItem?.size || "",
          widthMm: it.width || masterItem?.width || "",
          lengthMm: it.length || masterItem?.length || "",
          width: it.width || masterItem?.width || "",
          length: it.length || masterItem?.length || "",
          height: it.height || masterItem?.height || "",
          qty: it.qty || "",
          weight: it.weight || "",
          rate: it.rate || "",
          amount: it.amount || "",
          gstRate:
            it.gstRate !== undefined ? it.gstRate : masterItem?.gstRate || 18,
          hsnCode: it.hsnCode || masterItem?.hsnCode || "",
          taxAmount: it.taxAmount || 0,
          noOfSheets: it.noOfSheets || "",
          noOfReels: it.noOfReels || "",
          unit: it.unit || masterItem?.unit || "nos",
          uom: it.unit || masterItem?.unit || "nos",
          remarks: it.remarks || "",
        };
      }),
    );
    setEditingId(po._id);
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this purchase order?")) {
      try {
        setLoading(true);
        await purchaseOrdersAPI.delete(id);
        await fetchPOs();
        if (toast) toast("Purchase Order deleted successfully", "success");
      } catch (error) {
        console.error("Failed to delete PO:", error);
        if (toast)
          toast(error.response?.data?.error || "Failed to delete PO", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="📋"
        title="Purchase Orders"
        sub="Create POs for raw materials and consumables"
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["form", "📝 New PO"],
          ["records", `📋 POs (${purchaseOrders.length})`],
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
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.blue,
                marginBottom: 16,
              }}
            >
              PO Details
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <Field label="PO No">
                <input
                  readOnly
                  placeholder="— Auto-generated —"
                  value={header.poNumber}
                  style={{ color: C.muted, background: "transparent" }}
                />
              </Field>
              <Field label="PO Date 📅 *">
                <DatePicker
                  value={header.poDate}
                  onChange={(v) => setH("poDate", v)}
                  style={EH("poDate")}
                />
                {EHMsg("poDate")}
              </Field>
              <Field label="Delivery Date 📅 *">
                <DatePicker
                  value={header.deliveryDate}
                  onChange={(v) => setH("deliveryDate", v)}
                  style={EH("deliveryDate")}
                />
                {EHMsg("deliveryDate")}
              </Field>
              <Field label="Vendor Name*">
                <AutocompleteInput
                  value={header.vendorName}
                  onChange={(v) => {
                    setH("vendorName", v);
                    const vendor = (vendorMaster || []).find(
                      (vm) => vm.name === v,
                    );
                    if (vendor) {
                      setH("vendorContact", vendor.phone || vendor.email || "");
                    }
                  }}
                  suggestions={(vendorMaster || []).map((v) => v.name)}
                  placeholder="Type to search vendors..."
                  inputStyle={EH("vendorName")}
                />
                {EHMsg("vendorName")}
              </Field>
              <Field label="Vendor Contact">
                <input
                  type="tel"
                  placeholder="Phone / Email"
                  value={header.vendorContact}
                  onChange={(e) => setH("vendorContact", e.target.value)}
                />
              </Field>
              <Field label="Status">
                <select
                  value={header.poStatus}
                  onChange={(e) => setH("poStatus", e.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Remarks">
                <input
                  placeholder="PO notes..."
                  value={header.remarks}
                  onChange={(e) => setH("remarks", e.target.value)}
                />
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
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>
              Items ({items.length})
            </h3>
            {canEdit && (
              <button
                onClick={addItem}
                style={{
                  background: C.blue,
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
            )}
          </div>

          {items.map((it, idx) => (
            <Card
              key={it._id}
              style={{ marginBottom: 12, borderLeft: `3px solid ${C.blue}` }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span style={{ fontWeight: 700, color: C.blue, fontSize: 13 }}>
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
                <Field label="Product Code *">
                  <AutocompleteInput
                    value={it.productCode}
                    onChange={(v) => setItem(idx, "productCode", v)}
                    suggestions={sortedItemMasterItems.map(
                      (item) => `${item.code} — ${item.name}`,
                    )}
                    placeholder="Type or select code"
                    inputStyle={EI(idx, "productCode")}
                  />
                  {EIMsg(idx, "productCode")}
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
                    <Field label="Width (mm) *">
                      <input
                        type="number"
                        placeholder="700"
                        value={it.widthMm}
                        onChange={(e) =>
                          setItem(idx, "widthMm", e.target.value)
                        }
                        style={EI(idx, "widthMm")}
                      />
                      {EIMsg(idx, "widthMm")}
                    </Field>

                    {(it.category === "Paper Sheets" ||
                      it.category === "Paper Sheet") && (
                      <Field label="Length (mm) *">
                        <input
                          type="number"
                          placeholder="Length"
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
                    {(it.category === "Paper Sheets" ||
                      it.category === "Paper Sheet") && (
                      <Field label="No. of Sheets *">
                        <input
                          type="number"
                          placeholder="sheets count"
                          value={it.qty}
                          onChange={(e) => setItem(idx, "qty", e.target.value)}
                          style={EI(idx, "qty")}
                        />
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
                        <div style={{ gridColumn: "1 / -1", height: 1 }} />
                        <Field label="UOM (for Name)">
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
                                value={it.width || ""}
                                onChange={(e) =>
                                  setItem(idx, "width", e.target.value)
                                }
                                style={EI(idx, "width")}
                              />
                            </Field>
                            <Field label="Length *">
                              <input
                                type="number"
                                placeholder="Length"
                                value={it.length || ""}
                                onChange={(e) =>
                                  setItem(idx, "length", e.target.value)
                                }
                                style={EI(idx, "length")}
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
                          </>
                        )}
                        {it.category === "LDPE Polybag" && (
                          <>
                            <Field label="Width *">
                              <input
                                type="number"
                                placeholder="Width"
                                value={it.width || ""}
                                onChange={(e) =>
                                  setItem(idx, "width", e.target.value)
                                }
                                style={EI(idx, "width")}
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
                        <div style={{ gridColumn: "1 / -1", height: 1 }} />

                        <Field label="Quantity *">
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
                        <Field label="Unit (for Qty) *">
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
                        <Field label="Rate *">
                          <input
                            type="number"
                            placeholder="Rate"
                            value={it.rate}
                            onChange={(e) =>
                              setItem(idx, "rate", e.target.value)
                            }
                            style={EI(idx, "rate")}
                          />
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field label="UOM (for Name)">
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
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="inch">inch</option>
                          </select>
                        </Field>
                        <Field label="Quantity *">
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
                        <Field label="Unit (for Qty) *">
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
                        <Field label="Rate *">
                          <input
                            type="number"
                            placeholder="Rate"
                            value={it.rate}
                            onChange={(e) =>
                              setItem(idx, "rate", e.target.value)
                            }
                            style={EI(idx, "rate")}
                          />
                        </Field>
                        <div style={{ gridColumn: "span 1" }} />
                      </>
                    )}
                  </>
                )}
                {it.materialType !== "Consumable" && (
                  <Field
                    label={`Rate (₹/${it.materialType === "Raw Material" || !it.materialType ? "kg" : it.uom || "unit"}) *`}
                  >
                    <input
                      type="number"
                      placeholder="Rate per unit"
                      value={it.rate || ""}
                      onChange={(e) => setItem(idx, "rate", e.target.value)}
                      style={EI(idx, "rate")}
                    />
                    {EIMsg(idx, "rate")}
                  </Field>
                )}
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
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
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
                <Field label="Item Remarks" style={{ gridColumn: "span 2" }}>
                  <input
                    placeholder="Specification/Instructions for this item..."
                    value={it.remarks || ""}
                    onChange={(e) => setItem(idx, "remarks", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Item Name">
                <input
                  type="text"
                  placeholder="Item name"
                  value={it.itemName}
                  readOnly
                  style={{ background: "#ffffff11", color: C.muted }}
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
                background: C.blue + "22",
                color: C.blue,
                border: `1px solid ${C.blue}44`,
                borderRadius: 6,
                padding: "9px 20px",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              + Add Another Item
            </button>
            <SubmitBtn
              label={
                editingId
                  ? `Update PO (${items.length} item${items.length > 1 ? "s" : ""})`
                  : `Create PO (${items.length} item${items.length > 1 ? "s" : ""})`
              }
              color={C.blue}
              onClick={submit}
            />
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setHeader(blankHeader);
                  setItems([blankItem()]);
                  setHeaderErrors({});
                  setItemErrors([{}]);
                }}
                style={{
                  background: C.muted + "22",
                  color: C.muted,
                  border: `1px solid ${C.muted}44`,
                  borderRadius: 6,
                  padding: "9px 20px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: C.muted,
                  }}
                >
                  <span>Subtotal:</span>
                  <span>
                    ₹
                    {fmt(items.reduce((sum, it) => sum + +(it.amount || 0), 0))}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: C.muted,
                  }}
                >
                  <span>Total GST:</span>
                  <span>
                    ₹
                    {fmt(
                      items.reduce((sum, it) => sum + +(it.taxAmount || 0), 0),
                    )}
                  </span>
                </div>
                <div
                  style={{
                    height: 1,
                    background: C.green + "22",
                    margin: "4px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 800,
                    color: C.green,
                    fontSize: 15,
                  }}
                >
                  <span>Net Total:</span>
                  <span>
                    ₹
                    {fmt(
                      items.reduce(
                        (sum, it) => sum + +(it.totalWithTax || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
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
              marginBottom: 4,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Purchase Order History
            </h3>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <DateRangeFilter
                dateFrom={drDateFrom}
                setDateFrom={setDrDateFrom}
                dateTo={drDateTo}
                setDateTo={setDrDateTo}
              />
              <span style={{ fontSize: 12, color: C.muted }}>
                {purchaseOrders.length} records
              </span>
            </div>
          </div>

          {purchaseOrders.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 40, color: C.muted }}>
              No purchase orders found.
            </Card>
          ) : (
            (purchaseOrders || [])
              .slice()
              .reverse()
              .map((r) => {
                const total = (r.items || []).reduce(
                  (s, it) => s + +(it.amount || 0),
                  0,
                );
                const vendorDisplayName = r.vendorName || "Unknown Vendor";

                return (
                  <Card
                    key={r._id}
                    data-record-id={r.poNo}
                    style={{
                      padding: "16px 20px",
                      borderLeft: `4px solid ${r.poNo === highlightId ? C.accent : C.blue}`,
                      background: r.poNo === highlightId ? `${C.accent}11` : "#161b22",
                      boxShadow: r.poNo === highlightId ? `0 0 0 2px ${C.accent}66` : undefined,
                      transition: "all 0.4s ease",
                    }}
                  >
                    {}
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
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: C.blue,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {r.poNo}
                        </span>
                        <span style={{ color: C.muted, fontSize: 13 }}>
                          {vendorDisplayName} · {r.poDate}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div
                          style={{
                            background:
                              r.status === "Received" ? "#064e3b" : "#451a03",
                            color:
                              r.status === "Received" ? "#10b981" : "#f59e0b",
                            border: `1px solid ${r.status === "Received" ? "#065f46" : "#78350f"}`,
                            borderRadius: 6,
                            padding: "4px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {r.status || "Open"}
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(r)}
                            style={{
                              background: "#1e293b",
                              color: C.blue,
                              border: "1px solid #334155",
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
                            ✏️ Edit
                          </button>
                        )}
                        <button
                          onClick={() => generatePOPDF(r)}
                          style={{
                            background: "#451a1a",
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
                          🖨️ PDF
                        </button>
                        {canEdit && (
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
                        )}
                      </div>
                    </div>

                    {}
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
                            fontSize: 13,
                            color: "#e2e8f0",
                          }}
                        >
                          <span style={{ fontWeight: 700, flex: 1 }}>
                            {it.itemName}
                          </span>
                          <span style={{ color: C.muted }}>
                            Qty:{" "}
                            <b style={{ color: "#fff" }}>
                              {it.weight || it.qty}{" "}
                              {it.uom ||
                                (it.materialType === "Raw Material"
                                  ? "kg"
                                  : "kg")}
                            </b>
                          </span>
                          <span style={{ color: C.muted }}>
                            Rate: ₹{it.rate}
                          </span>
                          <span
                            style={{
                              color: C.green,
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              width: 100,
                              textAlign: "right",
                            }}
                          >
                            ₹{fmt(it.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        paddingTop: 12,
                        borderTop: "1px solid #33415544",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 20,
                          color: C.muted,
                          fontSize: 11,
                        }}
                      >
                        <span>
                          Delivery:{" "}
                          <span style={{ color: "#94a3b8" }}>
                            {r.deliveryDate || "—"}
                          </span>
                        </span>
                        <span>
                          Contact:{" "}
                          <span style={{ color: "#94a3b8" }}>
                            {r.vendorContact || "—"}
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: C.blue,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: C.muted,
                            fontWeight: 400,
                          }}
                        >
                          Total:{" "}
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
    </div>
  );
}
