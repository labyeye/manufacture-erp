import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import {
  ListToolbar,
  SectionTitle,
  Badge,
  NameWithAvatar,
  Modal,
  FormGrid,
  Field,
} from "../components/ui/BasicComponents";
import { vendorMasterAPI } from "../api/auth";
import * as XLSX from "xlsx";
import { IconBtn } from "../components/ui/IconBtn";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 6,
  fontSize: 13,
  background: "rgba(255,255,255,0.07)",
  color: "#dfe2f4",
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

export default function VendorMaster({
  vendorMaster: globalVendors,
  refreshData,
  toast,
  canExportImport = true,
}) {
  const [vendorMaster, setVendorMaster] = useState(globalVendors || []);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    gstin: "",
    category: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [importProgress, setImportProgress] = useState({
    show: false,
    current: 0,
    total: 0,
    status: "",
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (globalVendors) setVendorMaster(globalVendors);
    else fetchVendors();
  }, [globalVendors]);

  const fetchVendors = async () => {
    try {
      if (refreshData) {
        await refreshData();
      } else {
        const res = await vendorMasterAPI.getAll();
        setVendorMaster(res.vendors || []);
      }
    } catch (error) {
      toast?.("Failed to load vendors", "error");
    }
  };

  const filtered = vendorMaster
    .filter(
      (v) =>
        !searchTerm ||
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contact?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const blankForm = {
    name: "",
    contact: "",
    email: "",
    gstin: "",
    category: "",
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(blankForm);
  };

  const handleChange = (field, value) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast("Vendor name is required", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await vendorMasterAPI.update(editingId, formData);
        toast("Vendor updated successfully", "success");
        setEditingId(null);
      } else {
        await vendorMasterAPI.create(formData);
        toast("Vendor added successfully", "success");
      }
      setFormData({
        name: "",
        contact: "",
        email: "",
        gstin: "",
        category: "",
      });
      setShowModal(false);
      fetchVendors();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save vendor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vendor) => {
    setFormData({
      name: vendor.name,
      contact: vendor.contact || "",
      email: vendor.email || "",
      gstin: vendor.gstin || "",
      category: vendor.category || "",
    });
    setEditingId(vendor._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this vendor?")) return;

    try {
      await vendorMasterAPI.delete(id);
      toast("Vendor deleted", "success");
      fetchVendors();
    } catch (error) {
      toast("Failed to delete vendor", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} vendor(s)?`)) return;
    const ids = Array.from(selectedIds);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => vendorMasterAPI.delete(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setSelectedIds(new Set());
      fetchVendors();
      if (failed === 0) toast(`${ids.length} vendor(s) deleted`, "success");
      else
        toast(
          `${ids.length - failed} deleted, ${failed} failed`,
          failed === ids.length ? "error" : "warning",
        );
    } catch (error) {
      toast("Failed to delete selected vendors", "error");
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

  const handleToggleStatus = async (vendor) => {
    try {
      const newStatus = vendor.status === "Active" ? "Inactive" : "Active";
      await vendorMasterAPI.updateStatus(vendor._id, newStatus);
      fetchVendors();
    } catch (error) {
      toast("Failed to update status", "error");
    }
  };

  const handleExportExcel = () => {
    if (vendorMaster.length === 0) {
      toast("No vendors to export", "error");
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
    const rows = vendorMaster.map((v) => [
      v.name,
      v.category || "",
      v.contact || "",
      v.email || "",
      v.gstin || "",
      v.status || "Active",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, "vendors.xlsx");
    toast("Exported successfully", "success");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const total = rows.length;
      if (total <= 0) return;

      setImportProgress({
        show: true,
        current: 0,
        total: total,
        status: "Starting import...",
      });

      let successCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row["Name"] || row.name || "";
        if (!name) continue;

        setImportProgress((prev) => ({
          ...prev,
          current: i + 1,
          status: `Pushing: ${name}`,
        }));

        try {
          await vendorMasterAPI.create({
            name,
            category: row["Category"] || row.category || "",
            contact: row["Phone/WhatsApp"] || row.contact || "",
            email: row["Email"] || row.email || "",
            gstin: row["GST Number"] || row.gstin || "",
            status: row["Status"] || row.status || "Active",
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import ${name}`, error);
        }
      }

      setImportProgress((prev) => ({
        ...prev,
        current: total,
        status: `Complete! Imported ${successCount} vendors.`,
      }));

      fetchVendors();
      setTimeout(() => {
        setImportProgress((p) => ({ ...p, show: false }));
        toast(`Imported ${successCount} vendors successfully`, "success");
      }, 1500);
    } catch (error) {
      console.error("Import error:", error);
      toast("Failed to process file", "error");
      setImportProgress((p) => ({ ...p, show: false }));
    }
    e.target.value = "";
  };

  const handleTemplate = () => {
    const header = [
      "Name",
      "Category",
      "Phone/WhatsApp",
      "Email",
      "GST Number",
      "Status",
    ];
    const sample = [
      "Example Vendor",
      "Paper Supplier",
      "9876543210",
      "vendor@email.com",
      "22AAAAA0000A1Z5",
      "Active",
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, "vendor_template.xlsx");
  };

  return (
    <div className="fade">
      {importProgress.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 30,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "#4CAF50",
                marginBottom: 8,
              }}
            >
              Importing Vendors
            </div>
            <div style={{ fontSize: 13, color: "#6f74a0", marginBottom: 24 }}>
              Processing {importProgress.total} vendors
            </div>

            <div
              style={{
                height: 8,
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  background: "#4CAF50",
                  transition: "width 0.1s ease",
                  boxShadow: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 500,
                color: "#8b90b8",
                marginBottom: 20,
              }}
            >
              <span style={{ color: "#4CAF50" }}>
                {importProgress.current} done
              </span>
              <span>of {importProgress.total} total</span>
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#6f74a0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {importProgress.status}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <Modal
          title={editingId ? "Edit vendor" : "New vendor"}
          maxWidth={640}
          onClose={closeModal}
        >
          <FormGrid>
            <Field label="Vendor name *">
              <input
                className="lg-input"
                placeholder="Vendor name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </Field>
            <Field label="Category">
              <input
                className="lg-input"
                placeholder="e.g. Paper supplier, Ink supplier"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
              />
            </Field>
            <Field label="Phone / WhatsApp">
              <input
                className="lg-input"
                placeholder="Phone number"
                value={formData.contact}
                onChange={(e) => handleChange("contact", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                className="lg-input"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </Field>
            <Field label="GST number">
              <input
                className="lg-input"
                placeholder="GST / Tax ID"
                value={formData.gstin}
                onChange={(e) => handleChange("gstin", e.target.value)}
              />
            </Field>
          </FormGrid>
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
              {loading ? "Saving…" : editingId ? "Update vendor" : "Add vendor"}
            </button>
          </div>
        </Modal>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        onChange={handleImportExcel}
      />

      {}
      <ListToolbar
        search={searchTerm}
        setSearch={setSearchTerm}
        placeholder="Search by name, contact..."
        count={filtered.length}
        onAdd={() => {
          setEditingId(null);
          setFormData(blankForm);
          setShowModal(true);
        }}
        addLabel="Add vendor"
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
          canExportImport ? () => fileInputRef.current?.click() : undefined
        }
        onTemplate={handleTemplate}
      />
      <div style={{ height: 12 }} />
      <div>
        {(() => {
          const filteredIds = filtered.map((v) => v._id);
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
                    background: "#0b0e2d",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "#a9aed3",
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
                    color: "#6f74a0",
                    padding: 40,
                    fontSize: 13,
                  }}
                >
                  {searchTerm
                    ? "No vendors found"
                    : "No vendors yet. They auto-populate when you create Purchase Orders."}
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
                          "Vendor name",
                          "Category",
                          "Phone / WhatsApp",
                          "Email",
                          "GST number",
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
                      {filtered.map((vendor, i) => (
                        <tr
                          key={vendor._id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: selectedIds.has(vendor._id)
                              ? "rgba(174, 180, 238, 0.06)"
                              : i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.01)",
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedIds.has(vendor._id))
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedIds.has(vendor._id))
                              e.currentTarget.style.background =
                                i % 2 === 0
                                  ? "transparent"
                                  : "rgba(255,255,255,0.01)";
                          }}
                        >
                          <td style={{ padding: "12px 14px", width: 36 }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(vendor._id)}
                              onChange={() => toggleSelect(vendor._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              fontWeight: 500,
                              color: "#dfe2f4",
                            }}
                          >
                            <NameWithAvatar name={vendor.name} />
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a9aed3" }}
                          >
                            {vendor.category || "-"}
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a9aed3" }}
                          >
                            {vendor.contact || "-"}
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a9aed3" }}
                          >
                            {vendor.email || "-"}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "#a9aed3",
                              fontSize: 12,
                            }}
                          >
                            {vendor.gstin || "-"}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                background:
                                  vendor.status === "Active"
                                    ? "rgba(134,184,148,0.14)"
                                    : "rgba(224,112,95,0.14)",
                                color:
                                  vendor.status === "Active"
                                    ? "#86b894"
                                    : "#e0705f",
                              }}
                            >
                              {vendor.status || "Active"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <IconBtn
                                icon="fa-pen-to-square"
                                label="Edit"
                                onClick={() => handleEdit(vendor)}
                              />
                              <IconBtn
                                icon={
                                  vendor.status === "Active"
                                    ? "fa-pause"
                                    : "fa-play"
                                }
                                label={
                                  vendor.status === "Active"
                                    ? "Pause"
                                    : "Activate"
                                }
                                onClick={() => handleToggleStatus(vendor)}
                              />
                              <IconBtn
                                icon="fa-trash"
                                label="Delete"
                                danger
                                onClick={() => handleDelete(vendor._id)}
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
    </div>
  );
}
