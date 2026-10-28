import type { GestureDirection } from "./types";
import type { HandLandmark } from "./types";

export interface SwipeResult {
  direction: GestureDirection;
  triggered: boolean;
}

export function detectLateralSwipe(
  landmarks: HandLandmark[],
  previousX: number | null,
  threshold: number,
  mirror: boolean,
): { delta: number; currentX: number } | null {
  const wristX = landmarks[0]?.x;
  if (wristX == null) return null;
  if (previousX == null) return { delta: 0, currentX: wristX };

  const delta = wristX - previousX;
  const absDelta = Math.abs(delta);

  if (absDelta < threshold) return null;

  const effectiveDelta = mirror ? -delta : delta;
  return { delta: effectiveDelta, currentX: wristX };
}

export function getSwipeDirection(delta: number): GestureDirection {
  return delta > 0 ? "next" : "prev";
}
