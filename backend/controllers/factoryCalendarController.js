const FactoryCalendar = require('../models/FactoryCalendar');

exports.getAll = async (req, res) => {
  try {
    const calendar = await FactoryCalendar.find().sort({ date: 1 });
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch factory calendar' });
  }
};

exports.create = async (req, res) => {
  try {
    const entry = new FactoryCalendar(req.body);
    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create calendar entry: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const entry = await FactoryCalendar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update calendar entry' });
  }
};

exports.delete = async (req, res) => {
  try {
    const entry = await FactoryCalendar.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Calendar entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete calendar entry' });
  }
};
