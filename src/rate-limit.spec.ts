import { clientKey, createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  afterEach(() => vi.useRealTimers());

  it('blocks the key after the limit and frees it when the window passes', () => {
    vi.useFakeTimers();
    const allowed = createRateLimiter(2, 1000);
    expect([allowed('a'), allowed('a'), allowed('a')]).toEqual([true, true, false]);
    vi.advanceTimersByTime(1001);
    expect(allowed('a')).toBe(true);
  });

  it('stays fast with a flood of distinct keys', () => {
    const allowed = createRateLimiter(8, 60_000);
    const start = performance.now();
    for (let i = 0; i < 60_000; i++) {
      allowed(`key-${i}`);
    }

    expect(performance.now() - start).toBeLessThan(2000);
  });
});

describe('clientKey', () => {
  it('groups an IPv6 /64 and keeps IPv4 as is', () => {
    expect(clientKey('2001:db8:1:2:aaaa:bbbb:cccc:1')).toBe(clientKey('2001:db8:1:2:1111:2222:3333:4'));
    expect(clientKey('2001:db8::1:aaaa:bbbb:cccc')).toBe(clientKey('2001:db8:0:0:2:1:2:3'));
    expect(clientKey('2001:db8::1:aaaa:bbbb:cccc')).not.toBe(clientKey('2001:db8:0:1:aaaa:bbbb:cccc:dddd'));
    expect(clientKey('::1')).toBe('0:0:0:0');
    expect(clientKey('::ffff:1.2.3.4')).toBe('::ffff:1.2.3.4');
    expect(clientKey('1.2.3.4')).toBe('1.2.3.4');
    expect(clientKey(undefined)).toBe('unknown');
  });
});
