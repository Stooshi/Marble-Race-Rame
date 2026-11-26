import { describe, expect, it } from 'vitest';
import { canonicalUrl } from '../src/site/canonical';

describe('canonical address', () => {
  it('always points at marblespins.com, without queries or trailing slashes', () => {
    expect(canonicalUrl('/')).toBe('https://marblespins.com/');
    expect(canonicalUrl('/shop/')).toBe('https://marblespins.com/shop');
    expect(canonicalUrl('/checkout?pack=coins-5000')).toBe('https://marblespins.com/checkout');
    expect(canonicalUrl('//r/ABCD')).toBe('https://marblespins.com/r/ABCD');
  });
});
