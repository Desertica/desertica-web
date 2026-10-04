import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import {
  PALETTE_TOKENS,
  type PaletteToken,
  type ThemePalette,
  type ThemeSettings,
} from '../cms/cms-models';

const STYLE_ID = 'cms-theme';

/** Only plain CSS values are accepted: no braces, semicolons or markup. */
function safe(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && !/[<>{};\\]/.test(trimmed) ? trimmed : undefined;
}

function declarations(palette: ThemePalette): string[] {
  return (Object.keys(PALETTE_TOKENS) as PaletteToken[]).flatMap((token) => {
    const value = safe(palette[token]);
    return value ? [`${PALETTE_TOKENS[token]}:${value}`] : [];
  });
}

/** CSS that overrides the design tokens in `styles.css` with the values edited in Strapi. */
export function buildThemeCss(theme: ThemeSettings): string {
  const root = [...declarations(theme.light)];
  const extras: [string, string | undefined][] = [
    ['--radius', theme.radius],
    ['--font-sans', theme.fontSans],
    ['--font-heading', theme.fontHeading],
    ['--header-h', theme.headerHeightSm],
  ];
  for (const [name, value] of extras) {
    const clean = safe(value);
    if (clean) {
      root.push(`${name}:${clean}`);
    }
  }

  const rules: string[] = [];
  if (root.length) {
    rules.push(`:root{${root.join(';')}}`);
  }

  const dark = declarations(theme.dark);
  if (dark.length) {
    rules.push(`:root.dark,.dark{${dark.join(';')}}`);
  }

  const md = safe(theme.headerHeightMd);
  if (md) {
    rules.push(`@media (min-width:640px){:root{--header-h:${md}}}`);
  }

  const lg = safe(theme.headerHeightLg);
  if (lg) {
    rules.push(`@media (min-width:1024px){:root{--header-h:${lg}}}`);
  }

  return rules.join('');
}

/** Writes the CMS theme into a `<style>` tag so SSR output already carries it. */
@Injectable({ providedIn: 'root' })
export class CmsThemeStyles {
  private readonly document = inject(DOCUMENT);

  apply(theme: ThemeSettings | null): void {
    const css = theme ? buildThemeCss(theme) : '';
    let element = this.document.getElementById(STYLE_ID);
    if (!css) {
      element?.remove();
      return;
    }

    if (!element) {
      element = this.document.createElement('style');
      element.id = STYLE_ID;
      this.document.head.appendChild(element);
    }

    element.textContent = css;
  }
}
