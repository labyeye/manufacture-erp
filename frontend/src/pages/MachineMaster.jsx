import React, { useState, useMemo, useEffect } from "react";
import { machineMasterAPI } from "../api/auth";
import { ALL_SKU_FAMILIES, PARALLEL_MACHINE_GROUPS } from "../constants/seedData";

const MACHINE_TYPES = [
  "Printing",
  "Varnish",
  "Die Cutting",
  "Lamination",
  "Formation",
  "Bag Making",
  "Sheet Cutting",
  "Manual Formation",
  "Cutting",
  "Handmade",
];

const TYPE_COLORS = {
  Printing: "#2196F3",
  Varnish: "#00BCD4",
  "Die Cutting": "#FF9800",
  Lamination: "#9C27B0",
  Formation: "#E91E63",
  "Bag Making": "#f97316",
  "Sheet Cutting": "#a855f7",
  "Manual Formation": "#8D6E63",
  Cutting: "#F44336",
  Handmade: "#4CAF50",
};

const DIVISION_COLORS = { Sheet: "#3b82f6", Reel: "#f59e0b" };

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const inputStyle = {
  padding: "9px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#141414",
  color: "#e0e0e0",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#666",
  display: "block",
  marginBottom: 6,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
};

const sectionHeaderStyle = {
  gridColumn: "1 / -1",
  borderBottom: "1px solid #2a2a2a",
  paddingBottom: 10,
  marginTop: 10,
};

