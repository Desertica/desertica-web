import express from 'express';
import { localeRoutes } from './locale-routes';
import { type Started, startApp } from './testing-http';

describe('localeRoutes', () => {
  const open: Started[] = [];
  afterEach(() => open.splice(0).forEach((started) => started.close()));

  const setup = async () => {
    const app = express();
    app.use(localeRoutes());
    app.use((req, res) => res.send(`page ${req.path}`));
    const started = await startApp(app);
    open.push(started);
    return (path: string, headers: Record<string, string> = {}) => fetch(`${started.url}${path}`, { redirect: 'manual', headers });
  };

  it('sends a page without a language to the visitor language, temporarily', async () => {
    const get = await setup();
    const byBrowser = await get('/tours/dune-buggy?utm_source=ig', { 'accept-language': 'es-PE,es;q=0.9,en;q=0.8' });
    expect(byBrowser.status).toBe(302);
    expect(byBrowser.headers.get('location')).toBe('/es/tours/dune-buggy?utm_source=ig');

    const byCookie = await get('/', { cookie: 'locale=en', 'accept-language': 'es' });
    expect(byCookie.headers.get('location')).toBe('/en/');

    expect((await get('/tours')).headers.get('location')).toBe('/en/tours');
  });

  it('turns the legacy ?lang= into a permanent redirect to the prefixed URL', async () => {
    const get = await setup();
    const response = await get('/tours?lang=es');
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/es/tours');
  });

  it('serves prefixed pages, remembers the language, and keeps one URL for the home page (/es/)', async () => {
    const get = await setup();
    const page = await get('/es/tours', { cookie: 'locale=en' });
    expect(page.status).toBe(200);
    expect(page.headers.get('set-cookie')).toContain('locale=es');

    const same = await get('/es/tours', { cookie: 'locale=es' });
    expect(same.headers.get('set-cookie')).toBeNull();

    const bare = await get('/es?x=1');
    expect(bare.status).toBe(301);
    expect(bare.headers.get('location')).toBe('/es/?x=1');
    expect((await get('/es/')).status).toBe(200);
  });

  it('leaves files, the API and non-GET requests alone', async () => {
    const get = await setup();
    expect((await get('/favicon.ico')).status).toBe(200);
    expect((await get('/api/forms/contact')).status).toBe(200);
    const started = open[0]!;
    expect((await fetch(`${started.url}/tours`, { method: 'POST', redirect: 'manual' })).status).toBe(200);
  });
});
