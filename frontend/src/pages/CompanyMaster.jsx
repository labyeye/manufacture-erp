import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import {
  SectionTitle,
  ImportBtn,
  ExportBtn,
  TemplateBtn,
  ImportModal,
} from "../components/ui/BasicComponents";
import { companyMasterAPI } from "../api/auth";
import ConfirmModal from "../components/ConfirmModal";
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

const cardStyle = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
  boxShadow:
    "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
};

export default function CompanyMaster({ toast, canExportImport = true }) {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    gstin: "",
    category: "",
    priority: 3,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
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

  const filtered = companies
    .filter(
      (c) =>
        !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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
      setFormData({
        name: "",
        contact: "",
        email: "",
        gstin: "",
        category: "",
        priority: 3,
      });
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
      priority: company.priority || 3,
    });
    setEditingId(company._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    try {
      await companyMasterAPI.delete(confirmModal.id);
      toast("Company deleted", "success");
      fetchCompanies();
    } catch (error) {
      toast("Failed to delete company", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => companyMasterAPI.delete(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setSelectedIds(new Set());
      fetchCompanies();
      if (failed === 0) toast(`${ids.length} company(s) deleted`, "success");
      else
        toast(
          `${ids.length - failed} deleted, ${failed} failed`,
          failed === ids.length ? "error" : "warning",
        );
    } catch (error) {
      toast("Failed to delete selected companies", "error");
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids, allSelected) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
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

  const handleTemplate = () => {
    const header = ["Name", "Category", "Contact Person", "Email", "GSTIN"];
    const ws = XLSX.utils.aoa_to_sheet([header]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company Template");
    XLSX.writeFile(wb, "Company_Master_Template.xlsx");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
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
        setImportProgress((p) => ({
          ...p,
          current: i + 1,
          status: `Importing: ${row.Name || row.name || "Company"}`,
        }));

        const payload = {
          name: row.Name || row.name,
          category: row.Category || row.category,
          contact: row["Contact Person"] || row.contact,
          email: row.Email || row.email,
          gstin: row.GSTIN || row.gstin,
        };
        if (payload.name) {
          try {
            await companyMasterAPI.create(payload);
            success++;
          } catch (err) {
            console.error(err);
          }
        }
      }
      toast(`Successfully imported ${success} companies`, "success");
      fetchCompanies();
    } catch (err) {
      toast("Import failed", "error");
    } finally {
      setLoading(false);
      setImportProgress({ show: false, current: 0, total: 0, status: "" });
      e.target.value = "";
    }
  };

  const handleExportExcel = () => {
    if (companies.length === 0) {
      toast("No companies to export", "error");
      return;
    }
    const header = [
      "Name",
      "Category",
      "Contact Person",
      "Email",
      "GSTIN",
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
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Companies");
    XLSX.writeFile(wb, "Company_Master.xlsx");
    toast("Exported successfully", "success");
  };

  return (
    <div className="fade">
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Companies"
      />
      <SectionTitle
        icon="🏢"
        title="Company Master"
        sub="Manage multiple operating companies or entities"
      />

      {}
      <div style={cardStyle}>
        <div
          style={{
            marginBottom: 14,
            fontSize: 14,
            fontWeight: 500,
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
              CLIENT PRIORITY (1-5)
            </label>
            <select
              style={inputStyle}
              value={formData.priority}
              onChange={(e) =>
                handleChange("priority", parseInt(e.target.value))
              }
            >
              <option value={1}>1 - Urgent / VIP</option>
              <option value={2}>2 - High Priority</option>
              <option value={3}>3 - Normal</option>
              <option value={4}>4 - Low Priority</option>
              <option value={5}>5 - Bulk / Flexible</option>
            </select>
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
              fontWeight: 500,
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
                background: "transparent",
                color: "#aaa",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          {canExportImport && (
            <ExportBtn onClick={handleExportExcel} label="Export" />
          )}
          <TemplateBtn onClick={handleTemplate} />
          {canExportImport && (
            <ImportBtn onClick={() => fileInputRef.current.click()} />
          )}
          <input
            type="file"
            ref={fileInputRef}
            hidden
            onChange={handleImport}
            accept=".xlsx, .xls"
          />
        </div>
      </div>

      {}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: "#e0e0e0" }}>
            Companies{searchTerm ? ` (${filtered.length} of ${companies.length})` : ` (${companies.length})`}
          </span>
          <div style={{ position: "relative", width: 260 }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 12, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search by name, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, width: "100%", paddingLeft: 30, paddingRight: searchTerm ? 28 : 12 }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>
        </div>

        {(() => {
          const filteredIds = filtered.map((c) => c._id);
          const allSelected =
            filteredIds.length > 0 &&
            filteredIds.every((id) => selectedIds.has(id));
          const someSelected = filteredIds.some((id) => selectedIds.has(id));
          return (
            <>
              {selectedIds.size > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    marginBottom: 10,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#fecaca" }}
                  >
                    {selectedIds.size} selected
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 5,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setBulkDeleteOpen(true)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 5,
                        border: "1px solid rgba(239,68,68,0.4)",
                        background: "rgba(239,68,68,0.15)",
                        color: "#ef4444",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
              {filtered.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#555",
                    padding: 40,
                    fontSize: 13,
                  }}
                >
                  {searchTerm ? "No results found" : "No companies added yet."}
                </div>
              ) : (
                <div
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <th
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            whiteSpace: "nowrap",
                            width: 36,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el)
                                el.indeterminate = !allSelected && someSelected;
                            }}
                            onChange={() =>
                              toggleSelectAll(filteredIds, allSelected)
                            }
                            style={{ cursor: "pointer" }}
                          />
                        </th>
                        {[
                          "Company Name",
                          "Type",
                          "Contact Person",
                          "Email",
                          "GST Number",
                          "Priority",
                          "Status",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 14px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 700,
                              color: C.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((company, i) => (
                        <tr
                          key={company._id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: selectedIds.has(company._id)
                              ? "rgba(96,165,250,0.08)"
                              : i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.01)",
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedIds.has(company._id))
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedIds.has(company._id))
                              e.currentTarget.style.background =
                                i % 2 === 0
                                  ? "transparent"
                                  : "rgba(255,255,255,0.01)";
                          }}
                        >
                          <td style={{ padding: "12px", width: 36 }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(company._id)}
                              onChange={() => toggleSelect(company._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: 600,
                              color: "#e0e0e0",
                            }}
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
                              fontSize: 11,
                            }}
                          >
                            {company.gstin || "-"}
                          </td>
                          <td style={{ padding: "12px", color: "#aaa" }}>
                            <span
                              style={{
                                color:
                                  company.priority === 1
                                    ? C.red
                                    : company.priority === 2
                                      ? C.orange
                                      : C.muted,
                                fontWeight: 500,
                              }}
                            >
                              P{company.priority || 3}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 500,
                                background:
                                  company.status === "Active"
                                    ? "#4CAF5022"
                                    : "#f4433622",
                                color:
                                  company.status === "Active"
                                    ? "#4CAF50"
                                    : "#f44336",
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
                                onClick={() => handleToggleStatus(company)}
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
                                <i
                                  className={`fa-solid ${company.status === "Active" ? "fa-pause" : "fa-play"}`}
                                />{" "}
                                {company.status === "Active"
                                  ? "Pause"
                                  : "Activate"}
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    id: company._id,
                                  })
                                }
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
      <ConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Companies"
        message={`Delete ${selectedIds.size} selected company(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
