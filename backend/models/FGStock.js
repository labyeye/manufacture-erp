const mongoose = require('mongoose');

const fgStockSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  joNo: String,
  soRef: String,
  clientName: String,
  qty: {
    type: Number,
    default: 0
  },
  unit: String,
  price: Number,
  addedOn: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastUpdated on save
fgStockSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('FGStock', fgStockSchema);
