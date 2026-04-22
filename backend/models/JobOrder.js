const mongoose = require('mongoose');

const stageHistorySchema = new mongoose.Schema({
  stage: String,
  qtyCompleted: Number,
  qtyRejected: Number,
  operator: String,
  machine: String,
  shift: String,
  date: Date,
  remarks: String,
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  enteredAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const scheduleSchema = new mongoose.Schema({
  process: String,
  machine: String,
  machineId: String,
  machineName: String,
  startDate: Date,
  endDate: Date,
  duration: Number
}, { _id: false });

const jobOrderSchema = new mongoose.Schema({
  joNo: {
    type: String,
    required: true,
    unique: true
  },
  jobcardDate: {
    type: Date,
    required: true
  },
  orderDate: Date,
  soRef: String,
  companyName: String,
  companyCategory: String,
  itemName: String,
  product: String, 
  orderQty: {
    type: Number,
    required: true
  },
  deliveryDate: Date,
  process: [String],
  printing: String,
  plate: String,
  paperCategory: String,
  paperType: String,
  paperGsm: Number,
  sheetSize: String,
  sheetW: Number,
  sheetL: Number,
  sheetUom: {
    type: String,
    enum: ['mm', 'cm', 'inch'],
    default: 'mm'
  },
  noOfUps: Number,
  noOfSheets: Number,
  hasSecondPaper: {
    type: Boolean,
    default: false
  },
  paperCategory2: String,
  paperType2: String,
  paperGsm2: Number,
  noOfSheets2: Number,
  
  reelSize: String,
  reelWidthMm: Number,
  cuttingLengthMm: Number,
  reelWeightKg: Number,
  
  materialReady: {
    type: Boolean,
    default: false
  },
  artworkApproved: {
    type: Boolean,
    default: false
  },
  
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Partially Done', 'Completed', 'Cancelled'],
    default: 'Open'
  },
  currentStage: String,
  completedProcesses: [String],
  stageQtyMap: {
    type: Map,
    of: Number,
    default: {}
  },
  stageTotalMap: {
    type: Map,
    of: Number,
    default: {}
  },
  stageHistory: [stageHistorySchema],
  machineAssignments: {
    type: Map,
    of: String,
    default: {}
  },
  schedule: [scheduleSchema],
  remarks: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('JobOrder', jobOrderSchema);
