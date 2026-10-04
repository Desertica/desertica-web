import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import {
  PALETTE_TOKENS,
  type PaletteToken,
  type ThemePalette,
  type ThemeSettings,
} from '../cms/cms-models';

const STYLE_ID = 'cms-theme';

const SYSTEM_FONTS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";
const SERIF_FONTS = "Georgia, Cambria, 'Times New Roman', Times, serif";

/**
 * CSS font stacks for the fonts editors can pick in Strapi. The files are self-hosted
 * (`public/fonts`, declared in `src/fonts.css` and `src/styles.css`).
 */
export const FONT_STACKS: Readonly<Record<string, string>> = {
  'radio-canada': `'Radio Canada', ${SYSTEM_FONTS}`,
  inter: `'Inter', ${SYSTEM_FONTS}`,
  poppins: `'Poppins', ${SYSTEM_FONTS}`,
  montserrat: `'Montserrat', ${SYSTEM_FONTS}`,
  'dm-sans': `'DM Sans', ${SYSTEM_FONTS}`,
  'playfair-display': `'Playfair Display', ${SERIF_FONTS}`,
  lora: `'Lora', ${SERIF_FONTS}`,
  merriweather: `'Merriweather', ${SERIF_FONTS}`,
  system: SYSTEM_FONTS,
};

export const RADIUS_VALUES: Readonly<Record<string, string>> = {
  none: '0',
  small: '0.25rem',
  medium: '0.625rem',
  large: '1rem',
  full: '1.5rem',
};

/** Header height at the three breakpoints (base, >=640px, >=1024px). */
export const HEADER_SIZES: Readonly<Record<string, readonly [string, string, string]>> = {
  compact: ['3rem', '3.5rem', '4rem'],
  standard: ['3.5rem', '4rem', '5rem'],
  tall: ['4rem', '5rem', '6rem'],
};

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

function fontStack(choice: string | undefined): string | undefined {
  const value = safe(choice);
  if (!value) {
    return undefined;
  }

  // A known option, or a plain CSS font-family list kept for compatibility.
  return FONT_STACKS[value] ?? (/[,'"]/.test(value) ? value : undefined);
}

function radiusValue(choice: string | undefined): string | undefined {
  const value = safe(choice);
  return value
    ? (RADIUS_VALUES[value] ?? (/^\d*\.?\d+(rem|em|px)$/.test(value) ? value : undefined))
    : undefined;
}

/** CSS that overrides the design tokens in `styles.css` with the values edited in Strapi. */
export function buildThemeCss(theme: ThemeSettings): string {
  const root = [...declarations(theme.light)];
  const sizes = theme.headerSize ? HEADER_SIZES[theme.headerSize] : undefined;
  const extras: [string, string | undefined][] = [
    ['--radius', radiusValue(theme.radius)],
    ['--font-sans', fontStack(theme.fontSans)],
    ['--font-heading', fontStack(theme.fontHeading)],
    ['--header-h', sizes?.[0]],
  ];
  for (const [name, value] of extras) {
    if (value) {
      root.push(`${name}:${value}`);
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

  if (sizes) {
    rules.push(`@media (min-width:640px){:root{--header-h:${sizes[1]}}}`);
    rules.push(`@media (min-width:1024px){:root{--header-h:${sizes[2]}}}`);
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
