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
 * Filtro LERP (Linear Interpolation) para suavizar coordenadas do landmark.
 * Reduz jitter do MediaPipe mantendo responsividade.
 * @param current Valor atual do frame
 * @param previous Valor suavizado anterior
 * @param alpha Fator de interpolação (0.0-1.0). Menor = mais suave, mais latência.
 */
function lerp(current: number, previous: number | null, alpha: number): number {
  if (previous === null) return current;
  return previous + alpha * (current - previous);
}

/**
 * Detecta pose de mão aberta (todos os dedos estendidos).
 * Usada para gestos de swipe/navegação.
 */
function isOpenHand(landmarks: HandLandmark[]): boolean {
  // Dedos estendidos: ponta acima da articulação MCP (y menor em coords normalizadas)
  // Polegar: x distante do indicador (abdução)
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

  // Polegar aberto (distância horizontal do indicador)
  const thumbOpen = Math.abs(thumbTip.x - indexTip.x) > 0.05;
  // Outros dedos estendidos (tip acima do mcp em y invertido)
  const indexExtended = indexTip.y < indexMcp.y;
  const middleExtended = middleTip.y < middleMcp.y;
  const ringExtended = ringTip.y < ringMcp.y;
  const pinkyExtended = pinkyTip.y < pinkyMcp.y;

  return thumbOpen && indexExtended && middleExtended && ringExtended && pinkyExtended;
}

/**
 * Detecta pose de pinça (polegar e indicador próximos).
 * Usada para revelar UI oculta ou ações de seleção.
 */
function isPinch(landmarks: HandLandmark[], threshold = 0.05): boolean {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  if (!thumbTip || !indexTip) return false;

  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < threshold;
}

/**
 * Hook que integra MediaPipe Hands com filtro LERP para controle por gestos.
 * Carrega MediaPipe via CDN (safe para bundler estático), detecta poses discretas
 * (mão aberta para navegação, pinça para UI) e aplica suavização LERP ao tracking.
 *
 * Retorna controles para iniciar/parar câmera e atualizar configuração.
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
  const streamRef = useRef<MediaStream | null>(null);

  // Refs para filtro LERP e estado de gesto
  const smoothedXRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const lastPoseRef = useRef<"open" | "pinch" | "none">("none");
  const gestureStartXRef = useRef<number | null>(null);

  // Carrega config salva no mount (client-only)
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

  // Carrega scripts MediaPipe dinamicamente via CDN
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
    smoothedXRef.current = null;
    gestureStartXRef.current = null;
    lastPoseRef.current = "none";
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

    // Cria elemento de vídeo oculto para feed da câmera
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

    // Alpha do LERP: menor = mais suave. 0.3 é bom equilíbrio entre estabilidade e resposta.
    const LERP_ALPHA = 0.3;
    // Threshold de swipe em coordenadas normalizadas (0-1)
    const SWIPE_THRESHOLD = 0.08 / config.sensitivity;

    hands.onResults((results) => {
      const landmarks = results.multiHandLandmarks?.[0];
      if (!landmarks) {
        smoothedXRef.current = null;
        gestureStartXRef.current = null;
        lastPoseRef.current = "none";
        return;
      }

      // Usa landmark do dedo indicador (8) como ponto de tracking principal
      const tipX = landmarks[8]?.x;
      if (tipX == null) return;

      // Aplica filtro LERP para suavizar jitter
      const smoothedX = lerp(tipX, smoothedXRef.current, LERP_ALPHA);
      smoothedXRef.current = smoothedX;

      // Detecta pose atual
      const openHand = isOpenHand(landmarks);
      const pinch = isPinch(landmarks);

      const now = performance.now();

      // Lógica de gesto com mão aberta (swipe para navegação)
      if (openHand && !pinch) {
        if (lastPoseRef.current !== "open") {
          // Transição para mão aberta: inicia tracking de swipe
          gestureStartXRef.current = smoothedX;
          lastPoseRef.current = "open";
        } else if (gestureStartXRef.current !== null) {
          // Calcula delta desde início do gesto
          const delta = smoothedX - gestureStartXRef.current;

          if (Math.abs(delta) > SWIPE_THRESHOLD) {
            if (now - lastTriggerRef.current < config.cooldownMs) return;
            lastTriggerRef.current = now;

            // Mirror inverte direção para câmera frontal
            const effectiveDelta = config.mirror ? -delta : delta;
            const dir: GestureDirection = effectiveDelta > 0 ? "next" : "prev";

            if (config.soundEnabled) playPageTurnSound();
            onGesture(dir);

            // Reseta tracking após trigger para evitar múltiplos disparos
            gestureStartXRef.current = smoothedX;
          }
        }
      } else if (pinch) {
        // Pinça detectada: pode ser usada para revelar UI (futuro)
        if (lastPoseRef.current !== "pinch") {
          lastPoseRef.current = "pinch";
          gestureStartXRef.current = null;
          // TODO: dispatch evento de "ui-reveal" quando implementado
        }
      } else {
        // Mão fechada ou perdida: reseta estado
        lastPoseRef.current = "none";
        gestureStartXRef.current = null;
      }
    });

    handsRef.current = hands;
    setActive(true);
    setReady(true);

    // Envia frames em loop via requestAnimationFrame
    const isActive = { current: true };
    const sendFrame = async () => {
      if (!isActive.current) return;
      try {
        await hands.send({ image: video! });
      } catch {
        // Frame perdido — continua
      }
      rafRef.current = requestAnimationFrame(sendFrame);
    };
    rafRef.current = requestAnimationFrame(sendFrame);

    // Guarda referência para cleanup
    (stop as unknown as { _cleanup?: () => void })._cleanup = () => {
      isActive.current = false;
    };
  }, [loadScripts, config, onGesture, stop]);

  // Cleanup no unmount
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