import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  ExternalLink,
  Radio,
  Clock,
  User,
} from "lucide-react";
import { SaleRecord } from "../services/analytics";

interface SalesFeedProps {
  sales: SaleRecord[];
  newSaleCount?: number;
  onClearNewCount?: () => void;
  explorerNetwork: string;
}

export default function SalesFeed({
  sales,
  newSaleCount = 0,
  onClearNewCount,
  explorerNetwork,
}: SalesFeedProps) {
  function formatTime(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function getTierBadgeClass(tier: string) {
    switch (tier.toLowerCase()) {
      case "exclusive":
        return {
          bg: "rgba(168, 85, 247, 0.15)",
          color: "#c084fc",
          border: "1px solid rgba(168, 85, 247, 0.3)",
        };
      case "premium":
        return {
          bg: "rgba(59, 130, 246, 0.15)",
          color: "#60a5fa",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        };
      case "lease":
      default:
        return {
          bg: "rgba(250, 204, 21, 0.12)",
          color: "var(--accent)",
          border: "1px solid rgba(250, 204, 21, 0.25)",
        };
    }
  }

  return (
    <div
      className="card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShoppingBag size={18} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
            Recent Sales
          </span>
          {newSaleCount > 0 && (
            <span
              className="badge badge-green"
              onClick={onClearNewCount}
              style={{
                fontSize: "10px",
                cursor: "pointer",
                animation: "pulse 2s infinite",
              }}
              title="Click to mark as read"
            >
              +{newSaleCount} new
            </span>
          )}
        </div>

        {/* Live Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--success)",
              boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)",
            }}
          />
          Live (30s)
        </div>
      </div>

      {/* Sales List */}
      <div
        style={{
          overflowY: "auto",
          maxHeight: "440px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sales.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Clock size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <p style={{ fontSize: "14px", fontWeight: 600 }}>No sales recorded yet</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Sales on your beats will appear here in real-time.
            </p>
          </div>
        ) : (
          sales.map((sale, index) => {
            const tierStyle = getTierBadgeClass(sale.tier);
            const shortBuyer = `${sale.buyer.slice(0, 4)}...${sale.buyer.slice(-4)}`;
            const isRecent = index < newSaleCount;

            return (
              <div
                key={sale.txHash || index}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: isRecent ? "rgba(250, 204, 21, 0.04)" : "transparent",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isRecent
                    ? "rgba(250, 204, 21, 0.04)"
                    : "transparent";
                }}
              >
                {/* Left: Beat info & Buyer */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "3px",
                    }}
                  >
                    <Link
                      to={`/sample/${sale.sampleId}`}
                      style={{
                        fontWeight: 600,
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      className="hover-underline"
                    >
                      {sale.sampleTitle}
                    </Link>

                    <span
                      className="badge"
                      style={{
                        fontSize: "9px",
                        padding: "1px 5px",
                        ...tierStyle,
                      }}
                    >
                      {sale.tier}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <User size={10} />
                      <span style={{ fontFamily: "var(--font-mono)" }}>{shortBuyer}</span>
                    </span>
                    <span>•</span>
                    <span>{formatTime(sale.timestamp)}</span>
                  </div>
                </div>

                {/* Right: Amount & Explorer Link */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        color: "var(--accent)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      +{sale.amount} XLM
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      90% split
                    </div>
                  </div>

                  <a
                    href={`https://stellar.expert/explorer/${explorerNetwork}/tx/${sale.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--text-muted)",
                      padding: "4px",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    title="View on Stellar Expert"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
