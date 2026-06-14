import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, ShoppingCart, Music, ExternalLink } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getSample, purchaseSample, submitTransaction, stroopsToXlm } from "../contracts/crate";
import type { SampleData } from "../contracts/crate";
import toast from "react-hot-toast";

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [sample, setSample] = useState<SampleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    if (id && /^\d+$/.test(id)) loadSample();
    else setLoading(false);
  }, [id, address]);

  async function loadSample() {
    setLoading(true);
    try {
      const src = address || "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
      const data = await getSample(src, BigInt(id!));
      setSample(data);
    } catch {
      toast.error("Failed to load sample");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy() {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    if (!sample) return;
    setBuying(true);
    try {
      const xdr = await purchaseSample({ buyer: address, sampleId: sample.id });
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Purchase successful! Tx: ${hash.slice(0, 12)}...`);
      setPurchased(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: "40px" }}>
        <div className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />
      </main>
    );
  }

  if (!sample) {
    return (
      <main className="container" style={{ paddingTop: "80px", textAlign: "center" }}>
        <Music size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
        <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: 8 }}>Sample Not Found</div>
        <Link to="/marketplace" className="btn btn-secondary" style={{ display: "inline-flex" }}>
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>
      </main>
    );
  }

  const priceXlm = stroopsToXlm(sample.price);
  const producerEarning = (parseFloat(priceXlm) * 0.9).toFixed(2);

  return (
    <main className="container" style={{ paddingTop: "40px", paddingBottom: "80px", maxWidth: "800px" }}>
      <Link
        to="/marketplace"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "14px", marginBottom: "28px" }}
      >
        <ArrowLeft size={14} /> Back to Marketplace
      </Link>

      <div className="card" style={{ padding: "32px" }}>
        <div
          style={{
            width: "100%",
            height: "220px",
            background: "var(--surface-2)",
            borderRadius: "var(--radius)",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(250, 204, 21, 0.1)",
              border: "2px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={24} fill="var(--accent)" color="var(--accent)" style={{ marginLeft: 3 }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "6px" }}>{sample.title}</h1>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              {sample.uploader.slice(0, 12)}...{sample.uploader.slice(-6)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>
              {priceXlm} XLM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: "24px", flexWrap: "wrap" }}>
          <span className="badge badge-yellow">{sample.genre}</span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            {sample.bpm} BPM
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {sample.sales_count.toString()} sales
          </span>
          {!sample.active && (
            <span className="badge" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--error)", border: "1px solid rgba(239,68,68,0.2)" }}>
              Delisted
            </span>
          )}
        </div>

        <div
          style={{
            padding: "12px 16px",
            background: "var(--surface-2)",
            borderRadius: "var(--radius)",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: 2 }}>IPFS CID</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
              {sample.ipfs_cid}
            </div>
          </div>
          <a
            href={`https://ipfs.io/ipfs/${sample.ipfs_cid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontSize: "12px" }}
          >
            View <ExternalLink size={12} />
          </a>
        </div>

        <div
          style={{
            padding: "12px 16px",
            background: "rgba(250, 204, 21, 0.05)",
            border: "1px solid rgba(250, 204, 21, 0.15)",
            borderRadius: "var(--radius)",
            marginBottom: "24px",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            color: "var(--text-secondary)",
          }}
        >
          <span>Producer earns:</span>
          <span style={{ color: "var(--success)", fontWeight: 600 }}>{producerEarning} XLM (90%)</span>
        </div>

        {purchased ? (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ color: "var(--success)", fontWeight: 600, fontSize: "16px", marginBottom: 8 }}>
              Purchase complete!
            </div>
            <a
              href={`https://ipfs.io/ipfs/${sample.ipfs_cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Download from IPFS
              <ExternalLink size={14} />
            </a>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleBuy}
            disabled={buying || !sample.active}
            style={{ width: "100%" }}
          >
            <ShoppingCart size={16} />
            {buying ? "Processing..." : `Buy for ${priceXlm} XLM`}
          </button>
        )}
      </div>
    </main>
  );
}
