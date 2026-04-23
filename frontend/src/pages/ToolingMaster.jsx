import React, { useState, useEffect } from "react";
import { Card, SectionTitle, Badge, Button, Input, Select, Modal, Table } from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import { toolingMasterAPI, machineMasterAPI } from "../api/auth";

export default function ToolingMaster({ toast }) {
  useEffect(() => { console.log("ToolingMaster Mounted"); }, []);
  const [tools, setTools] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    toolType: "Cylinder",
    designCode: "",
    linkedSKU: "",
    compatibleMachines: [],
    status: "Available",
    maxImpressionsBeforeRecondition: 1000000,
    location: "",
    reconditioningLeadTime: 7
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [toolData, machineData] = await Promise.all([
        toolingMasterAPI.getAll(),
        machineMasterAPI.getAll()
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
      reconditioningLeadTime: 7
    });
    setEditingId(null);
  };

  const handleEdit = (tool) => {
    setFormData({
      toolType: tool.toolType,
      designCode: tool.designCode,
      linkedSKU: tool.linkedSKU,
      compatibleMachines: tool.compatibleMachines.map(m => m._id || m),
      status: tool.status,
      maxImpressionsBeforeRecondition: tool.maxImpressionsBeforeRecondition,
      location: tool.location,
      reconditioningLeadTime: tool.reconditioningLeadTime
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

  return (
    <div className="fade">
      <SectionTitle icon="🛠️" title="Tooling Master" sub="Manage Cylinders, Dies, and Plates">
        <Button onClick={() => { resetForm(); setShowModal(true); }} text="+ Add New Tool" color={C.blue} />
      </SectionTitle>

      <Card>
        <Table
          loading={loading}
          headers={["TYPE", "DESIGN CODE", "LINKED SKU", "STATUS", "IMPRESSIONS", "LOCATION", "ACTIONS"]}
          data={tools.map(tool => [
            <Badge text={tool.toolType} color={tool.toolType === 'Cylinder' ? C.blue : tool.toolType === 'Die' ? C.orange : C.purple} />,
            <span style={{ fontWeight: 700 }}>{tool.designCode}</span>,
            tool.linkedSKU,
            <Badge text={tool.status} color={tool.status === 'Available' ? C.green : tool.status === 'In Use' ? C.blue : C.red} />,
            `${(tool.impressionsDone || 0).toLocaleString()} / ${(tool.maxImpressionsBeforeRecondition || 0).toLocaleString()}`,
            tool.location || "-",
            <div style={{ display: "flex", gap: 8 }}>
              <Button small text="Edit" onClick={() => handleEdit(tool)} />
              <Button small text="Delete" color={C.red} onClick={() => handleDelete(tool._id)} />
            </div>
          ])}
        />
      </Card>

      {showModal && (
        <Modal title={editingId ? "Edit Tool" : "Add New Tool"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Select
                label="Tool Type"
                value={formData.toolType}
                onChange={(e) => setFormData({ ...formData, toolType: e.target.value })}
                options={["Cylinder", "Die", "Plate"]}
                required
              />
              <Input
                label="Design Code"
                value={formData.designCode}
                onChange={(e) => setFormData({ ...formData, designCode: e.target.value })}
                required
              />
              <Input
                label="Linked SKU / Product"
                value={formData.linkedSKU}
                onChange={(e) => setFormData({ ...formData, linkedSKU: e.target.value })}
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={["Available", "In Use", "Under Recondition", "Scrapped"]}
                required
              />
              <Input
                label="Max Impressions"
                type="number"
                value={formData.maxImpressionsBeforeRecondition}
                onChange={(e) => setFormData({ ...formData, maxImpressionsBeforeRecondition: e.target.value })}
              />
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button text="Cancel" color="#666" onClick={() => setShowModal(false)} />
              <Button type="submit" text={editingId ? "Update Tool" : "Create Tool"} color={C.blue} loading={loading} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
