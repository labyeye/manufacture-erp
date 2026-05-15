const TrashItem = require("../models/TrashItem");

exports.getAll = async (req, res) => {
  try {
    const items = await TrashItem.find().sort({ deletedAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Trash getAll error:", err);
    res.status(500).json({ error: "Failed to fetch trash" });
  }
};

exports.restore = async (req, res) => {
  try {
    const item = await TrashItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Trash item not found" });

    const Model = require(`../models/${item.modelName}`);
    const restored = new Model(item.data);
    await restored.save();

    await TrashItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Restored successfully" });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ error: "Failed to restore: " + err.message });
  }
};

exports.permanentDelete = async (req, res) => {
  try {
    const item = await TrashItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Trash item not found" });
    res.json({ message: "Permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to permanently delete" });
  }
};

exports.emptyTrash = async (req, res) => {
  try {
    await TrashItem.deleteMany({});
    res.json({ message: "Trash emptied" });
  } catch (err) {
    res.status(500).json({ error: "Failed to empty trash" });
  }
};
