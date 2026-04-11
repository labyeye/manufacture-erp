import React, { useState, useEffect, useMemo } from "react";
import { C } from "../constants/colors";
import {
  Card,
  SectionTitle,
  Field,
  Badge,
  SubmitBtn,
  DateRangeFilter,
} from "../components/ui/BasicComponents";
import { categoryMasterAPI } from "../api/auth";

export default function CategoryMaster({ toast }) {
  const uid = () => Math.random().toString(36).substr(2, 9);

  const blankForm = {
    name: "",
    code: "",
    description: "",
    type: "Raw Material",
    status: "Active",
  };

  const [data, setData] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState("records");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Load data
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoryMasterAPI.getAll();
      setData(res || []);
    } catch (error) {
      toast?.("Failed to load categories", "error");
    }
  };

  const setF = (k, v) => {
    setForm((prev) => ({
      ...prev,
      [k]: v,
    }));
    setErrors((e) => ({ ...e, [k]: false }));
  };

  const validate = () => {
    let err = {};
    let valid = true;

    if (!form.name.trim()) {
      err.name = true;
      valid = false;
    }
    if (!form.code.trim()) {
      err.code = true;
      valid = false;
    }

    setErrors(err);
    return valid;
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast?.("Please fill all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description,
        type: form.type,
        status: form.status,
      };

      if (editId) {
        await categoryMasterAPI.update(editId, payload);
        setSuccessMessage("Category updated successfully!");
      } else {
        await categoryMasterAPI.create(payload);
        setSuccessMessage("Category created successfully!");
      }

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setEditId(null);
        setForm(blankForm);
        setErrors({});
        setView("records");
        fetchCategories();
      }, 2000);
    } catch (error) {
      toast?.(error.response?.data?.message || "Failed to save category", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditId(category._id);
    setForm({
      name: category.name,
      code: category.code,
      description: category.description || "",
      type: category.type,
      status: category.status,
    });
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      await categoryMasterAPI.delete(id);
      if (toast) toast("Category deleted successfully", "success");
      fetchCategories();
    } catch (error) {
      if (toast) toast("Failed to delete category", "error");
    }
  };

  const filteredData = useMemo(() => {
    return (data || []).filter((item) => {
      if (!item || !item.name || !item.code) return false;
      const search = searchText.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        item.code.toLowerCase().includes(search)
      );
    });
  }, [data, searchText]);

  const EF = (k) => (errors[k] ? { border: `1px solid ${C.red}` } : {});
  const EFMsg = (k) =>
    errors[k] ? (
      <div style={{ color: C.red, fontSize: 10, marginTop: 3 }}>Required</div>
    ) : null;

  return (
    <div className="fade">
      <SectionTitle
        icon="📁"
        title="Category Master"
        sub="Manage product categories"
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["form", "➕ New Category"],
          ["records", `📋 Categories (${filteredData.length})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              if (v === "form") {
                setEditId(null);
                setForm(blankForm);
                setErrors({});
              }
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${view === v ? C.blue : C.border}`,
              background: view === v ? C.blue + "22" : "transparent",
              color: view === v ? C.blue : C.muted,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {view === "form" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.blue,
                marginBottom: 16,
              }}
            >
              {editId ? "Edit Category" : "Create New Category"}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <Field
                label="Category Name *"
                type="text"
                value={form.name}
                onChange={(v) => setF("name", v)}
                placeholder="e.g., Paper - Coated, Kraft Paper"
                style={EF("name")}
              />
              {EFMsg("name")}

              <Field
                label="Code *"
                type="text"
                value={form.code}
                onChange={(v) => setF("code", v)}
                placeholder="e.g., CAT-001"
                style={EF("code")}
              />
              {EFMsg("code")}

              <Field
                label="Type"
                type="select"
                value={form.type}
                onChange={(v) => setF("type", v)}
                options={[
                  { label: "Raw Material", value: "Raw Material" },
                  { label: "Consumable", value: "Consumable" },
                  { label: "Finished Good", value: "Finished Good" },
                ]}
              />

              <Field
                label="Status"
                type="select"
                value={form.status}
                onChange={(v) => setF("status", v)}
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Inactive", value: "Inactive" },
                ]}
              />

              <Field
                label="Description"
                type="textarea"
                value={form.description}
                onChange={(v) => setF("description", v)}
                placeholder="Add optional description"
                style={{ gridColumn: "1 / -1" }}
              />
            </div>
          </Card>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setEditId(null);
                setForm(blankForm);
                setErrors({});
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.muted,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <SubmitBtn
              label={editId ? "Update" : "Create"}
              onClick={submit}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {view === "records" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="🔍 Search by name or code..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                fontSize: 13,
              }}
            />
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {filteredData.map((category) => (
              <Card key={category._id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {category.name}
                    </h4>
                    <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
                      {category.code}
                    </p>
                  </div>
                  <Badge label={category.status} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: "0 0 4px" }}>
                    <strong>Type:</strong> {category.type}
                  </p>
                  {category.description && (
                    <p style={{ fontSize: 12, color: C.muted, margin: "0" }}>
                      <strong>Description:</strong> {category.description}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => handleEdit(category)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 4,
                      border: `1px solid ${C.blue}`,
                      background: "transparent",
                      color: C.blue,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category._id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 4,
                      border: `1px solid ${C.red}`,
                      background: "transparent",
                      color: C.red,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {filteredData.length === 0 && (
            <Card>
              <p style={{ textAlign: "center", color: C.muted }}>
                {searchText
                  ? "No categories found matching your search"
                  : "No categories created yet"}
              </p>
            </Card>
          )}
        </div>
      )}

      {showSuccessModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 40,
              textAlign: "center",
              maxWidth: 300,
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div style={{ fontSize: 50, marginBottom: 16 }}>✓</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.green, margin: 0 }}>
              {successMessage}
            </p>
          </div>
          <style>{`
            @keyframes scaleIn {
              from {
                transform: scale(0.8);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
