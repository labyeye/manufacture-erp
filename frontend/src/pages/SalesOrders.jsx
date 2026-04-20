import React, { useState, useEffect, useMemo } from "react";
import { C } from "../constants/colors";
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
import {
  salesOrdersAPI,
  companyMasterAPI,
  usersAPI,
  categoryMasterAPI,
} from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "normal",
  color: C.green || "#4ade80",
  textTransform: "uppercase",
  marginBottom: 14,
};

export default function SalesOrders(props) {
  const {
    sizeMaster = {},
    toast,
    categoryMaster = {},
    itemMasterFG = [],
    refreshData,
    companyMaster = [],
    session,
  } = props;
  const isClient = session?.role === "Client";
  const [salesOrders, setSalesOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyCategories, setCompanyCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const today_val = today();

  const fgItems = useMemo(() => {
    return (itemMasterFG || []).filter(
      (it) => it.type === "Finished Good" || it.type === "Finished Goods",
    );
  }, [itemMasterFG]);

  const sortedFGItems = useMemo(() => {
    return [...fgItems].sort((a, b) =>
      (a.code || "").localeCompare(b.code || ""),
    );
  }, [fgItems]);

  const fgCategories = useMemo(() => {
    const fgDoc = (categoryMaster || []).find(
      (c) =>
        c.type === "Finished Good" ||
        c.type === "Finished Goods" ||
        c.type === "Finished Goods",
    );
    return fgDoc && fgDoc.subTypes ? Object.keys(fgDoc.subTypes) : [];
  }, [categoryMaster]);

  const subTypeMap = useMemo(() => {
    const res = {};
    (categoryMaster || []).forEach((c) => {
      if (c.subTypes) Object.assign(res, c.subTypes);
    });
    return res;
  }, [categoryMaster]);

  const blankHeader = {
    orderDate: today_val,
    deliveryDate: "",
    salesPerson: "",
    companyCategory: "",
    companyName: "",
    clientContact: "",
    remarks: "",
    status: "Open",
  };

  const blankItem = () => ({
    _id: uid(),
    productCode: "",
    itemCategory: "",
    size: "",
    variant: "",
    width: "",
    length: "",
    height: "",
    gussett: "",
    uom: "inch",
    qtyUnit: "pcs",
    orderQty: "",
    price: "",
    amount: "",
    gstRate: 18,
    hsnCode: "",
    taxAmount: "",
    totalWithTax: "",
    itemName: "",
    gsm: "",
    companyName: "",
    remarks: "",
  });

  const CATEGORY_CONFIG = {
    "Cake Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
    "Pastry Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
    "Pizza Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
    "Corrugated Box": { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
    Box: { layout: "3D", f1: "WIDTH", f2: "LENGTH", f3: "HEIGHT" },
    "Paper Bag with Handle": {
      layout: "3D",
      f1: "WIDTH",
      f2: "GUSSETT",
      f3: "HEIGHT",
    },
    "Paper Bag without Handle": {
      layout: "3D",
      f1: "WIDTH",
      f2: "GUSSETT",
      f3: "HEIGHT",
    },
    "Paper Bag Manual": {
      layout: "3D",
      f1: "WIDTH",
      f2: "GUSSETT",
      f3: "HEIGHT",
    },
    "Wrapping Paper": { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    "Butter Paper": { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    "Tissue Paper": { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    Sleeve: { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
    Insert: { layout: "2D", f1: "WIDTH", f2: "LENGTH" },
    Tags: { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    Stickers: { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    "Courier Bag": { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    "Business Card": { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
    "Thank You Card": { layout: "2D", f1: "WIDTH", f2: "HEIGHT" },
  };

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const uniqueClientCategories = useMemo(() => ["HP", "ZPL", "Others"], []);

  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchSalesOrders();
    fetchCompanies();
    fetchUsers();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      const res = await salesOrdersAPI.getAll();
      setSalesOrders(res.salesOrders || []);
    } catch (error) {
      toast?.("Failed to load sales orders", "error");
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await companyMasterAPI.getAll();
      setCompanies(res.companies || res.clients || []);

      setCompanyCategories(["HP", "ZPL", "Others"]);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      setCompanyCategories(["HP", "ZPL", "Others"]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const salesPersons = useMemo(() => ["Direct", "Ankit"], []);

  const generateItemName = (it, overrideHeader) => {
    const parts = [it.itemCategory];
    const h = overrideHeader || header;

    const isBag = [
      "Paper Bag with Handle",
      "Paper Bag without Handle",
      "Paper Bag Manual",
    ].includes(it.itemCategory);

    if (isBag && (it.width || it.gussett || it.height)) {
      const dims = [];
      if (it.width) dims.push(it.width);
      if (it.gussett) dims.push(it.gussett);
      if (it.height) dims.push(it.height);
      if (dims.length > 0) parts.push(`${dims.join("x")}${it.uom || "inch"}`);
    } else if (it.size) {
      parts.push(
        it.size
          .toLowerCase()
          .split(/\s*\d+\s*gsm/)[0]
          .trim(),
      );
    } else if (it.width || it.length || it.height) {
      const dims = [];
      if (it.width) dims.push(it.width);
      if (it.length) dims.push(it.length);
      if (it.height) dims.push(it.height);
      if (dims.length > 0) parts.push(`${dims.join("x")}${it.uom || "inch"}`);
    }

    if (it.companyName) parts.push(it.companyName);
    else if (h.companyName) parts.push(h.companyName);

    if (it.variant) parts.push(it.variant);

    return parts.filter(Boolean).join(" ");
  };

  const setH = (k, v) => {
    let nextH;
    setHeader((f) => {
      const next = { ...f, [k]: v };
      if (k === "companyName") {
        const found = companyMaster.find((c) => c.name === v);
        if (found) {
          next.clientContact = found.phone || found.whatsapp || "";
        }
      }
      nextH = next;
      return next;
    });
    setHeaderErrors((e) => ({ ...e, [k]: false }));

    if (k === "companyName") {
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          itemName: generateItemName(it, nextH),
        })),
      );
    }
  };

  const EH = (k) => (headerErrors[k] ? { border: `1px solid ${C.red}` } : {});
  const EHMsg = (k) =>
    headerErrors[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  const setItem = (idx, k, v) => {
    setItems((prev) => {
      const updated = [...prev];
      let it = { ...updated[idx], [k]: v };

      if (k === "productCode") {
        const codeOnly = v.split(" — ")[0];
        it.productCode = codeOnly;
        const found = fgItems.find((f) => f.code === codeOnly);
        if (found) {
          it = {
            ...it,
            itemCategory: found.category || it.itemCategory,
            size: found.subCategory || it.size,
            variant: found.variant || it.variant,
            uom: found.uom || it.uom || "inch",
            qtyUnit: found.qtyUnit || it.qtyUnit || "pcs",
            companyName: header.companyName ? "" : found.companyName || "",
            itemName: found.name || it.itemName,
            gstRate: found.gstRate || 18,
            hsnCode: found.hsnCode || "",
            gsm: found.gsm || "",
          };
        }
      }

      
      const orderQty = +(it.orderQty || 0);
      const price = +(it.price || 0);
      const gstRate = +(it.gstRate || 18);

      const amount = orderQty * price;
      const taxAmt = (amount * gstRate) / 100;

      it.amount = amount > 0 ? amount.toFixed(2) : "";
      it.taxAmount = taxAmt > 0 ? taxAmt.toFixed(2) : "";
      it.totalWithTax = amount > 0 ? (amount + taxAmt).toFixed(2) : "";

      const categorySizes = subTypeMap[it.itemCategory] || [];
      const isLiquid = categorySizes.some((s) =>
        s.toLowerCase().includes("ml"),
      );

      if (k === "size" && v && !isLiquid) {
        const config = CATEGORY_CONFIG[it.itemCategory];
        
        const match3D = v
          .toLowerCase()
          .match(
            /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*(?:(\d+)\s*gsm)?/,
          );
        
        const match2D = v
          .toLowerCase()
          .match(
            /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*(?:(\d+)\s*gsm)?/,
          );

        if (match3D) {
          it.width = match3D[1];
          
          if (config?.f2 === "LENGTH") {
            it.length = match3D[2];
            it.gussett = "";
          } else {
            it.gussett = match3D[2];
            it.length = "";
          }
          it.height = match3D[3];
          if (match3D[4] && ["mm", "cm", "inch"].includes(match3D[4]))
            it.uom = match3D[4];
          if (match3D[5]) it.gsm = match3D[5];
        } else if (match2D) {
          it.width = match2D[1];
          
          if (config?.f2 === "HEIGHT") {
            it.height = match2D[2];
            it.length = "";
          } else {
            it.length = match2D[2];
            it.height = "";
          }
          it.gussett = "";
          if (match2D[3] && ["mm", "cm", "inch"].includes(match2D[3]))
            it.uom = match2D[3];
          if (match2D[4]) it.gsm = match2D[4];
        }
      }

      it.itemName = generateItemName(it);
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
    setItems((prev) => [...prev, blankItem()]);
    setItemErrors((prev) => [...prev, {}]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEdit = async (so) => {
    setEditId(so._id);
    setHeader({
      orderDate: so.orderDate
        ? new Date(so.orderDate).toISOString().slice(0, 10)
        : "",
      deliveryDate: so.deliveryDate
        ? new Date(so.deliveryDate).toISOString().slice(0, 10)
        : "",
      salesPerson: so.salesPerson || "",
      companyCategory: so.companyCategory || "",
      companyName: so.companyName,
      remarks: so.remarks || "",
      status: so.status || "Open",
    });
    setItems(
      (so.items || []).map((it) => ({
        _id: it._id || uid(),
        productCode: it.productCode || "",
        itemCategory: it.itemCategory || "",
        itemName: it.itemName || "",
        size: it.size || "",
        variant: it.variant || "",
        width: it.width || "",
        length: it.length || "",
        height: it.height || "",
        gussett: it.gussett || "",
        uom: it.uom || "inch",
        qtyUnit: it.qtyUnit || "pcs",
        orderQty: it.orderQty || 0,
        price: it.price || 0,
        amount: it.amount || 0,
        gstRate: it.gstRate || 18,
        hsnCode: it.hsnCode || "",
        taxAmount: it.taxAmount || 0,
        totalWithTax: it.totalWithTax || 0,
        gsm: it.gsm || "",
        remarks: it.remarks || "",
      })),
    );
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this sales order?")) return;
    try {
      setLoading(true);
      await salesOrdersAPI.delete(id);
      toast("Sales order deleted successfully", "success");
      fetchSalesOrders();
    } catch (error) {
      toast(
        error.response?.data?.error || "Failed to delete sales order",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const he = {};
    if (!header.orderDate) he.orderDate = true;
    if (!header.deliveryDate) he.deliveryDate = true;
    if (!header.companyName) he.companyName = true;
    if (!header.companyCategory) he.companyCategory = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (!it.itemCategory) e.itemCategory = true;

      if (!it.size && !it.width && !it.length && !it.height && !it.gussett) {
        e.size = true;
      }
      if (!it.orderQty) e.orderQty = true;
      if (!it.price) e.price = true;
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

    setLoading(true);
    try {
      const payload = {
        orderDate: header.orderDate,
        deliveryDate: header.deliveryDate,
        salesPerson: header.salesPerson,
        companyCategory: header.companyCategory,
        companyName: header.companyName,
        remarks: header.remarks,
        items: items.map((it) => {
          const amount = +(it.amount || 0);
          const gstRate = +(it.gstRate || 18);
          const taxAmt = +(it.taxAmount || (amount * gstRate) / 100);
          const totalWithTax = +(it.totalWithTax || amount + taxAmt);

          return {
            productCode: it.productCode || "",
            itemCategory: it.itemCategory || "",
            itemName: it.itemName || "",
            size: it.size || "",
            variant: it.variant || "",
            width: it.width ? Number(it.width) : undefined,
            length: it.length ? Number(it.length) : undefined,
            height: it.height ? Number(it.height) : undefined,
            gussett: it.gussett ? Number(it.gussett) : undefined,
            uom: it.uom || "inch",
            qtyUnit: it.qtyUnit || "pcs",
            orderQty: Number(it.orderQty || 0),
            price: Number(it.price || 0),
            amount: amount,
            gstRate: gstRate,
            hsnCode: it.hsnCode || "—",
            taxAmount: taxAmt,
            totalWithTax: totalWithTax,
            gsm: it.gsm ? Number(it.gsm) : undefined,
            remarks: it.remarks || "",
          };
        }),
        status: header.status || "Open",
      };

      if (editId) {
        await salesOrdersAPI.update(editId, payload);
        toast("Sales Order updated successfully", "success");
        setEditId(null);
      } else {
        const res = await salesOrdersAPI.create(payload);
        toast(
          `Sales Order ${res.salesOrder.soNo} created successfully`,
          "success",
        );
      }

      setHeader(blankHeader);
      setItems([blankItem()]);
      setHeaderErrors({});
      setItemErrors([{}]);
      setView("records");
      fetchSalesOrders();
      fetchCompanies();
      if (refreshData) refreshData();
    } catch (error) {
      toast(
        error.response?.data?.error || "Failed to save sales order",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSOPDF = (so) => {
    const subtotal = (so.items || []).reduce(
      (s, it) => s + +(it.amount || 0),
      0,
    );
    const totalTax = (so.items || []).reduce((s, it) => {
      const amt = +(it.amount || 0);
      const rate = +(it.gstRate || 18);
      const tax = it.taxAmount ? +it.taxAmount : (amt * rate) / 100;
      return s + tax;
    }, 0);
    const total = subtotal + totalTax;
    const fd = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

    const html = `
      <html>
        <head>
          <title>SO-${so.soNo}</title>
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
            .so-no { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 800; color: #1e40af; margin: 5px 0; }
            
            .section-label { font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 15px; margin-top: 25px; background: #f8fafc; padding: 4px 8px; border-radius: 4px; }
            
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px; }
            .info-item label { display: block; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
            .info-item span { font-size: 12px; font-weight: 600; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
            td { border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; color: #1e293b; }
            .col-qty { text-align: center; }
            .col-amt { text-align: right; font-weight: 700; }
            
            .total-row { display: flex; justify-content: flex-end; margin-top: 25px; }
            .total-box { display: flex; align-items: center; justify-content: space-between; font-size: 18px; font-weight: 800; color: #1e3a8a; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .total-box label { font-size: 14px; color: #64748b; font-weight: 700; margin-right: 20px; }
            
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
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
            <h2>SALES ORDER</h2>
            <div class="status">Status: <span>${so.status || "Open"}</span></div>
          </div>
          <div class="so-no">${so.soNo}</div>
          <div class="hr"></div>

          <div class="section-label">General Information</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Order Date</label>
              <span>${fd(so.orderDate)}</span>
            </div>
            <div class="info-item">
              <label>Delivery Date</label>
              <span>${fd(so.deliveryDate)}</span>
            </div>
            <div class="info-item">
              <label>Customer Name</label>
              <span>${so.companyName}</span>
            </div>
          </div>

          <div class="section-label">Order Items</div>
          <table>
            <thead>
              <tr>
                <th style="width: 35%;">Item Description</th>
                <th style="width: 15%;">HSN</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 10%; text-align: right;">Rate</th>
                <th style="width: 10%; text-align: center;">GST(%)</th>
                <th style="width: 15%;" class="col-amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(so.items || [])
                .map(
                  (it) => `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${it.itemName}</div>
                  </td>
                  <td>${it.hsnCode || "—"}</td>
                  <td class="col-qty">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                      <span>${fmt(it.orderQty)}</span>
                      <span style="font-size: 9px; color: #64748b;">${it.qtyUnit || "pcs"}</span>
                    </div>
                  </td>
                  <td style="text-align: right;">₹${fmt(it.price)}</td>
                  <td style="text-align: center;">${it.gstRate || 18}%</td>
                  <td class="col-amt">₹${fmt(it.amount)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-row">
            <div style="width: 250px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; padding: 0 5px;">
                <label style="color: #64748b; font-weight: 600;">Subtotal:</label>
                <span style="font-weight: 700;">₹${fmt(subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; padding: 0 5px;">
                <label style="color: #64748b; font-weight: 600;">GST Total:</label>
                <span style="font-weight: 700;">₹${fmt(totalTax)}</span>
              </div>
              <div class="hr"></div>
              <div class="total-box">
                <label>NET TOTAL</label>
                <span>₹${fmt(total)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
             <div class="signature">Authorized Signatory</div>
             <div class="signature">Customer Confirmation</div>
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
        icon="📋"
        title="Sales Orders"
        sub="Create and track customer sales orders"
      />

      {}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["form", "📝 New Order"],
          ["records", `📋 Records (${salesOrders.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? C.green : C.border}`,
              background: view === v ? C.green : "transparent",
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
        <div>
          {}
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.green || "#4ade80",
                marginBottom: 20,
              }}
            >
              Order &amp; Client Details
            </h3>

            {}
            <div style={sectionLabelStyle}>Order Details</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <Field label="Order Date 📅 *">
                <DatePicker
                  value={header.orderDate}
                  onChange={(v) => setH("orderDate", v)}
                  style={EH("orderDate")}
                />
                {EHMsg("orderDate")}
              </Field>
              <Field label="Delivery Date 📅 *">
                <DatePicker
                  value={header.deliveryDate}
                  onChange={(v) => setH("deliveryDate", v)}
                  style={EH("deliveryDate")}
                />
                {EHMsg("deliveryDate")}
              </Field>
              <Field label="Sales Person">
                <select
                  value={header.salesPerson}
                  onChange={(e) => setH("salesPerson", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {salesPersons.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {}
            <div style={sectionLabelStyle}>Client Details</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1fr 1.8fr",
                gap: 14,
              }}
            >
              <Field label="Client Category *">
                <select
                  value={header.companyCategory}
                  onChange={(e) => setH("companyCategory", e.target.value)}
                  style={EH("companyCategory")}
                >
                  <option value="">-- All Categories --</option>
                  {uniqueClientCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {EHMsg("companyCategory")}
              </Field>
              <Field label="Client Name *">
                <AutocompleteInput
                  value={header.companyName}
                  onChange={(v) => setH("companyName", v)}
                  suggestions={
                    header.companyCategory
                      ? companyMaster
                          .filter((c) => c.category === header.companyCategory)
                          .map((c) => c.name)
                      : companyMaster.map((c) => c.name)
                  }
                  placeholder="Type to search..."
                  inputStyle={EH("companyName")}
                />
                {EHMsg("companyName")}
              </Field>
              <Field label="Client Contact">
                <input
                  readOnly
                  placeholder="— Auto-filled —"
                  value={header.clientContact}
                  style={{ color: C.muted, background: "transparent" }}
                />
              </Field>
              <Field label="Remarks">
                <input
                  placeholder="Special instructions (optional)"
                  value={header.remarks}
                  onChange={(e) => setH("remarks", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          {}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.green || "#4ade80",
              }}
            >
              Order Items ({items.length})
            </h3>
            <button
              onClick={addItem}
              style={{
                background: C.green || "#4ade80",
                color: "#000",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Add Item
            </button>
          </div>

          {}
          {items.map((it, idx) => (
            <Card
              key={it._id}
              style={{
                marginBottom: 12,
                borderLeft: `3px solid ${C.green || "#4ade80"}`,
              }}
            >
              {}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: C.green || "#4ade80",
                    fontSize: 13,
                  }}
                >
                  Item {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    style={{
                      background: (C.red || "#ef4444") + "22",
                      color: C.red || "#ef4444",
                      border: "none",
                      borderRadius: 5,
                      padding: "4px 12px",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 0.8fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Field label="PRODUCT CODE">
                  <AutocompleteInput
                    value={it.productCode}
                    onChange={(v) => setItem(idx, "productCode", v)}
                    suggestions={sortedFGItems.map(
                      (f) => `${f.code} — ${f.name}`,
                    )}
                    placeholder="Type or select code (optional)"
                  />
                </Field>
                <Field label="CATEGORY *">
                  <select
                    value={it.itemCategory}
                    onChange={(e) =>
                      setItem(idx, "itemCategory", e.target.value)
                    }
                    style={EI(idx, "itemCategory")}
                  >
                    <option value="">-- Select Category --</option>
                    {fgCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {EIMsg(idx, "itemCategory")}
                </Field>
                <Field label="GSM">
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={it.gsm}
                    onChange={(e) => setItem(idx, "gsm", e.target.value)}
                  />
                </Field>
                <Field label="VARIANT / COLOUR">
                  <input
                    placeholder="e.g. Blue, Yellow, Plain (optional)"
                    value={it.variant}
                    onChange={(e) => setItem(idx, "variant", e.target.value)}
                  />
                </Field>
              </div>

              {}
              {(() => {
                const categorySizes = subTypeMap[it.itemCategory] || [];
                const config = CATEGORY_CONFIG[it.itemCategory];

                const isLiquid = categorySizes.some((s) =>
                  s.toLowerCase().includes("ml"),
                );

                
                let layout = config?.layout;
                let f1 = config?.f1 || "WIDTH";
                let f2 = config?.f2;
                let f3 = config?.f3;

                if (!layout && !isLiquid) {
                  const is3D = categorySizes.some(
                    (s) => (s.match(/x/g) || []).length >= 2,
                  );
                  const is2D =
                    !is3D &&
                    categorySizes.some((s) => s.toLowerCase().includes("x"));

                  if (is3D) {
                    layout = "3D";
                    f2 = "GUSSETT";
                    f3 = "HEIGHT";
                  } else if (is2D) {
                    layout = "2D";
                    f2 = "LENGTH";
                  }
                }

                const showInputs = layout === "3D" || layout === "2D";

                
                const getKey = (label) => {
                  if (label === "WIDTH") return "width";
                  if (label === "LENGTH") return "length";
                  if (label === "GUSSETT") return "gussett";
                  if (label === "HEIGHT") return "height";
                  return "width";
                };

                if (showInputs) {
                  return (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr 1fr",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <Field label="STANDARD SIZE">
                          <select
                            value={it.size}
                            onChange={(e) =>
                              setItem(idx, "size", e.target.value)
                            }
                          >
                            <option value="">-- Manual / Custom --</option>
                            {categorySizes.map((s) => (
                              <option key={s} value={s}>
                                {s
                                  .toLowerCase()
                                  .split(/\s*\d+\s*gsm/)[0]
                                  .trim()
                                  .toLowerCase()}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="UOM *">
                          <select
                            value={it.uom}
                            onChange={(e) =>
                              setItem(idx, "uom", e.target.value)
                            }
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="inch">inch</option>
                          </select>
                        </Field>
                        <Field label={`${f1} *`}>
                          <input
                            type="number"
                            placeholder="e.g. 9"
                            value={it[getKey(f1)]}
                            onChange={(e) =>
                              setItem(idx, getKey(f1), e.target.value)
                            }
                            style={EI(idx, getKey(f1))}
                          />
                        </Field>
                        {f2 && (
                          <Field label={`${f2} *`}>
                            <input
                              type="number"
                              placeholder="e.g. 6"
                              value={it[getKey(f2)]}
                              onChange={(e) =>
                                setItem(idx, getKey(f2), e.target.value)
                              }
                              style={EI(idx, getKey(f2))}
                            />
                          </Field>
                        )}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        {layout === "3D" && f3 && (
                          <Field label={`${f3} *`}>
                            <input
                              type="number"
                              placeholder="e.g. 7"
                              value={it[getKey(f3)]}
                              onChange={(e) =>
                                setItem(idx, getKey(f3), e.target.value)
                              }
                              style={EI(idx, getKey(f3))}
                            />
                          </Field>
                        )}
                        <Field label="ORDER QTY & UNIT *">
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              type="number"
                              placeholder="Qty"
                              value={it.orderQty}
                              onChange={(e) =>
                                setItem(idx, "orderQty", e.target.value)
                              }
                              style={{ ...EI(idx, "orderQty"), flex: 1 }}
                            />
                            <select
                              value={it.qtyUnit || "pcs"}
                              onChange={(e) =>
                                setItem(idx, "qtyUnit", e.target.value)
                              }
                              style={{
                                padding: "8px 12px",
                                borderRadius: 6,
                                border: `1px solid ${C.border}`,
                                background: C.inputBg,
                                color: C.text,
                                width: 80,
                              }}
                            >
                              <option value="pcs">pcs</option>
                              <option value="kg">kg</option>
                            </select>
                          </div>
                          {EIMsg(idx, "orderQty")}
                        </Field>
                        <Field label="PRICE (₹)">
                          <input
                            type="number"
                            placeholder="Price per unit"
                            value={it.price}
                            onChange={(e) =>
                              setItem(idx, "price", e.target.value)
                            }
                            style={EI(idx, "price")}
                          />
                          {EIMsg(idx, "price")}
                        </Field>
                      </div>
                    </>
                  );
                }

                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Field label="SIZE *">
                      <select
                        value={it.size}
                        onChange={(e) => setItem(idx, "size", e.target.value)}
                        style={EI(idx, "size")}
                      >
                        <option value="">-- Select Size --</option>
                        {categorySizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {EIMsg(idx, "size")}
                    </Field>
                    <Field label="ORDER QTY & UNIT *">
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={it.orderQty}
                          onChange={(e) =>
                            setItem(idx, "orderQty", e.target.value)
                          }
                          style={{ ...EI(idx, "orderQty"), flex: 1 }}
                        />
                        <select
                          value={it.qtyUnit || "pcs"}
                          onChange={(e) =>
                            setItem(idx, "qtyUnit", e.target.value)
                          }
                          style={{
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: `1px solid ${C.border}`,
                            background: C.inputBg,
                            color: C.text,
                            width: 80,
                          }}
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>
                      {EIMsg(idx, "orderQty")}
                    </Field>
                    <Field label="PRICE (₹)">
                      <input
                        type="number"
                        placeholder="Price per unit"
                        value={it.price}
                        onChange={(e) => setItem(idx, "price", e.target.value)}
                        style={EI(idx, "price")}
                      />
                      {EIMsg(idx, "price")}
                    </Field>
                  </div>
                );
              })()}

              {}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Field label="AMOUNT (₹)">
                  <div
                    style={{
                      padding: "9px 12px",
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      color: it.amount ? C.green || "#4ade80" : C.muted,
                      fontWeight: it.amount ? 700 : 400,
                      fontFamily: "'JetBrains Mono', monospace",
                      height: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {it.amount ? (
                      `₹${fmt(+it.amount)}`
                    ) : (
                      <span style={{ fontSize: 11, color: C.muted }}>
                        — Qty × Price —
                      </span>
                    )}
                  </div>
                </Field>
                <Field label="GST (%)">
                  <input
                    type="number"
                    placeholder="18"
                    value={it.gstRate || 18}
                    onChange={(e) => setItem(idx, "gstRate", e.target.value)}
                  />
                </Field>
                <Field label="TOTAL (INCL TAX)">
                  <div
                    style={{
                      padding: "9px 12px",
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      color: it.totalWithTax ? C.green || "#4ade80" : C.muted,
                      fontWeight: it.totalWithTax ? 700 : 400,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {it.totalWithTax ? `₹${fmt(+it.totalWithTax)}` : "—"}
                  </div>
                </Field>
              </div>

              {}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Field label="HSN">
                  <input
                    placeholder="HSN"
                    value={it.hsnCode || ""}
                    onChange={(e) => setItem(idx, "hsnCode", e.target.value)}
                  />
                </Field>
                <Field label="ITEM NAME">
                  <div
                    style={{
                      padding: "9px 12px",
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      color: C.green || "#4ade80",
                      fontWeight: 700,
                    }}
                  >
                    {it.itemName || "— Auto-generated —"}
                  </div>
                </Field>
              </div>

              {}
              <div style={{ marginBottom: 4 }}>
                <Field label="ITEM REMARKS">
                  <input
                    placeholder="Special instructions for this item (optional)"
                    value={it.remarks}
                    onChange={(e) => setItem(idx, "remarks", e.target.value)}
                  />
                </Field>
              </div>
            </Card>
          ))}

          {}
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
                background: (C.green || "#4ade80") + "22",
                color: C.green || "#4ade80",
                border: `1px solid ${C.green || "#4ade80"}44`,
                borderRadius: 6,
                padding: "9px 20px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Add Another Item
            </button>
            <SubmitBtn
              label={
                editId
                  ? `Update Sales Order (${items.length} item${items.length > 1 ? "s" : ""})`
                  : `Create Sales Order (${items.length} item${items.length > 1 ? "s" : ""})`
              }
              color={C.green || "#4ade80"}
              onClick={submit}
              disabled={loading}
            />
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setHeader(blankHeader);
                  setItems([blankItem()]);
                  setHeaderErrors({});
                  setItemErrors([{}]);
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
            {items.some((it) => it.amount) && (
              <div
                style={{
                  marginLeft: "auto",
                  padding: "12px 20px",
                  background: (C.green || "#4ade80") + "11",
                  border: `1px solid ${C.green || "#4ade80"}33`,
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
                    background: (C.green || "#4ade80") + "22",
                    margin: "4px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 800,
                    color: C.green || "#4ade80",
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

      {}
      {view === "records" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: "12px 20px" }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
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
                📊 Sales Order History
              </h3>
              <DateRangeFilter
                dateFrom={drDateFrom}
                setDateFrom={setDrDateFrom}
                dateTo={drDateTo}
                setDateTo={setDrDateTo}
              />
              <span
                style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}
              >
                {salesOrders.length} orders total
              </span>
            </div>
          </Card>

          {salesOrders.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
                background: "#1a1a1a",
                borderRadius: 10,
              }}
            >
              No sales orders yet.
            </div>
          )}

          {(salesOrders || [])
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
                    borderLeft: `3px solid ${C.green || "#4ade80"}`,
                    background: "#161b22",
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
                          fontSize: 16,
                          fontWeight: 800,
                          color: C.green || "#4ade80",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {r.soNo}
                      </span>
                      <span
                        style={{
                          color: "#8b949e",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {r.companyName} ·{" "}
                        {r.orderDate
                          ? new Date(r.orderDate).toLocaleDateString("en-GB")
                          : "N/A"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div
                        style={{
                          background:
                            r.status === "Complated" || r.status === "Received"
                              ? "#064e3b"
                              : "#453b03",
                          color:
                            r.status === "Complated" || r.status === "Received"
                              ? "#10b981"
                              : "#f59e0b",
                          border: `1px solid ${
                            r.status === "Complated" || r.status === "Received"
                              ? "#065f46"
                              : "#78650f"
                          }`,
                          borderRadius: 6,
                          padding: "4px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {r.status || "Open"}
                      </div>
                      {!isClient && (
                        <>
                          <button
                            onClick={() => handleEdit(r)}
                            style={{
                              background: "#1e293b",
                              color: C.green || "#4ade80",
                              border: "1px solid #334155",
                              borderRadius: 6,
                              padding: "4px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ✏️ Edit
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
                        </>
                      )}
                      <button
                        onClick={() => generateSOPDF(r)}
                        style={{
                          background: "#1e293b",
                          color: C.green || "#4ade80",
                          border: "1px solid #334155",
                          borderRadius: 6,
                          padding: "4px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🖨️ PDF
                      </button>
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
                          fontSize: 12,
                          color: "#c9d1d9",
                          paddingBottom: idx === r.items.length - 1 ? 0 : 4,
                          borderBottom:
                            idx === r.items.length - 1
                              ? "none"
                              : "1px solid #30363d55",
                        }}
                      >
                        <span style={{ fontWeight: 700, flex: 2 }}>
                          {it.itemName}
                        </span>
                        <span style={{ flex: 1, color: "#8b949e" }}>
                          Qty:{" "}
                          <b style={{ color: "#e6edf3" }}>
                            {fmt(it.orderQty)} {it.qtyUnit || "pcs"}
                          </b>
                        </span>
                        <span style={{ flex: 1, color: "#8b949e" }}>
                          Rate: ₹{fmt(it.price)}
                        </span>
                        <span
                          style={{
                            color: C.green || "#4ade80",
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
                      borderTop: "1px solid #30363d",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        color: "#8b949e",
                        fontSize: 11,
                      }}
                    >
                      <span>
                        Delivery:{" "}
                        <b style={{ color: "#c9d1d9" }}>
                          {r.deliveryDate
                            ? new Date(r.deliveryDate).toLocaleDateString(
                                "en-GB",
                              )
                            : "—"}
                        </b>
                      </span>
                      <span>
                        Sales Person:{" "}
                        <b style={{ color: "#c9d1d9" }}>
                          {r.salesPerson || "None"}
                        </b>
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: C.green || "#4ade80",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "#8b949e",
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
            })}
        </div>
      )}
    </div>
  );
}
