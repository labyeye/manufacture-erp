const ToolingMaster = require('../models/ToolingMaster');

exports.getAll = async (req, res) => {
  try {
    const tools = await ToolingMaster.find().populate('compatibleMachines');
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const tool = await ToolingMaster.findById(req.params.id).populate('compatibleMachines');
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    res.json(tool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tool' });
  }
};

exports.create = async (req, res) => {
  try {
    const tool = new ToolingMaster(req.body);
    await tool.save();
    res.status(201).json(tool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tool: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tool = await ToolingMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    res.json(tool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tool' });
  }
};

exports.delete = async (req, res) => {
  try {
    const tool = await ToolingMaster.findByIdAndDelete(req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tool' });
  }
};
