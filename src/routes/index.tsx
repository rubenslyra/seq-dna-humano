import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { slides } from "@/components/deck/slides";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";
import { ArrowLeft, ArrowRight, ScrollText } from "lucide-react";
import { PresenterAssistant } from "@/components/deck/presenter-assistant";
import { ignoreDeckKeys } from "@/lib/presenter/context";
import { useHandGesture } from "@/hooks/use-hand-gesture";
import { GestureSettingsModal } from "@/components/teleprompter/gestures/GestureSettingsModal";
import { GestureIndicator } from "@/components/teleprompter/gestures/GestureIndicator";
import type { GestureDirection } from "@/lib/teleprompter/gestures/types";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { slide?: number } => ({
    slide: Math.min(Math.max(Math.trunc(Number(s["slide"])) || 1, 1), slides.length),
  }),
  head: () => ({
    meta: [
      { title: "O Grande Salto – Genoma Humano" },
      {
        name: "description",
        content:
          "Do Projeto Genoma Humano à bioinformática: dados públicos, interpretação genética e áreas correlatas em uma apresentação animada.",
      },
      { property: "og:title", content: "O Grande Salto – Genoma Humano" },
      {
        property: "og:description",
        content:
          "Por que bioinformática, bioestatística e engenharia de dados se tornaram necessárias para compreender o genoma humano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Deck,
});

function Deck() {
  const slide = Route.useSearch().slide ?? 1;
  const navigate = useNavigate({ from: "/" });
  const i = slide - 1;
  const box = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const hideTimer = useRef<number>(0);
  const [scale, setScale] = useState(0.5);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const go = useCallback(
    (n: number) =>
      navigate({
        search: {
          slide: Math.min(Math.max(n, 0), slides.length - 1) + 1,
        },
        replace: true,
      }),
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

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${slide}/${slides.length} – ${slides[i]?.title ?? "Genoma Humano"}`;
    const k = (e: KeyboardEvent) => {
      if (ignoreDeckKeys(e.target, assistantOpen)) return;
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) {
        e.preventDefault();
        go(i + 1);
      }
      if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(i - 1);
      }
      if (e.key === "f") document.documentElement.requestFullscreen?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [slide, i, go, assistantOpen]);

  // Auto-hide nav after inactivity; reveal on mouse proximity to bottom edge
  useEffect(() => {
    const show = () => {
      setNavVisible(true);
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setNavVisible(false), 3000);
    };
    const onMove = (e: MouseEvent) => {
      if (e.clientY > window.innerHeight - 120) show();
    };
    const onTouch = () => show();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouch);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  useEffect(() => {
    const ls = window.localStorage.getItem("navState");
    if (ls) {
      const state = JSON.parse(ls);
      setNavVisible(state.visible ?? true);
    }
  }, []);

  useEffect(() => {
    const upd = () => {
      window.localStorage.setItem("navState", JSON.stringify({ visible: navVisible }));
    };
    const onVisibleChange = () => {
      upd();
    };
    if ("onvisibilitychange" in document)
      document.addEventListener("visibilitychange", onVisibleChange);
    else document.addEventListener("focusin", upd);
    window.addEventListener("blur", upd);
    return () => {
      if ("onvisibilitychange" in document)
        document.removeEventListener("visibilitychange", onVisibleChange);
      else document.removeEventListener("focusin", upd);
      window.removeEventListener("blur", upd);
    };
  }, [navVisible]);

  if (!slides) return null;

  return (
    <main className="flex h-screen flex-col bg-slide-bg text-slide-fg">
      <nav
        aria-label="Controles do slide"
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 border-b border-slide-line bg-slide-bg/95 backdrop-blur-sm px-3 py-3 text-sm sm:px-6"
      >
        <div className="flex items-center gap-2">
          <Button variant="deck" asChild>
            <Link to="/" aria-label="Voltar à apresentação">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="deg-rotate-n4"
              >
                <path d="M15 18l-6-6l6-6" />
              </svg>
              <span className="hidden sm:inline">Apresentação</span>
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
            {slide} / {slides.length}
          </span>
          <Button
            variant="deck"
            onClick={() => go(i + 1)}
            disabled={i === slides.length - 1}
            aria-label="Próximo slide"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="hidden md:flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: slides.length }, (_, idx) => (
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
          style={{ transform: `scaleX(0)`, transformOrigin: "left" }}
          aria-hidden
        />
        <div ref={box} className="tp-viewport h-full overflow-y-auto">
          <div
            className="mx-auto max-w-3xl px-6"
            style={{ paddingTop: "38vh", paddingBottom: "55vh" }}
          >
            <p className="text-slide-muted" style={{ fontSize: 44 * 0.5 }}>
              Slide {slide} de {slides.length}
            </p>
            <h1
              className="font-display text-slide-fg"
              style={{ fontSize: 44 * 1.5, lineHeight: 1.1 }}
            >
              {slides[i]?.title ?? "Genoma Humano"}
            </h1>
            <div className="mt-8" style={{ fontSize: 44, lineHeight: 1.55 }}>
              {(slides[i]?.paragraphs ?? []).map((p, k) =>
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
              style={{ fontSize: 44 * 0.5 }}
            >
              {slides[i]?.ref ?? ""}
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
              min={1}
              max={12}
              step={1}
              value={3}
              className="w-28"
              style={{ accentColor: "var(--slide-primary)" }}
              aria-label="Velocidade de rolagem"
            />
            <span className="tabular-nums text-slide-fg">3</span>
          </label>
          <div className="flex items-center gap-1 text-xs text-slide-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" aria-hidden />
            <Button
              variant="deck"
              size="sm"
              onClick={() => setFontPx((f) => Math.max(28, f - 4))}
              aria-label="Diminuir fonte"
            >
              A-
            </Button>
            <span className="tabular-nums text-slide-fg min-w-[2ch] text-center">{44}</span>
            <Button
              variant="deck"
              size="sm"
              onClick={() => setFontPx((f) => Math.min(72, f + 4))}
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
            {playing && !gesturePaused ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="6" width="18" height="12" />
                <path d="M7 6L12 12L17 6" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="6" width="18" height="12" />
                <path d="M7 18L12 12L17 18" />
              </svg>
            )}
            {playing && !gesturePaused
              ? "Pausar"
              : gesturePaused
                ? "Pausado (mão fechada)"
                : "Play"}
          </Button>
        </div>
      </footer>

      <GestureIndicator state={gesture.state} visible={gesture.ready} />
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
