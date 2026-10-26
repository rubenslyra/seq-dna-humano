import { useCallback, useState } from "react";
import { Hand, AlertCircle, Volume2, VolumeX, Camera, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
    if (active) {
      // Se já está ativo, desativa e abre o modal para reconfigurar
      onToggle();
    }
    setShowModal(true);
  }, [active, onToggle]);

  const handleStartFromModal = useCallback(() => {
    setShowModal(false);
    onToggle();
  }, [onToggle]);

  return (
    <div className="relative">
      {/* Botão principal que abre o modal de configuração */}
      <Button
        variant="deck"
        size="sm"
        onClick={handleOpenModal}
        aria-label="Configurar controle por gestos"
        className={`min-w-[80px] ${active ? "!bg-slide-primary/20 !text-slide-primary" : ""}`}
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

      {/* Indicador de erro flutuante */}
      {error && active && (
        <div className="absolute right-0 top-full mt-2 z-50 max-w-xs rounded-md border border-red-500/30 bg-red-950/90 px-3 py-2 text-xs text-red-200 shadow-lg backdrop-blur-sm">
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

      {/* Modal de Configuração de Gestos */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md border-slide-line bg-slide-surface text-slide-fg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slide-fg">
              <Hand className="h-5 w-5 text-slide-primary" />
              Controle por Gestos
            </DialogTitle>
            <DialogDescription className="text-slide-muted">
              Configure como a câmera deve detectar seus movimentos para passar as páginas.
              As configurações são salvas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sensibilidade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="gesture-sensitivity" className="text-slide-fg font-medium">
                  Sensibilidade do movimento
                </label>
                <span className="tabular-nums text-xs text-slide-muted">
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
              <p className="text-xs text-slide-muted">
                Maior = detecta movimentos menores. Menor = exige gestos mais amplos.
              </p>
            </div>

            {/* Intervalo entre gestos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="gesture-cooldown" className="text-slide-fg font-medium">
                  Intervalo entre gestos
                </label>
                <span className="tabular-nums text-xs text-slide-muted">
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
              <p className="text-xs text-slide-muted">
                Tempo mínimo entre uma passagem de página e outra para evitar disparos acidentais.
              </p>
            </div>

            {/* Toggles: Som e Espelhamento */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onConfigChange({ soundEnabled: !config.soundEnabled })}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                  config.soundEnabled
                    ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary"
                    : "border-slide-line bg-transparent text-slide-muted hover:border-slide-muted"
                }`}
              >
                {config.soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                <span className="text-xs font-medium">Som de Página</span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {config.soundEnabled ? "Ativado" : "Desativado"}
                </span>
              </button>

              <button
                onClick={() => onConfigChange({ mirror: !config.mirror })}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                  config.mirror
                    ? "border-slide-primary/50 bg-slide-primary/10 text-slide-primary"
                    : "border-slide-line bg-transparent text-slide-muted hover:border-slide-muted"
                }`}
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs font-medium">Espelhar Câmera</span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {config.mirror ? "Ativado" : "Desativado"}
                </span>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="deck"
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto"
            >
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              variant="deckPrimary"
              onClick={handleStartFromModal}
              className="w-full sm:w-auto"
            >
              <Play className="mr-1 h-4 w-4" />
              Iniciar Câmera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}