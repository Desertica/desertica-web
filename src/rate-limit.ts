export type RateLimiter = (key: string) => boolean;

/** In-memory sliding window. One instance per process: use Redis if the site ever runs several. */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }

    hits.set(key, [...recent, now]);
    if (hits.size > 5000) {
      for (const [entry, stamps] of hits) {
        if (stamps.every((stamp) => now - stamp >= windowMs)) {
          hits.delete(entry);
        }
      }
    }

    return true;
  };
}
