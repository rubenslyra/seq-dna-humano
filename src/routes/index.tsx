import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { slides } from "@/components/deck/slides";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { slide?: number } => ({ slide: Math.min(Math.max(Math.trunc(Number(s["slide"])) || 1, 1), slides.length) }),
  head: () => ({
    meta: [
      { title: "O Grande Salto — Genoma Humano" },
      { name: "description", content: "Do Projeto Genoma Humano à bioinformática: dados públicos, interpretação genética e áreas correlatas em uma apresentação animada." },
      { property: "og:title", content: "O Grande Salto — Genoma Humano" },
      { property: "og:description", content: "Por que bioinformática, bioestatística e engenharia de dados se tornaram necessárias para compreender o genoma humano." },
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
  const [scale, setScale] = useState(0.5);
  const go = useCallback((n: number) => navigate({ search: { slide: Math.min(Math.max(n, 0), slides.length - 1) + 1 }, replace: true }), [navigate]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    document.title = `${slide}/${slides.length} — ${slides[i]?.title ?? "Genoma Humano"}`;
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) { e.preventDefault(); go(i + 1); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1); }
      if (e.key === "f") document.documentElement.requestFullscreen?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [slide, i, go]);

  const startX = useRef(0);
  const S = slides[i]?.C;
  if (!S) return null;
  return (
    <main className="flex h-screen flex-col bg-slide-bg text-slide-fg">
      <div ref={box} className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => { const touch = e.touches[0]; if (touch) startX.current = touch.clientX; }}
        onTouchEnd={(e) => { const touch = e.changedTouches[0]; if (!touch) return; const dx = touch.clientX - startX.current; if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1); }}>
        <div key={i} className="absolute left-1/2 top-1/2 -ml-[960px] -mt-[540px]" style={{ transform: `scale(${scale})` }}>
          <S />
        </div>
      </div>
      <nav aria-label="Navegação da apresentação" className="flex flex-wrap items-center justify-between gap-2 border-t border-slide-line px-3 py-3 text-sm sm:px-6">
        <Button variant="deck" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Anterior"><ArrowLeft /><span className="hidden sm:inline">Anterior</span></Button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slide-muted" aria-live="polite">{slide} / {slides.length}</span>
          <div className="flex flex-wrap justify-center">
          {slides.map((s, k) => (
            <Button variant="deckDot" key={s.title} aria-label={s.title} aria-current={k === i ? "step" : undefined} title={s.title} onClick={() => go(k)} className="h-6 w-4 p-0 sm:w-6">
              <span className={`h-2 w-2 rounded-full ${k === i ? "bg-slide-primary" : "bg-slide-line"}`} />
            </Button>
          ))}
          </div>
        </div>
        <Button variant="deckPrimary" onClick={() => go(i + 1)} disabled={i === slides.length - 1} aria-label="Próximo"><span className="hidden sm:inline">Próximo</span><ArrowRight /></Button>
      </nav>
    </main>
  );
}
