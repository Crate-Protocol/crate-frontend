import React, { useState, useMemo, useRef, useCallback } from "react";

export interface AudioWaveformProps {
  /** Seed used to generate deterministic pseudo-random realistic waveform (e.g. sample ID, title, or audio URL) */
  seed?: number | string;
  /** Explicit pre-calculated peaks or amplitudes (normalized 0.0 to 1.0 or 0 to 100) */
  peaks?: number[];
  /** Number of vertical bars to render (default 28, typically 24-32) */
  barsCount?: number;
  /** Total height of waveform in pixels (default 64) */
  height?: number;
  /** Width of each individual bar in pixels (default 3) */
  barWidth?: number;
  /** Gap between bars in pixels (default 3) */
  barGap?: number;
  /** Border radius of bars in pixels (default 2) */
  barRadius?: number;
  /** Active / played bar color (default "#facc15") */
  activeColor?: string;
  /** Inactive / unplayed bar color (default "rgba(250, 204, 21, 0.25)") */
  inactiveColor?: string;
  /** Hover color or highlight (default "#fde047") */
  hoverColor?: string;
  /** Whether the audio is currently playing (triggers dynamic animation) */
  isPlaying?: boolean;
  /** Playback progress from 0.0 to 1.0 */
  progress?: number;
  /** Current playback time in seconds (used with duration if progress is not set) */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
  /** Callback when user clicks/seeks on the waveform */
  onSeek?: (progress: number) => void;
  /** Whether waveform responds to hover and click interactions (default true) */
  interactive?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error / fallback state */
  hasError?: boolean;
  /** Optional audio URL */
  audioUrl?: string;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Alignment of bars: "center" | "bottom" (default "center") */
  align?: "center" | "bottom";
  /** Optional label for accessibility */
  ariaLabel?: string;
}

/**
 * Deterministic pseudo-random number generator and music waveform generator.
 * Produces realistic musical waveform profiles (intro build-up, chorus peaks, rhythmic transients, outro decay).
 */
export function generateWaveformPeaks(seedInput: number | string = 1, count: number = 28): number[] {
  // Convert seed to 32-bit integer hash
  let seedNum = 0;
  if (typeof seedInput === "number") {
    seedNum = Math.floor(Math.abs(seedInput)) || 1;
  } else {
    for (let i = 0; i < seedInput.length; i++) {
      seedNum = (seedNum << 5) - seedNum + seedInput.charCodeAt(i);
      seedNum |= 0;
    }
    seedNum = Math.abs(seedNum) || 1;
  }

  // Linear congruential generator
  let state = seedNum % 2147483647;
  const nextRand = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  const peaks: number[] = [];
  const seedOffset = (seedNum % 100) * 0.1;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1); // 0.0 to 1.0 across the song
    
    // Musical envelope: natural rise, dynamic verse/chorus peaks, outro taper
    const envelope = Math.sin(t * Math.PI) * 0.4 + 0.6;
    const chorus1 = Math.sin(t * Math.PI * 4 + seedOffset) * 0.25;
    const beatRhythm = Math.cos(t * Math.PI * 8 + seedOffset * 1.5) * 0.18;
    const microVariation = (nextRand() - 0.5) * 0.32;

    const rawPeak = envelope * (0.5 + chorus1 + beatRhythm + microVariation);
    // Clamp to realistic visual range [0.18, 0.95]
    const clamped = Math.max(0.18, Math.min(0.95, rawPeak));
    peaks.push(Number(clamped.toFixed(3)));
  }

  return peaks;
}

