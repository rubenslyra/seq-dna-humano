import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Presentation, Type } from "lucide-react";
import script from "@/lib/presenter/script.json";
import { Button } from "@/components/ui/button";
import { ignoreDeckKeys } from "@/lib/presenter/context";
import { useHandGesture } from "@/lib/teleprompter/use-hand-gesture";
import { GestureControls } from "@/components/teleprompter/gesture-controls";
import type { GestureDirection } from "@/lib/teleprompter/hand-gesture";

export const Route = createFileRoute("/teleprompter")({
  validateSearch: (s: Record<string, unknown>): { slide?: number } => ({
    slide: Math.min(Math.max(Math.trunc(Number(s["slide"])) || 1, 1), script.length),
  }),
  head: () => ({
    meta: [
      { title: "Teleprompter — O Grande Salto" },
      { name: "description", content: "Roteiro falado por slide em modo teleprompter, com velocidade e tamanho de fonte ajustáveis." },
      { property: "og:title", content: "Teleprompter — O Grande Salto" },
      { property: "og:description", content: "Roteiro falado por slide em modo teleprompter, com velocidade e tamanho de fonte ajustáveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeleprompterPage,
});

const SPEED_MIN = 1;
const SPEED_MAX = 12;
const SPEED_STEP_PX = 30; // px/s por nível
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

  const go = useCallback(
    (n: number) => {
      navigate({ search: { slide: Math.min(Math.max(n, 0), script.length - 1) + 1 }, replace: true });
    },
    [navigate],
  );

  // Gesture control integration
  const handleGesture = useCallback(
    (dir: GestureDirection) => {
      if (dir === "next") go(i + 1);
      else go(i - 1);
    },
    [i, go],
  );
  const gesture = useHandGesture(handleGesture);

  // Restaura preferências salvas apenas após a hidratação.
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

  // Reinicia a leitura ao trocar de slide.
  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = 0;
    setProgress(0);
  }, [slide]);

  // Rolar automaticamente com requestAnimationFrame.
  useEffect(() => {
    if (!playing) return;
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
  }, [playing, speed, slide]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (ignoreDeckKeys(e.target, false)) return;
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSpeed((s) => Math.min(SPEED_MAX, s + 1)); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSpeed((s) => Math.max(SPEED_MIN, s - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [i, go]);

  const onScroll = () => {
    const el = viewport.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    setProgress(el.scrollTop / (el.scrollHeight - el.clientHeight));
  };

  if (!entry) return null;

  return (
    <main className="flex h-screen flex-col bg-slide-bg text-slide-fg">
      <nav
        aria-label="Controles do teleprompter"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-slide-line px-3 py-3 text-sm sm:px-6"
      >
        <div className="flex items-center gap-2">
          <Button variant="deck" asChild>
            <Link to="/" aria-label="Voltar à apresentação">
              <Presentation />
              <span className="hidden sm:inline">Apresentação</span>
            </Link>
          </Button>
          <Button variant="deck" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Slide anterior">
            <ChevronLeft />
          </Button>
          <span className="text-xs text-slide-muted" aria-live="polite">
            Slide {slide} de {script.length}
          </span>
          <Button variant="deck" onClick={() => go(i + 1)} disabled={i === script.length - 1} aria-label="Próximo slide">
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            <Button variant="deck" size="sm" onClick={() => setFontPx((f) => Math.max(FONT_MIN, f - 4))} aria-label="Diminuir fonte">
              A−
            </Button>
            <Button variant="deck" size="sm" onClick={() => setFontPx((f) => Math.min(FONT_MAX, f + 4))} aria-label="Aumentar fonte">
              A+
            </Button>
          </div>
          <Button variant="deckPrimary" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pausar leitura" : "Iniciar leitura"}>
            {playing ? <Pause /> : <Play />}
            {playing ? "Pausar" : "Play"}
          </Button>
          <GestureControls
            config={gesture.config}
            active={gesture.active}
            ready={gesture.ready}
            error={gesture.error}
            onToggle={() => (gesture.active ? gesture.stop() : gesture.start())}
            onConfigChange={(patch) => gesture.setConfig(patch)}
          />
        </div>
      </nav>

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2 bg-slide-primary" style={{ transform: `scaleX(${progress})`, transformOrigin: "left" }} aria-hidden />
        <div
          ref={viewport}
          onScroll={onScroll}
          className="tp-viewport h-full overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl px-6" style={{ paddingTop: "38vh", paddingBottom: "55vh" }}>
            <p className="text-slide-muted" style={{ fontSize: fontPx * 0.5 }}>
              Slide {entry.n} de {script.length}
            </p>
            <h1 className="font-display text-slide-fg" style={{ fontSize: fontPx * 1.5, lineHeight: 1.1 }}>
              {entry.title}
            </h1>
            <div className="mt-8" style={{ fontSize: fontPx, lineHeight: 1.55 }}>
              {entry.paragraphs.map((p, k) =>
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
            <p className="mt-12 border-t border-slide-line pt-4 text-slide-muted" style={{ fontSize: fontPx * 0.5 }}>
              {entry.ref}
            </p>
          </div>
        </div>
        {/* Linha de leitura e fades, acima do texto */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-24" style={{ background: "linear-gradient(to bottom, var(--slide-bg), transparent)" }} />
          <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(to top, var(--slide-bg), transparent)" }} />
          <div className="absolute inset-x-0 top-1/2 h-px bg-slide-primary/40" />
        </div>
      </div>
    </main>
  );
}
