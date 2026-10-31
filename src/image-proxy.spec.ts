import express from 'express';
import sharp from 'sharp';
import { imageProxy } from './image-proxy';
import { type Started, startApp } from './testing-http';

describe('imageProxy', () => {
  const open: Started[] = [];
  afterEach(() => open.splice(0).forEach((started) => started.close()));

  const setup = async (cacheBytes?: number) => {
    const png = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#a64e34' } }).png().toBuffer();
    let hits = 0;
    const origin = express();
    origin.get('/uploads/photo.png', (_req, res) => {
      hits += 1;
      res.type('png').send(png);
    });
    origin.get('/uploads/logo.svg', (_req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'));
    origin.get('/uploads/note.txt', (_req, res) => res.type('text').send('hello'));
    const upstream = await startApp(origin);
    const proxy = express();
    proxy.use('/_img', imageProxy({ hosts: [new URL(upstream.url).host], cacheBytes }));
    const app = await startApp(proxy);
    open.push(upstream, app);
    const get = (query: string, accept = 'image/webp') => fetch(`${app.url}/_img?${query}`, { headers: { accept } });
    const src = encodeURIComponent(`${upstream.url}/uploads/photo.png`);
    return { get, src, upstream, hits: () => hits };
  };

  it('serves a smaller WebP at the next allowed width and caches it', async () => {
    const { get, src, hits } = await setup();
    const first = await get(`w=500&u=${src}`);
    expect(first.status).toBe(200);
    expect(first.headers.get('content-type')).toBe('image/webp');
    expect(first.headers.get('cache-control')).toContain('immutable');
    const meta = await sharp(Buffer.from(await first.arrayBuffer())).metadata();
    expect(meta.width).toBe(640);
    expect(meta.format).toBe('webp');

    await get(`w=600&u=${src}`);
    expect(hits()).toBe(1);
  });

  it('falls back to JPEG when the browser does not accept WebP', async () => {
    const { get, src } = await setup();
    const response = await get(`w=320&u=${src}`, 'image/png,*/*');
    expect(response.headers.get('content-type')).toBe('image/jpeg');
  });

  it('refuses other hosts, bad widths and non-image files', async () => {
    const { get, src, upstream } = await setup();
    expect((await get(`w=640&u=${encodeURIComponent('https://evil.example/x.png')}`)).status).toBe(400);
    expect((await get(`w=0&u=${src}`)).status).toBe(400);
    expect((await get('w=640')).status).toBe(400);
    expect((await get(`w=640&u=${encodeURIComponent(`${upstream.url}/uploads/note.txt`)}`)).status).toBe(404);
    expect((await get(`w=640&u=${encodeURIComponent(`${upstream.url}/uploads/logo.svg`)}`)).status).toBe(404);
    expect((await get(`w=640&u=${encodeURIComponent(`${upstream.url}/uploads/missing.png`)}`)).status).toBe(404);
  });

  describe('memory cache', () => {
    const size = async (width: number) => {
      const { get, src } = await setup();
      return (await (await get(`w=${width}&u=${src}`)).arrayBuffer()).byteLength;
    };

    it('counts a render shared by concurrent requests once', async () => {
      const bytes = await size(500);
      const { get, src, hits } = await setup(Math.floor(bytes * 1.5));
      await Promise.all([get(`w=500&u=${src}`), get(`w=500&u=${src}`)]);
      await get(`w=500&u=${src}`);
      expect(hits()).toBe(1);
    });

    it('evicts the least recently used image, not the oldest one', async () => {
      const [small, medium, large] = [await size(320), await size(640), await size(1024)];
      expect(medium).toBeGreaterThan(small);
      const { get, src, hits } = await setup(small + large);
      await get(`w=320&u=${src}`);
      await get(`w=640&u=${src}`);
      await get(`w=320&u=${src}`);
      await get(`w=1024&u=${src}`);
      expect(hits()).toBe(3);
      await get(`w=320&u=${src}`);
      expect(hits()).toBe(3);
    });
  });
});
