import React, { useState, useEffect } from "react";
import { Card, SectionTitle, Badge, Button, Input, Select, Modal, Table } from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import { breakdownLogAPI, machineMasterAPI } from "../api/auth";
import moment from "moment";

export default function BreakdownLog({ toast }) {
  const [logs, setLogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    machineId: "",
    startDateTime: moment().format("YYYY-MM-DDTHH:mm"),
    reasonCode: "Other",
    issueDescription: "",
    reportedBy: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logData, macData] = await Promise.all([
        breakdownLogAPI.getAll(),
        machineMasterAPI.getAll()
      ]);
      setLogs(Array.isArray(logData) ? logData : []);
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

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      await breakdownLogAPI.create(formData);
      toast?.("Breakdown reported", "success");
      setShowModal(false);
      fetchData();
    } catch (err) {
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
        status: 'Resolved'
      });
      toast?.("Machine resolved", "success");
      fetchData();
    } catch (err) {
      toast?.("Failed to resolve", "error");
    }
  };

  return (
    <div className="fade">
      <SectionTitle icon="⚠️" title="Breakdown Log" sub="Report and track machine breakdowns">
        <Button onClick={() => setShowModal(true)} text="🚨 Report Breakdown" color={C.red} />
      </SectionTitle>

      <Card>
        <Table
          loading={loading}
          headers={["MACHINE", "STATUS", "STARTED", "DURATION", "ISSUE", "ACTIONS"]}
          data={logs.map(log => [
            log.machineId?.name || "Unknown",
            <Badge text={log.status} color={log.status === 'Open' ? C.red : C.green} />,
            moment(log.startDateTime).format("DD/MM HH:mm"),
            log.endDateTime ? `${moment.duration(moment(log.endDateTime).diff(log.startDateTime)).asHours().toFixed(1)} hrs` : "Ongoing",
            log.issueDescription,
            log.status === 'Open' ? (
              <Button small text="Resolve" color={C.green} onClick={() => handleResolve(log._id)} />
            ) : "Resolved"
          ])}
        />
      </Card>

      {showModal && (
        <Modal title="Report Machine Breakdown" onClose={() => setShowModal(false)}>
          <form onSubmit={handleReport}>
            <Select
              label="Machine"
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              options={machines.map(m => ({ label: m.name, value: m._id }))}
              required
            />
            <Input
              label="Start Time"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
              required
            />
            <Select
              label="Reason Code"
              value={formData.reasonCode}
              onChange={(e) => setFormData({ ...formData, reasonCode: e.target.value })}
              options={["Mechanical", "Electrical", "Tooling", "Material Jam", "Power", "Other"]}
              required
            />
            <Input
              label="Issue Description"
              value={formData.issueDescription}
              onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              required
            />
            <Input
              label="Reported By"
              value={formData.reportedBy}
              onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
            />
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button text="Cancel" color="#666" onClick={() => setShowModal(false)} />
              <Button type="submit" text="Report Now" color={C.red} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
