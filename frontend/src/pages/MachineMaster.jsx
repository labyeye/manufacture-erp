import React, { useState, useMemo, useEffect } from "react";
import { machineMasterAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const MACHINE_TYPES = [
  "Bag Making",
  "Cutting",
  "Printing",
  "Die Cutting",
  "Pasting",
  "Stitching",
  "Lamination",
  "Coating",
  "Slitting",
  "Folding",
  "Assembly",
  "Packing",
  "QC",
];

const TYPE_ICONS = {
  "Bag Making": "👜",
  Cutting: "✂️",
  Printing: "🖨️",
  "Die Cutting": "🔲",
  Pasting: "🔧",
  Stitching: "🪡",
  Lamination: "📄",
  Coating: "🎨",
  Slitting: "🔪",
  Folding: "📐",
  Assembly: "⚙️",
  Packing: "📦",
  QC: "✅",
};

const TYPE_COLORS = {
  "Bag Making": "#9C27B0",
  Cutting: "#F44336",
  Printing: "#2196F3",
  "Die Cutting": "#FF9800",
  Pasting: "#4CAF50",
  Stitching: "#E91E63",
  Lamination: "#00BCD4",
  Coating: "#FF5722",
  Slitting: "#8BC34A",
  Folding: "#FFC107",
  Assembly: "#607D8B",
  Packing: "#795548",
  QC: "#009688",
};

const inputStyle = {
  padding: "9px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#141414",
  color: "#e0e0e0",
  outline: "none",
};

export default function MachineMaster({ toast }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machineName, setMachineName] = useState("");
  const [machineType, setMachineType] = useState("Printing");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All Types");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [viewMode, setViewMode] = useState("grid");
  const [editingMachine, setEditingMachine] = useState(null);
  const [editName, setEditName] = useState("");

  
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

  
  const allMachines = useMemo(() => machines, [machines]);

  
  const machineMaster = useMemo(() => {
    const grouped = {};
    machines.forEach(machine => {
      if (!grouped[machine.type]) {
        grouped[machine.type] = [];
      }
      grouped[machine.type].push(machine);
    });
    return grouped;
  }, [machines]);

  const totalMachines = allMachines.length;
  const activeMachines = allMachines.filter(
    (m) => m.status === "Active",
  ).length;
  const inactiveMachines = allMachines.filter(
    (m) => m.status !== "Active",
  ).length;
  const configuredTypes = Object.keys(machineMaster).filter(
    (t) => (machineMaster[t] || []).length > 0,
  ).length;

  
  const filteredMachines = useMemo(
    () =>
      allMachines.filter((m) => {
        const matchSearch =
          !searchTerm ||
          m.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === "All Types" || m.type === filterType;
        const matchStatus =
          filterStatus === "All Status" || m.status === filterStatus;
        return matchSearch && matchType && matchStatus;
      }),
    [allMachines, searchTerm, filterType, filterStatus],
  );

  
  const groupedMachines = useMemo(() => {
    const groups = {};
    filteredMachines.forEach((m) => {
      if (!groups[m.type]) groups[m.type] = [];
      groups[m.type].push(m);
    });
    return groups;
  }, [filteredMachines]);

  const handleAdd = async () => {
    if (!machineName.trim()) {
      toast("Enter machine name", "error");
      return;
    }
    if (!machineType) {
      toast("Select machine type", "error");
      return;
    }

    setLoading(true);
    try {
      await machineMasterAPI.create({
        name: machineName.trim(),
        type: machineType,
        capacity: 0,
        capacityUnit: "pcs/hr",
        workingHours: 8,
        shiftsPerDay: 1
      });
      toast(`Machine "${machineName}" added to ${machineType}`, "success");
      setMachineName("");
      fetchMachines();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to add machine", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (machine) => {
    if (!confirm("Delete this machine?")) return;

    try {
      await machineMasterAPI.delete(machine._id);
      toast("Machine deleted", "success");
      fetchMachines();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to delete machine", "error");
    }
  };

  const handleToggleStatus = async (machine) => {
    const newStatus = machine.status === "Active" ? "Inactive" : "Active";
    try {
      await machineMasterAPI.updateStatus(machine._id, newStatus);
      fetchMachines();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to update status", "error");
    }
  };

  const handleEditSave = async (machine) => {
    if (!editName.trim()) return;

    try {
      await machineMasterAPI.update(machine._id, { name: editName.trim() });
      setEditingMachine(null);
      toast("Machine updated", "success");
      fetchMachines();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to update machine", "error");
    }
  };

  const handleUpdateField = async (machine, field, value) => {
    try {
      await machineMasterAPI.update(machine._id, { [field]: value });
      fetchMachines();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to update machine", "error");
    }
  };

  const typeColor = TYPE_COLORS[machineType] || "#2196F3";

  return (
    <div className="fade">
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0", margin: 0 }}
        >
          🏭 Machine Master
        </h2>
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
          Production machines — capacity, working time & shift planning
        </p>
      </div>

      {}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: "#e0e0e0" }}>
          {totalMachines}{" "}
          <span style={{ fontSize: 14, color: "#777", fontWeight: 400 }}>
            Total
          </span>
        </div>
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #4CAF5044",
            borderRadius: 8,
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: "#4CAF50" }}>
            {activeMachines}
          </span>
          <span style={{ fontSize: 13, color: "#4CAF50", fontWeight: 600 }}>
            Active
          </span>
        </div>
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #f4433644",
            borderRadius: 8,
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: "#f44336" }}>
            {inactiveMachines}
          </span>
          <span style={{ fontSize: 13, color: "#f44336", fontWeight: 600 }}>
            Inactive
          </span>
        </div>
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2196F344",
            borderRadius: 8,
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: "#2196F3" }}>
            {configuredTypes}
          </span>
          <span style={{ fontSize: 13, color: "#2196F3", fontWeight: 600 }}>
            Configured
          </span>
        </div>
      </div>

      {}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#FF9800",
            marginBottom: 14,
          }}
        >
          Add New Machine
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                display: "block",
                marginBottom: 6,
                letterSpacing: "0.5px",
              }}
            >
              MACHINE NAME *
            </label>
            <input
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              placeholder="e.g. Offset Printer 3"
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                display: "block",
                marginBottom: 6,
                letterSpacing: "0.5px",
              }}
            >
              TYPE *
            </label>
            <select
              value={machineType}
              onChange={(e) => setMachineType(e.target.value)}
              style={inputStyle}
            >
              {MACHINE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: "9px 22px",
              background: "#FF9800",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "nowrap",
        }}
      >
        <input
          style={{ ...inputStyle, width: 180 }}
          placeholder="🔍 Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={inputStyle}
        >
          <option>All Types</option>
          {MACHINE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={inputStyle}
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[
            { key: "grid", icon: "⊞", label: "Grid" },
            { key: "list", icon: "≡", label: "List" },
            { key: "capacity", icon: "📊", label: "Capacity" },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: viewMode === v.key ? "#FF9800" : "#1a1a1a",
                color: viewMode === v.key ? "#fff" : "#888",
                border: `1px solid ${viewMode === v.key ? "#FF9800" : "#2a2a2a"}`,
              }}
            >
              {v.icon} {v.label}
            </button>
          ))}
          <span
            style={{
              fontSize: 12,
              color: "#555",
              alignSelf: "center",
              marginLeft: 6,
            }}
          >
            {filteredMachines.length} machines
          </span>
        </div>
      </div>

      {}
      {viewMode === "grid" && (
        <div>
          {Object.keys(groupedMachines).length === 0 ? (
            <div
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 10,
                padding: "50px 20px",
                textAlign: "center",
                color: "#444",
                fontSize: 13,
              }}
            >
              No machines added yet. Add your first machine above.
            </div>
          ) : (
            Object.entries(groupedMachines).map(([type, machines]) => {
              const color = TYPE_COLORS[type] || "#888";
              const icon = TYPE_ICONS[type] || "⚙️";
              return (
                <div key={type} style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: color,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    {icon} {type}{" "}
                    <span
                      style={{ fontSize: 12, color: "#555", fontWeight: 400 }}
                    >
                      ({machines.length})
                    </span>
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {machines.map((machine) => (
                      <div
                        key={machine.id}
                        style={{
                          background: "#1a1a1a",
                          border: `1px solid ${color}44`,
                          borderRadius: 10,
                          padding: "16px",
                          borderTop: `2px solid ${color}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 12,
                          }}
                        >
                          <div>
                            {editingMachine === machine._id ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => handleEditSave(machine)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  handleEditSave(machine)
                                }
                                autoFocus
                                style={{
                                  ...inputStyle,
                                  padding: "4px 8px",
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: "#e0e0e0",
                                }}
                              >
                                {machine.name}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 11,
                                color: "#555",
                                marginTop: 3,
                              }}
                            >
                              Added {machine.addedDate || "—"}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                machine.status === "Active"
                                  ? "#4CAF5022"
                                  : "#f4433622",
                              color:
                                machine.status === "Active"
                                  ? "#4CAF50"
                                  : "#f44336",
                            }}
                          >
                            {machine.status}
                          </span>
                        </div>

                        {}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            marginBottom: 14,
                          }}
                        >
                          {[
                            {
                              label: "CAPACITY",
                              value: machine.capacity || "—",
                            },
                            {
                              label: "HRS/SHIFT",
                              value: machine.hrsPerShift || 8,
                              unit: "hours",
                            },
                            {
                              label: "SHIFTS",
                              value: machine.shifts || 1,
                              unit: "per day",
                            },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              style={{ textAlign: "center" }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "#555",
                                  letterSpacing: "0.5px",
                                  fontWeight: 600,
                                  marginBottom: 4,
                                }}
                              >
                                {stat.label}
                              </div>
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: "#e0e0e0",
                                  lineHeight: 1,
                                }}
                              >
                                {stat.label === "HRS/SHIFT" ? (
                                  <input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={machine.workingHours || machine.hrsPerShift || 8}
                                    onChange={(e) =>
                                      handleUpdateField(
                                        machine,
                                        "workingHours",
                                        parseInt(e.target.value) || 8,
                                      )
                                    }
                                    style={{
                                      width: 40,
                                      background: "transparent",
                                      border: "none",
                                      color: "#e0e0e0",
                                      fontSize: 18,
                                      fontWeight: 700,
                                      textAlign: "center",
                                      outline: "none",
                                    }}
                                  />
                                ) : stat.label === "SHIFTS" ? (
                                  <input
                                    type="number"
                                    min={1}
                                    max={3}
                                    value={machine.shiftsPerDay || machine.shifts || 1}
                                    onChange={(e) =>
                                      handleUpdateField(
                                        machine,
                                        "shiftsPerDay",
                                        parseInt(e.target.value) || 1,
                                      )
                                    }
                                    style={{
                                      width: 40,
                                      background: "transparent",
                                      border: "none",
                                      color: "#e0e0e0",
                                      fontSize: 18,
                                      fontWeight: 700,
                                      textAlign: "center",
                                      outline: "none",
                                    }}
                                  />
                                ) : (
                                  stat.value
                                )}
                              </div>
                              {stat.unit && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "#555",
                                    marginTop: 2,
                                  }}
                                >
                                  {stat.unit}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <button
                            onClick={() => handleToggleStatus(machine)}
                            style={{
                              flex: 1,
                              padding: "6px 0",
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              background:
                                machine.status === "Active"
                                  ? "#f4433611"
                                  : "#4CAF5011",
                              color:
                                machine.status === "Active"
                                  ? "#f44336"
                                  : "#4CAF50",
                            }}
                          >
                            {machine.status === "Active"
                              ? "Set Inactive"
                              : "Set Active"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMachine(machine._id);
                              setEditName(machine.name);
                            }}
                            style={{
                              padding: "6px 10px",
                              background: "#FF980022",
                              color: "#FF9800",
                              border: "none",
                              borderRadius: 5,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            🖊
                          </button>
                          <button
                            onClick={() => handleDelete(machine)}
                            style={{
                              padding: "6px 10px",
                              background: "#f4433622",
                              color: "#f44336",
                              border: "none",
                              borderRadius: 5,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {}
      {viewMode === "list" && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  background: "#111",
                  borderBottom: "1px solid #2a2a2a",
                }}
              >
                {[
                  "Machine Name",
                  "Type",
                  "Hrs/Shift",
                  "Shifts/Day",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      color: "#555",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#444",
                    }}
                  >
                    No machines found
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 600,
                        color: "#e0e0e0",
                      }}
                    >
                      {m.name}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          background: (TYPE_COLORS[m.type] || "#888") + "22",
                          color: TYPE_COLORS[m.type] || "#888",
                        }}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>
                      {m.hrsPerShift || 8}h
                    </td>
                    <td style={{ padding: "10px 14px", color: "#aaa" }}>
                      {m.shifts || 1}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            m.status === "Active" ? "#4CAF5022" : "#f4433622",
                          color: m.status === "Active" ? "#4CAF50" : "#f44336",
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleToggleStatus(m)}
                          style={{
                            padding: "4px 10px",
                            background: "#FF980022",
                            color: "#FF9800",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {m.status === "Active" ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          style={{
                            padding: "4px 10px",
                            background: "#f4433622",
                            color: "#f44336",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {}
      {viewMode === "capacity" && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#FF9800",
              marginBottom: 16,
            }}
          >
            📊 Capacity Overview by Type
          </h3>
          {MACHINE_TYPES.filter((t) => (machineMaster[t] || []).length > 0).map(
            (type) => {
              const machines = machineMaster[type] || [];
              const active = machines.filter((m) => m.status === "Active");
              const totalHrs = active.reduce(
                (s, m) => s + (m.hrsPerShift || 8) * (m.shifts || 1),
                0,
              );
              const color = TYPE_COLORS[type] || "#888";
              return (
                <div
                  key={type}
                  style={{
                    marginBottom: 14,
                    padding: "12px 16px",
                    background: "#111",
                    borderRadius: 8,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span
                        style={{ fontWeight: 700, color: color, fontSize: 13 }}
                      >
                        {TYPE_ICONS[type]} {type}
                      </span>
                      <span
                        style={{ fontSize: 12, color: "#555", marginLeft: 10 }}
                      >
                        {machines.length} machines ({active.length} active)
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#e0e0e0",
                        }}
                      >
                        {totalHrs}h
                      </div>
                      <div style={{ fontSize: 11, color: "#555" }}>
                        total capacity/day
                      </div>
                    </div>
                  </div>
                </div>
              );
            },
          )}
          {MACHINE_TYPES.filter((t) => (machineMaster[t] || []).length > 0)
            .length === 0 && (
            <div style={{ textAlign: "center", color: "#444", padding: 30 }}>
              No machines configured yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
