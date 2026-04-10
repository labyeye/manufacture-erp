const mongoose = require('mongoose');

const categoryMasterSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Raw Material', 'Finished Goods', 'Consumable', 'Machine Spare'],
    required: true,
    unique: true
  },
  categories: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CategoryMaster', categoryMasterSchema);
