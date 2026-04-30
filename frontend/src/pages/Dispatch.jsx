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
import { dispatchAPI, salesOrdersAPI, jobOrdersAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const UNIT_OPTIONS = ["pcs", "kg"];

export default function Dispatch({ fgStock = [], itemMasterFG = [], priceList = [], toast }) {
  const [dispatch, setDispatch] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const blankHeader = {
    dispatchDate: today(),
    soRef: "",
    companyName: "",
    deliveryAddress: "",
    vehicleNo: "",
    driverName: "",
    remarks: "",
    status: "Dispatched",
  };

  const blankItem = () => ({
    _id: uid(),
    itemName: "",
    productCode: "",
    companyCode: "",
    qty: "",
    unit: "nos",
    pcsPerBox: "",
    noOfBox: "",
    rate: "",
    gstRate: 18,
    amount: "",
    taxAmount: "",
    totalWithTax: "",
  });

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [editId, setEditId] = useState(null);

  // Material Return state
  const blankReturnHeader = {
    returnDate: today(),
    companyName: "",
    originalDispatchRef: "",
    returnReason: "",
    vehicleNo: "",
    remarks: "",
  };
  const [returnHeader, setReturnHeader] = useState(blankReturnHeader);
  const [returnItems, setReturnItems] = useState([blankItem()]);
  const [returnLoading, setReturnLoading] = useState(false);

  useEffect(() => {
    fetchDispatches();
    fetchSalesOrders();
    fetchJobOrders();
  }, []);

  const fetchDispatches = async () => {
    try {
      const res = await dispatchAPI.getAll();
      setDispatch(res.dispatches || []);
    } catch (error) {
      toast?.("Failed to load dispatches", "error");
    }
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

  const fetchJobOrders = async () => {
    try {
      const res = await jobOrdersAPI.getAll();
      setJobOrders(res || []);
    } catch (error) {
      console.error("Failed to fetch job orders:", error);
    }
  };

  const activeSOList = useMemo(
    () =>
      (salesOrders || []).filter((s) =>
        [
          "Open",
          "In Production",
          "Issued",
          "Partial",
          "Completed",
          "In Progress",
        ].includes(s.status),
      ),
    [salesOrders],
  );

  const fgStockOptions = useMemo(
    () => (fgStock || []).map((s) => s.itemName).filter(Boolean),
    [fgStock],
  );

  const setH = (k, v) => {
    if (k === "soRef") {
      if (v) {
        const so = activeSOList.find((s) => s.soNo === v);
        if (so) {
          setHeader((f) => ({
            ...f,
            [k]: v,
            companyName: so.companyName || "",
            deliveryAddress: so.deliveryAddress || "",
          }));

          const soItems = (so.items || []).map((it) => {
            const masterItem = (itemMasterFG || []).find(
              (m) => m.name === it.itemName,
            );
            const priceEntry = (priceList || []).find(
              (p) =>
                p.listType === "selling" &&
                (p.itemName === it.itemName || p.itemCode === (masterItem?.code || "")) &&
                (!p.companyName || p.companyName === so.companyName),
            );
            return {
              _id: uid(),
              itemName: it.itemName || "",
              productCode: it.productCode || "",
              companyCode:
                masterItem && so.companyName
                  ? masterItem.companyCodes?.[so.companyName] || ""
                  : "",
              qty: (it.orderQty || 0).toString(),
              unit: it.qtyUnit || "nos",
              pcsPerBox: "",
              noOfBox: "",
              rate: it.price || priceEntry?.unitPrice || 0,
              gstRate: it.gstRate || 18,
              amount: it.amount || 0,
              taxAmount: it.taxAmount || 0,
              totalWithTax: it.totalWithTax || 0,
            };
          });

          if (soItems.length > 0) {
            setItems(soItems);
            setItemErrors(soItems.map(() => ({})));
          }
        }
      } else {
        setHeader((f) => ({
          ...f,
          [k]: v,
          companyName: "",
          deliveryAddress: "",
        }));
        setItems([blankItem()]);
        setItemErrors([{}]);
      }
    } else {
      setHeader((f) => ({ ...f, [k]: v }));

      if (k === "companyName") {
        setItems((prev) =>
          prev.map((it) => {
            const masterItem = (itemMasterFG || []).find(
              (m) => m.name === it.itemName,
            );
            return {
              ...it,
              companyCode:
                masterItem && v ? masterItem.companyCodes?.[v] || "" : "",
            };
          }),
        );
      }
    }
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

      if (k === "itemName") {
        const stock = (fgStock || []).find((s) => s.itemName === v);
        it.productCode = stock?.code || stock?.joNo || "";

        const masterItem = (itemMasterFG || []).find((m) => m.name === v);
        if (masterItem && header.clientName) {
          it.clientCode = masterItem.clientCodes?.[header.clientName] || "";
        } else {
          it.clientCode = "";
        }

        const priceEntry = (priceList || []).find(
          (p) =>
            p.listType === "selling" &&
            (p.itemName === v || p.itemCode === (masterItem?.code || "")) &&
            (!p.companyName || p.companyName === header.companyName),
        );
        if (priceEntry) {
          it.rate = priceEntry.unitPrice;
          it.gstRate = it.gstRate || 18;
        }
      }

      const qty = k === "qty" ? +v : +(it.qty || 0);
      const ppb = k === "pcsPerBox" ? +v : +(it.pcsPerBox || 0);
      const rate = k === "rate" ? +v : +(it.rate || 0);
      const gst = k === "gstRate" ? +v : +(it.gstRate || 0);

      it.noOfBox = qty && ppb ? Math.ceil(qty / ppb).toString() : "";
      it.amount = qty && rate ? (qty * rate).toFixed(2) : "";

      const amt = Number(it.amount || 0);
      it.taxAmount = ((amt * gst) / 100).toFixed(2);
      it.totalWithTax = (amt + Number(it.taxAmount)).toFixed(2);

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

  const submit = async () => {
    const he = {};
    if (!header.dispatchDate) he.dispatchDate = true;
    if (!header.companyName) he.companyName = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (!it.itemName) e.itemName = true;
      if (!it.qty) e.qty = true;

      
      const stockItem = (fgStock || []).find((s) => s.itemName === it.itemName);
      if (!stockItem) {
        e.itemName = true;
        toast(`Item "${it.itemName}" not found in FG Stock`, "error");
      } else if (Number(it.qty) > (stockItem.qty || 0)) {
        e.qty = true;
        toast(
          `Insufficient stock for "${it.itemName}". Available: ${stockItem.qty || 0}`,
          "error",
        );
      }

      return e;
    });
    setItemErrors(allItemErrors);

    if (
      Object.keys(he).length > 0 ||
      allItemErrors.some((e) => Object.keys(e).length > 0)
    ) {
      if (Object.keys(he).length > 0)
        toast("Please fill all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date: new Date(header.dispatchDate),
        companyName: header.companyName,
        soRef: header.soRef,
        joRef: header.joRef,
        vehicleNo: header.vehicleNo,
        driverName: header.driverName,
        lrNo: header.lrNo,
        remarks: header.remarks,
        items: items.map((it) => ({
          itemName: it.itemName,
          productCode: it.productCode,
          companyCode: it.companyCode,
          qty: Number(it.qty),
          unit: it.unit,
          pcsPerBox: Number(it.pcsPerBox || 0),
          noOfBox: Number(it.noOfBox || 0),
          rate: it.rate ? Number(it.rate) : 0,
          amount: it.amount ? Number(it.amount) : 0,
          gstRate: it.gstRate ? Number(it.gstRate) : 0,
          taxAmount: it.taxAmount ? Number(it.taxAmount) : 0,
          totalWithTax: it.totalWithTax ? Number(it.totalWithTax) : 0,
        })),
      };

      if (editId) {
        await dispatchAPI.update(editId, payload);
        toast("Dispatch updated successfully", "success");
        setEditId(null);
      } else {
        const res = await dispatchAPI.create(payload);
        toast(
          `Dispatch ${res.dispatch.dispatchNo} created successfully`,
          "success",
        );
      }

      setHeader(blankHeader);
      setItems([blankItem()]);
      setHeaderErrors({});
      setItemErrors([{}]);
      setView("records");
      fetchDispatches();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save dispatch", "error");
    } finally {
      setLoading(false);
    }
  };

  const generateDispatchPDF = (d) => {
    const fd = (date) =>
      date ? new Date(date).toLocaleDateString("en-GB") : "—";

    const html = `
      <html>
        <head>
          <title>DC-${d.dispatchId || "NEW"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px 30px; color: #1a1a1a; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11px; color: #475569; font-weight: 500; }
            
            .doc-title { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; }
            .doc-title h2 { margin: 0; font-size: 20px; font-weight: 700; color: #1e293b; }
            .dc-no { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 800; color: #1e40af; margin: 5px 0; }
            
            .hr { height: 1px; background: #e2e8f0; margin: 15px 0; border: none; }
            
            .section-label { font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; background: #f8fafc; padding: 4px 8px; border-radius: 4px; }
            
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
            .info-item label { display: block; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
            .info-item span { font-size: 12px; font-weight: 600; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
            td { border: 1px solid #e2e8f0; padding: 8px; font-size: 11px; color: #1e293b; }
            .col-qty { text-align: center; font-weight: 700; }
            
            .footer { margin-top: 80px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #cbd5e1; width: 200px; text-align: center; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 600; }
            
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
            <h2>DELIVERY CHALLAN</h2>
            <div style="font-size: 12px; color: #64748b;">Date: <b>${fd(d.dispatchDate)}</b></div>
          </div>
          <div class="dc-no">DC: ${d.dispatchNo || d._id?.slice(-6).toUpperCase() || "NEW"}</div>
          <div class="hr"></div>

          <div class="info-grid">
            <div>
              <div class="section-label">Consignee Details</div>
              <div class="info-item">
                <label>Customer Name</label>
                <span style="font-size: 14px; font-weight: 800; color: #1e3a8a;">${d.companyName}</span>
              </div>
              <div class="info-item" style="margin-top: 10px;">
                <label>Delivery Address</label>
                <span style="font-size: 11px;">${d.deliveryAddress || "As per PO"}</span>
              </div>
              <div class="info-item" style="margin-top: 10px;">
                <label>Sales Order Ref</label>
                <span>${d.soRef || "—"}</span>
              </div>
            </div>
            <div>
              <div class="section-label">Transportation Details</div>
              <div class="info-grid" style="grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom:0;">
                <div class="info-item">
                  <label>Vehicle No</label>
                  <span>${d.vehicleNo || "—"}</span>
                </div>
                <div class="info-item">
                  <label>Driver Name</label>
                  <span>${d.driverName || "—"}</span>
                </div>
              </div>
              <div class="info-item" style="margin-top: 15px;">
                <label>Waybill / Remarks</label>
                <span style="font-style: italic;">${d.remarks || "No additional remarks"}</span>
              </div>
            </div>
          </div>

          <div class="section-label">Description of Goods</div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Item Name & Description</th>
                <th style="width: 15%;">Product Code / Client Code</th>
                <th style="width: 10%; text-align: center;">Boxes</th>
                <th style="width: 10%; text-align: center;">Pcs/Box</th>
                <th style="width: 15%;" class="col-qty">Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${(d.items || [])
                .map(
                  (it) => `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${it.itemName}</div>
                  </td>
                  <td>
                    <div>${it.productCode || "—"}</div>
                    ${it.companyCode ? `<div style="font-size: 9px; color: #666; margin-top: 2px;">Company: ${it.companyCode}</div>` : ""}
                  </td>
                  <td style="text-align: center;">${it.noOfBox || "—"}</td>
                  <td style="text-align: center;">${it.pcsPerBox || "—"}</td>
                  <td class="col-qty">${it.qty} ${it.unit || "pcs"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div style="margin-top: 40px; font-size: 10px; color: #64748b;">
            <b>Declaration:</b> We declare that this challan shows the actual quantity of goods described and that all particulars are true and correct.
          </div>

          <div class="footer">
             <div class="signature">Receiver's Signature</div>
             <div class="signature">For Aaray Packaging Pvt Ltd</div>
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
        icon="🚚"
        title="Dispatch"
        sub="Record outgoing dispatches against sales orders"
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          ["form", "📝 New Dispatch", C.purple],
          ["return", "↩️ Material Return", C.orange || "#f97316"],
          ["records", `📋 Records (${dispatch.length})`, C.blue],
        ].map(([v, l, col]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? col : C.border}`,
              background: view === v ? col : "transparent",
              color: view === v ? "#fff" : C.muted,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {view === "form" && (
        <div>
          {}
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.purple,
                marginBottom: 18,
              }}
            >
              Dispatch Details
            </h3>

            {}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1.2fr 1.5fr 1.2fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <Field label="Dispatch Date *">
                <DatePicker
                  value={header.dispatchDate}
                  onChange={(v) => setH("dispatchDate", v)}
                  style={EH("dispatchDate")}
                />
                {EHMsg("dispatchDate")}
              </Field>
              <Field label="Sales Order #">
                <select
                  value={header.soRef}
                  onChange={(e) => setH("soRef", e.target.value)}
                >
                  <option value="">-- Link to SO (optional) --</option>
                  {activeSOList.map((s) => (
                    <option key={s.soNo} value={s.soNo}>
                      {s.soNo} — {s.clientName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Company Name *">
                <input
                  placeholder="Company name"
                  value={header.companyName}
                  onChange={(e) => setH("companyName", e.target.value)}
                />
              </Field>
              <Field label="Delivery Address">
                <input
                  placeholder="Delivery address"
                  value={header.deliveryAddress}
                  onChange={(e) => setH("deliveryAddress", e.target.value)}
                />
              </Field>
              <Field label="Vehicle No *">
                <input
                  placeholder="e.g. DL01AB1234"
                  value={header.vehicleNo}
                  onChange={(e) => setH("vehicleNo", e.target.value)}
                  style={EH("vehicleNo")}
                />
                {EHMsg("vehicleNo")}
              </Field>
            </div>

            {}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: 14,
              }}
            >
              <Field label="Driver Name">
                <input
                  placeholder="Driver name"
                  value={header.driverName}
                  onChange={(e) => setH("driverName", e.target.value)}
                />
              </Field>
              <Field label="Remarks">
                <input
                  placeholder="Notes"
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
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>
              Items ({items.length})
            </h3>
            <button
              onClick={addItem}
              style={{
                background: C.purple,
                color: "#fff",
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
              style={{ marginBottom: 12, borderLeft: `3px solid ${C.purple}` }}
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
                  style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}
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
                  gridTemplateColumns: "1.8fr 0.8fr 0.8fr 0.7fr 0.5fr 0.6fr 0.6fr 0.7fr 0.5fr 1fr",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <Field label="Item Name *">
                  <select
                    value={it.itemName}
                    onChange={(e) => setItem(idx, "itemName", e.target.value)}
                    style={EI(idx, "itemName")}
                  >
                    <option value="">-- Select FG Item --</option>
                    {it.itemName && !fgStockOptions.includes(it.itemName) && (
                      <option value={it.itemName}>{it.itemName}</option>
                    )}
                    {fgStockOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  {EIMsg(idx, "itemName")}
                  {(() => {
                    const st = (fgStock || []).find(
                      (s) => s.itemName === it.itemName,
                    );
                    if (!it.itemName || !st) return null;
                    const isLow = (st.qty || 0) < Number(it.qty || 0);
                    return (
                      <div
                        style={{
                          fontSize: 10,
                          color: isLow ? C.red : C.green,
                          marginTop: 4,
                          fontWeight: 700,
                        }}
                      >
                        Stock Available: {fmt(st.qty || 0)} {st.unit || ""}
                        {isLow && " (Insufficient)"}
                      </div>
                    );
                  })()}
                </Field>
                <Field label="Product Code">
                  <input
                    placeholder="Auto-filled"
                    value={it.productCode}
                    onChange={(e) =>
                      setItem(idx, "productCode", e.target.value)
                    }
                  />
                </Field>
                <Field label="Company Code">
                  <input
                    placeholder="From Item Master"
                    value={it.companyCode}
                    onChange={(e) => setItem(idx, "companyCode", e.target.value)}
                  />
                </Field>
                <Field label="Quantity *">
                  <input
                    type="number"
                    placeholder="Qty to dispatch"
                    value={it.qty}
                    onChange={(e) => setItem(idx, "qty", e.target.value)}
                    style={EI(idx, "qty")}
                  />
                  {EIMsg(idx, "qty")}
                </Field>
                <Field label="Unit">
                  <select
                    value={it.unit}
                    onChange={(e) => setItem(idx, "unit", e.target.value)}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Pcs/Box">
                  <input
                    type="number"
                    placeholder="Pcs/Box"
                    value={it.pcsPerBox}
                    onChange={(e) => setItem(idx, "pcsPerBox", e.target.value)}
                  />
                </Field>
                <Field label="Boxes">
                  <input
                    type="number"
                    placeholder="Boxes"
                    value={it.noOfBox}
                    onChange={(e) => setItem(idx, "noOfBox", e.target.value)}
                  />
                </Field>
                <Field label="Rate (₹)">
                  <input
                    type="number"
                    value={it.rate || ""}
                    onChange={(e) => setItem(idx, "rate", e.target.value)}
                  />
                </Field>
                <Field label="GST (%)">
                  <input
                    type="number"
                    value={it.gstRate || 18}
                    onChange={(e) => setItem(idx, "gstRate", e.target.value)}
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
                    }}
                  >
                    {it.totalWithTax ? `₹${fmt(+it.totalWithTax)}` : "—"}
                  </div>
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
            }}
          >
            <button
              onClick={addItem}
              style={{
                background: (C.purple || "#a855f7") + "22",
                color: C.purple || "#a855f7",
                border: `1px solid ${C.purple || "#a855f7"}44`,
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
              label={`Record Dispatch (${items.length} item${items.length > 1 ? "s" : ""})`}
              color={C.purple}
              onClick={submit}
            />
          </div>
        </div>
      )}

      {view === "return" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.orange || "#f97316", marginBottom: 18 }}>
              Material Return Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Field label="Return Date *">
                <input
                  type="date"
                  value={returnHeader.returnDate}
                  onChange={(e) => setReturnHeader((h) => ({ ...h, returnDate: e.target.value }))}
                />
              </Field>
              <Field label="Company Name *">
                <input
                  placeholder="Company returning goods"
                  value={returnHeader.companyName}
                  onChange={(e) => setReturnHeader((h) => ({ ...h, companyName: e.target.value }))}
                />
              </Field>
              <Field label="Original Dispatch Ref">
                <select
                  value={returnHeader.originalDispatchRef}
                  onChange={(e) => {
                    const ref = e.target.value;
                    const orig = (dispatch || []).find((d) => d.dispatchNo === ref);
                    setReturnHeader((h) => ({
                      ...h,
                      originalDispatchRef: ref,
                      companyName: orig?.companyName || h.companyName,
                    }));
                    if (orig?.items?.length) {
                      setReturnItems(orig.items.map((it) => ({
                        _id: uid(),
                        itemName: it.itemName || "",
                        productCode: it.productCode || "",
                        companyCode: it.companyCode || "",
                        qty: "",
                        unit: it.unit || "nos",
                        pcsPerBox: "",
                        noOfBox: "",
                        rate: it.rate || "",
                        gstRate: it.gstRate || 18,
                        amount: "",
                        taxAmount: "",
                        totalWithTax: "",
                      })));
                    }
                  }}
                >
                  <option value="">-- Link to original dispatch (optional) --</option>
                  {(dispatch || []).filter((d) => d.type !== "Return").map((d) => (
                    <option key={d._id} value={d.dispatchNo}>
                      {d.dispatchNo} — {d.companyName} ({d.date ? new Date(d.date).toLocaleDateString("en-GB") : ""})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vehicle No">
                <input
                  placeholder="Vehicle number"
                  value={returnHeader.vehicleNo}
                  onChange={(e) => setReturnHeader((h) => ({ ...h, vehicleNo: e.target.value }))}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
              <Field label="Return Reason *">
                <select
                  value={returnHeader.returnReason}
                  onChange={(e) => setReturnHeader((h) => ({ ...h, returnReason: e.target.value }))}
                >
                  <option value="">-- Select Reason --</option>
                  {["Quality Issue", "Wrong Item", "Excess Quantity", "Damaged in Transit", "Customer Rejection", "Other"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Remarks">
                <input
                  placeholder="Additional notes"
                  value={returnHeader.remarks}
                  onChange={(e) => setReturnHeader((h) => ({ ...h, remarks: e.target.value }))}
                />
              </Field>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.orange || "#f97316" }}>
              Return Items ({returnItems.length})
            </h3>
            <button
              onClick={() => setReturnItems((prev) => [...prev, blankItem()])}
              style={{ background: C.orange || "#f97316", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              + Add Item
            </button>
          </div>

          {returnItems.map((it, idx) => (
            <Card key={it._id} style={{ marginBottom: 12, borderLeft: `3px solid ${C.orange || "#f97316"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontWeight: 700, color: C.orange || "#f97316", fontSize: 13 }}>Item {idx + 1}</span>
                {returnItems.length > 1 && (
                  <button
                    onClick={() => setReturnItems((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ background: (C.red || "#ef4444") + "22", color: C.red || "#ef4444", border: "none", borderRadius: 5, padding: "4px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr", gap: 10 }}>
                <Field label="Item Name *">
                  <select
                    value={it.itemName}
                    onChange={(e) => setReturnItems((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], itemName: e.target.value };
                      return updated;
                    })}
                  >
                    <option value="">-- Select Item --</option>
                    {(fgStock || []).map((s) => (
                      <option key={s._id || s.id} value={s.itemName}>{s.itemName}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Return Qty *">
                  <input
                    type="number"
                    placeholder="Qty being returned"
                    value={it.qty}
                    onChange={(e) => setReturnItems((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], qty: e.target.value };
                      return updated;
                    })}
                  />
                </Field>
                <Field label="Unit">
                  <select
                    value={it.unit}
                    onChange={(e) => setReturnItems((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], unit: e.target.value };
                      return updated;
                    })}
                  >
                    {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Product Code">
                  <input
                    placeholder="Product code"
                    value={it.productCode}
                    onChange={(e) => setReturnItems((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], productCode: e.target.value };
                      return updated;
                    })}
                  />
                </Field>
                <Field label="Rate (₹)">
                  <input
                    type="number"
                    value={it.rate || ""}
                    onChange={(e) => setReturnItems((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], rate: e.target.value };
                      return updated;
                    })}
                  />
                </Field>
              </div>
            </Card>
          ))}

          <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
            <button
              disabled={returnLoading}
              onClick={async () => {
                if (!returnHeader.companyName) { toast("Company name is required", "error"); return; }
                if (!returnHeader.returnReason) { toast("Please select a return reason", "error"); return; }
                const validItems = returnItems.filter((it) => it.itemName && it.qty);
                if (validItems.length === 0) { toast("Add at least one item with quantity", "error"); return; }

                setReturnLoading(true);
                try {
                  const res = await dispatchAPI.create({
                    date: new Date(returnHeader.returnDate),
                    companyName: returnHeader.companyName,
                    vehicleNo: returnHeader.vehicleNo,
                    remarks: returnHeader.remarks,
                    type: "Return",
                    originalDispatchRef: returnHeader.originalDispatchRef,
                    returnReason: returnHeader.returnReason,
                    items: validItems.map((it) => ({
                      itemName: it.itemName,
                      productCode: it.productCode || "",
                      companyCode: it.companyCode || "",
                      qty: Number(it.qty),
                      unit: it.unit || "nos",
                      rate: it.rate ? Number(it.rate) : 0,
                      amount: 0,
                      gstRate: 0,
                      taxAmount: 0,
                      totalWithTax: 0,
                    })),
                  });
                  toast(`Material Return ${res.dispatch?.dispatchNo} recorded — FG stock updated`, "success");
                  setReturnHeader(blankReturnHeader);
                  setReturnItems([blankItem()]);
                  fetchDispatches();
                  setView("records");
                } catch (err) {
                  toast(err.response?.data?.error || "Failed to record return", "error");
                } finally {
                  setReturnLoading(false);
                }
              }}
              style={{
                background: returnLoading ? "#333" : (C.orange || "#f97316"),
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 13,
                cursor: returnLoading ? "not-allowed" : "pointer",
              }}
            >
              {returnLoading ? "Saving…" : `↩️ Record Material Return (${returnItems.filter((it) => it.itemName && it.qty).length} item${returnItems.filter((it) => it.itemName && it.qty).length !== 1 ? "s" : ""})`}
            </button>
          </div>
        </div>
      )}

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
              Dispatch Records
            </h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {dispatch.length} records
            </span>
          </div>
          {dispatch.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No dispatch records yet.
            </div>
          )}
          {(dispatch || [])
            .slice()
            .reverse()
            .map((r) => {
              const totalQty = (r.items || []).reduce(
                (sum, it) => sum + +(it.qty || 0),
                0,
              );

              const handleEdit = () => {
                setEditId(r._id);
                setHeader({
                  dispatchDate: r.date
                    ? new Date(r.date).toISOString().slice(0, 10)
                    : today(),
                  soRef: r.soRef || "",
                  clientName: r.clientName || "",
                  deliveryAddress: r.deliveryAddress || "",
                  vehicleNo: r.vehicleNo || "",
                  driverName: r.driverName || "",
                  remarks: r.remarks || "",
                  status: r.status || "Dispatched",
                });
                setItems(
                  (r.items || []).map((it) => ({
                    _id: uid(),
                    itemName: it.itemName || "",
                    productCode: it.productCode || "",
                    clientCode: it.clientCode || "",
                    qty: it.qty?.toString() || "",
                    unit: it.unit || "nos",
                    pcsPerBox: it.pcsPerBox?.toString() || "",
                    noOfBox: it.noOfBox?.toString() || "",
                    rate: it.rate || "",
                    gstRate: it.gstRate || 18,
                    amount: it.amount || "",
                    taxAmount: it.taxAmount || "",
                    totalWithTax: it.totalWithTax || "",
                  })),
                );
                setView("form");
                window.scrollTo({ top: 0, behavior: "smooth" });
              };

              const handleDelete = async () => {
                if (!confirm(`Delete dispatch ${r.dispatchNo}?`)) return;
                try {
                  await dispatchAPI.delete(r._id);
                  toast(
                    `Dispatch ${r.dispatchNo} deleted successfully`,
                    "success",
                  );
                  fetchDispatches();
                } catch (error) {
                  toast(
                    error.response?.data?.error || "Failed to delete dispatch",
                    "error",
                  );
                }
              };

              return (
                <div
                  key={r._id}
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
                          fontFamily: "'JetBrains Mono',monospace",
                          color: r.type === "Return" ? (C.orange || "#f97316") : C.purple,
                          fontWeight: 700,
                        }}
                      >
                        {r.dispatchNo}
                      </span>
                      {r.type === "Return" && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: (C.orange || "#f97316") + "22", color: C.orange || "#f97316" }}>
                          ↩️ RETURN
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {fmtDate(r.date)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {r.companyName}
                      </span>
                      {r.returnReason && (
                        <span style={{ fontSize: 11, color: C.muted }}>Reason: {r.returnReason}</span>
                      )}
                      {r.type !== "Return" && <Badge text={r.status || "Dispatched"} color={C.green} />}
                      {(() => {
                        const unitSummary = (r.items || []).reduce(
                          (acc, it) => {
                            const u = it.unit || "nos";
                            acc[u] = (acc[u] || 0) + Number(it.qty || 0);
                            return acc;
                          },
                          {},
                        );
                        const summaryParts = Object.entries(unitSummary).map(
                          ([u, q]) => `${fmt(q)} ${u}`,
                        );
                        return (
                          <span style={{ fontSize: 12, color: C.muted }}>
                            Qty: {summaryParts.join(", ")}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => generateDispatchPDF(r)}
                        style={{
                          background: (C.purple || "#a855f7") + "22",
                          color: C.purple || "#a855f7",
                          border: "none",
                          borderRadius: 5,
                          padding: "4px 12px",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        🖨️ Print
                      </button>
                      <button
                        onClick={handleEdit}
                        style={{
                          background: (C.blue || "#3b82f6") + "22",
                          color: C.blue || "#3b82f6",
                          border: "none",
                          borderRadius: 5,
                          padding: "4px 12px",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={handleDelete}
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
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    {(r.items || []).map((it, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          background: C.surface,
                          border: `1px solid ${C.border}`,
                          borderRadius: 4,
                          padding: "2px 8px",
                          color: C.muted,
                        }}
                      >
                        {it.itemName} · {it.qty} {it.unit}
                      </span>
                    ))}
                    {r.vehicleNo && (
                      <span style={{ fontSize: 11, color: C.muted }}>
                        🚗 {r.vehicleNo}
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
