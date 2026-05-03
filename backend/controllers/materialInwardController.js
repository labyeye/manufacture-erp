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
        query.vendorName = {
          $regex: new RegExp(`^${vendorName.trim()}$`, "i"),
        };
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

            const incomingRate = Number(it.rate) || Number(it.price) || 0;
            const poItem = po.items.find(
              (pi) => (pi.itemName || pi.productCode || "unknown") === key,
            );
            if (poItem) {
              const poRate = Number(poItem.rate) || Number(poItem.price) || 0;
              if (poRate > 0 && incomingRate > poRate) {
                return res.status(400).json({
                  message: `Material Inward price (${incomingRate}) cannot be higher than Purchase Order price (${poRate}) for ${key}.`,
                });
              }
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

    
    
    await adjustStock(items, 1, location);

    await inward.populate("purchaseOrderRef");
    await inward.populate("vendor.id");
    await inward.populate("createdBy", "name email");

    res.status(201).json(inward);
    
    
    if (poRef) {
      await updatePurchaseOrderStatus(poRef);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const adjustStock = async (items, direction, location) => {
  const RawMaterialStock = require("../models/RawMaterialStock");
  for (const item of items) {
    if (item.materialType === "Raw Material" || !item.materialType) {
      try {
        const itemCode = (item.productCode || "").trim() || null;
        const itemCategory = item.category || item.rmItem || "General";
        const itemSubCategory = item.subCategory || item.paperType || "Standard";

        const itemName =
          item.itemName ||
          `${itemCategory} | ${itemSubCategory}${item.gsm ? ` | ${item.gsm}gsm` : ""}${item.widthMm ? ` | ${item.widthMm}mm` : ""}`;

        const query = itemCode
          ? { code: itemCode }
          : { name: itemName, category: itemCategory };

        const weightChange = (Number(item.weight) || 0) * direction;
        const qtyChange = (Number(item.noOfSheets || item.qty) || 0) * direction;

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
              weight: weightChange,
              qty: qtyChange,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (itemErr) {
        console.error("Failed to update stock for item:", item.itemName || item.productCode, itemErr);
      }
    } else if (item.materialType === "Consumable") {
      const ConsumableStock = require("../models/ConsumableStock");
      try {
        const itemCode = (item.productCode || "").trim() || null;
        const itemName = item.itemName || "Unknown Consumable";
        const itemCategory = item.category || "General";

        const query = itemCode
          ? { code: itemCode }
          : { name: { $regex: new RegExp(`^${itemName.trim()}$`, "i") } };

        const qtyChange = (Number(item.qty) || 0) * direction;

        await ConsumableStock.findOneAndUpdate(
          query,
          {
            $set: {
              name: itemName,
              code: itemCode,
              category: itemCategory,
              unit: item.unit || "nos",
              lastUpdated: new Date(),
            },
            $inc: { qty: qtyChange },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (err) {
        console.error(
          "Failed to update consumable stock for item:",
          item.itemName,
          err,
        );
      }
    } else if (
      item.materialType === "Finished Good" ||
      item.materialType === "Finished Goods"
    ) {
      const FGStock = require("../models/FGStock");
      try {
        const itemCode = (item.productCode || "").trim();
        if (!itemCode) return;

        const qtyChange = (Number(item.qty) || 0) * direction;

        await FGStock.findOneAndUpdate(
          { itemCode },
          {
            $set: {
              itemName: item.itemName,
              category: item.category || "Finished Goods",
              lastUpdated: new Date(),
            },
            $inc: { qty: qtyChange },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (err) {
        console.error("Failed to update FG stock for item:", itemCode, err);
      }
    }
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
        query.vendorName = {
          $regex: new RegExp(`^${vendorName.trim()}$`, "i"),
        };
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

    const effectivePoRef = poRef || (await MaterialInward.findById(req.params.id))?.poRef;
    if (effectivePoRef && items) {
      const po = await PurchaseOrder.findOne({ poNo: effectivePoRef });
      if (po) {
        const allInwards = await MaterialInward.find({
          poRef: effectivePoRef,
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

            const incomingRate = Number(it.rate) || Number(it.price) || 0;
            const poItem = po.items.find(
              (pi) => (pi.itemName || pi.productCode || "unknown") === key,
            );
            if (poItem) {
              const poRate = Number(poItem.rate) || Number(poItem.price) || 0;
              if (poRate > 0 && incomingRate > poRate) {
                return res.status(400).json({
                  message: `Material Inward price (${incomingRate}) cannot be higher than Purchase Order price (${poRate}) for ${key}.`,
                });
              }
            }
          }
        }
      }
    }

    const inward = await MaterialInward.findById(req.params.id);
    if (!inward) return res.status(404).json({ message: "Inward not found" });


    await adjustStock(inward.items, -1, inward.location);

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

    
    await adjustStock(inward.items, 1, inward.location);

    await inward.populate("purchaseOrderRef");
    await inward.populate("vendor.id");
    await inward.populate("createdBy", "name email");

    res.json(inward);

    
    if (inward.poRef) {
      await updatePurchaseOrderStatus(inward.poRef);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const inward = await MaterialInward.findById(req.params.id);
    if (!inward) return res.status(404).json({ message: "Inward not found" });

    
    await adjustStock(inward.items, -1, inward.location);

    await MaterialInward.findByIdAndDelete(req.params.id);
    res.json({ message: "Inward deleted successfully" });

    
    if (inward.poRef) {
      await updatePurchaseOrderStatus(inward.poRef);
    }
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

const updatePurchaseOrderStatus = async (poRef) => {
  try {
    const po = await PurchaseOrder.findOne({ poNo: poRef });
    if (!po) return;

    const allInwards = await MaterialInward.find({ poRef: poRef });

    let orderedQty = 0;
    po.items.forEach((it) => {
      orderedQty += Number(it.weight) || Number(it.qty) || 0;
    });

    let receivedQty = 0;
    allInwards.forEach((inw) => {
      (inw.items || []).forEach((it) => {
        receivedQty += Number(it.weight || it.qty || 0);
      });
    });

    let newStatus = "Open";
    if (receivedQty >= orderedQty) {
      newStatus = "Received";
    } else if (receivedQty > 0) {
      newStatus = "Partial";
    }

    if (po.status !== newStatus) {
      po.status = newStatus;
      await po.save();
    }
  } catch (err) {
    console.error("Failed to update PO status:", poRef, err);
  }
};

module.exports = exports;
