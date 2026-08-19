import { useState } from "react";
import { Wallet, Copy, CheckCircle, ArrowDownToLine, RefreshCw } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useProducerStats } from "../hooks/useProducerStats";
import { withdrawEarnings, submitTransaction, listResale } from "../contracts/crate";
import { saveWithdrawal } from "../services/analytics";
import StatsCard from "../components/StatsCard";
import RevenueChart from "../components/RevenueChart";
import BeatPerformanceTable from "../components/BeatPerformanceTable";
import SalesFeed from "../components/SalesFeed";
import WithdrawalHistory from "../components/WithdrawalHistory";
import toast from "react-hot-toast";

export default function Profile() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const {
    isLoading,
    samples,
    totalEarned,
    thisMonthEarnings,
    pendingBalance,
    totalSalesCount,
    monthlyGrowth,
    data30d,
    data90d,
    data1y,
    salesHistory,
    withdrawalsHistory,
    refresh,
  } = useProducerStats();

  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ownedBeats, setOwnedBeats] = useState<any[]>([
    { id: 8, title: "Summer Breeze", genre: "Pop", bpm: 120, isExclusive: true, resalePrice: undefined },
    { id: 7, title: "Night Walk", genre: "R&B", bpm: 95, isExclusive: true, resalePrice: 800 },
  ]);

  async function handleWithdraw() {
    if (!address) return;
    if (parseFloat(pendingBalance) <= 0) {
      toast.error("No pending earnings to withdraw");
      return;
    }
    setWithdrawing(true);
    const tokenAddress = import.meta.env.VITE_XLM_TOKEN_ADDRESS as string | undefined;
    if (!tokenAddress) {
      toast.error("XLM token address not configured");
      setWithdrawing(false);
      return;
    }
    try {
      const xdr = await withdrawEarnings(address, tokenAddress);
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Withdrawal successful! Tx: ${hash.slice(0, 12)}...`);

      // Persist withdrawal
      saveWithdrawal(address, {
        txHash: hash,
        amount: pendingBalance,
        timestamp: Date.now(),
        status: "confirmed",
      });

      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  }

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleListResale(sampleId: number) {
    if (!address) return;
    const priceStr = prompt("Enter resale price in XLM:");
    if (!priceStr) return;
    const priceXlm = parseFloat(priceStr);
    if (isNaN(priceXlm) || priceXlm <= 0) {
      toast.error("Invalid price");
      return;
    }

    try {
      const xdr = await listResale({ owner: address, sampleId, priceXlm });
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Listed for resale! Tx: ${hash.slice(0, 12)}...`);
      setOwnedBeats((beats) =>
        beats.map((b) => (b.id === sampleId ? { ...b, resalePrice: priceXlm } : b))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list for resale");
    }
  }

  if (!isConnected) {
    return (
      <main
        className="container"
        style={{
          paddingTop: "80px",
          paddingBottom: "80px",
          maxWidth: "560px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "48px 32px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "var(--accent)",
            }}
          >
            <Wallet size={26} />
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "8px",
            }}
          >
            Connect Your Wallet
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            Connect your Freighter wallet to view your producer earnings dashboard, track sales analytics, and manage withdrawals.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={connect}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Connect Freighter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: "32px", paddingBottom: "80px" }}>
      {/* Header Profile Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            Producer Dashboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontFamily: "monospace" }}>
              {address?.slice(0, 10)}...{address?.slice(-8)}
            </span>
            <button
              type="button"
              onClick={copyAddress}
              style={{
                background: "none",
                border: "none",
                color: copied ? "#10b981" : "var(--text-tertiary)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Copy Address"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            onClick={refresh}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={withdrawing || parseFloat(pendingBalance) <= 0}
            onClick={handleWithdraw}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            <ArrowDownToLine size={15} />
            {withdrawing ? "Withdrawing..." : `Withdraw ${pendingBalance} XLM`}
          </button>
        </div>
      </div>

      {/* Top Row: 4 Overview Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatsCard
          label="Total Earned (Lifetime)"
          value={`${totalEarned} XLM`}
          subValue="All-time gross volume"
          sparklineData={data30d.map((d) => d.amount)}
        />
        <StatsCard
          label="This Month's Revenue"
          value={`${thisMonthEarnings} XLM`}
          change={monthlyGrowth}
          sparklineData={data30d.slice(-14).map((d) => d.amount)}
        />
        <StatsCard
          label="Pending Withdrawal"
          value={`${pendingBalance} XLM`}
          subValue="Ready to claim"
          accent={parseFloat(pendingBalance) > 0}
        />
        <StatsCard
          label="Total Sales"
          value={totalSalesCount.toString()}
          subValue={`${samples.length} beats active`}
        />
      </div>

      {/* Revenue Trend Area Chart */}
      <div style={{ marginBottom: "24px" }}>
        <RevenueChart data30d={data30d} data90d={data90d} data1y={data1y} />
      </div>

      {/* Two Columns: Beat Performance & Recent Sales Activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        <BeatPerformanceTable samples={samples} />
        <SalesFeed sales={salesHistory} />
      </div>

      {/* Full Withdrawal History */}
      <div style={{ marginBottom: "32px" }}>
        <WithdrawalHistory withdrawals={withdrawalsHistory} />
      </div>

      {/* Resale Management Section */}
      {ownedBeats.length > 0 && (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "24px",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Exclusive Beats Owned (Secondary Marketplace)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {ownedBeats.map((beat) => (
              <div
                key={beat.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{beat.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {beat.genre} • {beat.bpm} BPM • Exclusive License
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {beat.resalePrice ? (
                    <span style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 700 }}>
                      Listed for {beat.resalePrice} XLM
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleListResale(beat.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        background: "var(--surface-3)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      List for Resale
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
