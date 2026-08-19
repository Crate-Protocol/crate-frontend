import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Lock, Play, Pause } from "lucide-react";
import { AudioWaveform } from "./AudioWaveform";

export interface SampleCardProps {
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
  audioUrl?: string;
  onBuy?: (id: number, tier: number) => void;
  onBuyResale?: (id: number) => void;
  onPlayToggle?: (id: number, isPlaying: boolean) => void;
}

const EXCLUSIVE_TOOLTIP =
  "This beat was bought as an Exclusive license — the buyer now owns full rights, so it can no longer be purchased on any tier.";

export function SampleCard({
  id,
  title,
  producer,
  genre,
  bpm,
  leasePrice,
  premiumPrice,
  exclusivePrice,
  tokenSymbol = "XLM",
  isExclusive = false,
  resalePrice,
  owner: _owner,
  audioUrl,
  onBuy,
  onBuyResale,
  onPlayToggle,
}: SampleCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCardHovered, setIsCardHovered] = useState(false);

  const duration = 30; // 30-second preview duration
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Playback timer simulation if no native audioUrl or while playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const stepMs = 100;
      const progressIncrement = stepMs / (duration * 1000);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            onPlayToggle?.(id, false);
            return 0;
          }
          return prev + progressIncrement;
        });
      }, stepMs);
    } else if (progress >= 1) {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, id, onPlayToggle, progress]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isPlaying;
    setIsPlaying(nextState);
    onPlayToggle?.(id, nextState);

    if (audioRef.current) {
      if (nextState) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleSeek = (newProgress: number) => {
    setProgress(newProgress);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = newProgress * audioRef.current.duration;
    }
  };

  const tiers = [
    { label: "Lease", price: leasePrice, desc: "Non-exclusive" },
    { label: "Premium", price: premiumPrice, desc: "Commercial use" },
    { label: "Exclusive", price: exclusivePrice, desc: "Full ownership" },
  ];

  return (
    <div
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      style={{
        background: "#111",
        border: "1px solid #1a1a1a",
        borderRadius: 20,
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: isPlaying ? "0 8px 30px rgba(250, 204, 21, 0.08)" : undefined,
        borderColor: isPlaying ? "rgba(250, 204, 21, 0.3)" : undefined,
      }}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current && audioRef.current.duration) {
              setProgress(audioRef.current.currentTime / audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
            onPlayToggle?.(id, false);
          }}
        />
      )}

      {/* Beat art & Waveform area */}
      <div style={{ position: "relative", background: "#0a0a0a", height: 80, overflow: "hidden" }}>
        <Link
          to={`/sample/${id}`}
          style={{ display: "block", width: "100%", height: "100%" }}
          aria-label={`View ${title}`}
        >
          <AudioWaveform
            seed={id}
            barsCount={28}
            height={80}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            onSeek={handleSeek}
            ariaLabel={`Waveform preview for ${title}`}
          />
        </Link>

        {/* Play / Pause overlay button */}
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? `Pause preview for ${title}` : `Play preview for ${title}`}
          data-testid="sample-card-play-button"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: isPlaying ? "#facc15" : "rgba(0, 0, 0, 0.75)",
            border: "1px solid rgba(250, 204, 21, 0.5)",
            color: isPlaying ? "#000" : "#facc15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: isPlaying || isCardHovered ? 1 : 0.85,
            transition: "all 0.15s ease",
            zIndex: 5,
            boxShadow: isPlaying ? "0 0 12px rgba(250, 204, 21, 0.5)" : "0 2px 8px rgba(0, 0, 0, 0.6)",
          }}
        >
          {isPlaying ? (
            <Pause size={14} fill={isPlaying ? "#000" : "#facc15"} />
          ) : (
            <Play size={14} fill="#facc15" style={{ marginLeft: 2 }} />
          )}
        </button>

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
              zIndex: 6,
            }}
          >
            <Lock size={11} strokeWidth={2.5} />
            {resalePrice ? "RESALE" : "SOLD EXCLUSIVE"}
          </span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
            <p style={{ fontSize: 11, color: "#525252", margin: "3px 0 0", fontFamily: "monospace" }}>
              {producer.slice(0, 6)}…{producer.slice(-4)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                background: "rgba(250,204,21,0.1)",
                color: "#facc15",
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {genre}
            </span>
            <span
              style={{
                background: "#1a1a1a",
                color: "#737373",
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {bpm} BPM
            </span>
          </div>
        </div>

        {isExclusive ? (
          resalePrice ? (
            <button
              aria-label={`Buy resale license for ${title}`}
              onClick={() => onBuyResale?.(id)}
              style={{
                width: "100%",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "11px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
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
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  style={{
                    flex: 1,
                    background: selected === i ? "rgba(250,204,21,0.12)" : "#0a0a0a",
                    border: `1px solid ${selected === i ? "rgba(250,204,21,0.4)" : "#1a1a1a"}`,
                    borderRadius: 10,
                    padding: "8px 4px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: selected === i ? "#facc15" : "#525252",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {t.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "2px 0" }}>
                    {t.price} {tokenSymbol}
                  </div>
                  <div style={{ fontSize: 10, color: "#525252" }}>{t.desc}</div>
                </button>
              ))}
            </div>

            <button
              aria-label={selected !== null ? `Buy ${tiers[selected].label} license for ${title}` : "Select a license tier"}
              disabled={selected === null}
              onClick={() => selected !== null && onBuy?.(id, selected)}
              style={{
                width: "100%",
                background: selected !== null ? "#facc15" : "#1a1a1a",
                color: selected !== null ? "#000" : "#525252",
                border: "none",
                borderRadius: 12,
                padding: "11px",
                fontSize: 14,
                fontWeight: 700,
                cursor: selected !== null ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              {selected !== null ? `Buy ${tiers[selected].label} — ${tiers[selected].price} ${tokenSymbol}` : "Select a license tier"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default SampleCard;
