import React, { useState, useEffect } from "react";
import { operatorMasterAPI } from "../api/auth";
import { Modal, SectionTitle } from "../components/ui/BasicComponents";
import { C } from "../constants/colors";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(8px) saturate(180%)",
  WebkitBackdropFilter: "blur(8px) saturate(180%)",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  color: C.muted,
  marginBottom: 5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export default function OperatorMaster({ toast }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const emptyForm = { name: "", phone: "", username: "", password: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchOperators(); }, []);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const res = await operatorMasterAPI.getAll();
      setOperators(res.operators || []);
    } catch {
      toast("Failed to fetch operators", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (op) => {
    setForm({ name: op.name, phone: op.phone || "", username: op.username, password: "" });
    setEditingId(op._id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast("Name and username are required", "error");
      return;
    }
    if (!editingId && !form.password.trim()) {
      toast("Password is required for new operator", "error");
      return;
    }
    try {
      if (editingId) {
        const payload = { name: form.name, phone: form.phone, username: form.username };
        if (form.password.trim()) payload.password = form.password;
        await operatorMasterAPI.update(editingId, payload);
        toast("Operator updated", "success");
      } else {
        await operatorMasterAPI.create({ name: form.name, phone: form.phone, username: form.username, password: form.password });
        toast("Operator created", "success");
      }
      setShowModal(false);
      fetchOperators();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to save operator", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this operator?")) return;
    try {
      await operatorMasterAPI.delete(id);
      toast("Operator deleted", "success");
      fetchOperators();
    } catch {
      toast("Failed to delete operator", "error");
    }
  };

  const handleToggleActive = async (op) => {
    try {
      await operatorMasterAPI.update(op._id, { isActive: !op.isActive });
      toast(`Operator ${op.isActive ? "deactivated" : "activated"}`, "success");
      fetchOperators();
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const filtered = operators.filter((op) =>
    [op.name, op.username, op.phone].some((v) =>
      (v || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="fade">
      <SectionTitle icon="👷" title="Operator Master" sub="Manage operators and their login credentials" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <input
          placeholder="Search by name, username, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <button
          onClick={openCreate}
          style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: "#6366f1", color: "#fff", fontWeight: 600,
            fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          + Add Operator
        </button>
      </div>

      {loading ? (
        <div style={{ color: C.muted, fontSize: 13 }}>Loading...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                {["Name", "Phone", "Username", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "24px 12px", color: C.muted, fontSize: 13 }}>No operators found</td></tr>
              ) : filtered.map((op) => (
                <tr key={op._id} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <td style={{ padding: "10px 12px", color: C.text, fontWeight: 500 }}>{op.name}</td>
                  <td style={{ padding: "10px 12px", color: C.muted }}>{op.phone || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#6366f1", fontFamily: "monospace", fontSize: 12 }}>{op.username}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: op.isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: op.isActive ? "#22c55e" : "#ef4444",
                    }}>{op.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12 }}>
                    {op.lastLogin ? new Date(op.lastLogin).toLocaleDateString("en-GB") : "Never"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(op)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", color: "#818cf8", fontSize: 12, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => handleToggleActive(op)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${op.isActive ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, background: op.isActive ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", color: op.isActive ? "#ef4444" : "#22c55e", fontSize: 12, cursor: "pointer" }}>
                        {op.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(op._id)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editingId ? "Edit Operator" : "Add Operator"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} placeholder="e.g. Ramesh Kumar" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Login Username *</label>
              <input style={inputStyle} placeholder="e.g. ramesh.op" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>{editingId ? "New Password (leave blank to keep)" : "Password *"}</label>
              <input style={inputStyle} type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "9px 22px", borderRadius: 6, border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
