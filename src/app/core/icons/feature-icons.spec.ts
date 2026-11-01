import { describe, expect, it } from 'vitest';
import { FEATURE_ICONS, featureIcon } from './feature-icons';

describe('featureIcon', () => {
  it('keeps every registered name', () => {
    for (const name of Object.keys(FEATURE_ICONS)) {
      expect(featureIcon(name)).toBe(name);
    }
    expect(Object.keys(FEATURE_ICONS)).toHaveLength(28);
  });

  it('falls back to lucideStar for unknown or empty names', () => {
    expect(featureIcon('lucideNope')).toBe('lucideStar');
    expect(featureIcon('')).toBe('lucideStar');
    expect(featureIcon(undefined)).toBe('lucideStar');
    expect(featureIcon('toString')).toBe('lucideStar');
  });
});
