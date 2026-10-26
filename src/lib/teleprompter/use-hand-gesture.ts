import { useCallback, useEffect, useRef, useState } from "react";
import {
  type GestureConfig,
  type GestureDirection,
  DEFAULT_GESTURE_CONFIG,
  loadGestureConfig,
  saveGestureConfig,
  playPageTurnSound,
} from "./hand-gesture";

// Named types to avoid rolldown parsing issues with inline generics
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

interface CameraInstance {
  start: () => Promise<void>;
  stop: () => void;
}

interface MediaPipeWindow {
  Hands?: new (opts: Record<string, unknown>) => HandsInstance;
  Camera?: new (el: HTMLVideoElement, opts: Record<string, unknown>) => CameraInstance;
}

/**
 * Hook that integrates MediaPipe Hands for gesture-based teleprompter control.
 * Loads MediaPipe via CDN script tags (static-bundler safe), detects horizontal
 * swipes with the index finger, and plays a synthetic page-turn sound.
 *
 * Returns controls to start/stop the camera and update configuration.
 */
export function useHandGesture(onGesture: (dir: GestureDirection) => void) {
  const [config, setConfigState] = useState<GestureConfig>(DEFAULT_GESTURE_CONFIG);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const prevXRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Load saved config on mount (client-only)
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

  // Dynamically load MediaPipe scripts from CDN
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (handsRef.current && typeof (handsRef.current as { close?: () => Promise<void> }).close === "function") {
      (handsRef.current as { close: () => Promise<void> }).close().catch(() => {});
    }
    handsRef.current = null;
    prevXRef.current = null;
    setActive(false);
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const ok = await loadScripts();
    if (!ok) return;

    const mp = window as unknown as MediaPipeWindow;
    if (!mp.Hands || !mp.Camera) {
      setError("MediaPipe não carregou corretamente.");
      return;
    }

    // Create hidden video element for camera feed
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

    hands.onResults((results) => {
      const landmarks = results.multiHandLandmarks?.[0];
      if (!landmarks) {
        prevXRef.current = null;
        return;
      }

      const tipX = landmarks[8]?.x;
      if (tipX == null) return;

      const prev = prevXRef.current;
      prevXRef.current = tipX;
      if (prev == null) return;

      const delta = tipX - prev;
      const threshold = 0.04 / config.sensitivity;
      if (Math.abs(delta) < threshold) return;

      const now = performance.now();
      if (now - lastTriggerRef.current < config.cooldownMs) return;
      lastTriggerRef.current = now;

      // Mirror flips direction for front-facing camera
      const effectiveDelta = config.mirror ? -delta : delta;
      const dir: GestureDirection = effectiveDelta > 0 ? "next" : "prev";

      if (config.soundEnabled) playPageTurnSound();
      onGesture(dir);
    });

    handsRef.current = hands;
    setActive(true);
    setReady(true);

    // Send frames in a loop
    const sendFrame = async () => {
      if (!active && !ready) return;
      try {
        await hands.send({ image: video! });
      } catch {
        // Frame dropped — continue
      }
      rafRef.current = requestAnimationFrame(sendFrame);
    };
    rafRef.current = requestAnimationFrame(sendFrame);
  }, [loadScripts, config, onGesture, active, ready]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
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
    start,
    stop,
    videoRef,
    canvasRef,
  };
}