import { createHash } from 'node:crypto';
import { cspReportOnly } from './security-headers';

describe('cspReportOnly', () => {
  const theme = '(function () { document.documentElement.dataset.intro = "done"; })();';
  const html = `<html><head>
    <script>${theme}</script>
    <script type="text/javascript" id="ng-event-dispatch-contract">(()=>{})();</script>
    <script type="application/ld+json" data-seo-jsonld>{"@context":"https://schema.org"}</script>
    <script id="ng-state" type="application/json">{}</script>
    <script src="main.js" type="module"></script>
  </head></html>`;
  const hash = (script: string) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`;

  it('allows exactly the inline executable scripts by hash', () => {
    const policy = cspReportOnly(html, []);
    expect(policy).toContain(hash(theme));
    expect(policy).toContain(hash('(()=>{})();'));
    expect(policy.match(/'sha256-/g)).toHaveLength(2);
  });

  it('allows the third-party hosts the site loads and nothing in script-src beyond them', () => {
    const policy = cspReportOnly(html, ['https://cms.desertica.pe']);
    const directive = (name: string) => policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? '';
    expect(directive('script-src')).toContain('https://www.googletagmanager.com');
    expect(directive('script-src')).toContain('https://challenges.cloudflare.com');
    expect(directive('script-src')).toContain('https://js.stripe.com');
    expect(directive('script-src')).toContain('https://*.culqi.com');
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('frame-src')).toContain('https://js.stripe.com');
    expect(directive('frame-src')).toContain('https://challenges.cloudflare.com');
    expect(directive('img-src')).toContain('https://cms.desertica.pe');
    expect(directive('img-src')).toContain('https://images.unsplash.com');
    expect(directive('img-src')).toContain('https://flagcdn.com');
    expect(directive('img-src')).toContain('data:');
    expect(directive('connect-src')).toContain('https://api.stripe.com');
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
  });
});
