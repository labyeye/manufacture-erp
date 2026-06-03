import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  SectionTitle,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Table,
  AutocompleteInput,
} from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import {
  priceListAPI,
  companyMasterAPI,
  vendorMasterAPI,
  itemMasterAPI,
  brandMasterAPI,
} from "../api/auth";
import moment from "moment";
import * as XLSX from "xlsx";

const ACCENT_SELL = "#4ade80";
const ACCENT_BUY = "#60a5fa";

const inputStyle = {
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 6,
  fontSize: 13,
  background: "rgba(255,255,255,0.07)",
  color: "#e0e0e0",
  outline: "none",
  boxSizing: "border-box",
};

const SELLING_COLS = [
  { header: "Item Code", key: (r) => r.itemCode || "" },
  { header: "Item Name", key: (r) => r.itemName || "" },
  { header: "Brand Name", key: (r) => r.brandName || "" },
  { header: "Company", key: (r) => r.companyName || "" },
  { header: "Unit Price", key: (r) => r.unitPrice ?? "" },
  { header: "UOM", key: (r) => r.uom || "Pcs" },
  { header: "Currency", key: (r) => r.currency || "INR" },
  {
    header: "Effective From",
    key: (r) =>
      r.effectiveFrom ? moment(r.effectiveFrom).format("YYYY-MM-DD") : "",
  },
  { header: "Status", key: (r) => r.status || "Active" },
  { header: "Remarks", key: (r) => r.remarks || "" },
];

const PURCHASE_COLS = [
  { header: "Item Code", key: (r) => r.itemCode || "" },
  { header: "Item Name", key: (r) => r.itemName || "" },
  { header: "Vendor", key: (r) => r.vendorName || "" },
  { header: "Unit Price", key: (r) => r.unitPrice ?? "" },
  { header: "UOM", key: (r) => r.uom || "Pcs" },
  { header: "Currency", key: (r) => r.currency || "INR" },
  { header: "MOQ", key: (r) => r.moq ?? 1 },
  { header: "Lead Time (days)", key: (r) => r.leadTimeDays ?? 0 },
  {
    header: "Effective From",
    key: (r) =>
      r.effectiveFrom ? moment(r.effectiveFrom).format("YYYY-MM-DD") : "",
  },
  { header: "Status", key: (r) => r.status || "Active" },
  { header: "Remarks", key: (r) => r.remarks || "" },
];

