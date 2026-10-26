import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { slides } from './slides';

export function PresenterAssistant({ slide, open, onOpenChange }: { slide: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const entry = slides[slide - 1];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="deck" title="Apoio de fala" aria-label="Abrir apoio de fala">
          <MessageSquare />
          <span className="hidden sm:inline">Apoio de fala</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border-slide-line bg-slide-bg text-slide-fg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Apoio de fala</DialogTitle>
          <DialogDescription className="text-slide-muted">O Grande Salto — Genoma Humano</DialogDescription>
        </DialogHeader>
        {entry ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slide-primary">Slide {entry.n}</h3>
              <p className="mt-1 text-lg font-semibold text-slide-fg">{entry.title}</p>
            </div>
            <div className="space-y-3">
              {entry.paragraphs.map((p, i) => (
                <p key={i} className={`leading-relaxed ${p.startsWith('[PAUSA') ? 'font-semibold text-slide-accent' : 'text-slide-fg'}`}>
                  {p}
                </p>
              ))}
            </div>
            {entry.ref && (
              <p className="border-t border-slide-line pt-3 text-xs text-slide-muted">{entry.ref}</p>
            )}
          </div>
        ) : (
          <p className="text-slide-muted">Slide não encontrado.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}