import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, ShoppingCart, Music, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import { getSample, purchaseSample, submitTransaction, stroopsToXlm } from "../contracts/crate";
import type { SampleData } from "../contracts/crate";
import { TokenSelector } from "../components/TokenSelector";
import { PaymentConfirmModal } from "../components/PaymentConfirmModal";
import { CrossChainPaymentModal } from "../components/CrossChainPaymentModal";
import { convertToken } from "../services/pricing";
import { USDC_ISSUER, YXLM_ISSUER } from "../constants/tokens";
import toast from "react-hot-toast";

const TIER_LABELS = ["Lease", "Premium", "Exclusive"];

const TOKEN_ADDRESSES: Record<string, string> = {
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  USDC: `USDC-${USDC_ISSUER}`,
  yXLM: `yXLM-${YXLM_ISSUER}`,
};

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected, connect, signTransaction, balances } = useWallet();
  const { addPurchase } = useTransactionHistory(address);
  const [sample, setSample] = useState<SampleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [selectedToken, setSelectedToken] = useState("XLM");
  const [selectedTier, setSelectedTier] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [showCrossChain, setShowCrossChain] = useState(false);

  useEffect(() => {
    if (id && /^\d+$/.test(id)) loadSample();
    else setLoading(false);
  }, [id, address]);

  // Convert price when token selection changes
  useEffect(() => {
    if (!sample) return;
    const priceXlm = parseFloat(stroopsToXlm(sample.lease_price));
    if (selectedToken === "XLM" || selectedToken === "native") {
      setDisplayPrice(priceXlm);
    } else {
      convertToken(priceXlm, "XLM", selectedToken).then(setDisplayPrice);
    }
  }, [sample, selectedToken]);

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

  function handleBuyClick() {
    if (!isConnected || !address) {
      connect();
      return;
    }
    if (!sample) return;
    setShowConfirm(true);
  }

  async function handleConfirmPurchase() {
    if (!sample || !address) return "";
    setBuying(true);
    try {
      const tokenAddress = TOKEN_ADDRESSES[selectedToken] ?? TOKEN_ADDRESSES.XLM;
      const xdr = await purchaseSample({ buyer: address, sampleId: sample.id, tokenAddress, tier: selectedTier });
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      addPurchase({
        txHash: hash,
        sampleId: sample.id,
        sampleTitle: sample.title,
        tier: TIER_LABELS[selectedTier] ?? "Lease",
        token: selectedToken,
        price: displayPrice ?? 0,
        status: "confirmed",
      });
      toast.success(`Purchase successful! Tx: ${hash.slice(0, 12)}...`);
      setPurchased(true);
      return hash;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
      throw err;
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
  const priceNum = parseFloat(priceXlm);
  const currentPrice = displayPrice ?? priceNum;
  const producerEarning = (currentPrice * 0.9).toFixed(2);

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
              {currentPrice.toFixed(2)} {selectedToken}
            </div>
            {selectedToken !== "XLM" && (
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: 4 }}>
                ({priceXlm} XLM)
              </div>
            )}
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
          <span style={{ color: "var(--success)", fontWeight: 600 }}>{producerEarning} {selectedToken} (90%)</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ marginBottom: 12 }}>
              <TokenSelector
                selected={selectedToken}
                onSelect={setSelectedToken}
                balances={balances}
              />
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleBuyClick}
              disabled={buying || sample.is_exclusive}
              style={{ width: "100%" }}
            >
              <ShoppingCart size={16} />
              {buying ? "Processing..." : `Pay with ${selectedToken} — ${currentPrice.toFixed(2)} ${selectedToken}`}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCrossChain(true)}
              disabled={sample.is_exclusive}
              style={{ width: "100%" }}
            >
              <LinkIcon size={14} />
              Pay with USDC (cross-chain)
            </button>
          </div>
        )}

        <CrossChainPaymentModal
          isOpen={showCrossChain}
          onClose={() => setShowCrossChain(false)}
          priceXlm={priceXlm}
          sampleId={sample.id}
          sampleTitle={sample.title}
          stellarRecipient={address || ""}
          onPurchaseComplete={() => {
            setPurchased(true);
            setShowCrossChain(false);
          }}
        />
      </div>

      <PaymentConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmPurchase}
        beatTitle={sample.title}
        tier={TIER_LABELS[selectedTier] ?? "Lease"}
        priceInToken={currentPrice}
        selectedToken={selectedToken}
        balances={balances}
      />
    </main>
  );
}
