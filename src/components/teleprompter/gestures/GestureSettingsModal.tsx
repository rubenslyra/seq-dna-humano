import { AlertCircle, Camera, Hand, Play, Settings, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GestureConfig } from "@/lib/teleprompter/gestures/types";

interface GestureSettingsModalProps {
  config: GestureConfig;
  active: boolean;
  ready: boolean;
  error: string | null;
  onToggle: () => void;
  onConfigChange: (patch: Partial<GestureConfig>) => void;
}

export function GestureSettingsModal({
  config,
  active,
  ready,
  error,
  onToggle,
  onConfigChange,
}: GestureSettingsModalProps) {
  const [open, setOpen] = useState(false);

  const handleStart = useCallback(() => {
    setOpen(false);
    if (!active) {
      onToggle();
    }
  }, [active, onToggle]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-slide-line bg-slide-surface/95 shadow-lg backdrop-blur-sm transition-all hover:bg-slide-primary/20 hover:border-slide-primary/50"
        style={{ zIndex: 9999 }}
        aria-label="Configurações de gestos"
      >
        <Settings className="h-5 w-5 text-slide-fg" />
        {active && ready && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 10000, backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slide-line bg-slide-surface shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slide-line">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slide-primary/10">
                  <Hand className="h-5 w-5 text-slide-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slide-fg">Controle por Gestos</h2>
                  <p className="text-xs text-slide-muted">Mão aberta para navegar • Mão fechada para pausar</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-slide-line/20 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5 text-slide-muted" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
              <div className="flex items-center justify-between rounded-lg border border-slide-line bg-slide-bg/50 p-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${active && ready ? "bg-green-500 animate-pulse" : "bg-slide-muted"}`} />
                  <span className="text-sm text-slide-fg">{active && ready ? "Ativo e rastreando" : error ? "Erro" : "Inativo"}</span>
                </div>
                <Button variant={active ? "deck" : "deckPrimary"} size="sm" onClick={onToggle} disabled={!!error}>
                  {active ? "Desativar" : "Ativar"}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="gesture-sensitivity" className="text-sm font-medium text-slide-fg">Sensibilidade</label>
                  <span className="tabular-nums text-xs font-mono bg-slide-primary/10 text-slide-primary px-2 py-0.5 rounded">{config.sensitivity.toFixed(1)}x</span>
                </div>
                <input id="gesture-sensitivity" type="range" min={0.5} max={2.0} step={0.1} value={config.sensitivity} onChange={(e) => onConfigChange({ sensitivity: Number(e.target.value) })} className="w-full accent-[var(--slide-primary)]" />
                <p className="text-xs text-slide-muted">Menor valor = mais preciso (movimento maior). Maior valor = mais sensível.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="gesture-cooldown" className="text-sm font-medium text-slide-fg">Intervalo entre gestos</label>
                  <span className="tabular-nums text-xs font-mono bg-slide-primary/10 text-slide-primary px-2 py-0.5 rounded">{config.cooldownMs}ms</span>
                </div>
                <input id="gesture-cooldown" type="range" min={300} max={2000} step={100} value={config.cooldownMs} onChange={(e) => onConfigChange({ cooldownMs: Number(e.target.value) })} className="w-full accent-[var(--slide-primary)]" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="gesture-flash" className="text-sm font-medium text-slide-fg">Tempo do indicador (verde/vermelho)</label>
                  <span className="tabular-nums text-xs font-mono bg-slide-primary/10 text-slide-primary px-2 py-0.5 rounded">{config.actionFlashMs}ms</span>
                </div>
                <input id="gesture-flash" type="range" min={400} max={900} step={50} value={config.actionFlashMs} onChange={(e) => onConfigChange({ actionFlashMs: Number(e.target.value) })} className="w-full accent-[var(--slide-primary)]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onConfigChange({ soundEnabled: !config.soundEnabled })} className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${config.soundEnabled ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary" : "border-slide-line bg-transparent text-slide-muted hover:border-slide-muted"}`}>
                  {config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span className="text-sm">{config.soundEnabled ? "Som ON" : "Som OFF"}</span>
                </button>
                <button onClick={() => onConfigChange({ mirror: !config.mirror })} className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${config.mirror ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary" : "border-slide-line bg-transparent text-slide-muted hover:border-slide-muted"}`}>
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">{config.mirror ? "Espelho ON" : "Espelho OFF"}</span>
                </button>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-200">{error}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slide-line flex gap-3 bg-slide-bg/30 rounded-b-xl">
              <Button variant="deck" onClick={() => setOpen(false)} className="flex-1">Fechar</Button>
              {!active && (
                <Button variant="deckPrimary" onClick={handleStart} className="flex-1" disabled={!!error}>
                  <Play className="mr-2 h-4 w-4" /> Iniciar câmera
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
