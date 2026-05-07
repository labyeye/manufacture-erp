import React, { useState, useEffect, useCallback, useRef } from "react";
import { activityLogAPI } from "../api/auth";

const ACTION_META = {
  LOGIN:          { label: "Login",          color: "#4caf50", bg: "#4caf5018", icon: "🔑" },
  LOGOUT:         { label: "Logout",         color: "#9e9e9e", bg: "#9e9e9e18", icon: "🚪" },
  CREATED:        { label: "Created",        color: "#2196f3", bg: "#2196f318", icon: "✚" },
  UPDATED:        { label: "Updated",        color: "#ff9800", bg: "#ff980018", icon: "✎" },
  DELETED:        { label: "Deleted",        color: "#f44336", bg: "#f4433618", icon: "✕" },
  BULK_DELETED:   { label: "Bulk Deleted",   color: "#e91e63", bg: "#e91e6318", icon: "⊗" },
  BULK_IMPORTED:  { label: "Bulk Imported",  color: "#00bcd4", bg: "#00bcd418", icon: "⇪" },
  STATUS_CHANGED: { label: "Status Changed", color: "#9c27b0", bg: "#9c27b018", icon: "⇄" },
  STOCK_ADJUSTED: { label: "Stock Adjusted", color: "#ff5722", bg: "#ff572218", icon: "⚖" },
};

const ALL_ACTIONS = ["All", ...Object.keys(ACTION_META)];

const inputStyle = {
  background: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  color: "#e0e0e0",
  fontSize: 12,
  padding: "7px 10px",
  outline: "none",
  fontFamily: "inherit",
};

