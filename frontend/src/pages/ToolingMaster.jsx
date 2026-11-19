import React, { useState, useEffect } from "react";
import {
  Card,
  SectionTitle,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Table,
  ListToolbar,
  FilterModal,
  SortSelect,
  Field,
} from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import { toolingMasterAPI, machineMasterAPI } from "../api/auth";
import { IconBtn } from "../components/ui/IconBtn";

export default function ToolingMaster({ toast }) {
  useEffect(() => {
    console.log("ToolingMaster Mounted");
  }, []);
  const [tools, setTools] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    toolType: "Cylinder",
    designCode: "",
    linkedSKU: "",
    compatibleMachines: [],
    status: "Available",
    maxImpressionsBeforeRecondition: 1000000,
    location: "",
    reconditioningLeadTime: 7,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [toolData, machineData] = await Promise.all([
        toolingMasterAPI.getAll(),
        machineMasterAPI.getAll(),
      ]);
      setTools(Array.isArray(toolData) ? toolData : []);
      setMachines(machineData?.machines || machineData || []);
    } catch (err) {
      toast?.("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingId) {
        await toolingMasterAPI.update(editingId, formData);
        toast?.("Tool updated successfully", "success");
      } else {
        await toolingMasterAPI.create(formData);
        toast?.("Tool created successfully", "success");
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast?.("Failed to save tool", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      toolType: "Cylinder",
      designCode: "",
      linkedSKU: "",
      compatibleMachines: [],
      status: "Available",
      maxImpressionsBeforeRecondition: 1000000,
      location: "",
      reconditioningLeadTime: 7,
    });
    setEditingId(null);
  };

  const handleEdit = (tool) => {
    setFormData({
      toolType: tool.toolType,
      designCode: tool.designCode,
      linkedSKU: tool.linkedSKU,
      compatibleMachines: tool.compatibleMachines.map((m) => m._id || m),
      status: tool.status,
      maxImpressionsBeforeRecondition: tool.maxImpressionsBeforeRecondition,
      location: tool.location,
      reconditioningLeadTime: tool.reconditioningLeadTime,
    });
    setEditingId(tool._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tool?")) return;
    try {
      await toolingMasterAPI.delete(id);
      toast?.("Tool deleted successfully", "success");
      fetchData();
    } catch (err) {
      toast?.("Failed to delete tool", "error");
    }
  };

  const visibleTools = [...tools]
    .filter((t) => !typeFilter || t.toolType === typeFilter)
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter((t) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        [t.designCode, t.linkedSKU, t.location, t.toolType]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <div className="fade">
      <ListToolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search design code, SKU, location..."
        count={visibleTools.length}
        filterCount={(typeFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
        onFilter={() => setShowFilterModal(true)}
        onAdd={() => {
          resetForm();
          setShowModal(true);
        }}
        addLabel="Add tool"
      />
      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          onReset={() => {
            setTypeFilter("");
            setStatusFilter("");
          }}
        >
          <Field label="Tool type">
            <SortSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                ["", "All"],
                ...["Cylinder", "Die", "Plate"].map((v) => [v, v]),
              ]}
            />
          </Field>
          <Field label="Status">
            <SortSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                ["", "All"],
                ...["Available", "In Use", "Under Recondition", "Scrapped"].map(
                  (v) => [v, v],
                ),
              ]}
            />
          </Field>
        </FilterModal>
      )}
      <div style={{ height: 12 }} />

      <Card>
        <Table
          loading={loading}
          headers={[
            "Type",
            "Design code",
            "Linked SKU",
            "Status",
            "Impressions",
            "Location",
            "Actions",
          ]}
          data={visibleTools.map((tool) => [
            <Badge text={tool.toolType} color="#a9aed3" />,
            <span style={{ fontWeight: 500, color: "#aeb4ee" }}>
              {tool.designCode}
            </span>,
            tool.linkedSKU,
            <Badge
              text={tool.status}
              color={
                tool.status === "Available"
                  ? "#86b894"
                  : tool.status === "In Use"
                    ? "#e0a84f"
                    : "#e0705f"
              }
            />,
            `${(tool.impressionsDone || 0).toLocaleString()} / ${(tool.maxImpressionsBeforeRecondition || 0).toLocaleString()}`,
            tool.location || "-",
            <div style={{ display: "flex", gap: 6 }}>
              <IconBtn
                icon="fa-pen-to-square"
                label="Edit"
                onClick={() => handleEdit(tool)}
              />
              <IconBtn
                icon="fa-trash"
                label="Delete"
                danger
                onClick={() => handleDelete(tool._id)}
              />
            </div>,
          ])}
        />
      </Card>

      {showModal && (
        <Modal
          title={editingId ? "Edit tool" : "New tool"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Select
                label="Tool Type"
                value={formData.toolType}
                onChange={(e) =>
                  setFormData({ ...formData, toolType: e.target.value })
                }
                options={["Cylinder", "Die", "Plate"]}
                required
              />
              <Input
                label="Design Code"
                value={formData.designCode}
                onChange={(e) =>
                  setFormData({ ...formData, designCode: e.target.value })
                }
                required
              />
              <Input
                label="Linked SKU / Product"
                value={formData.linkedSKU}
                onChange={(e) =>
                  setFormData({ ...formData, linkedSKU: e.target.value })
                }
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                options={[
                  "Available",
                  "In Use",
                  "Under Recondition",
                  "Scrapped",
                ]}
                required
              />
              <Input
                label="Max Impressions"
                type="number"
                value={formData.maxImpressionsBeforeRecondition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxImpressionsBeforeRecondition: e.target.value,
                  })
                }
              />
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <button
                type="button"
                className="lg-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="lg-btn lg-btn-primary"
                disabled={loading}
              >
                {loading ? "Saving…" : editingId ? "Update tool" : "Add tool"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
