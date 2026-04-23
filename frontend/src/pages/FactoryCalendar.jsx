import React, { useState, useEffect } from "react";
import { Card, SectionTitle, Badge, Button, Input, Select, Modal, Table } from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import { factoryCalendarAPI } from "../api/auth";
import moment from "moment";

export default function FactoryCalendar({ toast }) {
  useEffect(() => { console.log("FactoryCalendar Mounted"); }, []);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: moment().format("YYYY-MM-DD"),
    type: "Holiday",
    description: "",
    affectsAllMachines: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await factoryCalendarAPI.getAll();
      setEvents(data);
    } catch (err) {
      toast?.("Failed to fetch calendar", "error");
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
        await factoryCalendarAPI.update(editingId, formData);
        toast?.("Event updated successfully", "success");
      } else {
        await factoryCalendarAPI.create(formData);
        toast?.("Event created successfully", "success");
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast?.("Failed to save event", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: moment().format("YYYY-MM-DD"),
      type: "Holiday",
      description: "",
      affectsAllMachines: true
    });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await factoryCalendarAPI.delete(id);
      toast?.("Event deleted", "success");
      fetchData();
    } catch (err) {
      toast?.("Failed to delete", "error");
    }
  };

  return (
    <div className="fade">
      <SectionTitle icon="🗓️" title="Factory Calendar" sub="Manage Holidays and Shutdowns">
        <Button onClick={() => { resetForm(); setShowModal(true); }} text="+ Add Event" color={C.blue} />
      </SectionTitle>

      <Card>
        <Table
          loading={loading}
          headers={["DATE", "TYPE", "DESCRIPTION", "SCOPE", "ACTIONS"]}
          data={events.map(ev => [
            moment(ev.date).format("DD/MM/YYYY"),
            <Badge text={ev.type} color={ev.type === 'Holiday' ? C.green : C.red} />,
            ev.description,
            ev.affectsAllMachines ? "All Machines" : "Specific Machines",
            <div style={{ display: "flex", gap: 8 }}>
              <Button small text="Delete" color={C.red} onClick={() => handleDelete(ev._id)} />
            </div>
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
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Event Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={["Holiday", "Shutdown", "Power Outage", "Half-day"]}
              required
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button text="Cancel" color="#666" onClick={() => setShowModal(false)} />
              <Button type="submit" text="Save Event" color={C.blue} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
