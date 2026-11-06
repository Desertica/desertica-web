import { snippet } from './snippet';

describe('snippet', () => {
  it('keeps short text and tidies its spaces', () => {
    expect(snippet('  Recorre   las dunas.\n')).toBe('Recorre las dunas.');
  });

  it('cuts a long text at a word and never goes over the limit', () => {
    const long = 'Recorre las dunas de Huacachina en tubular, con paradas para bajar en tabla y quedarte a la luz baja, mientras el guía te cuenta la historia del oasis y de la laguna.';
    const result = snippet(long);
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith('…')).toBe(true);
    expect(long.startsWith(result.slice(0, -1))).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });

  it('cuts inside a very long word when there is no space to use', () => {
    expect(snippet('a'.repeat(300)).length).toBe(155);
  });
});
