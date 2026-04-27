const mongoose = require("mongoose");

const spareIssueLogSchema = new mongoose.Schema(
  {
    itemCode: { type: String },
    itemName: { type: String, required: true },
    category: { type: String },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MachineMaster",
    },
    machineName: { type: String },
    qty: { type: Number, required: true },
    unit: { type: String, default: "nos" },
    issuedBy: { type: String },
    remarks: { type: String },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

spareIssueLogSchema.index({ machineId: 1 });
spareIssueLogSchema.index({ itemCode: 1 });
spareIssueLogSchema.index({ issuedAt: -1 });

module.exports = mongoose.model("SpareIssueLog", spareIssueLogSchema);
