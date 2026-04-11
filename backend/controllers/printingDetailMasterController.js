const PrintingDetailMaster = require('../models/PrintingDetailMaster');


exports.getAllPrintingDetails = async (req, res) => {
  try {
    const { itemName, clientName } = req.query;

    const filter = {};
    if (itemName) filter.itemName = { $regex: itemName, $options: 'i' };
    if (clientName) filter.clientName = { $regex: clientName, $options: 'i' };

    const details = await PrintingDetailMaster.find(filter).sort({ updatedAt: -1 });

    res.json({ printingDetails: details });
  } catch (error) {
    console.error('Get all printing details error:', error);
    res.status(500).json({ error: 'Failed to fetch printing details' });
  }
};


exports.getPrintingDetailById = async (req, res) => {
  try {
    const detail = await PrintingDetailMaster.findById(req.params.id);

    if (!detail) {
      return res.status(404).json({ error: 'Printing detail not found' });
    }

    res.json(detail);
  } catch (error) {
    console.error('Get printing detail error:', error);
    res.status(500).json({ error: 'Failed to fetch printing detail' });
  }
};


exports.getPrintingDetailByItemAndClient = async (req, res) => {
  try {
    const { itemName, clientName } = req.params;

    const detail = await PrintingDetailMaster.findOne({ itemName, clientName });

    if (!detail) {
      return res.status(404).json({ error: 'Printing detail not found' });
    }

    res.json(detail);
  } catch (error) {
    console.error('Get printing detail error:', error);
    res.status(500).json({ error: 'Failed to fetch printing detail' });
  }
};


exports.createPrintingDetail = async (req, res) => {
  try {
    const {
      itemName,
      clientName,
      clientCategory,
      printing,
      plate,
      process,
      paperCategory,
      paperType,
      paperGsm,
      noOfUps,
      sheetSize,
      sheetW,
      sheetL,
      reelSize,
      reelWidthMm,
      cuttingLengthMm
    } = req.body;

    
    if (!itemName || !clientName) {
      return res.status(400).json({ error: 'Item name and client name are required' });
    }

    
    const existing = await PrintingDetailMaster.findOne({ itemName, clientName });
    if (existing) {
      return res.status(400).json({ error: 'Printing detail for this item and client already exists' });
    }

    const detail = new PrintingDetailMaster({
      itemName,
      clientName,
      clientCategory,
      printing,
      plate,
      process: process || [],
      paperCategory,
      paperType,
      paperGsm,
      noOfUps,
      sheetSize,
      sheetW,
      sheetL,
      reelSize,
      reelWidthMm,
      cuttingLengthMm
    });

    await detail.save();

    res.status(201).json({ printingDetail: detail });
  } catch (error) {
    console.error('Create printing detail error:', error);
    res.status(500).json({ error: 'Failed to create printing detail' });
  }
};


exports.updatePrintingDetail = async (req, res) => {
  try {
    const {
      itemName,
      clientName,
      clientCategory,
      printing,
      plate,
      process,
      paperCategory,
      paperType,
      paperGsm,
      noOfUps,
      sheetSize,
      sheetW,
      sheetL,
      reelSize,
      reelWidthMm,
      cuttingLengthMm
    } = req.body;

    const detail = await PrintingDetailMaster.findById(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: 'Printing detail not found' });
    }

    
    if (itemName && clientName && (itemName !== detail.itemName || clientName !== detail.clientName)) {
      const existing = await PrintingDetailMaster.findOne({
        itemName,
        clientName,
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ error: 'Printing detail for this item and client already exists' });
      }
    }

    
    if (itemName !== undefined) detail.itemName = itemName;
    if (clientName !== undefined) detail.clientName = clientName;
    if (clientCategory !== undefined) detail.clientCategory = clientCategory;
    if (printing !== undefined) detail.printing = printing;
    if (plate !== undefined) detail.plate = plate;
    if (process !== undefined) detail.process = process;
    if (paperCategory !== undefined) detail.paperCategory = paperCategory;
    if (paperType !== undefined) detail.paperType = paperType;
    if (paperGsm !== undefined) detail.paperGsm = paperGsm;
    if (noOfUps !== undefined) detail.noOfUps = noOfUps;
    if (sheetSize !== undefined) detail.sheetSize = sheetSize;
    if (sheetW !== undefined) detail.sheetW = sheetW;
    if (sheetL !== undefined) detail.sheetL = sheetL;
    if (reelSize !== undefined) detail.reelSize = reelSize;
    if (reelWidthMm !== undefined) detail.reelWidthMm = reelWidthMm;
    if (cuttingLengthMm !== undefined) detail.cuttingLengthMm = cuttingLengthMm;

    await detail.save();

    res.json({ printingDetail: detail });
  } catch (error) {
    console.error('Update printing detail error:', error);
    res.status(500).json({ error: 'Failed to update printing detail' });
  }
};


exports.deletePrintingDetail = async (req, res) => {
  try {
    const detail = await PrintingDetailMaster.findByIdAndDelete(req.params.id);

    if (!detail) {
      return res.status(404).json({ error: 'Printing detail not found' });
    }

    res.json({ message: 'Printing detail deleted successfully' });
  } catch (error) {
    console.error('Delete printing detail error:', error);
    res.status(500).json({ error: 'Failed to delete printing detail' });
  }
};
