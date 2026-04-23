const mongoose = require("mongoose");

const breakdownLogSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MachineMaster",
      required: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
    },
    reasonCode: {
      type: String,
      enum: [
        "Mechanical",
        "Electrical",
        "Tooling",
        "Material Jam",
        "Power",
        "Other",
      ],
      default: "Other",
    },
    issueDescription: String,
    description: String,      
    reportedBy: String,
    resolutionDescription: String,
    status: {
      type: String,
      enum: ["Open", "Resolved"],
      default: "Open",
    },
    rescheduleTriggered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("BreakdownLog", breakdownLogSchema);
