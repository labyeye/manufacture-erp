const SizeMaster = require('../models/SizeMaster');


exports.getAllSizes = async (req, res) => {
  try {
    const sizes = await SizeMaster.find().sort({ category: 1 });

    
    const formatted = {};
    sizes.forEach(doc => {
      formatted[doc.category] = doc.paperTypes || [];
    });

    res.json({ sizes: formatted });
  } catch (error) {
    console.error('Get all sizes error:', error);
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
};


exports.getSizesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const sizeDoc = await SizeMaster.findOne({ category });

    if (!sizeDoc) {
      return res.json({ sizes: [] });
    }

    res.json({ sizes: sizeDoc.paperTypes || [] });
  } catch (error) {
    console.error('Get sizes by category error:', error);
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
};


exports.addSize = async (req, res) => {
  try {
    const { category, size } = req.body;

    if (!category || !size) {
      return res.status(400).json({ error: 'Category and size are required' });
    }

    let sizeDoc = await SizeMaster.findOne({ category });

    if (!sizeDoc) {
      
      sizeDoc = new SizeMaster({
        category,
        paperTypes: [size.trim()]
      });
    } else {
      
      if (!sizeDoc.paperTypes.includes(size.trim())) {
        sizeDoc.paperTypes.push(size.trim());
      } else {
        return res.status(400).json({ error: 'Size already exists in this category' });
      }
    }

    await sizeDoc.save();

    res.json({
      message: 'Size added successfully',
      sizes: sizeDoc.paperTypes
    });
  } catch (error) {
    console.error('Add size error:', error);
    res.status(500).json({ error: 'Failed to add size' });
  }
};


exports.updateSize = async (req, res) => {
  try {
    const { category, oldSize, newSize } = req.body;

    if (!category || !oldSize || !newSize) {
      return res.status(400).json({ error: 'Category, oldSize, and newSize are required' });
    }

    const sizeDoc = await SizeMaster.findOne({ category });

    if (!sizeDoc) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const index = sizeDoc.paperTypes.indexOf(oldSize);
    if (index === -1) {
      return res.status(404).json({ error: 'Size not found in category' });
    }

    sizeDoc.paperTypes[index] = newSize.trim();
    await sizeDoc.save();

    res.json({
      message: 'Size updated successfully',
      sizes: sizeDoc.paperTypes
    });
  } catch (error) {
    console.error('Update size error:', error);
    res.status(500).json({ error: 'Failed to update size' });
  }
};


exports.deleteSize = async (req, res) => {
  try {
    const { category, size } = req.body;

    if (!category || !size) {
      return res.status(400).json({ error: 'Category and size are required' });
    }

    const sizeDoc = await SizeMaster.findOne({ category });

    if (!sizeDoc) {
      return res.status(404).json({ error: 'Category not found' });
    }

    sizeDoc.paperTypes = sizeDoc.paperTypes.filter(s => s !== size);
    await sizeDoc.save();

    res.json({
      message: 'Size deleted successfully',
      sizes: sizeDoc.paperTypes
    });
  } catch (error) {
    console.error('Delete size error:', error);
    res.status(500).json({ error: 'Failed to delete size' });
  }
};


exports.deleteCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const result = await SizeMaster.findOneAndDelete({ category });

    if (!result) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