/* ─── Selling Section ─── */
function SellingSection({ toast, canExportImport = true }) {
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [fgItems, setFgItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [search, setSearch] = useState("");
  const importRef = useRef(null);

  const emptyForm = {
    itemCode: "",
    itemName: "",
    brandId: "",
    brandName: "",
    companyId: "",
    companyName: "",
    unitPrice: "",
    uom: "Pcs",
    currency: "INR",
    effectiveFrom: moment().format("YYYY-MM-DD"),
    status: "Active",
    remarks: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [priceData, compData, fgData, brandData] = await Promise.all([
        priceListAPI.getAll({ listType: "selling" }),
        companyMasterAPI.getAll(),
        itemMasterAPI.getAll({ type: "Finished Goods" }),
        brandMasterAPI.getAll(),
      ]);
      setRecords(Array.isArray(priceData) ? priceData : []);
      const comps = compData?.companies || compData || [];
      setCompanies(Array.isArray(comps) ? comps : []);
      const items = fgData?.items || fgData || [];
      setFgItems(
        Array.isArray(items)
          ? items.filter((i) => i.type === "Finished Goods")
          : [],
      );
      const brnds = brandData?.brands || brandData || [];
      setBrands(Array.isArray(brnds) ? brnds : []);
    } catch {
      toast?.("Failed to fetch selling prices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* unique client names from records */
  const clientNames = useMemo(() => {
    const names = [
      ...new Set(records.map((r) => r.companyName).filter(Boolean)),
    ].sort();
    return names;
  }, [records]);

  /* filtered records */
  const filtered = useMemo(() => {
    if (!selectedClient) return [];
    return records
      .filter((r) => {
        const matchClient = r.companyName === selectedClient;
        const matchSearch =
          !search ||
          r.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
          r.itemName?.toLowerCase().includes(search.toLowerCase());
        return matchClient && matchSearch;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [records, selectedClient, search]);

  const handleItemCodeChange = (code) => {
    const match = fgItems.find((i) => i.code === code);
    setFormData((f) => ({
      ...f,
      itemCode: code,
      itemName: match ? match.name : f.itemName,
    }));
  };

  const handleCompanyChange = (id) => {
    const co = companies.find((c) => c._id === id);
    setFormData((f) => ({
      ...f,
      companyId: id,
      companyName: co?.name || co?.companyName || "",
    }));
  };

  const handleBrandChange = (id) => {
    const br = brands.find((b) => b._id === id);
    setFormData((f) => ({ ...f, brandId: id, brandName: br?.name || "" }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemCode) {
      toast?.("Item is required", "error");
      return;
    }
    if (
      !formData.unitPrice ||
      isNaN(Number(formData.unitPrice)) ||
      Number(formData.unitPrice) <= 0
    ) {
      toast?.("Valid unit price is required", "error");
      return;
    }
    try {
      setLoading(true);
      const payload = { ...formData, listType: "selling" };
      if (editingId) {
        await priceListAPI.update(editingId, payload);
        toast?.("Price updated", "success");
      } else {
        await priceListAPI.create(payload);
        toast?.("Price saved", "success");
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch {
      toast?.("Failed to save price", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r) => {
    setFormData({
      itemCode: r.itemCode,
      itemName: r.itemName || "",
      brandId: r.brandId || "",
      brandName: r.brandName || "",
      companyId: r.companyId || "",
      companyName: r.companyName || "",
      unitPrice: r.unitPrice,
      uom: r.uom || "Pcs",
      currency: r.currency || "INR",
      effectiveFrom: r.effectiveFrom
        ? moment(r.effectiveFrom).format("YYYY-MM-DD")
        : moment().format("YYYY-MM-DD"),
      status: r.status || "Active",
      remarks: r.remarks || "",
    });
    setEditingId(r._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this price entry?")) return;
    try {
      await priceListAPI.delete(id);
      toast?.("Deleted", "success");
      fetchData();
    } catch {
      toast?.("Failed to delete", "error");
    }
  };

  const handleTemplate = () => {
    const headers = SELLING_COLS.map((c) => c.header);
    const ex = {
      itemCode: "FG0001",
      itemName: "Product A",
      brandName: "Brand X",
      companyName: "ABC Ltd",
      unitPrice: 100,
      uom: "Pcs",
      currency: "INR",
      effectiveFrom: "2024-01-01",
      status: "Active",
      remarks: "",
    };
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      SELLING_COLS.map((c) => c.key(ex)),
    ]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "selling_price_template.xlsx");
  };

  const handleExport = () => {
    const rows = filtered.length ? filtered : records;
    if (!rows.length) {
      toast?.("No data to export", "error");
      return;
    }
    const headers = SELLING_COLS.map((c) => c.header);
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows.map((r) => SELLING_COLS.map((c) => c.key(r))),
    ]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selling Prices");
    XLSX.writeFile(wb, "selling_prices_export.xlsx");
    toast?.("Exported", "success");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImporting(true);
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
      });
      if (rawData.length < 2) {
        toast?.("No data rows found", "error");
        return;
      }
      const [, ...rows] = rawData;
      // columns: Item Code, Item Name, Brand Name, Company, Unit Price, UOM, Currency, Effective From, Status, Remarks
      const toImport = rows
        .filter((r) => r[0])
        .map(
          ([
            itemCode,
            itemName,
            brandName,
            companyName,
            unitPrice,
            uom,
            currency,
            effectiveFrom,
            status,
            remarks,
          ]) => ({
            listType: "selling",
            itemCode: String(itemCode).trim(),
            itemName: itemName ? String(itemName).trim() : "",
            brandName: brandName ? String(brandName).trim() : "",
            companyName: companyName ? String(companyName).trim() : "",
            unitPrice: Number(unitPrice) || 0,
            uom: uom || "Pcs",
            currency: currency || "INR",
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
            status: status || "Active",
            remarks: remarks ? String(remarks).trim() : "",
          }),
        );
      if (!toImport.length) {
        toast?.("No valid rows found", "error");
        return;
      }
      const res = await priceListAPI.bulkImport(toImport);
      toast?.(`Imported ${res.inserted} price(s)`, "success");
      fetchData();
    } catch {
      toast?.("Failed to process file", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <>
      {/* selector row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#555",
              marginBottom: 5,
              letterSpacing: "0.5px",
            }}
          >
            SELECT CLIENT
          </div>
          <AutocompleteInput
            value={selectedClient}
            onChange={(v) => {
              setSelectedClient(v);
              setSearch("");
            }}
            suggestions={clientNames}
            placeholder="Type to search client..."
            showAllOnFocus={true}
            inputStyle={{ ...inputStyle, width: "100%" }}
          />
        </div>

        {selectedClient && (
          <div style={{ flex: 1, minWidth: 180, maxWidth: 260 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#555",
                marginBottom: 5,
                letterSpacing: "0.5px",
              }}
            >
              SEARCH ITEM
            </div>
            <input
              style={{ ...inputStyle, width: "100%" }}
              placeholder="Item code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button text="⬇ Template" color="#444" onClick={handleTemplate} />
          {canExportImport && (
            <Button
              text={importing ? "Importing…" : "⬆ Import"}
              color="#444"
              onClick={() => importRef.current?.click()}
            />
          )}
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          {canExportImport && (
            <Button text="⬇ Export" color="#444" onClick={handleExport} />
          )}
          <Button
            text="+ Add Price"
            color={ACCENT_SELL}
            onClick={() => {
              resetForm();
              if (selectedClient)
                setFormData((f) => ({ ...f, companyName: selectedClient }));
              setShowModal(true);
            }}
          />
        </div>
      </div>

      {/* summary pill */}
      {selectedClient && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              background: "#4ade8022",
              color: ACCENT_SELL,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid #4ade8044",
            }}
          >
            {selectedClient}
          </span>
          <span style={{ fontSize: 12, color: "#555" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setSelectedClient("")}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {!selectedClient && (
        <div
          style={{
            textAlign: "center",
            color: "#555",
            fontSize: 13,
            padding: "32px 0",
          }}
        >
          Select a client to view their price list
        </div>
      )}

      <Card>
        <Table
          loading={loading}
          headers={[
            "ITEM CODE",
            "ITEM NAME",
            "BRAND",
            "COMPANY",
            "UNIT PRICE",
            "UOM",
            "EFFECTIVE FROM",
            "STATUS",
            "ACTIONS",
          ]}
          data={filtered.map((r) => [
            <span style={{ fontWeight: 500, color: ACCENT_SELL }}>
              {r.itemCode}
            </span>,
            r.itemName || "-",
            r.brandName || "-",
            r.companyName || "-",
            <span style={{ fontWeight: 500, color: ACCENT_SELL }}>
              ₹ {Number(r.unitPrice).toLocaleString()}
            </span>,
            r.uom,
            moment(r.effectiveFrom).format("DD/MM/YYYY"),
            <Badge
              text={r.status}
              color={r.status === "Active" ? C.green : C.muted}
            />,
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => handleEdit(r)}
                style={{
                  background: "transparent",
                  color: "#8082ff",
                  border: "1px solid #8082ff98",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-pen-to-square" /> Edit
              </button>
              <button
                onClick={() => handleDelete(r._id)}
                style={{
                  background: "transparent",
                  color: "#8082ff",
                  border: "1px solid #8082ff98",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-trash" /> Delete
              </button>
            </div>,
          ])}
        />
      </Card>

      {showModal && (
        <Modal
          title={editingId ? "Edit Selling Price" : "Add Selling Price"}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {/* Item Code — dropdown from FG Item Master */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#888",
                    marginBottom: 6,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Item Code *
                </div>
                <select
                  required
                  value={formData.itemCode}
                  onChange={(e) => handleItemCodeChange(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="">— Select Item —</option>
                  {fgItems.map((i) => (
                    <option key={i._id} value={i.code}>
                      {i.code} — {i.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Item Name — auto-filled, read-only */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#888",
                    marginBottom: 6,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Item Name
                </div>
                <input
                  readOnly
                  value={formData.itemName}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    opacity: 0.7,
                    cursor: "not-allowed",
                  }}
                  placeholder="Auto-filled from Item Master"
                />
              </div>
              {/* Brand Name — dropdown from Brand Master */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#888",
                    marginBottom: 6,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Brand Name *
                </div>
                <select
                  required
                  value={formData.brandId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="">— Select Brand —</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <Select
                label="Company / Client"
                value={formData.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                options={[
                  { label: "— Select Company —", value: "" },
                  ...companies.map((c) => ({
                    label: c.name || c.companyName,
                    value: c._id,
                  })),
                ]}
              />
              <Input
                label="Unit Price (₹)"
                type="number"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                required
              />
              <Select
                label="UOM"
                value={formData.uom}
                onChange={(e) =>
                  setFormData({ ...formData, uom: e.target.value })
                }
                options={["Pcs", "Kg", "MT", "Roll", "Box", "Litre", "Mtr"]}
              />
              <Select
                label="Currency"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                options={["INR", "USD", "EUR"]}
              />
              <Input
                label="Effective From"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveFrom: e.target.value })
                }
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                options={["Active", "Expired"]}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <Input
                label="Remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
              />
            </div>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                text="Cancel"
                color="#666"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              />
              <Button
                type="submit"
                text={editingId ? "Update" : "Save"}
                color={ACCENT_SELL}
                loading={loading}
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ─── Purchase Section ─── */
function PurchaseSection({ toast, canExportImport = true }) {
  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [search, setSearch] = useState("");
  const importRef = useRef(null);

  const emptyForm = {
    itemCode: "",
    itemName: "",
    vendorId: "",
    vendorName: "",
    unitPrice: "",
    uom: "Kg",
    currency: "INR",
    moq: 1,
    leadTimeDays: 0,
    effectiveFrom: moment().format("YYYY-MM-DD"),
    status: "Active",
    remarks: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [priceData, vendorData] = await Promise.all([
        priceListAPI.getAll({ listType: "purchase" }),
        vendorMasterAPI.getAll(),
      ]);
      setRecords(Array.isArray(priceData) ? priceData : []);
      const vends = vendorData?.vendors || vendorData || [];
      setVendors(Array.isArray(vends) ? vends : []);
    } catch {
      toast?.("Failed to fetch purchase prices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* unique vendor names from price records */
  const vendorNames = useMemo(() => {
    return [
      ...new Set(records.map((r) => r.vendorName).filter(Boolean)),
    ].sort();
  }, [records]);

  /* filtered records — require a vendor to be selected */
  const filtered = useMemo(() => {
    if (!selectedVendor) return [];
    return records
      .filter((r) => {
        const matchVendor = r.vendorName === selectedVendor;
        const matchSearch =
          !search ||
          r.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
          r.itemName?.toLowerCase().includes(search.toLowerCase());
        return matchVendor && matchSearch;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [records, selectedVendor, search]);

  const handleVendorChange = (id) => {
    const v = vendors.find((v) => v._id === id);
    setFormData((f) => ({
      ...f,
      vendorId: id,
      vendorName: v?.name || v?.vendorName || "",
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemCode) {
      toast?.("Item is required", "error");
      return;
    }
    if (
      !formData.unitPrice ||
      isNaN(Number(formData.unitPrice)) ||
      Number(formData.unitPrice) <= 0
    ) {
      toast?.("Valid unit price is required", "error");
      return;
    }
    try {
      setLoading(true);
      const payload = { ...formData, listType: "purchase" };
      if (editingId) {
        await priceListAPI.update(editingId, payload);
        toast?.("Price updated", "success");
      } else {
        await priceListAPI.create(payload);
        toast?.("Price saved", "success");
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch {
      toast?.("Failed to save price", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r) => {
    setFormData({
      itemCode: r.itemCode,
      itemName: r.itemName || "",
      vendorId: r.vendorId || "",
      vendorName: r.vendorName || "",
      unitPrice: r.unitPrice,
      uom: r.uom || "Kg",
      currency: r.currency || "INR",
      moq: r.moq ?? 1,
      leadTimeDays: r.leadTimeDays ?? 0,
      effectiveFrom: r.effectiveFrom
        ? moment(r.effectiveFrom).format("YYYY-MM-DD")
        : moment().format("YYYY-MM-DD"),
      status: r.status || "Active",
      remarks: r.remarks || "",
    });
    setEditingId(r._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this price entry?")) return;
    try {
      await priceListAPI.delete(id);
      toast?.("Deleted", "success");
      fetchData();
    } catch {
      toast?.("Failed to delete", "error");
    }
  };

  const handleTemplate = () => {
    const headers = PURCHASE_COLS.map((c) => c.header);
    const ex = {
      itemCode: "RM-001",
      itemName: "Raw Material A",
      vendorName: "XYZ Suppliers",
      unitPrice: 50,
      uom: "Kg",
      currency: "INR",
      moq: 100,
      leadTimeDays: 7,
      effectiveFrom: "2024-01-01",
      status: "Active",
      remarks: "",
    };
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      PURCHASE_COLS.map((c) => c.key(ex)),
    ]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "purchase_price_template.xlsx");
  };

  const handleExport = () => {
    const rows = filtered.length ? filtered : records;
    if (!rows.length) {
      toast?.("No data to export", "error");
      return;
    }
    const headers = PURCHASE_COLS.map((c) => c.header);
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows.map((r) => PURCHASE_COLS.map((c) => c.key(r))),
    ]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Prices");
    XLSX.writeFile(wb, "purchase_prices_export.xlsx");
    toast?.("Exported", "success");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImporting(true);
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
      });
      if (rawData.length < 2) {
        toast?.("No data rows found", "error");
        return;
      }
      const [, ...rows] = rawData;
      const toImport = rows
        .filter((r) => r[0])
        .map(
          ([
            itemCode,
            itemName,
            vendorName,
            unitPrice,
            uom,
            currency,
            moq,
            leadTimeDays,
            effectiveFrom,
            status,
            remarks,
          ]) => ({
            listType: "purchase",
            itemCode: String(itemCode).trim(),
            itemName: itemName ? String(itemName).trim() : "",
            vendorName: vendorName ? String(vendorName).trim() : "",
            unitPrice: Number(unitPrice) || 0,
            uom: uom || "Kg",
            currency: currency || "INR",
            moq: Number(moq) || 1,
            leadTimeDays: Number(leadTimeDays) || 0,
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
            status: status || "Active",
            remarks: remarks ? String(remarks).trim() : "",
          }),
        );
      if (!toImport.length) {
        toast?.("No valid rows found", "error");
        return;
      }
      const res = await priceListAPI.bulkImport(toImport);
      toast?.(`Imported ${res.inserted} price(s)`, "success");
      fetchData();
    } catch {
      toast?.("Failed to process file", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <>
      {/* selector row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#555",
              marginBottom: 5,
              letterSpacing: "0.5px",
            }}
          >
            SELECT VENDOR
          </div>
          <AutocompleteInput
            value={selectedVendor}
            onChange={(v) => {
              setSelectedVendor(v);
              setSearch("");
            }}
            suggestions={vendorNames}
            placeholder="Type to search vendor..."
            showAllOnFocus={true}
            inputStyle={{ ...inputStyle, width: "100%" }}
          />
        </div>

        {selectedVendor && (
          <div style={{ flex: 1, minWidth: 180, maxWidth: 260 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#555",
                marginBottom: 5,
                letterSpacing: "0.5px",
              }}
            >
              SEARCH ITEM
            </div>
            <input
              style={{ ...inputStyle, width: "100%" }}
              placeholder="Item code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button text="⬇ Template" color="#444" onClick={handleTemplate} />
          {canExportImport && (
            <Button
              text={importing ? "Importing…" : "⬆ Import"}
              color="#444"
              onClick={() => importRef.current?.click()}
            />
          )}
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          {canExportImport && (
            <Button text="⬇ Export" color="#444" onClick={handleExport} />
          )}
          <Button
            text="+ Add Price"
            color={ACCENT_BUY}
            onClick={() => {
              resetForm();
              if (selectedVendor)
                setFormData((f) => ({ ...f, vendorName: selectedVendor }));
              setShowModal(true);
            }}
          />
        </div>
      </div>

      {/* summary pill */}
      {selectedVendor && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              background: "#60a5fa22",
              color: ACCENT_BUY,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid #60a5fa44",
            }}
          >
            {selectedVendor}
          </span>
          <span style={{ fontSize: 12, color: "#555" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setSelectedVendor("")}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      <Card>
        <Table
          loading={loading}
          headers={[
            "ITEM CODE",
            "ITEM NAME",
            "VENDOR",
            "UNIT PRICE",
            "UOM",
            "MOQ",
            "LEAD TIME",
            "EFFECTIVE FROM",
            "STATUS",
            "ACTIONS",
          ]}
          data={filtered.map((r) => [
            <span style={{ fontWeight: 500, color: ACCENT_BUY }}>
              {r.itemCode}
            </span>,
            r.itemName || "-",
            r.vendorName || "-",
            <span style={{ fontWeight: 500, color: ACCENT_BUY }}>
              ₹ {Number(r.unitPrice).toLocaleString()}
            </span>,
            r.uom,
            r.moq ?? 1,
            r.leadTimeDays ? `${r.leadTimeDays} days` : "-",
            moment(r.effectiveFrom).format("DD/MM/YYYY"),
            <Badge
              text={r.status}
              color={r.status === "Active" ? C.green : C.muted}
            />,
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => handleEdit(r)}
                style={{
                  background: "transparent",
                  color: "#8082ff",
                  border: "1px solid #8082ff98",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-pen-to-square" /> Edit
              </button>
              <button
                onClick={() => handleDelete(r._id)}
                style={{
                  background: "transparent",
                  color: "#8082ff",
                  border: "1px solid #8082ff98",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-trash" /> Delete
              </button>
            </div>,
          ])}
        />
      </Card>

      {showModal && (
        <Modal
          title={editingId ? "Edit Purchase Price" : "Add Purchase Price"}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Input
                label="Item Code (SKU)"
                value={formData.itemCode}
                onChange={(e) =>
                  setFormData({ ...formData, itemCode: e.target.value })
                }
                required
              />
              <Input
                label="Item Name"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
              />
              <Select
                label="Vendor"
                value={formData.vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                options={[
                  { label: "— Select Vendor —", value: "" },
                  ...vendors.map((v) => ({
                    label: v.name || v.vendorName,
                    value: v._id,
                  })),
                ]}
              />
              <Input
                label="Unit Price (₹)"
                type="number"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                required
              />
              <Select
                label="UOM"
                value={formData.uom}
                onChange={(e) =>
                  setFormData({ ...formData, uom: e.target.value })
                }
                options={["Kg", "MT", "Pcs", "Roll", "Litre", "Mtr", "Box"]}
              />
              <Select
                label="Currency"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                options={["INR", "USD", "EUR"]}
              />
              <Input
                label="MOQ"
                type="number"
                value={formData.moq}
                onChange={(e) =>
                  setFormData({ ...formData, moq: e.target.value })
                }
              />
              <Input
                label="Lead Time (days)"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData({ ...formData, leadTimeDays: e.target.value })
                }
              />
              <Input
                label="Effective From"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveFrom: e.target.value })
                }
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                options={["Active", "Expired"]}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <Input
                label="Remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
              />
            </div>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Button
                text="Cancel"
                color="#666"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              />
              <Button
                type="submit"
                text={editingId ? "Update" : "Save"}
                color={ACCENT_BUY}
                loading={loading}
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ─── Root ─── */
const SUBTABS = [
  { id: "selling", icon: "💰", label: "Selling Prices", accent: ACCENT_SELL },
  { id: "purchase", icon: "🛒", label: "Purchase Prices", accent: ACCENT_BUY },
];

export default function PriceMaster({ toast, canExportImport = true }) {
  const [activeTab, setActiveTab] = useState("selling");

  return (
    <div className="fade">
      <SectionTitle
        icon="💲"
        title="Price List Master"
        sub="Filter by client or vendor to view and manage their prices"
      />

      <div
        style={{
          display: "flex",
          marginBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 22px",
              border: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${t.accent}`
                  : "2px solid transparent",
              background: "transparent",
              color: activeTab === t.id ? t.accent : "#555",
              fontWeight: activeTab === t.id ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "selling" && (
        <SellingSection toast={toast} canExportImport={canExportImport} />
      )}
      {activeTab === "purchase" && (
        <PurchaseSection toast={toast} canExportImport={canExportImport} />
      )}
    </div>
  );
}
