const mongoose = require('mongoose');

const dispatchItemSchema = new mongoose.Schema({
  itemName: String,
  productCode: String,
  clientCode: String,
  qty: Number,
  unit: String,
  rate: Number,
  amount: Number,
  gstRate: Number,
  taxAmount: Number,
  totalWithTax: Number
}, { _id: false });

const dispatchSchema = new mongoose.Schema({
  dispatchNo: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  soRef: String,
  joRef: String,
  vehicleNo: String,
  driverName: String,
  lrNo: String,
  items: [dispatchItemSchema],
  totalQty: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  remarks: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});


dispatchSchema.pre('save', function(next) {
  this.totalQty = this.items.reduce((sum, item) => sum + (item.qty || 0), 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);
