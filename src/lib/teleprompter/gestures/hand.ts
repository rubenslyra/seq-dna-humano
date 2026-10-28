import type { HandLandmark } from "./types";

export function isFist(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  if (!thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) return false;
  if (!indexMcp || !middleMcp || !ringMcp || !pinkyMcp) return false;

  const indexClosed = indexTip.y > indexMcp.y - 0.02;
  const middleClosed = middleTip.y > middleMcp.y - 0.02;
  const ringClosed = ringTip.y > ringMcp.y - 0.02;
  const pinkyClosed = pinkyTip.y > pinkyMcp.y - 0.02;

  return indexClosed && middleClosed && ringClosed && pinkyClosed;
}

export function isOpenHand(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  if (!thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) return false;
  if (!indexMcp || !middleMcp || !ringMcp || !pinkyMcp) return false;

  const indexExtended = indexTip.y < indexMcp.y - 0.01;
  const middleExtended = middleTip.y < middleMcp.y - 0.01;
  const ringExtended = ringTip.y < ringMcp.y - 0.01;
  const pinkyExtended = pinkyTip.y < pinkyMcp.y - 0.01;

  return indexExtended && middleExtended && ringExtended && pinkyExtended && !isFist(landmarks);
}

export function getHandCenterX(landmarks: HandLandmark[]): number | null {
  const wrist = landmarks[0];
  if (!wrist) return null;
  return wrist.x;
}
