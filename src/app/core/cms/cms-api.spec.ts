import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { CmsApi, resetCmsCache } from './cms-api';
import { CMS_CONFIG } from './cms-config';

const options = { mediaBase: null, fallbackImage: () => '' };
const single = /-setting|navigation/;

describe('CmsApi cache', () => {
  const setup = (get: (url: string) => unknown) => {
    resetCmsCache();
    const http = { get: vi.fn((url: string, _init?: unknown) => get(url)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: CMS_CONFIG, useValue: { url: 'https://cms.test', publicUrl: null, token: null, cacheTtlMs: 1000, timeoutMs: 50 } },
      ],
    });
    return { api: TestBed.inject(CmsApi), http };
  };
  const ok = (url: string) => of({ data: single.test(url) ? null : [], meta: { pagination: { pageCount: 1 } } });

  afterEach(() => vi.useRealTimers());

  it('serves the last snapshot at once while a dead Strapi is retried in the background', async () => {
    let alive = true;
    const { api } = setup((url) => (alive ? ok(url) : NEVER));
    expect(await api.load(options)).not.toBeNull();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 5000);
    alive = false;
    const started = performance.now();
    expect(await api.load(options)).not.toBeNull();
    expect(performance.now() - started).toBeLessThan(40);
  });

  it('keeps the raw Strapi responses out of the HTML (the snapshot already travels in TransferState)', async () => {
    const { api, http } = setup(ok);
    await api.load(options);

    expect(http.get).toHaveBeenCalled();
    const calls = http.get.mock.calls as unknown as Array<[string, { transferCache?: boolean }]>;
    expect(calls.every(([, init]) => init.transferCache === false)).toBe(true);
  });

  it('does not hammer a failing Strapi when there is no snapshot', async () => {
    const { api, http } = setup(() => throwError(() => new Error('down')));
    expect(await api.load(options)).toBeNull();
    const calls = http.get.mock.calls.length;
    expect(await api.load(options)).toBeNull();
    expect(http.get.mock.calls.length).toBe(calls);
  });

  it('ignores a snapshot that lacks the tours collection', async () => {
    const { api } = setup((url) => (url.endsWith('/tours') ? throwError(() => new Error('500')) : ok(url)));
    expect(await api.load(options)).toBeNull();
  });

  it('keeps the good snapshot when a secondary resource fails during a refresh', async () => {
    const page = (data: unknown[]) => of({ data, meta: { pagination: { pageCount: 1 } } });
    const catalog = (price: number) => (url: string) => {
      if (url.endsWith('/destinations')) {
        return page([{ slug: 'huacachina', order: 0, title: 'Huacachina', lead: '', allLabel: '' }]);
      }

      if (url.endsWith('/tours')) {
        const tour = { slug: 'dune-buggy', order: 0, durationHours: 3, priceFrom: price, destination: { slug: 'huacachina' }, title: 'Dune buggy', description: '', meeting: '' };
        return page([tour]);
      }

      return ok(url);
    };
    let get = catalog(79);
    const { api } = setup((url) => get(url));
    const priceOf = async () => (await api.load(options))?.destinations[0]?.tours[0]?.priceFrom;
    const before = await priceOf();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 5000);
    get = (url) => (url.endsWith('/translations') ? throwError(() => new Error('500')) : catalog(99)(url));
    await priceOf();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await priceOf()).toBe(before);

    // A single type without a published entry (404) is empty content, not a failure.
    vi.setSystemTime(Date.now() + 5000);
    get = (url) =>
      url.endsWith('/navigation')
        ? throwError(() => new HttpErrorResponse({ status: 404 }))
        : catalog(99)(url);
    await priceOf();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await priceOf()).not.toBe(before);
  });

  it('asks for drafts on content only and never touches the shared cache', async () => {
    const { api, http } = setup(ok);
    expect(await api.loadDraft(options)).not.toBeNull();
    const urls = () => (http.get.mock.calls as unknown as Array<[string, { params: { toString(): string } }]>).map(([u, i]) => [u, i.params.toString()]);
    const drafted = urls().filter(([, q]) => q.includes('status=draft')).map(([u]) => u.split('/').pop());
    expect(new Set(drafted)).toEqual(new Set(['destinations', 'tours', 'pages', 'blog-posts', 'products']));

    // The draft run left nothing behind: a published load still goes to Strapi and carries no draft status.
    http.get.mockClear();
    await api.load(options);
    expect(http.get).toHaveBeenCalled();
    expect(urls().some(([, q]) => q.includes('status=draft'))).toBe(false);
    http.get.mockClear();
    await api.load(options);
    expect(http.get).not.toHaveBeenCalled();
  });
});
