const mongoose = require("mongoose");

const factoryCalendarSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Working", "Holiday", "Shutdown", "Half-day", "Power-cut"],
      default: "Working",
    },
    reason: String,
    affectsAllMachines: {
      type: Boolean,
      default: true,
    },
    affectedMachineIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MachineMaster",
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FactoryCalendar", factoryCalendarSchema);
