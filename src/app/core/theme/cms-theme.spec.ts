import { buildThemeCss, FONT_STACKS, HEADER_SIZES, RADIUS_VALUES } from './cms-theme';

describe('buildThemeCss', () => {
  it('maps palettes and the selector options to CSS', () => {
    const css = buildThemeCss({
      light: { primary: '#5a6b3e', cardForeground: '#111111' },
      dark: { primary: '#7b8f59' },
      radius: 'large',
      fontSans: 'inter',
      fontHeading: 'playfair-display',
      headerSize: 'tall',
      intro: {},
    });

    expect(css).toContain(
      `:root{--card-foreground:#111111;--primary:#5a6b3e;--radius:1rem;--font-sans:${FONT_STACKS['inter']};--font-heading:${FONT_STACKS['playfair-display']};--header-h:4rem}`,
    );
    expect(css).toContain(':root.dark,.dark{--primary:#7b8f59}');
    expect(css).toContain('@media (min-width:640px){:root{--header-h:5rem}}');
    expect(css).toContain('@media (min-width:1024px){:root{--header-h:6rem}}');
  });

  it('knows every option the CMS offers', () => {
    expect(Object.keys(FONT_STACKS)).toEqual([
      'radio-canada',
      'inter',
      'poppins',
      'montserrat',
      'dm-sans',
      'playfair-display',
      'lora',
      'merriweather',
      'system',
    ]);
    expect(Object.keys(RADIUS_VALUES)).toEqual(['none', 'small', 'medium', 'large', 'full']);
    expect(Object.keys(HEADER_SIZES)).toEqual(['compact', 'standard', 'tall']);
  });

  it('keeps legacy CSS values but ignores unknown option names', () => {
    const css = buildThemeCss({
      light: {},
      dark: {},
      radius: '0.5rem',
      fontSans: "'Custom Font', sans-serif",
      fontHeading: 'comic',
      headerSize: 'gigantic',
      intro: {},
    });

    expect(css).toBe(":root{--radius:0.5rem;--font-sans:'Custom Font', sans-serif}");
  });

  it('drops empty values and anything that could break out of a rule', () => {
    const css = buildThemeCss({
      light: { primary: 'red;} body{display:none', background: '', foreground: '</style><script>' },
      dark: {},
      radius: 'medium',
      intro: {},
    });

    expect(css).toBe(':root{--radius:0.625rem}');
  });

  it('returns nothing when the theme has no values', () => {
    expect(buildThemeCss({ light: {}, dark: {}, intro: {} })).toBe('');
  });
});
