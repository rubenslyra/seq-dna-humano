import { useCallback, useState } from "react";
import { Hand, AlertCircle, Volume2, VolumeX, Camera, Play, X, ArrowLeftRight, Fingerprint as Pinch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GestureConfig } from "@/lib/teleprompter/hand-gesture";

interface GestureControlsProps {
  config: GestureConfig;
  active: boolean;
  ready: boolean;
  error: string | null;
  onToggle: () => void;
  onConfigChange: (patch: Partial<GestureConfig>) => void;
}

export function GestureControls({
  config,
  active,
  ready,
  error,
  onToggle,
  onConfigChange,
}: GestureControlsProps) {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleStartFromModal = useCallback(() => {
    setShowModal(false);
    if (!active) {
      onToggle();
    }
  }, [active, onToggle]);

  return (
    <>
      {/* Controles fixos - SEMPRE visíveis, sem auto-ocultar */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 rounded-xl border border-slide-line bg-slide-surface/95 px-4 py-3 shadow-lg backdrop-blur-sm"
        style={{ zIndex: 60 }}
      >
        {/* Linha superior: Passadores (-/+) e Slider */}
        <div className="flex items-center gap-2">
          <Button
            variant="deck"
            size="sm"
            onClick={() =>
              onConfigChange({ sensitivity: Math.max(0.5, config.sensitivity - 0.1) })
            }
            aria-label="Diminuir sensibilidade"
            className="h-8 w-8 p-0 shrink-0"
          >
            −
          </Button>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={config.sensitivity}
            onChange={(e) => onConfigChange({ sensitivity: Number(e.target.value) })}
            className="w-32 accent-[var(--slide-primary)]"
            aria-label="Sensibilidade do gesto"
          />
          <span className="min-w-[48px] text-center text-xs font-medium tabular-nums text-slide-fg">
            {config.sensitivity.toFixed(1)}x
          </span>
          <Button
            variant="deck"
            size="sm"
            onClick={() =>
              onConfigChange({ sensitivity: Math.min(2.0, config.sensitivity + 0.1) })
            }
            aria-label="Aumentar sensibilidade"
            className="h-8 w-8 p-0 shrink-0"
          >
            +
          </Button>
        </div>

        {/* Separador horizontal */}
        <div className="h-px w-full bg-slide-line" />

        {/* Linha inferior: Demais controles (Som, Espelhar, Gestos) */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Som */}
          <button
            onClick={() => onConfigChange({ soundEnabled: !config.soundEnabled })}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
              config.soundEnabled
                ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary"
                : "border-slide-line bg-transparent text-slide-muted hover:border-slide-muted"
            }`}
            aria-label={config.soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {config.soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            <span>Som</span>
          </button>

          {/* Toggle Espelhar */}
          <button
            onClick={() => onConfigChange({ mirror: !config.mirror })}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
              config.mirror
                ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary"
                : "border-slide-line bg-transparent text-slide-muted hover:border-slide-muted"
            }`}
            aria-label={config.mirror ? "Desativar espelhamento" : "Ativar espelhamento"}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Espelhar</span>
          </button>

          {/* Botão Gestos (abre modal) */}
          <Button
            variant="deckPrimary"
            size="sm"
            onClick={handleOpenModal}
            aria-label="Configurar controle por gestos"
            className="ml-1 min-w-[80px]"
          >
            <Hand className="h-4 w-4" />
            <span>{active ? "Gestos ON" : "Gestos"}</span>
            {active && ready && (
              <span
                className="ml-1 h-2 w-2 rounded-full bg-green-400 animate-pulse"
                aria-hidden
              />
            )}
          </Button>
        </div>
      </div>

      {/* Indicador de erro flutuante */}
      {error && active && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-xs rounded-md border border-red-500/30 bg-red-950/90 px-3 py-2 text-xs text-red-200 shadow-lg backdrop-blur-sm"
          style={{ zIndex: 70 }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                onClick={() => onConfigChange({ enabled: false })}
                className="mt-1 underline hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal COMPLETO com Guia Visual dos Gestos */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slide-line bg-slide-surface shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slide-line">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slide-primary/10">
                  <Hand className="h-6 w-6 text-slide-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slide-fg">Controle por Gestos</h2>
                  <p className="text-sm text-slide-muted">Configure e calibre seu perfil de uso</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-slide-line/20 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5 text-slide-muted" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* GUIA VISUAL DOS GESTOS */}
              <div className="rounded-xl border border-slide-line bg-slide-bg/50 p-5">
                <h3 className="text-sm font-semibold text-slide-fg mb-4 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-slide-primary" />
                  Como usar os gestos
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gesto 1: Mão Aberta (Swipe) */}
                  <div className="rounded-lg border border-slide-line bg-slide-surface p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Hand className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slide-fg text-sm">Mão Aberta</p>
                        <p className="text-xs text-slide-muted">Navegação</p>
                      </div>
                    </div>
                    <p className="text-xs text-slide-muted leading-relaxed">
                      Estenda todos os dedos e mova a mão horizontalmente para esquerda ou direita.
                      O sistema detectará o movimento e passará para o slide anterior ou próximo.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slide-primary">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>Mova lateralmente para navegar</span>
                    </div>
                  </div>

                  {/* Gesto 2: Pinça */}
                  <div className="rounded-lg border border-slide-line bg-slide-surface p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Pinch className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slide-fg text-sm">Pinça</p>
                        <p className="text-xs text-slide-muted">Seleção / UI</p>
                      </div>
                    </div>
                    <p className="text-xs text-slide-muted leading-relaxed">
                      Aproxime o polegar e o indicador até que se toquem.
                      Este gesto pode ser usado para revelar interfaces ou confirmar ações futuras.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-purple-400">
                      <Pinch className="h-3.5 w-3.5" />
                      <span>Junte polegar e indicador</span>
                    </div>
                  </div>
                </div>

                {/* Dicas de Uso */}
                <div className="mt-4 p-3 rounded-lg bg-slide-primary/5 border border-slide-primary/20">
                  <p className="text-xs text-slide-muted leading-relaxed">
                    <strong className="text-slide-fg">Dica:</strong> Mantenha a mão dentro do campo da câmera e evite movimentos bruscos.
                    Ajuste a sensibilidade abaixo se os gestos não forem detectados corretamente.
                  </p>
                </div>
              </div>

              {/* CONFIGURAÇÕES DE CALIBRAÇÃO */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slide-fg flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slide-primary" />
                  Calibração do Perfil
                </h3>

                {/* Sensibilidade */}
                <div className="rounded-lg border border-slide-line bg-slide-bg/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label htmlFor="gesture-sensitivity" className="font-medium text-slide-fg text-sm">
                      Sensibilidade do Movimento
                    </label>
                    <span className="tabular-nums text-xs font-mono bg-slide-primary/10 text-slide-primary px-2 py-1 rounded">
                      {config.sensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    id="gesture-sensitivity"
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={config.sensitivity}
                    onChange={(e) => onConfigChange({ sensitivity: Number(e.target.value) })}
                    className="w-full accent-[var(--slide-primary)]"
                  />
                  <div className="flex justify-between mt-2 text-xs text-slide-muted">
                    <span>Menos sensível</span>
                    <span>Mais sensível</span>
                  </div>
                  <p className="mt-2 text-xs text-slide-muted">
                    Valores maiores detectam movimentos menores. Reduza se houver falsos positivos.
                  </p>
                </div>

                {/* Cooldown */}
                <div className="rounded-lg border border-slide-line bg-slide-bg/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label htmlFor="gesture-cooldown" className="font-medium text-slide-fg text-sm">
                      Intervalo entre Gestos
                    </label>
                    <span className="tabular-nums text-xs font-mono bg-slide-primary/10 text-slide-primary px-2 py-1 rounded">
                      {config.cooldownMs}ms
                    </span>
                  </div>
                  <input
                    id="gesture-cooldown"
                    type="range"
                    min={300}
                    max={2000}
                    step={100}
                    value={config.cooldownMs}
                    onChange={(e) => onConfigChange({ cooldownMs: Number(e.target.value) })}
                    className="w-full accent-[var(--slide-primary)]"
                  />
                  <div className="flex justify-between mt-2 text-xs text-slide-muted">
                    <span>300ms (rápido)</span>
                    <span>2000ms (lento)</span>
                  </div>
                  <p className="mt-2 text-xs text-slide-muted">
                    Tempo mínimo entre detecções para evitar ativações acidentais.
                  </p>
                </div>
              </div>

              {/* OPÇÕES ADICIONAIS */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slide-fg flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-slide-primary" />
                  Preferências
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Toggle Som */}
                  <button
                    onClick={() => onConfigChange({ soundEnabled: !config.soundEnabled })}
                    className={`flex flex-col items-center gap-3 rounded-lg border p-4 transition-all ${
                      config.soundEnabled
                        ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary ring-1 ring-slide-primary/30"
                        : "border-slide-line bg-slide-bg/50 text-slide-muted hover:border-slide-muted"
                    }`}
                  >
                    {config.soundEnabled ? (
                      <Volume2 className="h-6 w-6" />
                    ) : (
                      <VolumeX className="h-6 w-6" />
                    )}
                    <div className="text-center">
                      <span className="text-sm font-medium block">Som de Página</span>
                      <span className="text-xs opacity-70">
                        {config.soundEnabled ? "Ativado" : "Desativado"}
                      </span>
                    </div>
                  </button>

                  {/* Toggle Espelhamento */}
                  <button
                    onClick={() => onConfigChange({ mirror: !config.mirror })}
                    className={`flex flex-col items-center gap-3 rounded-lg border p-4 transition-all ${
                      config.mirror
                        ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary ring-1 ring-slide-primary/30"
                        : "border-slide-line bg-slide-bg/50 text-slide-muted hover:border-slide-muted"
                    }`}
                  >
                    <Camera className="h-6 w-6" />
                    <div className="text-center">
                      <span className="text-sm font-medium block">Espelhar Câmera</span>
                      <span className="text-xs opacity-70">
                        {config.mirror ? "Ativado" : "Desativado"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Status da Câmera */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-200">Erro na Câmera</p>
                      <p className="text-xs text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slide-line flex gap-3 bg-slide-bg/30 rounded-b-xl">
              <Button
                variant="deck"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Fechar
              </Button>
              <Button
                variant="deckPrimary"
                onClick={handleStartFromModal}
                className="flex-1"
                disabled={!!error}
              >
                <Play className="mr-2 h-4 w-4" />
                {active ? "Continuar Usando" : "Iniciar Câmera"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}