const BrandMaster = require('../models/BrandMaster');

exports.getAll = async (req, res) => {
  try {
    const brands = await BrandMaster.find().sort({ name: 1 });
    res.json({ brands });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const brand = await BrandMaster.findById(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ brand });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
};

exports.create = async (req, res) => {
  try {
    const brand = new BrandMaster(req.body);
    await brand.save();
    res.status(201).json({ brand });
  } catch (error) {
    console.error('Create Brand Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Brand name already exists' });
    }
    res.status(500).json({ error: 'Failed to create brand: ' + error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const brand = await BrandMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ brand });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
};

exports.delete = async (req, res) => {
  try {
    const brand = await BrandMaster.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const brand = await BrandMaster.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ brand });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};
