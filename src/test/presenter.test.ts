import { describe, expect, it } from 'vitest';
import { getSlideScript, ignoreDeckKeys } from '@/lib/presenter/context';

describe('Grounding by chosen slide', () => {
  it('selects only the requested slide and retains its scientific caveat', () => {
    const context = getSlideScript(10);
    expect(context?.n).toBe(10);
    expect(context?.paragraphs.join(' ')).toContain('não uma melhora de trinta e quatro por cento no diagnóstico clínico');
    expect(context?.paragraphs.join(' ')).not.toContain('duzentos e quarenta e cinco mil');
  });
  it('does not invent content for an unavailable slide', () => {
    expect(getSlideScript(0)).toBeUndefined();
    expect(getSlideScript(15)).toBeUndefined();
    expect(getSlideScript(1.5)).toBeUndefined();
  });
  it('preserves the noncoding DNA caveat', () => {
    expect(getSlideScript(8)?.paragraphs.join(' ')).toContain('incorreto afirmar que todo o DNA não codificador');
  });
  it('keeps presentation navigation inactive while typing a question', () => {
    expect(ignoreDeckKeys(document.createElement('textarea'), false)).toBe(true);
    expect(ignoreDeckKeys(document.createElement('div'), true)).toBe(true);
    expect(ignoreDeckKeys(document.createElement('div'), false)).toBe(false);
  });
});