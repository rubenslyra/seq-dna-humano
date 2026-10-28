import { useCallback, useEffect, useRef, useState } from "react";
import {
  type GestureConfig,
  type GestureDirection,
  DEFAULT_GESTURE_CONFIG,
  loadGestureConfig,
  saveGestureConfig,
  playPageTurnSound,
} from "./hand-gesture";

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandResults {
  multiHandLandmarks?: HandLandmark[][];
}

interface HandsInstance {
  setOptions: (o: Record<string, unknown>) => void;
  onResults: (cb: (r: HandResults) => void) => void;
  send: (i: { image: HTMLVideoElement }) => Promise<void>;
  close: () => Promise<void>;
}

interface MediaPipeWindow {
  Hands?: new (opts: Record<string, unknown>) => HandsInstance;
}

export type IndicatorState = "idle" | "action" | "blocked";

function lerp(current: number, previous: number | null, alpha: number): number {
  if (previous === null) return current;
  return previous + alpha * (current - previous);
}

function isOpenHand(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middleMcp = landmarks[9];
  const ringTip = landmarks[16];
  const ringMcp = landmarks[13];
  const pinkyTip = landmarks[20];
  const pinkyMcp = landmarks[17];

  if (!thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) return false;
  if (!thumbMcp || !indexMcp || !middleMcp || !ringMcp || !pinkyMcp) return false;

  const thumbOpen = Math.abs(thumbTip.x - indexTip.x) > 0.05;
  const indexExtended = indexTip.y < indexMcp.y;
  const middleExtended = middleTip.y < middleMcp.y;
  const ringExtended = ringTip.y < ringMcp.y;
  const pinkyExtended = pinkyTip.y < pinkyMcp.y;

  return thumbOpen && indexExtended && middleExtended && ringExtended && pinkyExtended;
}

export function useHandGesture(
  onGesture: (dir: GestureDirection) => void,
  canNavigate: (dir: GestureDirection) => boolean,
) {
  const [config, setConfigState] = useState<GestureConfig>(DEFAULT_GESTURE_CONFIG);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [indicator, setIndicator] = useState<IndicatorState>("idle");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const smoothedXRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const gestureStartXRef = useRef<number | null>(null);
  const handDetectedRef = useRef(false);
  const indicatorTimerRef = useRef<number>(0);

  useEffect(() => {
    setConfigState(loadGestureConfig());
  }, []);

  const setConfig = useCallback((next: Partial<GestureConfig>) => {
    setConfigState((prev) => {
      const merged = { ...prev, ...next };
      saveGestureConfig(merged);
      return merged;
    });
  }, []);

  const flashIndicator = useCallback((state: "action" | "blocked") => {
    clearTimeout(indicatorTimerRef.current);
    setIndicator(state);
    indicatorTimerRef.current = window.setTimeout(() => {
      setIndicator(handDetectedRef.current ? "idle" : "idle");
    }, 600);
  }, []);

  const loadScripts = useCallback(async (): Promise<boolean> => {
    if ((window as Record<string, unknown>).__mpHandsLoaded) return true;
    try {
      const scripts = [
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js",
      ];
      for (const src of scripts) {
        if (document.querySelector(`script[src="${src}"]`)) continue;
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = src;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      (window as Record<string, unknown>).__mpHandsLoaded = true;
      return true;
    } catch {
      setError("Não foi possível carregar o MediaPipe. Verifique sua conexão.");
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(indicatorTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (handsRef.current && typeof (handsRef.current as { close?: () => Promise<void> }).close === "function") {
      (handsRef.current as { close: () => Promise<void> }).close().catch(() => {});
    }
    handsRef.current = null;
    smoothedXRef.current = null;
    gestureStartXRef.current = null;
    handDetectedRef.current = false;
    setActive(false);
    setReady(false);
    setIndicator("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const ok = await loadScripts();
    if (!ok) return;

    const mp = window as unknown as MediaPipeWindow;
    if (!mp.Hands) {
      setError("MediaPipe não carregou corretamente.");
      return;
    }

    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.style.display = "none";
      document.body.appendChild(video);
      videoRef.current = video;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
    } catch {
      setError("Câmera não disponível. Verifique as permissões do navegador.");
      return;
    }

    const hands = new mp.Hands({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
    }) as HandsInstance;

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    const LERP_ALPHA = 0.3;
    const SWIPE_THRESHOLD = 0.08 / config.sensitivity;

    hands.onResults((results) => {
      const landmarks = results.multiHandLandmarks?.[0];
      if (!landmarks) {
        smoothedXRef.current = null;
        gestureStartXRef.current = null;
        handDetectedRef.current = false;
        setIndicator("idle");
        return;
      }

      const tipX = landmarks[8]?.x;
      if (tipX == null) return;

      const smoothedX = lerp(tipX, smoothedXRef.current, LERP_ALPHA);
      smoothedXRef.current = smoothedX;

      const openHand = isOpenHand(landmarks);
      const now = performance.now();

      if (openHand) {
        if (!handDetectedRef.current) {
          handDetectedRef.current = true;
          setIndicator("idle");
        }

        if (gestureStartXRef.current === null) {
          gestureStartXRef.current = smoothedX;
        } else {
          const delta = smoothedX - gestureStartXRef.current;

          if (Math.abs(delta) > SWIPE_THRESHOLD) {
            if (now - lastTriggerRef.current < config.cooldownMs) return;
            lastTriggerRef.current = now;

            const effectiveDelta = config.mirror ? -delta : delta;
            const dir: GestureDirection = effectiveDelta > 0 ? "next" : "prev";

            if (!canNavigate(dir)) {
              flashIndicator("blocked");
              gestureStartXRef.current = smoothedX;
              return;
            }

            if (config.soundEnabled) playPageTurnSound();
            onGesture(dir);
            flashIndicator("action");
            gestureStartXRef.current = smoothedX;
          }
        }
      } else {
        handDetectedRef.current = false;
        gestureStartXRef.current = null;
        setIndicator("idle");
      }
    });

    handsRef.current = hands;
    setActive(true);
    setReady(true);

    const isActive = { current: true };
    const sendFrame = async () => {
      if (!isActive.current) return;
      try {
        await hands.send({ image: video! });
      } catch {
        // frame perdido
      }
      rafRef.current = requestAnimationFrame(sendFrame);
    };
    rafRef.current = requestAnimationFrame(sendFrame);

    (stop as unknown as { _cleanup?: () => void })._cleanup = () => {
      isActive.current = false;
    };
  }, [loadScripts, config, onGesture, stop, canNavigate, flashIndicator]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(indicatorTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current?.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
    };
  }, []);

  return {
    config,
    setConfig,
    active,
    ready,
    error,
    indicator,
    start,
    stop,
  };
}