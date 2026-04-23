const mongoose = require("mongoose");

const productionCalendarSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MachineMaster",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ["Day", "OT", "Night"],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
    },
    jobStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobStage",
    },
    jobCardNo: {
      type: String,
      required: true,
    },
    process: {
      type: String,
      required: true,
    },
    scheduledHours: {
      type: Number,
      required: true,
    },
    scheduledQty: {
      type: Number,
      required: true,
    },
    dailyTarget: Number,          
    deliveryFeasible: {           
      type: String,
      enum: ["GREEN", "ORANGE", "RED"],
    },
    isOvertime: {
      type: Boolean,
      default: false,
    },
    overtimeNeeded: {
      type: Boolean,
      default: false,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    rescheduleReasonCode: {
      type: String,
      enum: ['Breakdown', 'Urgent Insertion', 'Material Delay', 'Artwork Pending', 'Tool Unavailable', 'Manual'],
    },
    plannedStart: Date,
    actualStart: Date,
    plannedEnd: Date,
    actualEnd: Date,
    plannedQty: Number,
    actualQty: Number,
    status: {
      type: String,
      enum: ["Scheduled", "Pending Approval", "Approved", "In Progress", "Completed", "Rescheduled", "Cancelled"],
      default: "Scheduled",
    },
    remarks: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ProductionCalendar", productionCalendarSchema);
