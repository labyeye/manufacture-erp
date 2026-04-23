const MachineMaintenance = require('../models/MachineMaintenance');

exports.getAll = async (req, res) => {
  try {
    const maintenance = await MachineMaintenance.find().populate('machineId');
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
};

exports.create = async (req, res) => {
  try {
    const record = new MachineMaintenance(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create maintenance record: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await MachineMaintenance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance record' });
  }
};

exports.delete = async (req, res) => {
  try {
    const record = await MachineMaintenance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete maintenance record' });
  }
};
