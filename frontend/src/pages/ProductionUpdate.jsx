import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Badge,
  Field,
  SubmitBtn,
  ExportBtn,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import { jobOrdersAPI } from "../api/auth";
import { useEffect } from "react";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const SHIFTS = ["Morning", "OT", "Night"];

export default function ProductionUpdate({
  jobOrders = [],
  setJobOrders,
  productionUpdates = [],
  setProductionUpdates,
  wipStock = [],
  setWipStock,
  fgStock = [],
  setFgStock,
  pudCounter = 0,
  setPudCounter,
  machineMaster = [],
  operatorMaster = [],
  session,
  toast,
  canExportImport = true,
}) {
  const isOperator = session?.role === "Operator";
  const readonlyStyle = {
    padding: "9px 12px",
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 13,
    color: C.text || "#e5e7eb",
    height: 38,
    display: "flex",
    alignItems: "center",
    fontWeight: 600,
  };

  const blankEntry = {
    joNo: "",
    productionStage: "",
    operator: isOperator ? (session?.username || "") : "",
    date: today(),
    qtyCompleted: "",
    qtyRejected: 0,
    machineId: "",
    remarks: "",
    shift: "",
  };

  const [entry, setEntry] = useState(blankEntry);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState("entry");
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);

  const fetchJobOrders = async () => {
    try {
      setFetching(true);
      const data = await jobOrdersAPI.getAll();
      setJobOrders(data);
    } catch (err) {
      console.error("Fetch JO error:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const activeJOs = useMemo(
    () =>
      (jobOrders || []).filter(
        (jo) => jo.status !== "Completed",
      ),
    [jobOrders],
  );

  const allProductionRecords = useMemo(() => {
    const records = [];
    (jobOrders || []).forEach((jo) => {
      (jo.stageHistory || []).forEach((sh) => {
        records.push({
          ...sh,
          joNo: jo.joNo,
          companyName: jo.companyName,
          pudNo: `PUD-${sh._id?.slice(-5).toUpperCase() || "NEW"}`,
          id: sh._id || Math.random(),
        });
      });
    });
    return records.sort(
      (a, b) => new Date(b.enteredAt) - new Date(a.enteredAt),
    );
  }, [jobOrders]);

  const setField = (k, v) => {
    setEntry((f) => {
      const updated = { ...f, [k]: v };
      if (k === "joNo" && v) {
        const jo = jobOrders.find((j) => j.joNo === v);
        if (jo) {
          updated.productionStage = jo.currentStage || jo.process?.[0] || "";
        }
      }
      return updated;
    });
    setErrors((e) => ({ ...e, [k]: false }));
  };

  const E = (k) => (errors[k] ? { border: `1px solid ${C.red}` } : {});
  const EMsg = (k) =>
    errors[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  const submit = async () => {
    const err = {};
    if (!entry.joNo) err.joNo = true;
    if (!entry.productionStage) err.productionStage = true;
    if (!entry.operator) err.operator = true;
    if (!entry.date) err.date = true;
    if (!entry.qtyCompleted) err.qtyCompleted = true;
    setErrors(err);

    if (Object.keys(err).length > 0) {
      toast("Please fill all required fields", "error");
      return;
    }

    try {
      const jo = jobOrders.find((j) => j.joNo === entry.joNo);
      if (!jo) return;

      const stageData = {
        stage: entry.productionStage,
        qtyCompleted: Number(entry.qtyCompleted),
        qtyRejected: Number(entry.qtyRejected),
        operator: entry.operator,
        machineId: entry.machineId,
        date: entry.date,
        shift: entry.shift,
        remarks: entry.remarks,
      };

      if (editingEntry) {
        await jobOrdersAPI.updateStage(
          editingEntry.joId,
          editingEntry.stageId,
          stageData,
        );
        toast(`Production updated for ${entry.joNo}`, "success");
      } else {
        await jobOrdersAPI.addStage(jo._id, stageData);
        toast(`Production recorded for ${entry.joNo}`, "success");
      }

      setEntry(blankEntry);
      setEditingEntry(null);
      setErrors({});
      fetchJobOrders();
    } catch (error) {
      console.error("Production update error:", error);
      toast(
        error.response?.data?.error || "Failed to update production",
        "error",
      );
    }
  };

  const handleEdit = (jo, record) => {
    setEntry({
      joNo: jo.joNo,
      productionStage: record.stage,
      operator: record.operator,
      date: record.date ? record.date.slice(0, 10) : today(),
      qtyCompleted: record.qtyCompleted,
      qtyRejected: record.qtyRejected || 0,
      machineId: record.machineId || "",
      remarks: record.remarks || "",
      shift: record.shift || "",
    });
    setEditingEntry({ joId: jo._id, stageId: record._id });
    setView("entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (joId, stageId) => {
    if (
      !window.confirm("Are you sure you want to delete this production record?")
    )
      return;
    try {
      await jobOrdersAPI.deleteStage(joId, stageId);
      toast("Record deleted", "success");
      fetchJobOrders();
    } catch (error) {
      console.error("Delete record error:", error);
      toast("Failed to delete record", "error");
    }
  };

  const selectedJO = useMemo(
    () => jobOrders.find((j) => j.joNo === entry.joNo),
    [jobOrders, entry.joNo],
  );

  const stageTargetLogic = useMemo(() => {
    if (!selectedJO || !entry.productionStage) {
      return { target: 0, done: 0, remain: 0 };
    }
    const STAGES_ORDER = [
      "Printing",
      "Varnish",
      "Lamination",
      "Die Cutting",
      "Formation",
      "Manual Formation",
    ];
    const procArr = [...(selectedJO.process || [])].sort(
      (a, b) => STAGES_ORDER.indexOf(a) - STAGES_ORDER.indexOf(b),
    );
    const s = entry.productionStage;
    const sIdx = procArr.indexOf(s);
    if (sIdx === -1) return { target: 0, done: 0, remain: 0 };

    const isFormation = s.includes("Formation");
    const isSheet = (selectedJO.paperCategory || "")
      .toLowerCase()
      .includes("sheet");

    let target = 0;
    if (isFormation) {
      target = selectedJO.orderQty || 0;
    } else if (sIdx === 0) {
      target = isSheet
        ? selectedJO.noOfSheets || 0
        : selectedJO.reelWeightKg || 0;
    } else {
      const prevS = procArr[sIdx - 1];
      target = selectedJO.stageQtyMap?.[prevS] || 0;
    }

    const done = selectedJO.stageTotalMap?.[s] || 0;

    let pastDoneActual = done;
    if (editingEntry && editingEntry.joId === selectedJO._id) {
      const pastRec = selectedJO.stageHistory?.find(
        (h) => h._id === editingEntry.stageId,
      );
      if (pastRec && pastRec.stage === s) {
        pastDoneActual -= pastRec.qtyCompleted || 0;
      }
    }

    const remain = Math.max(0, target - pastDoneActual);

    return { target, done, remain };
  }, [selectedJO, entry.productionStage, editingEntry]);

  const availableQty = useMemo(() => {
    if (!selectedJO || !entry.productionStage) return null;

    const STAGES_ORDER = [
      "Printing",
      "Varnish",
      "Lamination",
      "Die Cutting",
      "Formation",
      "Manual Formation",
    ];
    const proc = [...(selectedJO.process || [])].sort(
      (a, b) => STAGES_ORDER.indexOf(a) - STAGES_ORDER.indexOf(b),
    );

    const idx = proc.indexOf(entry.productionStage);
    if (idx === -1) return null;
    if (idx === 0) return null;

    const prevStage = proc[idx - 1];
    const qtyDoneInPrev =
      selectedJO.stageQtyMap?.[prevStage] ||
      (selectedJO.stageHistory || [])
        .filter((h) => h.stage === prevStage)
        .reduce((sum, h) => sum + (h.qtyCompleted || 0), 0);

    return qtyDoneInPrev;
  }, [selectedJO, entry.productionStage]);

  const recordCount = allProductionRecords.length;
  const wipCount = wipStock.length;
  const joCount = jobOrders.length;

  return (
    <div className="fade">
      <SectionTitle
        icon="fa-solid fa-screwdriver-wrench"
        title="Production"
        sub="Record and track stage-wise production progress"
      />

      {fetching && (
        <div
          style={{
            fontSize: 11,
            color: C.blue,
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Syncing with server...
        </div>
      )}

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          ["entry", "fa-solid fa-screwdriver-wrench", "Production Details"],
          ["records", "fa-solid fa-clipboard-list", "Records"],
          ["status", "fa-solid fa-chart-column", "Production Status"],
        ].map(([v, iconClass, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? "#FF7F11" : C.border}`,
              background: view === v ? "#FF7F1122" : "transparent",
              color: view === v ? "#FF7F11" : C.muted,
              fontWeight: 500,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className={iconClass} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {view === "entry" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "#FF7F11",
                marginBottom: 20,
                textTransform: "capitalize",
              }}
            >
              {editingEntry ? "Edit Production Record" : "Stage Update Entry"}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <Field label="JOB ORDER *">
                <select
                  value={entry.joNo}
                  onChange={(e) => setField("joNo", e.target.value)}
                  style={E("joNo")}
                >
                  <option value="">-- Select Job Order --</option>
                  {activeJOs.map((jo) => (
                    <option key={jo.joNo} value={jo.joNo}>
                      {jo.joNo} — {jo.companyName}
                    </option>
                  ))}
                </select>
                {EMsg("joNo")}
              </Field>

              <Field label="ITEM NAME">
                <div style={readonlyStyle}>{selectedJO?.itemName || "—"}</div>
              </Field>

              <Field label="CURRENT STAGE">
                <div style={readonlyStyle}>
                  {selectedJO?.currentStage || "Not Started"}
                </div>
              </Field>

              <Field label="ORDER QUANTITY">
                <div style={readonlyStyle}>{selectedJO?.orderQty || 0}</div>
              </Field>

              <Field label="# OF SHEETS">
                <div style={readonlyStyle}>
                  {selectedJO?.paperCategory?.toLowerCase().includes("sheet")
                    ? `Paper 1: ${selectedJO?.noOfSheets || 0}`
                    : `${selectedJO?.orderQty || 0} pcs`}
                </div>
              </Field>

              <Field label="PRODUCTION STAGE *">
                <select
                  value={entry.productionStage}
                  onChange={(e) => setField("productionStage", e.target.value)}
                  style={E("productionStage")}
                >
                  <option value="">-- Select Stage --</option>
                  {(
                    selectedJO?.process || [
                      "Printing",
                      "Varnish",
                      "Lamination",
                      "Die Cutting",
                      "Formation",
                      "Manual Formation",
                    ]
                  ).map((s, idx, arr) => {
                    const isFormation = s.includes("Formation");
                    const isSheet = (selectedJO?.paperCategory || "")
                      .toLowerCase()
                      .includes("sheet");

                    let target = 0;
                    if (isFormation) {
                      target = selectedJO?.orderQty || 0;
                    } else if (idx === 0) {
                      target = isSheet
                        ? selectedJO?.noOfSheets || 0
                        : selectedJO?.reelWeightKg || 0;
                    } else {
                      const prevS = arr[idx - 1];
                      target = selectedJO?.stageQtyMap?.[prevS] || 0;
                    }

                    const done = selectedJO?.stageTotalMap?.[s] || 0;
                    const unit = isFormation ? " pcs" : isSheet ? "" : " kg";

                    let disabled = false;
                    for (let i = 0; i < idx; i++) {
                      const prevS = arr[i];
                      const prevDone = selectedJO?.stageTotalMap?.[prevS] || 0;

                      let prevTarget = 0;
                      if (prevS.includes("Formation")) {
                        prevTarget = selectedJO?.orderQty || 0;
                      } else if (i === 0) {
                        prevTarget = isSheet
                          ? selectedJO?.noOfSheets || 0
                          : selectedJO?.reelWeightKg || 0;
                      } else {
                        const beforePrevS = arr[i - 1];
                        prevTarget =
                          selectedJO?.stageQtyMap?.[beforePrevS] || 0;
                      }

                      if (prevTarget <= 0 || prevDone < prevTarget) {
                        disabled = true;
                        break;
                      }
                    }

                    if (
                      !disabled &&
                      target > 0 &&
                      done >= target &&
                      (!editingEntry || entry.productionStage !== s)
                    ) {
                      disabled = true;
                    }

                    return (
                      <option key={s} value={s} disabled={disabled}>
                        {s} ({done}/{target}
                        {unit}) {disabled ? "🔒" : ""}
                      </option>
                    );
                  })}
                </select>
                {EMsg("productionStage")}

                {entry.productionStage && selectedJO && (
                  <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    {(() => {
                      const s = entry.productionStage;
                      const procArr = selectedJO.process || [];
                      const sIdx = procArr.indexOf(s);
                      const isFormation = s.includes("Formation");
                      const isSheet = (selectedJO.paperCategory || "")
                        .toLowerCase()
                        .includes("sheet");

                      let target = 0;
                      if (isFormation) {
                        target = selectedJO.orderQty || 0;
                      } else if (sIdx === 0) {
                        target = isSheet
                          ? selectedJO.noOfSheets || 0
                          : selectedJO.reelWeightKg || 0;
                      } else {
                        const prevS = procArr[sIdx - 1];
                        target = selectedJO.stageQtyMap?.[prevS] || 0;
                      }

                      const done = selectedJO.stageTotalMap?.[s] || 0;
                      const remain = Math.max(0, target - done);
                      const unit = isFormation
                        ? " pcs"
                        : isSheet
                          ? " sheets"
                          : " kg";
                      return (
                        <span>
                          {s}: <b style={{ color: C.yellow }}>{done}</b> /{" "}
                          {target} filled -{" "}
                          <b style={{ color: C.red }}>{remain}</b> remaining
                        </span>
                      );
                    })()}
                  </div>
                )}
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <Field label="OPERATOR / WORKER *">
                {isOperator ? (
                  <div style={{ padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 13, color: "#e0e0e0", fontWeight: 600 }}>
                    {entry.operator || session?.username || "—"}
                  </div>
                ) : (
                  <select
                    value={entry.operator}
                    onChange={(e) => setField("operator", e.target.value)}
                    style={E("operator")}
                  >
                    <option value="">-- Select Operator --</option>
                    {operatorMaster.filter((op) => op.isActive !== false).map((op) => (
                      <option key={op._id} value={op.name}>{op.name}</option>
                    ))}
                  </select>
                )}
                {EMsg("operator")}
              </Field>

              <Field label="MACHINE">
                <select
                  value={entry.machineId}
                  onChange={(e) => setField("machineId", e.target.value)}
                >
                  <option value="">-- Select Machine --</option>
                  {machineMaster.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.type})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="DATE *">
                <DatePicker
                  value={entry.date}
                  onChange={(v) => setField("date", v)}
                  style={E("date")}
                />
                {EMsg("date")}
              </Field>

              <Field label="QTY COMPLETED *">
                <input
                  type="number"
                  placeholder="Qty done"
                  max={stageTargetLogic.remain}
                  value={entry.qtyCompleted}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const remain = stageTargetLogic.remain;
                    if (val > remain) {
                      toast(
                        `Cannot exceed remaining target (${remain})`,
                        "error",
                      );
                      return;
                    }

                    setEntry((prev) => {
                      const updated = { ...prev, qtyCompleted: e.target.value };

                      if (val === remain) {
                        updated.qtyRejected = 0;
                      } else {
                        const currentRej = Number(prev.qtyRejected || 0);
                        if (val + currentRej > remain) {
                          updated.qtyRejected = remain - val;
                        }
                      }
                      return updated;
                    });
                  }}
                  style={E("qtyCompleted")}
                />
                {EMsg("qtyCompleted")}
                {availableQty !== null && (
                  <div
                    style={{
                      fontSize: 10,
                      color: C.blue,
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    Available: {availableQty}
                  </div>
                )}
              </Field>

              <Field label="QTY REJECTED">
                <input
                  type="number"
                  placeholder="0"
                  value={entry.qtyRejected}
                  disabled={
                    Number(entry.qtyCompleted) === stageTargetLogic.remain
                  }
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const comp = Number(entry.qtyCompleted || 0);
                    const remain = stageTargetLogic.remain;

                    if (comp + val > remain) {
                      const maxAllowed = remain - comp;
                      toast(
                        `Total (Completed + Rejected) cannot exceed ${remain}. Max rejection allowed: ${maxAllowed}`,
                        "error",
                      );
                      setField("qtyRejected", maxAllowed);
                      return;
                    }
                    setField("qtyRejected", e.target.value);
                  }}
                />
              </Field>

              <Field label="SHIFT">
                <select
                  value={entry.shift}
                  onChange={(e) => setField("shift", e.target.value)}
                >
                  <option value="">-- Shift --</option>
                  {SHIFTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="REMARKS">
                <input
                  placeholder="Issues, observations, notes"
                  value={entry.remarks}
                  onChange={(e) => setField("remarks", e.target.value)}
                />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <SubmitBtn
                label={
                  fetching
                    ? "Saving..."
                    : editingEntry
                      ? "Update Record"
                      : "Add Record"
                }
                color="#FF7F11"
                onClick={submit}
                disabled={fetching}
              />
              {editingEntry && (
                <button
                  onClick={() => {
                    setEditingEntry(null);
                    setEntry(blankEntry);
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: "transparent",
                    color: C.muted,
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      {view === "records" && (
        <div>
          {}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <input
                  placeholder="Filter by JO# or stage..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: "8px 12px 8px 34px",
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: C.card,
                    color: C.text,
                    fontSize: 13,
                    width: 240,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    fontSize: 13,
                  }}
                >
                  🔍
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                <span>Date:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: `1px solid ${C.border}`,
                    background: C.card,
                    color: C.text,
                    fontSize: 12,
                  }}
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: `1px solid ${C.border}`,
                    background: C.card,
                    color: C.text,
                    fontSize: 12,
                  }}
                />
              </div>
            </div>

            {canExportImport && (
              <ExportBtn
                onClick={() => {
                  toast("Excel Export coming soon...", "info");
                }}
              />
            )}
          </div>

          {(() => {
            const allRecs = [];
            jobOrders.forEach(jo => {
              if (searchTerm && !jo.joNo.toLowerCase().includes(searchTerm.toLowerCase()) && !jo.companyName.toLowerCase().includes(searchTerm.toLowerCase())) return;
              (jo.stageHistory || []).forEach(r => {
                if (dateFrom && r.date < dateFrom) return;
                if (dateTo && r.date > dateTo) return;
                allRecs.push({ ...r, jo });
              });
            });
            allRecs.sort((a, b) => new Date(b.createdAt || b.enteredAt || b.date || 0) - new Date(a.createdAt || a.enteredAt || a.date || 0));

            const totalDone = allRecs.reduce((s, r) => s + +(r.qtyCompleted || 0), 0);
            const totalRejected = allRecs.reduce((s, r) => s + +(r.qtyRejected || 0), 0);
            const uniqueJOs = new Set(allRecs.map(r => r.jo.joNo)).size;
            const statCards = [
              { label: "Total Records", value: allRecs.length, icon: "fa-solid fa-clipboard-list" },
              { label: "Unique JOs", value: uniqueJOs, icon: "fa-solid fa-gears" },
              { label: "Total Done", value: fmt(totalDone), icon: "fa-solid fa-circle-check" },
              { label: "Total Rejected", value: fmt(totalRejected), icon: "fa-solid fa-circle-xmark" },
            ];
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                  {statCards.map(({ label, value, icon }) => (
                    <div key={label} style={{ padding: "16px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 19, color: "#ffffff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                        <i className={icon} style={{ color: C.muted, fontSize: 20, opacity: 0.9, display: "inline-flex", alignItems: "center", justifyContent: "center", height: 28, width: 28, lineHeight: 1 }} />
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {allRecs.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.muted, padding: 32 }}>No production records found.</div>
                ) : (
                  <div style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          {["JO No", "Client", "Item", "Stage", "Date", "Done", "Rejected", "Operator", "Shift", "Actions"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allRecs.map((rec, i) => {
                          const { jo, ...r } = rec;
                          return (
                            <tr key={r._id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                              <td style={{ padding: "11px 14px", fontWeight: 700, color: "#facc15", whiteSpace: "nowrap" }}>{jo.joNo}</td>
                              <td style={{ padding: "11px 14px", color: C.muted, fontSize: 12 }}>{jo.companyName}</td>
                              <td style={{ padding: "11px 14px", color: "#94a3b8", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{jo.itemName}</td>
                              <td style={{ padding: "11px 14px" }}><span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#FF7F1122", color: "#FF7F11", border: "1px solid #FF7F1144" }}>{r.stage}</span></td>
                              <td style={{ padding: "11px 14px", color: C.muted, whiteSpace: "nowrap", fontSize: 12 }}>{fmtDate(r.date)}</td>
                              <td style={{ padding: "11px 14px", fontWeight: 700, color: "#10b981" }}>{fmt(r.qtyCompleted)}</td>
                              <td style={{ padding: "11px 14px", color: r.qtyRejected > 0 ? "#ef4444" : C.muted }}>{r.qtyRejected || 0}</td>
                              <td style={{ padding: "11px 14px", color: C.muted, fontSize: 12 }}>{r.operator || "—"}</td>
                              <td style={{ padding: "11px 14px", color: C.muted, fontSize: 12 }}>{r.shift || "—"}</td>
                              <td style={{ padding: "11px 14px" }}>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => handleEdit(jo, r)} style={{
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
                    }}><i className="fa-solid fa-pen-to-square" /> Edit</button>
                                  <button onClick={() => handleDelete(jo._id, r._id)} style={{
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
                    }}><i className="fa-solid fa-trash" /> Delete</button>
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

          {false && [].map((jo) => {
              return (
                <Card key={jo._id} style={{ marginBottom: 20, padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#facc15",
                        }}
                      >
                        {jo.joNo}
                      </span>
                      <span
                        style={{ fontSize: 14, color: C.muted, marginLeft: 12 }}
                      >
                        {jo.itemName} {jo.companyName}
                      </span>
                    </div>
                    <Badge
                      text={jo.status}
                      color={jo.status === "Completed" ? C.green : "#facc15"}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {records.map((r, idx) => (
                      <div
                        key={r._id || idx}
                        style={{
                          background: C.inputBg + "44",
                          borderRadius: 6,
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: `1px solid ${C.border}22`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            flex: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              background: "#FF7F1122",
                              color: "#FF7F11",
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 500,
                              minWidth: 80,
                              textAlign: "center",
                              border: "1px solid #FF7F1144",
                            }}
                          >
                            {r.stage}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              fontSize: 13,
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>
                              <span style={{ color: C.green }}>✓</span>{" "}
                              {r.qtyCompleted} done
                            </span>
                            {r.qtyRejected > 0 && (
                              <span style={{ color: C.red }}>
                                <span style={{ color: C.red }}>✕</span>{" "}
                                {r.qtyRejected} rejected
                              </span>
                            )}
                            <span
                              style={{
                                color: C.muted,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              👤 {r.operator}
                            </span>
                            <span
                              style={{
                                color: C.muted,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <i className="fa-solid fa-clock" /> {r.shift}
                            </span>
                            {r.machineId && (
                              <span
                                style={{
                                  color: C.muted,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                  <i className="fa-solid fa-industry" />{" "}
                                {machineMaster.find(
                                  (m) => m._id === r.machineId,
                                )?.name || r.machineId}
                              </span>
                            )}
                            <span style={{ color: C.muted, fontSize: 12 }}>
                              {fmtDate(r.date)}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleEdit(jo, r)}
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
                            <i className="fa-solid fa-pen-to-square" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(jo._id, r._id)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {view === "wip" && (
        <Card>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: C.muted,
              marginBottom: 14,
            }}
          >
            Work-in-Progress Stock ({wipCount})
          </h3>
          {wipCount === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No WIP stock yet.
            </div>
          )}
          {(wipStock || []).map((s) => (
            <div
              key={s.id}
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
                  <span style={{ fontWeight: 600 }}>{s.joNo}</span>
                  <Badge text={s.stage} color={C.yellow} />
                  <span
                    style={{ fontSize: 12, color: C.green, fontWeight: 700 }}
                  >
                    Qty: {s.qty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {view === "status" && (
        <Card>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: C.muted,
              marginBottom: 14,
            }}
          >
            Job Order Status ({joCount})
          </h3>
          {joCount === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: 32,
                fontSize: 13,
              }}
            >
              No job orders yet.
            </div>
          )}
          {(jobOrders || []).map((jo) => {
            const updates = jo.stageHistory || [];
            const totalCompleted = updates.reduce(
              (sum, u) => sum + +(u.qtyCompleted || 0),
              0,
            );
            return (
              <div
                key={jo.id}
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
                        color: C.blue,
                        fontWeight: 500,
                      }}
                    >
                      {jo.joNo}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {jo.itemName} — {jo.companyName}
                    </span>
                    <Badge
                      text={jo.status}
                      color={jo.status === "Completed" ? C.green : C.yellow}
                    />
                    <span style={{ fontSize: 12, color: C.muted }}>
                      Updates: {updates.length}
                    </span>
                    {totalCompleted > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: C.green,
                        }}
                      >
                        Qty Done: {totalCompleted}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
