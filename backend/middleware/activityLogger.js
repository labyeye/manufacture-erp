const ActivityLog = require("../models/ActivityLog");

const PATH_TO_MODULE = {
  "auth/login": "Auth",
  "auth/logout": "Auth",
  "auth/users": "User Management",
  "purchase-orders": "Purchase Orders",
  "material-inward": "Material Inward",
  "category-master": "Category Master",
  "vendor-master": "Vendor Master",
  "company-master": "Company Master",
  "sales-orders": "Sales Orders",
  "job-orders": "Job Orders",
  dispatch: "Dispatch",
  "item-master": "Item Master",
  "machine-master": "Machine Master",
  planning: "Planning",
  "size-master": "Size Master",
  "printing-detail-master": "Printing Detail Master",
  "raw-material-stock": "RM Stock",
  "fg-stock": "FG Stock",
  "consumable-stock": "Consumable Stock",
  "brand-master": "Brand Master",
  "tooling-master": "Tooling Master",
  "factory-calendar": "Factory Calendar",
  "machine-maintenance": "Machine Maintenance",
  "breakdown-log": "Breakdown Log",
  "price-list": "Price List",
  "spare-issue-log": "Spare Issue Log",
};

function resolveModule(path) {
  const sub = path.replace(/^\/api\//, "").replace(/^\//, "");
  if (sub.startsWith("auth/users")) return "User Management";
  if (sub.startsWith("auth/login")) return "Auth";
  if (sub.startsWith("auth/logout")) return "Auth";
  const segment = sub.split("/")[0];
  return PATH_TO_MODULE[segment] || segment || "Unknown";
}

function resolveAction(method, path) {
  const p = path.toLowerCase();
  if (p.includes("/login")) return "LOGIN";
  if (p.includes("/logout")) return "LOGOUT";
  if (p.includes("/bulk-delete")) return "BULK_DELETED";
  if (p.includes("/bulk-import")) return "BULK_IMPORTED";
  if (p.includes("/status")) return "STATUS_CHANGED";
  if (p.includes("/stage")) return "STATUS_CHANGED";
  if (p.includes("/adjust") || p.includes("/stock-adjust"))
    return "STOCK_ADJUSTED";
  if (method === "POST") return "CREATED";
  if (method === "PUT" || method === "PATCH") return "UPDATED";
  if (method === "DELETE") return "DELETED";
  return "UPDATED";
}

// All wrapper keys any controller might use
const WRAPPER_KEYS = [
  "item",
  "order",
  "jobOrder",
  "salesOrder",
  "purchaseOrder",
  "dispatch",
  "vendor",
  "company",
  "brand",
  "machine",
  "user",
  "category",
  "log",
  "record",
  "plan",
  "maintenance",
  "breakdown",
  "tooling",
  "calendar",
  "spare",
  "price",
  "detail",
  "printing",
  "stock",
  "entry",
  "inward",
  "size",
  "priceList",
];

function pickName(obj) {
  if (!obj || typeof obj !== "object") return null;
  return (
    obj.name ||
    obj.username ||
    obj.code ||
    obj.orderNo ||
    obj.soNumber ||
    obj.poNumber ||
    obj.joNumber ||
    obj.grnNumber ||
    obj.dispatchNo ||
    obj.machineId ||
    obj.itemCode ||
    obj.description ||
    obj.title ||
    null
  );
}

function extractEntityInfo(body, action) {
  if (!body || typeof body !== "object") return { id: null, name: null };

  // Try known wrapper keys
  for (const key of WRAPPER_KEYS) {
    const val = body[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return {
        id: String(val._id || val.id || ""),
        name: pickName(val) || "",
      };
    }
  }

  // Direct response body (many controllers do res.json(record) directly)
  if (
    body._id ||
    body.id ||
    body.name ||
    body.code ||
    body.orderNo ||
    body.joNumber
  ) {
    return {
      id: String(body._id || body.id || ""),
      name: pickName(body) || "",
    };
  }

  // Bulk operations
  if (action === "BULK_IMPORTED" && body.results?.success?.length != null) {
    return {
      id: null,
      name: `${body.results.success.length} records imported`,
    };
  }
  if (action === "BULK_DELETED") {
    if (body.deletedCount != null)
      return { id: null, name: `${body.deletedCount} records deleted` };
    if (body.message) return { id: null, name: body.message };
  }

  return { id: null, name: null };
}

function buildDetails(method, reqBody, resBody, action) {
  const d = {};

  if (action === "LOGIN") {
    return { username: reqBody?.username };
  }

  if (action === "CREATED" || action === "UPDATED") {
    // Pick the meaningful fields from the request body (skip large/nested)
    const SKIP = ["_id", "__v", "createdAt", "updatedAt", "password", "token"];
    const fields = {};
    for (const [k, v] of Object.entries(reqBody || {})) {
      if (SKIP.includes(k)) continue;
      if (typeof v === "object" && v !== null && !Array.isArray(v)) continue;
      fields[k] = v;
    }
    if (Object.keys(fields).length) d.fields = fields;
  }

  if (action === "STATUS_CHANGED") {
    d.newStatus =
      reqBody?.status ||
      reqBody?.stage ||
      reqBody?.state ||
      resBody?.status ||
      resBody?.stage ||
      "—";
  }

  if (action === "STOCK_ADJUSTED") {
    d.qty = reqBody?.quantity || reqBody?.qty || reqBody?.adjustment;
    d.type = reqBody?.adjustmentType || reqBody?.type;
  }

  if (action === "DELETED" || action === "BULK_DELETED") {
    d.path = resBody?.message || "";
  }

  return Object.keys(d).length ? d : undefined;
}

function activityLogger(req, res, next) {
  if (req.method === "GET") return next();

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    originalJson(body);

    if (res.statusCode >= 400) return;

    const module = resolveModule(req.path);
    const action = resolveAction(req.method, req.path);
    const { id, name } = extractEntityInfo(body, action);
    const details = buildDetails(req.method, req.body, body, action);

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    const log = new ActivityLog({
      action,
      module,
      entityId: id || undefined,
      entityName: name || undefined,
      details,
      performedBy: req.user?._id || undefined,
      performedByName: req.user?.name || body?.user?.name || undefined,
      performedByRole: req.user?.role || body?.user?.role || undefined,
      ipAddress: ip,
    });

    log.save().catch((err) => console.error("ActivityLog save error:", err));
  };

  next();
}

module.exports = activityLogger;
