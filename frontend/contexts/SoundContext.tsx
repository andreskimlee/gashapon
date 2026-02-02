"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Sound file paths
const SOUNDS = {
  backgroundMusic: "/sound/background_music.mp3",
  buttonPress: "/sound/button_press.wav",
  clawAscend: "/sound/claw_ascend.wav",
  clawMove: "/sound/claw_move.mp3",
  lose: "/sound/lose.wav",
  navPress: "/sound/nav_press.wav",
} as const;

type SoundName = keyof typeof SOUNDS;

interface SoundContextType {
  /** Whether sound is enabled */
  isSoundEnabled: boolean;
  /** Toggle sound on/off */
  toggleSound: () => void;
  /** Enable sound (useful for first user interaction) */
  enableSound: () => void;
  /** Play a sound effect */
  playSound: (name: Exclude<SoundName, "backgroundMusic">) => void;
  /** Start playing background music (call after user interaction) */
  startBackgroundMusic: () => void;
  /** Stop background music */
  stopBackgroundMusic: () => void;
  /** Whether background music is currently playing */
  isBackgroundMusicPlaying: boolean;
}

const SoundContext = createContext<SoundContextType | null>(null);

const STORAGE_KEY = "gashapon-sound-enabled";
const VOLUME_BACKGROUND_MUSIC = 0.3;
const VOLUME_SFX = 0.3;

export function SoundProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage, default to true
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const [isBackgroundMusicPlaying, setIsBackgroundMusicPlaying] =
    useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Audio refs
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const sfxCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Initialize audio elements on mount
  useEffect(() => {
    // Create background music audio element
    const bgMusic = new Audio(SOUNDS.backgroundMusic);
    bgMusic.loop = true;
    bgMusic.volume = VOLUME_BACKGROUND_MUSIC;
    // Use 'auto' to leverage browser preload hints from <link rel="preload">
    bgMusic.preload = "auto";
    backgroundMusicRef.current = bgMusic;

    // Preload all sound effects with metadata first for faster initial load
    Object.entries(SOUNDS).forEach(([name, path]) => {
      if (name !== "backgroundMusic") {
        const audio = new Audio(path);
        // 'auto' for commonly used sounds, browser will cache them
        audio.preload = "auto";
        audio.volume = VOLUME_SFX;
        sfxCacheRef.current.set(name, audio);
      }
    });

    // Cleanup on unmount
    return () => {
      backgroundMusicRef.current?.pause();
      backgroundMusicRef.current = null;
      sfxCacheRef.current.clear();
    };
  }, []);

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isSoundEnabled));
  }, [isSoundEnabled]);

  // Handle sound enabled/disabled state changes
  useEffect(() => {
    if (!backgroundMusicRef.current) return;

    if (isSoundEnabled && hasUserInteracted && isBackgroundMusicPlaying) {
      backgroundMusicRef.current.play().catch(() => {
        // Autoplay blocked, wait for user interaction
      });
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [isSoundEnabled, hasUserInteracted, isBackgroundMusicPlaying]);

  // Listen for first user interaction to enable autoplay
  useEffect(() => {
    const handleInteraction = () => {
      setHasUserInteracted(true);
      // Auto-start background music after first interaction if sound is enabled
      if (isSoundEnabled && backgroundMusicRef.current) {
        setIsBackgroundMusicPlaying(true);
        backgroundMusicRef.current.play().catch(() => {});
      }
    };

    // Listen for common interaction events
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => !prev);
  }, []);

  const enableSound = useCallback(() => {
    setIsSoundEnabled(true);
    setHasUserInteracted(true);
  }, []);

  const playSound = useCallback(
    (name: Exclude<SoundName, "backgroundMusic">) => {
      if (!isSoundEnabled) return;

      const cachedAudio = sfxCacheRef.current.get(name);
      if (cachedAudio) {
        // Clone the audio to allow overlapping sounds
        const audio = cachedAudio.cloneNode() as HTMLAudioElement;
        audio.volume = VOLUME_SFX;
        audio.play().catch(() => {
          // Autoplay blocked
        });
      }
    },
    [isSoundEnabled],
  );

  const startBackgroundMusic = useCallback(() => {
    setIsBackgroundMusicPlaying(true);
    if (isSoundEnabled && backgroundMusicRef.current && hasUserInteracted) {
      backgroundMusicRef.current.play().catch(() => {
        // Autoplay blocked
      });
    }
  }, [isSoundEnabled, hasUserInteracted]);

  const stopBackgroundMusic = useCallback(() => {
    setIsBackgroundMusicPlaying(false);
    backgroundMusicRef.current?.pause();
  }, []);

  return (
    <SoundContext.Provider
      value={{
        isSoundEnabled,
        toggleSound,
        enableSound,
        playSound,
        startBackgroundMusic,
        stopBackgroundMusic,
        isBackgroundMusicPlaying,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}
