const mongoose = require('mongoose');

const brandMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyMaster' },
  companyName: { type: String },
  status: { type: String, default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('BrandMaster', brandMasterSchema);
