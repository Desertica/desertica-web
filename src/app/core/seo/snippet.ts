/**
 * Text for a search result: Google shows about 155 characters, so a long first paragraph is cut at a word
 * and closed with an ellipsis. Short text passes through with its spaces tidied.
 */
export function snippet(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) {
    return clean;
  }

  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${kept.replace(/[\s,;:.\-–—]+$/, '')}…`;
}
