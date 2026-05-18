import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";

const STATS = [
  { value: "2,400+", label: "Beats listed" },
  { value: "90%",    label: "Producer revenue" },
  { value: "$0.001", label: "Avg transaction fee" },
  { value: "5s",     label: "Settlement time" },
];

const STEPS = [
  { n: "01", title: "Upload your beat", body: "Upload your audio file to IPFS. Set your price for lease, premium, and exclusive licenses." },
  { n: "02", title: "Set your price",   body: "Choose three license tiers. The smart contract enforces every rule — no PDFs, no lawyers." },
  { n: "03", title: "Get paid instantly", body: "Buyer pays in XLM. 90% lands in your wallet in 5 seconds. Stellar handles the rest." },
];

export default function Home() {
  const navigate = useNavigate();
  const { address, connect } = useWallet();

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "Inter, sans-serif" }}>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 999, padding: "6px 14px", marginBottom: 32, fontSize: 12, fontWeight: 700, color: "#facc15", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Live on Stellar Testnet
        </div>
        <h1 style={{ fontSize: "clamp(2.4rem,6vw,4rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
          Sell your beat.<br />
          <span style={{ color: "#facc15" }}>Get paid in 5 seconds.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#737373", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Crate is a P2P beat marketplace on Stellar. No middlemen, no 30-day payouts. Just upload, set your price, and earn.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/marketplace")}
            style={{ background: "#facc15", color: "#000", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Browse Beats
          </button>
          {!address ? (
            <button onClick={connect}
              style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Connect Wallet
            </button>
          ) : (
            <button onClick={() => navigate("/upload")}
              style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Upload a Beat
            </button>
          )}
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", padding: "32px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 24, textAlign: "center" }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#facc15" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#525252", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 48, letterSpacing: "-0.02em" }}>How Crate works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#facc15", letterSpacing: "0.1em", marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "#737373", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
