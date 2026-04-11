const mongoose = require('mongoose');

const consumableStockSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: String,
  qty: {
    type: Number,
    default: 0
  },
  unit: String,
  reorderLevel: {
    type: Number,
    default: 10
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


consumableStockSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('ConsumableStock', consumableStockSchema);
