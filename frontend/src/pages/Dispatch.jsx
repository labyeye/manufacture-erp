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

const UNIT_OPTIONS = ["nos", "pcs", "boxes", "kg", "rolls", "sheets"];

export default function Dispatch({
  dispatch = [],
  setDispatch,
  salesOrders = [],
  fgStock = [],
  setFgStock,
  dispatchCounter = 0,
  setDispatchCounter,
  toast,
}) {
  const blankHeader = {
    dispatchDate: today(),
    soRef: "",
    clientName: "",
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
    qty: "",
    unit: "nos",
    pcsPerBox: "",
    noOfBox: "",
  });

  const [header, setHeader] = useState(blankHeader);
  const [items, setItems] = useState([blankItem()]);
  const [headerErrors, setHeaderErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [view, setView] = useState("form");
  const [drDateFrom, setDrDateFrom] = useState("");
  const [drDateTo, setDrDateTo] = useState("");

  const activeSOList = useMemo(
    () => (salesOrders || []).filter((s) => s.status === "Open" || s.status === "In Progress"),
    [salesOrders],
  );

  const fgStockOptions = useMemo(
    () => (fgStock || []).map((s) => s.name).filter(Boolean),
    [fgStock],
  );

  const setH = (k, v) => {
    setHeader((f) => {
      const updated = { ...f, [k]: v };
      if (k === "soRef") {
        if (v) {
          const so = activeSOList.find((s) => s.soNo === v);
          if (so) updated.clientName = so.clientName || "";
        } else {
          updated.clientName = "";
        }
      }
      return updated;
    });
    setHeaderErrors((e) => ({ ...e, [k]: false }));
  };

  const EH = (k) => (headerErrors[k] ? { border: `1px solid ${C.red}` } : {});
  const EHMsg = (k) =>
    headerErrors[k] ? <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div> : null;

  const setItem = (idx, k, v) => {
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[idx], [k]: v };
      // auto product code from FG stock
      if (k === "itemName") {
        const stock = (fgStock || []).find((s) => s.name === v);
        it.productCode = stock?.code || stock?.productCode || "";
      }
      // auto calc boxes
      const qty = k === "qty" ? +v : +(it.qty || 0);
      const ppb = k === "pcsPerBox" ? +v : +(it.pcsPerBox || 0);
      it.noOfBox = qty && ppb ? Math.ceil(qty / ppb).toString() : "";
      updated[idx] = it;
      return updated;
    });
    setItemErrors((prev) => {
      const e = [...prev];
      e[idx] = { ...(e[idx] || {}), [k]: false };
      return e;
    });
  };

  const EI = (idx, k) => (itemErrors[idx] || {})[k] ? { border: `1px solid ${C.red}` } : {};
  const EIMsg = (idx, k) =>
    (itemErrors[idx] || {})[k] ? <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div> : null;

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
    if (!header.dispatchDate) he.dispatchDate = true;
    if (!header.vehicleNo) he.vehicleNo = true;
    setHeaderErrors(he);

    const allItemErrors = items.map((it) => {
      const e = {};
      if (!it.itemName) e.itemName = true;
      if (!it.qty) e.qty = true;
      return e;
    });
    setItemErrors(allItemErrors);

    if (Object.keys(he).length > 0 || allItemErrors.some((e) => Object.keys(e).length > 0)) {
      toast("Please fill all required fields", "error");
      return;
    }

    const dispatchNo = `DISP-${String(dispatchCounter + 1).padStart(5, "0")}`;
    const entry = { ...header, id: uid(), dispatchNo, items };
    setDispatch((p) => [...p, entry]);
    setDispatchCounter((c) => c + 1);

    items.forEach((it) => {
      setFgStock((prev) =>
        prev.map((s) =>
          s.name === it.itemName ? { ...s, qty: (s.qty || 0) - +(it.qty || 0) } : s,
        ),
      );
    });

    toast(`Dispatch ${dispatchNo} recorded`, "success");
    setHeader(blankHeader);
    setItems([blankItem()]);
    setHeaderErrors({});
    setItemErrors([{}]);
  };

  return (
    <div className="fade">
      <SectionTitle icon="🚚" title="Dispatch" sub="Record outgoing dispatches against sales orders" />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["form", "📝 New Dispatch"],
          ["records", `📋 Records (${dispatch.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? C.purple : C.border}`,
              background: view === v ? C.purple : "transparent",
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
          {/* ── Dispatch Details Card ── */}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 18 }}>
              Dispatch Details
            </h3>

            {/* Row 1: Date | SO# | Client Name | Delivery Address | Vehicle No */}
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
              <Field label="Client Name *">
                <input
                  placeholder="Client name"
                  value={header.clientName}
                  onChange={(e) => setH("clientName", e.target.value)}
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

            {/* Row 2: Driver Name | Remarks */}
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

          {/* ── Items header ── */}
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

          {/* ── Item cards ── */}
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
                <span style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>
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

              {/* Row: Item Name | Product Code | Quantity | Unit | Pcs/Box */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr",
                  gap: 12,
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
                    {fgStockOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  {EIMsg(idx, "itemName")}
                </Field>
                <Field label="Product Code">
                  <input
                    placeholder="Auto-filled or enter manually"
                    value={it.productCode}
                    onChange={(e) => setItem(idx, "productCode", e.target.value)}
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
                <Field label="Pcs / Box">
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={it.pcsPerBox}
                    onChange={(e) => setItem(idx, "pcsPerBox", e.target.value)}
                  />
                </Field>
              </div>

              {/* No. of Box auto */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 12 }}>
                <Field label="No. of Box">
                  <div
                    style={{
                      padding: "9px 12px",
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      color: it.noOfBox ? C.text || "#e5e7eb" : C.muted,
                    }}
                  >
                    {it.noOfBox
                      ? `${it.noOfBox} boxes`
                      : "— Auto from Qty ÷ Pcs/Box —"}
                  </div>
                </Field>
              </div>
            </Card>
          ))}

          {/* ── Bottom actions ── */}
          <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center" }}>
            <button
              onClick={addItem}
              style={{
                background: (C.purple || "#a855f7") + "22",
                color: C.purple || "#a855f7",
                border: `1px solid ${(C.purple || "#a855f7")}44`,
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

      {view === "records" && (
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, margin: 0 }}>Dispatch Records</h3>
            <DateRangeFilter
              dateFrom={drDateFrom}
              setDateFrom={setDrDateFrom}
              dateTo={drDateTo}
              setDateTo={setDrDateTo}
            />
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{dispatch.length} records</span>
          </div>
          {dispatch.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, padding: 32, fontSize: 13 }}>No dispatch records yet.</div>
          )}
          {(dispatch || []).slice().reverse().map((r) => {
            const totalQty = (r.items || []).reduce((sum, it) => sum + +(it.qty || 0), 0);
            return (
              <div key={r.id} style={{ borderBottom: `1px solid ${C.border}22`, padding: "12px 4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.purple, fontWeight: 700 }}>{r.dispatchNo}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{r.dispatchDate}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.clientName}</span>
                    <Badge text={r.status} color={C.green} />
                    {totalQty > 0 && <span style={{ fontSize: 12, color: C.muted }}>Qty: {fmt(totalQty)}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {(r.items || []).map((it, i) => (
                    <span key={i} style={{ fontSize: 11, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px", color: C.muted }}>
                      {it.itemName} · {it.qty} {it.unit}
                    </span>
                  ))}
                  {r.vehicleNo && <span style={{ fontSize: 11, color: C.muted }}>🚗 {r.vehicleNo}</span>}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}