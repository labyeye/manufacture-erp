const mongoose = require('mongoose');

const categoryMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['Raw Material', 'Finished Goods', 'Consumable', 'Machine Spare'],
    required: true
  },
  categories: {
    type: [String],
    default: []
  },
  subTypes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CategoryMaster', categoryMasterSchema);
