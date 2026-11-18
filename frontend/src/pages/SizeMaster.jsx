import React, { useState, useEffect, useMemo } from "react";
import {
  ListToolbar,
  Modal,
  FormGrid,
  Field,
} from "../components/ui/BasicComponents";
import { sizeMasterAPI } from "../api/auth";
import { IconBtn } from "../components/ui/IconBtn";

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const SIZE_CATEGORIES = [
  "Paper Cup",
  "Bowl",
  "Tray",
  "Plate",
  "Container",
  "Cake Box",
  "Food Box",
  "Printed Box",
  "Insert",
  "Flat Item",
  "Label",
  "Paper Bag with Handle",
  "Paper Bag",
  "Gusseted Bag",
  "Wrapping Paper",
  "Tissue Paper",
  "Kraft Paper Wrap",
  "Paper Reel",
  "Paper Sheets",
];

export default function SizeMaster({ toast }) {
  const [sizeMaster, setSizeMaster] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    try {
      const res = await sizeMasterAPI.getAll();
      setSizeMaster(res.sizes || {});
    } catch (error) {
      toast?.("Failed to load sizes", "error");
    }
  };

  // One flat list: every size with its category
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.entries(sizeMaster)
      .filter(([cat]) => !filterCategory || cat === filterCategory)
      .flatMap(([cat, sizes]) => (sizes || []).map((size) => ({ cat, size })))
      .filter(
        (r) =>
          !q ||
          r.size.toLowerCase().includes(q) ||
          r.cat.toLowerCase().includes(q),
      )
      .sort((a, b) => a.cat.localeCompare(b.cat));
  }, [sizeMaster, search, filterCategory]);

  const closeModal = () => {
    setShowModal(false);
    setFormCategory("");
    setNewSize("");
  };

  const handleAddSize = async () => {
    if (!formCategory) {
      toast("Please select a category", "error");
      return;
    }
    if (!newSize.trim()) {
      toast("Please enter a size", "error");
      return;
    }

    setLoading(true);
    try {
      await sizeMasterAPI.addSize(formCategory, newSize.trim());
      toast(`Size "${newSize}" added to ${formCategory}`, "success");
      closeModal();
      fetchSizes();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to add size", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSize = async (category, size) => {
    if (!window.confirm(`Delete "${size}" from ${category}?`)) return;
    try {
      await sizeMasterAPI.deleteSize(category, size);
      toast("Size deleted", "success");
      fetchSizes();
    } catch (error) {
      toast(error.response?.data?.error || "Failed to delete size", "error");
    }
  };

  const th = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#8a8a8a",
    whiteSpace: "nowrap",
  };

  return (
    <div className="fade">
      {showModal && (
        <Modal title="New size" maxWidth={520} onClose={closeModal}>
          <FormGrid>
            <Field label="Category *">
              <select
                className="lg-input"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {SIZE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Size *">
              <input
                className="lg-input"
                type="text"
                placeholder="e.g. Small, Medium, 10 inch"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSize()}
              />
            </Field>
          </FormGrid>
          {formCategory && (
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "#a3a3a3",
              }}
            >
              Current sizes in {formCategory}:{" "}
              {(sizeMaster[formCategory] || []).join(", ") || "none"}
            </div>
          )}
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
              onClick={handleAddSize}
            >
              {loading ? "Saving…" : "Add size"}
            </button>
          </div>
        </Modal>
      )}

      <ListToolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search sizes..."
        count={rows.length}
        extra={
          <select
            className="lg-input"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: 200 }}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {SIZE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        }
        onAdd={() => {
          setFormCategory(filterCategory);
          setNewSize("");
          setShowModal(true);
        }}
        addLabel="Add size"
      />
      <div style={{ height: 12 }} />

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#8a8a8a",
              padding: 40,
              fontSize: 13,
            }}
          >
            {search || filterCategory ? "No sizes found" : "No sizes yet"}
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={th}>Category</th>
                <th style={th}>Size</th>
                <th style={{ ...th, width: "1%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.cat}-${r.size}`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td style={{ padding: "12px 14px", color: "#a3a3a3" }}>
                    {r.cat}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#ededed",
                      fontWeight: 500,
                    }}
                  >
                    {r.size}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <IconBtn
                      icon="fa-trash"
                      label="Delete"
                      danger
                      onClick={() => handleDeleteSize(r.cat, r.size)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
