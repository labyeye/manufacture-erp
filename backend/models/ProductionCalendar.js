const mongoose = require('mongoose');

const productionCalendarSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MachineMaster',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  shift: {
    type: String,
    enum: ['Shift 1', 'Shift 2', 'Shift 3', 'OT'],
    required: true
  },
  startTime: {
    type: String, // format 'HH:mm'
    required: true
  },
  endTime: {
    type: String, // format 'HH:mm'
    required: true
  },
  jobOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobOrder',
    required: true
  },
  jobCardNo: {
    type: String,
    required: true
  },
  process: {
    type: String, // Printing, Lamination, Die Cut, etc.
    required: true
  },
  scheduledHours: {
    type: Number,
    required: true
  },
  scheduledQty: {
    type: Number,
    required: true
  },
  isOvertime: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Planned', 'In-Progress', 'Completed', 'Delayed'],
    default: 'Planned'
  },
  remarks: String
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductionCalendar', productionCalendarSchema);
