/**
 * MediaPipe Hands integration for teleprompter gesture control.
 * Loads MediaPipe via CDN to stay compatible with static bundlers (GitHub Pages / Lovable).
 * Generates page-turn sound synthetically via Web Audio API — no external audio files.
 */

// MediaPipe types (minimal subset needed)
interface MediaPipeHands {
  setOptions: (opts: Record<string, unknown>) => void;
  onResults: (cb: (results: HandResults) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => Promise<void>;
}

interface HandResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
}

export type GestureDirection = "next" | "prev";

export interface GestureConfig {
  enabled: boolean;
  sensitivity: number; // 0.5–2.0 multiplier
  cooldownMs: number;
  mirror: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  enabled: false,
  sensitivity: 1.0,
  cooldownMs: 800,
  mirror: true,
  soundEnabled: true,
};

const STORAGE_KEY = "tp-gesture-config";

export function loadGestureConfig(): GestureConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GESTURE_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GESTURE_CONFIG, ...parsed };
  } catch {
    return DEFAULT_GESTURE_CONFIG;
  }
}

export function saveGestureConfig(config: GestureConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
}

/**
 * Synthetic page-turn sound using Web Audio API.
 * Short noise burst with bandpass filter to simulate paper sliding.
 * No external files, no metadata concerns, works offline.
 */
let audioCtx: AudioContext | null = null;

export function playPageTurnSound(): void {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const ctx = audioCtx;
    const now = ctx.currentTime;
    const duration = 0.12;

    // White noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to shape the noise into a "swish"
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 0.8;

    // Gain envelope: quick attack, fast decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);
  } catch {
    // Audio not available — fail silently
  }
}

/**
 * Detects horizontal swipe gestures from hand landmarks.
 * Uses index finger tip (landmark 8) movement relative to wrist (landmark 0).
 * Returns "next" or "prev" based on direction, respecting mirror setting.
 */
export function detectSwipeGesture(
  landmarks: Array<{ x: number; y: number; z: number }>,
  prevX: number | null,
  threshold: number,
  mirror: boolean,
): { direction: GestureDirection; x: number } | null {
  // Index finger tip = landmark 8
  const tipX = landmarks[8]?.x;
  if (tipX == null) return null;

  if (prevX == null) return { direction: "next", x: tipX };

  const delta = tipX - prevX;
  const absDelta = Math.abs(delta);

  if (absDelta < threshold) return null;

  // Mirror flips direction because front-facing camera mirrors horizontally
  const effectiveDelta = mirror ? -delta : delta;
  const direction: GestureDirection = effectiveDelta > 0 ? "next" : "prev";

  return { direction, x: tipX };
}

/**
 * Loads MediaPipe Hands script dynamically from CDN.
 * Returns the Hands constructor or null if loading fails.
 */
export async function loadMediaPipeHands(): Promise<typeof import("@mediapipe/hands") | null> {
  // Check if already loaded
  if ((window as unknown as Record<string, unknown>).__mediapipe_hands_loaded) {
    return (window as unknown as Record<string, { Hands: unknown }>).__mediapipe_hands as unknown as typeof import("@mediapipe/hands");
  }

  try {
    // Load via dynamic import from CDN — works with static bundlers
    const hands = await import("https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js" as string);
    (window as unknown as Record<string, unknown>).__mediapipe_hands_loaded = true;
    (window as unknown as Record<string, unknown>).__mediapipe_hands = hands;
    return hands as unknown as typeof import("@mediapipe/hands");
  } catch {
    console.warn("[HandGesture] Failed to load MediaPipe Hands from CDN");
    return null;
  }
}