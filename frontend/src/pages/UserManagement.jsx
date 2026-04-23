import React, { useState, useEffect } from "react";
import { usersAPI } from "../api/auth";

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "search", label: "Global Search", icon: "🔍" },
  { key: "purchase", label: "Purchase Orders", icon: "🛒" },
  { key: "inward", label: "Material Inward", icon: "📥" },
  { key: "sales", label: "Sales Orders", icon: "📋" },
  { key: "jobs", label: "Job Orders", icon: "⚙️" },
  { key: "production", label: "Production", icon: "🔧" },
  { key: "printingmaster", label: "Printing Detail Master", icon: "🖨️" },
  { key: "calendar", label: "Production Calendar", icon: "📅" },
  { key: "toolingmaster", label: "Tooling Master", icon: "🛠️" },
  { key: "factorycalendar", label: "Factory Calendar", icon: "🗓️" },
  { key: "maintenance", label: "Machine Maintenance", icon: "🔧" },
  { key: "breakdowns", label: "Breakdown Log", icon: "⚠️" },
  { key: "dispatch", label: "Dispatch", icon: "🚚" },
  { key: "rawstock", label: "RM Stock", icon: "🏗️" },
  { key: "fg", label: "FG Stock", icon: "🎪" },
  { key: "consumablestock", label: "Consumable Stock", icon: "📦" },
  { key: "vendormaster", label: "Vendor Master", icon: "🏪" },
  { key: "clientmaster", label: "Client Master", icon: "👥" },
  { key: "sizemaster", label: "Category Master", icon: "📂" },
  { key: "itemmaster", label: "Item Master", icon: "📋" },
  { key: "machinemaster", label: "Machine Master", icon: "🏭" },
  { key: "companymaster", label: "Company Master", icon: "🏢" },
  { key: "users", label: "User Management", icon: "👤" },
];

const ROLE_COLORS = {
  Admin: "#FF9800",
  Manager: "#4CAF50",
  Operator: "#2196F3",
  Sales: "#9C27B0",
  Production: "#00BCD4",
  Store: "#FF5722",
  Viewer: "#607D8B",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#141414",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box",
};

const allAccess = () => {
  const acc = {};
  ALL_MODULES.forEach((m) => {
    acc[m.key] = { view: true, edit: true };
  });
  return acc;
};

const noAccess = () => {
  const acc = {};
  ALL_MODULES.forEach((m) => {
    acc[m.key] = { view: false, edit: false };
  });
  return acc;
};

