const BreakdownLog = require('../models/BreakdownLog');

exports.getAll = async (req, res) => {
  try {
    const logs = await BreakdownLog.find().populate('machineId').sort({ startDateTime: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch breakdown logs' });
  }
};

exports.create = async (req, res) => {
  try {
    const log = new BreakdownLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create breakdown log: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const log = await BreakdownLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update breakdown log' });
  }
};

exports.delete = async (req, res) => {
  try {
    const log = await BreakdownLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete breakdown log' });
  }
};
