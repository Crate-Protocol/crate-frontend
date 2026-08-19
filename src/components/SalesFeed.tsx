import { SaleRecord } from "../services/analytics";

interface SalesFeedProps {
  sales: SaleRecord[];
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SalesFeed({ sales }: SalesFeedProps) {
  const tierColor = (tier: string) => {
    switch (tier) {
      case "exclusive":
        return "#a855f7"; // purple
      case "premium":
        return "var(--accent)"; // gold/yellow
      default:
        return "#3b82f6"; // blue
    }
  };

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
          Recent Sales Activity
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {sales.length} transactions recorded
        </div>
      </div>

      {sales.length === 0 ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "13px",
          }}
        >
          No recent sales yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sales.slice(0, 15).map((sale, idx) => (
            <div
              key={sale.txHash || idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                background: "var(--surface-2)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {sale.sampleTitle || `Sample #${sale.sampleId}`}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Buyer: {truncateAddress(sale.buyer)} • {formatRelativeTime(sale.timestamp)}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: `${tierColor(sale.tier)}22`,
                    color: tierColor(sale.tier),
                    border: `1px solid ${tierColor(sale.tier)}44`,
                  }}
                >
                  {sale.tier}
                </span>

                <span style={{ fontWeight: 800, color: "var(--accent)" }}>
                  +{sale.amount} XLM
                </span>

                {sale.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${sale.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "var(--text-tertiary)",
                      textDecoration: "none",
                      fontSize: "12px",
                    }}
                    title="View on StellarExpert"
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
