const mongoose = require("mongoose");

const trashItemSchema = new mongoose.Schema({
  modelName: { type: String, required: true }, // e.g. "PurchaseOrder"
  collectionName: { type: String, required: true }, // e.g. "purchaseorders"
  displayId: { type: String }, // e.g. PO-001, GRN-001
  label: { type: String, required: true }, // human-readable type, e.g. "Purchase Order"
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  deletedAt: { type: Date, default: Date.now },
  deletedBy: { type: String, default: "system" },
  expiresAt: { type: Date },
});

trashItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

trashItemSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    const d = new Date(this.deletedAt || Date.now());
    d.setDate(d.getDate() + 7);
    this.expiresAt = d;
  }
  next();
});

module.exports = mongoose.model("TrashItem", trashItemSchema);
