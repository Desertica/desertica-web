import { Router } from 'express';
import sharp from 'sharp';
import { IMAGE_WIDTHS } from './image-widths';
import { clientKey, createRateLimiter } from './rate-limit';


const MAX_UPSTREAM_BYTES = 25 * 1024 * 1024;
const CACHE_BYTES = 64 * 1024 * 1024;
/** Formats worth resizing; SVG and anything else is refused (an SVG is a script carrier, not a photo). */
const IMAGE_TYPE = /^image\/(jpeg|png|webp|avif|gif)\b/;
const MAX_JOBS = 3;
/** A 50-megapixel photo decodes to ~150 MB; the sharp default (268 MP) would let three at once take gigabytes. */
const MAX_PIXELS = 50_000_000;

export type ImageProxyOptions = {
  /** Hosts (with port when not default) whose images may be resized; anything else is refused. */
  hosts: readonly string[];
  timeoutMs?: number;
  /** Size of the in-memory cache; defaults to 64 MB. */
  cacheBytes?: number;
};

type Entry = { body: Buffer; type: string };

/**
 * Resizes and converts images from the CMS to WebP on demand. The originals are what editors
 * upload (often several MB); phones get a few dozen kB instead.
 * shortcut: the cache is in memory (64 MB, least recently used out first) and per process; put Cloudflare in front or a shared
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

  // The slot is handed straight to the next waiter, so the number of jobs never goes above MAX_JOBS.
  const slot = async <T>(work: () => Promise<T>): Promise<T> => {
    if (jobs >= MAX_JOBS) {
      await new Promise<void>((resolve) => queue.push(resolve));
    } else {
      jobs += 1;
    }

    try {
      return await work();
    } finally {
      const next = queue.shift();
      if (next) {
        next();
      } else {
        jobs -= 1;
      }
    }
  };

  /** Reads at most `max` bytes: `Content-Length` can be missing or wrong. */
  const readLimited = async (response: Response, max: number): Promise<Buffer | null> => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > max) {
        return null;
      }

      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  };

  const render = (url: URL, width: number, webp: boolean): Promise<Entry | null> =>
    slot(async () => {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(options.timeoutMs ?? 10_000) });
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !IMAGE_TYPE.test(type) || Number(response.headers.get('content-length') ?? 0) > MAX_UPSTREAM_BYTES) {
        return null;
      }

      const original = await readLimited(response, MAX_UPSTREAM_BYTES);
      if (!original) {
        return null;
      }

      const pipeline = sharp(original, { limitInputPixels: MAX_PIXELS }).rotate().resize({ width, withoutEnlargement: true });
      return webp
        ? { body: await pipeline.webp({ quality: 78 }).toBuffer(), type: 'image/webp' }
        : { body: await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer(), type: 'image/jpeg' };
    });

  router.get('/', async (req, res) => {
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
      if (entry) {
        // Re-insert so the Map order is least recently used first.
        cache.delete(key);
        cache.set(key, entry);
      } else {
        // Only work that costs a download and a resize counts against the limit; cached images are free.
        if (!allowed(`img|${clientKey(req.ip)}`)) {
          res.status(429).end();
          return;
        }

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

        // Concurrent requests for one key share the render and all arrive here: count it once.
        entry = rendered;
        if (!cache.has(key)) {
          cache.set(key, entry);
          cached += entry.body.length;
        }

        for (const [oldest, old] of cache) {
          if (cached <= (options.cacheBytes ?? CACHE_BYTES)) {
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
