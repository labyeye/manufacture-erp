const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "LOGIN", "LOGOUT",
        "CREATED", "UPDATED", "DELETED", "BULK_DELETED", "BULK_IMPORTED",
        "STATUS_CHANGED", "STOCK_ADJUSTED",
      ],
      required: true,
    },
    module: { type: String, required: true },
    entityId: { type: String },
    entityName: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String },
    performedByRole: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

activityLogSchema.index({ module: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ performedBy: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
