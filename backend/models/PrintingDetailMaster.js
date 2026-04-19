const mongoose = require('mongoose');

const printingDetailMasterSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  companyCategory: String,
  itemCategory: String,
  printing: String,
  plate: String,
  process: [String],
  paperCategory: String,
  paperType: String,
  paperGsm: Number,
  noOfUps: Number,
  sheetSize: String,
  sheetW: Number,
  sheetL: Number,
  
  reelSize: String,
  reelWidthMm: Number,
  cuttingLengthMm: Number,
  addedOn: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


printingDetailMasterSchema.index({ itemName: 1, companyName: 1 }, { unique: true });


printingDetailMasterSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PrintingDetailMaster', printingDetailMasterSchema);
