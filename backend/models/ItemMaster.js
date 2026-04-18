const mongoose = require("mongoose");

const itemMasterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Raw Material", "Finished Goods", "Consumable", "Machine Spare"],
      required: true,
    },
    category: {
      type: String,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    clientName: {
      type: String,
      trim: true,
    },
    clientCategory: {
      type: String,
      trim: true,
    },
    gsm: {
      type: Number,
    },
    width: {
      type: Number,
    },
    length: {
      type: Number,
    },
    gussett: {
      type: Number,
    },
    height: {
      type: Number,
    },
    uom: {
      type: String,
      default: "mm",
    },
    gstRate: {
      type: Number,
      default: 18,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    reorderLevel: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    clientCodes: {
      type: Map,
      of: String,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    addedOn: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

itemMasterSchema.index({ type: 1, status: 1 });
itemMasterSchema.index({ name: "text", code: "text" });
itemMasterSchema.index({ name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("ItemMaster", itemMasterSchema);
