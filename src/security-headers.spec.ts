import { createHash } from 'node:crypto';
import { contentSecurityPolicy } from './security-headers';

describe('contentSecurityPolicy', () => {
  const theme = '(function () { document.documentElement.dataset.intro = "done"; })();';
  const html = `<html><head>
    <script>${theme}</script>
    <script type="text/javascript" id="ng-event-dispatch-contract">(()=>{})();</script>
    <script type="application/ld+json" data-seo-jsonld>{"@context":"https://schema.org"}</script>
    <script id="ng-state" type="application/json">{}</script>
    <script src="main.js" type="module"></script>
  </head></html>`;
  const hash = (script: string) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
  const directive = (policy: string, name: string) =>
    policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? '';

  it('allows exactly the inline executable scripts by hash, plus the stylesheet onload handler', () => {
    const { enforce } = contentSecurityPolicy(html, []);
    expect(enforce).toContain(hash(theme));
    expect(enforce).toContain(hash('(()=>{})();'));
    expect(directive(enforce, 'script-src')).toContain(`'unsafe-hashes' ${hash("this.media='all'")}`);
    expect(enforce.match(/'sha256-/g)).toHaveLength(3);
  });

  it('enforces an exact host list for scripts, with no inline or eval escape hatch', () => {
    const { enforce } = contentSecurityPolicy(html, ['https://cms.desertica.pe']);
    const scripts = directive(enforce, 'script-src');
    for (const host of [
      'https://*.googletagmanager.com',
      'https://connect.facebook.net',
      'https://challenges.cloudflare.com',
      'https://*.culqi.com',
    ]) {
      expect(scripts).toContain(host);
    }
    expect(scripts).not.toMatch(/'unsafe-inline'|'unsafe-eval'|https: |https:$/);
    expect(directive(enforce, 'object-src')).toBe("object-src 'none'");
    expect(directive(enforce, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(enforce, 'media-src')).toBe(
      "media-src 'self' https://images.unsplash.com https://flagcdn.com https://cms.desertica.pe",
    );
  });

  it('opens only the directives Culqi 3DS needs to any https host, and reports the exact list', () => {
    const { enforce, reportOnly } = contentSecurityPolicy(html, ['https://cms.desertica.pe']);
    for (const name of ['img-src', 'connect-src', 'frame-src', 'form-action']) {
      expect(directive(enforce, name).endsWith(' https:')).toBe(true);
      expect(directive(reportOnly, name)).not.toContain('https: ');
      expect(directive(reportOnly, name).endsWith(' https:')).toBe(false);
    }
    expect(directive(reportOnly, 'img-src')).toContain('https://cms.desertica.pe');
    expect(directive(reportOnly, 'connect-src')).toContain('https://*.cardinalcommerce.com');
    expect(directive(reportOnly, 'frame-src')).toContain('https://*.culqi.com');
    expect(directive(reportOnly, 'form-action')).toContain('https://*.cardinalcommerce.com');
    expect(directive(reportOnly, 'script-src')).toBe(directive(enforce, 'script-src'));
  });
});
