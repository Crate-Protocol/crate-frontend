import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AudioWaveform, generateWaveformPeaks } from "../components/AudioWaveform";
import { SampleCard } from "../components/SampleCard";

describe("generateWaveformPeaks", () => {
  it("generates the requested number of bars", () => {
    const peaks28 = generateWaveformPeaks(1, 28);
    expect(peaks28).toHaveLength(28);

    const peaks24 = generateWaveformPeaks("sample-test", 24);
    expect(peaks24).toHaveLength(24);

    const peaks32 = generateWaveformPeaks(99, 32);
    expect(peaks32).toHaveLength(32);
  });

  it("produces normalized peak values within visual range [0.18, 0.95]", () => {
    const peaks = generateWaveformPeaks("test-seed", 30);
    peaks.forEach((peak) => {
      expect(peak).toBeGreaterThanOrEqual(0.18);
      expect(peak).toBeLessThanOrEqual(0.95);
    });
  });

  it("is deterministic: same seed yields identical waveforms, different seeds yield distinct waveforms", () => {
    const setA1 = generateWaveformPeaks("beat-alpha", 28);
    const setA2 = generateWaveformPeaks("beat-alpha", 28);
    const setB = generateWaveformPeaks("beat-beta", 28);

    expect(setA1).toEqual(setA2);
    expect(setA1).not.toEqual(setB);
  });
});

describe("AudioWaveform Component", () => {
  it("renders default 28 waveform bars cleanly", () => {
    render(<AudioWaveform seed="sample-1" />);

    const container = screen.getByTestId("audio-waveform");
    expect(container).toBeInTheDocument();

    const bars = screen.getAllByTestId("waveform-bar");
    expect(bars).toHaveLength(28);
  });

  it("renders custom bars count (e.g. 24 or 32 bars)", () => {
    const { rerender } = render(<AudioWaveform barsCount={24} />);
    expect(screen.getAllByTestId("waveform-bar")).toHaveLength(24);

    rerender(<AudioWaveform barsCount={32} />);
    expect(screen.getAllByTestId("waveform-bar")).toHaveLength(32);
  });

  it("renders explicit custom peaks when provided", () => {
    const customPeaks = [0.2, 0.5, 0.8, 1.0, 0.3];
    render(<AudioWaveform peaks={customPeaks} />);

    const bars = screen.getAllByTestId("waveform-bar");
    expect(bars).toHaveLength(5);
    expect(bars[0]).toHaveStyle({ height: "20%" });
    expect(bars[1]).toHaveStyle({ height: "50%" });
    expect(bars[2]).toHaveStyle({ height: "80%" });
  });

  describe("Playback Progress & Filling", () => {
    it("updates played vs unplayed bars based on direct progress prop", () => {
      render(<AudioWaveform barsCount={10} progress={0.5} activeColor="#facc15" inactiveColor="#222" />);

      const bars = screen.getAllByTestId("waveform-bar");
      expect(bars).toHaveLength(10);

      // Bars corresponding to ratio <= 0.5 should be marked played
      const playedBars = bars.filter((b) => b.getAttribute("data-played") === "true");
      const unplayedBars = bars.filter((b) => b.getAttribute("data-played") === "false");

      expect(playedBars).toHaveLength(5);
      expect(unplayedBars).toHaveLength(5);

      // Verify active background color applied to played bars
      playedBars.forEach((bar) => {
        expect(bar).toHaveStyle({ backgroundColor: "rgb(250, 204, 21)" });
      });
    });

    it("calculates progress dynamically from currentTime and duration", () => {
      render(<AudioWaveform barsCount={20} currentTime={15} duration={30} />);

      const bars = screen.getAllByTestId("waveform-bar");
      const playedBars = bars.filter((b) => b.getAttribute("data-played") === "true");

      // 15/30 = 0.5 -> 10 played bars out of 20
      expect(playedBars).toHaveLength(10);
    });

    it("handles 0% and 100% progress edge cases", () => {
      const { rerender } = render(<AudioWaveform barsCount={10} progress={0} />);
      let playedBars = screen.getAllByTestId("waveform-bar").filter((b) => b.getAttribute("data-played") === "true");
      expect(playedBars).toHaveLength(0);

      rerender(<AudioWaveform barsCount={10} progress={1.0} />);
      playedBars = screen.getAllByTestId("waveform-bar").filter((b) => b.getAttribute("data-played") === "true");
      expect(playedBars).toHaveLength(10);
    });
  });

  describe("Hover and Playing Animation States", () => {
    it("applies dynamic animation attributes and classes when isPlaying is true", () => {
      const { rerender } = render(<AudioWaveform isPlaying={false} />);
      const container = screen.getByTestId("audio-waveform");
      expect(container.getAttribute("data-playing")).toBe("false");
      expect(container).not.toHaveClass("playing");

      const bars = screen.getAllByTestId("waveform-bar");
      expect(bars[0]).not.toHaveClass("audio-waveform-bar-playing");

      rerender(<AudioWaveform isPlaying={true} />);
      expect(container.getAttribute("data-playing")).toBe("true");
      expect(container).toHaveClass("playing");

      const playingBars = screen.getAllByTestId("waveform-bar");
      playingBars.forEach((bar) => {
        expect(bar).toHaveClass("audio-waveform-bar-playing");
      });
    });

    it("responds to mouse movement for hover scaling", () => {
      render(<AudioWaveform barsCount={10} onSeek={vi.fn()} />);
      const container = screen.getByTestId("audio-waveform");

      // Mock getBoundingClientRect
      vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 60,
        bottom: 60,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Hover at 25% of width (index 2 out of 10)
      fireEvent.mouseMove(container, { clientX: 25 });

      const bars = screen.getAllByTestId("waveform-bar");
      expect(bars[2].getAttribute("data-hovered")).toBe("true");

      // Leave mouse
      fireEvent.mouseLeave(container);
      expect(bars[2].getAttribute("data-hovered")).toBe("false");
    });

    it("calls onSeek with normalized ratio when clicked", () => {
      const handleSeek = vi.fn();
      render(<AudioWaveform barsCount={20} onSeek={handleSeek} />);
      const container = screen.getByTestId("audio-waveform");

      vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        width: 200,
        height: 60,
        bottom: 60,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Click at midpoint (100px / 200px = 0.5)
      fireEvent.click(container, { clientX: 100 });
      expect(handleSeek).toHaveBeenCalledWith(0.5);

      // Click at 75%
      fireEvent.click(container, { clientX: 150 });
      expect(handleSeek).toHaveBeenCalledWith(0.75);
    });

    it("supports keyboard seeking for accessibility", () => {
      const handleSeek = vi.fn();
      render(<AudioWaveform progress={0.4} onSeek={handleSeek} />);
      const container = screen.getByRole("slider");

      fireEvent.keyDown(container, { key: "ArrowRight" });
      expect(handleSeek).toHaveBeenCalledWith(0.45);

      fireEvent.keyDown(container, { key: "ArrowLeft" });
      expect(handleSeek).toHaveBeenCalledWith(0.35);

      fireEvent.keyDown(container, { key: "Home" });
      expect(handleSeek).toHaveBeenCalledWith(0);

      fireEvent.keyDown(container, { key: "End" });
      expect(handleSeek).toHaveBeenCalledWith(1);
    });
  });

  describe("Fallback and Loading States", () => {
    it("renders loading skeleton bars when isLoading is true", () => {
      render(<AudioWaveform isLoading={true} barsCount={24} />);

      expect(screen.getByTestId("waveform-loading")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "true");
      expect(screen.getAllByTestId("waveform-loading-bar")).toHaveLength(24);
      expect(screen.queryByTestId("audio-waveform")).not.toBeInTheDocument();
    });

    it("renders graceful fallback waveform when hasError is true", () => {
      render(<AudioWaveform hasError={true} />);

      expect(screen.getByTestId("waveform-fallback")).toBeInTheDocument();
      const fallbackBars = screen.getAllByTestId("waveform-fallback-bar");
      expect(fallbackBars.length).toBeGreaterThan(0);
      expect(screen.queryByTestId("audio-waveform")).not.toBeInTheDocument();
    });
  });
});

