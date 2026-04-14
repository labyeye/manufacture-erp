const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  itemName: String,
  productCode: String,
  category: String,
  paperType: String,
  gsm: Number,
  width: Number,
  length: Number,
  height: Number,
  sheetSize: String,
  unit: String,
  qty: Number,
  weight: Number,
  noOfSheets: Number,
  rate: Number,
  amount: Number,
  gstRate: Number,
  hsnCode: String,
  taxAmount: Number
}, { _id: false });


const purchaseOrderSchema = new mongoose.Schema({
  poNo: {
    type: String,
    required: true,
    unique: true
  },
  poDate: {
    type: Date,
    required: true
  },
  vendor: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'Partial', 'Received', 'Cancelled'],
    default: 'Open'
  },
  items: [purchaseOrderItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  deliveryDate: Date,
  remarks: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});


purchaseOrderSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
