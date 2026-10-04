import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true, async: false });

/** Renders CMS Markdown to HTML. Bind the result with `[innerHTML]` so Angular sanitizes it. */
export function renderMarkdown(source: string | undefined | null): string {
  if (!source?.trim()) {
    return '';
  }

  return marked.parse(source, { async: false });
}
