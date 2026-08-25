import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  Coins,
  TrendingUp,
  ShoppingBag,
  ArrowDownToLine,
  Copy,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  Music,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useProducerStats } from "../hooks/useProducerStats";
import { useSalesFeed } from "../hooks/useSalesFeed";
import StatsCard from "../components/StatsCard";
import RevenueChart from "../components/RevenueChart";
import BeatPerformanceTable from "../components/BeatPerformanceTable";
import SalesFeed from "../components/SalesFeed";
import WithdrawalHistory from "../components/WithdrawalHistory";
import {
  withdrawEarnings,
  submitTransaction,
  listResale,
} from "../contracts/crate";
import { recordWithdrawal } from "../services/analytics";
import toast from "react-hot-toast";

const EXPLORER_NETWORK =
  import.meta.env.VITE_NETWORK === "MAINNET" ? "public" : "testnet";

export default function Profile() {
  const { address, isConnected, connect, disconnect, signTransaction } =
    useWallet();

  const {
    stats,
    beats,
    withdrawals,
    salesByDay30,
    salesByDay90,
    salesByDay365,
    loading: statsLoading,
    refetch: refetchStats,
  } = useProducerStats(address);

  const {
    sales: feedSales,
    newSaleCount,
    markAsRead,
    refetch: refetchSalesFeed,
  } = useSalesFeed(address);

  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ownedBeats, setOwnedBeats] = useState<any[]>([]);

  useEffect(() => {
    if (address) {
      // Load sample owned exclusive beats for the wallet
      setOwnedBeats([
        {
          id: 8,
          title: "Summer Breeze",
          genre: "Pop",
          bpm: 120,
          isExclusive: true,
          resalePrice: undefined,
        },
        {
          id: 7,
          title: "Night Walk",
          genre: "R&B",
          bpm: 95,
          isExclusive: true,
          resalePrice: 800,
        },
      ]);
    }
  }, [address]);

  async function handleWithdraw() {
    if (!address) return;
    if (stats.pendingBalance <= 0) {
      toast.error("No pending earnings to withdraw");
      return;
    }

    setWithdrawing(true);
    const tokenAddress =
      (import.meta.env.VITE_XLM_TOKEN_ADDRESS as string) ||
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

    try {
      const xdr = await withdrawEarnings(address, tokenAddress);
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);

      // Record withdrawal in local store
      recordWithdrawal(address, {
        txHash: hash,
        amount: stats.pendingBalance.toFixed(2),
        timestamp: Date.now(),
        status: "confirmed",
      });

      toast.success(`Withdrawal successful! Tx: ${hash.slice(0, 10)}...`);
      await refetchStats();
      refetchSalesFeed();
    } catch (err) {
      console.error("Withdrawal error:", err);
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
      setOwnedBeats((prev) =>
        prev.map((b) => (b.id === sampleId ? { ...b, resalePrice: priceXlm } : b))
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to list for resale"
      );
    }
  }

  if (!isConnected || !address) {
    return (
      <main
        className="container"
        style={{
          paddingTop: "96px",
          paddingBottom: "96px",
          maxWidth: "560px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: "rgba(250, 204, 21, 0.1)",
            border: "1px solid rgba(250, 204, 21, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            color: "var(--accent)",
          }}
        >
          <Wallet size={36} />
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>
          Producer Dashboard
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "32px",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          Connect your Stellar wallet to access sales analytics, track beat performance, manage revenue, and withdraw payouts.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => connect()}
          style={{ gap: "10px" }}
        >
          <Wallet size={16} />
          Connect Wallet
        </button>
      </main>
    );
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-6)}`;

  return (
    <main
      className="container"
      style={{
        paddingTop: "36px",
        paddingBottom: "80px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      {/* ─── Dashboard Header ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Producer Dashboard
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              marginTop: "4px",
              margin: 0,
            }}
          >
            Sales analytics, revenue metrics, and beat performance for your catalog
          </p>
        </div>

        {/* Wallet & Quick Action Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {shortAddress}
            </span>

            <button
              onClick={copyAddress}
              style={{
                background: "none",
                border: "none",
                color: copied ? "var(--success)" : "var(--text-muted)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Copy full address"
            >
              {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            </button>

            <a
              href={`https://stellar.expert/explorer/${EXPLORER_NETWORK}/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              title="View on Stellar Expert"
            >
              <ExternalLink size={13} />
            </a>
          </div>

          <Link
            to="/upload"
            className="btn btn-primary btn-sm"
            style={{ gap: "6px" }}
          >
            <PlusCircle size={14} />
            Upload Beat
          </Link>
        </div>
      </div>

      {/* ─── Row 1: Four Stat Cards ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Total Earned (Lifetime) */}
        <StatsCard
          title="Total Earned"
          value={stats.totalEarned.toLocaleString()}
          unit="XLM"
          subtext="Lifetime net revenue"
          growth={stats.monthlyGrowth}
          sparkline={stats.sparklineEarned}
          icon={<Coins size={16} />}
        />

        {/* This Month */}
        <StatsCard
          title="This Month"
          value={stats.thisMonthEarned.toLocaleString()}
          unit="XLM"
          subtext="Net earnings this month"
          growth={stats.monthlyGrowth}
          sparkline={stats.sparklineMonthly}
          icon={<TrendingUp size={16} />}
        />

        {/* Pending Balance */}
        <StatsCard
          title="Pending Balance"
          value={stats.pendingBalance.toFixed(2)}
          unit="XLM"
          subtext="Ready for withdrawal"
          sparkline={stats.sparklinePending}
          icon={<ArrowDownToLine size={16} />}
          action={{
            label: "Withdraw to Wallet",
            onClick: handleWithdraw,
            disabled: stats.pendingBalance <= 0 || withdrawing,
            loading: withdrawing,
            icon: <ArrowDownToLine size={13} />,
          }}
        />

        {/* Total Sales */}
        <StatsCard
          title="Total Sales"
          value={stats.totalSales}
          subtext={`${stats.salesThisWeek} sales this week`}
          growth={stats.salesGrowth}
          sparkline={stats.sparklineSales}
          icon={<ShoppingBag size={16} />}
        />
      </div>

      {/* ─── Row 2: Revenue Chart ─────────────────────────────────────────── */}
      <RevenueChart
        data30={salesByDay30}
        data90={salesByDay90}
        data365={salesByDay365}
      />

      {/* ─── Row 3: Beat Performance & Recent Sales Feed ──────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "20px",
          alignItems: "stretch",
        }}
        className="dashboard-two-col"
      >
        {/* Left: Beat Performance Table */}
        <BeatPerformanceTable
          beats={beats}
          topBeatId={stats.topBeat?.id}
        />

        {/* Right: Recent Sales Feed */}
        <SalesFeed
          sales={feedSales}
          newSaleCount={newSaleCount}
          onClearNewCount={markAsRead}
          explorerNetwork={EXPLORER_NETWORK}
        />
      </div>

      {/* ─── Row 4: Withdrawal History ────────────────────────────────────── */}
      <WithdrawalHistory
        withdrawals={withdrawals}
        pendingEarnings={stats.pendingBalance}
        onWithdraw={handleWithdraw}
        withdrawing={withdrawing}
        explorerNetwork={EXPLORER_NETWORK}
      />

      {/* ─── Row 5: Owned Exclusive Beats & Secondary Resale ──────────────── */}
      <div
        className="card"
        style={{
          padding: "24px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
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
            <Tag size={18} style={{ color: "var(--accent)" }} />
            Owned Exclusive Beats
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              margin: "2px 0 0",
            }}
          >
            Exclusive licenses owned by this wallet eligible for secondary resale
          </p>
        </div>

        {ownedBeats.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "var(--surface-2)",
              borderRadius: "10px",
            }}
          >
            No exclusive beats owned yet. Explore the marketplace for exclusive releases.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {ownedBeats.map((beat) => (
              <div
                key={beat.id}
                style={{
                  padding: "14px 18px",
                  borderRadius: "10px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      marginBottom: "4px",
                      color: "var(--text-primary)",
                    }}
                  >
                    {beat.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(250, 204, 21, 0.1)",
                        color: "var(--accent)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      {beat.genre}
                    </span>
                    <span>{beat.bpm} BPM</span>
                  </div>
                </div>

                <div>
                  {beat.resalePrice ? (
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#60a5fa",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Listed for {beat.resalePrice} XLM
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleListResale(beat.id)}
                      style={{ fontSize: "12px" }}
                    >
                      List for Resale
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
