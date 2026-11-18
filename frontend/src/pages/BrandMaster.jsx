import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import {
  ImportModal,
  ListToolbar,
  Modal,
  NameWithAvatar,
  SectionTitle,
} from "../components/ui/BasicComponents";
import {
  brandMasterAPI,
  companyMasterAPI,
  categoryMasterAPI,
} from "../api/auth";
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

export default function BrandMaster({ toast, canExportImport = true }) {
  const [brands, setBrands] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [clientCategories, setClientCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    companyId: null,
    companyName: "",
    clientCategory: "",
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
    fetchBrands();
    fetchCompanies();
    fetchClientCategories();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await brandMasterAPI.getAll();
      setBrands(res.brands || []);
    } catch (error) {
      toast?.("Failed to load brands", "error");
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await companyMasterAPI.getAll();
      setCompanies(res.companies || []);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const fetchClientCategories = async () => {
    try {
      const res = await categoryMasterAPI.getAll();
      const clientDoc = (res.categories || []).find((c) => c.type === "Client");
      setClientCategories(Object.keys(clientDoc?.subTypes || {}));
    } catch (error) {
      console.error("Failed to fetch client categories:", error);
    }
  };

  const filtered = brands
    .filter(
      (b) =>
        !searchTerm ||
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.companyName?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const handleChange = (field, value) => {
    if (field === "companyId") {
      const selected = companies.find((c) => c._id === value);
      setFormData((p) => ({
        ...p,
        companyId: value,
        companyName: selected ? selected.name : "",
      }));
    } else {
      setFormData((p) => ({ ...p, [field]: value }));
    }
  };

  const blankForm = {
    name: "",
    description: "",
    companyId: null,
    companyName: "",
    clientCategory: "",
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(blankForm);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast("Brand name is required", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        companyId: formData.companyId || null,
      };

      if (editingId) {
        await brandMasterAPI.update(editingId, payload);
        toast("Brand updated successfully", "success");
        setEditingId(null);
      } else {
        await brandMasterAPI.create(payload);
        toast("Brand added successfully", "success");
      }
      setFormData({
        name: "",
        description: "",
        companyId: null,
        companyName: "",
        clientCategory: "",
      });
      fetchBrands();
      setShowModal(false);
    } catch (error) {
      toast(error.response?.data?.error || "Failed to save brand", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand) => {
    setFormData({
      name: brand.name,
      description: brand.description || "",
      companyId: brand.companyId || "",
      companyName: brand.companyName || "",
      clientCategory: brand.clientCategory || "",
    });
    setEditingId(brand._id);
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await brandMasterAPI.delete(confirmModal.id);
      toast("Brand deleted", "success");
      fetchBrands();
    } catch (error) {
      toast("Failed to delete brand", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => brandMasterAPI.delete(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setSelectedIds(new Set());
      fetchBrands();
      if (failed === 0) toast(`${ids.length} brand(s) deleted`, "success");
      else
        toast(
          `${ids.length - failed} deleted, ${failed} failed`,
          failed === ids.length ? "error" : "warning",
        );
    } catch (error) {
      toast("Failed to delete selected brands", "error");
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

  const handleToggleStatus = async (brand) => {
    try {
      const newStatus = brand.status === "Active" ? "Inactive" : "Active";
      await brandMasterAPI.updateStatus(brand._id, newStatus);
      fetchBrands();
    } catch (error) {
      toast("Failed to update status", "error");
    }
  };

  const handleTemplate = () => {
    const header = [
      "Brand Name",
      "Linked Company",
      "Client Category",
      "Description",
    ];
    const ws = XLSX.utils.aoa_to_sheet([header]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Brand Template");
    XLSX.writeFile(wb, "Brand_Master_Template.xlsx");
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
          status: `Importing: ${row["Brand Name"] || row.name || "Brand"}`,
        }));

        let companyId = null;
        let companyName = "";
        if (row["Linked Company"]) {
          const found = companies.find(
            (c) => c.name.toLowerCase() === row["Linked Company"].toLowerCase(),
          );
          if (found) {
            companyId = found._id;
            companyName = found.name;
          }
        }

        const payload = {
          name: row["Brand Name"] || row.name,
          description: row.Description || row.description,
          companyId,
          companyName: companyName || row["Linked Company"] || "",
          clientCategory: row["Client Category"] || "",
        };

        if (payload.name) {
          try {
            const existing = brands.find(
              (b) => b.name.toLowerCase() === payload.name.toLowerCase(),
            );
            if (existing) {
              await brandMasterAPI.update(existing._id, payload);
            } else {
              await brandMasterAPI.create(payload);
            }
            success++;
          } catch (err) {
            console.error(err);
          }
        }
      }
      toast(`Successfully imported ${success} brands`, "success");
      fetchBrands();
    } catch (err) {
      console.error(err);
      toast("Import failed", "error");
    } finally {
      setLoading(false);
      setImportProgress({ show: false, current: 0, total: 0, status: "" });
      e.target.value = "";
    }
  };

  const handleExport = () => {
    if (brands.length === 0) {
      toast("No brands to export", "error");
      return;
    }
    const header = [
      "Brand Name",
      "Linked Company",
      "Client Category",
      "Description",
      "Status",
    ];
    const rows = brands.map((b) => [
      b.name,
      b.companyName || "",
      b.clientCategory || "",
      b.description || "",
      b.status || "Active",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Brands");
    XLSX.writeFile(wb, "Brand_Master.xlsx");
    toast("Exported successfully", "success");
  };

  return (
    <div className="fade">
      <ImportModal
        show={importProgress.show}
        current={importProgress.current}
        total={importProgress.total}
        status={importProgress.status}
        title="Importing Brands"
      />
      <SectionTitle
        icon="fa-solid fa-tag"
        title="Brand Master"
        sub="Manage product brands and link them to companies"
      />

      {showModal && (
        <Modal
          title={editingId ? "Edit brand" : "New brand"}
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
                  Brand name *
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Nike, Apple"
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
                  Linked company
                </label>
                <select
                  style={inputStyle}
                  value={formData.companyId || ""}
                  onChange={(e) => handleChange("companyId", e.target.value)}
                >
                  <option value="">-- Select Company --</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  Client category
                </label>
                <select
                  style={inputStyle}
                  value={formData.clientCategory || ""}
                  onChange={(e) =>
                    handleChange("clientCategory", e.target.value)
                  }
                >
                  <option value="">-- Select Category --</option>
                  {clientCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#888",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Description
                </label>
                <input
                  style={inputStyle}
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
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
              {loading ? "Saving…" : editingId ? "Update brand" : "Add brand"}
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

      <ListToolbar
        search={searchTerm}
        setSearch={setSearchTerm}
        placeholder="Search by brand, company..."
        onAdd={() => {
          setEditingId(null);
          setFormData(blankForm);
          setShowModal(true);
        }}
        addLabel="Add brand"
        count={filtered.length}
        onSelectModeChange={(on) => {
          if (!on) setSelectedIds(new Set());
        }}
        exportOptions={
          canExportImport
            ? [
                {
                  label: "Excel",
                  icon: "fa-solid fa-file-excel",
                  onClick: handleExport,
                },
              ]
            : []
        }
        onImport={
          canExportImport ? () => fileInputRef.current.click() : undefined
        }
        onTemplate={handleTemplate}
      />
      <div style={{ height: 12 }} />
      <div>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#555",
              padding: 40,
              fontSize: 13,
            }}
          >
            {searchTerm ? "No results found" : "No brands added yet."}
          </div>
        ) : (
          (() => {
            const filteredIds = filtered.map((b) => b._id);
            const allSelected =
              filteredIds.length > 0 &&
              filteredIds.every((id) => selectedIds.has(id));
            const someSelected = filteredIds.some((id) => selectedIds.has(id));
            return (
              <div>
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
                          "Brand Name",
                          "Linked Company",
                          "Client Category",
                          "Description",
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
                      {filtered.map((brand, i) => (
                        <tr
                          key={brand._id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: selectedIds.has(brand._id)
                              ? "rgba(200, 149, 90, 0.06)"
                              : i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.01)",
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedIds.has(brand._id))
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedIds.has(brand._id))
                              e.currentTarget.style.background =
                                i % 2 === 0
                                  ? "transparent"
                                  : "rgba(255,255,255,0.01)";
                          }}
                        >
                          <td style={{ padding: "12px", width: 36 }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(brand._id)}
                              onChange={() => toggleSelect(brand._id)}
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
                            <NameWithAvatar name={brand.name} />
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a3a3a3" }}
                          >
                            {brand.companyName || "-"}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {brand.clientCategory ? (
                              <span
                                style={{
                                  padding: "3px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background:
                                    brand.clientCategory === "HP"
                                      ? "#2196F322"
                                      : brand.clientCategory === "ZPL"
                                        ? "#9C27B022"
                                        : "#FF980022",
                                  color:
                                    brand.clientCategory === "HP"
                                      ? "#2196F3"
                                      : brand.clientCategory === "ZPL"
                                        ? "#9C27B0"
                                        : "#FF9800",
                                }}
                              >
                                {brand.clientCategory}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td
                            style={{ padding: "12px 14px", color: "#a3a3a3" }}
                          >
                            {brand.description || "-"}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                background:
                                  brand.status === "Active"
                                    ? "rgba(134,184,148,0.14)"
                                    : "rgba(224,112,95,0.14)",
                                color:
                                  brand.status === "Active"
                                    ? "#86b894"
                                    : "#e0705f",
                              }}
                            >
                              {brand.status || "Active"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <IconBtn
                                icon="fa-pen-to-square"
                                label="Edit"
                                onClick={() => handleEdit(brand)}
                              />
                              <button
                                onClick={() => handleToggleStatus(brand)}
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
                                  className={`fa-solid ${brand.status === "Active" ? "fa-pause" : "fa-play"}`}
                                />{" "}
                                {brand.status === "Active"
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
                                    id: brand._id,
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
              </div>
            );
          })()
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Brand"
        message="Are you sure you want to delete this brand?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
      <ConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Brands"
        message={`Delete ${selectedIds.size} selected brand(s)?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
