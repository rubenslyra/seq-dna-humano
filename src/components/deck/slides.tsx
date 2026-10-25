import type { CSSProperties, ReactNode } from "react";

const d = (i: number) => ({ "--i": i }) as CSSProperties;
const R = ({ n }: { n: string }) => <span className="slide-ref">[{n}]</span>;

function Frame({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <div className="slide-content flex flex-col">
      <p className="slide-kicker anim text-slide-primary" style={d(0)}>{kicker}</p>
      <h2 className="slide-title anim mt-5 max-w-[1500px]" style={d(1)}>{title}</h2>
      <div className="mt-14 flex-1">{children}</div>
    </div>
  );
}

function Card({ i, children, className = "" }: { i: number; children: ReactNode; className?: string }) {
  return (
    <div className={`anim rounded-3xl border border-slide-line bg-slide-surface p-10 ${className}`} style={d(i)}>
      {children}
    </div>
  );
}

function Helix() {
  return (
    <div className="absolute right-[140px] top-[150px] h-[780px] w-[300px]" style={{ perspective: 900 }}>
      <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", animation: "spin3d 14s linear infinite" }}>
        {Array.from({ length: 22 }).map((_, k) => (
          <div key={k} className="absolute left-0 right-0 flex items-center justify-between"
            style={{ top: k * 35, transform: `rotateY(${k * 24}deg)` }}>
            <span className="h-5 w-5 rounded-full bg-slide-primary" />
            <span className="mx-2 h-[3px] flex-1 bg-slide-line" />
            <span className="h-5 w-5 rounded-full bg-slide-accent" />
          </div>
        ))}
      </div>
    </div>
  );
}

const Cover = () => (
  <div className="slide-content flex flex-col justify-center">
    <Helix />
    <p className="slide-kicker anim text-slide-primary" style={d(0)}>Cientista + analista estatístico</p>
    <h1 className="slide-title-lg anim mt-8" style={d(1)}>O Grande<br /><em className="text-slide-primary">Salto</em></h1>
    <p className="slide-body-lg anim mt-10 max-w-[1050px] text-slide-muted" style={d(2)}>
      Do Projeto Genoma Humano ao primeiro genoma completo — com datas, números e fontes oficiais.
    </p>
    <div className="anim mt-14 flex gap-4" style={d(3)}>
      {["1990 → 2003 → 2022", "9 slides", "17 referências"].map((t) => (
        <span key={t} className="slide-chrome rounded-full border border-slide-line px-5 py-2 text-slide-muted">{t}</span>
      ))}
    </div>
  </div>
);

