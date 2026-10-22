import { createPageCache, pageCacheKey } from './page-cache';

const req = (path: string, extra: Record<string, unknown> = {}) =>
  ({ method: 'GET', path, originalUrl: path, query: {}, ...extra }) as Parameters<typeof pageCacheKey>[0];

describe('pageCacheKey', () => {
  it('shares public pages and keeps the full URL (language and query) in the key', () => {
    expect(pageCacheKey(req('/es/tours'))).toBe('/es/tours');
    expect(pageCacheKey(req('/en/', { originalUrl: '/en/?utm_source=ig' }))).toBe('/en/?utm_source=ig');
  });

  it('never shares booking pages, credential links or non-GET requests', () => {
    for (const path of ['/es/pay/abc', '/en/waiver/abc', '/es/booking/REF', '/en/checkout', '/es/payment/3ds']) {
      expect(pageCacheKey(req(path))).toBeNull();
    }

    expect(pageCacheKey(req('/es/tours', { query: { token: 'x' } }))).toBeNull();
    expect(pageCacheKey(req('/es/tours', { method: 'POST' }))).toBeNull();
  });
});

describe('createPageCache', () => {
  afterEach(() => vi.useRealTimers());
  const page = { type: 'text/html', body: Buffer.from('<p>hi</p>') };

  it('expires entries after the ttl and drops the oldest past the limit', () => {
    vi.useFakeTimers();
    const cache = createPageCache(1000, 2);
    cache.set('a', page);
    cache.set('b', page);
    cache.set('c', page);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(cache.get('c'));
    vi.advanceTimersByTime(1001);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBeUndefined();
  });

  it('stores nothing when the ttl is 0', () => {
    const cache = createPageCache(0);
    cache.set('a', page);
    expect(cache.get('a')).toBeUndefined();
  });
});
