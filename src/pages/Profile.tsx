import { useState, useEffect } from "react";
import { Wallet, TrendingUp, Music, ArrowDownToLine, Copy, CheckCircle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getEarnings, withdrawEarnings, submitTransaction } from "../contracts/crate";
import toast from "react-hot-toast";

export default function Profile() {
  const { address, isConnected, connect, disconnect, signTransaction } = useWallet();
  const [earnings, setEarnings] = useState<number>(0);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (address) {
      loadEarnings();
    }
  }, [address]);

  async function loadEarnings() {
    if (!address) return;
    setLoadingEarnings(true);
    try {
      const e = await getEarnings(address);
      setEarnings(e);
    } catch {
      toast.error("Failed to load earnings");
    } finally {
      setLoadingEarnings(false);
    }
  }

  async function handleWithdraw() {
    if (!address) return;
    if (earnings === 0) {
      toast.error("No earnings to withdraw");
      return;
    }
    setWithdrawing(true);
    try {
      const xdr = await withdrawEarnings(address);
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Withdrawal successful! Tx: ${hash.slice(0, 12)}...`);
      setEarnings(0);
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
        <Wallet size={48} color="var(--text-muted)" style={{ margin: "0 auto 20px" }} />
        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: 10 }}>Connect Your Wallet</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: "14px" }}>
          Connect Freighter to view your producer profile, earnings, and uploaded beats.
        </p>
        <button className="btn btn-primary btn-lg" onClick={connect}>
          Connect Freighter
        </button>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Profile</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Your producer dashboard
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "800px" }}>
        {/* Wallet card */}
        <div className="card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}
              >
                Stellar Address
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  wordBreak: "break-all",
                }}
              >
                {address}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={copyAddress}
                style={{ gap: 6 }}
              >
                {copied ? <CheckCircle size={13} color="var(--success)" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={disconnect}>
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Earnings card */}
        <div className="card" style={{ padding: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <TrendingUp size={12} />
            Pending Earnings
          </div>

          {loadingEarnings ? (
            <div className="skeleton" style={{ height: 40, width: 120 }} />
          ) : (
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: earnings > 0 ? "var(--accent)" : "var(--text-muted)",
                letterSpacing: "-0.02em",
                marginBottom: "4px",
              }}
            >
              {earnings.toFixed(2)}
            </div>
          )}
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            XLM available
          </div>

          <button
            className="btn btn-primary"
            onClick={handleWithdraw}
            disabled={withdrawing || earnings === 0}
            style={{ width: "100%" }}
          >
            <ArrowDownToLine size={14} />
            {withdrawing ? "Withdrawing..." : "Withdraw to Wallet"}
          </button>
        </div>

        {/* Network card */}
        <div className="card" style={{ padding: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Music size={12} />
            Contract Info
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.8, color: "var(--text-secondary)" }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "var(--text-muted)" }}>Network: </span>
              <span className="badge badge-green">Testnet</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "var(--text-muted)" }}>Revenue split: </span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>90% to you</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Contract: </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                CA7DGEWW...DTLG
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
