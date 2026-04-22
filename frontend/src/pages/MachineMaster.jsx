import React, { useState, useMemo, useEffect } from "react";
import { machineMasterAPI } from "../api/auth";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const MACHINE_TYPES = [
  "Bag Making",
  "Cutting",
  "Printing",
  "Die Cutting",
  "Pasting",
  "Lamination",
  "Formation",
  "Manual Formation",
];

const TYPE_ICONS = {
  "Bag Making": "👜",
  Cutting: "✂️",
  Printing: "🖨️",
  "Die Cutting": "🔲",
  Pasting: "🔧",
  Lamination: "📄",
  Formation: "📦",
  "Manual Formation": "🤲",
};

const TYPE_COLORS = {
  "Bag Making": "#9C27B0",
  Cutting: "#F44336",
  Printing: "#2196F3",
  "Die Cutting": "#FF9800",
  Pasting: "#4CAF50",
  Lamination: "#00BCD4",
  Formation: "#E91E63",
  "Manual Formation": "#8D6E63",
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
  const [viewMode, setViewMode] = useState("list");
  const [editingMachineId, setEditingMachineId] = useState(null);
  const [editForm, setEditForm] = useState({});

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
    machines.forEach((machine) => {
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
        shiftsPerDay: 1,
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

  const handleEditSave = async () => {
    if (!editForm.name?.trim()) {
      toast("Machine name is required", "error");
      return;
    }

    try {
      await machineMasterAPI.update(editingMachineId, editForm);
      setEditingMachineId(null);
      setEditForm({});
      toast("Machine updated successfully", "success");
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#FF9800', fontWeight: 600, marginRight: 10 }}>
            {filteredMachines.length} Machines Found
          </div>
        </div>
      </div>

      {}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr
              style={{
                background: "#111",
                borderBottom: "2px solid #2a2a2a",
              }}
            >
              {[
                "Machine Details",
                "Type",
                "Div",
                "Run Rate",
                "Hrs/Shft",
                "Start/End",
                "OT",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "14px 18px",
                    color: "#888",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
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
                filteredMachines.map((m, idx) => {
                  const isEditing = editingMachineId === m._id;
                  const color = TYPE_COLORS[m.type] || "#888";
                  const data = isEditing ? editForm : m;

                  return (
                    <tr
                      key={m._id}
                      style={{
                        borderBottom: "1px solid #1e1e1e",
                        background: idx % 2 === 0 ? "transparent" : "#141414",
                        transition: "background 0.2s",
                      }}
                    >
                      <td style={{ padding: "14px 18px" }}>
                        {isEditing ? (
                          <input
                            value={data.name || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            autoFocus
                            style={{
                              ...inputStyle,
                              padding: "6px 10px",
                              width: "180px",
                              border: `1px solid ${color}88`,
                            }}
                          />
                        ) : (
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#fff",
                                fontSize: 14,
                              }}
                            >
                              {m.name}
                            </div>
                            <div
                              style={{ fontSize: 10, color: "#555", marginTop: 2 }}
                            >
                              ID: {m._id.slice(-6)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <select
                          value={data.type}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setEditForm({ ...editForm, type: e.target.value })
                          }
                          style={{
                            ...inputStyle,
                            padding: "4px 8px",
                            border: `1px solid ${color}44`,
                            color: color,
                            fontWeight: 600,
                            opacity: isEditing ? 1 : 0.8,
                            cursor: isEditing ? "default" : "not-allowed",
                          }}
                        >
                          {MACHINE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <select
                          value={data.division || "Reel"}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setEditForm({ ...editForm, division: e.target.value })
                          }
                          style={{ ...inputStyle, padding: "4px 8px", width: "70px" }}
                        >
                          <option value="Reel">Reel</option>
                          <option value="Sheet">Sheet</option>
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <input
                          type="number"
                          value={data.practicalRunRate || 0}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              practicalRunRate: parseInt(e.target.value) || 0,
                            })
                          }
                          style={{ ...inputStyle, width: "60px", textAlign: "center" }}
                        />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <input
                          type="number"
                          value={data.standardShiftHours || 8}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              standardShiftHours: parseInt(e.target.value) || 8,
                            })
                          }
                          style={{ ...inputStyle, width: "40px", textAlign: "center" }}
                        />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <input 
                              type="text" 
                              value={data.shiftStartTime || "09:00"}
                              disabled={!isEditing}
                              onChange={(e) => setEditForm({...editForm, shiftStartTime: e.target.value})}
                              style={{...inputStyle, padding: '2px 4px', fontSize: 10, width: 50}}
                            />
                            <input 
                              type="text" 
                              value={data.shiftEndTime || "17:00"}
                              disabled={!isEditing}
                              onChange={(e) => setEditForm({...editForm, shiftEndTime: e.target.value})}
                              style={{...inputStyle, padding: '2px 4px', fontSize: 10, width: 50}}
                            />
                         </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                         <input 
                           type="checkbox"
                           checked={data.overtimeAllowed || false}
                           disabled={!isEditing}
                           onChange={(e) => setEditForm({...editForm, overtimeAllowed: e.target.checked})}
                         />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              m.status === "Active"
                                ? "#4CAF5022"
                                : "#f4433622",
                            color: m.status === "Active" ? "#4CAF50" : "#f44336",
                            cursor: isEditing ? "pointer" : "default",
                          }}
                          onClick={() => {
                            if (isEditing) {
                              setEditForm({
                                ...editForm,
                                status:
                                  editForm.status === "Active"
                                    ? "Inactive"
                                    : "Active",
                              });
                            }
                          }}
                        >
                          {isEditing ? editForm.status : m.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleEditSave}
                                style={{
                                  padding: "6px 10px",
                                  background: "#4CAF5022",
                                  color: "#4CAF50",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 14,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Confirm Changes"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMachineId(null);
                                  setEditForm({});
                                }}
                                style={{
                                  padding: "6px 10px",
                                  background: "#f4433622",
                                  color: "#f44336",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 14,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMachineId(m._id);
                                  setEditForm({ ...m });
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "#FF980022",
                                  color: "#FF9800",
                                  border: "none",
                                  borderRadius: 4,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Edit Machine"
                              >
                                🖊️
                              </button>
                              <button
                                onClick={() => handleDelete(m)}
                                style={{
                                  background: "#450a0a",
                                  color: "#ef4444",
                                  border: "1px solid #7f1d1d",
                                  borderRadius: 6,
                                  padding: "4px 14px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      

      {}
      {/* Capacity view removed as per user request */}
    </div>
  );
}
