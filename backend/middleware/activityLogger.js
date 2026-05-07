const ActivityLog = require("../models/ActivityLog");

const PATH_TO_MODULE = {
  "auth/login":               "Auth",
  "auth/logout":              "Auth",
  "auth/users":               "User Management",
  "purchase-orders":          "Purchase Orders",
  "material-inward":          "Material Inward",
  "category-master":          "Category Master",
  "vendor-master":            "Vendor Master",
  "company-master":           "Company Master",
  "sales-orders":             "Sales Orders",
  "job-orders":               "Job Orders",
  "dispatch":                 "Dispatch",
  "item-master":              "Item Master",
  "machine-master":           "Machine Master",
  "planning":                 "Planning",
  "size-master":              "Size Master",
  "printing-detail-master":   "Printing Detail Master",
  "raw-material-stock":       "RM Stock",
  "fg-stock":                 "FG Stock",
  "consumable-stock":         "Consumable Stock",
  "brand-master":             "Brand Master",
  "tooling-master":           "Tooling Master",
  "factory-calendar":         "Factory Calendar",
  "machine-maintenance":      "Machine Maintenance",
  "breakdown-log":            "Breakdown Log",
  "price-list":               "Price List",
  "spare-issue-log":          "Spare Issue Log",
};

function resolveModule(path) {
  const stripped = path.replace(/^\/api\//, "").split("/")[0];
  const sub = path.replace(/^\/api\//, "");
  if (sub.startsWith("auth/users")) return "User Management";
  if (sub.startsWith("auth/login")) return "Auth";
  if (sub.startsWith("auth/logout")) return "Auth";
  return PATH_TO_MODULE[stripped] || stripped;
}

function resolveAction(method, path, statusCode) {
  const p = path.toLowerCase();
  if (p.includes("/login"))        return "LOGIN";
  if (p.includes("/logout"))       return "LOGOUT";
  if (p.includes("/bulk-delete"))  return "BULK_DELETED";
  if (p.includes("/bulk-import"))  return "BULK_IMPORTED";
  if (p.includes("/status"))       return "STATUS_CHANGED";
  if (p.includes("/adjust-stock") || p.includes("/stock-adjust")) return "STOCK_ADJUSTED";
  if (method === "POST")   return "CREATED";
  if (method === "PUT" || method === "PATCH") return "UPDATED";
  if (method === "DELETE") return "DELETED";
  return "UPDATED";
}

function extractEntityInfo(body, module, action) {
  if (!body || typeof body !== "object") return { id: null, name: null };

  const record =
    body.item || body.order || body.entry || body.dispatch ||
    body.vendor || body.company || body.brand || body.machine ||
    body.user || body.category || body.log || body.record ||
    body.plan || body.maintenance || body.breakdown || body.tooling ||
    body.calendar || body.spare || body.price || body.detail ||
    body.printing || (Array.isArray(body.items) ? null : null);

  if (record) {
    return {
      id:   String(record._id || record.id || ""),
      name: record.name || record.code || record.orderNo ||
            record.soNumber || record.poNumber || record.joNumber ||
            record.grnNumber || record.dispatchNo || record.username || "",
    };
  }

  if (action === "BULK_IMPORTED" && body.results?.success?.length) {
    return { id: null, name: `${body.results.success.length} records imported` };
  }
  if (action === "BULK_DELETED" && body.deletedCount != null) {
    return { id: null, name: `${body.deletedCount} records deleted` };
  }

  return { id: null, name: null };
}

function activityLogger(req, res, next) {
  if (req.method === "GET") return next();

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    originalJson(body);

    const status = res.statusCode;
    if (status >= 400) return;

    const module = resolveModule(req.path);
    const action = resolveAction(req.method, req.path, status);
    const { id, name } = extractEntityInfo(body, module, action);

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    const log = new ActivityLog({
      action,
      module,
      entityId:        id || undefined,
      entityName:      name || undefined,
      details:         req.method === "DELETE" ? { path: req.path } : undefined,
      performedBy:     req.user?._id || undefined,
      performedByName: req.user?.name || (body?.user?.name) || undefined,
      performedByRole: req.user?.role || (body?.user?.role) || undefined,
      ipAddress:       ip,
    });

    log.save().catch((err) => console.error("ActivityLog save error:", err));
  };

  next();
}

module.exports = activityLogger;
