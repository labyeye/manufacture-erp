const mongoose = require("mongoose");

const machineMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Printing",
        "Varnish",
        "Die Cutting",
        "Lamination",
        "Formation",
        "Bag Making",
        "Sheet Cutting",
        "Manual Formation",
        "Cutting",
        "Handmade",
      ],
    },
    division: {
      type: String,
      enum: ["Sheet", "Reel"],
      default: "Reel",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    currentStatus: {
      type: String,
      enum: ["Running", "Idle", "Breakdown", "Under Maintenance"],
      default: "Idle",
    },

    standardShiftHours: {
      type: Number,
      default: 8,
    },
    shiftStartTime: {
      type: String,
      default: "09:00",
    },
    shiftEndTime: {
      type: String,
      default: "17:30",
    },
    maxShiftsAllowed: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },

    overtimeAllowed: {
      type: Boolean,
      default: false,
    },
    maxOvertimeHours: {
      type: Number,
      default: 3.0,
    },
    secondShiftLeadTime: {
      type: Number,
      default: 24,
    },

    workingDays: {
      type: [String],
      default: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    weeklyOff: {
      type: [String],
      default: ["Sunday"],
    },
    plannedMaintenanceHours: {
      type: Number,
      default: 0,
    },

    practicalRunRate: {
      type: Number,
      default: 0,
    },
    efficiencyFactor: {
      type: Number,
      min: 0.7,
      max: 0.95,
      default: 0.95,
    },
    setupTimeDefault: {
      type: Number,
      default: 0.5,
    },
    changeoverTimeDefault: {
      type: Number,
      default: 0.25,
    },
    breakTime: {
      type: Number,
      default: 1.0,
    },

    capacityUnit: {
      type: String,
      enum: ["Sheets", "Kg", "Pcs", "Meters", "pcs/hr", "Units"],
      default: "Pcs",
    },

    productCompatibility: {
      type: [String],
      default: [],
    },
    minBatchSize: {
      type: Number,
      default: 0,
    },

    priorityRank: {
      type: Number,
      default: 1,
    },
    operatorRequirement: {
      type: Number,
      default: 1,
    },
    lastJobSetupSignature: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    parallelMachineGroup: {
      type: String,
      default: "",
    },
    dependentSuccessorMachines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MachineMaster",
      },
    ],
    costPerHour: {
      type: Number,
      default: 0,
    },

    records: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
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

module.exports = mongoose.model("MachineMaster", machineMasterSchema);
