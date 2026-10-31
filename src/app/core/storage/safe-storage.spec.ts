import { readLocal, writeLocal } from './safe-storage';

describe('safe storage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads and writes through localStorage', () => {
    writeLocal('k', 'v');
    expect(readLocal('k')).toBe('v');
    expect(readLocal('missing')).toBeNull();
  });

  it('does not throw when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(readLocal('k')).toBeNull();
    expect(() => writeLocal('k', 'v')).not.toThrow();
  });
});
