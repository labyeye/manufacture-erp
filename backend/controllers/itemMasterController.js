const ItemMaster = require("../models/ItemMaster");
const Counter = require("../models/Counter");

exports.getAllItems = async (req, res) => {
  try {
    const { type, status, category } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const items = await ItemMaster.find(filter)
      .populate("createdBy", "name username")
      .sort({ createdAt: -1 });

    res.json({ items });
  } catch (error) {
    console.error("Get all items error:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await ItemMaster.findById(req.params.id).populate(
      "createdBy",
      "name username",
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Get item error:", error);
    res.status(500).json({ error: "Failed to fetch item" });
  }
};

const getNextItemCode = async (type) => {
  const prefixMap = {
    "Raw Material": "RM",
    Consumable: "CG",
    "Finished Goods": "FG",
    "Machine Spare": "MS",
  };

  const prefix = prefixMap[type] || "IT";
  const counterName = `itemMaster_${prefix}`;

  const itemCount = await ItemMaster.countDocuments({
    code: { $regex: new RegExp(`^${prefix}`) },
  });

  if (itemCount === 0) {
    await Counter.findOneAndUpdate(
      { name: counterName },
      { $set: { seq: 0 } },
      { upsert: true },
    );
  }

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return `${prefix}${String(counter.seq).padStart(4, "0")}`;
};

exports.createItem = async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      category,
      subCategory,
      gsm,
      width,
      length,
      clientCodes,
      clientName,
      gstRate,
      hsnCode,
      reorderLevel,
      gussett,
      height,
      uom,
      clientCategory,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const existingItem = await ItemMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      type,
    });

    if (existingItem) {
      return res
        .status(400)
        .json({ error: "Item with this name already exists in this type" });
    }

    let itemCode = code?.trim()?.toUpperCase();
    if (!itemCode) {
      itemCode = await getNextItemCode(type);
    } else {
      const existingCode = await ItemMaster.findOne({ code: itemCode });
      if (existingCode) {
        return res.status(400).json({ error: "Item code already exists" });
      }
    }

    const item = new ItemMaster({
      code: itemCode,
      name: name.trim(),
      type,
      category: category?.trim(),
      subCategory: subCategory?.trim(),
      gsm: gsm ? Number(gsm) : undefined,
      width: width ? Number(width) : undefined,
      length: length ? Number(length) : undefined,
      clientCodes: clientCodes || {},
      clientName: clientName?.trim(),
      gstRate: gstRate ? Number(gstRate) : 18,
      hsnCode: hsnCode?.trim(),
      reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
      gussett: gussett ? Number(gussett) : undefined,
      height: height ? Number(height) : undefined,
      uom: uom || "mm",
      clientCategory: clientCategory?.trim(),
      createdBy: req.user?.id,
    });

    await item.save();

    const populatedItem = await ItemMaster.findById(item._id).populate(
      "createdBy",
      "name username",
    );

    res.status(201).json({ item: populatedItem });
  } catch (error) {
    console.error("Create item error:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const {
      name,
      category,
      subCategory,
      gsm,
      width,
      length,
      clientCodes,
      status,
      clientName,
      gstRate,
      hsnCode,
      reorderLevel,
      gussett,
      height,
      uom,
      clientCategory,
    } = req.body;

    const item = await ItemMaster.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (name && name !== item.name) {
      const existingItem = await ItemMaster.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        type: item.type,
        _id: { $ne: req.params.id },
      });

      if (existingItem) {
        return res
          .status(400)
          .json({ error: "Item with this name already exists in this type" });
      }
      item.name = name.trim();
    }

    if (category !== undefined) item.category = category?.trim();
    if (subCategory !== undefined) item.subCategory = subCategory?.trim();
    if (gsm !== undefined) item.gsm = gsm ? Number(gsm) : undefined;
    if (width !== undefined) item.width = width ? Number(width) : undefined;
    if (length !== undefined) item.length = length ? Number(length) : undefined;
    if (clientCodes !== undefined) item.clientCodes = clientCodes;
    if (clientName !== undefined) item.clientName = clientName?.trim();
    if (gstRate !== undefined) item.gstRate = Number(gstRate);
    if (hsnCode !== undefined) item.hsnCode = hsnCode?.trim();
    if (reorderLevel !== undefined) item.reorderLevel = Number(reorderLevel);
    if (gussett !== undefined) item.gussett = gussett ? Number(gussett) : undefined;
    if (height !== undefined) item.height = height ? Number(height) : undefined;
    if (uom !== undefined) item.uom = uom;
    if (clientCategory !== undefined) item.clientCategory = clientCategory?.trim();
    if (status) item.status = status;

    await item.save();

    const updatedItem = await ItemMaster.findById(item._id).populate(
      "createdBy",
      "name username",
    );

    res.json({ item: updatedItem });
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await ItemMaster.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Item IDs array is required" });
    }

    const result = await ItemMaster.deleteMany({ _id: { $in: ids } });

    res.json({
      message: `Successfully deleted ${result.deletedCount} items`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete items error:", error);
    res.status(500).json({ error: "Failed to delete multiple items" });
  }
};

exports.updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const item = await ItemMaster.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).populate("createdBy", "name username");

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ item });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

exports.bulkImport = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const itemData of items) {
      try {
        const {
          code,
          name,
          type,
          category,
          subCategory,
          gsm,
          width,
          length,
          clientName,
          gstRate,
          hsnCode,
          reorderLevel,
          gussett,
          height,
          uom,
          clientCategory,
        } = itemData;

        if (!name || !type) {
          results.failed.push({
            item: itemData,
            reason: "Name and type are required",
          });
          continue;
        }

        let itemCode = code?.trim()?.toUpperCase();
        if (!itemCode) {
          itemCode = await getNextItemCode(type);
        }

        const existingCode = await ItemMaster.findOne({ code: itemCode });
        if (existingCode) {
          results.failed.push({
            item: itemData,
            reason: "Code already exists",
          });
          continue;
        }

        const existingName = await ItemMaster.findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          type,
        });
        if (existingName) {
          results.failed.push({
            item: itemData,
            reason: `Item with name '${name}' already exists in ${type}`,
          });
          continue;
        }

        const item = new ItemMaster({
          code: itemCode,
          name: name.trim(),
          type,
          category: category?.trim(),
          subCategory: subCategory?.trim(),
          gsm: gsm ? Number(gsm) : undefined,
          width: width ? Number(width) : undefined,
          length: length ? Number(length) : undefined,
          clientName: clientName?.trim(),
          gstRate: gstRate ? Number(gstRate) : 18,
          hsnCode: hsnCode?.trim(),
          reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
          gussett: gussett ? Number(gussett) : undefined,
          height: height ? Number(height) : undefined,
          uom: uom || "mm",
          clientCategory: clientCategory?.trim(),
          createdBy: req.user?.id,
        });

        await item.save();
        results.success.push(item);
      } catch (error) {
        results.failed.push({ item: itemData, reason: error.message });
      }
    }

    res.json({
      message: `Imported ${results.success.length} items, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to import items" });
  }
};
