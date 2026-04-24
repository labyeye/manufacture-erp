const PriceList = require("../models/PriceList");

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.listType) filter.listType = req.query.listType;
    if (req.query.itemCode) filter.itemCode = req.query.itemCode;
    if (req.query.status) filter.status = req.query.status;

    const records = await PriceList.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch price list" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const record = await PriceList.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch record" });
  }
};

exports.create = async (req, res) => {
  try {
    const record = new PriceList(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to create record: " + err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await PriceList.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to update record" });
  }
};

exports.delete = async (req, res) => {
  try {
    const record = await PriceList.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete record" });
  }
};

exports.bulkImport = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ error: "No records provided" });
    }
    const inserted = await PriceList.insertMany(records, { ordered: false });
    res.status(201).json({ inserted: inserted.length });
  } catch (err) {
    res.status(500).json({ error: "Bulk import failed: " + err.message });
  }
};
