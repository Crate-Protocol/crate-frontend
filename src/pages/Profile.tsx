import { useState, useEffect } from "react";
import { Wallet, TrendingUp, Music, ArrowDownToLine, Copy, CheckCircle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getEarnings, withdrawEarnings, submitTransaction, listResale } from "../contracts/crate";
import toast from "react-hot-toast";

export default function Profile() {
  const { address, isConnected, connect, disconnect, signTransaction } = useWallet();
  const [earnings, setEarnings] = useState<number>(0);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ownedBeats, setOwnedBeats] = useState<any[]>([]);

  useEffect(() => {
    if (address) {
      loadEarnings();
      // Mock loading owned beats
      setOwnedBeats([
        { id: 8, title: "Summer Breeze", genre: "Pop", bpm: 120, isExclusive: true, resalePrice: undefined },
        { id: 7, title: "Night Walk", genre: "R&B", bpm: 95, isExclusive: true, resalePrice: 800 }
      ]);
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
      setOwnedBeats(beats => beats.map(b => b.id === sampleId ? { ...b, resalePrice: priceXlm } : b));
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

      <div style={{ marginTop: "40px", maxWidth: "800px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>Collaborative Beats & Royalty Splits</h2>
        <div style={{ display: "grid", gap: "12px", marginBottom: "32px" }}>
          <div className="card" style={{ padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: "15px" }}>Neon Horizon</span>
                <span className="badge badge-yellow" style={{ fontSize: "11px" }}>Synthwave</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>128 BPM</span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", gap: "12px", alignItems: "center" }}>
                <span>Role: <strong style={{ color: "var(--text-primary)" }}>Co-Producer</strong></span>
                <span>•</span>
                <span>Your Split: <strong style={{ color: "var(--accent)" }}>50%</strong> (5,000 bps)</span>
                <span>•</span>
                <span>Total Beat Sales: <strong style={{ color: "var(--success)" }}>450 XLM</strong></span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: 2 }}>Your Share</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                202.50 XLM
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: "15px" }}>Astral Drift</span>
                <span className="badge badge-yellow" style={{ fontSize: "11px" }}>Lo-Fi</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>84 BPM</span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", gap: "12px", alignItems: "center" }}>
                <span>Role: <strong style={{ color: "var(--text-primary)" }}>Mixing & Mastering</strong></span>
                <span>•</span>
                <span>Your Split: <strong style={{ color: "var(--accent)" }}>20%</strong> (2,000 bps)</span>
                <span>•</span>
                <span>Total Beat Sales: <strong style={{ color: "var(--success)" }}>180 XLM</strong></span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: 2 }}>Your Share</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                32.40 XLM
              </div>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>Owned Exclusive Beats</h2>
        {ownedBeats.length === 0 ? (
          <div className="card" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
            No exclusive beats owned yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {ownedBeats.map(beat => (
              <div key={beat.id} className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>{beat.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "8px" }}>
                    <span style={{ background: "rgba(250,204,21,0.1)", color: "#facc15", padding: "2px 6px", borderRadius: "4px" }}>{beat.genre}</span>
                    <span>{beat.bpm} BPM</span>
                  </div>
                </div>
                <div>
                  {beat.resalePrice ? (
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6" }}>
                      Listed for {beat.resalePrice} XLM
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleListResale(beat.id)}
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
