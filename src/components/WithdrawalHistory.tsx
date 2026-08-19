import { WithdrawalRecord } from "../services/analytics";

interface WithdrawalHistoryProps {
  withdrawals: WithdrawalRecord[];
}

function truncateHash(hash: string): string {
  if (!hash || hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function WithdrawalHistory({ withdrawals }: WithdrawalHistoryProps) {
  const totalWithdrawn = withdrawals.reduce(
    (acc, curr) => acc + (parseFloat(curr.amount) || 0),
    0
  );

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
          Withdrawal History
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Total Withdrawn: <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{totalWithdrawn.toFixed(2)} XLM</span>
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "13px",
          }}
        >
          No historical withdrawals recorded
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-tertiary)" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Amount</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Transaction</th>
                <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w, idx) => (
                <tr
                  key={w.txHash || idx}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                    {new Date(w.timestamp).toLocaleDateString()} {new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {w.amount} XLM
                  </td>
                  <td style={{ padding: "12px" }}>
                    {w.txHash ? (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${w.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--accent)", textDecoration: "none", fontFamily: "monospace" }}
                      >
                        {truncateHash(w.txHash)} ↗
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: w.status === "confirmed" ? "#10b98122" : "#f59e0b22",
                        color: w.status === "confirmed" ? "#10b981" : "#f59e0b",
                        border: `1px solid ${w.status === "confirmed" ? "#10b98144" : "#f59e0b44"}`,
                      }}
                    >
                      {w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
