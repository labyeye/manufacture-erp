const mongoose = require('mongoose');

const machineMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  capacity: {
    type: Number,
    default: 0
  },
  capacityUnit: {
    type: String,
    default: 'pcs/hr'
  },
  workingHours: {
    type: Number,
    default: 8
  },
  shiftsPerDay: {
    type: Number,
    default: 1
  },
  records: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  addedOn: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MachineMaster', machineMasterSchema);