/** Default fallback waveform bars when audio analysis fails */
const FALLBACK_PEAKS = [
  0.25, 0.35, 0.5, 0.65, 0.45, 0.75, 0.55, 0.85, 0.6, 0.7, 0.9, 0.75,
  0.55, 0.8, 0.65, 0.88, 0.7, 0.82, 0.6, 0.75, 0.5, 0.65, 0.45, 0.35
];

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  seed = 1,
  peaks: customPeaks,
  barsCount = 28,
  height = 64,
  barWidth = 3,
  barGap = 3,
  barRadius = 2,
  activeColor = "#facc15",
  inactiveColor = "rgba(250, 204, 21, 0.25)",
  hoverColor = "#fde047",
  isPlaying = false,
  progress,
  currentTime,
  duration,
  onSeek,
  interactive = true,
  isLoading = false,
  hasError = false,
  className = "",
  style = {},
  align = "center",
  ariaLabel = "Audio waveform visualization",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);

  // Compute playback progress (0.0 to 1.0)
  const currentProgress = useMemo(() => {
    if (typeof progress === "number") {
      return Math.max(0, Math.min(1, progress));
    }
    if (typeof currentTime === "number" && typeof duration === "number" && duration > 0) {
      return Math.max(0, Math.min(1, currentTime / duration));
    }
    return 0;
  }, [progress, currentTime, duration]);

  // Generate or normalize peaks
  const peaks = useMemo(() => {
    if (hasError) return FALLBACK_PEAKS;
    try {
      if (customPeaks && customPeaks.length > 0) {
        return customPeaks.map((p) => {
          const val = p > 1 ? p / 100 : p;
          return Math.max(0.1, Math.min(1.0, val));
        });
      }
      return generateWaveformPeaks(seed, barsCount);
    } catch {
      return FALLBACK_PEAKS;
    }
  }, [seed, barsCount, customPeaks, hasError]);

  const effectiveCount = peaks.length;

  // Handle seeking / clicking on the waveform
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onSeek || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
      onSeek(clickRatio);
    },
    [interactive, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
      setHoverProgress(ratio);
      const index = Math.floor(ratio * effectiveCount);
      setHoverIndex(Math.min(effectiveCount - 1, Math.max(0, index)));
    },
    [interactive, effectiveCount]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
    setHoverProgress(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || !onSeek) return;
      const step = 0.05;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onSeek(Number(Math.min(1, currentProgress + step).toFixed(2)));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onSeek(Number(Math.max(0, currentProgress - step).toFixed(2)));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek(1);
      }
    },
    [interactive, onSeek, currentProgress]
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        role="progressbar"
        aria-busy="true"
        aria-label="Loading audio waveform"
        data-testid="waveform-loading"
        className={`audio-waveform audio-waveform-loading ${className}`}
        style={{
          display: "flex",
          alignItems: align === "bottom" ? "flex-end" : "center",
          justifyContent: "center",
          gap: barGap,
          height,
          width: "100%",
          padding: "0 8px",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {Array.from({ length: barsCount }).map((_, i) => (
          <div
            key={i}
            data-testid="waveform-loading-bar"
            style={{
              width: barWidth,
              height: `${25 + ((i * 17) % 50)}%`,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: barRadius,
              animation: `waveformShimmer 1.2s ease-in-out infinite alternate`,
              animationDelay: `${(i * 0.05) % 0.6}s`,
              transition: "height 0.2s ease",
            }}
          />
        ))}
      </div>
    );
  }

  // Graceful fallback if hasError
  if (hasError) {
    return (
      <div
        ref={containerRef}
        data-testid="waveform-fallback"
        role="img"
        aria-label="Fallback audio waveform"
        className={`audio-waveform audio-waveform-fallback ${className}`}
        style={{
          display: "flex",
          alignItems: align === "bottom" ? "flex-end" : "center",
          justifyContent: "center",
          gap: barGap,
          height,
          width: "100%",
          padding: "0 8px",
          boxSizing: "border-box",
          opacity: 0.65,
          ...style,
        }}
      >
        {FALLBACK_PEAKS.map((peak, i) => (
          <div
            key={i}
            data-testid="waveform-fallback-bar"
            style={{
              width: barWidth,
              height: `${peak * 100}%`,
              backgroundColor: inactiveColor,
              borderRadius: barRadius,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes waveformDance {
          0% { transform: scaleY(0.7); opacity: 0.85; }
          50% { transform: scaleY(1.18); opacity: 1; }
          100% { transform: scaleY(0.8); opacity: 0.9; }
        }
        @keyframes waveformShimmer {
          0% { opacity: 0.2; transform: scaleY(0.6); }
          100% { opacity: 0.7; transform: scaleY(1.1); }
        }
        .audio-waveform-bar {
          will-change: transform, height, background-color;
          transform-origin: ${align === "bottom" ? "bottom" : "center"};
        }
        .audio-waveform-bar-playing {
          animation-name: waveformDance;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      <div
        ref={containerRef}
        role={onSeek ? "slider" : "img"}
        tabIndex={interactive && onSeek ? 0 : undefined}
        aria-label={ariaLabel}
        aria-valuenow={onSeek ? Math.round(currentProgress * 100) : undefined}
        aria-valuemin={onSeek ? 0 : undefined}
        aria-valuemax={onSeek ? 100 : undefined}
        data-testid="audio-waveform"
        data-playing={isPlaying ? "true" : "false"}
        data-progress={currentProgress}
        onClick={handleSeek}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        className={`audio-waveform ${isPlaying ? "playing" : ""} ${className}`}
        style={{
          display: "flex",
          alignItems: align === "bottom" ? "flex-end" : "center",
          justifyContent: "center",
          gap: barGap,
          height,
          width: "100%",
          padding: "0 8px",
          boxSizing: "border-box",
          cursor: interactive && onSeek ? "pointer" : interactive ? "default" : "default",
          position: "relative",
          userSelect: "none",
          ...style,
        }}
      >
        {peaks.map((peak, i) => {
          const barProgress = (i + 0.5) / effectiveCount;
          const isPlayed = barProgress <= currentProgress;
          const isHovered = hoverIndex === i;
          const isNearHover = hoverIndex !== null && Math.abs(hoverIndex - i) <= 1;

          // Compute bar background color
          let bg = isPlayed ? activeColor : inactiveColor;
          if (isHovered && interactive) {
            bg = hoverColor;
          }

          // Active playing animation delay and duration per bar
          const animDuration = `${0.55 + ((i % 6) * 0.08)}s`;
          const animDelay = `${(i * 0.04) % 0.48}s`;

          // Scale factor for hover scaling
          let scaleTransform = "scaleY(1)";
          if (isHovered && interactive) {
            scaleTransform = "scaleY(1.28)";
          } else if (isNearHover && interactive) {
            scaleTransform = "scaleY(1.12)";
          }

          return (
            <div
              key={i}
              data-testid="waveform-bar"
              data-index={i}
              data-played={isPlayed ? "true" : "false"}
              data-hovered={isHovered ? "true" : "false"}
              className={`audio-waveform-bar ${isPlaying ? "audio-waveform-bar-playing" : ""} ${
                isPlayed ? "audio-waveform-bar-played" : "audio-waveform-bar-unplayed"
              }`}
              style={{
                width: barWidth,
                height: `${Math.round(peak * 100)}%`,
                minHeight: 4,
                maxHeight: "100%",
                backgroundColor: bg,
                borderRadius: barRadius,
                transform: isPlaying ? undefined : scaleTransform,
                transition: isPlaying
                  ? "background-color 0.15s ease"
                  : "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease, height 0.15s ease",
                animationDuration: isPlaying ? animDuration : undefined,
                animationDelay: isPlaying ? animDelay : undefined,
                boxShadow: isPlayed && isPlaying ? `0 0 6px ${activeColor}40` : undefined,
              }}
            />
          );
        })}
      </div>
    </>
  );
};

export default AudioWaveform;
