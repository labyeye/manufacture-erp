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

const LOCATIONS = [
  "Main Warehouse",
  "Factory Store",
  "Raw Material Godown",
  "Finished Goods Store",
];

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
}) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const today = () => new Date().toISOString().split("T")[0];
  const uid = () => Math.random().toString(36).substr(2, 9);
  const fmt = (n) => (+n || 0).toLocaleString("en-IN");

  // Removed static constants - now using CategoryMaster API data

  const blankHeader = {
    date: today(),
    vendorName: "",
    invoiceNo: "",
    vehicleNo: "",
    location: "",
    receivedBy: "",
    remarks: "",
    poRef: "",
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

  // Get Raw Material items from CategoryMaster + ItemMaster
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
              return {
                ...blankItem,
                _id: uid(),
                materialType: "Raw Material",
                category: pit.category || "",
                subCategory: pit.paperType || "",
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
                gsm: pit.gsm || "",
                weight: pit.weight || "",
                rate: pit.rate || "",
                itemName: pit.itemName || "",
                qty: pit.qty || "",
                unit: pit.unit || "kg",
                productCode: pit.productCode || "",
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
        let masterItem = itemMasterItems.find(
          (x) => (x.code || "").toLowerCase() === v.toLowerCase(),
        );

        if (!masterItem) {
          masterItem = (itemMasterFG["Raw Material"] || []).find(
            (x) => (x.code || "").toLowerCase() === v.toLowerCase(),
          );
        }

        if (masterItem) {
          const name = masterItem.name || "";
          it.itemName = masterItem.name;
          it.materialType = masterItem.type || "Raw Material";

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
        if (it.category === "Paper Sheets" && !it.noOfSheets)
          e.noOfSheets = true;
        if (!it.weight) e.weight = true;
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
                  {(purchaseOrders || [])
                    .filter((p) => p.status !== "Received")
                    .map((p) => (
                      <option key={p.poNo} value={p.poNo}>
                        {p.poNo} — {p.vendorName}
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
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
                    <Field label="Item Name" span={2}>
                      <input
                        readOnly
                        placeholder="Auto-filled from material details"
                        value={it.itemName || ""}
                        style={{ background: C.border + "22", fontSize: 13 }}
                      />
                    </Field>
                  </>
                )}
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
              GRN Records
            </h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {inward.length} records
            </span>
          </div>
          {inward.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No inward records yet.
            </div>
          )}
          {(inward || [])
            .slice()
            .reverse()
            .map((r) => {
              const total = (r.items || []).reduce(
                (s, it) => s + +(it.amount || 0),
                0,
              );
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
                        {r.inwardNo}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {formatDateForInput(r.inwardDate)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {r.vendorName}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        Inv: {r.invoiceNo}
                      </span>
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleEdit(r)}
                        disabled={loading}
                        style={{
                          background: C.blue + "22",
                          color: C.blue,
                          border: "none",
                          borderRadius: 5,
                          padding: "4px 12px",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        disabled={loading}
                        style={{
                          background: C.red + "22",
                          color: C.red,
                          border: "none",
                          borderRadius: 5,
                          padding: "4px 12px",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        ✕ Delete
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
                        {it.rmItem} {it.weight ? `· ${it.weight}kg` : ""}{" "}
                        {it.noOfSheets ? `· ${it.noOfSheets} sheets` : ""}
                      </span>
                    ))}
                    {r.location && (
                      <span style={{ fontSize: 11, color: C.muted }}>
                        📍 {r.location}
                      </span>
                    )}
                    {r.receivedBy && (
                      <span style={{ fontSize: 11, color: C.muted }}>
                        👤 {r.receivedBy}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </Card>
      )}

      {}
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
