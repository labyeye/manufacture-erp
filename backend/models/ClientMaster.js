const mongoose = require('mongoose');

const clientMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  category: String,
  contact: String,
  phone: String,
  email: String,
  address: String,
  gstin: String,
  addedOn: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClientMaster', clientMasterSchema);
