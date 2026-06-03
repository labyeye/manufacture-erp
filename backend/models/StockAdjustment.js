const mongoose = require("mongoose");

const stockAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNo: {
      type: String,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    productCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    stockType: {
      type: String,
      enum: ["Raw Material", "Finished Goods", "Consumable"],
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ["Production", "Inward", "Outward"],
      required: true,
    },
    qty: {
      type: Number,
      required: true,
    },
    weight: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    beforeQty: {
      type: Number,
      default: 0,
    },
    afterQty: {
      type: Number,
      default: 0,
    },
    beforeWeight: {
      type: Number,
      default: 0,
    },
    afterWeight: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

stockAdjustmentSchema.index({ productCode: 1 });
stockAdjustmentSchema.index({ date: -1 });
stockAdjustmentSchema.index({ adjustmentType: 1 });

module.exports = mongoose.model("StockAdjustment", stockAdjustmentSchema);
