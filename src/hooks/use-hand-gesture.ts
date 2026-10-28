import { useCallback, useEffect, useRef, useState } from "react";
import { loadGestureConfig, saveGestureConfig } from "@/lib/teleprompter/gestures/config";
import {
  DEFAULT_GESTURE_CONFIG,
  type GestureConfig,
  type GestureDirection,
  type GestureState,
} from "@/lib/teleprompter/gestures/types";
import { isFist, isOpenHand } from "@/lib/teleprompter/gestures/hand";
import { detectLateralSwipe, getSwipeDirection } from "@/lib/teleprompter/gestures/detector";
import { playPageTurnSound } from "@/lib/teleprompter/hand-gesture";

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

function lerp(current: number, previous: number | null, alpha: number): number {
  if (previous === null) return current;
  return previous + alpha * (current - previous);
}

export function useHandGesture(
  onGesture: (dir: GestureDirection) => void,
  canNavigate: (dir: GestureDirection) => boolean,
  onPauseChange?: (paused: boolean) => void,
) {
  const [config, setConfigState] = useState<GestureConfig>(DEFAULT_GESTURE_CONFIG);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<GestureState>("idle");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<HandsInstance | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const smoothedXRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const gestureStartXRef = useRef<number | null>(null);
  const handDetectedRef = useRef(false);
  const pausedRef = useRef(false);
  const flashTimerRef = useRef<number>(0);

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

  const flash = useCallback(
    (s: "action" | "blocked") => {
      clearTimeout(flashTimerRef.current);
      setState(s);
      flashTimerRef.current = window.setTimeout(() => {
        if (pausedRef.current) {
          setState("paused");
        } else if (handDetectedRef.current) {
          setState("idle");
        } else {
          setState("idle");
        }
      }, config.actionFlashMs);
    },
    [config.actionFlashMs],
  );

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
    clearTimeout(flashTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close().catch(() => {});
      handsRef.current = null;
    }
    smoothedXRef.current = null;
    gestureStartXRef.current = null;
    handDetectedRef.current = false;
    pausedRef.current = false;
    setActive(false);
    setReady(false);
    setState("idle");
    onPauseChange?.(false);
  }, [onPauseChange]);

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

    const LERP_ALPHA = 0.25;
    const baseThreshold = 0.08 / config.sensitivity;

    hands.onResults((results) => {
      const landmarks = results.multiHandLandmarks?.[0];
      if (!landmarks) {
        smoothedXRef.current = null;
        gestureStartXRef.current = null;
        handDetectedRef.current = false;
        if (pausedRef.current) {
          pausedRef.current = false;
          onPauseChange?.(false);
          setState("idle");
        } else {
          setState("idle");
        }
        return;
      }

      const wristX = landmarks[0]?.x;
      if (wristX == null) return;

      const smoothedX = lerp(wristX, smoothedXRef.current, LERP_ALPHA);
      smoothedXRef.current = smoothedX;

      const fist = isFist(landmarks);
      const open = isOpenHand(landmarks);

      if (fist && !pausedRef.current) {
        pausedRef.current = true;
        onPauseChange?.(true);
        setState("paused");
        smoothedXRef.current = null;
        gestureStartXRef.current = null;
        handDetectedRef.current = false;
        return;
      }

      if (!fist && pausedRef.current) {
        pausedRef.current = false;
        onPauseChange?.(false);
        handDetectedRef.current = open;
        if (open) {
          setState("idle");
          gestureStartXRef.current = smoothedX;
        } else {
          setState("idle");
        }
        return;
      }

      if (pausedRef.current) {
        setState("paused");
        return;
      }

      if (open) {
        if (!handDetectedRef.current) {
          handDetectedRef.current = true;
          setState("idle");
        }

        if (gestureStartXRef.current === null) {
          gestureStartXRef.current = smoothedX;
        } else {
          const now = performance.now();
          const swipe = detectLateralSwipe(
            landmarks,
            gestureStartXRef.current,
            baseThreshold,
            config.mirror,
          );
          if (swipe && Math.abs(swipe.delta) >= baseThreshold) {
            if (now - lastTriggerRef.current < config.cooldownMs) {
              gestureStartXRef.current = smoothedX;
              return;
            }
            lastTriggerRef.current = now;
            const dir = getSwipeDirection(swipe.delta);

            if (!canNavigate(dir)) {
              flash("blocked");
              gestureStartXRef.current = smoothedX;
              return;
            }

            if (config.soundEnabled) playPageTurnSound();
            onGesture(dir);
            flash("action");
            gestureStartXRef.current = smoothedX;
          }
        }
      } else {
        handDetectedRef.current = false;
        gestureStartXRef.current = null;
        if (!pausedRef.current) setState("idle");
      }
    });

    handsRef.current = hands;
    setActive(true);
    setReady(true);

    const isActive = { current: true };
    const sendFrame = async () => {
      if (!isActive.current) return;
      try {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      } catch {
        // ignore frame errors
      }
      rafRef.current = requestAnimationFrame(sendFrame);
    };
    rafRef.current = requestAnimationFrame(sendFrame);

    (stop as unknown as { _cleanup?: () => void })._cleanup = () => {
      isActive.current = false;
    };
  }, [loadScripts, config, onGesture, stop, canNavigate, flash, onPauseChange]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(flashTimerRef.current);
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
    state,
    start,
    stop,
  };
}

export type {
  GestureState,
  GestureConfig,
  GestureDirection,
} from "@/lib/teleprompter/gestures/types";
