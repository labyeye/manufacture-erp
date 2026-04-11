const MaterialInward = require("../models/MaterialInward");
const PurchaseOrder = require("../models/PurchaseOrder");

exports.getAll = async (req, res) => {
  try {
    const inwards = await MaterialInward.find()
      .populate("purchaseOrderRef")
      .populate("vendor.id")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(inwards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const inward = await MaterialInward.findById(req.params.id)
      .populate("purchaseOrderRef")
      .populate("vendor.id")
      .populate("createdBy", "name email");
    if (!inward) return res.status(404).json({ message: "Inward not found" });
    res.json(inward);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      inwardDate,
      poRef,
      purchaseOrderRef,
      vendorName,
      invoiceNo,
      vehicleNo,
      location,
      receivedBy,
      remarks,
      vendor,
      items,
      status,
    } = req.body;

    const inward = new MaterialInward({
      inwardDate,
      poRef,
      purchaseOrderRef,
      vendorName,
      invoiceNo,
      vehicleNo,
      location,
      receivedBy,
      remarks,
      vendor,
      items,
      status: status || "Received",
      createdBy: req.user._id,
    });

    await inward.save();
    
    // Auto-update RM Stock
    try {
      const RawMaterialStock = require("../models/RawMaterialStock");
      for (const item of items) {
        if (item.materialType === "Raw Material" || !item.materialType) {
          try {
            // Normalize product code
            const itemCode = (item.productCode || "").trim() || null;
            const itemCategory = item.category || item.rmItem || "General";
            const itemSubCategory = item.subCategory || item.paperType || "Standard";
            
            // Build a descriptive name if not provided
            const itemName = item.itemName || `${itemCategory} | ${itemSubCategory}${item.gsm ? ` | ${item.gsm}gsm` : ""}${item.widthMm ? ` | ${item.widthMm}mm` : ""}`;

            // We only upsert if we have a code, otherwise we might create duplicates
            const query = itemCode ? { code: itemCode } : { name: itemName, category: itemCategory };

            await RawMaterialStock.findOneAndUpdate(
              query,
              {
                $set: {
                  name: itemName,
                  category: itemCategory,
                  paperType: itemSubCategory,
                  gsm: item.gsm || 0,
                  sheetSize: item.widthMm && item.lengthMm ? `${item.widthMm}x${item.lengthMm}mm` : (item.widthMm ? `${item.widthMm}mm` : ""),
                  location: location || "Main Warehouse",
                  lastUpdated: new Date()
                },
                $inc: {
                  weight: +(item.weight || 0),
                  qty: +(item.noOfSheets || item.qty || 0)
                }
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          } catch (itemErr) {
            console.error("Failed to update stock for item:", item.itemName || item.productCode, itemErr);
            // We continue with other items
          }
        }
      }
    } catch (stockErr) {
      console.error("Critical error in stock update loop:", stockErr);
    }

    await inward.populate("purchaseOrderRef");
    await inward.populate("vendor.id");
    await inward.populate("createdBy", "name email");

    res.status(201).json(inward);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const {
      inwardDate,
      poRef,
      purchaseOrderRef,
      vendorName,
      invoiceNo,
      vehicleNo,
      location,
      receivedBy,
      remarks,
      vendor,
      items,
      status,
    } = req.body;

    const inward = await MaterialInward.findById(req.params.id);
    if (!inward) return res.status(404).json({ message: "Inward not found" });

    inward.inwardDate = inwardDate || inward.inwardDate;
    inward.poRef = poRef || inward.poRef;
    inward.purchaseOrderRef = purchaseOrderRef || inward.purchaseOrderRef;
    inward.vendorName = vendorName || inward.vendorName;
    inward.invoiceNo = invoiceNo || inward.invoiceNo;
    inward.vehicleNo = vehicleNo || inward.vehicleNo;
    inward.location = location || inward.location;
    inward.receivedBy = receivedBy || inward.receivedBy;
    inward.remarks = remarks || inward.remarks;
    inward.vendor = vendor || inward.vendor;
    inward.items = items || inward.items;
    inward.status = status || inward.status;

    await inward.save();
    await inward.populate("purchaseOrderRef");
    await inward.populate("vendor.id");
    await inward.populate("createdBy", "name email");

    res.json(inward);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const inward = await MaterialInward.findByIdAndDelete(req.params.id);
    if (!inward) return res.status(404).json({ message: "Inward not found" });
    res.json({ message: "Inward deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const inward = await MaterialInward.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("purchaseOrderRef")
      .populate("vendor.id")
      .populate("createdBy", "name email");

    if (!inward) return res.status(404).json({ message: "Inward not found" });
    res.json(inward);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
