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
import {
  salesOrdersAPI,
  clientMasterAPI,
  usersAPI,
  categoryMasterAPI,
} from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

/* ─── shared label style ─── */
const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: C.green || "#4ade80",
  textTransform: "uppercase",
  marginBottom: 14,
};

export default function SalesOrders({ sizeMaster = {}, toast }) {
  const [salesOrders, setSalesOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clientCategories, setClientCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const today_val = today();

  const blankHeader = {
    orderDate: today_val,
    deliveryDate: "",
    salesPerson: "",
    clientCategory: "",
    clientName: "",
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
    remarks: "",
  });

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");
  const [editId, setEditId] = useState(null);

  // Load data on mount
  useEffect(() => {
    fetchSalesOrders();
    fetchClients();
    fetchUsers();
    fetchCategories();
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

      // Extract unique client categories
      const uniqueCategories = [
        ...new Set((res.clients || []).map((c) => c.category).filter(Boolean)),
      ];
      setClientCategories(
        uniqueCategories.length > 0
          ? uniqueCategories
          : ["HP", "ZPL", "Others"],
      );
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

  const fetchCategories = async () => {
    try {
      const res = await categoryMasterAPI.getAll();
      // Filter only Finished Good categories
      const fgCats = (res || [])
        .filter(
          (cat) =>
            cat.type === "Finished Good" || cat.type === "Finished Goods",
        )
        .map((cat) => cat.name);
      setCategories(fgCats);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const salesPersons = useMemo(
    () =>
      users
        .filter((u) => u.role === "Sales" || u.role === "Admin")
        .map((u) => u.name),
    [users],
  );

  const generateItemName = (it) => {
    const parts = [it.itemCategory];

    // If has size, use it
    if (it.size) {
      parts.push(it.size);
    }
    // If has dimensions, build dimension string
    else if (it.width || it.length || it.height || it.gussett) {
      const dims = [];
      if (it.width) dims.push(it.width);
      if (it.gussett) dims.push(it.gussett);
      if (it.length) dims.push(it.length);
      if (it.height) dims.push(it.height);
      if (dims.length > 0) parts.push(`${dims.join("×")}inch`);
    }

    if (it.variant) parts.push(`(${it.variant})`);
    if (header.clientName) parts.push(`/ ${header.clientName}`);
    return parts.filter(Boolean).join(" ");
  };

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

  const submit = async () => {
    const he = {};
    if (!header.orderDate) he.orderDate = true;
    if (!header.deliveryDate) he.deliveryDate = true;
    if (!header.clientName) he.clientName = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (!it.itemCategory) e.itemCategory = true;
      // Require either size or at least one dimension
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
      fetchClients(); // Refresh clients as backend auto-creates them
    } catch (error) {
      toast(
        error.response?.data?.error || "Failed to save sales order",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ─── dimension fields helper ─── */
  const DimensionFields = ({ it, idx }) => {
    // Check if size master has sizes for this category
    const hasSize = (sizeMaster || {})[it.itemCategory]?.length > 0;

    if (hasSize) {
      return (
        <Field label="Size">
          <select
            value={it.size}
            onChange={(e) => setItem(idx, "size", e.target.value)}
            style={EI(idx, "size")}
          >
            <option value="">-- Select Size --</option>
            {((sizeMaster || {})[it.itemCategory] || []).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {EIMsg(idx, "size")}
        </Field>
      );
    }

    // Otherwise show dimension fields
    return (
      <>
        <Field label="Width (inch)">
          <input
            type="number"
            placeholder="Width"
            value={it.width}
            onChange={(e) => setItem(idx, "width", e.target.value)}
            style={EI(idx, "size")}
          />
        </Field>
        <Field label="Length (inch)">
          <input
            type="number"
            placeholder="Length"
            value={it.length}
            onChange={(e) => setItem(idx, "length", e.target.value)}
          />
        </Field>
        <Field label="Height (inch)">
          <input
            type="number"
            placeholder="Height"
            value={it.height}
            onChange={(e) => setItem(idx, "height", e.target.value)}
          />
        </Field>
        <Field label="Gussett (inch)">
          <input
            type="number"
            placeholder="Gussett (optional)"
            value={it.gussett}
            onChange={(e) => setItem(idx, "gussett", e.target.value)}
          />
        </Field>
        {EIMsg(idx, "size")}
      </>
    );
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="📋"
        title="Sales Orders"
        sub="Create and track customer sales orders"
      />

      {/* ── Tab buttons ── */}
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

      {/* ════════════════ FORM VIEW ════════════════ */}
      {view === "form" && (
        <div>
          {/* ── Order & Client Details Card ── */}
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

            {/* ORDER DETAILS sub-section */}
            <div style={sectionLabelStyle}>Order Details</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <Field label="Order Date *">
                <DatePicker
                  value={header.orderDate}
                  onChange={(v) => setH("orderDate", v)}
                  style={EH("orderDate")}
                />
                {EHMsg("orderDate")}
              </Field>
              <Field label="Delivery Date *">
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
                  <option value="Direct Order">Direct Order</option>
                  {salesPersons.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* CLIENT DETAILS sub-section */}
            <div style={sectionLabelStyle}>Client Details</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 2fr",
                gap: 14,
              }}
            >
              <Field label="Client Category">
                <AutocompleteInput
                  value={header.clientCategory}
                  onChange={(v) => setH("clientCategory", v)}
                  suggestions={clientCategories}
                  placeholder="Select or type new category"
                />
              </Field>
              <Field label="Client Name *">
                <AutocompleteInput
                  value={header.clientName}
                  onChange={(v) => setH("clientName", v)}
                  suggestions={clients.map((c) => c.name)}
                  placeholder="Client / Company name"
                  inputStyle={EH("clientName")}
                />
                {EHMsg("clientName")}
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

          {/* ── Order Items header row ── */}
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

          {/* ── Item cards ── */}
          {items.map((it, idx) => (
            <Card
              key={it._id}
              style={{
                marginBottom: 12,
                borderLeft: `3px solid ${C.green || "#4ade80"}`,
              }}
            >
              {/* Item header */}
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

              {/* Row 1: Product Code | Category | Variant | Order Qty | Price | Amount */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.5fr 1.2fr 1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Field label="Product Code">
                  <input
                    type="text"
                    placeholder="Type or select code (optional)"
                    value={it.productCode}
                    onChange={(e) =>
                      setItem(idx, "productCode", e.target.value)
                    }
                  />
                </Field>
                <Field label="Category *">
                  <select
                    value={it.itemCategory}
                    onChange={(e) =>
                      setItem(idx, "itemCategory", e.target.value)
                    }
                    style={EI(idx, "itemCategory")}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {EIMsg(idx, "itemCategory")}
                </Field>
                <Field label="Variant / Colour">
                  <input
                    placeholder="e.g. Blue, Yellow, Plain (optional)"
                    value={it.variant}
                    onChange={(e) => setItem(idx, "variant", e.target.value)}
                  />
                </Field>
                <Field label="Order Quantity *">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={it.orderQty}
                    onChange={(e) => setItem(idx, "orderQty", e.target.value)}
                    style={EI(idx, "orderQty")}
                  />
                  {EIMsg(idx, "orderQty")}
                </Field>
                <Field label="Price (₹)">
                  <input
                    type="number"
                    placeholder="Price per unit"
                    value={it.price}
                    onChange={(e) => setItem(idx, "price", e.target.value)}
                    style={EI(idx, "price")}
                  />
                  {EIMsg(idx, "price")}
                </Field>
                <Field label="Amount (₹)">
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
              </div>

              {/* Row 2 (conditional): dimension fields if category chosen */}
              {it.itemCategory && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <DimensionFields it={it} idx={idx} />
                </div>
              )}

              {/* Row 3: Item Name (auto) | Item Remarks */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field label="Item Name">
                  <input
                    readOnly
                    placeholder="— Auto-filled from category + size + client —"
                    value={it.itemName}
                    style={{ color: C.muted, cursor: "default" }}
                  />
                </Field>
                <Field label="Item Remarks">
                  <input
                    placeholder="Special instructions for this item (optional)"
                    value={it.remarks}
                    onChange={(e) => setItem(idx, "remarks", e.target.value)}
                  />
                </Field>
              </div>
            </Card>
          ))}

          {/* ── Bottom action row ── */}
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

      {/* ════════════════ RECORDS VIEW ════════════════ */}
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
              Sales Orders
            </h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {salesOrders.length} orders
            </span>
          </div>

          {salesOrders.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
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
              const handleEdit = async (so) => {
                setEditId(so._id);
                setHeader({
                  orderDate: new Date(so.orderDate).toISOString().slice(0, 10),
                  deliveryDate: new Date(so.deliveryDate)
                    .toISOString()
                    .slice(0, 10),
                  salesPerson: so.salesPerson || "",
                  clientCategory: so.clientCategory || "",
                  clientName: so.clientName,
                  remarks: so.remarks || "",
                  status: so.status,
                });
                setItems(
                  so.items.map((it) => ({
                    _id: it._id || uid(),
                    productCode: it.productCode || "",
                    itemCategory: it.itemCategory,
                    itemName: it.itemName,
                    size: it.size || "",
                    variant: it.variant || "",
                    width: it.width || "",
                    length: it.length || "",
                    height: it.height || "",
                    gussett: it.gussett || "",
                    uom: it.uom || "nos",
                    orderQty: it.orderQty,
                    price: it.price,
                    amount: it.amount,
                    remarks: it.remarks || "",
                  })),
                );
                setView("form");
                window.scrollTo({ top: 0, behavior: "smooth" });
              };

              const handleDelete = async (id) => {
                if (!confirm("Delete this sales order?")) return;
                try {
                  await salesOrdersAPI.delete(id);
                  toast("Sales order deleted successfully", "success");
                  fetchSalesOrders();
                } catch (error) {
                  toast(
                    error.response?.data?.error ||
                      "Failed to delete sales order",
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
                          fontFamily: "'JetBrains Mono', monospace",
                          color: C.blue,
                          fontWeight: 700,
                        }}
                      >
                        {r.soNo}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        {new Date(r.orderDate).toISOString().slice(0, 10)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {r.clientName}
                      </span>
                      <Badge
                        text={r.status}
                        color={r.status === "Open" ? C.yellow : C.green}
                      />
                      {total > 0 && (
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: C.green || "#4ade80",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ₹{fmt(total)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleEdit(r)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 4,
                          border: `1px solid ${C.blue}`,
                          background: C.blue + "22",
                          color: C.blue,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 4,
                          border: `1px solid ${C.red}`,
                          background: C.red + "22",
                          color: C.red,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        🗑️
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
                        {it.itemCategory}{" "}
                        {it.size || it.width ? `· ${it.size || it.width}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </Card>
      )}
    </div>
  );
}
