export type GestureState = "idle" | "action" | "blocked" | "paused";

export type GestureDirection = "next" | "prev";

export interface GestureConfig {
  enabled: boolean;
  sensitivity: number; // 0.5 - 2.0
  cooldownMs: number;
  actionFlashMs: number;
  mirror: boolean;
  soundEnabled: boolean;
  showIndicator: boolean;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  enabled: false,
  sensitivity: 1.0,
  cooldownMs: 800,
  actionFlashMs: 600,
  mirror: true,
  soundEnabled: true,
  showIndicator: true,
};

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}
