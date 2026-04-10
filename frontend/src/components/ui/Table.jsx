import { COLORS } from '../../constants';

export function Table({ cols, rows, emptyMsg = "No records yet." }) {
  if (!rows.length) {
    return (
      <div style={{ textAlign: "center", color: COLORS.muted, padding: "32px 0", fontSize: 13 }}>
        {emptyMsg}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            {cols.map(c => (
              <th
                key={c}
                style={{
                  padding: "8px 12px",
                  color: COLORS.muted,
                  fontWeight: 600,
                  textAlign: "left",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  whiteSpace: "nowrap"
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={{
                borderBottom: `1px solid ${COLORS.border}22`,
                transition: "background .15s"
              }}
              onMouseEnter={e => (e.currentTarget.style.background = COLORS.surface)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {r.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "9px 12px",
                    fontFamily:
                      typeof cell === "number" ? "'JetBrains Mono',monospace" : undefined
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
