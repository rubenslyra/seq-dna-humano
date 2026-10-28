import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Presentation, Type } from "lucide-react";
import script from "@/lib/presenter/script.json";
import { Button } from "@/components/ui/button";
import { ignoreDeckKeys } from "@/lib/presenter/context";
import { useHandGesture } from "@/hooks/use-hand-gesture";
import { GestureSettingsModal } from "@/components/teleprompter/gestures/GestureSettingsModal";
import { GestureIndicator } from "@/components/teleprompter/gestures/GestureIndicator";
import type { GestureDirection } from "@/lib/teleprompter/gestures/types";
import { emitSlideChange, onSlideChange } from "@/lib/slide-sync-ws";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { slide?: number } => ({
    slide: Math.min(Math.max(Math.trunc(Number(s["slide"])) || 1, 1), script.length),
  }),
  head: () => ({
    meta: [
      { title: "Teleprompter â€“ O Grande Salto" },
      {
        name: "description",
        content:
          "Roteiro falado por slide em modo teleprompter, com velocidade e tamanho de fonte ajustÃ¡veis.",
      },
      { property: "og:title", content: "Teleprompter â€“ O Grande Salto" },
      {
        property: "og:description",
        content:
          "Roteiro falado por slide em modo teleprompter, com velocidade e tamanho de fonte ajustÃ¡veis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeleprompterPage,
});

const SPEED_MIN = 1;
const SPEED_MAX = 12;
const SPEED_STEP_PX = 30;
const FONT_MIN = 28;
const FONT_MAX = 72;

function TeleprompterPage() {
  const slide = Route.useSearch().slide ?? 1;
  const navigate = useNavigate({ from: "/teleprompter" });
  const i = slide - 1;
  const entry = script[i];
  const viewport = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [fontPx, setFontPx] = useState(44);
  const [progress, setProgress] = useState(0);
  const [gesturePaused, setGesturePaused] = useState(false);

  const go = useCallback(
    (n: number) => {
      navigate({
        search: { slide: Math.min(Math.max(n, 0), script.length - 1) + 1 },
        replace: true,
      });
    },
    [navigate],
  );

  const canNavigate = useCallback(
    (dir: GestureDirection) => {
      if (dir === "next") return i < script.length - 1;
      if (dir === "prev") return i > 0;
      return false;
    },
    [i],
  );

  const handleGesture = useCallback(
    (dir: GestureDirection) => {
      if (dir === "next") go(i + 1);
      else go(i - 1);
    },
    [i, go],
  );

  const gesture = useHandGesture(handleGesture, canNavigate, setGesturePaused);

  useEffect(() => {
    const unsub = onSlideChange((s) => {
      if (s !== slide) {
        navigate({ search: { slide: s }, replace: true });
      }
    });
    return unsub;
  }, [slide, navigate]);

  useEffect(() => {
    const s = Number(window.localStorage.getItem("tp-speed"));
    const f = Number(window.localStorage.getItem("tp-font"));
    if (s >= SPEED_MIN && s <= SPEED_MAX) setSpeed(s);
    if (f >= FONT_MIN && f <= FONT_MAX) setFontPx(f);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tp-speed", String(speed));
  }, [speed]);

  useEffect(() => {
    window.localStorage.setItem("tp-font", String(fontPx));
  }, [fontPx]);

  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = 0;
    setProgress(0);
  }, [slide]);

  useEffect(() => {
    if (!playing || gesturePaused) return;
    let raf = 0;
    let last: number | undefined;
    const step = (t: number) => {
      const el = viewport.current;
      if (!el) return;
      if (last !== undefined) {
        el.scrollTop += (speed * SPEED_STEP_PX * (t - last)) / 1000;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setPlaying(false);
          return;
        }
      }
      last = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, slide, gesturePaused]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (ignoreDeckKeys(e.target, false)) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!gesturePaused) setPlaying((p) => !p);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSpeed((s) => Math.min(SPEED_MAX, s + 1));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSpeed((s) => Math.max(SPEED_MIN, s - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(i + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(i - 1);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [i, go, gesturePaused]);

  const onScroll = () => {
    const el = viewport.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    setProgress(el.scrollTop / (el.scrollHeight - el.clientHeight));
  };

  if (!entry) return null;

  const showIndicator = gesture.active && gesture.ready && gesture.config.showIndicator;

  return (
    <main className="flex h-screen flex-col bg-slide-bg text-slide-fg">
      <nav
        aria-label="Controles do teleprompter"
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 border-b border-slide-line bg-slide-bg/95 backdrop-blur-sm px-3 py-3 text-sm sm:px-6"
      >
        <div className="flex items-center gap-2">
          <Button variant="deck" asChild>
            <Link to="/" aria-label="Voltar Ã  apresentaÃ§Ã£o">
              <Presentation />
              <span className="hidden sm:inline">ApresentaÃ§Ã£o</span>
            </Link>
          </Button>
          <Button
            variant="deck"
            onClick={() => go(i - 1)}
            disabled={i === 0}
            aria-label="Slide anterior"
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs text-slide-muted tabular-nums" aria-live="polite">
            {slide} / {script.length}
          </span>
          <Button
            variant="deck"
            onClick={() => go(i + 1)}
            disabled={i === script.length - 1}
            aria-label="PrÃ³ximo slide"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="hidden md:flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: script.length }, (_, idx) => (
            <span
              key={idx}
              className={`inline-block h-2 w-2 rounded-full transition-colors ${idx === i ? "bg-slide-primary" : "bg-slide-muted/40"}`}
            />
          ))}
        </div>
      </nav>

      <div className="relative flex-1 overflow-hidden pt-[52px] pb-[200px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2 bg-slide-primary"
          style={{ transform: `scaleX(${progress})`, transformOrigin: "left" }}
          aria-hidden
        />
        <div ref={viewport} onScroll={onScroll} className="tp-viewport h-full overflow-y-auto">
          <div
            className="mx-auto max-w-3xl px-6"
            style={{ paddingTop: "38vh", paddingBottom: "55vh" }}
          >
            <p className="text-slide-muted" style={{ fontSize: fontPx * 0.5 }}>
              Slide {entry.n} de {script.length}
            </p>
            <h1
              className="font-display text-slide-fg"
              style={{ fontSize: fontPx * 1.5, lineHeight: 1.1 }}
            >
              {entry.title}
            </h1>
            <div className="mt-8" style={{ fontSize: fontPx, lineHeight: 1.55 }}>
              {(entry.paragraphs ?? []).map((p, k) =>
                p.startsWith("[PAUSA") ? (
                  <p key={k} className="font-semibold text-slide-accent">
                    {p}
                  </p>
                ) : (
                  <p key={k} className="mb-6 text-slide-fg">
                    {p}
                  </p>
                ),
              )}
            </div>
            <p
              className="mt-12 border-t border-slide-line pt-4 text-slide-muted"
              style={{ fontSize: fontPx * 0.5 }}
            >
              {entry.ref}
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-x-0 top-0 h-24"
            style={{ background: "linear-gradient(to bottom, var(--slide-bg), transparent)" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-24"
            style={{ background: "linear-gradient(to top, var(--slide-bg), transparent)" }}
          />
          <div className="absolute inset-x-0 top-1/2 h-px bg-slide-primary/40" />
        </div>
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-50 border-t border-slide-line bg-slide-bg/95 backdrop-blur-sm px-3 pb-3 pt-2 text-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <label className="flex items-center gap-2 text-xs text-slide-muted">
            Velocidade
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-28"
              style={{ accentColor: "var(--slide-primary)" }}
              aria-label="Velocidade de rolagem"
            />
            <span className="tabular-nums text-slide-fg">{speed}</span>
          </label>
          <div className="flex items-center gap-1 text-xs text-slide-muted">
            <Type aria-hidden />
            <Button
              variant="deck"
              size="sm"
              onClick={() => setFontPx((f) => Math.max(FONT_MIN, f - 4))}
              aria-label="Diminuir fonte"
            >
              A-
            </Button>
            <span className="tabular-nums text-slide-fg min-w-[2ch] text-center">{fontPx}</span>
            <Button
              variant="deck"
              size="sm"
              onClick={() => setFontPx((f) => Math.min(FONT_MAX, f + 4))}
              aria-label="Aumentar fonte"
            >
              A+
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="deckPrimary"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pausar leitura" : "Iniciar leitura"}
            disabled={gesturePaused}
          >
            {playing && !gesturePaused ? <Pause /> : <Play />}
            {playing && !gesturePaused
              ? "Pausar"
              : gesturePaused
                ? "Pausado (mÃ£o fechada)"
                : "Play"}
          </Button>
        </div>
      </footer>

      <GestureIndicator state={gesture.state} visible={showIndicator} />
      <GestureSettingsModal
        config={gesture.config}
        active={gesture.active}
        ready={gesture.ready}
        error={gesture.error}
        onToggle={() => (gesture.active ? gesture.stop() : gesture.start())}
        onConfigChange={(patch) => gesture.setConfig(patch)}
      />
    </main>
  );
}

