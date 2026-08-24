import React from "react";
import {
  ArrowDownToLine,
  ExternalLink,
  History,
  CheckCircle2,
  Clock,
  Coins,
} from "lucide-react";
import { WithdrawalRecord } from "../services/analytics";

interface WithdrawalHistoryProps {
  withdrawals: WithdrawalRecord[];
  pendingEarnings: number;
  onWithdraw: () => Promise<void>;
  withdrawing: boolean;
  explorerNetwork: string;
}

export default function WithdrawalHistory({
  withdrawals,
  pendingEarnings,
  onWithdraw,
  withdrawing,
  explorerNetwork,
}: WithdrawalHistoryProps) {
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "confirmed")
    .reduce((acc, w) => acc + (parseFloat(w.amount) || 0), 0);

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
      }}
    >
      {/* Header & Quick Action */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            <History size={18} style={{ color: "var(--accent)" }} />
            Withdrawal History
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              margin: "2px 0 0",
            }}
          >
            Past payouts from smart contract to your connected wallet
          </p>
        </div>

        {/* Withdraw Trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
              Pending Balance
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "15px",
                color: pendingEarnings > 0 ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {pendingEarnings.toFixed(2)} XLM
            </span>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={onWithdraw}
            disabled={withdrawing || pendingEarnings <= 0}
            style={{ padding: "8px 16px", gap: "6px", fontSize: "12px" }}
          >
            <ArrowDownToLine size={13} />
            {withdrawing ? "Withdrawing..." : "Withdraw"}
          </button>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div style={{ overflowX: "auto" }}>
        {withdrawals.length === 0 ? (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Coins size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <p style={{ fontSize: "14px", fontWeight: 600 }}>No withdrawals yet</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              When you withdraw your pending earnings from the contract, payouts will be listed here.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.01)",
                }}
              >
                <th
                  style={{
                    padding: "12px 20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: "12px 20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "right",
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    padding: "12px 20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Tx Hash
                </th>
                <th
                  style={{
                    padding: "12px 20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "center",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {withdrawals.map((w, idx) => {
                const shortHash = `${w.txHash.slice(0, 8)}...${w.txHash.slice(-8)}`;
                const isConfirmed = w.status === "confirmed";

                return (
                  <tr
                    key={w.txHash || idx}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Date */}
                    <td style={{ padding: "14px 20px", color: "var(--text-secondary)" }}>
                      {new Date(w.timestamp).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Amount */}
                    <td
                      style={{
                        padding: "14px 20px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {parseFloat(w.amount).toFixed(2)} XLM
                    </td>

                    {/* Tx Hash */}
                    <td style={{ padding: "14px 20px" }}>
                      <a
                        href={`https://stellar.expert/explorer/${explorerNetwork}/tx/${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--accent)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                        }}
                      >
                        <span>{shortHash}</span>
                        <ExternalLink size={11} />
                      </a>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <span
                        className={isConfirmed ? "badge badge-green" : "badge"}
                        style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        {isConfirmed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {isConfirmed ? "Confirmed" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Total */}
      {withdrawals.length > 0 && (
        <div
          style={{
            padding: "14px 24px",
            background: "rgba(0, 0, 0, 0.25)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
          }}
        >
          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
            Total Withdrawn All-Time
          </span>
          <span
            style={{
              fontWeight: 800,
              fontSize: "14px",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
          </span>
        </div>
      )}
    </div>
  );
}
