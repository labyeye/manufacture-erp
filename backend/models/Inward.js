const mongoose = require('mongoose');

const inwardItemSchema = new mongoose.Schema({
  itemName: String,
  category: String,
  paperType: String,
  gsm: Number,
  sheetSize: String,
  unit: String,
  qty: Number,
  weight: Number,
  rate: Number,
  amount: Number,
  rmCode: String
}, { _id: false });

const inwardSchema = new mongoose.Schema({
  grn: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  vendor: {
    type: String,
    required: true
  },
  poRef: String,
  items: [inwardItemSchema],
  remarks: String,
  challanNo: String,
  invoiceNo: String,
  receivedBy: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inward', inwardSchema);
