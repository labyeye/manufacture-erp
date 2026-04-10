const mongoose = require('mongoose');

const sizeMasterSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true
  },
  paperTypes: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SizeMaster', sizeMasterSchema);
