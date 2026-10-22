import { Router } from 'express';
import sharp from 'sharp';
import { IMAGE_WIDTHS } from './image-widths';
import { clientKey, createRateLimiter } from './rate-limit';


const MAX_UPSTREAM_BYTES = 25 * 1024 * 1024;
const CACHE_BYTES = 64 * 1024 * 1024;
const MAX_JOBS = 3;

export type ImageProxyOptions = {
  /** Hosts (with port when not default) whose images may be resized; anything else is refused. */
  hosts: readonly string[];
  timeoutMs?: number;
};

type Entry = { body: Buffer; type: string };

/**
 * Resizes and converts images from the CMS to WebP on demand. The originals are what editors
 * upload (often several MB); phones get a few dozen kB instead.
 * shortcut: the cache is in memory (64 MB) and per process; put Cloudflare in front or a shared
 * store before running several instances.
 */
export function imageProxy(options: ImageProxyOptions): Router {
  const router = Router();
  const cache = new Map<string, Entry>();
  const inflight = new Map<string, Promise<Entry | null>>();
  const allowed = createRateLimiter(1200, 10 * 60 * 1000);
  const queue: Array<() => void> = [];
  let cached = 0;
  let jobs = 0;

  sharp.cache(false);

  const slot = async <T>(work: () => Promise<T>): Promise<T> => {
    if (jobs >= MAX_JOBS) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    jobs += 1;
    try {
      return await work();
    } finally {
      jobs -= 1;
      queue.shift()?.();
    }
  };

  const render = async (url: URL, width: number, webp: boolean): Promise<Entry | null> => {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    const type = response.headers.get('content-type') ?? '';
    const length = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || !type.startsWith('image/') || length > MAX_UPSTREAM_BYTES) {
      return null;
    }

    const original = Buffer.from(await response.arrayBuffer());
    if (original.length > MAX_UPSTREAM_BYTES) {
      return null;
    }

    const pipeline = sharp(original).rotate().resize({ width, withoutEnlargement: true });
    return slot(async () =>
      webp
        ? { body: await pipeline.webp({ quality: 78 }).toBuffer(), type: 'image/webp' }
        : { body: await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer(), type: 'image/jpeg' },
    );
  };

  router.get('/', async (req, res) => {
    if (!allowed(`img|${clientKey(req.ip)}`)) {
      res.status(429).end();
      return;
    }

    const source = typeof req.query['u'] === 'string' ? req.query['u'] : '';
    const wanted = Number(req.query['w']);
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      res.status(400).end();
      return;
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.username || !options.hosts.includes(url.host) || !(wanted > 0)) {
      res.status(400).end();
      return;
    }

    const width = IMAGE_WIDTHS.find((candidate) => candidate >= wanted) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
    const webp = (req.headers.accept ?? '').includes('image/webp');
    const key = `${webp ? 'w' : 'j'}|${width}|${url.href}`;

    try {
      let entry = cache.get(key);
      if (!entry) {
        let pending = inflight.get(key);
        if (!pending) {
          pending = render(url, width, webp).finally(() => inflight.delete(key));
          inflight.set(key, pending);
        }

        const rendered = await pending;
        if (!rendered) {
          res.status(404).end();
          return;
        }

        entry = rendered;
        cache.set(key, entry);
        cached += entry.body.length;
        for (const [oldest, old] of cache) {
          if (cached <= CACHE_BYTES) {
            break;
          }

          cache.delete(oldest);
          cached -= old.body.length;
        }
      }

      // Editors' uploads get a new file name when replaced, so the URL identifies the content.
      res.set({ 'Content-Type': entry.type, 'Cache-Control': 'public, max-age=31536000, immutable', Vary: 'Accept' });
      res.send(entry.body);
    } catch {
      res.status(502).end();
    }
  });

  return router;
}
