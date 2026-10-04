import { buildThemeCss } from './cms-theme';

describe('buildThemeCss', () => {
  it('maps palettes, radius, fonts and header heights to CSS', () => {
    const css = buildThemeCss({
      light: { primary: 'oklch(0.5 0.07 125)', cardForeground: '#111' },
      dark: { primary: 'oklch(0.62 0.08 125)' },
      radius: '0.5rem',
      fontSans: "'Radio Canada', sans-serif",
      headerHeightSm: '3rem',
      headerHeightMd: '4rem',
      headerHeightLg: '5rem',
      intro: {},
    });

    expect(css).toContain(
      ":root{--card-foreground:#111;--primary:oklch(0.5 0.07 125);--radius:0.5rem;--font-sans:'Radio Canada', sans-serif;--header-h:3rem}",
    );
    expect(css).toContain(':root.dark,.dark{--primary:oklch(0.62 0.08 125)}');
    expect(css).toContain('@media (min-width:640px){:root{--header-h:4rem}}');
    expect(css).toContain('@media (min-width:1024px){:root{--header-h:5rem}}');
  });

  it('drops empty values and anything that could break out of a rule', () => {
    const css = buildThemeCss({
      light: { primary: 'red;} body{display:none', background: '', foreground: '</style><script>' },
      dark: {},
      radius: '1rem',
      intro: {},
    });

    expect(css).toBe(':root{--radius:1rem}');
  });

  it('returns nothing when the theme has no values', () => {
    expect(buildThemeCss({ light: {}, dark: {}, intro: {} })).toBe('');
  });
});
