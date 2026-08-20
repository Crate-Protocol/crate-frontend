import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

export const MAX_PREVIEW_DURATION = 30; // Strictly 30-second cap for previews

export interface PreviewTrack {
  id: number | string;
  title: string;
  producer: string;
  genre?: string;
  bpm?: number;
  audioUrl?: string;
  price?: number;
  leasePrice?: number;
  premiumPrice?: number;
  exclusivePrice?: number;
  tokenSymbol?: string;
  isExclusive?: boolean;
  resalePrice?: number;
  ipfs_cid?: string;
  peaks?: number[];
}

export interface AudioPreviewContextType {
  currentTrack: PreviewTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  play: (track?: PreviewTrack) => void;
  pause: () => void;
  togglePlay: (track?: PreviewTrack) => void;
  seek: (value: number, isRatio?: boolean) => void;
  seekToRatio: (ratio: number) => void;
  seekToTime: (seconds: number) => void;
  skip: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setIsMuted: (muted: boolean) => void;
  toggleLoop: () => void;
  setIsLooping: (looping: boolean | ((prev: boolean) => boolean)) => void;
  stop: () => void;
  clearTrack: () => void;
  formatTime: (seconds: number) => string;
  timeRemaining: number;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimeRemaining(remainingSeconds: number): string {
  if (isNaN(remainingSeconds) || remainingSeconds < 0) return "-0:00";
  return `-${formatTime(remainingSeconds)}`;
}

export const AudioPreviewContext = createContext<AudioPreviewContextType | null>(null);

export interface AudioPreviewProviderProps {
  children: React.ReactNode;
  initialTrack?: PreviewTrack | null;
  enableKeyboardShortcuts?: boolean;
}

export function AudioPreviewProvider({
  children,
  initialTrack = null,
  enableKeyboardShortcuts = true,
}: AudioPreviewProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<PreviewTrack | null>(initialTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;
  const previousVolumeRef = useRef(0.8);

  const duration = MAX_PREVIEW_DURATION; // 30s preview limit
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Audio element setup and cleanup
  useEffect(() => {
    if (currentTrack?.audioUrl) {
      const audio = new Audio(currentTrack.audioUrl);
      audio.volume = isMuted ? 0 : volume;
      audio.muted = isMuted;
      audioRef.current = audio;

      const handleTimeUpdate = () => {
        if (audio.currentTime >= MAX_PREVIEW_DURATION) {
          if (isLoopingRef.current) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            setCurrentTime(0);
          } else {
            audio.pause();
            audio.currentTime = 0;
            isPlayingRef.current = false;
            setIsPlaying(false);
            setCurrentTime(0);
          }
        } else {
          setCurrentTime(Math.min(MAX_PREVIEW_DURATION, audio.currentTime));
        }
      };

      const handleEnded = () => {
        if (isLoopingRef.current) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          setCurrentTime(0);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentTime(0);
        }
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      if (isPlaying) {
        audio.play().catch(() => {});
      }

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    } else {
      audioRef.current = null;
    }
  }, [currentTrack?.audioUrl]);

  // Simulated timer playback for mock/demo tracks without audioUrl or in test environments
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      const stepMs = 100;
      const stepSec = stepMs / 1000;

      interval = setInterval(() => {
        if (!isPlayingRef.current) {
          if (interval) clearInterval(interval);
          return;
        }

        // If native audio element is playing, sync from it
        if (audioRef.current && !isNaN(audioRef.current.currentTime) && audioRef.current.currentTime > 0) {
          if (audioRef.current.currentTime >= MAX_PREVIEW_DURATION) {
            if (isLoopingRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
              setCurrentTime(0);
            } else {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              isPlayingRef.current = false;
              if (interval) clearInterval(interval);
              setIsPlaying(false);
              setCurrentTime(0);
            }
          } else {
            setCurrentTime(Math.min(MAX_PREVIEW_DURATION, audioRef.current.currentTime));
          }
          return;
        }

        // Simulated timer update
        setCurrentTime((prev) => {
          if (!isPlayingRef.current) return prev;
          const next = prev + stepSec;
          if (next >= MAX_PREVIEW_DURATION) {
            if (isLoopingRef.current) {
              return 0;
            }
            isPlayingRef.current = false;
            if (interval) clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return Math.min(MAX_PREVIEW_DURATION, Number(next.toFixed(2)));
        });
      }, stepMs);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const play = useCallback((track?: PreviewTrack) => {
    if (track) {
      setCurrentTrack((prev) => {
        if (prev?.id !== track.id) {
          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
        }
        return track;
      });
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(
    (track?: PreviewTrack) => {
      if (track && track.id !== currentTrack?.id) {
        setCurrentTrack(track);
        setCurrentTime(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        isPlayingRef.current = true;
        setIsPlaying(true);
        return;
      }
      setIsPlaying((prev) => {
        const next = !prev;
        isPlayingRef.current = next;
        return next;
      });
    },
    [currentTrack]
  );

  const seekToTime = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(MAX_PREVIEW_DURATION, seconds));
    setCurrentTime(Number(clamped.toFixed(2)));
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  }, []);

  const seekToRatio = useCallback((ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const targetSeconds = clampedRatio * MAX_PREVIEW_DURATION;
    seekToTime(targetSeconds);
  }, [seekToTime]);

  const seek = useCallback(
    (value: number, isRatio: boolean = false) => {
      if (isRatio) {
        seekToRatio(value);
      } else {
        seekToTime(value);
      }
    },
    [seekToRatio, seekToTime]
  );

  const skip = useCallback(
    (seconds: number) => {
      setCurrentTime((prev) => {
        const next = Math.max(0, Math.min(MAX_PREVIEW_DURATION, prev + seconds));
        if (audioRef.current) {
          audioRef.current.currentTime = next;
        }
        return Number(next.toFixed(2));
      });
    },
    []
  );

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (clamped > 0) {
      previousVolumeRef.current = clamped;
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (prev) {
        // Unmute -> restore previous volume or 0.8
        setVolumeState(previousVolumeRef.current || 0.8);
        return false;
      } else {
        // Mute
        previousVolumeRef.current = volume || 0.8;
        return true;
      }
    });
  }, [volume]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      isLoopingRef.current = next;
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const clearTrack = useCallback(() => {
    stop();
    setCurrentTrack(null);
  }, [stop]);

  const progress = useMemo(() => {
    return Math.max(0, Math.min(1, currentTime / duration));
  }, [currentTime, duration]);

  const timeRemaining = useMemo(() => {
    return Math.max(0, duration - currentTime);
  }, [duration, currentTime]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      if (e.code === "Space" || e.key === " ") {
        // Spacebar toggles playback
        if (currentTrack) {
          e.preventDefault();
          togglePlay();
        }
      } else if (e.key === "m" || e.key === "M") {
        // M toggles mute
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        // ArrowLeft jumps back 5s
        e.preventDefault();
        skip(-5);
      } else if (e.key === "ArrowRight") {
        // ArrowRight jumps forward 5s
        e.preventDefault();
        skip(5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcuts, currentTrack, togglePlay, toggleMute, skip]);

  const value: AudioPreviewContextType = {
    currentTrack,
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
    seek,
    seekToRatio,
    seekToTime,
    skip,
    setVolume,
    toggleMute,
    setIsMuted,
    toggleLoop,
    setIsLooping,
    stop,
    clearTrack,
    formatTime,
    timeRemaining,
  };

  return React.createElement(AudioPreviewContext.Provider, { value }, children);
}

/**
 * Custom hook to consume the global audio preview player context,
 * or create an isolated audio preview instance if used without a provider.
 */
export function useAudioPreview(): AudioPreviewContextType {
  const context = useContext(AudioPreviewContext);
  if (context) {
    return context;
  }

  // Fallback standalone local state if hook is used without AudioPreviewProvider
  return useStandaloneAudioPreview();
}

/**
 * Isolated standalone audio preview hook
 */
function useStandaloneAudioPreview(): AudioPreviewContextType {
  const [currentTrack, setCurrentTrack] = useState<PreviewTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;
  const previousVolumeRef = useRef(0.8);
  const duration = MAX_PREVIEW_DURATION;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const stepMs = 100;
      const stepSec = stepMs / 1000;
      interval = setInterval(() => {
        if (!isPlayingRef.current) {
          if (interval) clearInterval(interval);
          return;
        }
        setCurrentTime((prev) => {
          if (!isPlayingRef.current) return prev;
          const next = prev + stepSec;
          if (next >= MAX_PREVIEW_DURATION) {
            if (isLoopingRef.current) return 0;
            isPlayingRef.current = false;
            if (interval) clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return Math.min(MAX_PREVIEW_DURATION, Number(next.toFixed(2)));
        });
      }, stepMs);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const play = useCallback((track?: PreviewTrack) => {
    if (track) {
      setCurrentTrack(track);
      setCurrentTime(0);
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback((track?: PreviewTrack) => {
    if (track && track.id !== currentTrack?.id) {
      setCurrentTrack(track);
      setCurrentTime(0);
      isPlayingRef.current = true;
      setIsPlaying(true);
      return;
    }
    setIsPlaying((p) => {
      const next = !p;
      isPlayingRef.current = next;
      return next;
    });
  }, [currentTrack]);

  const seekToTime = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(MAX_PREVIEW_DURATION, seconds));
    setCurrentTime(Number(clamped.toFixed(2)));
  }, []);

  const seekToRatio = useCallback((ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    seekToTime(clampedRatio * MAX_PREVIEW_DURATION);
  }, [seekToTime]);

  const seek = useCallback((value: number, isRatio = false) => {
    if (isRatio) seekToRatio(value);
    else seekToTime(value);
  }, [seekToRatio, seekToTime]);

  const skip = useCallback((seconds: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(MAX_PREVIEW_DURATION, prev + seconds)));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (clamped > 0) {
      previousVolumeRef.current = clamped;
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (prev) {
        setVolumeState(previousVolumeRef.current || 0.8);
        return false;
      } else {
        previousVolumeRef.current = volume || 0.8;
        return true;
      }
    });
  }, [volume]);

  const toggleLoop = useCallback(() => {
    setIsLooping((p) => {
      const next = !p;
      isLoopingRef.current = next;
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const clearTrack = useCallback(() => {
    stop();
    setCurrentTrack(null);
  }, [stop]);

  const progress = Math.max(0, Math.min(1, currentTime / duration));
  const timeRemaining = Math.max(0, duration - currentTime);

  return {
    currentTrack,
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
    seek,
    seekToRatio,
    seekToTime,
    skip,
    setVolume,
    toggleMute,
    setIsMuted,
    toggleLoop,
    setIsLooping,
    stop,
    clearTrack,
    formatTime,
    timeRemaining,
  };
}

export default useAudioPreview;
