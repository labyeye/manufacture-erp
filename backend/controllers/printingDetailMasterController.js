const PrintingDetailMaster = require("../models/PrintingDetailMaster");

exports.getAllPrintingDetails = async (req, res) => {
  try {
    const { itemName, companyName } = req.query;

    const filter = {};
    if (itemName) filter.itemName = { $regex: itemName, $options: "i" };
    if (companyName) filter.companyName = { $regex: companyName, $options: "i" };

    const details = await PrintingDetailMaster.find(filter).sort({
      updatedAt: -1,
    });

    res.json({ printingDetails: details });
  } catch (error) {
    console.error("Get all printing details error:", error);
    res.status(500).json({ error: "Failed to fetch printing details" });
  }
};

exports.getPrintingDetailById = async (req, res) => {
  try {
    const detail = await PrintingDetailMaster.findById(req.params.id);

    if (!detail) {
      return res.status(404).json({ error: "Printing detail not found" });
    }

    res.json(detail);
  } catch (error) {
    console.error("Get printing detail error:", error);
    res.status(500).json({ error: "Failed to fetch printing detail" });
  }
};

exports.getPrintingDetailByItemAndClient = async (req, res) => {
  try {
    const { itemName, companyName } = req.params;

    const detail = await PrintingDetailMaster.findOne({ itemName, companyName });

    if (!detail) {
      return res.status(404).json({ error: "Printing detail not found" });
    }

    res.json(detail);
  } catch (error) {
    console.error("Get printing detail error:", error);
    res.status(500).json({ error: "Failed to fetch printing detail" });
  }
};

exports.createPrintingDetail = async (req, res) => {
  try {
    const {
      itemName,
      companyName,
      companyCategory,
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
      cuttingLengthMm,
    } = req.body;

    if (!itemName || !companyName) {
      return res
        .status(400)
        .json({ error: "Item name and client name are required" });
    }

    const existing = await PrintingDetailMaster.findOne({
      itemName,
      companyName,
    });
    if (existing) {
      return res.status(400).json({
        error: "Printing detail for this item and client already exists",
      });
    }

    const detail = new PrintingDetailMaster({
      itemName,
      companyName,
      companyCategory,
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
      cuttingLengthMm,
    });

    await detail.save();

    res.status(201).json({ printingDetail: detail });
  } catch (error) {
    console.error("Create printing detail error:", error);
    res.status(500).json({ error: "Failed to create printing detail" });
  }
};

exports.updatePrintingDetail = async (req, res) => {
  try {
    const {
      itemName,
      companyName,
      companyCategory,
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
      cuttingLengthMm,
    } = req.body;

    const detail = await PrintingDetailMaster.findById(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: "Printing detail not found" });
    }

    if (
      itemName &&
      companyName &&
      (itemName !== detail.itemName || companyName !== detail.companyName)
    ) {
      const existing = await PrintingDetailMaster.findOne({
        itemName,
        companyName,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          error: "Printing detail for this item and client already exists",
        });
      }
    }

    if (itemName !== undefined) detail.itemName = itemName;
    if (companyName !== undefined) detail.companyName = companyName;
    if (companyCategory !== undefined) detail.companyCategory = companyCategory;
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
    console.error("Update printing detail error:", error);
    res.status(500).json({ error: "Failed to update printing detail" });
  }
};

exports.deletePrintingDetail = async (req, res) => {
  try {
    const detail = await PrintingDetailMaster.findByIdAndDelete(req.params.id);

    if (!detail) {
      return res.status(404).json({ error: "Printing detail not found" });
    }

    res.json({ message: "Printing detail deleted successfully" });
  } catch (error) {
    console.error("Delete printing detail error:", error);
    res.status(500).json({ error: "Failed to delete printing detail" });
  }
};
exports.bulkImport = async (req, res) => {
  try {
    const { details } = req.body;

    if (!Array.isArray(details) || details.length === 0) {
      return res.status(400).json({ error: "Details array is required" });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const data of details) {
      try {
        const { itemName, companyName } = data;

        if (!itemName || !companyName) {
          results.failed.push({
            item: data,
            reason: "Item name and client name are required",
          });
          continue;
        }

        const existing = await PrintingDetailMaster.findOne({
          itemName,
          companyName,
        });
        if (existing) {
          Object.assign(existing, data);
          await existing.save();
          results.success.push(existing);
        } else {
          const detail = new PrintingDetailMaster(data);
          await detail.save();
          results.success.push(detail);
        }
      } catch (error) {
        results.failed.push({ item: data, reason: error.message });
      }
    }

    res.json({
      message: `Imported ${results.success.length} details, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to import details" });
  }
};
