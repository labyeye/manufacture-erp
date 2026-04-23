const mongoose = require("mongoose");

const jobStageSchema = new mongoose.Schema(
  {
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    processType: {
      type: String,
      enum: [
        "Printing",
        "Varnish",
        "Die Cutting",
        "Lamination",
        "Formation",
        "Bag Making",
        "Sheet Cutting",
      ],
      required: true,
    },
    stageInternalDueDateTime: Date,
    predecessorStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobStage",
    },
    successorBufferHrs: {
      type: Number,
      default: 0,
    },
    materialReady: {
      type: Boolean,
      default: false,
    },
    artworkApproved: {
      type: Boolean,
      default: false,
    },
    toolReady: {
      type: Boolean,
      default: false,
    },
    predecessorComplete: {
      type: Boolean,
      default: false,
    },
    eligibilityStatus: {
      type: String,
      enum: ["Eligible", "Blocked"],
      default: "Blocked",
    },
    blockedReasonCodes: [String], 

    plannedSetupHrs: Number,
    plannedRunHrs: Number,
    plannedBufferHrs: Number,
    plannedTotalHrs: Number,

    scheduledMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MachineMaster",
    },
    scheduledStart: Date,
    scheduledEnd: Date,

    actualStart: Date,
    actualEnd: Date,
    actualQtyProduced: Number,

    status: {
      type: String,
      enum: [
        "Blocked",
        "Eligible",
        "Scheduled",
        "Pending Approval",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      default: "Blocked",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("JobStage", jobStageSchema);
