const ActivityLog = require("../models/ActivityLog");

exports.getLogs = async (req, res) => {
  try {
    const {
      module,
      action,
      performedBy,
      from,
      to,
      search,
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};
    if (module && module !== "All") filter.module = module;
    if (action && action !== "All") filter.action = action;
    if (performedBy && performedBy !== "All") filter.performedBy = performedBy;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    if (search) {
      filter.$or = [
        { entityName: { $regex: search, $options: "i" } },
        { performedByName: { $regex: search, $options: "i" } },
        { module: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("performedBy", "name username role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    const stats = await ActivityLog.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
    ]);

    res.json({ logs, total, page: Number(page), limit: Number(limit), stats });
  } catch (error) {
    console.error("Get logs error:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};

exports.getModules = async (req, res) => {
  try {
    const modules = await ActivityLog.distinct("module");
    const users = await ActivityLog.distinct("performedByName");
    res.json({ modules, users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
};

exports.clearOldLogs = async (req, res) => {
  try {
    const days = Number(req.query.days) || 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await ActivityLog.deleteMany({ timestamp: { $lt: cutoff } });
    res.json({
      message: `Cleared ${result.deletedCount} logs older than ${days} days`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear logs" });
  }
};
