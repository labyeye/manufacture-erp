import React, { useState, useMemo, useEffect } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { C } from "../constants/colors";
import { purchaseOrdersAPI, itemMasterAPI, priceListAPI } from "../api/auth";
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
  const [purchasePrices, setPurchasePrices] = useState([]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [showModal, setShowModal] = useState(false);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    fetchPOs();
    fetchItemMaster();
    fetchPurchasePrices();
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("po_prefill");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);

      const buildLine = (src) => {
        const isRM = src.type === "RM";
        const isCG = src.type === "CG";
        const qtyVal = isCG ? src.suggestedQty || "" : "";
        const weightVal = isRM && src.unit === "kg" ? src.suggestedQty || "" : "";
        const rateNum = +(src.lastRate || 0);
        const baseAmt = rateNum
          ? rateNum * +(isRM ? weightVal || 0 : qtyVal || 0)
          : 0;
        return {
          ...blankItem(),
          materialType: isCG ? "Consumable" : "Raw Material",
          itemName: src.itemName || "",
          productCode: src.productCode || "",
          category: src.category || "",
          subCategory: isRM ? src.subCategory || src.category || "" : "",
          gsm: isRM ? src.gsm || "" : "",
          widthMm: isRM ? src.widthMm || "" : "",
          lengthMm: isRM ? src.lengthMm || "" : "",
          size: "",
          width: "",
          length: "",
          height: "",
          hsnCode: src.hsnCode || "",
          uom: src.unit || "nos",
          unit: src.unit || "nos",
          noOfSheets: "",
          noOfReels: "",
          qty: qtyVal,
          weight: weightVal,
          rate: src.lastRate || "",
          gstRate:
            src.lastGstRate !== "" && src.lastGstRate != null
              ? src.lastGstRate
              : 18,
          amount: baseAmt ? baseAmt.toFixed(2) : "",
        };
      };

      if (p.multi && Array.isArray(p.items)) {
        const lines = p.items.map(buildLine);
        setHeader({
          ...blankHeader,
          vendorName: p.sharedVendor || "",
          vendorContact: p.sharedVendorContact || "",
        });
        setItems(lines);
        setHeaderErrors({});
        setItemErrors(lines.map(() => ({})));
        setEditingId(null);
        setShowModal(true);
        const vendorMsg = p.sharedVendor
          ? ` — vendor: ${p.sharedVendor}`
          : p.vendorMismatch
            ? " — multiple vendors in history, please pick one"
            : "";
        toast?.(
          `Combined PO prefilled with ${lines.length} item(s)${vendorMsg}`,
          "success",
        );
      } else {
        const line = buildLine(p);
        setHeader({
          ...blankHeader,
          vendorName: p.lastVendor || "",
          vendorContact: p.lastVendorContact || "",
        });
        setItems([line]);
        setHeaderErrors({});
        setItemErrors([{}]);
        setEditingId(null);
        setShowModal(true);
        const detail = p.lastPONo
          ? ` — vendor + rate from ${p.lastPONo}`
          : "";
        toast?.(
          `Prefilled from low-stock alert: ${p.itemName}${detail}`,
          "success",
        );
      }
    } catch (e) {
      console.warn("Failed to parse po_prefill:", e);
    } finally {
      sessionStorage.removeItem("po_prefill");
    }
  }, []);

  const fetchPurchasePrices = async () => {
    try {
      const data = await priceListAPI.getAll({ listType: "purchase", status: "Active" });
      setPurchasePrices(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (!deepLinkId || !purchaseOrders.length) return;
    const po = purchaseOrders.find((p) => p.poNo === deepLinkId);
    if (po) {
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
    const rfmt = (n) => Math.round(n ?? 0).toLocaleString("en-IN");
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
                  <td class="col-qty" style="white-space: nowrap;">${it.weight ? fmt(it.weight) + " kg" : it.qty ? fmt(it.qty) + " " + (it.unit || "nos") : "—"}</td>
                  <td style="white-space: nowrap;">₹${rfmt(it.rate)}</td>
                  <td style="text-align: center;">${it.usedGst}%</td>
                  <td class="col-amt" style="white-space: nowrap;">₹${rfmt(it.amount)}</td>
                  <td class="col-amt" style="white-space: nowrap;">₹${rfmt(it.rowTax)}</td>
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

          // auto-fill rate from purchase price list (vendor-specific first, then generic)
          const vendorMatch = purchasePrices.find(
            (p) => p.itemCode === masterItem.code && p.vendorName === header.vendorName
          );
          const genericMatch = purchasePrices.find(
            (p) => p.itemCode === masterItem.code && !p.vendorName
          );
          const priceEntry = vendorMatch || genericMatch;
          if (priceEntry && !it.rate) {
            it.rate = priceEntry.unitPrice;
          }

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
            if (masterItem.category) {
              it.category = masterItem.category.trim();
            } else {
              const name = it.itemName.toLowerCase();
              if (name.includes("ldpe polybag")) it.category = "LDPE Polybag";
              else if (name.includes("box") || name.includes("corrugated"))
                it.category = "Corrugated Box";
              else if (name.includes("tape")) it.category = "Tape";
              else if (name.includes("glue")) it.category = "Glue";
            }

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
      const isPaperSheet =
        isRM &&
        (it.category === "Paper Sheet" || it.category === "Paper Sheets");

      if (isPaperSheet) {
        const w = +(it.widthMm || 0);
        const l = +(it.lengthMm || 0);
        const gsm = +(it.gsm || 0);
        if (w && l && gsm) {
          const gramsPerSheet = (l * w * gsm) / 1_000_000;
          if (k === "weight" && +v) {
            const sheets = Math.round((+v * 1000) / gramsPerSheet);
            it.qty = sheets;
            it.noOfSheets = sheets;
          } else if (k === "qty" && +v) {
            const kg = Math.round((+v * gramsPerSheet) / 1000);
            it.weight = kg;
            it.noOfSheets = +v;
          } else if (
            (k === "widthMm" || k === "lengthMm" || k === "gsm") &&
            it.weight
          ) {
            const sheets = Math.round((+(it.weight) * 1000) / gramsPerSheet);
            it.qty = sheets;
            it.noOfSheets = sheets;
          }
        }
      }

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
        if (it.subCategory !== "Polycoated Blanks" && !it.widthMm) e.widthMm = true;
        if (it.subCategory !== "Polycoated Blanks" && it.category !== "Paper Reel" && !it.lengthMm) e.lengthMm = true;
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
      setShowModal(false);
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
          taxAmount: (() => {
            if (it.taxAmount && +it.taxAmount !== 0) return it.taxAmount;
            const amt = +(it.amount || 0);
            const gst = +(it.gstRate !== undefined ? it.gstRate : masterItem?.gstRate || 18);
            return amt > 0 ? ((amt * gst) / 100).toFixed(2) : 0;
          })(),
          totalWithTax: (() => {
            if (it.totalWithTax && +it.totalWithTax !== 0) return it.totalWithTax;
            const amt = +(it.amount || 0);
            const gst = +(it.gstRate !== undefined ? it.gstRate : masterItem?.gstRate || 18);
            return amt > 0 ? (amt + (amt * gst) / 100).toFixed(2) : 0;
          })(),
          noOfSheets: it.noOfSheets || "",
          noOfReels: it.noOfReels || "",
          unit: it.unit || masterItem?.unit || "nos",
          uom: it.unit || masterItem?.unit || "nos",
          remarks: it.remarks || "",
        };
      }),
    );
    setEditingId(po._id);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      await purchaseOrdersAPI.delete(deleteTarget);
      await fetchPOs();
      if (toast) toast("Purchase Order moved to trash", "success");
    } catch (error) {
      console.error("Failed to delete PO:", error);
      if (toast)
        toast(error.response?.data?.error || "Failed to delete PO", "error");
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <SectionTitle
          icon="fa-solid fa-file-invoice"
          title="Purchase Orders"
          sub="Create POs for raw materials and consumables"
        />
        {canEdit && (
          <button
            onClick={() => { setHeader(blankHeader); setItems([blankItem()]); setHeaderErrors({}); setItemErrors([{}]); setEditingId(null); setShowModal(true); }}
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
              boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            + New PO
          </button>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingId ? "Edit Purchase Order" : "New Purchase Order"}
          onClose={() => { setShowModal(false); setEditingId(null); setHeader(blankHeader); setItems([blankItem()]); setHeaderErrors({}); setItemErrors([{}]); }}
        >
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: C.white,
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
              <Field label="PO Date *">
                <DatePicker
                  value={header.poDate}
                  onChange={(v) => setH("poDate", v)}
                  style={EH("poDate")}
                />
                {EHMsg("poDate")}
              </Field>
              <Field label="Delivery Date *">
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
                    // Re-lookup rates for items already entered when vendor changes
                    setItems((prev) =>
                      prev.map((it) => {
                        if (!it.productCode) return it;
                        const vendorMatch = purchasePrices.find(
                          (p) => p.itemCode === it.productCode && p.vendorName === v
                        );
                        const genericMatch = purchasePrices.find(
                          (p) => p.itemCode === it.productCode && !p.vendorName
                        );
                        const priceEntry = vendorMatch || genericMatch;
                        if (priceEntry) return { ...it, rate: priceEntry.unitPrice };
                        return it;
                      })
                    );
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
            <h3 style={{ fontSize: 14, fontWeight: 500, color: C.white }}>
              Items ({items.length})
            </h3>
            {canEdit && (
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
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                + Add Item
              </button>
            )}
          </div>

          {items.map((it, idx) => (
            <Card
              key={it._id}
              style={{ marginBottom: 12, }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span style={{ fontWeight: 500, color: C.white, fontSize: 13 }}>
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
                      {it.productCode ? (
                        <input
                          readOnly
                          value={it.category}
                          style={{ background: "rgba(255,255,255,0.04)", color: "#aaa", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}
                        />
                      ) : (
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
                      )}
                      {EIMsg(idx, "category")}
                    </Field>
                    <Field label="Paper Type *">
                      {it.productCode ? (
                        <input
                          readOnly
                          value={it.subCategory}
                          style={{ background: "rgba(255,255,255,0.04)", color: "#aaa", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}
                        />
                      ) : (
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
                      )}
                      {EIMsg(idx, "subCategory")}
                    </Field>
                    {it.subCategory !== "Polycoated Blanks" && (
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
                    )}

                    {it.subCategory !== "Polycoated Blanks" &&
                      (it.category === "Paper Sheets" ||
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
                    {it.subCategory !== "Polycoated Blanks" &&
                      (it.category === "Paper Sheets" ||
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
                background: C.white + "22",
                color: C.white,
                border: `1px solid ${C.white}44`,
                borderRadius: 6,
                padding: "9px 20px",
                fontWeight: 500,
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
              color={C.white}
              onClick={submit}
            />
            <button
                onClick={() => { setShowModal(false); setEditingId(null); setHeader(blankHeader); setItems([blankItem()]); setHeaderErrors({}); setItemErrors([{}]); }}
                style={{
                  background: C.muted + "22",
                  color: C.muted,
                  border: `1px solid ${C.muted}44`,
                  borderRadius: 6,
                  padding: "9px 20px",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
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
                  <span>Basic Amount:</span>
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
                  <span>Tax Amount:</span>
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
                  <span>Total:</span>
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
        </Modal>
      )}

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

          {(() => {
            const filteredPOs = (purchaseOrders || []).slice().reverse().filter(r => {
              if (!drDateFrom && !drDateTo) return true;
              const d = (r.poDate || "").slice(0, 10);
              if (drDateFrom && d < drDateFrom) return false;
              if (drDateTo && d > drDateTo) return false;
              return true;
            });
            const totalValue = filteredPOs.reduce((s, r) => s + (r.items || []).reduce((ss, it) => ss + +(it.amount || 0), 0), 0);
            const openCount = filteredPOs.filter(r => !r.status || r.status === "Open").length;
            const receivedCount = filteredPOs.filter(r => r.status === "Received").length;
            const statCards = [
              { label: "Total POs", value: filteredPOs.length, icon: "fa-solid fa-file-invoice", },
              { label: "Open", value: openCount, icon: "fa-solid fa-clock", },
              { label: "Received", value: receivedCount, icon: "fa-solid fa-circle-check",},
              { label: "Total Value", value: `₹${fmt(totalValue)}`, icon: "fa-solid fa-indian-rupee-sign", },
            ];
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                  {statCards.map(({ label, value, icon, color }) => (
                    <div key={label} style={{ padding: "16px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, borderLeft: `3px solid ${color}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 19, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
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
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {filteredPOs.length === 0 ? (
                  <Card style={{ textAlign: "center", padding: 40, color: C.muted }}>No purchase orders found.</Card>
                ) : (
                  <div style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          {["PO No", "Date", "Vendor", "Items", "Delivery", "Total", "Status", "Actions"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPOs.map((r, i) => {
                          const total = (r.items || []).reduce((s, it) => s + +(it.amount || 0), 0);
                          const vendorDisplayName = typeof r.vendor === "object" ? r.vendor?.name : (r.vendor || r.vendorName || "—");

                          return (
                            <tr key={r._id} data-record-id={r.poNo} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: r.poNo === highlightId ? `${C.accent}11` : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", transition: "background 0.2s" }}>
                              <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#60a5fa", whiteSpace: "nowrap" }}>{r.poNo}</td>
                              <td style={{ padding: "12px 14px", color: C.muted, whiteSpace: "nowrap" }}>{(r.poDate || "").slice(0, 10)}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 500 }}>{vendorDisplayName}</td>
                              <td style={{ padding: "12px 14px", color: C.muted }}>{(r.items || []).length} item{(r.items || []).length !== 1 ? "s" : ""}</td>
                              <td style={{ padding: "12px 14px", color: C.muted, whiteSpace: "nowrap" }}>{(r.deliveryDate || "—").slice(0, 10)}</td>
                              <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>₹{fmt(total)}</td>
                              <td style={{ padding: "12px 14px" }}>
                                <span style={{ padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: r.status === "Received" ? "#06422233" : "#451a0333", color: r.status === "Received" ? "#10b981" : "#f59e0b", border: `1px solid ${r.status === "Received" ? "#065f4622" : "#78350f22"}` }}>{r.status || "Open"}</span>
                              </td>
                              <td style={{ padding: "12px 14px" }}>
                                <div style={{ display: "flex", gap: 5 }}>
                                  {canEdit && <button onClick={() => handleEdit(r)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>Edit</button>}
                                  <button onClick={() => generatePOPDF(r)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>PDF</button>
                                  {canEdit && <button onClick={() => setDeleteTarget(r._id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>Del</button>}
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
      message="This purchase order will be moved to trash. You can restore it within 7 days."
      confirmText="Move to Trash"
      cancelText="Cancel"
      type="danger"
    />
    </>
  );
}
