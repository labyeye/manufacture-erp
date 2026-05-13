import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import {
  SectionTitle,
  ImportBtn,
  ExportBtn,
  TemplateBtn,
  ImportModal,
} from "../components/ui/BasicComponents";
import { brandMasterAPI, companyMasterAPI, categoryMasterAPI } from "../api/auth";
import ConfirmModal from "../components/ConfirmModal";
import * as XLSX from "xlsx";

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

const cardStyle = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(12px) saturate(180%)",
  WebkitBackdropFilter: "blur(12px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
};

export default function BrandMaster({ toast }) {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
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

  const filtered = brands.filter(
    (b) =>
      !searchTerm ||
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.companyName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    const header = ["Brand Name", "Linked Company", "Client Category", "Description"];
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
            (c) =>
              c.name.toLowerCase() === row["Linked Company"].toLowerCase(),
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
            await brandMasterAPI.create(payload);
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
    const header = ["Brand Name", "Linked Company", "Client Category", "Description", "Status"];
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
        icon="🏷️"
        title="Brand Master"
        sub="Manage product brands and link them to companies"
      />

      <div style={cardStyle}>
        <div
          style={{
            marginBottom: 14,
            fontSize: 14,
            fontWeight: 500,
            color: C.accent || "#4CAF50",
          }}
        >
          {editingId ? "✏️ Edit Brand" : "+ Add Brand"}
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
              BRAND NAME *
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
              LINKED COMPANY
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
              CLIENT CATEGORY
            </label>
            <select
              style={inputStyle}
              value={formData.clientCategory || ""}
              onChange={(e) => handleChange("clientCategory", e.target.value)}
            >
              <option value="">-- Select Category --</option>
              {clientCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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
              DESCRIPTION
            </label>
            <input
              style={inputStyle}
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
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
            {loading ? "Saving..." : editingId ? "Update Brand" : "Add Brand"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  description: "",
                  companyId: "",
                  companyName: "",
                  clientCategory: "",
                });
              }}
              style={{
                padding: "9px 20px",
                background: "rgba(255,255,255,0.05)",
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
          <ExportBtn onClick={handleExport} label="Export" />
          <TemplateBtn onClick={handleTemplate} />
          <ImportBtn onClick={() => fileInputRef.current.click()} />
          <input
            type="file"
            ref={fileInputRef}
            hidden
            onChange={handleImport}
            accept=".xlsx, .xls"
          />
        </div>
      </div>

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
            Brands ({brands.length})
          </span>
          <input
            type="text"
            placeholder="🔍 Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, width: 220 }}
          />
        </div>

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
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Brand Name", "Linked Company", "Client Category", "Description", "Status", "Actions"].map(
                    (h) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((brand) => (
                  <tr key={brand._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }} onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.04)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <td
                      style={{
                        padding: "12px",
                        fontWeight: 600,
                        color: "#e0e0e0",
                      }}
                    >
                      {brand.name}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {brand.companyName || "-"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {brand.clientCategory ? (
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
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
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {brand.description || "-"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          background:
                            brand.status === "Active" ? "#4CAF5022" : "#f4433622",
                          color: brand.status === "Active" ? "#4CAF50" : "#f44336",
                        }}
                      >
                        {brand.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleEdit(brand)}
                          style={{
                            padding: "5px 10px",
                            background: "#1976D222",
                            color: "#1976D2",
                            border: "none",
                            borderRadius: 4,
                            fontWeight: 500,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(brand)}
                          style={{
                            padding: "5px 10px",
                            background: "#FF980022",
                            color: "#FF9800",
                            border: "none",
                            borderRadius: 4,
                            fontWeight: 500,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {brand.status === "Active" ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, id: brand._id })}
                          style={{
                            padding: "5px 10px",
                            background: "#f4433622",
                            color: "#f44336",
                            border: "none",
                            borderRadius: 4,
                            fontWeight: 500,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          🗑️
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
    </div>
  );
}
