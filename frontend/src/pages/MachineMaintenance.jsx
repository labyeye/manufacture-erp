import React, { useState, useEffect } from "react";
import { Card, SectionTitle, Badge, Button, Input, Select, Modal, Table } from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import { machineMaintenanceAPI, machineMasterAPI } from "../api/auth";
import moment from "moment";

export default function MachineMaintenance({ toast }) {
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    machineId: "",
    type: "Preventive",
    startDateTime: moment().format("YYYY-MM-DDTHH:mm"),
    endDateTime: moment().add(4, 'hours').format("YYYY-MM-DDTHH:mm"),
    description: "",
    technician: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recData, macData] = await Promise.all([
        machineMaintenanceAPI.getAll(),
        machineMasterAPI.getAll()
      ]);
      setRecords(Array.isArray(recData) ? recData : []);
      setMachines(macData?.machines || macData || []);
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
      await machineMaintenanceAPI.create(formData);
      toast?.("Maintenance scheduled", "success");
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast?.("Failed to schedule", "error");
    }
  };

  return (
    <div className="fade">
      <SectionTitle icon="🔧" title="Machine Maintenance" sub="Planned Preventive Maintenance">
        <Button onClick={() => setShowModal(true)} text="+ Schedule Maintenance" color={C.blue} />
      </SectionTitle>

      <Card>
        <Table
          loading={loading}
          headers={["MACHINE", "TYPE", "START", "END", "TECHNICIAN", "ACTIONS"]}
          data={records.map(rec => [
            rec.machineId?.name || "Unknown",
            <Badge text={rec.type} color={rec.type === 'Preventive' ? C.blue : C.orange} />,
            moment(rec.startDateTime).format("DD/MM HH:mm"),
            moment(rec.endDateTime).format("DD/MM HH:mm"),
            rec.technician,
            <Button small text="Delete" color={C.red} onClick={async () => {
              if(window.confirm("Cancel this?")) {
                await machineMaintenanceAPI.delete(rec._id);
                fetchData();
              }
            }} />
          ])}
        />
      </Card>

      {showModal && (
        <Modal title="Schedule Maintenance" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <Select
              label="Machine"
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              options={machines.map(m => ({ label: m.name, value: m._id }))}
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input
                label="Start"
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                required
              />
              <Input
                label="End"
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                required
              />
            </div>
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              label="Technician"
              value={formData.technician}
              onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
            />
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button text="Cancel" color="#666" onClick={() => setShowModal(false)} />
              <Button type="submit" text="Schedule" color={C.blue} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
