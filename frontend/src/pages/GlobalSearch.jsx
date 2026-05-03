import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";
import { Card, SectionTitle } from "../components/ui/BasicComponents";

const MODULE_COLORS = {
  "Sales Order":      C.blue,
  "Job Order":        C.purple,
  "Purchase Order":   C.accent,
  "Material Inward":  "#06b6d4",
  "Dispatch":         "#06b6d4",
  "Material Return":  C.red,
  "FG Stock":         C.green,
  "RM Stock":         "#f59e0b",
  "Consumable Stock": C.yellow,
  "Vendor Master":    "#ec4899",
  "Company Master":   C.blue,
  "Item Master":      C.green,
  "Machine Master":   C.muted,
  "Price List":       C.accent,
  "Printing Master":  C.purple,
  "Category":         "#10b981",
};

const TYPE_TO_TAB = {
  "Sales Order":      "sales",
  "Job Order":        "jobs",
  "Purchase Order":   "purchase",
  "Material Inward":  "inward",
  "Dispatch":         "dispatch",
  "Material Return":  "dispatch",
  "FG Stock":         "fg",
  "RM Stock":         "rawstock",
  "Consumable Stock": "consumablestock",
  "Vendor Master":    "vendormaster",
  "Company Master":   "companymaster",
  "Item Master":      "itemmaster",
  "Machine Master":   "machinemaster",
  "Price List":       "pricemaster",
  "Printing Master":  "printingmaster",
  "Category":         "sizemaster",
};

const TYPE_ICONS = {
  "Sales Order":      "🧾",
  "Job Order":        "📋",
  "Purchase Order":   "🛒",
  "Material Inward":  "📦",
  "Dispatch":         "🚚",
  "Material Return":  "↩️",
  "FG Stock":         "🏭",
  "RM Stock":         "📊",
  "Consumable Stock": "🔧",
  "Vendor Master":    "🏪",
  "Company Master":   "🏢",
  "Item Master":      "📝",
  "Machine Master":   "⚙️",
  "Price List":       "💰",
  "Printing Master":  "🖨️",
  "Category":         "🗂️",
};

