const mongoose = require("mongoose");

const materialInwardItemSchema = new mongoose.Schema(
  {
    materialType: {
      type: String,
      enum: ["Raw Material", "Consumable"],
      default: "Raw Material",
    },

    productCode: String,
    rmItem: String,
    paperType: String,
    widthMm: Number,
    lengthMm: Number,
    gsm: Number,
    noOfSheets: Number,
    noOfReels: Number,
    weight: Number,

    itemName: String,
    category: String,
    size: String,
    qty: Number,
    unit: String,
    uom: String,

    rate: Number,
    amount: Number,
    poRemarks: String
  },
  { _id: false },
);

const materialInwardSchema = new mongoose.Schema(
  {
    inwardNo: {
      type: String,
      unique: true,
    },
    inwardDate: {
      type: Date,
      required: true,
    },
    poRef: String,
    purchaseOrderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    vendorName: String,
    invoiceNo: String,
    vehicleNo: String,
    location: String,
    receivedBy: String,
    remarks: String,
    poRemarks: String,
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
    grnNo: String,
    tenantId: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

materialInwardSchema.pre("save", async function (next) {
  if (this.isNew && !this.inwardNo) {
    const Counter = mongoose.model("Counter");
    const year = new Date().getFullYear();
    const counter = await Counter.findOneAndUpdate(
      { name: `GRN-${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.inwardNo = `GRN-${year}${String(counter.seq).padStart(3, "0")}`;
  }

  if (!this.grnNo) {
    this.grnNo = this.inwardNo;
  }

  const total = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  this.totalAmount = total;

  next();
});

module.exports = mongoose.model("MaterialInward", materialInwardSchema);
