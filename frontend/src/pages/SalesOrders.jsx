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
  clientMasterAPI,
  usersAPI,
  categoryMasterAPI,
} from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
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
    clientMaster = [],
  } = props;
  const [salesOrders, setSalesOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientCategories, setClientCategories] = useState([]);
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
    clientCategory: "",
    clientName: "",
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
    uom: "nos",
    orderQty: "",
    price: "",
    amount: "",
    itemName: "",
    clientName: "",
    remarks: "",
  });

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
    fetchClients();
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

  const fetchClients = async () => {
    try {
      const res = await clientMasterAPI.getAll();
      setClients(res.clients || []);

      setClientCategories(["HP", "ZPL", "Others"]);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      setClientCategories(["HP", "ZPL", "Others"]);
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

    if (it.size) {
      parts.push(it.size);
    } else if (it.width || it.length || it.height || it.gussett) {
      const dims = [];
      if (it.width) dims.push(it.width);
      if (it.gussett) dims.push(it.gussett);
      if (it.length) dims.push(it.length);
      if (it.height) dims.push(it.height);
      if (dims.length > 0) parts.push(`${dims.join("×")}inch`);
    }

    if (it.clientName) parts.push(it.clientName);
    else if (h.clientName) parts.push(h.clientName);

    if (it.variant) parts.push(it.variant);

    return parts.filter(Boolean).join(" ");
  };

  const setH = (k, v) => {
    let nextH;
    setHeader((f) => {
      const next = { ...f, [k]: v };
      if (k === "clientName") {
        const found = clientMaster.find((c) => c.name === v);
        if (found) {
          next.clientContact = found.phone || found.whatsapp || "";
        }
      }
      nextH = next;
      return next;
    });
    setHeaderErrors((e) => ({ ...e, [k]: false }));

    if (k === "clientName") {
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
            uom: found.uom || it.uom || "nos",
            clientName: found.clientName || "",
            itemName: found.name || it.itemName,
          };
        }
      }

      const orderQty = k === "orderQty" ? +v : +(it.orderQty || 0);
      const price = k === "price" ? +v : +(it.price || 0);
      it.amount = orderQty && price ? (orderQty * price).toFixed(2) : "";
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
      clientCategory: so.clientCategory || "",
      clientName: so.clientName,
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
        uom: it.uom || "nos",
        orderQty: it.orderQty || 0,
        price: it.price || 0,
        amount: it.amount || 0,
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
    if (!header.clientName) he.clientName = true;
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
        clientCategory: header.clientCategory,
        clientName: header.clientName,
        remarks: header.remarks,
        items: items.map((it) => ({
          productCode: it.productCode,
          itemCategory: it.itemCategory,
          itemName: it.itemName,
          size: it.size,
          variant: it.variant,
          width: it.width ? Number(it.width) : undefined,
          length: it.length ? Number(it.length) : undefined,
          height: it.height ? Number(it.height) : undefined,
          gussett: it.gussett ? Number(it.gussett) : undefined,
          uom: it.uom,
          orderQty: Number(it.orderQty),
          price: Number(it.price),
          amount: Number(it.amount),
          remarks: it.remarks,
        })),
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
      fetchClients();
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
              <Field label="Client Category">
                <select
                  value={header.clientCategory}
                  onChange={(e) => setH("clientCategory", e.target.value)}
                >
                  <option value="">-- All Categories --</option>
                  {uniqueClientCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client Name *">
                <AutocompleteInput
                  value={header.clientName}
                  onChange={(v) => setH("clientName", v)}
                  suggestions={
                    header.clientCategory
                      ? clientMaster
                          .filter((c) => c.category === header.clientCategory)
                          .map((c) => c.name)
                      : clientMaster.map((c) => c.name)
                  }
                  placeholder="Type to search..."
                  inputStyle={EH("clientName")}
                />
                {EHMsg("clientName")}
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

              {/* Row 1: Core Identifiers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.5fr 1.2fr 1.5fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Field label="PRODUCT CODE">
                  <AutocompleteInput
                    value={it.productCode}
                    onChange={(v) => setItem(idx, "productCode", v)}
                    suggestions={sortedFGItems.map((f) => `${f.code} — ${f.name}`)}
                    placeholder="Search FG code..."
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
                <Field label="SIZE *">
                  <select
                    value={it.size}
                    onChange={(e) => setItem(idx, "size", e.target.value)}
                    style={EI(idx, "size")}
                  >
                    <option value="">-- Select Size --</option>
                    {(subTypeMap[it.itemCategory] || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {EIMsg(idx, "size")}
                </Field>
                <Field label="VARIANT / COLOUR">
                  <input
                    placeholder="e.g. Blue, Yellow, Plain (optional)"
                    value={it.variant}
                    onChange={(e) => setItem(idx, "variant", e.target.value)}
                  />
                </Field>
                <Field label="ORDER QUANTITY *">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={it.orderQty}
                    onChange={(e) => setItem(idx, "orderQty", e.target.value)}
                    style={EI(idx, "orderQty")}
                  />
                  {EIMsg(idx, "orderQty")}
                </Field>
              </div>

              {/* Row 2: Pricing & Display Name */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 2.5fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
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
                <Field label="ITEM NAME">
                  <input
                    readOnly
                    placeholder="— Auto-filled from category + size + client —"
                    value={it.itemName}
                    style={{
                      color: it.itemName ? C.green || "#4ade80" : C.muted,
                      cursor: "default",
                      fontWeight: it.itemName ? 600 : 400,
                    }}
                  />
                </Field>
              </div>

              {/* Row 3: Remarks */}
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
                  padding: "9px 16px",
                  background: (C.green || "#4ade80") + "22",
                  border: `1px solid ${C.green || "#4ade80"}44`,
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12, color: C.muted }}>Total: </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    color: C.green || "#4ade80",
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
                  {/* Card Header */}
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
                        {r.clientName} ·{" "}
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
                          background: "#3e1a1a",
                          color: "#ef4444",
                          border: "1px solid #7f1d1d",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Items List Table-like */}
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
                            {fmt(it.orderQty)} {it.uom}
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

                  {/* Footer Info */}
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
