import React, { useState, useEffect } from "react";
import { usersAPI } from "../api/auth";
import { Modal } from "../components/ui/BasicComponents";
import { TABS } from "../constants/seedData";

const ROLE_COLORS = {
  Admin:      "#FF9800",
  Manager:    "#4CAF50",
  Operator:   "#2196F3",
  Sales:      "#9C27B0",
  Production: "#00BCD4",
  Store:      "#FF5722",
  Viewer:     "#607D8B",
  Client:     "#888",
};

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

export default function UserManagement({ currentUser, toast, onRefreshUser, categoryMaster }) {
  const clientCategories = React.useMemo(() => {
    const doc = (categoryMaster || []).find((c) => c.type === "Client");
    return Object.keys(doc?.subTypes || {});
  }, [categoryMaster]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const emptyForm = {
    name: "", username: "", password: "",
    role: "Viewer", clientTag: "",
    allowedTabs: [], editableTabs: [],
    allowExportImport: true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.users || []);
    } catch {
      toast("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (tabId, type) => {
    setForm((prev) => {
      const allowed = prev.allowedTabs || [];
      const editable = prev.editableTabs || [];

      if (type === "view") {
        if (allowed.includes(tabId)) {
          return {
            ...prev,
            allowedTabs: allowed.filter(t => t !== tabId),
            editableTabs: editable.filter(t => t !== tabId),
          };
        }
        return { ...prev, allowedTabs: [...allowed, tabId] };
      }

      if (type === "edit") {
        if (editable.includes(tabId)) {
          return { ...prev, editableTabs: editable.filter(t => t !== tabId) };
        }
        return {
          ...prev,
          allowedTabs: allowed.includes(tabId) ? allowed : [...allowed, tabId],
          editableTabs: [...editable, tabId],
        };
      }
      return prev;
    });
  };

  const handleAllAccess = () => setForm(prev => ({
    ...prev,
    allowedTabs: TABS.map(t => t.id),
    editableTabs: TABS.map(t => t.id),
  }));

  const handleNoneAccess = () => setForm(prev => ({
    ...prev, allowedTabs: [], editableTabs: [],
  }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast("Enter full name", "error"); return; }
    if (!form.username.trim()) { toast("Enter username", "error"); return; }
    if (!editingId && form.password.length < 6) { toast("Password min 6 chars", "error"); return; }

    try {
      setLoading(true);
      if (editingId) {
        const updateData = {
          name: form.name, role: form.role,
          allowedTabs: form.allowedTabs,
          editableTabs: form.editableTabs,
          clientTag: form.clientTag,
          allowExportImport: form.allowExportImport,
        };
        if (form.password && form.password !== "••••••") updateData.password = form.password;
        await usersAPI.update(editingId, updateData);
        toast("User updated successfully", "success");
      } else {
        await usersAPI.create({
          name: form.name, username: form.username, password: form.password,
          role: form.role, allowedTabs: form.allowedTabs,
          editableTabs: form.editableTabs, clientTag: form.clientTag,
          allowExportImport: form.allowExportImport,
        });
        toast("User created successfully", "success");
      }
      await fetchUsers();
      // If admin updated their own account, refresh the live session so sidebar updates instantly
      if (editingId && currentUser?._id === editingId && onRefreshUser) {
        await onRefreshUser();
      }
      setForm(emptyForm);
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setForm({
      name: user.name, username: user.username, password: "••••••",
      role: user.role,
      allowedTabs: user.allowedTabs || [],
      editableTabs: user.editableTabs || [],
      clientTag: user.clientTag || "",
      allowExportImport: user.allowExportImport !== false,
    });
    setEditingId(user._id);
    setShowModal(true);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      await usersAPI.update(id, { isActive: !currentStatus });
      await fetchUsers();
      toast("User status updated", "success");
    } catch { toast("Failed to update user status", "error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      setLoading(true);
      await usersAPI.delete(id);
      await fetchUsers();
      toast("User deleted successfully", "success");
    } catch (error) {
      toast(error.response?.data?.error || "Failed to delete user", "error");
    } finally { setLoading(false); }
  };

  const filteredUsers = users
    .filter(u =>
      !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#e0e0e0", margin: 0 }}>
            👥 User Management
          </h2>
          <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
            Add users and assign exactly which pages they can access
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setEditingId(null); setForm(emptyForm); }}
          style={{ background: "rgba(255,255,255,0.08)",  border: "1px solid rgba(255,255,255,0.18)", color: "#fff", padding: "9px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)" }}
        >
          + Add User
        </button>
      </div>

      {/* Form Modal */}
      {showModal && (
        <Modal title={editingId ? "Edit User" : "New User"} onClose={() => { setShowModal(false); setEditingId(null); setForm(emptyForm); }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#FF9800", letterSpacing: "1.5px", marginBottom: 18, textTransform: "uppercase" }}>
            {editingId ? "Edit User" : "New User"}
          </div>

          {/* Basic fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            {[
              { label: "FULL NAME", key: "name", placeholder: "e.g. Ravi Kumar" },
              { label: "USERNAME", key: "username", placeholder: "e.g. ravi", disabled: !!editingId },
              { label: "PASSWORD", key: "password", placeholder: editingId ? "Leave blank to keep current" : "Min 6 chars", type: "password" },
            ].map(({ label, key, placeholder, disabled, type }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#666", display: "block", marginBottom: 6, letterSpacing: "0.5px" }}>
                  {label}
                </label>
                <input
                  style={inputStyle}
                  type={type || "text"}
                  placeholder={placeholder}
                  value={form[key]}
                  disabled={disabled}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#666", display: "block", marginBottom: 6, letterSpacing: "0.5px" }}>
                ROLE
              </label>
              <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="Viewer">Viewer</option>
                <option value="Operator">Operator</option>
                <option value="Manager">Manager</option>
                <option value="Production">Production</option>
                <option value="Sales">Sales</option>
                <option value="Store">Store</option>
                <option value="Client">Client</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            {form.role === "Client" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#666", display: "block", marginBottom: 6, letterSpacing: "0.5px" }}>
                  CLIENT TAG
                </label>
                <select style={inputStyle}
                  value={form.clientTag}
                  onChange={e => setForm(p => ({ ...p, clientTag: e.target.value }))}>
                  <option value="">-- Select Category --</option>
                  {clientCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Import / Export permission */}
          <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e0e0e0" }}>Allow Import / Export</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Excel & PDF import/export buttons across all pages</div>
            </div>
            <div
              onClick={() => setForm(p => ({ ...p, allowExportImport: !p.allowExportImport }))}
              style={{
                width: 40, height: 22, borderRadius: 11, cursor: "pointer",
                background: form.allowExportImport ? "#4CAF50" : "#444",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
                left: form.allowExportImport ? 21 : 3,
              }} />
            </div>
          </div>

          {/* Page permissions */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#666", letterSpacing: "0.5px" }}>
                PAGE ACCESS ({form.allowedTabs?.length || 0}/{TABS.length})
              </span>
              <button onClick={handleAllAccess} style={{
                padding: "3px 12px", background: "#4CAF5022", color: "#4CAF50",
                border: "1px solid #4CAF5044", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
              }}>All Access</button>
              <button onClick={handleNoneAccess} style={{
                padding: "3px 12px", background: "#f4433622", color: "#f44336",
                border: "1px solid #f4433644", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
              }}>None</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 10 }}>
              {TABS.map(tab => {
                const hasView = form.allowedTabs?.includes(tab.id) || false;
                const hasEdit = form.editableTabs?.includes(tab.id) || false;
                return (
                  <div key={tab.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{tab.icon}</span>
                      <span style={{ fontSize: 12, color: hasView ? "#fff" : "#555", fontWeight: 600 }}>
                        {tab.label}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 15 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                        onClick={() => handleModuleToggle(tab.id, "view")}>
                        <div style={{
                          width: 18, height: 18,
                          border: `2px solid ${hasView ? "#4CAF50" : "#444"}`,
                          borderRadius: 4,
                          background: hasView ? "#4CAF5022" : "rgba(255,255,255,0.05)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {hasView && <span style={{ fontSize: 11, color: "#4CAF50" }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 9, color: "#666" }}>VIEW</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                        onClick={() => handleModuleToggle(tab.id, "edit")}>
                        <div style={{
                          width: 18, height: 18,
                          border: `2px solid ${hasEdit ? "#FF9800" : "#444"}`,
                          borderRadius: 4,
                          background: hasEdit ? "#FF980022" : "rgba(255,255,255,0.05)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {hasEdit && <span style={{ fontSize: 11, color: "#FF9800" }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 9, color: "#666" }}>EDIT</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={handleSubmit} style={{
              padding: "10px 24px", background: "rgba(255,255,255,0.08)",  color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, fontWeight: 500, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}>
              {editingId ? "✅ Update User" : "✓ Create User"}
            </button>
            <button onClick={() => { setShowModal(false); setEditingId(null); setForm(emptyForm); }} style={{
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
          </div>
        </Modal>
      )}

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="🔍 Search users..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* User list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && <div style={{ color: "#666", textAlign: "center", padding: "20px 0" }}>Loading...</div>}
        {filteredUsers.map(user => {
          const roleColor = ROLE_COLORS[user.role] || "#888";
          const initials = (user.name || user.username || "?")
            .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
          const modCount = (user.allowedTabs || []).length;

          return (
            <div key={user._id} style={{
              background: "rgba(255,255,255,0.05)",  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: roleColor + "33", border: `2px solid ${roleColor}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 500, color: roleColor, flexShrink: 0,
              }}>{initials}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: "#e0e0e0" }}>
                    {user.name || user.username}
                  </span>
                  <span style={{
                    padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: roleColor + "22", color: roleColor,
                  }}>{user.role}</span>
                  <span style={{ fontSize: 12, color: "#555" }}>{modCount} pages</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: user.allowExportImport !== false ? "#4CAF5011" : "#f4433611",
                    color: user.allowExportImport !== false ? "#4CAF50" : "#f44336",
                  }}>{user.allowExportImport !== false ? "Import/Export ✓" : "Import/Export ✗"}</span>
                  {!user.isActive && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: "#f4433622", color: "#f44336",
                    }}>Inactive</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>@{user.username}</div>
              </div>

              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleEdit(user)} style={{
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
                <button onClick={() => handleToggleStatus(user._id, user.isActive)} style={{
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
                }}><i className={`fa-solid ${user.isActive ? "fa-pause" : "fa-play"}`} /> {user.isActive ? "Deactivate" : "Activate"}</button>
                <button onClick={() => handleDelete(user._id)} style={{
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
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div style={{ textAlign: "center", color: "#444", padding: "40px 0", fontSize: 13 }}>
          No users found
        </div>
      )}
    </div>
  );
}
