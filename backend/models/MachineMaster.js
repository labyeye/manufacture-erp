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
  division: {
    type: String,
    enum: ['Sheet', 'Reel'],
    default: 'Reel'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  
  // Availability & Shifts
  standardShiftHours: {
    type: Number,
    default: 8
  },
  shiftStartTime: {
    type: String,
    default: '09:00'
  },
  shiftEndTime: {
    type: String,
    default: '17:00'
  },
  maxShiftsAllowed: {
    type: Number,
    default: 1
  },
  
  // Overtime Rules
  overtimeAllowed: {
    type: Boolean,
    default: false
  },
  maxOvertimeHours: {
    type: Number,
    default: 0
  },
  
  // Working Days & Maintenance
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  weeklyOff: {
    type: [String],
    default: ['Sunday']
  },
  plannedMaintenanceHours: {
    type: Number,
    default: 0
  },
  
  // Performance Metrics
  practicalRunRate: {
    type: Number,
    default: 0
  },
  setupTimeDefault: {
    type: Number, // in minutes
    default: 30
  },
  changeoverTime: {
    type: Number, // in minutes
    default: 15
  },
  breakTime: {
    type: Number, // in minutes
    default: 60
  },
  
  capacityUnit: {
    type: String,
    enum: ['Sheets', 'Kg', 'Pcs', 'pcs/hr', 'Units'],
    default: 'Pcs'
  },
  
  // Compatibility
  productCompatibility: {
    minSize: String,
    maxSize: String,
    minGSM: Number,
    maxGSM: Number,
    handleTypes: [String]
  },
  
  // Others
  priorityRank: {
    type: Number,
    default: 1
  },
  operatorRequirement: {
    type: Number,
    default: 1
  },
  costPerHour: {
    type: Number,
    default: 0
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
