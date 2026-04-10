const mongoose = require('mongoose');

const rawMaterialStockSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true
  },
  category: String,
  paperType: String,
  gsm: Number,
  unit: {
    type: String,
    enum: ['sheets', 'reels', 'kg'],
    default: 'sheets'
  },
  qty: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  weightPerSheet: Number,
  sheetSize: String,
  location: String,
  reorderLevel: {
    type: Number,
    default: 50
  },
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
rawMaterialStockSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('RawMaterialStock', rawMaterialStockSchema);
