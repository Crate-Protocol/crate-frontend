import { useState } from "react";

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
  onBuy?: (id: number, tier: number) => void;
}

const BARS = [40, 65, 50, 80, 45, 70, 55, 75, 42, 68, 52, 78, 46, 72, 58];

export function SampleCard({ id, title, producer, genre, bpm, leasePrice, premiumPrice, exclusivePrice, tokenSymbol = "XLM", onBuy }: SampleCardProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const tiers = [
    { label: "Lease",     price: leasePrice,     desc: "Non-exclusive" },
    { label: "Premium",   price: premiumPrice,   desc: "Commercial use" },
    { label: "Exclusive", price: exclusivePrice, desc: "Full ownership" },
  ];

  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 20, overflow: "hidden", transition: "border-color 0.15s" }}>
      {/* Waveform art */}
      <div style={{ background: "#0a0a0a", height: 80, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "0 16px" }}>
        {BARS.map((h, i) => (
          <div key={i} style={{ width: 3, height: h * 0.6, background: "#facc15", borderRadius: 2, opacity: 0.7 + i * 0.02 }} />
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* Meta */}
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

        {/* License tiers */}
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
      </div>
    </div>
  );
}
