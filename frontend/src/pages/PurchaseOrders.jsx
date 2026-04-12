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
  itemMasterFG = {},
  toast,
}) {
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
    itemName: "",
    size: "",
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchPOs();
    fetchItemMaster();
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

  // Get Raw Material items from CategoryMaster + ItemMaster items
  const rmItems = useMemo(() => {
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );
    const fromMaster =
      rmCat && rmCat.subTypes ? Object.keys(rmCat.subTypes) : [];

    const fromItems = itemMasterItems
      .filter(
        (it) =>
          it.type === "Raw Material" || it.materialType === "Raw Material",
      )
      .map((it) => it.category)
      .filter(Boolean);

    return [...new Set([...fromMaster, ...fromItems])].map((k) => k.trim());
  }, [categoryMaster, itemMasterItems]);

  // Get paper types (subtypes) for selected RM Item
  const subCategoriesByItem = useMemo(() => {
    const result = {};
    const rmCat = Object.values(categoryMaster || {}).find(
      (c) => (c.type || "").trim().toLowerCase() === "raw material",
    );

    rmItems.forEach((item) => {
      const fromMaster =
        (rmCat && rmCat.subTypes ? rmCat.subTypes[item] : []) || [];
      const fromItems = itemMasterItems
        .filter(
          (it) =>
            (it.type === "Raw Material" ||
              it.materialType === "Raw Material") &&
            it.category === item,
        )
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

  const setH = (k, v) => {
    setHeader((f) => ({ ...f, [k]: v }));
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

            // Fallback for older items
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

      it.itemName =
        isRM && !it.productCode ? computeRMItemName(it) : it.itemName;
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
    if (!header.poDate) he.poDate = true;
    if (!header.deliveryDate) he.deliveryDate = true;
    if (!header.vendorName) he.vendorName = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      const isRM = it.materialType === "Raw Material" || !it.materialType;
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
        poNo: header.poNumber, // Backend will auto-generate if empty or old format
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
            width: it.widthMm,
            length: it.lengthMm,
            sheetSize: `${it.widthMm}${it.lengthMm ? "x" + it.lengthMm : ""}mm`,
            unit: isRM ? "kg" : "pcs",
            qty: isRM ? it.weight : it.qty,
            weight: isRM ? it.weight : null,
            noOfSheets: it.noOfSheets ? Number(it.noOfSheets) : null,
            rate: it.rate,
            amount: (isRM ? it.weight : it.qty) * it.rate || 0,
          };

        }),
        deliveryDate: header.deliveryDate,
        remarks: header.remarks,
      };

      if (editingId) {
        result = await purchaseOrdersAPI.update(editingId, poData);
        setSuccessMessage("Purchase Order updated successfully!");
      } else {
        result = await purchaseOrdersAPI.create(poData);
        setSuccessMessage(
          `Purchase Order ${result.purchaseOrder.poNo} created successfully!`,
        );
      }

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setEditingId(null);

        fetchPOs();
        setHeader(blankHeader);
        setItems([blankItem()]);
        setHeaderErrors({});
        setItemErrors([{}]);
        setView("records");
      }, 2000);
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
      vendorContact: typeof po.vendor === "object" ? po.vendor.contact : "",
      poStatus: po.status || "Open",
      remarks: po.remarks || "",
    });
    setItems(
      (po.items || []).map((it) => ({
        _id: uid(),
        materialType: "Raw Material",
        itemName: it.itemName || "",
        productCode: it.productCode || "",
        category: it.category || "",
        subCategory: it.paperType || "",
        gsm: it.gsm || "",
        splitSize: it.sheetSize || "",
        widthMm:
          it.width ||
          (it.sheetSize ? it.sheetSize.split("x")[0].replace("mm", "") : ""),
        lengthMm:
          it.length ||
          (it.sheetSize ? it.sheetSize.split("x")[1]?.replace("mm", "") : ""),
        qty: it.qty || "",
        weight: it.weight || "",
        rate: it.rate || "",
        amount: it.amount || "",
        noOfSheets: it.qty || "",
        noOfReels: "",
        size: "",
      })),
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
                  onChange={(v) => setH("vendorName", v)}
                  suggestions={(vendorMaster || []).map((v) => v.name)}
                  placeholder="Supplier name"
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <Field label="Product Code">
                  <AutocompleteInput
                    value={it.productCode}
                    onChange={(v) => setItem(idx, "productCode", v)}
                    suggestions={sortedItemMasterItems.map(
                      (item) => `${item.code} — ${item.name}`,
                    )}
                    placeholder="Type or select code"
                  />
                </Field>
                <Field label="Item Name">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={it.itemName}
                    onChange={(e) => setItem(idx, "itemName", e.target.value)}
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
                        placeholder="700"
                        value={it.widthMm}
                        onChange={(e) =>
                          setItem(idx, "widthMm", e.target.value)
                        }
                        style={EI(idx, "widthMm")}
                      />
                      {EIMsg(idx, "widthMm")}
                    </Field>
                    <Field label="Length (mm)">
                      <input
                        type="number"
                        placeholder="1000"
                        value={it.lengthMm}
                        onChange={(e) =>
                          setItem(idx, "lengthMm", e.target.value)
                        }
                      />
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

                      <Field label="# of Sheets">
                        <input
                          type="number"
                          placeholder="No. of sheets"
                          value={it.noOfSheets}
                          onChange={(e) =>
                            setItem(idx, "noOfSheets", e.target.value)
                          }
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
                {it.materialType === "Consumable" && (
                  <>
                    <Field label="Item Name *">
                      <input
                        placeholder="e.g. Corrugated Box"
                        value={it.itemName}
                        onChange={(e) =>
                          setItem(idx, "itemName", e.target.value)
                        }
                        style={EI(idx, "itemName")}
                      />
                      {EIMsg(idx, "itemName")}
                    </Field>
                    <Field label="Quantity *">
                      <input
                        type="number"
                        placeholder="Qty in units"
                        value={it.qty}
                        onChange={(e) => setItem(idx, "qty", e.target.value)}
                        style={EI(idx, "qty")}
                      />
                      {EIMsg(idx, "qty")}
                    </Field>
                  </>
                )}
                <Field
                  label={`Rate (₹/${it.materialType === "Raw Material" || !it.materialType ? "kg" : "unit"}) *`}
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
                <Field label="Amount (₹)">
                  <div
                    style={{
                      padding: "9px 12px",
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      color: it.amount ? C.green : C.muted,
                      fontWeight: it.amount ? 700 : 400,
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {it.amount ? (
                      `₹${fmt(+it.amount)}`
                    ) : (
                      <span style={{ fontSize: 11, color: C.muted }}>
                        —{" "}
                        {it.materialType === "Raw Material" || !it.materialType
                          ? "Wt"
                          : "Qty"}{" "}
                        × Rate —
                      </span>
                    )}
                  </div>
                </Field>
              </div>
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
                  padding: "9px 16px",
                  background: C.green + "22",
                  border: `1px solid ${C.green}44`,
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12, color: C.muted }}>Total: </span>
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
              Purchase Orders
            </h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {purchaseOrders.length} orders
            </span>
          </div>
          {purchaseOrders.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No purchase orders yet.
            </div>
          )}
          {(purchaseOrders || [])
            .slice()
            .reverse()
            .map((r) => {
              const total = (r.items || []).reduce(
                (s, it) => s + +(it.amount || 0),
                0,
              );
              const vendorDisplayName =
                typeof r.vendor === "object" ? r.vendor.name : r.vendorName;
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
                          color: C.blue,
                          fontWeight: 700,
                        }}
                      >
                        {r.poNo}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {r.poDate}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {vendorDisplayName}
                      </span>
                      <Badge
                        text={r.status || "Open"}
                        color={r.status === "Open" ? C.yellow : C.green}
                      />
                      {total > 0 && (
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            color: C.green,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ₹{fmt(total)}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(r)}
                        style={{
                          background: "none",
                          border: "none",
                          color: C.blue,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 8px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: C.red,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 8px",
                        }}
                      >
                        Delete
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
                        {it.itemName}{" "}
                        {it.weight
                          ? `· ${it.weight}kg`
                          : it.qty
                            ? `· ${it.qty}`
                            : ""}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </Card>
      )}

      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 40,
              textAlign: "center",
              maxWidth: 300,
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div style={{ fontSize: 50, marginBottom: 16 }}>✓</div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: C.green,
                margin: 0,
              }}
            >
              {successMessage}
            </p>
          </div>
          <style>{`
            @keyframes scaleIn {
              from {
                transform: scale(0.8);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
