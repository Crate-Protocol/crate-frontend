import React, { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  X,
  ShoppingCart,
  Music,
} from "lucide-react";
import { AudioWaveform } from "./AudioWaveform";
import {
  useAudioPreview,
  PreviewTrack,
  formatTime,
  formatTimeRemaining,
  MAX_PREVIEW_DURATION,
} from "../hooks/useAudioPreview";

export interface AudioPreviewPlayerProps {
  /** Optional track override (defaults to globally active track from useAudioPreview) */
  track?: PreviewTrack | null;
  /** Whether player renders as a fixed floating dock at bottom of viewport */
  dock?: boolean;
  /** Custom className */
  className?: string;
  /** Custom inline style */
  style?: React.CSSProperties;
  /** Callback when quick buy button is clicked */
  onBuy?: (track: PreviewTrack) => void;
  /** Callback when player is closed / dismissed */
  onClose?: () => void;
  /** Whether to show waveform visualization (default true) */
  showWaveform?: boolean;
  /** Compact styling mode */
  compact?: boolean;
}

export const AudioPreviewPlayer: React.FC<AudioPreviewPlayerProps> = ({
  track: customTrack,
  dock = false,
  className = "",
  style = {},
  onBuy,
  onClose,
  showWaveform = true,
  compact = false,
}) => {
  const globalPreview = useAudioPreview();
  const navigate = useNavigate();

  // If a custom track is passed, we can use it; otherwise fallback to global active track
  const activeTrack = customTrack !== undefined ? customTrack : globalPreview.currentTrack;
  const isGlobal = customTrack === undefined || customTrack?.id === globalPreview.currentTrack?.id;

  const {
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    isLooping,
    play,
    pause,
    togglePlay,
    seekToRatio,
    skip,
    setVolume,
    toggleMute,
    toggleLoop,
    clearTrack,
  } = globalPreview;

  const handlePlayPause = useCallback(() => {
    if (!activeTrack) return;
    if (isGlobal) {
      togglePlay(activeTrack);
    } else {
      play(activeTrack);
    }
  }, [activeTrack, isGlobal, togglePlay, play]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      clearTrack();
    }
  }, [onClose, clearTrack]);

  const handleBuy = useCallback(() => {
    if (!activeTrack) return;
    if (onBuy) {
      onBuy(activeTrack);
    } else {
      navigate(`/sample/${activeTrack.id}`);
    }
  }, [activeTrack, onBuy, navigate]);

  // If dock mode and no active track, do not render dock
  if (dock && !activeTrack) {
    return null;
  }

  if (!activeTrack) {
    return (
      <div
        data-testid="audio-preview-empty"
        className={`audio-preview-empty ${className}`}
        style={{
          padding: 24,
          background: "#111",
          borderRadius: 16,
          border: "1px solid #222",
          textAlign: "center",
          color: "#737373",
          ...style,
        }}
      >
        <Music size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
        <p style={{ fontSize: 13, margin: 0 }}>No beat selected for preview</p>
      </div>
    );
  }

  const effectivePrice =
    activeTrack.price ??
    activeTrack.leasePrice ??
    (activeTrack.resalePrice ? activeTrack.resalePrice : 0);
  const tokenSymbol = activeTrack.tokenSymbol || "XLM";

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Floating Dock Variant
  if (dock) {
    return (
      <aside
        role="region"
        aria-label="Audio preview floating player"
        data-testid="audio-preview-dock"
        className={`audio-preview-dock ${className}`}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: "rgba(12, 12, 12, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.75)",
          padding: "10px 20px",
          color: "#fff",
          transition: "all 0.25s ease",
          ...style,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "240px 1fr auto",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* Left: Beat Metadata */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "linear-gradient(135deg, #222, #111)",
                border: "1px solid rgba(250, 204, 21, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: isPlaying ? "0 0 12px rgba(250, 204, 21, 0.25)" : undefined,
              }}
            >
              <Music
                size={20}
                color={isPlaying ? "#facc15" : "#737373"}
                style={{
                  transform: isPlaying ? "scale(1.1)" : "scale(1)",
                  transition: "transform 0.2s ease",
                }}
              />
            </div>

            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link
                  to={`/sample/${activeTrack.id}`}
                  data-testid="audio-preview-dock-title"
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                  }}
                  title={activeTrack.title}
                >
                  {activeTrack.title}
                </Link>
                <span
                  data-testid="audio-preview-clip-badge"
                  style={{
                    background: "rgba(250, 204, 21, 0.15)",
                    color: "#facc15",
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 999,
                    border: "1px solid rgba(250, 204, 21, 0.3)",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  30s Clip
                </span>
              </div>
              <p
                data-testid="audio-preview-dock-producer"
                style={{
                  fontSize: 11,
                  color: "#737373",
                  margin: "2px 0 0",
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeTrack.producer.length > 12
                  ? `${activeTrack.producer.slice(0, 6)}…${activeTrack.producer.slice(-4)}`
                  : activeTrack.producer}
              </p>
            </div>
          </div>

          {/* Center: Controls & Waveform */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minWidth: 0,
            }}
          >
            {/* Control buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Skip back 5s */}
              <button
                onClick={() => skip(-5)}
                aria-label="Skip backward 5 seconds"
                data-testid="audio-preview-skip-back"
                title="Skip back 5s (Left Arrow)"
                style={{
                  color: "#a3a3a3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: "50%",
                  transition: "color 0.15s",
                }}
              >
                <RotateCcw size={16} />
              </button>

              {/* Play / Pause button */}
              <button
                onClick={handlePlayPause}
                aria-label={isPlaying ? `Pause preview for ${activeTrack.title}` : `Play preview for ${activeTrack.title}`}
                data-testid="audio-preview-play-pause"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#facc15",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(250, 204, 21, 0.4)",
                  transition: "transform 0.15s, background-color 0.15s",
                }}
              >
                {isPlaying ? (
                  <Pause size={16} fill="#000" />
                ) : (
                  <Play size={16} fill="#000" style={{ marginLeft: 2 }} />
                )}
              </button>

              {/* Skip forward 5s */}
              <button
                onClick={() => skip(5)}
                aria-label="Skip forward 5 seconds"
                data-testid="audio-preview-skip-forward"
                title="Skip forward 5s (Right Arrow)"
                style={{
                  color: "#a3a3a3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: "50%",
                  transition: "color 0.15s",
                }}
              >
                <RotateCw size={16} />
              </button>

              {/* Loop Toggle */}
              <button
                onClick={toggleLoop}
                aria-label={isLooping ? "Disable looping 30s preview" : "Enable looping 30s preview"}
                data-testid="audio-preview-loop-button"
                data-looping={isLooping ? "true" : "false"}
                title={isLooping ? "Looping enabled" : "Loop 30s preview"}
                style={{
                  color: isLooping ? "#facc15" : "#737373",
                  background: isLooping ? "rgba(250, 204, 21, 0.12)" : "transparent",
                  border: isLooping ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 6px",
                  borderRadius: 6,
                  transition: "all 0.15s",
                  fontSize: 11,
                  fontWeight: 600,
                  gap: 4,
                }}
              >
                <Repeat size={14} />
                <span style={{ fontSize: 10 }}>Loop</span>
              </button>
            </div>

            {/* Waveform and Timers row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                maxWidth: 580,
              }}
            >
              <span
                data-testid="audio-preview-time-elapsed"
                style={{
                  fontSize: 11,
                  color: "#a3a3a3",
                  fontFamily: "monospace",
                  minWidth: 32,
                  textAlign: "right",
                }}
              >
                {formatTime(currentTime)}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {showWaveform ? (
                  <AudioWaveform
                    seed={activeTrack.id}
                    peaks={activeTrack.peaks}
                    barsCount={32}
                    height={28}
                    barWidth={3}
                    barGap={2}
                    isPlaying={isPlaying}
                    progress={progress}
                    duration={MAX_PREVIEW_DURATION}
                    onSeek={seekToRatio}
                    ariaLabel={`Preview waveform for ${activeTrack.title}`}
                  />
                ) : (
                  <input
                    type="range"
                    min="0"
                    max={MAX_PREVIEW_DURATION}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => seekToRatio(parseFloat(e.target.value) / MAX_PREVIEW_DURATION)}
                    aria-label="Seek preview audio"
                    data-testid="audio-preview-seek-slider"
                    style={{ width: "100%", accentColor: "#facc15", cursor: "pointer" }}
                  />
                )}
              </div>

              <span
                data-testid="audio-preview-time-remaining"
                title={`Clip limit: ${formatTime(duration)}`}
                style={{
                  fontSize: 11,
                  color: "#737373",
                  fontFamily: "monospace",
                  minWidth: 36,
                }}
              >
                {formatTimeRemaining(duration - currentTime)}
              </span>
            </div>
          </div>

          {/* Right: Volume, Price, Quick Buy & Close */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Volume control */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute preview" : "Mute preview"}
                data-testid="audio-preview-mute-button"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
                style={{
                  color: isMuted ? "#ef4444" : "#a3a3a3",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VolumeIcon size={16} />
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Preview volume"
                data-testid="audio-preview-volume-slider"
                style={{
                  width: 60,
                  accentColor: "#facc15",
                  cursor: "pointer",
                  height: 4,
                }}
              />
            </div>

            {/* Price tag */}
            {effectivePrice > 0 && (
              <div
                data-testid="audio-preview-dock-price"
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#facc15",
                  whiteSpace: "nowrap",
                }}
              >
                {effectivePrice} {tokenSymbol}
              </div>
            )}

            {/* Quick Buy Button */}
            <button
              onClick={handleBuy}
              aria-label={`Buy license for ${activeTrack.title}`}
              data-testid="audio-preview-buy-button"
              style={{
                background: "#facc15",
                color: "#000",
                border: "none",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <ShoppingCart size={14} />
              <span>Buy</span>
            </button>

            {/* Close / Dismiss button */}
            <button
              onClick={handleClose}
              aria-label="Close preview dock"
              data-testid="audio-preview-close-button"
              title="Close preview"
              style={{
                color: "#737373",
                padding: 6,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Standalone / Embedded Player Variant
  return (
    <div
      role="region"
      aria-label="Audio preview player"
      data-testid="audio-preview-player"
      className={`audio-preview-player ${className}`}
      style={{
        background: "#111",
        border: "1px solid #1f1f1f",
        borderRadius: 16,
        padding: compact ? 12 : 20,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...style,
      }}
    >
      {/* Header info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h4
              data-testid="audio-preview-title"
              style={{ margin: 0, fontSize: 16, fontWeight: 700 }}
            >
              {activeTrack.title}
            </h4>
            <span
              data-testid="audio-preview-clip-badge"
              style={{
                background: "rgba(250, 204, 21, 0.15)",
                color: "#facc15",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(250, 204, 21, 0.3)",
              }}
            >
              30s Clip
            </span>
          </div>
          <p
            data-testid="audio-preview-producer"
            style={{
              fontSize: 12,
              color: "#737373",
              margin: "3px 0 0",
              fontFamily: "monospace",
            }}
          >
            {activeTrack.producer}
          </p>
        </div>

        {effectivePrice > 0 && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#facc15" }}>
              {effectivePrice} {tokenSymbol}
            </span>
          </div>
        )}
      </div>

      {/* Waveform area */}
      {showWaveform && (
        <div style={{ background: "#0a0a0a", borderRadius: 12, padding: "8px 0" }}>
          <AudioWaveform
            seed={activeTrack.id}
            peaks={activeTrack.peaks}
            barsCount={32}
            height={48}
            isPlaying={isPlaying}
            progress={progress}
            duration={MAX_PREVIEW_DURATION}
            onSeek={seekToRatio}
            ariaLabel={`Waveform for ${activeTrack.title}`}
          />
        </div>
      )}

      {/* Timeline and Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => skip(-5)}
            aria-label="Skip backward 5 seconds"
            data-testid="audio-preview-skip-back"
            style={{ color: "#a3a3a3", padding: 4 }}
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handlePlayPause}
            aria-label={isPlaying ? `Pause preview for ${activeTrack.title}` : `Play preview for ${activeTrack.title}`}
            data-testid="audio-preview-play-pause"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#facc15",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(250, 204, 21, 0.4)",
            }}
          >
            {isPlaying ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" style={{ marginLeft: 2 }} />}
          </button>

          <button
            onClick={() => skip(5)}
            aria-label="Skip forward 5 seconds"
            data-testid="audio-preview-skip-forward"
            style={{ color: "#a3a3a3", padding: 4 }}
          >
            <RotateCw size={16} />
          </button>

          <button
            onClick={toggleLoop}
            aria-label={isLooping ? "Disable looping 30s preview" : "Enable looping 30s preview"}
            data-testid="audio-preview-loop-button"
            data-looping={isLooping ? "true" : "false"}
            style={{
              color: isLooping ? "#facc15" : "#737373",
              background: isLooping ? "rgba(250, 204, 21, 0.12)" : "transparent",
              border: isLooping ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid transparent",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Repeat size={14} />
            <span>Loop</span>
          </button>
        </div>

        {/* Timers */}
        <div style={{ fontSize: 12, fontFamily: "monospace", color: "#a3a3a3" }}>
          <span data-testid="audio-preview-time-elapsed">{formatTime(currentTime)}</span>
          <span style={{ color: "#525252", margin: "0 4px" }}>/</span>
          <span data-testid="audio-preview-duration">{formatTime(duration)}</span>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            data-testid="audio-preview-mute-button"
            style={{ color: isMuted ? "#ef4444" : "#a3a3a3", padding: 4 }}
          >
            <VolumeIcon size={16} />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Preview volume"
            data-testid="audio-preview-volume-slider"
            style={{ width: 64, accentColor: "#facc15", cursor: "pointer" }}
          />
        </div>
      </div>
    </div>
  );
};

export const AudioPreviewDock: React.FC<AudioPreviewPlayerProps> = (props) => (
  <AudioPreviewPlayer dock {...props} />
);

export default AudioPreviewPlayer;
