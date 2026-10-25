import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { slides } from "@/components/deck/slides";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { slide?: number } => ({ slide: Math.min(Math.max(Number(s["slide"]) || 1, 1), 9) }),
  head: () => ({
    meta: [
      { title: "O Grande Salto — Genoma Humano" },
      { name: "description", content: "Deck animado: do Projeto Genoma Humano ao genoma completo, com 17 fontes." },
      { property: "og:title", content: "O Grande Salto — Genoma Humano" },
      { property: "og:description", content: "Do Projeto Genoma Humano ao genoma completo, com datas e fontes oficiais." },
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
  const go = (n: number) => navigate({ search: { slide: Math.min(Math.max(n, 0), slides.length - 1) + 1 }, replace: true });

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    document.title = `${slide}/${slides.length} — ${slides[i]!.title}`;
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) go(i + 1);
      if (["ArrowLeft", "PageUp"].includes(e.key)) go(i - 1);
      if (e.key === "f") document.documentElement.requestFullscreen?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const startX = useRef(0);
  const S = slides[i]!.C;
  return (
    <main className="flex h-screen flex-col bg-slide-bg text-slide-fg">
      <div ref={box} className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => (startX.current = e.touches[0]!.clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0]!.clientX - startX.current; if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1); }}>
        <div key={i} className="absolute left-1/2 top-1/2 -ml-[960px] -mt-[540px]" style={{ transform: `scale(${scale})` }}>
          <S />
        </div>
      </div>
      <nav className="flex items-center justify-between gap-4 border-t border-slide-line px-6 py-3 text-sm">
        <button onClick={() => go(i - 1)} disabled={i === 0} className="rounded-full border border-slide-line px-4 py-1.5 disabled:opacity-30">← Anterior</button>
        <div className="flex gap-2">
          {slides.map((s, k) => (
            <button key={s.title} aria-label={s.title} onClick={() => go(k)}
              className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-slide-primary" : "w-2 bg-slide-line"}`} />
          ))}
        </div>
        <button onClick={() => go(i + 1)} disabled={i === slides.length - 1} className="rounded-full bg-slide-primary px-4 py-1.5 font-semibold text-slide-bg disabled:opacity-30">Próximo →</button>
      </nav>
    </main>
  );
}
