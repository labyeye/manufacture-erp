const mongoose = require("mongoose");

const toolingMasterSchema = new mongoose.Schema(
  {
    toolType: {
      type: String,
      enum: ["Cylinder", "Die", "Plate"],
      required: true,
    },
    designCode: {
      type: String,
      required: true,
    },
    linkedSKU: {
      type: String, 
      required: true,
    },
    compatibleMachines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MachineMaster",
      },
    ],
    status: {
      type: String,
      enum: ["Available", "In Use", "Under Recondition", "Scrapped"],
      default: "Available",
    },
    impressionsDone: {
      type: Number,
      default: 0,
    },
    maxImpressionsBeforeRecondition: {
      type: Number,
      default: 1000000,
    },
    location: String,
    lastUsedDate: Date,
    reconditioningLeadTime: {
      type: Number,
      default: 7, 
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ToolingMaster", toolingMasterSchema);