const milestones = [
  ["Out 1990", "Lançamento do HGP: meta 2005, ~US$ 3 bi.", "1,2"],
  ["26 jun 2000", "Anúncio na Casa Branca: Clinton, Blair, Collins e Venter.", "3"],
  ["15–16 fev 2001", "Publicação simultânea na Nature e na Science.", "4"],
  ["14 abr 2003", "HGP completo, 2 anos antes do prazo; 50 anos da dupla-hélice.", "1,5"],
  ["31 mar 2022", "T2T-CHM13: primeiro genoma sem lacunas (Science).", "6,7"],
  ["Ago 2023", "Cromossomo Y completo (Nature): +30 mi de bases.", "8"],
];
const Timeline = () => (
  <Frame kicker="Registro oficial · linha do tempo" title="Os marcos com data marcada">
    <div className="relative mt-24">
      <div className="anim-grow absolute left-0 right-0 top-[11px] h-[3px] bg-slide-line" />
      <div className="grid grid-cols-6 gap-8">
        {milestones.map(([date, text, ref], k) => (
          <div key={date} className="anim" style={d(k + 2)}>
            <span className={`block h-6 w-6 rounded-full ${k >= 4 ? "bg-slide-accent" : "bg-slide-primary"}`} />
            <p className="slide-subtitle mt-8 !text-[34px]">{date}</p>
            <p className="slide-caption mt-4 text-slide-muted">{text}<R n={ref} /></p>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

const Scale = () => (
  <Frame kicker="Visão do analista estatístico" title="A escala do desafio">
    <div className="grid grid-cols-3 gap-8">
      {[
        ["~3,2 bi", "pares de bases (A, T, C, G) no genoma humano", "1,6"],
        ["6 países", "EUA, Reino Unido, Japão, França, Alemanha e China", "5"],
        ["~92%", "de cobertura em 2003 — os ~8% restantes eram ilegíveis então", "6,7"],
      ].map(([n, t, r], k) => (
        <Card key={n} i={k + 2} className="min-h-[340px]">
          <p className="slide-stat text-slide-primary">{n}</p>
          <p className="slide-body mt-8 text-slide-muted">{t}<R n={r} /></p>
        </Card>
      ))}
    </div>
    <p className="slide-body-lg anim mt-16 max-w-[1300px]" style={d(6)}>
      O DNA de uma célula, esticado, mede cerca de <b className="text-slide-accent">2 metros</b> — e cabe num núcleo 10× menor que a ponta de um alfinete.
    </p>
  </Frame>
);

const Map2003 = () => (
  <Frame kicker="Visão do cientista especialista" title="2003: um mapa, não o destino final">
    <p className="slide-body anim max-w-[1100px] text-slide-muted" style={d(2)}>
      "Completo" em 2003 significava ~92% do genoma. Centrômeros e regiões repetitivas só foram lidos em 2022.<R n="6,7" />
    </p>
    <div className="mt-16 space-y-12">
      {[
        ["Estimativa inicial (anos 1990)", "~100.000", 100, "bg-slide-muted"],
        ["Confirmado (T2T-CHM13, 2022)", "19.969", 19.97, "bg-slide-primary"],
      ].map(([label, val, pct, c], k) => (
        <div key={label as string}>
          <div className="anim flex items-baseline justify-between" style={d(k + 3)}>
            <span className="slide-body">{label}</span>
            <span className="slide-subtitle">{val} genes</span>
          </div>
          <div className="mt-4 h-10 rounded-full bg-slide-surface">
            <div className={`anim-grow h-full rounded-full ${c}`} style={{ width: `${pct}%`, ...d(k + 4) }} />
          </div>
        </div>
      ))}
    </div>
    <p className="slide-body-lg anim mt-16 font-display italic text-slide-accent" style={d(7)}>
      "Como o primeiro mapa de um continente, sem saber o que há em cada vale."
    </p>
  </Frame>
);

const T2T = () => (
  <Frame kicker="O grande salto dos últimos anos" title="Do rascunho ao genoma completo">
    <div className="grid grid-cols-2 gap-8">
      {[
        ["T2T-CHM13 · 31/03/2022 · Science", "Primeiro genoma sem lacunas", ["3,055 bi de pares de bases", "+~200 mi de bases novas", "1.956 genes preditos (99 codificadores)"], "6,7"],
        ["Cromossomo Y · ago/2023 · Nature", "A última peça", ["+30 mi de bases", "41 novos genes codificadores", "Fecha o capítulo do genoma completo"], "8"],
      ].map(([tag, h, items, r], k) => (
        <Card key={tag as string} i={k + 2} className="min-h-[420px]">
          <p className="slide-chrome text-slide-primary">{tag}</p>
          <p className="slide-subtitle mt-6">{h}<R n={r as string} /></p>
          <ul className="mt-8 space-y-4">
            {(items as string[]).map((t) => <li key={t} className="slide-body text-slide-muted">— {t}</li>)}
          </ul>
        </Card>
      ))}
    </div>
    <p className="slide-body anim mt-12 max-w-[1500px] text-slide-muted" style={d(5)}>
      Por trás: leitura longa (PacBio HiFi + Oxford Nanopore), que atravessa as regiões repetitivas de 2003.<R n="7" />
    </p>
  </Frame>
);

const Cost = () => (
  <Frame kicker="Dados oficiais · NHGRI" title="Uma queda de custo maior que a Lei de Moore">
    <div className="flex items-center gap-20">
      <svg viewBox="0 0 1000 520" className="h-[560px] w-[1000px]">
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <g key={k}>
            <line x1="120" x2="980" y1={40 + k * 88} y2={40 + k * 88} stroke="var(--slide-line)" />
            <text x="100" y={48 + k * 88} textAnchor="end" fill="var(--slide-muted)" fontSize="22">US$ 10^{8 - k}</text>
          </g>
        ))}
        <path className="anim-draw" d="M140 54 L960 467" stroke="var(--slide-primary)" strokeWidth="6" fill="none" />
        <circle cx="140" cy="54" r="12" fill="var(--slide-accent)" />
        <circle cx="960" cy="467" r="12" fill="var(--slide-primary)" />
        <text x="140" y="510" fill="var(--slide-muted)" fontSize="22">2001</text>
        <text x="960" y="510" textAnchor="end" fill="var(--slide-muted)" fontSize="22">2022</text>
        <text x="500" y="20" textAnchor="middle" fill="var(--slide-muted)" fontSize="20">custo por genoma · escala logarítmica</text>
      </svg>
      <div className="space-y-10">
        <div className="anim" style={d(2)}><p className="slide-chrome text-slide-muted">2001</p><p className="slide-stat text-slide-accent !text-[96px]">US$ 95,3 mi</p></div>
        <div className="anim" style={d(3)}><p className="slide-chrome text-slide-muted">2022</p><p className="slide-stat text-slide-primary !text-[96px]">US$ 525</p></div>
        <p className="slide-body anim text-slide-muted" style={d(4)}>~180.000× mais barato em 21 anos<R n="9,10" /></p>
      </div>
    </div>
  </Frame>
);

const Brasil = () => (
  <Frame kicker="Fontes nacionais" title="Onde o Brasil entrou nessa história">
    <div className="grid grid-cols-3 gap-8">
      {[
        ["2000", "Xylella fastidiosa", "Capa da Nature. FAPESP: 35 laboratórios e 191 pesquisadores — primeiro genoma de um fitopatógeno.", "11,12"],
        ["1999–2003", "Genoma do Câncer", "FAPESP + Ludwig (ONSA): 29 laboratórios, >1 milhão de fragmentos de genes, publicados na PNAS.", "13,14"],
        ["2020 → hoje", "Genomas SUS", "Portaria GM/MS 1.949/2020: meta de 70 mil genomas; 21 mil sequenciados até 2024.", "15–17"],
      ].map(([y, h, t, r], k) => (
        <Card key={h} i={k + 2} className="min-h-[520px]">
          <p className="slide-chrome text-slide-accent">{y}</p>
          <p className="slide-subtitle mt-6">{h}</p>
          <p className="slide-body mt-6 text-slide-muted">{t}<R n={r} /></p>
        </Card>
      ))}
    </div>
  </Frame>
);

const Limits = () => (
  <Frame kicker="Pé no freio" title="O que o genoma não resolve sozinho">
    <div className="grid grid-cols-3 gap-8">
      {[
        ["Correlação ≠ causa", "Associar um trecho do DNA a uma doença não prova causalidade."],
        ["Traços complexos", "Altura e diabetes dependem de milhares de variantes de efeito pequeno."],
        ["98% não codifica", "O antigo “DNA lixo” regula a expressão gênica — e ainda o deciframos."],
      ].map(([h, t], k) => (
        <Card key={h} i={k + 2} className="min-h-[440px] border-t-4 !border-t-slide-danger">
          <p className="slide-subtitle">{h}</p>
          <p className="slide-body mt-8 text-slide-muted">{t}</p>
        </Card>
      ))}
    </div>
  </Frame>
);

const refs = [
  "NHGRI/NIH — conclusão do HGP, 14/04/2003", "DOE — HGP Timeline", "Clinton White House — discurso 26/06/2000",
  "Nature (15/02/2001) + Science (16/02/2001)", "Proclamação conjunta de 6 países, abr/2003", "Nurk et al., Science, 31/03/2022",
  "Nature Reviews Genetics, 2022", "Rhie et al., Nature, ago/2023", "NHGRI — DNA Sequencing Costs",
  "Wellcome / Our World in Data, 2025", "Pesquisa FAPESP — Xylella, 2000", "FAPESP 60 Anos — Programa Genoma",
  "FAPESP/LICR Cancer Genome Project", "PNAS, nov/2000 e out/2003", "Portaria GM/MS 1.949/2020",
  "Genomas SUS (Fiocruz/MS)", "USP Genoma — 21.000 genomas, 2024",
];
const Closing = () => (
  <div className="slide-content flex flex-col">
    <p className="slide-body-lg anim max-w-[1500px] font-display !text-[64px] !leading-[1.1]" style={d(0)}>
      Não foi um milagre de um dia — foi o <em className="text-slide-primary">começo de um mapa</em>. Só agora lemos cada rua e cada casa.
    </p>
    <p className="slide-kicker anim mt-auto text-slide-muted" style={d(1)}>Fontes e referências</p>
    <ol className="anim mt-6 grid grid-cols-3 gap-x-10 gap-y-2" style={d(2)}>
      {refs.map((r, k) => (
        <li key={r} className="slide-chrome !whitespace-normal text-slide-muted"><b className="text-slide-primary">[{k + 1}]</b> {r}</li>
      ))}
    </ol>
  </div>
);

export const slides = [
  { title: "Capa", C: Cover }, { title: "Linha do tempo", C: Timeline }, { title: "A escala", C: Scale },
  { title: "2003", C: Map2003 }, { title: "T2T", C: T2T }, { title: "Custo", C: Cost },
  { title: "Brasil", C: Brasil }, { title: "Limites", C: Limits }, { title: "Fechamento", C: Closing },
];
