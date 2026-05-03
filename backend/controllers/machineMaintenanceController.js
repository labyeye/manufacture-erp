const MachineMaintenance = require('../models/MachineMaintenance');
const moment = require('moment');

exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, machineId } = req.query;
    const query = {};
    if (machineId) query.machineId = machineId;
    if (startDate || endDate) {
      query.startDateTime = {};
      if (startDate) query.startDateTime.$gte = moment(startDate).startOf('day').toDate();
      if (endDate) query.startDateTime.$lte = moment(endDate).endOf('day').toDate();
    }
    const maintenance = await MachineMaintenance.find(query).populate('machineId').sort({ startDateTime: 1 });
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
