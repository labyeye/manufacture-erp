import React, { useState, useMemo } from "react";
import { C } from "../constants/colors";

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtN = (n) => (n ?? 0).toLocaleString("en-IN");
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

const LS_WA = "whatsapp_settings";
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(LS_WA) || "{}"); } catch { return {}; } };
const saveSettings = (v) => localStorage.setItem(LS_WA, JSON.stringify(v));

const inp = {
  padding: "9px 12px", border: "1px solid #2a2a2a", borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", background: "#141414",
  color: "#e0e0e0", outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl = { fontSize: 11, fontWeight: 600, color: "#666", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" };

const TABS = [
  { id: "email",    icon: "📧", label: "Executive Email" },
  { id: "whatsapp", icon: "💬", label: "WhatsApp" },
];

/* ═══════════════════════════════════════════════════════════ */
export default function NotificationHub({
  salesOrders = [],
  jobOrders = [],
  dispatches = [],
  purchaseOrders = [],
  consumableStock = [],
  allEntries = [],
  activeMachines = [],
  toast,
}) {
  const [tab, setTab] = useState("email");
  return (
    <div className="fade">
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #2a2a2a" }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 20px", border: "none",
              borderBottom: `2px solid ${active ? "#ff7800" : "transparent"}`,
              background: "transparent", color: active ? "#ff7800" : C.muted,
              fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      {tab === "email" && (
        <EmailTab
          salesOrders={salesOrders} jobOrders={jobOrders} dispatches={dispatches}
          purchaseOrders={purchaseOrders} consumableStock={consumableStock}
          allEntries={allEntries} activeMachines={activeMachines} toast={toast}
        />
      )}
      {tab === "whatsapp" && (
        <WhatsAppTab salesOrders={salesOrders} dispatches={dispatches} purchaseOrders={purchaseOrders} toast={toast} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXECUTIVE EMAIL
═══════════════════════════════════════════════════════════ */
function EmailTab({ salesOrders, jobOrders, dispatches, purchaseOrders, consumableStock, allEntries, activeMachines, toast }) {
  const [recipientEmail, setRecipientEmail] = useState(loadSettings().execEmail || "");
  const [ownerName, setOwnerName]           = useState(loadSettings().ownerName || "");
  const [copied, setCopied]                 = useState(false);

  const yest = yesterday();
  const todayStr = new Date().toISOString().slice(0, 10);

  const digest = useMemo(() => {
    // Yesterday's production
    const yesterdayEntries = (allEntries || []).filter((e) => {
      const d = e.date?.slice(0, 10) || e.enteredAt?.slice(0, 10);
      return d === yest;
    });
    const totalYestProduction = yesterdayEntries.reduce((s, e) => s + (e.qtyCompleted || e.good || 0), 0);
    const uniqueJOsRan = new Set(yesterdayEntries.map((e) => e.joNo)).size;
    const machinesRan  = new Set(yesterdayEntries.map((e) => e.machineId)).size;

    // Today's dispatch plan
    const todayDispatches = (dispatches || []).filter((d) => {
      const dd = d.dispatchDate || d.date || "";
      return dd.slice(0, 10) === todayStr;
    });
    const dispatchQty = todayDispatches.reduce((s, d) => s + (d.qty || d.quantity || 0), 0);

    // Open SOs due this week
    const oneWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const dueThisWeek = (salesOrders || []).filter((so) => {
      const dd = so.deliveryDate?.slice(0, 10);
      return dd && dd >= todayStr && dd <= oneWeek && !["Completed", "Cancelled"].includes(so.status);
    });

    // Overdue SOs
    const overdue = (salesOrders || []).filter((so) => {
      const dd = so.deliveryDate?.slice(0, 10);
      return dd && dd < todayStr && !["Completed", "Cancelled", "Dispatched"].includes(so.status);
    });

    // Active JOs in production
    const activeJOs = (jobOrders || []).filter((j) => j.status === "In Progress" || j.status === "Open" || j.status === "Pending");

    // Low stock
    const lowStock = (consumableStock || []).filter((c) => Number(c.qty || 0) <= Number(c.reorderLevel || 0));

    // Machine status
    const totalMachines = (activeMachines || []).length;
    const runningToday  = new Set((allEntries || []).filter((e) => e.date?.slice(0, 10) === yest).map((e) => e.machineId)).size;

    // Pending POs
    const pendingPOs = (purchaseOrders || []).filter((p) => !["Received", "Closed"].includes(p.status || "")).length;

    return { totalYestProduction, uniqueJOsRan, machinesRan, todayDispatches, dispatchQty, dueThisWeek, overdue, activeJOs, lowStock, totalMachines, runningToday, pendingPOs };
  }, [salesOrders, jobOrders, dispatches, purchaseOrders, consumableStock, allEntries, activeMachines, yest, todayStr]);

  const emailText = useMemo(() => {
    const now = new Date();
    const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return `Subject: ManufactureIQ Daily Briefing — ${dateLabel}

Good morning${ownerName ? `, ${ownerName}` : ""},

Here is your factory summary for today.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  YESTERDAY'S PRODUCTION (${fmtDate(yest)})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Total Units Produced:   ${fmtN(digest.totalYestProduction)}
• Job Orders Active:      ${digest.uniqueJOsRan}
• Machines Running:       ${digest.machinesRan} of ${digest.totalMachines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚛  TODAY'S DISPATCH PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Dispatches Scheduled:   ${digest.todayDispatches.length}
• Total Qty to Ship:      ${fmtN(digest.dispatchQty)} units
${digest.todayDispatches.slice(0, 5).map((d) => `  → ${d.dispatchNo || ""} · ${d.clientName || d.client || "Client"} · ${fmtN(d.qty || d.quantity || 0)} units`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋  ORDER PIPELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Active Job Orders:      ${digest.activeJOs.length}
• Due This Week:          ${digest.dueThisWeek.length} SO${digest.dueThisWeek.length !== 1 ? "s" : ""}
${digest.dueThisWeek.slice(0, 5).map((so) => `  ⏰ ${so.soNo} — ${so.companyName} — Due ${fmtDate(so.deliveryDate)}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨  CRITICAL ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${digest.overdue.length > 0
  ? `• OVERDUE ORDERS: ${digest.overdue.length} SO${digest.overdue.length !== 1 ? "s" : ""} past delivery date\n${digest.overdue.slice(0, 3).map((so) => `  ❌ ${so.soNo} — ${so.companyName} — Was due ${fmtDate(so.deliveryDate)}`).join("\n")}`
  : "• No overdue orders ✅"}
${digest.lowStock.length > 0
  ? `• LOW STOCK: ${digest.lowStock.length} consumable${digest.lowStock.length !== 1 ? "s" : ""} at or below reorder level\n${digest.lowStock.slice(0, 3).map((c) => `  ⚠️  ${c.name || c.itemName} — ${c.qty} ${c.unit || "units"} remaining`).join("\n")}`
  : "• All consumables adequately stocked ✅"}
• Pending Purchase Orders: ${digest.pendingPOs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by ManufactureIQ · ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
To configure: go to Notification Hub in your ERP.
`;
  }, [digest, ownerName, yest]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast?.("Email text copied to clipboard", "success");
    });
  };

  const saveConfig = () => {
    const s = loadSettings();
    saveSettings({ ...s, execEmail: recipientEmail, ownerName });
    toast?.("Settings saved", "success");
  };

  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(`ManufactureIQ Daily Briefing — ${new Date().toLocaleDateString("en-GB")}`)}&body=${encodeURIComponent(emailText)}`;

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Executive Morning Email</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
        Daily factory digest — production, dispatch, alerts. Set up your email client to send at 8am.
      </div>

      {/* Config */}
      <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: "#facc15", marginBottom: 14, fontSize: 13 }}>Configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Owner / Recipient Name</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Ankit" style={inp} />
          </div>
          <div>
            <label style={lbl}>Recipient Email</label>
            <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="owner@company.com" style={inp} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveConfig} style={{ padding: "8px 18px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Save Config</button>
          {recipientEmail && (
            <a href={mailtoLink} style={{ padding: "8px 18px", background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 6, color: "#22c55e", fontWeight: 700, fontSize: 12, cursor: "pointer", textDecoration: "none" }}>
              📤 Open in Mail App
            </a>
          )}
          <button onClick={copyToClipboard} style={{ padding: "8px 18px", background: copied ? "#22c55e22" : "#ffffff11", border: `1px solid ${copied ? "#22c55e" : "#2a2a2a"}`, borderRadius: 6, color: copied ? "#22c55e" : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {copied ? "✓ Copied!" : "📋 Copy Text"}
          </button>
        </div>
        {!recipientEmail && (
          <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
            Enter recipient email to enable "Open in Mail App". Actual scheduled sending requires backend email service (e.g. SendGrid, Resend, or SMTP).
          </div>
        )}
      </div>

      {/* Email preview */}
      <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24 }}>
        <div style={{ fontWeight: 700, color: "#888", marginBottom: 14, fontSize: 12, textTransform: "uppercase" }}>Email Preview</div>
        <pre style={{ fontFamily: "monospace", fontSize: 12, color: "#d1d5db", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {emailText}
        </pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WHATSAPP
═══════════════════════════════════════════════════════════ */
function WhatsAppTab({ salesOrders, dispatches, purchaseOrders, toast }) {
  const [settings, setSettings] = useState(loadSettings);
  const [activeTemplate, setActiveTemplate] = useState("dispatch");
  const [selectedDispatch, setSelectedDispatch] = useState("");
  const [selectedPO, setSelectedPO] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [previewMsg, setPreviewMsg] = useState("");

  const saveWASettings = (updates) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    saveSettings(updated);
  };

  const recentDispatches = useMemo(() =>
    (dispatches || []).slice().reverse().slice(0, 20),
    [dispatches]
  );

  const openPOs = useMemo(() =>
    (purchaseOrders || []).filter((p) => !["Received", "Closed"].includes(p.status || "")).slice().reverse().slice(0, 20),
    [purchaseOrders]
  );

  const generateDispatchMsg = () => {
    const d = dispatches.find((x) => x.dispatchNo === selectedDispatch || x._id === selectedDispatch);
    if (!d) { toast?.("Select a dispatch record", "error"); return; }
    const client = d.clientName || d.client || "Valued Client";
    const dispNo = d.dispatchNo || "";
    const qty = (d.qty || d.quantity || 0).toLocaleString("en-IN");
    const date = new Date(d.dispatchDate || d.date || Date.now()).toLocaleDateString("en-GB");
    const items = (d.items || []).map((i) => `  • ${i.itemName || i.name}: ${i.qty || i.quantity} pcs`).join("\n") || `  • ${qty} units`;
    const msg = `Dear ${client},

We are pleased to inform you that your order has been dispatched today (${date}).

📦 Dispatch Details:
  Dispatch No: ${dispNo}
${items}

Our delivery team will reach you within the expected timeframe. Please arrange for receipt accordingly.

For any queries, feel free to contact us.

Warm regards,
${settings.companyName || "Your Packaging Partner"}`;
    setPreviewMsg(msg);
  };

  const generatePOAckMsg = () => {
    const po = purchaseOrders.find((x) => x.poNo === selectedPO || x._id === selectedPO);
    if (!po) { toast?.("Select a purchase order", "error"); return; }
    const vendor = typeof po.vendor === "object" ? po.vendor.name : po.vendor || po.vendorName || "Vendor";
    const deliveryDate = po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString("en-GB") : "as discussed";
    const items = (po.items || []).map((i) => `  • ${i.name || i.itemName}: ${(i.qty || i.quantity || 0).toLocaleString("en-IN")} ${i.unit || "units"} @ ₹${i.unitPrice || i.rate || 0}/unit`).join("\n") || "  • As per PO";
    const msg = `Dear ${vendor},

This is to acknowledge PO No. ${po.poNo} raised on ${po.poDate ? new Date(po.poDate).toLocaleDateString("en-GB") : "today"}.

📋 Order Summary:
${items}

Requested Delivery Date: ${deliveryDate}

Please confirm receipt of this PO and advise if you have any concerns regarding quantities or delivery schedule.

Thanks & Regards,
${settings.companyName || "Purchase Team"}`;
    setPreviewMsg(msg);
  };

  const generateDailySummary = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const todayDisp = (dispatches || []).filter((d) => (d.dispatchDate || d.date || "").slice(0, 10) === todayStr);
    const dueThisWeek = (salesOrders || []).filter((so) => {
      const dd = so.deliveryDate?.slice(0, 10);
      const inWeek = dd && dd >= todayStr && dd <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      return inWeek && !["Completed", "Cancelled"].includes(so.status);
    });
    const msg = `Good morning! 🌅

📊 *Daily Factory Update*
Date: ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}

✅ Today's Dispatches: ${todayDisp.length}
⏰ Orders Due This Week: ${dueThisWeek.length}

${dueThisWeek.slice(0, 3).map((so) => `• ${so.soNo} — ${so.companyName} — ${new Date(so.deliveryDate).toLocaleDateString("en-GB")}`).join("\n")}

Have a productive day!
— ManufactureIQ`;
    setPreviewMsg(msg);
  };

  const waLink = (phone, msg) => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const indiaPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    return `https://wa.me/${indiaPhone}?text=${encodeURIComponent(msg)}`;
  };

  const TEMPLATES = [
    { id: "dispatch",     label: "Dispatch Notification", icon: "🚛", desc: "Notify client when goods are dispatched" },
    { id: "po_ack",       label: "PO Acknowledgment",     icon: "📋", desc: "Confirm PO to vendor with delivery expectations" },
    { id: "daily",        label: "Daily Owner Summary",   icon: "📊", desc: "Morning briefing to owner/manager" },
  ];

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>WhatsApp Integration</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
        Generate ready-to-send WhatsApp messages. Opens WhatsApp Web with pre-filled text — no API required.
      </div>

      {/* Settings */}
      <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: "#facc15", marginBottom: 14, fontSize: 13 }}>Company Settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Company Name</label>
            <input value={settings.companyName || ""} onChange={(e) => saveWASettings({ companyName: e.target.value })} placeholder="Your company name" style={inp} />
          </div>
          <div>
            <label style={lbl}>Owner WhatsApp</label>
            <input value={settings.ownerPhone || ""} onChange={(e) => saveWASettings({ ownerPhone: e.target.value })} placeholder="10-digit mobile number" style={inp} />
          </div>
        </div>
      </div>

      {/* Template selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20 }}>
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => { setActiveTemplate(t.id); setPreviewMsg(""); }}
            style={{ padding: 16, background: activeTemplate === t.id ? "#25d36622" : "#111", border: `1px solid ${activeTemplate === t.id ? "#25d36644" : "#2a2a2a"}`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{t.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: activeTemplate === t.id ? "#25d366" : "#e0e0e0", marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: "#666" }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Template inputs */}
      <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 16 }}>
        {activeTemplate === "dispatch" && (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={lbl}>Select Dispatch *</label>
                <select value={selectedDispatch} onChange={(e) => setSelectedDispatch(e.target.value)} style={inp}>
                  <option value="">-- Select Dispatch --</option>
                  {recentDispatches.map((d) => (
                    <option key={d._id} value={d.dispatchNo || d._id}>
                      {d.dispatchNo} — {d.clientName || d.client} — {(d.dispatchDate || d.date || "").slice(0, 10)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={lbl}>Client Phone</label>
                <input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} placeholder="10-digit" style={inp} />
              </div>
              <button onClick={generateDispatchMsg} style={{ padding: "9px 18px", background: "#25d36622", border: "1px solid #25d36644", color: "#25d366", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                Generate
              </button>
            </div>
          </div>
        )}

        {activeTemplate === "po_ack" && (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={lbl}>Select Purchase Order *</label>
                <select value={selectedPO} onChange={(e) => setSelectedPO(e.target.value)} style={inp}>
                  <option value="">-- Select PO --</option>
                  {openPOs.map((p) => {
                    const vName = typeof p.vendor === "object" ? p.vendor.name : p.vendor || p.vendorName;
                    return <option key={p._id} value={p.poNo || p._id}>{p.poNo} — {vName}</option>;
                  })}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={lbl}>Vendor Phone</label>
                <input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} placeholder="10-digit" style={inp} />
              </div>
              <button onClick={generatePOAckMsg} style={{ padding: "9px 18px", background: "#25d36622", border: "1px solid #25d36644", color: "#25d366", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                Generate
              </button>
            </div>
          </div>
        )}

        {activeTemplate === "daily" && (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={lbl}>Owner Phone</label>
                <input value={customPhone || settings.ownerPhone || ""} onChange={(e) => setCustomPhone(e.target.value)} placeholder="10-digit" style={inp} />
              </div>
              <button onClick={generateDailySummary} style={{ padding: "9px 18px", background: "#25d36622", border: "1px solid #25d36644", color: "#25d366", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Preview and send */}
        {previewMsg && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Message Preview</div>
            <div style={{ background: "#0a2d1a", border: "1px solid #25d36633", borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <pre style={{ fontFamily: "inherit", fontSize: 13, color: "#dcfce7", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {previewMsg}
              </pre>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {customPhone && (
                <a
                  href={waLink(customPhone, previewMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: "10px 20px", background: "#25d366", border: "none", borderRadius: 6, color: "#000", fontWeight: 800, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
                >
                  💬 Send via WhatsApp Web
                </a>
              )}
              <button
                onClick={() => { navigator.clipboard.writeText(previewMsg); toast?.("Message copied", "success"); }}
                style={{ padding: "10px 16px", background: "#ffffff11", border: "1px solid #2a2a2a", borderRadius: 6, color: "#888", fontWeight: 700, cursor: "pointer" }}
              >
                📋 Copy Text
              </button>
              {!customPhone && (
                <div style={{ fontSize: 11, color: "#f59e0b", display: "flex", alignItems: "center" }}>
                  ↑ Enter phone number above to enable WhatsApp link
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#555", padding: "10px 0" }}>
        WhatsApp Web links open wa.me on your browser — no API key required. For automated/scheduled sending, integrate WhatsApp Business API (Meta) with your backend.
      </div>
    </div>
  );
}
