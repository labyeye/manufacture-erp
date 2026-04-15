import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import { SectionTitle } from "../components/ui/BasicComponents";
import { companyMasterAPI } from "../api/auth";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #333",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#1a1a1a",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box",
};

const cardStyle = {
  background: "#1e1e1e",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
};

export default function CompanyMaster({ toast }) {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    gstin: "",
    category: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await companyMasterAPI.getAll();
      setCompanies(res.companies || []);
    } catch (error) {
      toast?.("Failed to load companies", "error");
    }
  };

  const filtered = companies.filter(
    (c) =>
      !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleChange = (field, value) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast("Company name is required", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await companyMasterAPI.update(editingId, formData);
        toast("Company updated successfully", "success");
        setEditingId(null);
      } else {
        await companyMasterAPI.create(formData);
        toast("Company added successfully", "success");
      }
      setFormData({ name: "", contact: "", email: "", gstin: "", category: "" });
      fetchCompanies();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save company", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company) => {
    setFormData({
      name: company.name,
      contact: company.contact || "",
      email: company.email || "",
      gstin: company.gstin || "",
      category: company.category || "",
    });
    setEditingId(company._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this company?")) return;

    try {
      await companyMasterAPI.delete(id);
      toast("Company deleted", "success");
      fetchCompanies();
    } catch (error) {
      toast("Failed to delete company", "error");
    }
  };

  const handleToggleStatus = async (company) => {
    try {
      const newStatus = company.status === "Active" ? "Inactive" : "Active";
      await companyMasterAPI.updateStatus(company._id, newStatus);
      fetchCompanies();
    } catch (error) {
      toast("Failed to update status", "error");
    }
  };

  const handleExportCSV = () => {
    if (companies.length === 0) {
      toast("No companies to export", "error");
      return;
    }
    const header = [
      "Name",
      "Category",
      "Phone/WhatsApp",
      "Email",
      "GST Number",
      "Status",
    ];
    const rows = companies.map((c) => [
      c.name,
      c.category || "",
      c.contact || "",
      c.email || "",
      c.gstin || "",
      c.status || "Active",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "companies.csv";
    a.click();
    toast("Exported successfully", "success");
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="🏢"
        title="Company Master"
        sub="Manage multiple operating companies or entities"
      />

      {/* Form */}
      <div style={cardStyle}>
        <div
          style={{
            marginBottom: 14,
            fontSize: 14,
            fontWeight: 700,
            color: C.accent || "#4CAF50",
          }}
        >
          {editingId ? "✏️ Edit Entity" : "+ Add Entity"}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                display: "block",
                marginBottom: 5,
              }}
            >
              COMPANY NAME *
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. My Company Pvt Ltd"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                display: "block",
                marginBottom: 5,
              }}
            >
              TYPE / CATEGORY
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Manufacturing, Head Office"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                display: "block",
                marginBottom: 5,
              }}
            >
              CONTACT PERSON
            </label>
            <input
              style={inputStyle}
              placeholder="Primary contact name"
              value={formData.contact}
              onChange={(e) => handleChange("contact", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                display: "block",
                marginBottom: 5,
              }}
            >
              EMAIL
            </label>
            <input
              style={inputStyle}
              placeholder="official@company.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                display: "block",
                marginBottom: 5,
              }}
            >
              GST NUMBER
            </label>
            <input
              style={inputStyle}
              placeholder="GST Number"
              value={formData.gstin}
              onChange={(e) => handleChange("gstin", e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "9px 20px",
              background: loading ? "#666" : C.accent || "#4CAF50",
              color: "#000",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Saving..."
              : editingId
                ? "✅ Update Company"
                : "+ Add Company"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  contact: "",
                  email: "",
                  gstin: "",
                  category: "",
                });
              }}
              style={{
                padding: "9px 20px",
                background: "#333",
                color: "#aaa",
                border: "1px solid #444",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleExportCSV}
            style={{
              padding: "9px 16px",
              background: "#4CAF5022",
              color: "#4CAF50",
              border: "1px solid #4CAF5044",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* List */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>
            Companies ({companies.length})
          </span>
          <input
            type="text"
            placeholder="🔍 Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, width: 220, background: "#141414" }}
          />
        </div>

        {filtered.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#555", padding: 40, fontSize: 13 }}
          >
            {searchTerm ? "No results found" : "No companies added yet."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {[
                    "Company Name",
                    "Type",
                    "Contact Person",
                    "Email",
                    "GST Number",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        fontWeight: 600,
                        color: "#888",
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr
                    key={company._id}
                    style={{ borderBottom: "1px solid #222" }}
                  >
                    <td
                      style={{ padding: "12px", fontWeight: 600, color: "#e0e0e0" }}
                    >
                      {company.name}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {company.category || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {company.contact || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {company.email || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: "#aaa",
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    >
                      {company.gstin || "-"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            company.status === "Active"
                              ? "#4CAF5022"
                              : "#f4433622",
                          color:
                            company.status === "Active" ? "#4CAF50" : "#f44336",
                        }}
                      >
                        {company.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleEdit(company)}
                          style={{
                            padding: "5px 10px",
                            background: "#1976D222",
                            color: "#1976D2",
                            border: "none",
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(company)}
                          style={{
                            padding: "5px 10px",
                            background: "#FF980022",
                            color: "#FF9800",
                            border: "none",
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {company.status === "Active" ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => handleDelete(company._id)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
