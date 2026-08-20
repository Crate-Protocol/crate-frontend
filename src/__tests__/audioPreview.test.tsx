import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  useAudioPreview,
  AudioPreviewProvider,
  formatTime,
  formatTimeRemaining,
  MAX_PREVIEW_DURATION,
  PreviewTrack,
} from "../hooks/useAudioPreview";
import { AudioPreviewPlayer, AudioPreviewDock } from "../components/AudioPreviewPlayer";
import { SampleCard } from "../components/SampleCard";

const mockTrack = {
  id: 1,
  title: "Midnight Waves",
  producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  genre: "Trap",
  bpm: 140,
  leasePrice: 25,
  premiumPrice: 150,
  exclusivePrice: 800,
  tokenSymbol: "XLM",
};

const mockTrack2 = {
  id: 2,
  title: "Lagos Summer",
  producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",
  genre: "Afrobeats",
  bpm: 105,
  leasePrice: 30,
  premiumPrice: 200,
  exclusivePrice: 1200,
  tokenSymbol: "XLM",
};

describe("Time Formatting Helpers", () => {
  it("formats seconds to mm:ss format", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(15)).toBe("0:15");
    expect(formatTime(30)).toBe("0:30");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(NaN)).toBe("0:00");
  });

  it("formats remaining seconds with leading minus sign", () => {
    expect(formatTimeRemaining(30)).toBe("-0:30");
    expect(formatTimeRemaining(15)).toBe("-0:15");
    expect(formatTimeRemaining(0)).toBe("-0:00");
    expect(formatTimeRemaining(-5)).toBe("-0:00");
  });
});

describe("30-Second Clip Cap Enforcement & Playback Logic (useAudioPreview)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enforces strict 30-second duration constant", () => {
    expect(MAX_PREVIEW_DURATION).toBe(30);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    expect(result.current.duration).toBe(30);
  });

  it("advances simulated playback time up to 30 seconds and stops automatically when loop=false", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    act(() => {
      result.current.play(mockTrack);
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTrack?.title).toBe("Midnight Waves");

    // Advance 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.currentTime).toBeCloseTo(10, 0);
    expect(result.current.progress).toBeCloseTo(10 / 30, 1);
    expect(result.current.isPlaying).toBe(true);

    // Advance beyond 30s preview limit (21 more seconds -> total 31s)
    act(() => {
      vi.advanceTimersByTime(21000);
    });

    // Loop is false by default: playback must stop and reset to 0
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });

  it("loops back to 0:00 and continues playing when loop=true and 30s limit is reached", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    act(() => {
      result.current.play(mockTrack);
      result.current.toggleLoop();
    });

    expect(result.current.isLooping).toBe(true);
    expect(result.current.isPlaying).toBe(true);

    // Advance past 30s limit
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Should still be playing, looped back to beginning
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTime).toBeLessThan(5);
  });

  it("clamps seeking within [0, 30] seconds range", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    act(() => {
      result.current.play(mockTrack);
      result.current.seekToTime(15);
    });
    expect(result.current.currentTime).toBe(15);
    expect(result.current.progress).toBeCloseTo(0.5, 2);

    // Seek beyond 30s cap
    act(() => {
      result.current.seekToTime(45);
    });
    expect(result.current.currentTime).toBe(30);

    // Seek below 0s
    act(() => {
      result.current.seekToTime(-10);
    });
    expect(result.current.currentTime).toBe(0);

    // Seek by ratio
    act(() => {
      result.current.seekToRatio(0.75);
    });
    expect(result.current.currentTime).toBeCloseTo(22.5, 1);
  });

  it("skips 5 seconds forward and backward cleanly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    act(() => {
      result.current.play(mockTrack);
      result.current.seekToTime(10);
    });

    // Skip forward 5s
    act(() => {
      result.current.skip(5);
    });
    expect(result.current.currentTime).toBe(15);

    // Skip backward 5s
    act(() => {
      result.current.skip(-5);
    });
    expect(result.current.currentTime).toBe(10);

    // Skip backward beyond 0
    act(() => {
      result.current.skip(-20);
    });
    expect(result.current.currentTime).toBe(0);

    // Skip forward beyond 30s limit
    act(() => {
      result.current.skip(40);
    });
    expect(result.current.currentTime).toBe(30);
  });

  it("resets currentTime when switching to a different track", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    act(() => {
      result.current.play(mockTrack);
      result.current.seekToTime(20);
    });
    expect(result.current.currentTime).toBe(20);

    // Switch track
    act(() => {
      result.current.play(mockTrack2);
    });
    expect(result.current.currentTrack?.id).toBe(2);
    expect(result.current.currentTime).toBe(0);
  });
});

describe("Volume and Mute Controls", () => {
  it("adjusts volume between 0 and 1 and manages mute state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPreviewProvider>{children}</AudioPreviewProvider>
    );
    const { result } = renderHook(() => useAudioPreview(), { wrapper });

    expect(result.current.volume).toBe(0.8);
    expect(result.current.isMuted).toBe(false);

    // Change volume
    act(() => {
      result.current.setVolume(0.4);
    });
    expect(result.current.volume).toBe(0.4);
    expect(result.current.isMuted).toBe(false);

    // Set volume to 0 auto-mutes
    act(() => {
      result.current.setVolume(0);
    });
    expect(result.current.isMuted).toBe(true);

    // Toggle mute restores previous volume
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);
    expect(result.current.volume).toBe(0.4);

    // Toggle mute again
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);
  });
});

