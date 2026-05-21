import React, { useState, useEffect, useRef } from "react";
import { operatorMasterAPI } from "../api/auth";
import {
  Modal,
  SectionTitle,
  ImportBtn,
  ExportBtn,
  TemplateBtn,
  ImportModal,
} from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import * as XLSX from "xlsx";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 6,
  fontSize: 13,
  background: "rgba(255,255,255,0.07)",
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

export default function OperatorMaster({ toast, canExportImport = true }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const emptyForm = { name: "", phone: "", username: "", password: "" };
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef(null);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });

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

  const filtered = operators
    .filter((op) =>
      [op.name, op.username, op.phone].some((v) =>
        (v || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const handleTemplate = () => {
    const headers = ["Name", "Phone", "Username", "Password"];
    const example = ["Ramesh Kumar", "9876543210", "ramesh.op", "ChangeMe123"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operators");
    XLSX.writeFile(wb, "operator_template.xlsx");
  };

  const handleExport = () => {
    if (!operators.length) {
      toast("No operators to export", "error");
      return;
    }
    const headers = ["Name", "Phone", "Username", "Status", "Last Login"];
    const rows = operators.map((op) => [
      op.name || "",
      op.phone || "",
      op.username || "",
      op.isActive ? "Active" : "Inactive",
      op.lastLogin ? new Date(op.lastLogin).toLocaleString() : "Never",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operators");
    XLSX.writeFile(wb, `operators_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast("Exported successfully", "success");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      if (!data.length) {
        toast("No data found in file", "error");
        return;
      }
      setImportProgress({
        show: true,
        current: 0,
        total: data.length,
        status: "Starting import...",
      });
      let success = 0;
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const name = row.Name || row.name;
        const username = row.Username || row.username;
        const password = row.Password || row.password;
        const phone = row.Phone || row.phone || "";
        setImportProgress((p) => ({
          ...p,
          current: i + 1,
          status: `Importing: ${name || "Operator"}`,
        }));
        if (!name || !username || !password) continue;
        try {
          await operatorMasterAPI.create({ name, username, password, phone });
          success++;
        } catch (err) {
          console.error(`Failed to import ${name}`, err);
        }
      }
      setImportProgress((p) => ({
        ...p,
        current: data.length,
        status: `Complete! Imported ${success} operators.`,
      }));
      fetchOperators();
      setTimeout(() => {
        setImportProgress((p) => ({ ...p, show: false }));
        toast(`Imported ${success} operator(s)`, "success");
      }, 1200);
    } catch (err) {
      console.error("Import error:", err);
      toast("Failed to process file", "error");
      setImportProgress((p) => ({ ...p, show: false }));
    }
    e.target.value = "";
  };

  return (
    <div className="fade">
      <SectionTitle icon="👷" title="Operator Master" sub="Manage operators and their login credentials" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Search by name, username, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <TemplateBtn onClick={handleTemplate} />
          {canExportImport && <ImportBtn onClick={() => fileInputRef.current?.click()} />}
          {canExportImport && <ExportBtn onClick={handleExport} />}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            onChange={handleImport}
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
      </div>

      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Operators"
      />

      {loading ? (
        <div style={{ color: C.muted, fontSize: 13 }}>Loading...</div>
      ) : (
        <div style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Name", "Phone", "Username", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "24px 12px", color: C.muted, fontSize: 13 }}>No operators found</td></tr>
              ) : filtered.map((op, i) => (
                <tr key={op._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={{ padding: "10px 12px", color: C.text, fontWeight: 500 }}>{op.name}</td>
                  <td style={{ padding: "10px 12px", color: C.muted }}>{op.phone || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#6366f1", fontSize: 12 }}>{op.username}</td>
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
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(op)} style={{
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
                      <button onClick={() => handleToggleActive(op)} style={{
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
                    }}>
                        <i className={`fa-solid ${op.isActive ? "fa-pause" : "fa-play"}`} /> {op.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(op._id)} style={{
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
              <button onClick={() => setShowModal(false)} style={{
                      background: "transparent",
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}><i className="fa-solid fa-xmark" /> Cancel</button>
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
