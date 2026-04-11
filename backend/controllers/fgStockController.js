const FGStock = require('../models/FGStock');


exports.getAllStock = async (req, res) => {
  try {
    const { itemName, clientName } = req.query;

    const filter = {};
    if (itemName) filter.itemName = { $regex: itemName, $options: 'i' };
    if (clientName) filter.clientName = { $regex: clientName, $options: 'i' };

    const stock = await FGStock.find(filter).sort({ lastUpdated: -1 });

    res.json({ stock });
  } catch (error) {
    console.error('Get all FG stock error:', error);
    res.status(500).json({ error: 'Failed to fetch FG stock' });
  }
};


exports.getStockById = async (req, res) => {
  try {
    const stock = await FGStock.findById(req.params.id);

    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    res.json(stock);
  } catch (error) {
    console.error('Get stock item error:', error);
    res.status(500).json({ error: 'Failed to fetch stock item' });
  }
};


exports.createStock = async (req, res) => {
  try {
    const { itemName, joNo, soRef, clientName, qty, unit, price } = req.body;

    if (!itemName) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const stock = new FGStock({
      itemName,
      joNo,
      soRef,
      clientName,
      qty: qty || 0,
      unit,
      price
    });

    await stock.save();

    res.status(201).json({ stock });
  } catch (error) {
    console.error('Create stock error:', error);
    res.status(500).json({ error: 'Failed to create stock item' });
  }
};


exports.updateStock = async (req, res) => {
  try {
    const { itemName, joNo, soRef, clientName, qty, unit, price } = req.body;

    const stock = await FGStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    if (itemName !== undefined) stock.itemName = itemName;
    if (joNo !== undefined) stock.joNo = joNo;
    if (soRef !== undefined) stock.soRef = soRef;
    if (clientName !== undefined) stock.clientName = clientName;
    if (qty !== undefined) stock.qty = qty;
    if (unit !== undefined) stock.unit = unit;
    if (price !== undefined) stock.price = price;

    await stock.save();

    res.json({ stock });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock item' });
  }
};


exports.adjustStock = async (req, res) => {
  try {
    const { adjustment } = req.body;

    if (adjustment === undefined) {
      return res.status(400).json({ error: 'Adjustment amount is required' });
    }

    const stock = await FGStock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    stock.qty = (stock.qty || 0) + adjustment;

    if (stock.qty < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    await stock.save();

    res.json({ message: 'Stock adjusted successfully', stock });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
};


exports.deleteStock = async (req, res) => {
  try {
    const stock = await FGStock.findByIdAndDelete(req.params.id);

    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    console.error('Delete stock error:', error);
    res.status(500).json({ error: 'Failed to delete stock item' });
  }
};
