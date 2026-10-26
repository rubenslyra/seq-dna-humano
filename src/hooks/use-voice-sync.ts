import { useCallback, useEffect, useRef, useState } from "react";
import scriptData from "@/lib/presenter/script.json";

/**
 * Últimas N palavras do roteiro que disparam o avanço automático.
 * Quando o reconhecimento de voz detecta essas palavras consecutivas,
 * o slide avança automaticamente (modo teleprompter).
 */
const TRIGGER_WORD_COUNT = 5;

/**
 * Extrai as últimas N palavras de um texto normalizado.
 * Remove pontuação e converte para lowercase para comparação fuzzy.
 */
function getLastWords(text: string, count: number): string[] {
  const words = text
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"'`]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(-count);
}

/**
 * Normaliza texto removendo acentos e caracteres especiais para comparação.
 * "coração" → "coracao", "não" → "nao"
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:!?()[\]{}"'`]/g, "")
    .trim();
}

interface VoiceSyncState {
  /** Reconhecimento ativo e ouvindo */
  listening: boolean;
  /** Navegador suporta Web Speech API */
  supported: boolean;
  /** Erro de permissão ou inicialização */
  error: string | null;
  /** Último texto reconhecido (para debug/UI) */
  transcript: string;
}

interface VoiceSyncControls {
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * Hook de sincronização por voz usando Web Speech API.
 *
 * Detecta quando o apresentador fala as últimas palavras do bloco de narração
 * do slide atual e dispara automaticamente o avanço para o próximo slide.
 *
 * @param currentSlide Índice do slide atual (0-indexed)
 * @param onAdvance Callback disparado quando deve avançar o slide
 * @param enabled Se false, o hook não inicia reconhecimento mesmo se start() for chamado
 */
export function useVoiceSync(
  currentSlide: number,
  onAdvance: () => void,
  enabled = true,
): VoiceSyncState & VoiceSyncControls {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const triggerWordsRef = useRef<string[]>([]);
  const hasAdvancedRef = useRef(false);

  // Atualiza palavras-gatilho quando o slide muda
  useEffect(() => {
    const entry = scriptData[currentSlide];
    if (!entry) {
      triggerWordsRef.current = [];
      return;
    }
    // Concatena todos os parágrafos e extrai as últimas N palavras
    const fullText = entry.paragraphs.join(" ");
    triggerWordsRef.current = getLastWords(fullText, TRIGGER_WORD_COUNT);
    // Reseta flag de avanço ao trocar de slide
    hasAdvancedRef.current = false;
  }, [currentSlide]);

  // Verifica suporte ao montar
  useEffect(() => {
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setSupported(typeof SR === "function");
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Pode já estar parado
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!enabled) return;

    const SR =
      ((window as unknown as Record<string, unknown>).SpeechRecognition as
        | (new () => SpeechRecognition)
        | undefined) ||
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as
        | (new () => SpeechRecognition)
        | undefined);

    if (!SR) {
      setError("Web Speech API não suportada neste navegador.");
      return;
    }

    // Para instância anterior se existir
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setError(null);
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Permissão de microfone negada.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Erro no reconhecimento: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Coleta todo o texto reconhecido (final + interim)
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      const currentTranscript = (finalTranscript + interimTranscript).trim();
      setTranscript(currentTranscript);

      // Verifica se as palavras-gatilho foram faladas
      if (hasAdvancedRef.current) return; // Já avançou neste slide
      if (triggerWordsRef.current.length === 0) return;

      const normalizedSpoken = normalizeForMatch(currentTranscript);
      const triggerPhrase = triggerWordsRef.current
        .map((w) => normalizeForMatch(w))
        .join(" ");

      // Match fuzzy: verifica se a frase-gatilho aparece no final do texto falado
      if (normalizedSpoken.endsWith(triggerPhrase) || normalizedSpoken.includes(triggerPhrase)) {
        hasAdvancedRef.current = true;
        onAdvance();
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      setError("Falha ao iniciar reconhecimento de voz.");
      console.error("[VoiceSync] Start error:", e);
    }
  }, [enabled, onAdvance]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    listening,
    supported,
    error,
    transcript,
    start,
    stop,
    toggle,
  };
}