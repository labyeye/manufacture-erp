const mongoose = require("mongoose");

const priceListSchema = new mongoose.Schema(
  {
    listType: {
      type: String,
      enum: ["selling", "purchase"],
      required: true,
      index: true,
    },
    itemCode: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      trim: true,
    },
    
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyMaster",
    },
    companyName: {
      type: String,
      trim: true,
    },
    
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorMaster",
    },
    vendorName: {
      type: String,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    uom: {
      type: String,
      trim: true,
      default: "Pcs",
    },
    currency: {
      type: String,
      default: "INR",
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    
    moq: {
      type: Number,
      default: 1,
    },
    leadTimeDays: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Expired"],
      default: "Active",
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);


priceListSchema.index({ listType: 1, itemCode: 1, companyId: 1 });
priceListSchema.index({ listType: 1, itemCode: 1, vendorId: 1 });

module.exports = mongoose.model("PriceList", priceListSchema);
