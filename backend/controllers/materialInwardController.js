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

    if (invoiceNo) {
      let query = { invoiceNo: invoiceNo.trim() };
      if (vendorName) {
        query.vendorName = { $regex: new RegExp(`^${vendorName.trim()}$`, "i") };
      }
      const existingInward = await MaterialInward.findOne(query);
      if (existingInward) {
        return res.status(400).json({
          message: vendorName
            ? `Material Inward with Invoice Number '${invoiceNo}' from Vendor '${vendorName}' already exists.`
            : `Material Inward with Invoice Number '${invoiceNo}' already exists.`,
        });
      }
    }

    if (poRef) {
      const po = await PurchaseOrder.findOne({ poNo: poRef });
      if (po) {
        const allInwards = await MaterialInward.find({ poRef: poRef });

        let orderedMap = {};
        po.items.forEach((it) => {
          const key = it.itemName || it.productCode || "unknown";
          orderedMap[key] =
            (orderedMap[key] || 0) + (Number(it.weight) || Number(it.qty) || 0);
        });

        let receivedMap = {};
        allInwards.forEach((inw) => {
          inw.items.forEach((it) => {
            const key = it.itemName || it.productCode || "unknown";
            receivedMap[key] =
              (receivedMap[key] || 0) +
              (Number(it.weight) || Number(it.qty) || 0);
          });
        });

        for (const it of items) {
          const key = it.itemName || it.productCode || "unknown";
          const incoming = Number(it.weight) || Number(it.qty) || 0;
          const ordered = orderedMap[key] || 0;
          const previouslyReceived = receivedMap[key] || 0;

          if (ordered > 0) {
            const allowed = ordered * 1.2;
            if (previouslyReceived + incoming > allowed) {
              return res.status(400).json({
                message: `Excess receiving not allowed for ${key}. Ordered: ${ordered}, Maximum Allowed (20% excess): ${allowed}, Trying to receive: ${previouslyReceived + incoming}`,
              });
            }
          }
        }
      }
    }

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
            const itemSubCategory =
              item.subCategory || item.paperType || "Standard";

            // Build a descriptive name if not provided
            const itemName =
              item.itemName ||
              `${itemCategory} | ${itemSubCategory}${item.gsm ? ` | ${item.gsm}gsm` : ""}${item.widthMm ? ` | ${item.widthMm}mm` : ""}`;

            // We only upsert if we have a code, otherwise we might create duplicates
            const query = itemCode
              ? { code: itemCode }
              : { name: itemName, category: itemCategory };

            await RawMaterialStock.findOneAndUpdate(
              query,
              {
                $set: {
                  name: itemName,
                  category: itemCategory,
                  paperType: itemSubCategory,
                  gsm: item.gsm || 0,
                  sheetSize:
                    item.widthMm && item.lengthMm
                      ? `${item.widthMm}x${item.lengthMm}mm`
                      : item.widthMm
                        ? `${item.widthMm}mm`
                        : "",
                  location: location || "Main Warehouse",
                  rate: item.rate || 0,
                  lastUpdated: new Date(),
                },
                $inc: {
                  weight: +(item.weight || 0),
                  qty: +(item.noOfSheets || item.qty || 0),
                },
              },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            );
          } catch (itemErr) {
            console.error(
              "Failed to update stock for item:",
              item.itemName || item.productCode,
              itemErr,
            );
            // We continue with other items
          }
        }
      }
    } catch (stockErr) {
      console.error("Critical error in stock update loop:", stockErr);
    }

    if (poRef) {
      try {
        const po = await PurchaseOrder.findOne({ poNo: poRef });
        if (po) {
          const allInwards = await MaterialInward.find({ poRef: poRef });

          let totalOrdered = 0;
          let totalReceived = 0;

          po.items.forEach((item) => {
            totalOrdered += Number(item.weight) || Number(item.qty) || 0;
          });

          allInwards.forEach((inw) => {
            inw.items.forEach((item) => {
              totalReceived += Number(item.weight) || Number(item.qty) || 0;
            });
          });

          if (totalOrdered > 0 && totalReceived >= 0.95 * totalOrdered) {
            po.status = "Received";
            await po.save();
          }
        }
      } catch (poErr) {
        console.error("Failed to update PO status:", poErr);
      }
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

    if (invoiceNo) {
      let query = { invoiceNo: invoiceNo.trim(), _id: { $ne: req.params.id } };
      if (vendorName) {
        query.vendorName = { $regex: new RegExp(`^${vendorName.trim()}$`, "i") };
      }
      const existingInward = await MaterialInward.findOne(query);
      if (existingInward) {
        return res.status(400).json({
          message: vendorName
            ? `Material Inward with Invoice Number '${invoiceNo}' from Vendor '${vendorName}' already exists.`
            : `Material Inward with Invoice Number '${invoiceNo}' already exists.`,
        });
      }
    }

    const inward = await MaterialInward.findById(req.params.id);
    if (!inward) return res.status(404).json({ message: "Inward not found" });

    if (poRef) {
      const po = await PurchaseOrder.findOne({ poNo: poRef });
      if (po) {
        const allInwards = await MaterialInward.find({
          poRef: poRef,
          _id: { $ne: req.params.id },
        });

        let orderedMap = {};
        po.items.forEach((it) => {
          const key = it.itemName || it.productCode || "unknown";
          orderedMap[key] =
            (orderedMap[key] || 0) + (Number(it.weight) || Number(it.qty) || 0);
        });

        let receivedMap = {};
        allInwards.forEach((inw) => {
          inw.items.forEach((it) => {
            const key = it.itemName || it.productCode || "unknown";
            receivedMap[key] =
              (receivedMap[key] || 0) +
              (Number(it.weight) || Number(it.qty) || 0);
          });
        });

        for (const it of items) {
          const key = it.itemName || it.productCode || "unknown";
          const incoming = Number(it.weight) || Number(it.qty) || 0;
          const ordered = orderedMap[key] || 0;
          const previouslyReceived = receivedMap[key] || 0;

          if (ordered > 0) {
            const allowed = ordered * 1.2;
            if (previouslyReceived + incoming > allowed) {
              return res.status(400).json({
                message: `Excess receiving not allowed for ${key}. Ordered: ${ordered}, Maximum Allowed (20% excess): ${allowed}, Trying to receive: ${previouslyReceived + incoming}`,
              });
            }
          }
        }
      }
    }

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
