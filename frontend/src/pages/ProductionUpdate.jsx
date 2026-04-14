import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Badge,
  Field,
  SubmitBtn,
} from "../components/ui/BasicComponents";
import { DatePicker } from "../components/ui/DatePicker";
import { jobOrdersAPI } from "../api/auth";
import { useEffect } from "react";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n ?? 0).toLocaleString("en-IN");

const SHIFTS = ["Morning", "Afternoon", "Night"];

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
  toast,
}) {
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
    fontFamily: "'JetBrains Mono', monospace",
  };

  const blankEntry = {
    joNo: "",
    productionStage: "",
    operator: "",
    date: today(),
    qtyCompleted: "",
    qtyRejected: 0,
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
    () => (jobOrders || []).filter((jo) => jo.status !== "Completed"),
    [jobOrders],
  );

  // Derive production records from all job orders' stage history
  const allProductionRecords = useMemo(() => {
    const records = [];
    (jobOrders || []).forEach((jo) => {
      (jo.stageHistory || []).forEach((sh) => {
        records.push({
          ...sh,
          joNo: jo.joNo,
          clientName: jo.clientName,
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
        date: entry.date,
        shift: entry.shift,
        remarks: entry.remarks,
      };

      await jobOrdersAPI.addStage(jo._id, stageData);
      toast(`Production updated for ${entry.joNo}`, "success");

      setEntry(blankEntry);
      setErrors({});
      fetchJobOrders(); // Refresh data to see new history and status
    } catch (error) {
      console.error("Production update error:", error);
      toast(error.response?.data?.error || "Failed to update production", "error");
    }
  };

  const selectedJO = useMemo(() => jobOrders.find(j => j.joNo === entry.joNo), [jobOrders, entry.joNo]);
  
  const availableQty = useMemo(() => {
    if (!selectedJO || !entry.productionStage) return null;
    
    // Sort process list according to standard STAGES workflow to ensure correct indexing
    const STAGES_ORDER = ["Printing", "Varnish", "Lamination", "Die Cutting", "Formation", "Manual Formation"];
    const proc = [...(selectedJO.process || [])].sort((a, b) => STAGES_ORDER.indexOf(a) - STAGES_ORDER.indexOf(b));
    
    const idx = proc.indexOf(entry.productionStage);
    if (idx === -1) return null;
    if (idx === 0) return null; // Hide available qty for the starting stage

    
    // stageQtyMap from backend is often an object after JSON serialization
    const prevStage = proc[idx - 1];
    const qtyDoneInPrev = selectedJO.stageQtyMap?.[prevStage] || 
                         (selectedJO.stageHistory || [])
                           .filter(h => h.stage === prevStage)
                           .reduce((sum, h) => sum + (h.qtyCompleted || 0), 0);
    
    return qtyDoneInPrev;
  }, [selectedJO, entry.productionStage]);

  const recordCount = allProductionRecords.length;
  const wipCount = wipStock.length;
  const joCount = jobOrders.length;

  return (
    <div className="fade">
      <SectionTitle
        icon="🛠️"
        title="Production"
        sub="Record and track stage-wise production progress"
      />

      {fetching && (
        <div
          style={{
            fontSize: 11,
            color: C.blue,
            fontWeight: 700,
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
          ["entry", `🛠️ Production Details`],
          ["records", `📋 Records`],
          ["status", `📊 Production Status`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? "#FF7F11" : C.border}`,
              background: view === v ? "#FF7F1122" : "transparent",
              color: view === v ? "#FF7F11" : C.muted,
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {view === "entry" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#FF7F11",
                marginBottom: 20,
                textTransform: "capitalize",
              }}
            >
              Stage Update Entry
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
                      {jo.joNo} — {jo.clientName}
                    </option>
                  ))}
                </select>
                {EMsg("joNo")}
              </Field>

              <Field label="ITEM NAME">
                <div style={readonlyStyle}>
                  {selectedJO?.itemName || "—"}
                </div>
              </Field>

              <Field label="CURRENT STAGE">
                <div style={readonlyStyle}>
                  {selectedJO?.currentStage || "Not Started"}
                </div>
              </Field>

              <Field label="ORDER QUANTITY">
                <div style={readonlyStyle}>
                  {selectedJO?.orderQty || 0}
                </div>
              </Field>

              <Field label="# OF SHEETS">
                <div style={readonlyStyle}>
                  {selectedJO?.paperCategory?.toLowerCase().includes("sheet") 
                    ? `Paper 1: ${selectedJO?.noOfSheets || 0}`
                    : `Weight: ${selectedJO?.reelWeightKg || 0} kg`}
                </div>
              </Field>

              <Field label="PRODUCTION STAGE *">
                <select
                  value={entry.productionStage}
                  onChange={(e) => setField("productionStage", e.target.value)}
                  style={E("productionStage")}
                >
                  <option value="">-- Select Stage --</option>
                  {(selectedJO?.process || [
                    "Printing",
                    "Varnish",
                    "Lamination",
                    "Die Cutting",
                    "Formation",
                    "Manual Formation",
                  ]).map((s, idx, arr) => {
                    const isFormation = s.includes("Formation");
                    const isSheet = (selectedJO?.paperCategory || "").toLowerCase().includes("sheet");
                    
                    let target = 0;
                    if (isFormation) {
                      target = selectedJO?.orderQty || 0;
                    } else if (idx === 0) {
                      target = isSheet ? (selectedJO?.noOfSheets || 0) : (selectedJO?.reelWeightKg || 0);
                    } else {
                      // Target for next stage is the yield (good qty) of the previous stage
                      const prevS = arr[idx-1];
                      target = selectedJO?.stageQtyMap?.[prevS] || 0;
                    }

                    const done = selectedJO?.stageTotalMap?.[s] || 0;
                    const unit = isFormation ? "" : (isSheet ? "" : " kg");
                    
                    // Logic to disable next stage if previous is not done
                    let disabled = false;
                    if (idx > 0) {
                      const prevS = arr[idx - 1];
                      const prevDone = selectedJO?.stageTotalMap?.[prevS] || 0;
                      
                      let prevTarget = 0;
                      const prevIsFormation = prevS.includes("Formation");
                      if (prevIsFormation) {
                        prevTarget = selectedJO?.orderQty || 0;
                      } else if (idx === 1) { // Prev was the first stage
                        prevTarget = isSheet ? (selectedJO?.noOfSheets || 0) : (selectedJO?.reelWeightKg || 0);
                      } else {
                        const beforePrevS = arr[idx-2];
                        prevTarget = selectedJO?.stageQtyMap?.[beforePrevS] || 0;
                      }
                      
                      if (prevDone < prevTarget) {
                        disabled = true;
                      }
                    }

                    return (
                      <option key={s} value={s} disabled={disabled}>
                        {s} ({done}/{target}{unit}) {disabled ? "🔒" : ""}
                      </option>
                    );
                  })}
                </select>
                {EMsg("productionStage")}
                
                {entry.productionStage && selectedJO && (
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontWeight: 700 }}>
                    {(() => {
                      const s = entry.productionStage;
                      const procArr = selectedJO.process || [];
                      const sIdx = procArr.indexOf(s);
                      const isFormation = s.includes("Formation");
                      const isSheet = (selectedJO.paperCategory || "").toLowerCase().includes("sheet");
                      
                      let target = 0;
                      if (isFormation) {
                        target = selectedJO.orderQty || 0;
                      } else if (sIdx === 0) {
                        target = isSheet ? (selectedJO.noOfSheets || 0) : (selectedJO.reelWeightKg || 0);
                      } else {
                        const prevS = procArr[sIdx - 1];
                        target = selectedJO.stageQtyMap?.[prevS] || 0;
                      }

                      const done = selectedJO.stageTotalMap?.[s] || 0;
                      const remain = Math.max(0, target - done);
                      const unit = isFormation ? "" : (isSheet ? " sheets" : " kg");
                      return (
                        <span>
                          {s}: <b style={{ color: C.yellow }}>{done}</b> / {target} filled - <b style={{ color: C.red }}>{remain}</b> remaining
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
                <input
                  placeholder="Name of operator"
                  value={entry.operator}
                  onChange={(e) => setField("operator", e.target.value)}
                  style={E("operator")}
                />
                {EMsg("operator")}
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
                  value={entry.qtyCompleted}
                  onChange={(e) => setField("qtyCompleted", e.target.value)}
                  style={E("qtyCompleted")}
                />
                {EMsg("qtyCompleted")}
                {availableQty !== null && (
                  <div style={{ fontSize: 10, color: C.blue, marginTop: 4, fontWeight: 700 }}>
                    Available: {availableQty}
                  </div>
                )}
              </Field>

              <Field label="QTY REJECTED">
                <input
                  type="number"
                  placeholder="0"
                  value={entry.qtyRejected}
                  onChange={(e) => setField("qtyRejected", e.target.value)}
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
                label={fetching ? "Updating..." : "Update Stage"}
                color="#FF7F11"
                onClick={submit}
                disabled={fetching}
              />
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
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
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
                <span style={{ position: "absolute", left: 10, top: 10, fontSize: 13 }}>🔍</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted }}>
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

            <button
              style={{
                background: C.green || "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
              onClick={() => {
                toast("Excel Export coming soon...", "info");
              }}
            >
              <span>⬇️</span> Export Excel
            </button>
          </div>

          {}
          {jobOrders.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, padding: 32 }}>No job orders found.</div>
          )}

          {jobOrders
            .filter((jo) => {
              const matchesSearch =
                jo.joNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                jo.clientName.toLowerCase().includes(searchTerm.toLowerCase());
              return matchesSearch;
            })
            .map((jo) => {
              const records = (jo.stageHistory || [])
                .filter((r) => {
                  if (dateFrom && r.date < dateFrom) return false;
                  if (dateTo && r.date > dateTo) return false;
                  return true;
                })
                .sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt));

              if (records.length === 0 && searchTerm) return null;
              if (records.length === 0 && (dateFrom || dateTo)) return null;
              if (records.length === 0) return null;

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
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#facc15" }}>
                        {jo.joNo}
                      </span>
                      <span style={{ fontSize: 14, color: C.muted, marginLeft: 12 }}>
                        {jo.itemName} {jo.clientName}
                      </span>
                    </div>
                    <Badge
                      text={jo.status}
                      color={jo.status === "Completed" ? C.green : "#facc15"}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, flexWrap: "wrap" }}>
                          <div
                            style={{
                              background: "#FF7F1122",
                              color: "#FF7F11",
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              minWidth: 80,
                              textAlign: "center",
                              border: "1px solid #FF7F1144",
                            }}
                          >
                            {r.stage}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                            <span style={{ fontWeight: 600 }}>
                              <span style={{ color: C.green }}>✓</span> {r.qtyCompleted} done
                            </span>
                            {r.qtyRejected > 0 && (
                              <span style={{ color: C.red }}>
                                <span style={{ color: C.red }}>✕</span> {r.qtyRejected} rejected
                              </span>
                            )}
                            <span style={{ color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                              👤 {r.operator}
                            </span>
                            <span style={{ color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                              🕒 {r.shift}
                            </span>
                            <span style={{ color: C.muted, fontSize: 12 }}>
                              {r.date}
                            </span>
                          </div>
                        </div>

                        <button
                          style={{
                            background: C.card,
                            border: `1px solid ${C.blue}44`,
                            color: C.blue,
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          ✏️ Edit
                        </button>
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
              fontWeight: 700,
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
              fontWeight: 700,
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
            const updates = (jo.stageHistory || []);
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
                        fontFamily: "'JetBrains Mono',monospace",
                        color: C.blue,
                        fontWeight: 700,
                      }}
                    >
                      {jo.joNo}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {jo.itemName} — {jo.clientName}
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
                          fontWeight: 700,
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