export default function UserManagement({ currentUser, toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const emptyForm = {
    name: "",
    username: "",
    password: "",
    role: "Viewer",
    clientTag: "",
    allowedTabs: [],
    editableTabs: [],
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (moduleKey, type) => {
    setForm((prev) => {
      const currentAllowed = prev.allowedTabs || [];
      const currentEditable = prev.editableTabs || [];

      if (type === "view") {
        if (currentAllowed.includes(moduleKey)) {
          
          return {
            ...prev,
            allowedTabs: currentAllowed.filter((m) => m !== moduleKey),
            editableTabs: currentEditable.filter((m) => m !== moduleKey),
          };
        } else {
          return { ...prev, allowedTabs: [...currentAllowed, moduleKey] };
        }
      }

      if (type === "edit") {
        if (currentEditable.includes(moduleKey)) {
          return {
            ...prev,
            editableTabs: currentEditable.filter((m) => m !== moduleKey),
          };
        } else {
          
          return {
            ...prev,
            allowedTabs: currentAllowed.includes(moduleKey)
              ? currentAllowed
              : [...currentAllowed, moduleKey],
            editableTabs: [...currentEditable, moduleKey],
          };
        }
      }
      return prev;
    });
  };

  const handleAllAccess = () =>
    setForm((prev) => ({
      ...prev,
      allowedTabs: ALL_MODULES.map((m) => m.key),
      editableTabs: ALL_MODULES.map((m) => m.key),
    }));
  const handleNoneAccess = () =>
    setForm((prev) => ({ ...prev, allowedTabs: [], editableTabs: [] }));

  const countModules = (allowedTabs) => (allowedTabs || []).length;

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast("Enter full name", "error");
      return;
    }
    if (!form.username.trim()) {
      toast("Enter username", "error");
      return;
    }
    if (!editingId && form.password.length < 6) {
      toast("Password min 6 chars", "error");
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        const updateData = {
          name: form.name,
          role: form.role,
          allowedTabs: form.allowedTabs,
          editableTabs: form.editableTabs,
          clientTag: form.clientTag,
        };
        if (form.password && form.password !== "••••••") {
          updateData.password = form.password;
        }
        await usersAPI.update(editingId, updateData);
        toast("User updated successfully", "success");
      } else {
        await usersAPI.create({
          name: form.name,
          username: form.username,
          password: form.password,
          role: form.role,
          allowedTabs: form.allowedTabs,
          editableTabs: form.editableTabs,
          clientTag: form.clientTag,
        });
        toast("User created successfully", "success");
      }

      await fetchUsers();
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
    } catch (error) {
      console.error("Submission error:", error);
      toast(error.response?.data?.error || "Failed to save user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setForm({
      name: user.name,
      username: user.username,
      password: "••••••",
      role: user.role,
      allowedTabs: user.allowedTabs || [],
      editableTabs: user.editableTabs || [],
      clientTag: user.clientTag || "",
    });
    setEditingId(user._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      await usersAPI.update(id, { isActive: !currentStatus });
      await fetchUsers();
      toast("User status updated", "success");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast("Failed to update user status", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user?")) return;

    try {
      setLoading(true);
      await usersAPI.delete(id);
      await fetchUsers();
      toast("User deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast(error.response?.data?.error || "Failed to delete user", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="fade">
      {}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#e0e0e0",
              margin: 0,
            }}
          >
            👥 User Management
          </h2>
          <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
            Add users and assign exactly which modules they can access
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm(emptyForm);
            }}
            style={{
              padding: "10px 22px",
              background: "#FF9800",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + Add User
          </button>
        )}
      </div>

      {}
      {showForm && (
        <div
          style={{
            background: "#1a1a1a",
            border: "2px solid #FF980055",
            borderRadius: 12,
            padding: "22px 24px",
            marginBottom: 20,
          }}
        >
          {}
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#FF9800",
              letterSpacing: "1.5px",
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            {editingId ? "Edit User" : "New User"}
          </div>

          {}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div>
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
                FULL NAME
              </label>
              <input
                style={inputStyle}
                placeholder="e.g. Ravi Kumar"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
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
                USERNAME
              </label>
              <input
                style={inputStyle}
                placeholder="e.g. ravi"
                value={form.username}
                disabled={!!editingId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value }))
                }
              />
            </div>
            <div>
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
                PASSWORD
              </label>
              <input
                style={inputStyle}
                type="password"
                placeholder={
                  editingId ? "Leave blank to keep current" : "Min 6 chars"
                }
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            <div>
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
                ROLE
              </label>
              <select
                style={inputStyle}
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({ ...p, role: e.target.value }))
                }
              >
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
                  CLIENT TAG (e.g. HP, ZPL)
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. HP or Hyperpure"
                  value={form.clientTag}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, clientTag: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          {}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#666",
                  letterSpacing: "0.5px",
                }}
              >
                MODULE ACCESS
              </span>
              <button
                onClick={handleAllAccess}
                style={{
                  padding: "3px 12px",
                  background: "#4CAF5022",
                  color: "#4CAF50",
                  border: "1px solid #4CAF5044",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                All Access
              </button>
              <button
                onClick={handleNoneAccess}
                style={{
                  padding: "3px 12px",
                  background: "#f4433622",
                  color: "#f44336",
                  border: "1px solid #f4433644",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                None
              </button>
            </div>

            {}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 10,
              }}
            >
              {ALL_MODULES.map((mod) => {
                const hasAccess = form.allowedTabs?.includes(mod.key) || false;
                const canEdit = form.editableTabs?.includes(mod.key) || false;
                return (
                  <div
                    key={mod.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#111",
                      borderRadius: 8,
                      border: "1px solid #222",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{mod.icon}</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: hasAccess ? "#fff" : "#555",
                          fontWeight: 600,
                        }}
                      >
                        {mod.label}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 15 }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => handleModuleToggle(mod.key, "view")}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            border: `2px solid ${hasAccess ? "#4CAF50" : "#444"}`,
                            borderRadius: 4,
                            background: hasAccess ? "#4CAF5022" : "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {hasAccess && (
                            <span style={{ fontSize: 11, color: "#4CAF50" }}>
                              ✓
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 9, color: "#666" }}>VIEW</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => handleModuleToggle(mod.key, "edit")}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            border: `2px solid ${canEdit ? "#FF9800" : "#444"}`,
                            borderRadius: 4,
                            background: canEdit ? "#FF980022" : "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {canEdit && (
                            <span style={{ fontSize: 11, color: "#FF9800" }}>
                              ✓
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 9, color: "#666" }}>EDIT</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: "10px 24px",
                background: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {editingId ? "✅ Update User" : "✓ Create User"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              style={{
                padding: "10px 20px",
                background: "#1e1e1e",
                color: "#aaa",
                border: "1px solid #333",
                borderRadius: 7,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {}
      {!showForm && (
        <div style={{ marginBottom: 14 }}>
          <input
            style={{ ...inputStyle, maxWidth: 300 }}
            placeholder="🔍 Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && (
          <div
            style={{ color: "#666", textAlign: "center", padding: "20px 0" }}
          >
            Loading...
          </div>
        )}
        {filteredUsers.map((user) => {
          const modCount = countModules(user.allowedTabs);
          const roleColor = ROLE_COLORS[user.role] || "#888";
          const initials = (user.name || user.username || "?")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={user._id}
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 10,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: roleColor + "33",
                  border: `2px solid ${roleColor}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  color: roleColor,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              {}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontWeight: 700, fontSize: 14, color: "#e0e0e0" }}
                  >
                    {user.name || user.username}
                  </span>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: roleColor + "22",
                      color: roleColor,
                    }}
                  >
                    {user.role}
                  </span>
                  <span style={{ fontSize: 12, color: "#555" }}>
                    {modCount} modules
                  </span>
                  {!user.isActive && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#f4433622",
                        color: "#f44336",
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                  @{user.username}
                </div>
              </div>

              {}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleEdit(user)}
                  style={{
                    padding: "7px 18px",
                    background: "#1976D222",
                    color: "#64B5F6",
                    border: "1px solid #1976D244",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(user._id, user.isActive)}
                  style={{
                    padding: "7px 18px",
                    background: user.isActive ? "#f4433611" : "#4CAF5011",
                    color: user.isActive ? "#f44336" : "#4CAF50",
                    border: `1px solid ${user.isActive ? "#f4433633" : "#4CAF5033"}`,
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(user._id)}
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
                  🗑️ Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            color: "#444",
            padding: "40px 0",
            fontSize: 13,
          }}
        >
          No users found
        </div>
      )}
    </div>
  );
}
