import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Link as LinkIcon } from "lucide-react";

interface SampleCardProps {
  id: number;
  title: string;
  producer: string;
  genre: string;
  bpm: number;
  leasePrice: number;
  premiumPrice: number;
  exclusivePrice: number;
  tokenSymbol?: string;
  isExclusive?: boolean;
  resalePrice?: number;
  owner?: string;
  onBuy?: (id: number, tier: number) => void;
  onBuyResale?: (id: number) => void;
  xlmBalance?: string;
  usdcBalance?: string;
  onBuyCrossChain?: (id: number) => void;
}

const BARS = [40, 65, 50, 80, 45, 70, 55, 75, 42, 68, 52, 78, 46, 72, 58];

const EXCLUSIVE_TOOLTIP =
  "This beat was bought as an Exclusive license — the buyer now owns full rights, so it can no longer be purchased on any tier.";

export function SampleCard({ id, title, producer, genre, bpm, leasePrice, premiumPrice, exclusivePrice, tokenSymbol = "XLM", isExclusive = false, resalePrice, owner, onBuy, onBuyResale, xlmBalance, usdcBalance, onBuyCrossChain }: SampleCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const tiers = [
    { label: "Lease",     price: leasePrice,     desc: "Non-exclusive" },
    { label: "Premium",   price: premiumPrice,   desc: "Commercial use" },
    { label: "Exclusive", price: exclusivePrice, desc: "Full ownership" },
  ];

  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, overflow: "hidden", transition: "border-color 0.15s" }}>
      {/* Beat art — still clickable through to the detail page even when sold exclusive */}
      <Link to={`/sample/${id}`} style={{ display: "block", position: "relative" }} aria-label={`View ${title}`}>
        <div style={{ background: "#0a0a0a", height: 80, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "0 16px" }}>
          {BARS.map((h, i) => (
            <div key={i} style={{ width: 3, height: h * 0.6, background: "#facc15", borderRadius: 2, opacity: 0.7 + i * 0.02 }} />
          ))}
        </div>

        {isExclusive && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: resalePrice ? "#3b82f6" : "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "4px 8px",
              borderRadius: 999,
              boxShadow: resalePrice ? "0 2px 8px rgba(59,130,246,0.4)" : "0 2px 8px rgba(239,68,68,0.4)",
            }}
          >
            <Lock size={11} strokeWidth={2.5} />
            {resalePrice ? "RESALE" : "SOLD EXCLUSIVE"}
          </span>
        )}
      </Link>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
            <p style={{ fontSize: 11, color: "#525252", margin: "3px 0 0", fontFamily: "monospace" }}>
              {producer.slice(0, 6)}…{producer.slice(-4)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ background: "rgba(250,204,21,0.1)", color: "#facc15", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>{genre}</span>
            <span style={{ background: "#1a1a1a", color: "#737373", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>{bpm} BPM</span>
          </div>
        </div>

        {isExclusive ? (
          resalePrice ? (
            <button
              aria-label={`Buy resale license for ${title}`}
              onClick={() => onBuyResale?.(id)}
              style={{ width: "100%", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
              Buy Resale — {resalePrice} {tokenSymbol}
            </button>
          ) : (
          /* Sold exclusive — all purchase tiers collapse into a single disabled state */
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              role="status"
              title={EXCLUSIVE_TOOLTIP}
              style={{
                width: "100%",
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                padding: "16px 11px",
                textAlign: "center",
                color: "#525252",
                cursor: "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              <Lock size={14} strokeWidth={2.5} />
              No longer available
            </div>

            {showTooltip && (
              <div
                role="tooltip"
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 240,
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "#d4d4d4",
                  fontWeight: 500,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                {EXCLUSIVE_TOOLTIP}
              </div>
            )}
          </div>
          )
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {tiers.map((t, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  style={{ flex: 1, background: selected === i ? "rgba(250,204,21,0.12)" : "#0a0a0a", border: `1px solid ${selected === i ? "rgba(250,204,21,0.4)" : "#1a1a1a"}`, borderRadius: 10, padding: "8px 4px", cursor: "pointer", transition: "all 0.15s", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: selected === i ? "#facc15" : "#525252", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "2px 0" }}>{t.price} {tokenSymbol}</div>
                  <div style={{ fontSize: 10, color: "#525252" }}>{t.desc}</div>
                </button>
              ))}
            </div>

            <button
              aria-label={selected !== null ? `Buy ${tiers[selected].label} license for ${title}` : "Select a license tier"}
              disabled={selected === null}
              onClick={() => selected !== null && onBuy?.(id, selected)}
              style={{ width: "100%", background: selected !== null ? "#facc15" : "#1a1a1a", color: selected !== null ? "#000" : "#525252", border: "none", borderRadius: 12, padding: "11px", fontSize: 14, fontWeight: 700, cursor: selected !== null ? "pointer" : "default", transition: "all 0.15s" }}>
              {selected !== null ? `Buy ${tiers[selected].label} — ${tiers[selected].price} ${tokenSymbol}` : "Select a license tier"}
            </button>

            {(xlmBalance || usdcBalance) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 10, color: "#525252" }}>
                {xlmBalance && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 11 }}>&#11088;</span> {xlmBalance} XLM
                  </span>
                )}
                {usdcBalance && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 11 }}>&#128181;</span> {usdcBalance} USDC
                  </span>
                )}
              </div>
            )}
            {onBuyCrossChain && selected !== null && (
              <button
                onClick={() => onBuyCrossChain(id)}
                style={{
                  width: "100%", background: "transparent", border: "1px solid #1a1a1a",
                  borderRadius: 12, padding: "8px", fontSize: 12, fontWeight: 600,
                  color: "#737373", cursor: "pointer", marginTop: 6,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  transition: "all 0.15s",
                }}
              >
                <LinkIcon size={12} /> or pay with USDC (cross-chain)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
