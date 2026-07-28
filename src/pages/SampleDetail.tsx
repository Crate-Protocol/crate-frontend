import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, ShoppingCart, Music, ExternalLink } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getSample, purchaseSample, submitTransaction, stroopsToXlm } from "../contracts/crate";
import type { SampleData } from "../contracts/crate";
import { getLicenseTierLabel, savePurchaseRecord, type LicenseTier } from "../lib/purchaseHistory";
import toast from "react-hot-toast";

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [sample, setSample] = useState<SampleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [selectedTier, setSelectedTier] = useState<LicenseTier>(0);
  const gatewayBase = (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) || "https://ipfs.io";

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

    const tokenAddress = import.meta.env.VITE_XLM_TOKEN_ADDRESS as string | undefined;
    if (!tokenAddress) {
      toast.error("XLM token address not configured");
      return;
    }

    setBuying(true);
    try {
      const xdr = await purchaseSample({
        buyer: address,
        sampleId: sample.id,
        tokenAddress,
        tier: selectedTier,
      });
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Purchase successful! Tx: ${hash.slice(0, 12)}...`);
      savePurchaseRecord({
        buyerAddress: address,
        sampleId: sample.id,
        title: sample.title,
        producer: sample.uploader,
        genre: sample.genre,
        bpm: sample.bpm,
        ipfsCid: sample.ipfs_cid,
        licenseTier: selectedTier,
        pricePaidXlm: getSelectedPrice(sample, selectedTier),
        txHash: hash,
        purchasedAt: new Date().toISOString(),
        owner: sample.owner,
        isExclusive: selectedTier === 2 || sample.is_exclusive,
        resalePriceXlm: sample.resale_price ? stroopsToXlm(sample.resale_price) : null,
      });
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

  const priceXlm = stroopsToXlm(sample.lease_price);
  const selectedPriceXlm = getSelectedPrice(sample, selectedTier);
  const producerEarning = (parseFloat(selectedPriceXlm) * 0.9).toFixed(2);
  const tiers: { tier: LicenseTier; label: string; price: string; description: string }[] = [
    { tier: 0, label: "Lease", price: stroopsToXlm(sample.lease_price), description: "Non-exclusive use" },
    { tier: 1, label: "Premium", price: stroopsToXlm(sample.premium_price), description: "Commercial rights" },
    { tier: 2, label: "Exclusive", price: stroopsToXlm(sample.exclusive_price), description: "Full ownership transfer" },
  ];

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
            {sample.total_sales.toString()} sales
          </span>
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
            href={`${gatewayBase.replace(/\/$/, "")}/ipfs/${sample.ipfs_cid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontSize: "12px" }}
          >
            View <ExternalLink size={12} />
          </a>
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>Choose your license</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {tiers.map((tierOption) => (
              <button
                key={tierOption.tier}
                type="button"
                onClick={() => setSelectedTier(tierOption.tier)}
                style={{
                  textAlign: "left",
                  padding: "14px",
                  borderRadius: "var(--radius)",
                  border:
                    selectedTier === tierOption.tier
                      ? "1px solid rgba(250, 204, 21, 0.45)"
                      : "1px solid var(--border)",
                  background:
                    selectedTier === tierOption.tier
                      ? "rgba(250, 204, 21, 0.08)"
                      : "var(--surface-2)",
                  color: "var(--text-primary)",
                }}
              >
                <div style={{ fontSize: "12px", color: selectedTier === tierOption.tier ? "var(--accent)" : "var(--text-secondary)", fontWeight: 700, marginBottom: 6 }}>
                  {tierOption.label}
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: 4 }}>{tierOption.price} XLM</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{tierOption.description}</div>
              </button>
            ))}
          </div>
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
          <span>{getLicenseTierLabel(selectedTier)} producer payout:</span>
          <span style={{ color: "var(--success)", fontWeight: 600 }}>{producerEarning} XLM (90%)</span>
        </div>

        {purchased ? (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ color: "var(--success)", fontWeight: 600, fontSize: "16px", marginBottom: 8 }}>
              Purchase complete!
            </div>
            <a
              href={`${gatewayBase.replace(/\/$/, "")}/ipfs/${sample.ipfs_cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Download from IPFS
              <ExternalLink size={14} />
            </a>
            <Link to="/my-beats" className="btn btn-secondary" style={{ marginTop: 10 }}>
              Open My Beats
            </Link>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleBuy}
            disabled={buying || sample.is_exclusive}
            style={{ width: "100%" }}
          >
            <ShoppingCart size={16} />
            {buying ? "Processing..." : `Buy ${getLicenseTierLabel(selectedTier)} - ${selectedPriceXlm} XLM`}
          </button>
        )}
      </div>
    </main>
  );
}

function getSelectedPrice(sample: SampleData, tier: LicenseTier): string {
  switch (tier) {
    case 0:
      return stroopsToXlm(sample.lease_price);
    case 1:
      return stroopsToXlm(sample.premium_price);
    case 2:
      return stroopsToXlm(sample.exclusive_price);
    default:
      return stroopsToXlm(sample.lease_price);
  }
}
