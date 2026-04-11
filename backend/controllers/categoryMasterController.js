const CategoryMaster = require("../models/CategoryMaster");


exports.getAll = async (req, res) => {
  try {
    const categories = await CategoryMaster.find()
      .populate('createdBy', 'name username')
      .sort({ type: 1 });

    
    const grouped = {};
    
    categories.forEach((cat) => {
      if (!grouped[cat.type]) {
        grouped[cat.type] = {
          _id: cat._id,
          type: cat.type,
          status: cat.status,
          createdBy: cat.createdBy,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
          subTypes: cat.subTypes || {}
        };
      } else {
        
        grouped[cat.type].subTypes = {
          ...grouped[cat.type].subTypes,
          ...cat.subTypes
        };
      }
    });

    
    const result = Object.values(grouped);

    res.json({ categories: result });
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};


exports.getOne = async (req, res) => {
  try {
    const category = await CategoryMaster.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};


exports.create = async (req, res) => {
  try {
    const { name, type, categories, subTypes, status } = req.body;

    console.log("Create request body:", { name, type, categories, subTypes, status });

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    const category = new CategoryMaster({
      name: name?.trim() || null,
      type,
      categories: categories || [],
      subTypes: subTypes || {},
      status: status || 'Active',
      createdBy: req.user?._id,
    });

    await category.save();

    res.status(201).json({ category });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(400).json({ error: "Failed to create category" });
  }
};


exports.update = async (req, res) => {
  try {
    const { name, type, categories, subTypes, status } = req.body;

    const category = await CategoryMaster.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    
    if (name !== undefined) category.name = name.trim();
    if (type !== undefined) category.type = type;
    if (categories !== undefined) category.categories = categories;
    if (subTypes !== undefined) category.subTypes = subTypes;
    if (status !== undefined) category.status = status;

    await category.save();

    res.json({ category });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(400).json({ error: "Failed to update category" });
  }
};


exports.delete = async (req, res) => {
  try {
    const category = await CategoryMaster.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};


exports.addSubType = async (req, res) => {
  try {
    const { name, type, subType } = req.body;

    if (!name || !type || !subType) {
      return res
        .status(400)
        .json({ error: "Name, type, and subType are required" });
    }

    const category = await CategoryMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      type,
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category.subTypes.includes(subType.trim())) {
      return res.status(400).json({ error: "Sub-type already exists" });
    }

    category.subTypes.push(subType.trim());
    await category.save();

    res.json({ category });
  } catch (error) {
    console.error("Add sub-type error:", error);
    res.status(500).json({ error: "Failed to add sub-type" });
  }
};


exports.removeSubType = async (req, res) => {
  try {
    const { name, type, subType } = req.body;

    if (!name || !type || !subType) {
      return res
        .status(400)
        .json({ error: "Name, type, and subType are required" });
    }

    const category = await CategoryMaster.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      type,
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.subTypes = category.subTypes.filter((st) => st !== subType);
    await category.save();

    res.json({ category });
  } catch (error) {
    console.error("Remove sub-type error:", error);
    res.status(500).json({ error: "Failed to remove sub-type" });
  }
};


exports.bulkImport = async (req, res) => {
  try {
    const { type, categories } = req.body;

    if (!type || !Array.isArray(categories)) {
      return res
        .status(400)
        .json({ error: "Type and categories array are required" });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: [],
    };

    for (const item of categories) {
      try {
        const { name, subTypes } = item;

        if (!name) {
          results.failed.push({ item, reason: "Name is required" });
          continue;
        }

        
        const existing = await CategoryMaster.findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          type,
        });

        if (existing) {
          
          const newSubTypes = [
            ...new Set([...existing.subTypes, ...(subTypes || [])]),
          ];
          existing.subTypes = newSubTypes;
          await existing.save();
          results.updated++;
        } else {
          
          const category = new CategoryMaster({
            name: name.trim(),
            type,
            subTypes: subTypes || [],
            createdBy: req.user?._id,
          });
          await category.save();
          results.created++;
        }
      } catch (error) {
        results.failed.push({ item, reason: error.message });
      }
    }

    res.json({
      message: `Import complete: ${results.created} created, ${results.updated} updated, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to import categories" });
  }
};
