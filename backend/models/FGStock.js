const mongoose = require("mongoose");

const stockHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    qty: { type: Number, required: true }, // positive = in, negative = out
    type: {
      type: String,
      enum: ["opening", "production", "import", "dispatch", "return", "adjustment"],
      required: true,
    },
    ref: String,   // JO number, dispatch number, etc.
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true, timestamps: false },
);

const fgStockSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    itemCode: String,
    joNo: String,
    soRef: String,
    companyName: String,
    companyCat: String,
    qty: {
      type: Number,
      default: 0,
    },
    unit: String,
    price: Number,
    category: String,
    reorder: {
      type: Number,
      default: 0,
    },
    addedOn: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    stockHistory: { type: [stockHistorySchema], default: [] },
  },
  {
    timestamps: true,
  },
);

fgStockSchema.index({ itemName: 1 }, { unique: true });

fgStockSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("FGStock", fgStockSchema);