describe("Keyboard Shortcuts & Accessibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("toggles play/pause with Space key", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    const playPauseBtn = screen.getByTestId("audio-preview-play-pause");
    expect(playPauseBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");

    // Press Space
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(playPauseBtn).toHaveAttribute("aria-label", "Pause preview for Midnight Waves");

    // Press Space again to pause
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(playPauseBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");
  });

  it("toggles mute with 'M' key", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    const muteBtn = screen.getByTestId("audio-preview-mute-button");
    expect(muteBtn).toHaveAttribute("aria-label", "Mute preview");

    // Press 'm'
    fireEvent.keyDown(window, { key: "m" });
    expect(muteBtn).toHaveAttribute("aria-label", "Unmute preview");

    // Press 'M' to unmute
    fireEvent.keyDown(window, { key: "M" });
    expect(muteBtn).toHaveAttribute("aria-label", "Mute preview");
  });

  it("skips backward and forward with ArrowLeft and ArrowRight keys", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    const timeElapsed = screen.getByTestId("audio-preview-time-elapsed");
    expect(timeElapsed.textContent).toBe("0:00");

    // ArrowRight jumps forward 5s
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(timeElapsed.textContent).toBe("0:05");

    // Another ArrowRight jumps to 10s
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(timeElapsed.textContent).toBe("0:10");

    // ArrowLeft jumps back to 5s
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(timeElapsed.textContent).toBe("0:05");
  });

  it("ignores keyboard shortcuts when typing in an input element", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <input data-testid="search-input" />
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    const input = screen.getByTestId("search-input");
    input.focus();

    const playPauseBtn = screen.getByTestId("audio-preview-play-pause");
    expect(playPauseBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");

    // Press Space inside input
    fireEvent.keyDown(input, { code: "Space", key: " " });
    // Should NOT have started playback
    expect(playPauseBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");
  });
});

describe("AudioPreviewDock & AudioPreviewPlayer Component Rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render dock when no track is selected", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={null}>
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("audio-preview-dock")).not.toBeInTheDocument();
  });

  it("renders dock with beat metadata, waveform, 30s clip badge, and price", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("audio-preview-dock")).toBeInTheDocument();
    expect(screen.getByTestId("audio-preview-dock-title")).toHaveTextContent("Midnight Waves");
    expect(screen.getByTestId("audio-preview-clip-badge")).toHaveTextContent("30s Clip");
    expect(screen.getByTestId("audio-preview-dock-price")).toHaveTextContent("25 XLM");
    expect(screen.getByTestId("audio-waveform")).toBeInTheDocument();
    expect(screen.getByTestId("audio-preview-buy-button")).toBeInTheDocument();
  });

  it("triggers buy callback or navigation on quick buy button click", () => {
    const handleBuy = vi.fn();
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <AudioPreviewDock onBuy={handleBuy} />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    const buyBtn = screen.getByTestId("audio-preview-buy-button");
    fireEvent.click(buyBtn);
    expect(handleBuy).toHaveBeenCalledWith(mockTrack);
  });

  it("dismisses / closes preview dock when close button is clicked", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider initialTrack={mockTrack}>
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("audio-preview-dock")).toBeInTheDocument();

    const closeBtn = screen.getByTestId("audio-preview-close-button");
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("audio-preview-dock")).not.toBeInTheDocument();
  });

  it("renders standalone AudioPreviewPlayer cleanly", () => {
    render(
      <MemoryRouter>
        <AudioPreviewPlayer track={mockTrack} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("audio-preview-player")).toBeInTheDocument();
    expect(screen.getByTestId("audio-preview-title")).toHaveTextContent("Midnight Waves");
    expect(screen.getByTestId("audio-preview-time-elapsed")).toHaveTextContent("0:00");
    expect(screen.getByTestId("audio-preview-duration")).toHaveTextContent("0:30");
  });
});

describe("SampleCard and Global AudioPreview Synchronization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coordinates SampleCard play button with global floating preview dock", () => {
    render(
      <MemoryRouter>
        <AudioPreviewProvider>
          <SampleCard {...mockTrack} />
          <AudioPreviewDock />
        </AudioPreviewProvider>
      </MemoryRouter>
    );

    // Initially dock is not visible
    expect(screen.queryByTestId("audio-preview-dock")).not.toBeInTheDocument();

    // Click play on SampleCard
    const cardPlayBtn = screen.getByTestId("sample-card-play-button");
    fireEvent.click(cardPlayBtn);

    // Global dock should now appear with this track active and playing
    expect(screen.getByTestId("audio-preview-dock")).toBeInTheDocument();
    expect(screen.getByTestId("audio-preview-dock-title")).toHaveTextContent("Midnight Waves");
    expect(screen.getByTestId("audio-preview-play-pause")).toHaveAttribute(
      "aria-label",
      "Pause preview for Midnight Waves"
    );

    // Advance 15 seconds
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getByTestId("audio-preview-time-elapsed")).toHaveTextContent("0:15");

    // Pause via global dock play/pause button
    const dockPlayPauseBtn = screen.getByTestId("audio-preview-play-pause");
    fireEvent.click(dockPlayPauseBtn);

    // Both card and dock should reflect paused state
    expect(cardPlayBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");
    expect(dockPlayPauseBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");
  });
});
