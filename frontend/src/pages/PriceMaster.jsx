import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  SectionTitle,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Table,
} from "../components/ui/BasicComponents";
import { C } from "../constants/colors";
import {
  priceListAPI,
  companyMasterAPI,
  vendorMasterAPI,
  itemMasterAPI,
} from "../api/auth";
import moment from "moment";
import * as XLSX from "xlsx";

const ACCENT = "#ff7800";

// ─── Sub-tab bar ──────────────────────────────────────────────────────────────
const SUBTABS = [
  { id: "selling",  icon: "💰", label: "Selling Prices" },
  { id: "purchase", icon: "🛒", label: "Purchase Prices" },
];

function SubTabBar({ active, onChange }) {
  return (
    <div style={{ display: "flex", marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
      {SUBTABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "10px 22px",
            border: "none",
            borderBottom: active === t.id ? `2px solid ${ACCENT}` : "2px solid transparent",
            background: "transparent",
            color: active === t.id ? ACCENT : C.muted,
            fontWeight: active === t.id ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.15s",
          }}
        >
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
const SELLING_COLS = [
  { header: "Item Code",      key: (r) => r.itemCode || "" },
  { header: "Item Name",      key: (r) => r.itemName || "" },
  { header: "Company",        key: (r) => r.companyName || "" },
  { header: "Unit Price",     key: (r) => r.unitPrice ?? "" },
  { header: "UOM",            key: (r) => r.uom || "Pcs" },
  { header: "Currency",       key: (r) => r.currency || "INR" },
  { header: "Effective From", key: (r) => r.effectiveFrom ? moment(r.effectiveFrom).format("YYYY-MM-DD") : "" },
  { header: "Status",         key: (r) => r.status || "Active" },
  { header: "Remarks",        key: (r) => r.remarks || "" },
];

const PURCHASE_COLS = [
  { header: "Item Code",      key: (r) => r.itemCode || "" },
  { header: "Item Name",      key: (r) => r.itemName || "" },
  { header: "Vendor",         key: (r) => r.vendorName || "" },
  { header: "Unit Price",     key: (r) => r.unitPrice ?? "" },
  { header: "UOM",            key: (r) => r.uom || "Pcs" },
  { header: "Currency",       key: (r) => r.currency || "INR" },
  { header: "MOQ",            key: (r) => r.moq ?? 1 },
  { header: "Lead Time (days)", key: (r) => r.leadTimeDays ?? 0 },
  { header: "Effective From", key: (r) => r.effectiveFrom ? moment(r.effectiveFrom).format("YYYY-MM-DD") : "" },
  { header: "Status",         key: (r) => r.status || "Active" },
  { header: "Remarks",        key: (r) => r.remarks || "" },
];

// ─── Selling Price Section ────────────────────────────────────────────────────
function SellingSection({ toast }) {
  const [records, setRecords]   = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch]     = useState("");
  const importRef = useRef(null);

  const emptyForm = {
    itemCode: "", itemName: "", companyId: "", companyName: "",
    unitPrice: "", uom: "Pcs", currency: "INR",
    effectiveFrom: moment().format("YYYY-MM-DD"),
    status: "Active", remarks: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [priceData, compData] = await Promise.all([
        priceListAPI.getAll({ listType: "selling" }),
        companyMasterAPI.getAll(),
      ]);
      setRecords(Array.isArray(priceData) ? priceData : []);
      const comps = compData?.companies || compData || [];
      setCompanies(Array.isArray(comps) ? comps : []);
    } catch {
      toast?.("Failed to fetch selling prices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-fill company name when company selected
  const handleCompanyChange = (id) => {
    const co = companies.find((c) => c._id === id);
    setFormData((f) => ({ ...f, companyId: id, companyName: co?.name || co?.companyName || "" }));
  };

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      itemCode: r.itemCode, itemName: r.itemName || "",
      companyId: r.companyId || "", companyName: r.companyName || "",
      unitPrice: r.unitPrice, uom: r.uom || "Pcs", currency: r.currency || "INR",
      effectiveFrom: r.effectiveFrom ? moment(r.effectiveFrom).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      status: r.status || "Active", remarks: r.remarks || "",
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

  // ── Template ──
  const handleTemplate = () => {
    const headers = SELLING_COLS.map((c) => c.header);
    const example = { itemCode: "FG-001", itemName: "Product A", companyName: "ABC Ltd", unitPrice: 100, uom: "Pcs", currency: "INR", effectiveFrom: "2024-01-01", status: "Active", remarks: "" };
    const ws = XLSX.utils.aoa_to_sheet([headers, SELLING_COLS.map((c) => c.key(example))]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selling Price Template");
    XLSX.writeFile(wb, "selling_price_template.xlsx");
    toast?.("Template downloaded", "success");
  };

  // ── Export ──
  const handleExport = () => {
    if (!records.length) { toast?.("No data to export", "error"); return; }
    const headers = SELLING_COLS.map((c) => c.header);
    const rows = records.map((r) => SELLING_COLS.map((c) => c.key(r)));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selling Prices");
    XLSX.writeFile(wb, "selling_prices_export.xlsx");
    toast?.("Exported", "success");
  };

  // ── Import ──
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImporting(true);
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      if (rawData.length < 2) { toast?.("No data rows found", "error"); return; }
      const [, ...rows] = rawData;
      const toImport = [];
      for (const row of rows) {
        if (!row[0]) continue;
        const [itemCode, itemName, companyName, unitPrice, uom, currency, effectiveFrom, status, remarks] = row;
        toImport.push({
          listType: "selling",
          itemCode: String(itemCode).trim(),
          itemName: itemName ? String(itemName).trim() : "",
          companyName: companyName ? String(companyName).trim() : "",
          unitPrice: Number(unitPrice) || 0,
          uom: uom || "Pcs",
          currency: currency || "INR",
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
          status: status || "Active",
          remarks: remarks ? String(remarks).trim() : "",
        });
      }
      if (!toImport.length) { toast?.("No valid rows found", "error"); return; }
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

  const filtered = records.filter((r) =>
    !search ||
    r.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    r.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <Input
          placeholder="Search SKU, item name, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button text="⬇ Template" color="#555" onClick={handleTemplate} />
          <Button text={importing ? "Importing…" : "⬆ Import"} color="#555" onClick={() => importRef.current?.click()} loading={importing} />
          <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImport} />
          <Button text="⬇ Export" color="#555" onClick={handleExport} />
          <Button text="+ Add Price" color={C.green} onClick={() => { resetForm(); setShowModal(true); }} />
        </div>
      </div>

      <Card>
        <Table
          loading={loading}
          headers={["ITEM CODE", "ITEM NAME", "COMPANY", "UNIT PRICE", "UOM", "EFFECTIVE FROM", "STATUS", "ACTIONS"]}
          data={filtered.map((r) => [
            <span style={{ fontWeight: 700 }}>{r.itemCode}</span>,
            r.itemName || "-",
            r.companyName || "-",
            <span style={{ fontWeight: 700, color: C.green }}>₹ {Number(r.unitPrice).toLocaleString()}</span>,
            r.uom,
            moment(r.effectiveFrom).format("DD/MM/YYYY"),
            <Badge text={r.status} color={r.status === "Active" ? C.green : C.muted} />,
            <div style={{ display: "flex", gap: 8 }}>
              <Button small text="Edit" onClick={() => handleEdit(r)} />
              <Button small text="Delete" color={C.red} onClick={() => handleDelete(r._id)} />
            </div>,
          ])}
        />
      </Card>

      {showModal && (
        <Modal title={editingId ? "Edit Selling Price" : "Add Selling Price"} onClose={() => { setShowModal(false); resetForm(); }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Input label="Item Code (SKU)" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} required />
              <Input label="Item Name" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} />
              <Select
                label="Company"
                value={formData.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                options={[{ label: "— Select Company —", value: "" }, ...companies.map((c) => ({ label: c.name || c.companyName, value: c._id }))]}
              />
              <Input label="Unit Price (₹)" type="number" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} required />
              <Select label="UOM" value={formData.uom} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} options={["Pcs", "Kg", "MT", "Roll", "Box", "Litre", "Mtr"]} />
              <Select label="Currency" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} options={["INR", "USD", "EUR"]} />
              <Input label="Effective From" type="date" value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} required />
              <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={["Active", "Expired"]} />
            </div>
            <div style={{ marginTop: 8 }}>
              <Input label="Remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button text="Cancel" color="#666" onClick={() => { setShowModal(false); resetForm(); }} />
              <Button type="submit" text={editingId ? "Update" : "Save"} color={C.green} loading={loading} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Purchase Price Section ───────────────────────────────────────────────────
function PurchaseSection({ toast }) {
  const [records, setRecords]   = useState([]);
  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch]     = useState("");
  const importRef = useRef(null);

  const emptyForm = {
    itemCode: "", itemName: "", vendorId: "", vendorName: "",
    unitPrice: "", uom: "Kg", currency: "INR", moq: 1, leadTimeDays: 0,
    effectiveFrom: moment().format("YYYY-MM-DD"),
    status: "Active", remarks: "",
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

  useEffect(() => { fetchData(); }, []);

  const handleVendorChange = (id) => {
    const v = vendors.find((v) => v._id === id);
    setFormData((f) => ({ ...f, vendorId: id, vendorName: v?.name || v?.vendorName || "" }));
  };

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      itemCode: r.itemCode, itemName: r.itemName || "",
      vendorId: r.vendorId || "", vendorName: r.vendorName || "",
      unitPrice: r.unitPrice, uom: r.uom || "Kg", currency: r.currency || "INR",
      moq: r.moq ?? 1, leadTimeDays: r.leadTimeDays ?? 0,
      effectiveFrom: r.effectiveFrom ? moment(r.effectiveFrom).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
      status: r.status || "Active", remarks: r.remarks || "",
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

  // ── Template ──
  const handleTemplate = () => {
    const headers = PURCHASE_COLS.map((c) => c.header);
    const example = { itemCode: "RM-001", itemName: "Raw Material A", vendorName: "XYZ Suppliers", unitPrice: 50, uom: "Kg", currency: "INR", moq: 100, leadTimeDays: 7, effectiveFrom: "2024-01-01", status: "Active", remarks: "" };
    const ws = XLSX.utils.aoa_to_sheet([headers, PURCHASE_COLS.map((c) => c.key(example))]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Price Template");
    XLSX.writeFile(wb, "purchase_price_template.xlsx");
    toast?.("Template downloaded", "success");
  };

  // ── Export ──
  const handleExport = () => {
    if (!records.length) { toast?.("No data to export", "error"); return; }
    const headers = PURCHASE_COLS.map((c) => c.header);
    const rows = records.map((r) => PURCHASE_COLS.map((c) => c.key(r)));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Prices");
    XLSX.writeFile(wb, "purchase_prices_export.xlsx");
    toast?.("Exported", "success");
  };

  // ── Import ──
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImporting(true);
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      if (rawData.length < 2) { toast?.("No data rows found", "error"); return; }
      const [, ...rows] = rawData;
      const toImport = [];
      for (const row of rows) {
        if (!row[0]) continue;
        const [itemCode, itemName, vendorName, unitPrice, uom, currency, moq, leadTimeDays, effectiveFrom, status, remarks] = row;
        toImport.push({
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
        });
      }
      if (!toImport.length) { toast?.("No valid rows found", "error"); return; }
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

  const filtered = records.filter((r) =>
    !search ||
    r.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    r.vendorName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <Input
          placeholder="Search SKU, item name, vendor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button text="⬇ Template" color="#555" onClick={handleTemplate} />
          <Button text={importing ? "Importing…" : "⬆ Import"} color="#555" onClick={() => importRef.current?.click()} loading={importing} />
          <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImport} />
          <Button text="⬇ Export" color="#555" onClick={handleExport} />
          <Button text="+ Add Price" color={C.blue} onClick={() => { resetForm(); setShowModal(true); }} />
        </div>
      </div>

      <Card>
        <Table
          loading={loading}
          headers={["ITEM CODE", "ITEM NAME", "VENDOR", "UNIT PRICE", "UOM", "MOQ", "LEAD TIME", "EFFECTIVE FROM", "STATUS", "ACTIONS"]}
          data={filtered.map((r) => [
            <span style={{ fontWeight: 700 }}>{r.itemCode}</span>,
            r.itemName || "-",
            r.vendorName || "-",
            <span style={{ fontWeight: 700, color: C.blue }}>₹ {Number(r.unitPrice).toLocaleString()}</span>,
            r.uom,
            r.moq ?? 1,
            r.leadTimeDays ? `${r.leadTimeDays} days` : "-",
            moment(r.effectiveFrom).format("DD/MM/YYYY"),
            <Badge text={r.status} color={r.status === "Active" ? C.green : C.muted} />,
            <div style={{ display: "flex", gap: 8 }}>
              <Button small text="Edit" onClick={() => handleEdit(r)} />
              <Button small text="Delete" color={C.red} onClick={() => handleDelete(r._id)} />
            </div>,
          ])}
        />
      </Card>

      {showModal && (
        <Modal title={editingId ? "Edit Purchase Price" : "Add Purchase Price"} onClose={() => { setShowModal(false); resetForm(); }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Input label="Item Code (SKU)" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} required />
              <Input label="Item Name" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} />
              <Select
                label="Vendor"
                value={formData.vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                options={[{ label: "— Select Vendor —", value: "" }, ...vendors.map((v) => ({ label: v.name || v.vendorName, value: v._id }))]}
              />
              <Input label="Unit Price (₹)" type="number" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} required />
              <Select label="UOM" value={formData.uom} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} options={["Kg", "MT", "Pcs", "Roll", "Litre", "Mtr", "Box"]} />
              <Select label="Currency" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} options={["INR", "USD", "EUR"]} />
              <Input label="MOQ" type="number" value={formData.moq} onChange={(e) => setFormData({ ...formData, moq: e.target.value })} />
              <Input label="Lead Time (days)" type="number" value={formData.leadTimeDays} onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })} />
              <Input label="Effective From" type="date" value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} required />
              <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={["Active", "Expired"]} />
            </div>
            <div style={{ marginTop: 8 }}>
              <Input label="Remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button text="Cancel" color="#666" onClick={() => { setShowModal(false); resetForm(); }} />
              <Button type="submit" text={editingId ? "Update" : "Save"} color={C.blue} loading={loading} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PriceMaster({ toast }) {
  const [activeTab, setActiveTab] = useState("selling");

  return (
    <div className="fade">
      <SectionTitle icon="💲" title="Price List Master" sub="Selling prices by company · Purchase prices by vendor" />
      <SubTabBar active={activeTab} onChange={setActiveTab} />
      {activeTab === "selling"  && <SellingSection  toast={toast} />}
      {activeTab === "purchase" && <PurchaseSection toast={toast} />}
    </div>
  );
}
