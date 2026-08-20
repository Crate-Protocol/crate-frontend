import { useState, useEffect } from "react";
import { X, Shield, Loader2 } from "lucide-react";
import { toUSD, formatUSD, convertToken, SUPPORTED_TOKENS } from "../services/pricing";
import { PRODUCER_SHARE, PLATFORM_FEE } from "../constants/tokens";
import type { TokenBalances } from "../hooks/useWallet";

interface PaymentConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  beatTitle: string;
  tier: string;
  priceInToken: number;
  selectedToken: string;
  balances: TokenBalances;
}

export function PaymentConfirmModal({
  open,
  onClose,
  onConfirm,
  beatTitle,
  tier,
  priceInToken,
  selectedToken,
}: PaymentConfirmModalProps) {
  const [usdEquiv, setUsdEquiv] = useState<number | null>(null);
  const [priceInXlm, setPriceInXlm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTxHash(null);
    setLoading(false);

    toUSD(priceInToken, selectedToken).then(setUsdEquiv);

    if (selectedToken !== "XLM" && selectedToken !== "native") {
      convertToken(priceInToken, selectedToken, "XLM").then(setPriceInXlm);
    } else {
      setPriceInXlm(priceInToken);
    }
  }, [open, priceInToken, selectedToken]);

  if (!open) return null;

  const producerEarning = (priceInToken * PRODUCER_SHARE).toFixed(2);
  const platformFee = (priceInToken * PLATFORM_FEE).toFixed(2);
  const tokenInfo = SUPPORTED_TOKENS[selectedToken] ?? SUPPORTED_TOKENS.native;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: "28px",
          width: "100%",
          maxWidth: 420,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#525252",
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px", color: "#fff" }}>
          Confirm Purchase
        </h2>

        {/* Beat info */}
        <div
          style={{
            background: "#0a0a0a",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {beatTitle}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#facc15",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {tier} License
          </div>
        </div>

        {/* Price breakdown */}
        <div
          style={{
            background: "#0a0a0a",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: "#a3a3a3",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Price</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>
              {priceInToken} {tokenInfo.code}
            </span>
          </div>
          {usdEquiv !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>USD Equivalent</span>
              <span style={{ color: "#737373" }}>{formatUSD(usdEquiv)}</span>
            </div>
          )}
          {selectedToken !== "XLM" && selectedToken !== "native" && priceInXlm !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>In XLM</span>
              <span style={{ color: "#737373" }}>{priceInXlm.toFixed(2)} XLM</span>
            </div>
          )}
          <div
            style={{
              borderTop: "1px solid #1a1a1a",
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>Producer earns (90%)</span>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>
                {producerEarning} {tokenInfo.code}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Platform fee (10%)</span>
              <span>{platformFee} {tokenInfo.code}</span>
            </div>
          </div>
        </div>

        {/* Network fee estimate */}
        <div
          style={{
            fontSize: 11,
            color: "#525252",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
          }}
        >
          <Shield size={12} />
          <span>Network fee: ~0.00001 XLM (Stellar)</span>
        </div>

        {/* Success state */}
        {txHash && (
          <div
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 13,
              color: "#22c55e",
            }}
          >
            Purchase complete! Tx: {txHash.slice(0, 12)}...
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              background: "#1a1a1a",
              color: "#a3a3a3",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              padding: "12px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || txHash !== null}
            style={{
              flex: 2,
              background: txHash ? "#22c55e" : "#facc15",
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "12px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading || txHash ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                Signing...
              </>
            ) : txHash ? (
              "Done"
            ) : (
              "Confirm Purchase"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
