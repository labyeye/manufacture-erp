const mongoose = require("mongoose");

const materialInwardItemSchema = new mongoose.Schema(
  {
    materialType: {
      type: String,
      enum: ["Raw Material", "Consumable"],
      default: "Raw Material",
    },
    // Raw Material fields
    productCode: String,
    rmItem: String, // Paper Reel, Paper Sheets
    paperType: String, // MG Kraft, Bleached Kraft, etc
    widthMm: Number,
    lengthMm: Number,
    gsm: Number,
    noOfSheets: Number,
    noOfReels: Number,
    weight: Number, // in kg
    // Consumable fields
    itemName: String,
    category: String,
    size: String,
    qty: Number,
    unit: String,
    uom: String,
    // Common fields
    rate: Number,
    amount: Number,
  },
  { _id: false },
);

const materialInwardSchema = new mongoose.Schema(
  {
    inwardNo: {
      type: String,
      unique: true,
      required: true,
    },
    inwardDate: {
      type: Date,
      required: true,
    },
    poRef: String, // Optional PO reference number
    purchaseOrderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    vendorName: String,
    invoiceNo: String,
    vehicleNo: String,
    location: String, // Unit I, Unit II
    receivedBy: String,
    remarks: String,
    vendor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorMaster",
      },
      name: String,
      contact: String,
      address: String,
    },
    items: [materialInwardItemSchema],
    status: {
      type: String,
      enum: ["Pending", "Received", "Verified"],
      default: "Received",
    },
    totalAmount: Number,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

materialInwardSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await mongoose
      .model("Counter")
      .findByIdAndUpdate(
        "materialInward",
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true },
      );
    this.inwardNo = `MI-${String(counter.sequence_value).padStart(5, "0")}`;
  }

  const total = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  this.totalAmount = total;

  next();
});

module.exports = mongoose.model("MaterialInward", materialInwardSchema);