describe("SampleCard Integration with AudioWaveform", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockSample = {
    id: 1,
    title: "Midnight Waves",
    producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    genre: "Trap",
    bpm: 140,
    leasePrice: 25,
    premiumPrice: 150,
    exclusivePrice: 800,
  };

  it("renders AudioWaveform replacing static bars", () => {
    render(
      <MemoryRouter>
        <SampleCard {...mockSample} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("audio-waveform")).toBeInTheDocument();
    expect(screen.getAllByTestId("waveform-bar")).toHaveLength(28);
    expect(screen.getByTestId("sample-card-play-button")).toBeInTheDocument();
  });

  it("toggles playback state and triggers animation on play button click", () => {
    const onPlayToggle = vi.fn();
    render(
      <MemoryRouter>
        <SampleCard {...mockSample} onPlayToggle={onPlayToggle} />
      </MemoryRouter>
    );

    const playBtn = screen.getByTestId("sample-card-play-button");
    expect(playBtn).toHaveAttribute("aria-label", "Play preview for Midnight Waves");

    // Click to start play
    fireEvent.click(playBtn);
    expect(onPlayToggle).toHaveBeenCalledWith(1, true);
    expect(playBtn).toHaveAttribute("aria-label", "Pause preview for Midnight Waves");
    expect(screen.getByTestId("audio-waveform")).toHaveClass("playing");

    // Advance time and check progress updates
    act(() => {
      vi.advanceTimersByTime(15000); // 15 seconds into 30s preview
    });

    const playedBars = screen.getAllByTestId("waveform-bar").filter((b) => b.getAttribute("data-played") === "true");
    expect(playedBars.length).toBeGreaterThan(10);

    // Click again to pause
    fireEvent.click(playBtn);
    expect(onPlayToggle).toHaveBeenCalledWith(1, false);
    expect(screen.getByTestId("audio-waveform")).not.toHaveClass("playing");
  });
});
