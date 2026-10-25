import { useRef, useState } from 'react';
import { MessageSquare, Send, Copy, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { slides } from './slides';

export function PresenterAssistant({ slide, open, onOpenChange }: { slide: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [chosen, setChosen] = useState(slide);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerSlide, setAnswerSlide] = useState(slide);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const flight = useRef(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (flight.current) return;
    flight.current = true;
    setBusy(true); setError(''); setAnswer(''); setCopied(false); setAnswerSlide(chosen);
    try {
      const response = await fetch('/api/presenter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slide: chosen, question }) });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.message ?? 'Não foi possível gerar a resposta.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('A resposta da IA está vazia.');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.text) setAnswer((text) => text + event.text);
          if (event.error) setError(event.error);
        }
        if (done) break;
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível gerar a resposta.'); }
    finally { flight.current = false; setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (value) setChosen(slide); onOpenChange(value); }}>
    <DialogTrigger asChild><Button variant="deck" title="Apoio de fala" aria-label="Abrir apoio de fala"><MessageSquare /><span className="hidden sm:inline">Apoio de fala</span></Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border-slide-line bg-slide-bg text-slide-fg">
      <DialogHeader><DialogTitle className="text-2xl">Apoio de fala</DialogTitle><DialogDescription className="text-slide-muted">O Grande Salto · Lovable AI</DialogDescription></DialogHeader>
      <form onSubmit={generate} className="space-y-4">
        <div><label htmlFor="answer-slide" className="mb-2 block text-sm text-slide-muted">Slide</label><Input id="answer-slide" type="number" min={1} max={slides.length} required value={chosen} disabled={busy} onChange={(e) => setChosen(Number(e.target.value))} className="border-slide-line bg-slide-surface text-slide-fg" /><p className="mt-2 text-sm text-slide-primary">{slides[chosen - 1]?.title ?? 'Slide inválido'}</p></div>
        <div><label htmlFor="answer-question" className="mb-2 block text-sm text-slide-muted">Dúvida ou trecho do roteiro</label><Textarea id="answer-question" value={question} required maxLength={4000} disabled={busy} onChange={(e) => setQuestion(e.target.value)} rows={4} className="border-slide-line bg-slide-surface text-slide-fg" /></div>
        <Button type="submit" variant="deckPrimary" disabled={busy || !question.trim() || !slides[chosen - 1]}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{busy ? 'Preparando fala…' : 'Gerar resposta falada'}</Button>
      </form>
      {error && <p role="alert" className="text-slide-danger">{error}</p>}
      {answer && <section className="border-t border-slide-line pt-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm text-slide-primary">Fala · slide {answerSlide}</h3><Button variant="deck" size="sm" title="Copiar fala" onClick={async () => { try { await navigator.clipboard.writeText(answer); setCopied(true); } catch { setError('Não foi possível copiar. Selecione o texto da fala.'); } }}><Copy />{copied ? 'Copiado' : 'Copiar'}</Button></div><p className="whitespace-pre-wrap text-xl leading-relaxed" aria-live="polite">{answer}</p></section>}
    </DialogContent>
  </Dialog>;
}