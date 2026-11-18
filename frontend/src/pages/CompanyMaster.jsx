import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import {
  ImportModal,
  ListToolbar,
  Modal,
  NameWithAvatar,
  SectionTitle,
} from "../components/ui/BasicComponents";
import { companyMasterAPI } from "../api/auth";
import ConfirmModal from "../components/ConfirmModal";
import * as XLSX from "xlsx";
import { IconBtn } from "../components/ui/IconBtn";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 13,
  background: "#141414",
  color: "#ededed",
  outline: "none",
  boxSizing: "border-box",
};

const cardStyle = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
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
  const [showModal, setShowModal] = useState(false);
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

  const blankForm = {
    name: "",
    contact: "",
    email: "",
    gstin: "",
    category: "",
    priority: 3,
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(blankForm);
  };

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
      setShowModal(false);
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
    setShowModal(true);
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
        icon="fa-solid fa-building"
        title="Company Master"
        sub="Manage multiple operating companies or entities"
      />

      {}
      {showModal && (
        <Modal
          title={editingId ? "Edit company" : "New company"}
          maxWidth={720}
          onClose={closeModal}
        >
          <div>
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
                  Company name *
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
                  Type / category
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
                  Contact person
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
                  Email
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
                  Gst number
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
                  Client priority (1-5)
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
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}
          >
            <button type="button" className="lg-btn" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="lg-btn lg-btn-primary"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading
                ? "Saving…"
                : editingId
                  ? "Update company"
                  : "Add company"}
            </button>
          </div>
        </Modal>
      )}
      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleImport}
        accept=".xlsx, .xls"
      />

      {}
      <ListToolbar
        search={searchTerm}
        setSearch={setSearchTerm}
        placeholder="Search by name, contact..."
        onAdd={() => {
          setEditingId(null);
          setFormData(blankForm);
          setShowModal(true);
        }}
        addLabel="Add company"
        count={filtered.length}
        onSelectModeChange={(on) => {
          if (!on) setSelectedIds(new Set());
        }}
        exportOptions={[
          canExportImport && {
            label: "Excel",
            icon: "fa-solid fa-file-excel",
            onClick: handleExportExcel,
          },
        ].filter(Boolean)}
        onImport={
          canExportImport ? () => fileInputRef.current.click() : undefined
        }
        onTemplate={handleTemplate}
      />
      <div style={{ height: 12 }} />
      <div>
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
                    padding: "8px 16px",
                    marginBottom: 12,
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "#a3a3a3",
                  }}
                >
                  {selectedIds.size} selected
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="lg-btn"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="lg-btn lg-btn-danger"
                      onClick={handleBulkDelete}
                    >
                      <i className="fa-solid fa-trash" /> Delete selected
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
                            fontWeight: 600,
                            color: C.muted,
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
                              fontWeight: 600,
                              color: C.muted,
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
                              ? "rgba(200, 149, 90, 0.06)"
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
                              padding: "12px 14px",
                              fontWeight: 500,
                              color: "#ededed",
                            }}
                          >
                            <NameWithAvatar name={company.name} />
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a3a3a3" }}
                          >
                            {company.category || "-"}
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a3a3a3" }}
                          >
                            {company.contact || "-"}
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a3a3a3" }}
                          >
                            {company.email || "-"}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "#a3a3a3",
                              fontSize: 11,
                            }}
                          >
                            {company.gstin || "-"}
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a3a3a3" }}
                          >
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
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                background:
                                  company.status === "Active"
                                    ? "rgba(134,184,148,0.14)"
                                    : "rgba(224,112,95,0.14)",
                                color:
                                  company.status === "Active"
                                    ? "#86b894"
                                    : "#e0705f",
                              }}
                            >
                              {company.status || "Active"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <IconBtn
                                icon="fa-pen-to-square"
                                label="Edit"
                                onClick={() => handleEdit(company)}
                              />
                              <button
                                onClick={() => handleToggleStatus(company)}
                                style={{
                                  background: "transparent",
                                  color: "#c8955a",
                                  border: "1px solid #c8955a98",
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
                              <IconBtn
                                icon="fa-trash"
                                label="Delete"
                                danger
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    id: company._id,
                                  })
                                }
                              />
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