function Badge({ action }) {
  const meta = ACTION_META[action] || { label: action, color: "#888", bg: "#88881a", icon: "•" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33`,
      letterSpacing: "0.3px", whiteSpace: "nowrap",
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#141414", border: `1px solid ${color}33`,
      borderRadius: 8, padding: "12px 16px", minWidth: 100, flex: "1 1 100px",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatTs(date) {
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

function DetailsPanel({ details }) {
  if (!details || typeof details !== "object") return null;
  const entries = Object.entries(details);
  if (!entries.length) return null;

  return (
    <div style={{
      marginTop: 6, padding: "8px 10px", background: "#0a0a0a",
      border: "1px solid #222", borderRadius: 6, fontSize: 11,
    }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
          <span style={{ color: "#555", minWidth: 80, fontWeight: 600, textTransform: "uppercase", fontSize: 10 }}>{k}</span>
          <span style={{ color: "#aaa", wordBreak: "break-all" }}>
            {typeof v === "object" ? (
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#777" }}>
                {Object.entries(v)
                  .filter(([, val]) => val !== undefined && val !== null && val !== "")
                  .map(([fk, fv]) => `${fk}: ${fv}`)
                  .join(" · ")}
              </span>
            ) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function LogRow({ log, i, expanded, onToggle }) {
  const hasDetails = log.details && Object.keys(log.details).length > 0;
  const base = i % 2 === 0 ? "transparent" : "#0a0a0a";

  return (
    <>
      <tr
        style={{ borderBottom: expanded ? "none" : "1px solid #161616", background: base, cursor: hasDetails ? "pointer" : "default" }}
        onClick={hasDetails ? onToggle : undefined}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a1a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = expanded ? "#111" : base)}
      >
        <td style={{ padding: "9px 12px", color: "#666", whiteSpace: "nowrap" }}>
          <div style={{ color: "#777" }}>{formatTs(log.timestamp)}</div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{timeAgo(log.timestamp)}</div>
        </td>
        <td style={{ padding: "9px 12px" }}>
          <Badge action={log.action} />
        </td>
        <td style={{ padding: "9px 12px" }}>
          <span style={{ color: "#ccc", fontWeight: 600 }}>{log.module}</span>
        </td>
        <td style={{ padding: "9px 12px" }}>
          {log.entityName
            ? <span style={{ color: "#e0e0e0" }}>{log.entityName}</span>
            : <span style={{ color: "#444" }}>—</span>}
          {log.entityId && (
            <div style={{ fontSize: 10, color: "#444", marginTop: 1, fontFamily: "monospace" }}>
              {log.entityId}
            </div>
          )}
        </td>
        <td style={{ padding: "9px 12px" }}>
          <span style={{ color: "#e0e0e0", fontWeight: 600 }}>
            {log.performedByName || log.performedBy?.name || <span style={{ color: "#444" }}>System</span>}
          </span>
          {log.performedBy?.username && (
            <div style={{ fontSize: 10, color: "#555" }}>@{log.performedBy.username}</div>
          )}
        </td>
        <td style={{ padding: "9px 12px" }}>
          {log.performedByRole ? (
            <span style={{
              fontSize: 10, padding: "2px 6px", borderRadius: 3,
              background: "#ffffff0d", color: "#888", fontWeight: 600, border: "1px solid #2a2a2a",
            }}>
              {log.performedByRole}
            </span>
          ) : <span style={{ color: "#444" }}>—</span>}
        </td>
        <td style={{ padding: "9px 12px", color: "#444", fontFamily: "monospace", fontSize: 11 }}>
          {log.ipAddress || "—"}
        </td>
        <td style={{ padding: "9px 12px", textAlign: "center" }}>
          {hasDetails ? (
            <span style={{ color: "#555", fontSize: 13 }}>{expanded ? "▲" : "▼"}</span>
          ) : null}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr style={{ background: "#111", borderBottom: "1px solid #161616" }}>
          <td colSpan={8} style={{ padding: "0 12px 12px 36px" }}>
            <DetailsPanel details={log.details} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function ERPConsole({ toast, session }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState([]);
  const [modules, setModules] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const LIMIT = 50;

  const [filters, setFilters] = useState({
    module: "All",
    action: "All",
    user: "All",
    search: "",
    from: "",
    to: "",
  });

  const timerRef = useRef(null);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = {
        page: p,
        limit: LIMIT,
        ...(filters.module !== "All" && { module: filters.module }),
        ...(filters.action !== "All" && { action: filters.action }),
        ...(filters.user !== "All" && { search: filters.user }),
        ...(filters.search && { search: filters.search }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      };
      const res = await activityLogAPI.getLogs(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setStats(res.stats || []);
    } catch {
      toast?.("Failed to load activity logs", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await activityLogAPI.getFilters();
      setModules(["All", ...(res.modules || [])]);
      setUserList(["All", ...(res.users || [])]);
    } catch {}
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { setPage(1); fetchLogs(1); setExpandedRow(null); }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchLogs(1), 10000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, fetchLogs]);

  const handleClear = async () => {
    if (!window.confirm("Clear all activity logs older than 90 days?")) return;
    try {
      const res = await activityLogAPI.clearOldLogs(90);
      toast?.(res.message, "success");
      fetchLogs(1);
    } catch {
      toast?.("Failed to clear logs", "error");
    }
  };

  const statMap = {};
  stats.forEach((s) => { statMap[s._id] = s.count; });
  const totalCreated  = statMap["CREATED"] || 0;
  const totalUpdated  = statMap["UPDATED"] || 0;
  const totalDeleted  = (statMap["DELETED"] || 0) + (statMap["BULK_DELETED"] || 0);
  const totalLogins   = statMap["LOGIN"] || 0;
  const totalStatus   = statMap["STATUS_CHANGED"] || 0;
  const totalStock    = statMap["STOCK_ADJUSTED"] || 0;
  const totalImported = statMap["BULK_IMPORTED"] || 0;

  const totalPages = Math.ceil(total / LIMIT);

  const hasFilters = filters.search || filters.module !== "All" || filters.action !== "All"
    || filters.user !== "All" || filters.from || filters.to;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "#0d0d0d", overflow: "hidden", fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid #1e1e1e",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexShrink: 0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🖥️</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>ERP Console</span>
            <span style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 4,
              background: "#ff780018", color: "#ff7800", fontWeight: 700,
              border: "1px solid #ff780033", letterSpacing: "0.5px",
            }}>ADMIN ONLY</span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
            Full activity monitoring — every create, edit, delete &amp; status change across the ERP
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            style={{
              background: autoRefresh ? "#4caf5022" : "#1a1a1a",
              border: `1px solid ${autoRefresh ? "#4caf50" : "#333"}`,
              borderRadius: 6, color: autoRefresh ? "#4caf50" : "#888",
              fontSize: 11, padding: "6px 12px", cursor: "pointer", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: autoRefresh ? "#4caf50" : "#555", display: "inline-block",
              ...(autoRefresh && { boxShadow: "0 0 6px #4caf50" }),
            }} />
            {autoRefresh ? "Live (10s)" : "Auto Refresh"}
          </button>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            style={{
              background: "#1a1a1a", border: "1px solid #333", borderRadius: 6,
              color: "#ccc", fontSize: 11, padding: "6px 12px",
              cursor: loading ? "not-allowed" : "pointer", fontWeight: 600,
            }}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <button
            onClick={handleClear}
            style={{
              background: "#1a1a1a", border: "1px solid #f4433633", borderRadius: 6,
              color: "#f44336", fontSize: 11, padding: "6px 12px", cursor: "pointer", fontWeight: 600,
            }}
          >
            Clear Old Logs
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: 10, padding: "12px 24px", flexShrink: 0,
        flexWrap: "wrap", borderBottom: "1px solid #1a1a1a",
      }}>
        <StatCard label="Total Events"     value={total}         color="#ff7800" />
        <StatCard label="Logins"           value={totalLogins}   color="#4caf50" />
        <StatCard label="Created"          value={totalCreated}  color="#2196f3" />
        <StatCard label="Updated"          value={totalUpdated}  color="#ff9800" />
        <StatCard label="Deleted"          value={totalDeleted}  color="#f44336" />
        <StatCard label="Status Changes"   value={totalStatus}   color="#9c27b0" />
        <StatCard label="Stock Adjustments" value={totalStock}   color="#ff5722" />
        <StatCard label="Bulk Imports"     value={totalImported} color="#00bcd4" />
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 24px", flexShrink: 0,
        flexWrap: "wrap", borderBottom: "1px solid #1a1a1a", alignItems: "center",
      }}>
        <input
          style={{ ...inputStyle, width: 200 }}
          placeholder="Search name, user, module…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, user: "All" }))}
        />
        <select
          style={inputStyle}
          value={filters.module}
          onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
        >
          {modules.map((m) => <option key={m} value={m}>{m === "All" ? "All Modules" : m}</option>)}
        </select>
        <select
          style={inputStyle}
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
        >
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a === "All" ? "All Actions" : (ACTION_META[a]?.label || a)}
            </option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, maxWidth: 160 }}
          value={filters.user}
          onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value, search: "" }))}
        >
          {userList.map((u) => <option key={u} value={u}>{u === "All" ? "All Users" : u}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#555" }}>From</span>
          <input type="date" style={inputStyle} value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#555" }}>To</span>
          <input type="date" style={inputStyle} value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </div>
        {hasFilters && (
          <button
            onClick={() => setFilters({ module: "All", action: "All", user: "All", search: "", from: "", to: "" })}
            style={{
              background: "transparent", border: "1px solid #444", borderRadius: 6,
              color: "#888", fontSize: 11, padding: "6px 10px", cursor: "pointer",
            }}
          >
            ✕ Clear
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#555" }}>
          {total} event{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Log table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#444" }}>Loading logs…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#444" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No activity logs found. Actions will appear here as users interact with the ERP.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#111", borderBottom: "1px solid #1e1e1e", position: "sticky", top: 0, zIndex: 2 }}>
                {["Timestamp", "Action", "Module", "Entity", "User", "Role", "IP", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 700,
                    fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <LogRow
                  key={log._id}
                  log={log}
                  i={i}
                  expanded={expandedRow === log._id}
                  onToggle={() => setExpandedRow(expandedRow === log._id ? null : log._id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", gap: 6, padding: "10px 24px", borderTop: "1px solid #1a1a1a",
          alignItems: "center", flexShrink: 0,
        }}>
          <button onClick={() => { setPage(1); fetchLogs(1); }} disabled={page === 1}
            style={{ ...paginationBtn, opacity: page === 1 ? 0.3 : 1 }}>«</button>
          <button onClick={() => { setPage((p) => p - 1); fetchLogs(page - 1); }} disabled={page === 1}
            style={{ ...paginationBtn, opacity: page === 1 ? 0.3 : 1 }}>‹</button>
          <span style={{ fontSize: 11, color: "#666", padding: "0 8px" }}>
            Page {page} of {totalPages} &nbsp;·&nbsp; {total} events
          </span>
          <button onClick={() => { setPage((p) => p + 1); fetchLogs(page + 1); }} disabled={page === totalPages}
            style={{ ...paginationBtn, opacity: page === totalPages ? 0.3 : 1 }}>›</button>
          <button onClick={() => { setPage(totalPages); fetchLogs(totalPages); }} disabled={page === totalPages}
            style={{ ...paginationBtn, opacity: page === totalPages ? 0.3 : 1 }}>»</button>
        </div>
      )}
    </div>
  );
}

const paginationBtn = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5,
  color: "#888", fontSize: 13, padding: "4px 10px", cursor: "pointer",
};
