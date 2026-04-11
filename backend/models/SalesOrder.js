const mongoose = require('mongoose');

const salesOrderItemSchema = new mongoose.Schema({
  productCode: String,
  itemCategory: String,
  itemName: String,
  size: String,
  variant: String,
  width: Number,
  length: Number,
  height: Number,
  gussett: Number,
  uom: {
    type: String,
    enum: ['inch', 'mm', 'cm', 'nos', 'pcs', 'kg', 'set'],
    default: 'nos'
  },
  orderQty: {
    type: Number,
    required: true
  },
  price: Number,
  amount: Number,
  remarks: String
});

const salesOrderSchema = new mongoose.Schema({
  soNo: {
    type: String,
    required: true,
    unique: true
  },
  orderDate: {
    type: Date,
    required: true
  },
  deliveryDate: Date,
  salesPerson: String,
  clientCategory: String,
  clientName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'In Production', 'Dispatched', 'Closed', 'Cancelled'],
    default: 'Open'
  },
  remarks: String,
  items: [salesOrderItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});


salesOrderSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  next();
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
