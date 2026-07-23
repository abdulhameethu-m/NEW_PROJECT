import { describe, it, expect } from 'vitest';
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../formatCurrency';

describe('formatCurrency', () => {
  it('should format positive numbers correctly using default locale and currency', () => {
    expect(formatCurrency(100)).toBe(new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY }).format(100));
  });

  it('should handle string inputs that are valid numbers', () => {
    expect(formatCurrency('500.50')).toBe(new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY }).format(500.50));
  });

  it('should fallback to 0 for invalid inputs', () => {
    const zeroFormatted = new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY }).format(0);
    expect(formatCurrency(null)).toBe(zeroFormatted);
    expect(formatCurrency(undefined)).toBe(zeroFormatted);
    expect(formatCurrency('invalid')).toBe(zeroFormatted);
    expect(formatCurrency(NaN)).toBe(zeroFormatted);
  });

  it('should allow overriding currency and locale', () => {
    const usdFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(100);
    expect(formatCurrency(100, { currency: 'USD', locale: 'en-US' })).toBe(usdFormatted);
  });
});
