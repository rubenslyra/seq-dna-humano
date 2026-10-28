import { DEFAULT_GESTURE_CONFIG, type GestureConfig } from "./types";

const STORAGE_KEY = "tp-gesture-config-v2";

export function loadGestureConfig(): GestureConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GESTURE_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GESTURE_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_GESTURE_CONFIG };
  }
}

export function saveGestureConfig(config: GestureConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
}
