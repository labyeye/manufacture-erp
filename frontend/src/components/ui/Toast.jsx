import { useEffect } from 'react';
import { COLORS } from '../../constants';

export function Toast({ msg, onClose, type = "success" }) {
  useEffect(() => {
    const t = setTimeout(onClose, type === "validation" ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [onClose, type]);

  const bg = type === "error" ? COLORS.red : type === "validation" ? COLORS.red : COLORS.green;
  const icon = type === "error" || type === "validation" ? "✕" : "✓";
  const msgs = Array.isArray(msg) ? msg : [msg];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: bg,
        color: "#fff",
        borderRadius: 8,
        padding: "12px 20px",
        fontWeight: 600,
        fontSize: 13,
        boxShadow: "0 4px 20px #0008",
        animation: "fadeIn .2s ease",
        maxWidth: 520,
        width: "90vw",
      }}
    >
      {type === "validation" ? (
        <>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: msgs.length > 1 ? 8 : 0
            }}
          >
            ⚠ Please fill in the required fields:
          </div>
          {msgs.length > 1 ? (
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
              {msgs.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 2 }}>{msgs[0]}</div>
          )}
        </>
      ) : (
        <span>
          {icon} {msgs[0]}
        </span>
      )}
    </div>
  );
}
