import { useState, useEffect } from "react";
import { trashAPI } from "../api/auth";
import { COLORS as C } from "../constants";
import ConfirmModal from "../components/ConfirmModal";

const LABEL_ICONS = {
  "Purchase Order": "fa-solid fa-cart-shopping",
  "Material Inward": "fa-solid fa-truck-ramp-box",
  "Sales Order": "fa-solid fa-file-invoice-dollar",
  "Job Order": "fa-solid fa-gears",
};

const LABEL_COLORS = {
  "Purchase Order": "#6366f1",
  "Material Inward": "#22c55e",
  "Sales Order": "#f59e0b",
  "Job Order": "#3b82f6",
};

function daysLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function fmt(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Trash({ toast, session }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [confirmState, setConfirmState] = useState({
    open: false,
    id: null,
    mode: null,
  });
  const [emptyConfirm, setEmptyConfirm] = useState(false);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const data = await trashAPI.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Trash fetch error:", err);
      toast("Failed to load trash", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const labels = ["All", ...Array.from(new Set(items.map((i) => i.label)))];

  const filtered = (
    filter === "All" ? items : items.filter((i) => i.label === filter)
  )
    .slice()
    .sort(
      (a, b) =>
        new Date(b.deletedAt || b.createdAt || 0) -
        new Date(a.deletedAt || a.createdAt || 0),
    );

  const handleRestore = async (id) => {
    try {
      await trashAPI.restore(id);
      toast("Item restored successfully", "success");
      fetchTrash();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to restore", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await trashAPI.permanentDelete(id);
      toast("Permanently deleted", "success");
      fetchTrash();
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await trashAPI.emptyTrash();
      toast("Trash emptied", "success");
      setItems([]);
    } catch {
      toast("Failed to empty trash", "error");
    }
  };

  const canAdmin = session?.role === "Admin";

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="fa-solid fa-trash"
              style={{ color: "#ef4444", fontSize: 16 }}
            />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: C.text,
              }}
            >
              Trash
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              {items.length} item{items.length !== 1 ? "s" : ""} · auto-deleted
              after 7 days
            </p>
          </div>
        </div>
        {canAdmin && items.length > 0 && (
          <button
            onClick={() => setEmptyConfirm(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-trash-can" style={{ marginRight: 6 }} />
            Empty Trash
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {labels.map((l) => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all .18s",
              background:
                filter === l
                  ? LABEL_COLORS[l] || C.accent
                  : "rgba(255,255,255,0.05)",
              border: `1px solid ${filter === l ? "transparent" : "rgba(255,255,255,0.1)"}`,
              color: filter === l ? "#fff" : C.muted,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.muted, padding: 60 }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <i
            className="fa-solid fa-trash-can"
            style={{
              fontSize: 40,
              color: "rgba(255,255,255,0.1)",
              marginBottom: 16,
              display: "block",
            }}
          />
          <div style={{ color: C.muted, fontSize: 14 }}>Trash is empty</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((item) => {
            const days = daysLeft(item.expiresAt);
            const color = LABEL_COLORS[item.label] || C.accent;
            const urgent = days <= 1;
            return (
              <div
                key={item._id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${urgent ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: color + "18",
                    border: `1px solid ${color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className={LABEL_ICONS[item.label] || "fa-solid fa-file"}
                    style={{ color, fontSize: 13 }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: color + "20",
                        color,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: C.text }}
                    >
                      {item.displayId || item._id}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: C.muted,
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    <span>Deleted {fmt(item.deletedAt)}</span>
                    {item.deletedBy && item.deletedBy !== "system" && (
                      <span>by {item.deletedBy}</span>
                    )}
                  </div>
                </div>

                {/* Expiry badge */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 8,
                    flexShrink: 0,
                    background: urgent
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(255,255,255,0.05)",
                    color: urgent ? "#ef4444" : C.muted,
                    border: `1px solid ${urgent ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {days === 0 ? "Expires today" : `${days}d left`}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() =>
                      setConfirmState({
                        open: true,
                        id: item._id,
                        mode: "restore",
                      })
                    }
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
                    <i className="fa-solid fa-rotate-left" /> Restore
                  </button>
                  {canAdmin && (
                    <button
                      onClick={() =>
                        setConfirmState({
                          open: true,
                          id: item._id,
                          mode: "delete",
                        })
                      }
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Restore confirm */}
      <ConfirmModal
        isOpen={confirmState.open && confirmState.mode === "restore"}
        onClose={() => setConfirmState({ open: false })}
        onConfirm={() => handleRestore(confirmState.id)}
        title="Restore Item"
        message="This item will be moved back to its original location. Are you sure?"
        confirmText="Restore"
        cancelText="Cancel"
        type="success"
      />

      {/* Permanent delete confirm */}
      <ConfirmModal
        isOpen={confirmState.open && confirmState.mode === "delete"}
        onClose={() => setConfirmState({ open: false })}
        onConfirm={() => handleDelete(confirmState.id)}
        title="Permanently Delete"
        message="This action cannot be undone. The record will be gone forever."
        confirmText="Delete Forever"
        cancelText="Cancel"
        type="danger"
      />

      {/* Empty trash confirm */}
      <ConfirmModal
        isOpen={emptyConfirm}
        onClose={() => setEmptyConfirm(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash"
        message="All items in trash will be permanently deleted. This cannot be undone."
        confirmText="Empty Trash"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
