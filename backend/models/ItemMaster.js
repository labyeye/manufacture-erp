const mongoose = require('mongoose');

const itemMasterSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Raw Material', 'Finished Goods', 'Consumable', 'Machine Spare'],
    required: true
  },
  category: String,
  clientCodes: {
    type: Map,
    of: String,
    default: {}
  },
  addedOn: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ItemMaster', itemMasterSchema);
