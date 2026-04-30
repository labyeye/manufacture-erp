import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  SectionTitle,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Table,
} from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import {
  toolingMasterAPI,
  machineMasterAPI,
  factoryCalendarAPI,
  machineMaintenanceAPI,
  breakdownLogAPI,
  itemMasterAPI,
} from "../api/auth";
import { PMSchedulerTab, SparePartsTab } from "./MaintenancePlanner";
import moment from "moment";
import * as XLSX from "xlsx";


const SUBTABS = [
  { id: "cylinders", icon: "🔩", label: "Cylinders" },
  { id: "dies", icon: "✂️", label: "Dies" },
  { id: "plates", icon: "🪨", label: "Plates" },
  { id: "calendar", icon: "🗓️", label: "Factory Calendar" },
  { id: "maintenance", icon: "🔧", label: "Machine Maintenance" },
  { id: "breakdowns", icon: "⚠️", label: "Breakdown Log" },
  { id: "pm", icon: "🗓️", label: "PM Scheduler" },
  { id: "parts", icon: "🔩", label: "Spare Parts" },
];

const ACCENT = "#ff7800";

function SubTabBar({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 24,
        borderBottom: `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}
    >
      {SUBTABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom:
              active === t.id ? `2px solid ${ACCENT}` : "2px solid transparent",
            background: "transparent",
            color: active === t.id ? ACCENT : C.muted,
            fontWeight: active === t.id ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}


const TOOL_CONFIG = {
  cylinders: { type: "Cylinder", icon: "🔩", color: C.blue, label: "Cylinder" },
  dies: { type: "Die", icon: "✂️", color: C.orange, label: "Die" },
  plates: { type: "Plate", icon: "🪨", color: C.purple, label: "Plate" },
};

const TOOL_COLUMNS = [
  { header: "Design Code", key: (t) => t.designCode || "" },
  { header: "Linked SKU / Product", key: (t) => t.linkedSKU || "" },
  { header: "Status", key: (t) => t.status || "Available" },
  {
    header: "Max Impressions",
    key: (t) => t.maxImpressionsBeforeRecondition ?? 1000000,
  },
  { header: "Location", key: (t) => t.location || "" },
  {
    header: "Reconditioning Lead Time",
    key: (t) => t.reconditioningLeadTime ?? 7,
  },
];

function ToolTypeSection({ tabId, toast }) {
  const cfg = TOOL_CONFIG[tabId];
  const [tools, setTools] = useState([]);
  const [fgItems, setFgItems] = useState([]);
  const [allMachines, setAllMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const importRef = useRef(null);
  const [formData, setFormData] = useState({
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
      const [data, itemData, macData] = await Promise.all([
        toolingMasterAPI.getAll(),
        itemMasterAPI.getAll(),
        machineMasterAPI.getAll(),
      ]);
      const all = Array.isArray(data) ? data : [];
      setTools(all.filter((t) => t.toolType === cfg.type));
      const items = Array.isArray(itemData) ? itemData : (itemData?.items || []);
      setFgItems(items.filter((i) => i.type === "Finished Goods" && i.code));
      setAllMachines(Array.isArray(macData) ? macData : macData?.machines || []);
    } catch {
      toast?.("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tabId]);

  const resetForm = () => {
    setFormData({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData, toolType: cfg.type };
      if (editingId) {
        await toolingMasterAPI.update(editingId, payload);
        toast?.(`${cfg.label} updated`, "success");
      } else {
        await toolingMasterAPI.create(payload);
        toast?.(`${cfg.label} created`, "success");
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch {
      toast?.(`Failed to save ${cfg.label.toLowerCase()}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tool) => {
    setFormData({
      designCode: tool.designCode,
      linkedSKU: tool.linkedSKU || "",
      compatibleMachines: (tool.compatibleMachines || []).map((m) => m._id || m),
      status: tool.status,
      maxImpressionsBeforeRecondition: tool.maxImpressionsBeforeRecondition,
      location: tool.location,
      reconditioningLeadTime: tool.reconditioningLeadTime,
    });
    setEditingId(tool._id);
    setShowModal(true);
  };

  const toggleMachine = (machineId) => {
    setFormData((prev) => {
      const current = prev.compatibleMachines || [];
      const updated = current.includes(machineId)
        ? current.filter((id) => id !== machineId)
        : [...current, machineId];
      return { ...prev, compatibleMachines: updated };
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${cfg.label.toLowerCase()}?`)) return;
    try {
      await toolingMasterAPI.delete(id);
      toast?.(`${cfg.label} deleted`, "success");
      fetchData();
    } catch {
      toast?.("Failed to delete", "error");
    }
  };

  
  const handleDownloadTemplate = () => {
    const headers = TOOL_COLUMNS.map((c) => c.header);
    const example = {
      designCode: `CYL-001`,
      linkedSKU: "SKU-EXAMPLE",
      status: "Available",
      maxImpressionsBeforeRecondition: 1000000,
      location: "Rack A",
      reconditioningLeadTime: 7,
    };
    const exampleRow = TOOL_COLUMNS.map((c) => c.key(example));
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${cfg.label} Template`);
    XLSX.writeFile(wb, `${cfg.type.toLowerCase()}_template.xlsx`);
    toast?.("Template downloaded", "success");
  };

  
  const handleExport = () => {
    if (!tools.length) {
      toast?.("No data to export", "error");
      return;
    }
    const headers = TOOL_COLUMNS.map((c) => c.header);
    const rows = tools.map((t) => TOOL_COLUMNS.map((c) => c.key(t)));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    XLSX.writeFile(wb, `${cfg.type.toLowerCase()}s_export.xlsx`);
    toast?.(`${cfg.label}s exported`, "success");
  };

  
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImporting(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rawData.length < 2) {
        toast?.("No data rows found in file", "error");
        return;
      }

      const [, ...rows] = rawData; 
      let created = 0;
      let skipped = 0;

      for (const row of rows) {
        if (!row || !row[0]) {
          skipped++;
          continue;
        } 
        const [
          designCode,
          linkedSKU,
          status,
          maxImpressions,
          location,
          reconLeadTime,
        ] = row;
        if (!String(designCode).trim()) {
          skipped++;
          continue;
        }
        const payload = {
          toolType: cfg.type,
          designCode: String(designCode).trim(),
          linkedSKU: linkedSKU ? String(linkedSKU).trim() : "",
          status: status || "Available",
          maxImpressionsBeforeRecondition: Number(maxImpressions) || 1000000,
          location: location ? String(location).trim() : "",
          reconditioningLeadTime: Number(reconLeadTime) || 7,
          compatibleMachines: [],
        };
        try {
          await toolingMasterAPI.create(payload);
          created++;
        } catch {
          skipped++;
        }
      }

      toast?.(
        `Imported ${created} ${cfg.label}(s)${skipped ? `, ${skipped} skipped` : ""}`,
        "success",
      );
      fetchData();
    } catch {
      toast?.("Failed to process file", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Button
          text="⬇ Template"
          color="#555"
          onClick={handleDownloadTemplate}
        />
        <Button
          text={importing ? "Importing…" : "⬆ Import"}
          color="#555"
          onClick={() => importRef.current?.click()}
          loading={importing}
        />
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleImport}
        />
        <Button text="⬇ Export" color="#555" onClick={handleExport} />
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          text={`+ Add ${cfg.label}`}
          color={cfg.color}
        />
      </div>
      <Card>
        <Table
          loading={loading}
          headers={[
            "DESIGN CODE",
            "FG PRODUCT CODE",
            "MACHINES",
            "STATUS",
            "IMPRESSIONS",
            "LOCATION",
            "ACTIONS",
          ]}
          data={tools.map((tool) => {
            const linkedItem = fgItems.find((i) => i.code === tool.linkedSKU);
            const linkedMachineIds = (tool.compatibleMachines || []).map((m) => m._id || m);
            const linkedMachineNames = allMachines
              .filter((m) => linkedMachineIds.includes(m._id))
              .map((m) => m.name);
            return [
              <span style={{ fontWeight: 700 }}>{tool.designCode}</span>,
              tool.linkedSKU ? (
                <div>
                  <div style={{ fontWeight: 700, color: "#ff7800", fontSize: 12 }}>{tool.linkedSKU}</div>
                  {linkedItem && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{linkedItem.name}</div>}
                </div>
              ) : <span style={{ color: "#444" }}>—</span>,
              linkedMachineNames.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {linkedMachineNames.map((n) => (
                    <span key={n} style={{ padding: "2px 7px", borderRadius: 10, background: "#3b82f622", color: "#3b82f6", fontSize: 10, fontWeight: 600 }}>{n}</span>
                  ))}
                </div>
              ) : <span style={{ color: "#444", fontSize: 11 }}>—</span>,
              <Badge
                text={tool.status}
                color={
                  tool.status === "Available"
                    ? C.green
                    : tool.status === "In Use"
                      ? C.blue
                      : C.red
                }
              />,
              `${(tool.impressionsDone || 0).toLocaleString()} / ${(tool.maxImpressionsBeforeRecondition || 0).toLocaleString()}`,
              tool.location || "-",
              <div style={{ display: "flex", gap: 8 }}>
                <Button small text="Edit" onClick={() => handleEdit(tool)} />
                <Button
                  small
                  text="Delete"
                  color={C.red}
                  onClick={() => handleDelete(tool._id)}
                />
              </div>,
            ];
          })}
        />
      </Card>

      {showModal && (
        <Modal
          title={editingId ? `Edit ${cfg.label}` : `Add ${cfg.label}`}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Input
                label="Design Code"
                value={formData.designCode}
                onChange={(e) =>
                  setFormData({ ...formData, designCode: e.target.value })
                }
                required
              />
              <Select
                label="Linked FG Product Code"
                value={formData.linkedSKU}
                onChange={(e) =>
                  setFormData({ ...formData, linkedSKU: e.target.value })
                }
                options={[
                  { label: "— Select FG Product —", value: "" },
                  ...fgItems.map((i) => ({
                    label: `${i.code}${i.name ? ` — ${i.name}` : ""}`,
                    value: i.code,
                  })),
                ]}
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
              <Input
                label="Reconditioning Lead Time (days)"
                type="number"
                value={formData.reconditioningLeadTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reconditioningLeadTime: e.target.value,
                  })
                }
              />
            </div>

            {allMachines.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
                  Compatible Machines
                  {formData.compatibleMachines.length > 0 && (
                    <span style={{ marginLeft: 8, color: "#ff7800" }}>
                      ({formData.compatibleMachines.length} selected)
                    </span>
                  )}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {allMachines.map((m) => {
                    const selected = (formData.compatibleMachines || []).includes(m._id);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => toggleMachine(m._id)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: selected ? "#3b82f6" : "#1a1a1a",
                          color: selected ? "#fff" : "#666",
                          border: `1px solid ${selected ? "#3b82f6" : "#333"}`,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                text="Cancel"
                color="#666"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              />
              <Button
                type="submit"
                text={editingId ? `Update ${cfg.label}` : `Create ${cfg.label}`}
                color={cfg.color}
                loading={loading}
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}


function CalendarSection({ toast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: moment().format("YYYY-MM-DD"),
    type: "Holiday",
    description: "",
    affectsAllMachines: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await factoryCalendarAPI.getAll();
      setEvents(data);
    } catch {
      toast?.("Failed to fetch calendar", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () =>
    setFormData({
      date: moment().format("YYYY-MM-DD"),
      type: "Holiday",
      description: "",
      affectsAllMachines: true,
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await factoryCalendarAPI.create(formData);
      toast?.("Event created successfully", "success");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch {
      toast?.("Failed to save event", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await factoryCalendarAPI.delete(id);
      toast?.("Event deleted", "success");
      fetchData();
    } catch {
      toast?.("Failed to delete", "error");
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          text="+ Add Event"
          color={C.blue}
        />
      </div>
      <Card>
        <Table
          loading={loading}
          headers={["DATE", "TYPE", "DESCRIPTION", "SCOPE", "ACTIONS"]}
          data={events.map((ev) => [
            moment(ev.date).format("DD/MM/YYYY"),
            <Badge
              text={ev.type}
              color={ev.type === "Holiday" ? C.green : C.red}
            />,
            ev.description,
            ev.affectsAllMachines ? "All Machines" : "Specific Machines",
            <Button
              small
              text="Delete"
              color={C.red}
              onClick={() => handleDelete(ev._id)}
            />,
          ])}
        />
      </Card>

      {showModal && (
        <Modal title="Add Calendar Event" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
            <Select
              label="Event Type"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              options={["Holiday", "Shutdown", "Power Outage", "Half-day"]}
              required
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                text="Cancel"
                color="#666"
                onClick={() => setShowModal(false)}
              />
              <Button
                type="submit"
                text="Save Event"
                color={C.blue}
                loading={loading}
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}


function MaintenanceSection({ toast }) {
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    machineId: "",
    type: "Preventive",
    startDateTime: moment().format("YYYY-MM-DDTHH:mm"),
    endDateTime: moment().add(4, "hours").format("YYYY-MM-DDTHH:mm"),
    description: "",
    technician: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recData, macData] = await Promise.all([
        machineMaintenanceAPI.getAll(),
        machineMasterAPI.getAll(),
      ]);
      setRecords(Array.isArray(recData) ? recData : []);
      setMachines(macData?.machines || macData || []);
    } catch {
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
      await machineMaintenanceAPI.create(formData);
      toast?.("Maintenance scheduled", "success");
      setShowModal(false);
      fetchData();
    } catch {
      toast?.("Failed to schedule", "error");
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button
          onClick={() => setShowModal(true)}
          text="+ Schedule Maintenance"
          color={C.blue}
        />
      </div>
      <Card>
        <Table
          loading={loading}
          headers={["MACHINE", "TYPE", "START", "END", "TECHNICIAN", "ACTIONS"]}
          data={records.map((rec) => [
            rec.machineId?.name || "Unknown",
            <Badge
              text={rec.type}
              color={rec.type === "Preventive" ? C.blue : C.orange}
            />,
            moment(rec.startDateTime).format("DD/MM HH:mm"),
            moment(rec.endDateTime).format("DD/MM HH:mm"),
            rec.technician,
            <Button
              small
              text="Delete"
              color={C.red}
              onClick={async () => {
                if (window.confirm("Cancel this maintenance?")) {
                  await machineMaintenanceAPI.delete(rec._id);
                  fetchData();
                }
              }}
            />,
          ])}
        />
      </Card>

      {showModal && (
        <Modal title="Schedule Maintenance" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <Select
              label="Machine"
              value={formData.machineId}
              onChange={(e) =>
                setFormData({ ...formData, machineId: e.target.value })
              }
              options={machines.map((m) => ({ label: m.name, value: m._id }))}
              required
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Input
                label="Start"
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) =>
                  setFormData({ ...formData, startDateTime: e.target.value })
                }
                required
              />
              <Input
                label="End"
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) =>
                  setFormData({ ...formData, endDateTime: e.target.value })
                }
                required
              />
            </div>
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <Input
              label="Technician"
              value={formData.technician}
              onChange={(e) =>
                setFormData({ ...formData, technician: e.target.value })
              }
            />
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                text="Cancel"
                color="#666"
                onClick={() => setShowModal(false)}
              />
              <Button type="submit" text="Schedule" color={C.blue} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}


function BreakdownSection({ toast }) {
  const [logs, setLogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    machineId: "",
    startDateTime: moment().format("YYYY-MM-DDTHH:mm"),
    reasonCode: "Other",
    issueDescription: "",
    reportedBy: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logData, macData] = await Promise.all([
        breakdownLogAPI.getAll(),
        machineMasterAPI.getAll(),
      ]);
      setLogs(Array.isArray(logData) ? logData : []);
      setMachines(macData?.machines || macData || []);
    } catch {
      toast?.("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      await breakdownLogAPI.create(formData);
      toast?.("Breakdown reported", "success");
      setShowModal(false);
      fetchData();
    } catch {
      toast?.("Failed to report", "error");
    }
  };

  const handleResolve = async (id) => {
    const resolution = window.prompt("Resolution details:");
    if (resolution === null) return;
    try {
      await breakdownLogAPI.update(id, {
        endDateTime: new Date(),
        resolutionDescription: resolution,
        status: "Resolved",
      });
      toast?.("Machine resolved", "success");
      fetchData();
    } catch {
      toast?.("Failed to resolve", "error");
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button
          onClick={() => setShowModal(true)}
          text="🚨 Report Breakdown"
          color={C.red}
        />
      </div>
      <Card>
        <Table
          loading={loading}
          headers={[
            "MACHINE",
            "STATUS",
            "STARTED",
            "DURATION",
            "ISSUE",
            "ACTIONS",
          ]}
          data={logs.map((log) => [
            log.machineId?.name || "Unknown",
            <Badge
              text={log.status}
              color={log.status === "Open" ? C.red : C.green}
            />,
            moment(log.startDateTime).format("DD/MM HH:mm"),
            log.endDateTime
              ? `${moment.duration(moment(log.endDateTime).diff(log.startDateTime)).asHours().toFixed(1)} hrs`
              : "Ongoing",
            log.issueDescription,
            log.status === "Open" ? (
              <Button
                small
                text="Resolve"
                color={C.green}
                onClick={() => handleResolve(log._id)}
              />
            ) : (
              "Resolved"
            ),
          ])}
        />
      </Card>

      {showModal && (
        <Modal
          title="Report Machine Breakdown"
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleReport}>
            <Select
              label="Machine"
              value={formData.machineId}
              onChange={(e) =>
                setFormData({ ...formData, machineId: e.target.value })
              }
              options={machines.map((m) => ({ label: m.name, value: m._id }))}
              required
            />
            <Input
              label="Start Time"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) =>
                setFormData({ ...formData, startDateTime: e.target.value })
              }
              required
            />
            <Select
              label="Reason Code"
              value={formData.reasonCode}
              onChange={(e) =>
                setFormData({ ...formData, reasonCode: e.target.value })
              }
              options={[
                "Mechanical",
                "Electrical",
                "Tooling",
                "Material Jam",
                "Power",
                "Other",
              ]}
              required
            />
            <Input
              label="Issue Description"
              value={formData.issueDescription}
              onChange={(e) =>
                setFormData({ ...formData, issueDescription: e.target.value })
              }
              required
            />
            <Input
              label="Reported By"
              value={formData.reportedBy}
              onChange={(e) =>
                setFormData({ ...formData, reportedBy: e.target.value })
              }
            />
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                text="Cancel"
                color="#666"
                onClick={() => setShowModal(false)}
              />
              <Button type="submit" text="Report Now" color={C.red} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}


export default function MachineTools({ machineMaster = [], itemMasterFG = [], categoryMaster = [], toast }) {
  const [activeTab, setActiveTab] = useState("cylinders");

  return (
    <div className="fade">
      <SectionTitle
        icon="⚙️"
        title="Machine & Tooling"
        sub="Cylinders · Dies · Plates · Factory Calendar · Maintenance · Breakdowns · PM Scheduler · Spare Parts"
      />
      <SubTabBar active={activeTab} onChange={setActiveTab} />
      {(activeTab === "cylinders" ||
        activeTab === "dies" ||
        activeTab === "plates") && (
        <ToolTypeSection key={activeTab} tabId={activeTab} toast={toast} />
      )}
      {activeTab === "calendar" && <CalendarSection toast={toast} />}
      {activeTab === "maintenance" && <MaintenanceSection toast={toast} />}
      {activeTab === "breakdowns" && <BreakdownSection toast={toast} />}
      {activeTab === "pm" && <PMSchedulerTab machineMaster={machineMaster} toast={toast} />}
      {activeTab === "parts" && <SparePartsTab machineMaster={machineMaster} itemMasterFG={itemMasterFG} categoryMaster={categoryMaster} toast={toast} />}
    </div>
  );
}
