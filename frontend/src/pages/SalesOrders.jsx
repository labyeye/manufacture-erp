import React, { useState, useMemo } from "react";
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

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const FG_SIZE_CLIENT_CATS = ["Paper Cup", "Bowl", "Tray", "Plate", "Container"];
const FG_BOX_CATS = ["Cake Box", "Food Box", "Printed Box"];
const FG_FLAT_CATS = ["Insert", "Flat Item", "Label"];
const FG_BAG_CATS = ["Paper Bag with Handle", "Paper Bag", "Gusseted Bag"];
const FG_WRAP_CATS = ["Wrapping Paper", "Tissue Paper", "Kraft Paper Wrap"];

/* ─── shared label style ─── */
const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: C.green || "#4ade80",
  textTransform: "uppercase",
  marginBottom: 14,
};

export default function SalesOrders({
  salesOrders = [],
  setSalesOrders,
  sizeMaster = {},
  categoryMaster = {},
  clientMaster = [],
  setClientMaster,
  itemMasterFG = {},
  setItemMasterFG,
  soCounter = 0,
  setSoCounter,
  toast,
}) {
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

  const fgCategories = useMemo(
    () =>
      (categoryMaster && categoryMaster["Finished Goods"]) || [
        ...FG_SIZE_CLIENT_CATS,
        ...FG_BOX_CATS,
        ...FG_FLAT_CATS,
        ...FG_BAG_CATS,
        ...FG_WRAP_CATS,
      ],
    [categoryMaster],
  );

  const generateItemName = (it) => {
    const parts = [it.itemCategory];
    if (FG_SIZE_CLIENT_CATS.includes(it.itemCategory) && it.size) {
      parts.push(it.size);
    } else if (
      FG_BOX_CATS.includes(it.itemCategory) &&
      it.width &&
      it.length &&
      it.height
    ) {
      parts.push(`${it.width}×${it.length}×${it.height}inch`);
    } else if (
      FG_FLAT_CATS.includes(it.itemCategory) &&
      it.width &&
      it.length
    ) {
      parts.push(`${it.width}×${it.length}inch`);
    } else if (
      FG_BAG_CATS.includes(it.itemCategory) &&
      it.width &&
      it.gussett &&
      it.height
    ) {
      parts.push(`${it.width}×${it.gussett}×${it.height}inch`);
    } else if (
      FG_WRAP_CATS.includes(it.itemCategory) &&
      it.width &&
      it.height
    ) {
      parts.push(`${it.width}×${it.height}inch`);
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

  const submit = () => {
    const he = {};
    if (!header.orderDate) he.orderDate = true;
    if (!header.deliveryDate) he.deliveryDate = true;
    if (!header.clientCategory) he.clientCategory = true;
    if (!header.clientName) he.clientName = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (!it.itemCategory) e.itemCategory = true;
      if (FG_SIZE_CLIENT_CATS.includes(it.itemCategory) && !it.size)
        e.size = true;
      if (
        FG_BOX_CATS.includes(it.itemCategory) &&
        (!it.width || !it.length || !it.height)
      )
        e.dimensions = true;
      if (FG_FLAT_CATS.includes(it.itemCategory) && (!it.width || !it.length))
        e.dimensions = true;
      if (
        FG_BAG_CATS.includes(it.itemCategory) &&
        (!it.width || !it.gussett || !it.height)
      )
        e.dimensions = true;
      if (FG_WRAP_CATS.includes(it.itemCategory) && (!it.width || !it.height))
        e.dimensions = true;
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

    const soNo = `SO-${String(soCounter + 1).padStart(5, "0")}`;
    const entry = { ...header, id: uid(), soNo, items };
    setSalesOrders((p) => [...p, entry]);
    setSoCounter((c) => c + 1);

    if (
      clientMaster &&
      !clientMaster.find((c) => c.name === header.clientName)
    ) {
      setClientMaster((p) => [
        ...p,
        {
          id: uid(),
          name: header.clientName,
          category: header.clientCategory,
          status: "Active",
        },
      ]);
    }

    items.forEach((it) => {
      if (!itemMasterFG["Finished Goods"]) itemMasterFG["Finished Goods"] = [];
      const exists = itemMasterFG["Finished Goods"].find(
        (x) => x.name === it.itemName,
      );
      if (!exists) {
        setItemMasterFG((prev) => ({
          ...prev,
          "Finished Goods": [
            ...(prev["Finished Goods"] || []),
            {
              id: uid(),
              code: "",
              name: it.itemName,
              category: it.itemCategory,
              size: it.size,
              status: "Active",
            },
          ],
        }));
      }
    });

    toast(`Sales Order ${soNo} created`, "success");
    setHeader(blankHeader);
    setItems([blankItem()]);
    setHeaderErrors({});
    setItemErrors([{}]);
  };

  /* ─── dimension fields helper ─── */
  const DimensionFields = ({ it, idx }) => {
    if (FG_SIZE_CLIENT_CATS.includes(it.itemCategory)) {
      return (
        <Field label="Size *">
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
    if (FG_BOX_CATS.includes(it.itemCategory)) {
      return (
        <>
          <Field label="Width (inch) *">
            <input
              type="number"
              placeholder="e.g. 8"
              value={it.width}
              onChange={(e) => setItem(idx, "width", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
          <Field label="Length (inch) *">
            <input
              type="number"
              placeholder="e.g. 8"
              value={it.length}
              onChange={(e) => setItem(idx, "length", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
          <Field label="Height (inch) *">
            <input
              type="number"
              placeholder="e.g. 5"
              value={it.height}
              onChange={(e) => setItem(idx, "height", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
        </>
      );
    }
    if (FG_FLAT_CATS.includes(it.itemCategory)) {
      return (
        <>
          <Field label="Width (inch) *">
            <input
              type="number"
              placeholder="e.g. 10"
              value={it.width}
              onChange={(e) => setItem(idx, "width", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
          <Field label="Length (inch) *">
            <input
              type="number"
              placeholder="e.g. 14"
              value={it.length}
              onChange={(e) => setItem(idx, "length", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
        </>
      );
    }
    if (FG_BAG_CATS.includes(it.itemCategory)) {
      return (
        <>
          <Field label="Width (inch) *">
            <input
              type="number"
              placeholder="e.g. 9"
              value={it.width}
              onChange={(e) => setItem(idx, "width", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
          <Field label="Gussett (inch) *">
            <input
              type="number"
              placeholder="e.g. 6"
              value={it.gussett}
              onChange={(e) => setItem(idx, "gussett", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
          <Field label="Height (inch) *">
            <input
              type="number"
              placeholder="e.g. 12"
              value={it.height}
              onChange={(e) => setItem(idx, "height", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
        </>
      );
    }
    if (FG_WRAP_CATS.includes(it.itemCategory)) {
      return (
        <>
          <Field label="Width (inch) *">
            <input
              type="number"
              placeholder="e.g. 20"
              value={it.width}
              onChange={(e) => setItem(idx, "width", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
          <Field label="Height (inch) *">
            <input
              type="number"
              placeholder="e.g. 30"
              value={it.height}
              onChange={(e) => setItem(idx, "height", e.target.value)}
              style={EI(idx, "dimensions")}
            />
          </Field>
        </>
      );
    }
    return null;
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
              <Field label="Sales Person *">
                <select
                  value={header.salesPerson}
                  onChange={(e) => setH("salesPerson", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  <option value="Direct Order">Direct Order</option>
                  <option value="Sales Person 1">Sales Person 1</option>
                  <option value="Sales Person 2">Sales Person 2</option>
                  <option value="Sales Person 3">Sales Person 3</option>
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
              <Field label="Client Category *">
                <select
                  value={header.clientCategory}
                  onChange={(e) => setH("clientCategory", e.target.value)}
                  style={EH("clientCategory")}
                >
                  <option value="">-- Select Category --</option>
                  {["HP", "ZPL", "Others"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {EHMsg("clientCategory")}
              </Field>
              <Field label="Client Name *">
                <AutocompleteInput
                  value={header.clientName}
                  onChange={(v) => setH("clientName", v)}
                  suggestions={(clientMaster || []).map((c) => c.name)}
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
                    {fgCategories.map((c) => (
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
              label={`Create Sales Order (${items.length} item${items.length > 1 ? "s" : ""})`}
              color={C.green || "#4ade80"}
              onClick={submit}
            />
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
              return (
                <div
                  key={r.id}
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
                        {r.orderDate}
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
