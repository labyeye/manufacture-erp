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
  Modal,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import {
  dispatchAPI,
  salesOrdersAPI,
  jobOrdersAPI,
  companyMasterAPI,
  categoryMasterAPI,
} from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const UNIT_OPTIONS = ["pcs", "kg"];

export default function Dispatch({
  fgStock = [],
  rawStock = [],
  consumableStock = [],
  itemMasterFG = [],
  priceList = [],
  toast,
  session,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) {
  const [dispatch, setDispatch] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [materialType, setMaterialType] = useState("FG");
  const blankHeader = {
    dispatchDate: today(),
    soRef: "",
    poNumber: "",
    companyName: "",
    clientCategory: "",
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
  const [companyMaster, setCompanyMaster] = useState([]);
  const [clientCategories, setClientCategories] = useState([]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
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
  const [recordsTab, setRecordsTab] = useState("dispatch");

  useEffect(() => {
    fetchDispatches();
    fetchSalesOrders();
    fetchJobOrders();
    fetchCompanies();
    fetchClientCategories();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await companyMasterAPI.getAll();
      const companies = Array.isArray(res) ? res : res?.companies || [];
      setCompanyMaster(companies);
      const fromCompanies = companies.map((c) => c.category).filter(Boolean);
      setClientCategories((prev) => {
        return [...new Set([...prev, ...fromCompanies])].sort();
      });
    } catch {
      // silently fail
    }
  };

  const fetchClientCategories = async () => {
    try {
      const res = await categoryMasterAPI.getAll();
      const list = Array.isArray(res) ? res : res?.categories || [];
      const fromCategoryMaster = list
        .filter((c) => c.type === "Client" && c.status !== "Inactive")
        .flatMap((c) => c.categories || [c.name])
        .filter(Boolean);
      setClientCategories((prev) => {
        const merged = [...new Set([...fromCategoryMaster, ...prev])].sort();
        return merged;
      });
    } catch {
      // silently fail
    }
  };

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

  const itemNameOptions = useMemo(() => {
    if (materialType === "RM")
      return (rawStock || []).map((s) => s.name).filter(Boolean);
    if (materialType === "CG")
      return (consumableStock || [])
        .map((s) => s.name || s.itemName)
        .filter(Boolean);
    return fgStockOptions;
  }, [materialType, fgStockOptions, rawStock, consumableStock]);

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
            const soSellingPrices = (priceList || []).filter(
              (p) =>
                p.listType === "selling" &&
                (p.status === "Active" || !p.status) &&
                (p.itemName === it.itemName ||
                  p.itemCode === (masterItem?.code || "")),
            );
            const priceEntry =
              soSellingPrices.find((p) => p.companyName === so.companyName) ||
              soSellingPrices.find((p) => !p.companyName) ||
              soSellingPrices[0];
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
              taxAmount: (() => {
                if (it.taxAmount && +it.taxAmount !== 0) return it.taxAmount;
                const amt = +(it.amount || 0);
                const gst = +(it.gstRate || 18);
                return amt > 0 ? ((amt * gst) / 100).toFixed(2) : 0;
              })(),
              totalWithTax: (() => {
                if (it.totalWithTax && +it.totalWithTax !== 0)
                  return it.totalWithTax;
                const amt = +(it.amount || 0);
                const gst = +(it.gstRate || 18);
                return amt > 0 ? (amt + (amt * gst) / 100).toFixed(2) : 0;
              })(),
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
        const selectedCompany = companyMaster.find(
          (c) => (c.name || "").toLowerCase() === (v || "").toLowerCase(),
        );
        if (selectedCompany?.category) {
          setHeader((f) => ({
            ...f,
            clientCategory: selectedCompany.category,
          }));
        }
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
        const masterItem = (itemMasterFG || []).find((m) => m.name === v);

        it.productCode =
          stock?.itemCode || stock?.code || masterItem?.code || "";
        it.unit = stock?.unit || it.unit || "nos";

        it.companyCode =
          masterItem && header.companyName
            ? masterItem.companyCodes?.[header.companyName] || ""
            : "";

        if (header.companyName) {
          const priceEntry = (priceList || []).find(
            (p) =>
              p.listType === "selling" &&
              (p.status === "Active" || !p.status) &&
              (p.itemName === v || p.itemCode === it.productCode) &&
              p.companyName === header.companyName,
          );
          if (priceEntry) {
            it.rate = priceEntry.unitPrice;
            it.gstRate = priceEntry.gstRate || it.gstRate || 18;
          }
        }
      }

      const qty = k === "qty" ? +v : +(it.qty || 0);
      const ppb = k === "pcsPerBox" ? +v : +(it.pcsPerBox || 0);
      const rate = k === "rate" ? +v : +(it.rate || 0);
      const gst = k === "gstRate" ? +v : +(it.gstRate || 0);

      if (k !== "noOfBox") {
        it.noOfBox =
          qty && ppb ? Math.ceil(qty / ppb).toString() : it.noOfBox || "";
      }
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
    if (!header.vehicleNo) he.vehicleNo = true;
    if (!header.companyName) {
      he.companyName = true;
    } else {
      const companyExists = companyMaster.some(
        (c) =>
          (c.name || "").toLowerCase() === header.companyName.toLowerCase(),
      );
      if (!companyExists) {
        he.companyName = true;
        toast(
          `Company "${header.companyName}" not found in Company Master`,
          "error",
        );
      }
    }
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (!it.itemName) e.itemName = true;
      if (!it.qty) e.qty = true;

      if (!editId) {
        let stockItem;
        let stockLabel;
        if (materialType === "RM") {
          stockItem = (rawStock || []).find(
            (s) => (s.name || s.itemName || "") === it.itemName,
          );
          stockLabel = "Raw Material Stock";
        } else if (materialType === "CG") {
          stockItem = (consumableStock || []).find(
            (s) => (s.name || s.itemName || "") === it.itemName,
          );
          stockLabel = "Consumable Stock";
        } else {
          stockItem = (fgStock || []).find((s) => s.itemName === it.itemName);
          stockLabel = "FG Stock";
        }
        if (!stockItem) {
          e.itemName = true;
          toast(`Item "${it.itemName}" not found in ${stockLabel}`, "error");
        } else if (
          Number(it.qty) > (stockItem.qty || stockItem.currentStock || 0)
        ) {
          e.qty = true;
          toast(
            `Insufficient stock for "${it.itemName}". Available: ${stockItem.qty || stockItem.currentStock || 0}`,
            "error",
          );
        }
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
        clientCategory: header.clientCategory,
        materialType,
        soRef: header.soRef,
        poNumber: header.poNumber,
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
      setShowModal(false);
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
                  <td style="text-align: center;">${it.noOfBox > 0 ? it.noOfBox : "—"}</td>
                  <td style="text-align: center;">${it.pcsPerBox > 0 ? it.pcsPerBox : "—"}</td>
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
        icon="fa-solid fa-truck-fast"
        title="Dispatch"
        sub="Record outgoing dispatches against sales orders"
      />

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {canCreate && (
          <button
            onClick={() => {
              setHeader(blankHeader);
              setItems([blankItem()]);
              setHeaderErrors({});
              setItemErrors([{}]);
              setEditId(null);
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
            + New Dispatch
          </button>
        )}
        {canCreate && (
          <button
            onClick={() => {
              setReturnHeader(blankReturnHeader);
              setReturnItems([blankItem()]);
              setShowReturnModal(true);
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
            Material Return
          </button>
        )}
      </div>

      {showModal && (
        <Modal
          title={editId ? "Edit Dispatch" : "New Dispatch"}
          onClose={() => {
            setShowModal(false);
            setEditId(null);
            setHeader(blankHeader);
            setItems([blankItem()]);
            setHeaderErrors({});
            setItemErrors([{}]);
          }}
        >
          <div>
            {}
            <Card style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.purple,
                  marginBottom: 14,
                }}
              >
                Dispatch Details
              </h3>

              {/* Material Type selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {[
                  { id: "FG", label: "Finished Goods", color: "#4ade80" },
                  { id: "RM", label: "Raw Material", color: "#60a5fa" },
                  { id: "CG", label: "Consumable", color: "#fb923c" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setMaterialType(t.id);
                      setItems([blankItem()]);
                    }}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 8,
                      border: `1.5px solid ${materialType === t.id ? t.color : "rgba(255,255,255,0.1)"}`,
                      background:
                        materialType === t.id ? t.color + "18" : "transparent",
                      color: materialType === t.id ? t.color : "#888",
                      fontWeight: materialType === t.id ? 700 : 500,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr",
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
                <Field label="PO Number">
                  <input
                    placeholder="Customer PO No."
                    value={header.poNumber}
                    onChange={(e) => setH("poNumber", e.target.value)}
                  />
                </Field>
                <Field label="Company Name *">
                  <AutocompleteInput
                    value={header.companyName}
                    onChange={(v) => setH("companyName", v)}
                    suggestions={companyMaster.map((c) => c.name)}
                    placeholder="Type to search company..."
                  />
                </Field>
                <Field label="Client Category">
                  <select
                    value={header.clientCategory}
                    onChange={(e) => setH("clientCategory", e.target.value)}
                  >
                    <option value="">-- Select Category --</option>
                    {clientCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Delivery Address">
                  <input
                    placeholder="Delivery address"
                    value={header.deliveryAddress}
                    onChange={(e) => setH("deliveryAddress", e.target.value)}
                  />
                </Field>
                <Field label="Vehicle No">
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
              <h3 style={{ fontSize: 14, fontWeight: 500, color: C.purple }}>
                Items ({items.length})
              </h3>
              <button
                onClick={addItem}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                + Add Item
              </button>
            </div>

            {}
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
                    style={{ fontWeight: 500, color: C.purple, fontSize: 13 }}
                  >
                    Item {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        background: "transparent",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.2)",
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
                    </button>
                  )}
                </div>

                {}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1.8fr 0.8fr 0.8fr 0.7fr 0.5fr 0.6fr 0.6fr 0.7fr 0.5fr 1fr",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <Field label="Item Name *">
                    <AutocompleteInput
                      value={it.itemName}
                      onChange={(v) => setItem(idx, "itemName", v)}
                      suggestions={itemNameOptions}
                      placeholder={
                        materialType === "RM"
                          ? "Type to search RM item..."
                          : materialType === "CG"
                            ? "Type to search consumable..."
                            : "Type to search FG item..."
                      }
                      inputStyle={EI(idx, "itemName")}
                    />
                    {EIMsg(idx, "itemName")}
                    {(() => {
                      let st;
                      if (materialType === "RM") {
                        st = (rawStock || []).find(
                          (s) => (s.name || s.itemName || "") === it.itemName,
                        );
                      } else if (materialType === "CG") {
                        st = (consumableStock || []).find(
                          (s) => (s.name || s.itemName || "") === it.itemName,
                        );
                      } else {
                        st = (fgStock || []).find(
                          (s) => s.itemName === it.itemName,
                        );
                      }
                      if (!it.itemName || !st) return null;
                      const avail = st.qty ?? st.currentStock ?? 0;
                      const isLow = avail < Number(it.qty || 0);
                      return (
                        <div
                          style={{
                            fontSize: 10,
                            color: isLow ? C.red : C.green,
                            marginTop: 4,
                            fontWeight: 500,
                          }}
                        >
                          Stock Available: {fmt(avail)} {st.unit || ""}
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
                      onChange={(e) =>
                        setItem(idx, "companyCode", e.target.value)
                      }
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
                      onChange={(e) =>
                        setItem(idx, "pcsPerBox", e.target.value)
                      }
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
                  fontWeight: 500,
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
        </Modal>
      )}

      {showReturnModal && (
        <Modal
          title="Material Return"
          onClose={() => {
            setShowReturnModal(false);
            setReturnHeader(blankReturnHeader);
            setReturnItems([blankItem()]);
          }}
        >
          <div>
            <Card style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.orange || "#f97316",
                  marginBottom: 18,
                }}
              >
                Material Return Details
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <Field label="Return Date *">
                  <input
                    type="date"
                    value={returnHeader.returnDate}
                    onChange={(e) =>
                      setReturnHeader((h) => ({
                        ...h,
                        returnDate: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Company Name *">
                  <AutocompleteInput
                    value={returnHeader.companyName}
                    onChange={(v) =>
                      setReturnHeader((h) => ({ ...h, companyName: v }))
                    }
                    suggestions={companyMaster.map((c) => c.name)}
                    placeholder="Type to search company..."
                  />
                </Field>
                <Field label="Original Dispatch Ref">
                  <AutocompleteInput
                    value={returnHeader.originalDispatchRef}
                    onChange={(v) => {
                      const ref = (v || "").split(" — ")[0].trim();
                      const orig = (dispatch || []).find(
                        (d) => d.dispatchNo === ref,
                      );
                      setReturnHeader((h) => ({
                        ...h,
                        originalDispatchRef: ref,
                        companyName: orig?.companyName || h.companyName,
                      }));
                      if (orig?.items?.length) {
                        setReturnItems(
                          orig.items.map((it) => ({
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
                          })),
                        );
                      }
                    }}
                    suggestions={(dispatch || [])
                      .filter((d) => d.type !== "Return")
                      .map(
                        (d) =>
                          `${d.dispatchNo} — ${d.companyName}${d.date ? " (" + new Date(d.date).toLocaleDateString("en-GB") + ")" : ""}`,
                      )}
                    placeholder="Search dispatch number / company..."
                  />
                </Field>
                <Field label="Vehicle No">
                  <input
                    placeholder="Vehicle number"
                    value={returnHeader.vehicleNo}
                    onChange={(e) =>
                      setReturnHeader((h) => ({
                        ...h,
                        vehicleNo: e.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: 14,
                }}
              >
                <Field label="Return Reason *">
                  <select
                    value={returnHeader.returnReason}
                    onChange={(e) =>
                      setReturnHeader((h) => ({
                        ...h,
                        returnReason: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- Select Reason --</option>
                    {[
                      "Quality Issue",
                      "Wrong Item",
                      "Excess Quantity",
                      "Damaged in Transit",
                      "Customer Rejection",
                      "Other",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Remarks">
                  <input
                    placeholder="Additional notes"
                    value={returnHeader.remarks}
                    onChange={(e) =>
                      setReturnHeader((h) => ({
                        ...h,
                        remarks: e.target.value,
                      }))
                    }
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
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.orange || "#f97316",
                }}
              >
                Return Items ({returnItems.length})
              </h3>
              <button
                onClick={() => setReturnItems((prev) => [...prev, blankItem()])}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                + Add Item
              </button>
            </div>

            {returnItems.map((it, idx) => (
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
                    style={{
                      fontWeight: 500,
                      color: C.orange || "#f97316",
                      fontSize: 13,
                    }}
                  >
                    Item {idx + 1}
                  </span>
                  {returnItems.length > 1 && (
                    <button
                      onClick={() =>
                        setReturnItems((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      style={{
                        background: "transparent",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.2)",
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
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr",
                    gap: 10,
                  }}
                >
                  <Field label="Item Name *">
                    <select
                      value={it.itemName}
                      onChange={(e) =>
                        setReturnItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            itemName: e.target.value,
                          };
                          return updated;
                        })
                      }
                    >
                      <option value="">-- Select Item --</option>
                      {(fgStock || []).map((s) => (
                        <option key={s._id || s.id} value={s.itemName}>
                          {s.itemName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Return Qty *">
                    <input
                      type="number"
                      placeholder="Qty being returned"
                      value={it.qty}
                      onChange={(e) =>
                        setReturnItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            qty: e.target.value,
                          };
                          return updated;
                        })
                      }
                    />
                  </Field>
                  <Field label="Unit">
                    <select
                      value={it.unit}
                      onChange={(e) =>
                        setReturnItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            unit: e.target.value,
                          };
                          return updated;
                        })
                      }
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Product Code">
                    <input
                      placeholder="Product code"
                      value={it.productCode}
                      onChange={(e) =>
                        setReturnItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            productCode: e.target.value,
                          };
                          return updated;
                        })
                      }
                    />
                  </Field>
                  <Field label="Rate (₹)">
                    <input
                      type="number"
                      value={it.rate || ""}
                      onChange={(e) =>
                        setReturnItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            rate: e.target.value,
                          };
                          return updated;
                        })
                      }
                    />
                  </Field>
                </div>
              </Card>
            ))}

            <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
              <button
                disabled={returnLoading}
                onClick={async () => {
                  if (!returnHeader.companyName) {
                    toast("Company name is required", "error");
                    return;
                  }
                  if (!returnHeader.returnReason) {
                    toast("Please select a return reason", "error");
                    return;
                  }
                  const validItems = returnItems.filter(
                    (it) => it.itemName && it.qty,
                  );
                  if (validItems.length === 0) {
                    toast("Add at least one item with quantity", "error");
                    return;
                  }

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
                    toast(
                      `Material Return ${res.dispatch?.dispatchNo} recorded — FG stock updated`,
                      "success",
                    );
                    setReturnHeader(blankReturnHeader);
                    setReturnItems([blankItem()]);
                    fetchDispatches();
                    setShowReturnModal(false);
                  } catch (err) {
                    toast(
                      err.response?.data?.error || "Failed to record return",
                      "error",
                    );
                  } finally {
                    setReturnLoading(false);
                  }
                }}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 6,
                  padding: "10px 24px",
                  fontWeight: 500,
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                  opacity: returnLoading ? 0.6 : 1,
                  fontSize: 13,
                  cursor: returnLoading ? "not-allowed" : "pointer",
                }}
              >
                {returnLoading
                  ? "Saving…"
                  : `Record Material Return (${returnItems.filter((it) => it.itemName && it.qty).length} item${returnItems.filter((it) => it.itemName && it.qty).length !== 1 ? "s" : ""})`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Card>
        {(() => {
          const dispatchRecords = (dispatch || [])
            .filter((d) => d.type !== "Return")
            .slice()
            .sort(
              (a, b) =>
                new Date(b.createdAt || b.date || 0) -
                new Date(a.createdAt || a.date || 0),
            );
          const returnRecords = (dispatch || [])
            .filter((d) => d.type === "Return")
            .slice()
            .sort(
              (a, b) =>
                new Date(b.createdAt || b.date || 0) -
                new Date(a.createdAt || a.date || 0),
            );
          const filteredDispatch = dispatchRecords.filter((r) => {
            if (filterCompany && r.companyName !== filterCompany) return false;
            if (filterVehicle && (r.vehicleNo || "") !== filterVehicle)
              return false;
            if (drDateFrom || drDateTo) {
              const d = r.date
                ? new Date(r.date).toISOString().slice(0, 10)
                : "";
              if (drDateFrom && d < drDateFrom) return false;
              if (drDateTo && d > drDateTo) return false;
            }
            return true;
          });
          const filteredReturn = returnRecords.filter((r) => {
            if (filterCompany && r.companyName !== filterCompany) return false;
            if (filterVehicle && (r.vehicleNo || "") !== filterVehicle)
              return false;
            if (drDateFrom || drDateTo) {
              const d = r.date
                ? new Date(r.date).toISOString().slice(0, 10)
                : "";
              if (drDateFrom && d < drDateFrom) return false;
              if (drDateTo && d > drDateTo) return false;
            }
            return true;
          });
          const activeRecords =
            recordsTab === "return" ? filteredReturn : filteredDispatch;
          const now = new Date();
          const thisMonthCount = dispatchRecords.filter((d) => {
            const dt = new Date(d.date || d.createdAt || 0);
            return (
              dt.getMonth() === now.getMonth() &&
              dt.getFullYear() === now.getFullYear()
            );
          }).length;
          const totalQty = dispatchRecords.reduce(
            (s, d) =>
              s +
              (d.items || []).reduce((si, it) => si + (Number(it.qty) || 0), 0),
            0,
          );
          const totalValue = dispatchRecords.reduce(
            (s, d) =>
              s +
              (d.items || []).reduce(
                (si, it) => si + (Number(it.totalWithTax) || 0),
                0,
              ),
            0,
          );
          const fmtLakh = (n) => {
            if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
            if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
            return `₹${fmt(Math.round(n))}`;
          };
          const statCards = [
            {
              label: "Total Dispatches",
              value: dispatchRecords.length,
              icon: "fa-solid fa-truck-fast",
            },
            {
              label: "This Month",
              value: thisMonthCount,
              icon: "fa-solid fa-calendar-days",
            },
            {
              label: "Total Qty",
              value: fmt(totalQty) + " pcs",
              icon: "fa-solid fa-boxes-stacked",
            },
            {
              label: "Total Value",
              value: fmtLakh(totalValue),
              icon: "fa-solid fa-indian-rupee-sign",
            },
          ];
          const tabBtn = (id, label, count) => (
            <button
              key={id}
              onClick={() => setRecordsTab(id)}
              style={{
                background:
                  recordsTab === id ? "rgba(128,130,255,0.12)" : "transparent",
                color: recordsTab === id ? "#8082ff" : C.muted,
                border: `1px solid ${recordsTab === id ? "#8082ff98" : "#2a2a2e"}`,
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i
                className={
                  id === "return"
                    ? "fa-solid fa-rotate-left"
                    : "fa-solid fa-truck-fast"
                }
              />
              {label}
              <span style={{ fontSize: 11, opacity: 0.85 }}>({count})</span>
            </button>
          );
          return (
            <>
              {/* Stat cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  marginBottom: 20,
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
                        style={{
                          color: C.muted,
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
                      style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  {tabBtn("dispatch", "Dispatch", dispatchRecords.length)}
                  {tabBtn("return", "Return", returnRecords.length)}
                </div>
                <DateRangeFilter
                  dateFrom={drDateFrom}
                  setDateFrom={setDrDateFrom}
                  dateTo={drDateTo}
                  setDateTo={setDrDateTo}
                />
                <AutocompleteInput
                  value={filterCompany}
                  onChange={(v) => setFilterCompany(v)}
                  suggestions={[
                    ...new Set(
                      (dispatch || [])
                        .map((r) => r.companyName)
                        .filter(Boolean),
                    ),
                  ].sort()}
                  placeholder="Filter by company..."
                  showAllOnFocus={true}
                  inputStyle={{
                    padding: "6px 10px",
                    background: "#0c0c0e",
                    border: "1px solid #2a2a2e",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    width: 180,
                  }}
                />
                <AutocompleteInput
                  value={filterVehicle}
                  onChange={(v) => setFilterVehicle(v)}
                  suggestions={[
                    ...new Set(
                      (dispatch || []).map((r) => r.vehicleNo).filter(Boolean),
                    ),
                  ].sort()}
                  placeholder="Filter by vehicle..."
                  showAllOnFocus={true}
                  inputStyle={{
                    padding: "6px 10px",
                    background: "#0c0c0e",
                    border: "1px solid #2a2a2e",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12,
                    width: 150,
                  }}
                />
                <span
                  style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}
                >
                  {activeRecords.length} records
                </span>
              </div>
              {activeRecords.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: C.muted,
                    padding: 32,
                    fontSize: 13,
                  }}
                >
                  {recordsTab === "return"
                    ? "No material return records yet."
                    : "No dispatch records yet."}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                        {(recordsTab === "return"
                          ? [
                              "DC No",
                              "Return Date",
                              "Company",
                              "Original Ref",
                              "Reason",
                              "Qty",
                              "Vehicle",
                              "Actions",
                            ]
                          : [
                              "DC No",
                              "Date",
                              "Company",
                              "PO No",
                              "SO Ref",
                              "Qty",
                              "Vehicle",
                              "Status",
                              "Actions",
                            ]
                        ).map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "8px 10px",
                              textAlign: "left",
                              fontWeight: 700,
                              color: C.muted,
                              fontSize: 11,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeRecords.map((r) => {
                        const unitSummary = (r.items || []).reduce(
                          (acc, it) => {
                            const u = it.unit || "nos";
                            acc[u] = (acc[u] || 0) + Number(it.qty || 0);
                            return acc;
                          },
                          {},
                        );
                        const qtySummary = Object.entries(unitSummary)
                          .map(([u, q]) => `${fmt(q)} ${u}`)
                          .join(", ");

                        const handleEdit = () => {
                          setEditId(r._id);
                          setHeader({
                            dispatchDate: r.date
                              ? new Date(r.date).toISOString().slice(0, 10)
                              : today(),
                            soRef: r.soRef || "",
                            poNumber: r.poNumber || "",
                            companyName: r.companyName || "",
                            clientCategory: r.clientCategory || "",
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
                              companyCode: it.companyCode || "",
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
                          setShowModal(true);
                        };

                        const handleDelete = async () => {
                          if (!confirm(`Delete dispatch ${r.dispatchNo}?`))
                            return;
                          try {
                            await dispatchAPI.delete(r._id);
                            toast(
                              `Dispatch ${r.dispatchNo} deleted successfully`,
                              "success",
                            );
                            fetchDispatches();
                          } catch (error) {
                            toast(
                              error.response?.data?.error ||
                                "Failed to delete dispatch",
                              "error",
                            );
                          }
                        };

                        const isReturn = r.type === "Return";
                        const dcNoCell = (
                          <td
                            style={{
                              padding: "10px 10px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                color: isReturn
                                  ? C.orange || "#f97316"
                                  : C.purple,
                                fontWeight: 600,
                              }}
                            >
                              {r.dispatchNo}
                            </span>
                          </td>
                        );
                        const dateCell = (
                          <td
                            style={{
                              padding: "10px 10px",
                              whiteSpace: "nowrap",
                              color: C.muted,
                            }}
                          >
                            {fmtDate(r.date)}
                          </td>
                        );
                        const companyCell = (
                          <td style={{ padding: "10px 10px", fontWeight: 600 }}>
                            {r.companyName}
                          </td>
                        );
                        const qtyCell = (
                          <td
                            style={{
                              padding: "10px 10px",
                              whiteSpace: "nowrap",
                              color: C.muted,
                            }}
                          >
                            {qtySummary}
                          </td>
                        );
                        const vehicleCell = (
                          <td style={{ padding: "10px 10px", color: C.muted }}>
                            {r.vehicleNo || "—"}
                          </td>
                        );
                        return (
                          <tr
                            key={r._id}
                            style={{ borderBottom: `1px solid ${C.border}22` }}
                          >
                            {dcNoCell}
                            {dateCell}
                            {companyCell}
                            {isReturn ? (
                              <>
                                <td
                                  style={{
                                    padding: "10px 10px",
                                    color: C.muted,
                                  }}
                                >
                                  {r.originalDispatchRef || "—"}
                                </td>
                                <td style={{ padding: "10px 10px" }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: C.orange || "#f97316",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {r.returnReason || "Return"}
                                  </span>
                                </td>
                                {qtyCell}
                                {vehicleCell}
                              </>
                            ) : (
                              <>
                                <td
                                  style={{
                                    padding: "10px 10px",
                                    color: C.muted,
                                  }}
                                >
                                  {r.poNumber || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "10px 10px",
                                    color: C.muted,
                                  }}
                                >
                                  {r.soRef || "—"}
                                </td>
                                {qtyCell}
                                {vehicleCell}
                                <td style={{ padding: "10px 10px" }}>
                                  <Badge
                                    text={r.status || "Dispatched"}
                                    color={C.green}
                                  />
                                </td>
                              </>
                            )}
                            <td
                              style={{
                                padding: "10px 10px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <div style={{ display: "flex", gap: 6 }}>
                                {canEdit && (
                                  <button
                                    onClick={handleEdit}
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
                                    <i className="fa-solid fa-pen-to-square" />{" "}
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => generateDispatchPDF(r)}
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
                                {canDelete && (
                                  <button
                                    onClick={handleDelete}
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
      </Card>
    </div>
  );
}
