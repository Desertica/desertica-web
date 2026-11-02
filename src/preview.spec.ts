import { createHmac } from 'node:crypto';
import { previewGate, verifyPreviewToken } from './preview';
import { pageCacheKey } from './page-cache';

const SECRET = 'a'.repeat(64);
const NOW = 1_800_000_000_000;
const token = (path: string, exp = NOW / 1000 + 600, secret = SECRET) =>
  `${exp}.${createHmac('sha256', secret).update(`${exp}:${path}`).digest('hex')}`;

describe('verifyPreviewToken', () => {
  it('accepts a fresh token for its own path', () => {
    expect(verifyPreviewToken(token('/es/tours/a'), '/es/tours/a', SECRET, NOW)).toBe(true);
  });

  it('rejects expired tokens, another path, another secret, junk and a missing secret', () => {
    expect(verifyPreviewToken(token('/es/tours/a', NOW / 1000 - 1), '/es/tours/a', SECRET, NOW)).toBe(false);
    expect(verifyPreviewToken(token('/es/tours/b'), '/es/tours/a', SECRET, NOW)).toBe(false);
    expect(verifyPreviewToken(token('/es/tours/a', undefined, 'b'.repeat(64)), '/es/tours/a', SECRET, NOW)).toBe(false);
    expect(verifyPreviewToken('x.y', '/es', SECRET, NOW)).toBe(false);
    expect(verifyPreviewToken(['a', 'b'], '/es', SECRET, NOW)).toBe(false);
    expect(verifyPreviewToken(token('/es/tours/a'), '/es/tours/a', undefined, NOW)).toBe(false);
  });
});

describe('previewGate', () => {
  const run = (query: Record<string, unknown>, secret: string | undefined = SECRET, path = '/es/tours/a', frameAncestor?: string) => {
    const headers: Record<string, string> = {};
    const res = { locals: {} as Record<string, unknown>, setHeader: (k: string, v: string) => (headers[k] = v) };
    const next = vi.fn();
    previewGate(secret, frameAncestor)({ method: 'GET', path, query } as never, res as never, next);
    expect(next).toHaveBeenCalled();
    return { res, headers };
  };

  it('marks a valid preview as private, uncacheable and noindex', () => {
    const { res, headers } = run({ preview: token('/es/tours/a', Math.floor(Date.now() / 1000) + 600) });
    expect(res.locals['preview']).toBe(true);
    expect(headers).toEqual({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  });

  it('lets only the CMS frame a valid preview', () => {
    const preview = token('/es/tours/a', Math.floor(Date.now() / 1000) + 600);
    expect(run({ preview }, SECRET, '/es/tours/a', 'https://cms.test').headers['Content-Security-Policy']).toBe('frame-ancestors https://cms.test');
    expect(run({ preview }).headers['Content-Security-Policy']).toBeUndefined();
  });

  it('changes nothing for an expired, foreign or unsigned token', () => {
    for (const preview of [token('/es/tours/a', 1), token('/es/other', Math.floor(Date.now() / 1000) + 600)]) {
      const { res, headers } = run({ preview });
      expect(res.locals['preview']).toBeUndefined();
      expect(headers).toEqual({});
    }

    expect(run({ preview: token('/es/tours/a', Math.floor(Date.now() / 1000) + 600) }, '').res.locals['preview']).toBeUndefined();
  });

  it('keeps previews out of the page cache', () => {
    const req = { method: 'GET', path: '/es/tours/a', hostname: 'x.test', query: { preview: 'whatever' } };
    expect(pageCacheKey(req as never)).toBeNull();
  });
});