export function GlobalSearch({
  salesOrders,
  jobOrders,
  purchaseOrders,
  inward,
  fgStock,
  rawStock,
  dispatches,
  consumableStock,
  vendorMaster,
  companyMaster,
  itemMasterFG,
  machineMaster,
  priceList,
  printingMaster,
  categoryMaster,
  onNavigate,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const allResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    const results = [];

    // Sales Orders
    (salesOrders || []).forEach((so) => {
      const company = so.companyName || so.clientName || "";
      const match =
        so.soNo?.toLowerCase().includes(term) ||
        company.toLowerCase().includes(term) ||
        (so.items || []).some((it) => it.productCode?.toLowerCase().includes(term));
      if (match)
        results.push({
          type: "Sales Order",
          name: so.soNo,
          detail: company,
          meta: so.status || "",
        });
    });

    // Job Orders
    (jobOrders || []).forEach((jo) => {
      const match =
        jo.joNo?.toLowerCase().includes(term) ||
        jo.itemName?.toLowerCase().includes(term) ||
        jo.companyName?.toLowerCase().includes(term) ||
        jo.productCode?.toLowerCase().includes(term) ||
        jo.soRef?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Job Order",
          name: jo.joNo,
          detail: jo.itemName || jo.companyName || "",
          meta: jo.status || "",
        });
    });

    // Purchase Orders
    (purchaseOrders || []).forEach((po) => {
      const vendor =
        typeof po.vendor === "object"
          ? po.vendor?.name
          : po.vendor || po.vendorName || "";
      const match =
        po.poNo?.toLowerCase().includes(term) ||
        vendor.toLowerCase().includes(term) ||
        (po.items || []).some(
          (it) =>
            it.productCode?.toLowerCase().includes(term) ||
            it.category?.toLowerCase().includes(term)
        );
      if (match)
        results.push({
          type: "Purchase Order",
          name: po.poNo,
          detail: vendor,
          meta: po.poStatus || "",
        });
    });

    // Material Inward
    (inward || []).forEach((inv) => {
      const ref = inv.inwardNo || inv.grnNo || "";
      const vendor = inv.vendorName || inv.vendor || "";
      const match =
        ref.toLowerCase().includes(term) ||
        vendor.toLowerCase().includes(term) ||
        inv.invoiceNo?.toLowerCase().includes(term) ||
        inv.poRef?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Material Inward",
          name: ref,
          detail: vendor,
          meta: inv.invoiceNo || "",
        });
    });

    // Dispatches
    (dispatches || []).forEach((d) => {
      const match =
        d.dispatchNo?.toLowerCase().includes(term) ||
        d.companyName?.toLowerCase().includes(term) ||
        d.soRef?.toLowerCase().includes(term) ||
        d.vehicleNo?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: d.type === "Return" ? "Material Return" : "Dispatch",
          name: d.dispatchNo,
          detail: d.companyName || "",
          meta: d.soRef || "",
        });
    });

    // FG Stock
    (fgStock || []).forEach((s) => {
      const match =
        s.itemName?.toLowerCase().includes(term) ||
        s.itemCode?.toLowerCase().includes(term) ||
        s.code?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "FG Stock",
          name: s.itemName || s.code,
          detail: `Qty: ${s.qty ?? 0} ${s.unit || "pcs"}`,
          meta: s.category || "",
        });
    });

    // RM Stock
    (rawStock || []).forEach((s) => {
      const match =
        s.name?.toLowerCase().includes(term) ||
        s.code?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        s.type?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "RM Stock",
          name: s.name || s.code,
          detail: `Qty: ${s.qty ?? 0}`,
          meta: s.category || "",
        });
    });

    // Consumable Stock
    (consumableStock || []).forEach((s) => {
      const match =
        s.itemName?.toLowerCase().includes(term) ||
        s.code?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        s.type?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Consumable Stock",
          name: s.itemName || s.code,
          detail: `Qty: ${s.qty ?? 0} ${s.unit || ""}`,
          meta: s.category || "",
        });
    });

    // Vendor Master
    (vendorMaster || []).forEach((v) => {
      const match =
        v.name?.toLowerCase().includes(term) ||
        v.gstin?.toLowerCase().includes(term) ||
        v.email?.toLowerCase().includes(term) ||
        v.contact?.toLowerCase().includes(term) ||
        v.category?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Vendor Master",
          name: v.name,
          detail: v.email || v.contact || "",
          meta: v.category || "",
        });
    });

    // Company Master
    (companyMaster || []).forEach((c) => {
      const match =
        c.name?.toLowerCase().includes(term) ||
        c.gstin?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.contact?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Company Master",
          name: c.name,
          detail: c.email || c.contact || "",
          meta: c.category || "",
        });
    });

    // Item Master
    (itemMasterFG || []).forEach((item) => {
      const match =
        item.name?.toLowerCase().includes(term) ||
        item.code?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.clientCategory?.toLowerCase().includes(term) ||
        item.productCode?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Item Master",
          name: item.name || item.code,
          detail: item.code || "",
          meta: item.category || "",
        });
    });

    // Machine Master
    (machineMaster || []).forEach((m) => {
      const match =
        m.name?.toLowerCase().includes(term) ||
        m.type?.toLowerCase().includes(term) ||
        m.code?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Machine Master",
          name: m.name,
          detail: m.type || "",
          meta: m.code || "",
        });
    });

    // Price List
    (priceList || []).forEach((p) => {
      const match =
        p.itemName?.toLowerCase().includes(term) ||
        p.itemCode?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.clientName?.toLowerCase().includes(term) ||
        p.companyName?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Price List",
          name: p.itemName || p.itemCode || p.code,
          detail: p.clientName || p.companyName || "",
          meta: p.rate ? `₹${p.rate}` : "",
        });
    });

    // Printing Master
    (printingMaster || []).forEach((p) => {
      const match =
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.type?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);
      if (match)
        results.push({
          type: "Printing Master",
          name: p.name || p.code,
          detail: p.type || p.description || "",
          meta: "",
        });
    });

    // Category Master
    const catArr = Array.isArray(categoryMaster)
      ? categoryMaster
      : Object.values(categoryMaster || {});
    catArr.forEach((doc) => {
      const cats = doc.categories || Object.keys(doc.subTypes || {});
      cats.forEach((catName) => {
        if (catName.toLowerCase().includes(term) || doc.type?.toLowerCase().includes(term)) {
          results.push({
            type: "Category",
            name: catName,
            detail: doc.type || "",
            meta: "",
          });
        }
      });
    });

    return results;
  }, [
    searchTerm,
    salesOrders, jobOrders, purchaseOrders, inward, dispatches,
    fgStock, rawStock, consumableStock, vendorMaster, companyMaster,
    itemMasterFG, machineMaster, priceList, printingMaster, categoryMaster,
  ]);

  const moduleTypes = useMemo(() => {
    const types = [...new Set(allResults.map((r) => r.type))];
    return ["All", ...types];
  }, [allResults]);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return allResults;
    return allResults.filter((r) => r.type === activeFilter);
  }, [allResults, activeFilter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!map[r.type]) map[r.type] = [];
      map[r.type].push(r);
    });
    return map;
  }, [filtered]);

  const handleNavigate = (type, recordId) => {
    const tab = TYPE_TO_TAB[type];
    if (tab && onNavigate) onNavigate(tab, recordId || null);
  };

  return (
    <div className="fade">
      <SectionTitle
        icon="🔍"
        title="Global Search"
        sub="Search across all modules — orders, stock, vendors, masters, and more"
      />

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by order no., customer, vendor, item, code..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setActiveFilter("All");
          }}
          autoFocus
          style={{
            width: "100%",
            maxWidth: 620,
            fontSize: 15,
            padding: "12px 16px",
          }}
        />
      </div>

      {/* Filter chips */}
      {allResults.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {moduleTypes.map((type) => {
            const count = type === "All" ? allResults.length : allResults.filter((r) => r.type === type).length;
            const isActive = activeFilter === type;
            const color = MODULE_COLORS[type] || C.accent;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: `1px solid ${isActive ? color : C.border}`,
                  background: isActive ? color + "22" : "transparent",
                  color: isActive ? color : C.muted,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(grouped).map(([type, items]) => {
            const color = MODULE_COLORS[type] || C.accent;
            const tab = TYPE_TO_TAB[type];
            return (
              <Card key={type}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{TYPE_ICONS[type] || "📄"} {type} — {items.length} result{items.length !== 1 ? "s" : ""}</span>
                  {tab && onNavigate && (
                    <button
                      onClick={() => handleNavigate(type)}
                      style={{
                        fontSize: 10,
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: `1px solid ${color}55`,
                        background: color + "15",
                        color,
                        cursor: "pointer",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      Open Module →
                    </button>
                  )}
                </div>
                {items.map((result, i) => (
                  <div
                    key={i}
                    onClick={() => handleNavigate(result.type, result.name)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.surface)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 6,
                      cursor: tab ? "pointer" : "default",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom:
                        i < items.length - 1 ? `1px solid ${C.border}22` : "none",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                        {result.name}
                      </div>
                      {result.detail && (
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                          {result.detail}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12, flexShrink: 0 }}>
                      {result.meta && (
                        <span
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            background: C.surface,
                            padding: "3px 8px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {result.meta}
                        </span>
                      )}
                      {tab && onNavigate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(result.type, result.name);
                          }}
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: `1px solid ${color}44`,
                            background: color + "18",
                            color,
                            cursor: "pointer",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          View →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      ) : searchTerm.trim() ? (
        <Card style={{ padding: 40, textAlign: "center", color: C.muted }}>
          No results found for "{searchTerm}"
        </Card>
      ) : (
        <Card style={{ padding: 40, textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>Start typing to search across all modules</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Orders · Stock · Vendors · Masters · Categories · and more
          </div>
        </Card>
      )}
    </div>
  );
}
