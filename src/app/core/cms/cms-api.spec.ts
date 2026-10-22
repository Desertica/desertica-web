import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { CmsApi, resetCmsCache } from './cms-api';
import { CMS_CONFIG } from './cms-config';

const options = { mediaBase: null, fallbackImage: () => '' };
const single = /-setting|navigation/;

describe('CmsApi cache', () => {
  const setup = (get: (url: string) => unknown) => {
    resetCmsCache();
    const http = { get: vi.fn((url: string) => get(url)) };
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
});
