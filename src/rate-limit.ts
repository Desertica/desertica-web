export type RateLimiter = (key: string) => boolean;

/** Hard cap on tracked keys; past it the oldest key is dropped so memory and sweep cost stay bounded. */
const MAX_KEYS = 50_000;

/** IPv6 clients own a whole /64, so rotating the low bits must not mint a fresh key per request. */
export function clientKey(ip: string | undefined): string {
  if (!ip) {
    return 'unknown';
  }

  return ip.includes(':') && !ip.startsWith('::ffff:') ? expandIpv6(ip).slice(0, 4).join(':') : ip;
}

/** The eight groups of an IPv6 address, with `::` expanded, so `2001:db8::1:2` and `2001:db8:0:0:1:2` share a /64. */
function expandIpv6(ip: string): string[] {
  const [head = '', tail = ''] = ip.split('::');
  const first = head ? head.split(':') : [];
  const last = tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...first, ...Array<string>(Math.max(8 - first.length - last.length, 0)).fill('0'), ...last] : first;
  return groups.map((group) => group.toLowerCase().replace(/^0+(?=.)/, ''));
}

/** In-memory sliding window. One instance per process: use Redis if the site ever runs several. */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }

    hits.set(key, [...recent, now]);
    // At most one full sweep per tenth of a window: scanning on every request froze the process.
    if (hits.size > 5000 && now - lastSweep > windowMs / 10) {
      lastSweep = now;
      for (const [entry, stamps] of hits) {
        if (stamps.every((stamp) => now - stamp >= windowMs)) {
          hits.delete(entry);
        }
      }
    }

    if (hits.size > MAX_KEYS) {
      hits.delete(hits.keys().next().value!);
    }

    return true;
  };
}
