const mongoose = require('mongoose');

const vendorMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
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

module.exports = mongoose.model('VendorMaster', vendorMasterSchema);
