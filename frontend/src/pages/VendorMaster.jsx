import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import { SectionTitle, Badge, ImportBtn, ExportBtn, TemplateBtn } from "../components/ui/BasicComponents";
import { vendorMasterAPI } from "../api/auth";
import * as XLSX from "xlsx";

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

export default function VendorMaster({
  vendorMaster: globalVendors,
  refreshData,
  toast,
}) {
  const [vendorMaster, setVendorMaster] = useState(globalVendors || []);
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

  const filtered = vendorMaster.filter(
    (v) =>
      !searchTerm ||
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendors.csv";
    a.click();
    toast("Exported successfully", "success");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let lines = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        lines = data.map((row) => row.map((v) => `"${v ?? ""}"`).join(","));
      } else {
        const text = await file.text();
        lines = text.split("\n").filter(Boolean);
      }

      const total = lines.length - 1;
      if (total <= 0) return;

      setImportProgress({
        show: true,
        current: 0,
        total: total,
        status: "Starting import...",
      });

      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((v) => v.replace(/^"|"$/g, "").trim());
        
        if (cols[0]) {
          setImportProgress(prev => ({
            ...prev,
            current: i,
            status: `Pushing: ${cols[0]}`
          }));

          try {
            await vendorMasterAPI.create({
              name: cols[0],
              category: cols[1] || "",
              contact: cols[2] || "",
              email: cols[3] || "",
              gstin: cols[4] || "",
              status: cols[5] || "Active",
            });
            successCount++;
          } catch (error) {
            console.error(`Failed to import ${cols[0]}`, error);
          }
        }
      }
      
      setImportProgress(prev => ({
        ...prev,
        current: total,
        status: `Complete! Imported ${successCount} vendors.`
      }));

      fetchVendors();
      setTimeout(() => {
        setImportProgress(p => ({ ...p, show: false }));
        toast(`Imported ${successCount} vendors successfully`, "success");
      }, 1500);
    } catch (error) {
      console.error("Import error:", error);
      toast("Failed to process file", "error");
      setImportProgress(p => ({ ...p, show: false }));
    }
    e.target.value = "";
  };

  const handleTemplate = () => {
    const csv =
      '"Name","Category","Phone/WhatsApp","Email","GST Number","Status"\n"Example Vendor","Paper Supplier","9876543210","vendor@email.com","22AAAAA0000A1Z5","Active"';
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor_template.csv";
    a.click();
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
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 16,
              padding: 30,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#4CAF50",
                marginBottom: 8,
              }}
            >
              🚀 Importing Vendors
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
              Processing {importProgress.total} vendors
            </div>

            <div
              style={{
                height: 8,
                width: "100%",
                background: "#0d0d0d",
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  background: "linear-gradient(90deg, #4CAF50, #81C784)",
                  transition: "width 0.1s ease",
                  boxShadow: "0 0 10px #4CAF5088",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 700,
                color: "#888",
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
                color: "#555",
                fontFamily: "monospace",
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
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#e0e0e0",
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: 0,
          }}
        >
          🏭 Vendor Master
        </h2>
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0 0" }}>
          All vendors — auto-populated from Purchase Orders or added manually
        </p>
      </div>

      {}
      <div style={cardStyle}>
        <div
          style={{
            marginBottom: 14,
            fontSize: 14,
            fontWeight: 700,
            color: "#4CAF50",
          }}
        >
          {editingId ? "✏️ Edit Vendor" : "+ Add Vendor"}
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
              VENDOR NAME *
            </label>
            <input
              style={inputStyle}
              placeholder="Vendor name"
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
              CATEGORY
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Paper Supplier, Ink Supplier"
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
              PHONE / WHATSAPP
            </label>
            <input
              style={inputStyle}
              placeholder="Phone number"
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
              placeholder="Email address"
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
              placeholder="GST / Tax ID"
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
              background: loading ? "#666" : "#4CAF50",
              color: "#fff",
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
                ? "✅ Update Vendor"
                : "+ Add Vendor"}
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
          <TemplateBtn onClick={handleTemplate} />
          <ImportBtn onClick={() => fileInputRef.current?.click()} />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            style={{ display: "none" }}
            onChange={handleImportExcel}
          />
          <ExportBtn onClick={handleExportExcel} />
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
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>
            Vendors ({vendorMaster.length})
          </span>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, width: 220, background: "#141414" }}
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
            {searchTerm
              ? "No vendors found"
              : "No vendors yet. They auto-populate when you create Purchase Orders."}
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
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {[
                    "Vendor Name",
                    "Category",
                    "Phone/WhatsApp",
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
                {filtered.map((vendor) => (
                  <tr
                    key={vendor._id}
                    style={{ borderBottom: "1px solid #222" }}
                  >
                    <td
                      style={{
                        padding: "12px",
                        fontWeight: 600,
                        color: "#e0e0e0",
                      }}
                    >
                      {vendor.name}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {vendor.category || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {vendor.contact || "-"}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {vendor.email || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: "#aaa",
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    >
                      {vendor.gstin || "-"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            vendor.status === "Active"
                              ? "#4CAF5022"
                              : "#f4433622",
                          color:
                            vendor.status === "Active" ? "#4CAF50" : "#f44336",
                        }}
                      >
                        {vendor.status || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleEdit(vendor)}
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
                          onClick={() => handleToggleStatus(vendor)}
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
                          {vendor.status === "Active" ? "⏸" : "▶"}
                        </button>
                        <button
                          onClick={() => handleDelete(vendor._id)}
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
