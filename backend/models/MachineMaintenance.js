const mongoose = require('mongoose');

const machineMaintenanceSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MachineMaster',
    required: true
  },
  startDateTime: {
    type: Date,
    required: true
  },
  endDateTime: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['Planned Maintenance', 'PM Inspection', 'Tool Change', 'Cleaning'],
    required: true
  },
  reason: String,
  hoursBlocked: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('MachineMaintenance', machineMaintenanceSchema);