export default function MachineMaster({ toast }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machineName, setMachineName] = useState("");
  const [machineType, setMachineType] = useState("Printing");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All Types");
  const [filterDivision, setFilterDivision] = useState("All Divisions");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [editingMachine, setEditingMachine] = useState(null);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const res = await machineMasterAPI.getAll();
      setMachines(res.machines || []);
    } catch (error) {
      toast?.("Failed to load machines", "error");
    }
  };

  const filteredMachines = useMemo(
    () =>
      machines.filter((m) => {
        const matchSearch = !searchTerm || m.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === "All Types" || m.type === filterType;
        const matchDiv = filterDivision === "All Divisions" || m.division === filterDivision;
        const matchStatus = filterStatus === "All Status" || m.status === filterStatus;
        return matchSearch && matchType && matchDiv && matchStatus;
      }),
    [machines, searchTerm, filterType, filterDivision, filterStatus]
  );

  const handleAdd = async () => {
    if (!machineName.trim()) {
      toast("Enter machine name", "error");
      return;
    }
    setLoading(true);
    try {
      await machineMasterAPI.create({ name: machineName.trim(), type: machineType, status: "Active" });
      toast(`Machine "${machineName}" added`, "success");
      setMachineName("");
      fetchMachines();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to add machine", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await machineMasterAPI.update(id, data);
      toast("Machine updated", "success");
      setEditingMachine(null);
      fetchMachines();
    } catch (error) {
      toast("Update failed", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this machine?")) return;
    try {
      await machineMasterAPI.delete(id);
      toast("Machine deleted", "success");
      fetchMachines();
    } catch (error) {
      toast("Delete failed", "error");
    }
  };

  const EditModal = ({ machine }) => {
    const [form, setForm] = useState({ ...machine });

    const handleChange = (field, value) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    };

    const toggleDay = (day) => {
      const current = form.workingDays || [];
      const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
      handleChange("workingDays", updated);
      handleChange("weeklyOff", DAYS_OF_WEEK.filter((d) => !updated.includes(d)));
    };

    const toggleCompat = (sku) => {
      const current = Array.isArray(form.productCompatibility) ? form.productCompatibility : [];
      const updated = current.includes(sku) ? current.filter((s) => s !== sku) : [...current, sku];
      handleChange("productCompatibility", updated);
    };

    const compatList = Array.isArray(form.productCompatibility) ? form.productCompatibility : [];

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: 20,
        }}
      >
        <div
          style={{
            background: "#121212",
            border: "1px solid #2a2a2a",
            borderRadius: 16,
            width: "100%",
            maxWidth: 960,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            padding: 30,
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
            <h3 style={{ margin: 0, fontSize: 20 }}>Configure {machine.name}</h3>
            <button
              onClick={() => setEditingMachine(null)}
              style={{ background: "transparent", border: "none", color: "#666", fontSize: 24, cursor: "pointer" }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {}
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#FF9800" }}>BASIC CONFIGURATION</span>
            </div>

            <div>
              <label style={labelStyle}>Machine Name</label>
              <input style={inputStyle} value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Process Type</label>
              <select style={inputStyle} value={form.type} onChange={(e) => handleChange("type", e.target.value)}>
                {MACHINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Division</label>
              <select style={inputStyle} value={form.division} onChange={(e) => handleChange("division", e.target.value)}>
                <option value="Sheet">Sheet</option>
                <option value="Reel">Reel</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Active Status</label>
              <select style={inputStyle} value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Current Floor Status</label>
              <select style={inputStyle} value={form.currentStatus} onChange={(e) => handleChange("currentStatus", e.target.value)}>
                <option value="Idle">Idle</option>
                <option value="Running">Running</option>
                <option value="Breakdown">Breakdown</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </div>

            {}
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#2196F3" }}>CAPACITY & SHIFTS</span>
            </div>

            <div>
              <label style={labelStyle}>Practical Run Rate (units/hr)</label>
              <input
                type="number"
                style={inputStyle}
                value={form.practicalRunRate}
                onChange={(e) => handleChange("practicalRunRate", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Capacity Unit</label>
              <select style={inputStyle} value={form.capacityUnit} onChange={(e) => handleChange("capacityUnit", e.target.value)}>
                {["Sheets", "Kg", "Pcs", "Meters", "Units"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Std Shift Hours</label>
              <input
                type="number"
                style={inputStyle}
                value={form.standardShiftHours}
                onChange={(e) => handleChange("standardShiftHours", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Max Shifts Allowed</label>
              <select style={inputStyle} value={form.maxShiftsAllowed} onChange={(e) => handleChange("maxShiftsAllowed", Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Shift Start Time</label>
              <input type="time" style={inputStyle} value={form.shiftStartTime} onChange={(e) => handleChange("shiftStartTime", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Shift End Time</label>
              <input type="time" style={inputStyle} value={form.shiftEndTime} onChange={(e) => handleChange("shiftEndTime", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Break Time (hrs)</label>
              <input
                type="number"
                step="0.5"
                style={inputStyle}
                value={form.breakTime}
                onChange={(e) => handleChange("breakTime", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Min Batch Size</label>
              <input
                type="number"
                style={inputStyle}
                value={form.minBatchSize}
                onChange={(e) => handleChange("minBatchSize", Number(e.target.value))}
              />
            </div>

            {}
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#4CAF50" }}>OVERTIME & MAINTENANCE</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={!!form.overtimeAllowed} onChange={(e) => handleChange("overtimeAllowed", e.target.checked)} />
              <label style={{ ...labelStyle, marginBottom: 0 }}>Overtime Allowed</label>
            </div>
            <div>
              <label style={labelStyle}>Max OT Hours / Day</label>
              <input
                type="number"
                step="0.5"
                style={inputStyle}
                value={form.maxOvertimeHours}
                onChange={(e) => handleChange("maxOvertimeHours", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>2nd Shift Lead Time (hrs)</label>
              <input
                type="number"
                style={inputStyle}
                value={form.secondShiftLeadTime}
                onChange={(e) => handleChange("secondShiftLeadTime", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Planned Maint. Hours / Wk</label>
              <input
                type="number"
                step="0.5"
                style={inputStyle}
                value={form.plannedMaintenanceHours}
                onChange={(e) => handleChange("plannedMaintenanceHours", Number(e.target.value))}
              />
            </div>

            {}
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#F44336" }}>TIMING DEFAULTS (hours)</span>
            </div>

            <div>
              <label style={labelStyle}>Setup Time (first job)</label>
              <input
                type="number"
                step="0.25"
                style={inputStyle}
                value={form.setupTimeDefault}
                onChange={(e) => handleChange("setupTimeDefault", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Changeover Time</label>
              <input
                type="number"
                step="0.25"
                style={inputStyle}
                value={form.changeoverTimeDefault}
                onChange={(e) => handleChange("changeoverTimeDefault", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Priority Rank</label>
              <input
                type="number"
                style={inputStyle}
                value={form.priorityRank}
                onChange={(e) => handleChange("priorityRank", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Cost Per Hour</label>
              <input
                type="number"
                style={inputStyle}
                value={form.costPerHour}
                onChange={(e) => handleChange("costPerHour", Number(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Operator Requirement</label>
              <input
                type="number"
                style={inputStyle}
                value={form.operatorRequirement}
                onChange={(e) => handleChange("operatorRequirement", Number(e.target.value))}
              />
            </div>

            {}
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#9C27B0" }}>SCHEDULING — PARALLEL GROUP & PRODUCT COMPATIBILITY</span>
            </div>

            <div>
              <label style={labelStyle}>Parallel Machine Group</label>
              <select style={inputStyle} value={form.parallelMachineGroup || ""} onChange={(e) => handleChange("parallelMachineGroup", e.target.value)}>
                {PARALLEL_MACHINE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g || "— None —"}
                  </option>
                ))}
              </select>
            </div>

            {}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>
                Product Compatibility
                {compatList.length > 0 && (
                  <span style={{ marginLeft: 8, color: "#FF9800", fontWeight: 800 }}>
                    ({compatList.length} selected)
                  </span>
                )}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_SKU_FAMILIES.map((sku) => {
                  const checked = compatList.includes(sku);
                  return (
                    <button
                      key={sku}
                      type="button"
                      onClick={() => toggleCompat(sku)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: checked ? "#FF9800" : "#1a1a1a",
                        color: checked ? "#000" : "#666",
                        border: `1px solid ${checked ? "#FF9800" : "#333"}`,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {sku}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleChange("productCompatibility", [...ALL_SKU_FAMILIES])}
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: "1px solid #333",
                    background: "#1a1a1a",
                    color: "#888",
                    cursor: "pointer",
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("productCompatibility", [])}
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: "1px solid #333",
                    background: "#1a1a1a",
                    color: "#888",
                    cursor: "pointer",
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {}
            <div style={{ gridColumn: "1 / -1", marginTop: 10 }}>
              <label style={labelStyle}>Working Days</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background: (form.workingDays || []).includes(day) ? "#FF9800" : "#1a1a1a",
                      color: (form.workingDays || []).includes(day) ? "#000" : "#666",
                      border: "1px solid #333",
                      cursor: "pointer",
                    }}
                  >
                    {day.slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 40, display: "flex", gap: 15 }}>
            <button
              onClick={() => handleUpdate(machine._id, form)}
              style={{
                flex: 1,
                padding: "12px",
                background: "#FF9800",
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              SAVE CONFIGURATION
            </button>
            <button
              onClick={() => setEditingMachine(null)}
              style={{
                padding: "12px 25px",
                background: "#222",
                color: "#fff",
                border: "1px solid #333",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade">
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}>🏭 Machine Master</h2>
          <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
            Configure capacity, shifts, parallel groups, and product compatibility per machine
          </p>
        </div>
      </div>

      {}
      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#FF9800", marginBottom: 12, letterSpacing: 1 }}>ADD NEW MACHINE</div>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Machine Name"
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select style={{ ...inputStyle, width: 200 }} value={machineType} onChange={(e) => setMachineType(e.target.value)}>
            {MACHINE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={loading}
            style={{ padding: "0 25px", background: "#FF9800", color: "#000", border: "none", borderRadius: 6, fontWeight: 800, cursor: "pointer" }}
          >
            {loading ? "..." : "ADD MACHINE"}
          </button>
        </div>
      </div>

      {}
      <div style={{ display: "flex", gap: 10, marginBottom: 15, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, width: 220 }}
          placeholder="🔍 Search machines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select style={{ ...inputStyle, width: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option>All Types</option>
          {MACHINE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select style={{ ...inputStyle, width: 140 }} value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)}>
          <option>All Divisions</option>
          <option>Sheet</option>
          <option>Reel</option>
        </select>
        <select style={{ ...inputStyle, width: 120 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#555", alignSelf: "center" }}>
          {filteredMachines.length} / {machines.length} machines
        </span>
      </div>

      {}
      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#111", borderBottom: "1px solid #2a2a2a" }}>
              {["Machine", "Type", "Division", "Run Rate", "Shifts", "OT", "Product Compatibility", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    color: "#666",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMachines.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#444" }}>
                  No machines found
                </td>
              </tr>
            )}
            {filteredMachines.map((m) => {
              const typeColor = TYPE_COLORS[m.type] || "#888";
              const divColor = DIVISION_COLORS[m.division] || "#555";
              const compat = Array.isArray(m.productCompatibility) ? m.productCompatibility : [];

              return (
                <tr key={m._id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>
                    {m.name}
                    {m.parallelMachineGroup && (
                      <div style={{ fontSize: 10, color: "#9C27B0", marginTop: 2 }}>↔ {m.parallelMachineGroup}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: typeColor + "22",
                        color: typeColor,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {m.type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: divColor + "22",
                        color: divColor,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {m.division || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#aaa" }}>
                    {m.practicalRunRate ? `${m.practicalRunRate} ${m.capacityUnit || "Pcs"}/hr` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#aaa" }}>{m.maxShiftsAllowed || 1} × {m.standardShiftHours || 8}h</td>
                  <td style={{ padding: "12px 16px" }}>
                    {m.overtimeAllowed ? (
                      <span style={{ color: "#FF9800", fontWeight: 700, fontSize: 11 }}>+{m.maxOvertimeHours}h</span>
                    ) : (
                      <span style={{ color: "#444", fontSize: 11 }}>No</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", maxWidth: 260 }}>
                    {compat.length === 0 ? (
                      <span style={{ color: "#444", fontSize: 11 }}>Not set</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {compat.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            style={{
                              padding: "2px 7px",
                              borderRadius: 10,
                              background: "#E91E6322",
                              color: "#E91E63",
                              fontSize: 10,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                        {compat.length > 4 && (
                          <span style={{ fontSize: 10, color: "#555", alignSelf: "center" }}>+{compat.length - 4}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ color: m.status === "Active" ? "#4CAF50" : "#f44336", fontWeight: 800, fontSize: 11 }}>
                        {m.status}
                      </span>
                      {m.currentStatus && (
                        <span
                          style={{
                            fontSize: 10,
                            color:
                              m.currentStatus === "Running"
                                ? "#4CAF50"
                                : m.currentStatus === "Breakdown"
                                ? "#f44336"
                                : m.currentStatus === "Under Maintenance"
                                ? "#FF9800"
                                : "#666",
                          }}
                        >
                          {m.currentStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setEditingMachine(m)}
                        style={{
                          padding: "6px 12px",
                          background: "#3b82f622",
                          color: "#3b82f6",
                          border: "1px solid #3b82f644",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        CONFIGURE
                      </button>
                      <button
                        onClick={() => handleDelete(m._id)}
                        style={{
                          padding: "6px 12px",
                          background: "#f4433622",
                          color: "#f44336",
                          border: "1px solid #f4433644",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        DELETE
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingMachine && <EditModal machine={editingMachine} />}
    </div>
  );
}
