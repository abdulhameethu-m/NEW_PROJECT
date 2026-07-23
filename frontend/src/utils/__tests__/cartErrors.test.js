import { describe, it, expect } from 'vitest';
import { getCartErrorMessage } from '../cartErrors';

describe('getCartErrorMessage', () => {
  it('should return a custom message if provided through error.action', () => {
    const error = { action: 'OUT_OF_STOCK', message: 'Custom out of stock message' };
    expect(getCartErrorMessage(error)).toBe('Custom out of stock message');
  });

  it('should format OUT_OF_STOCK error codes nicely', () => {
    const error = { response: { data: { code: 'OUT_OF_STOCK' } } };
    expect(getCartErrorMessage(error)).toBe('This item is out of stock right now.');
  });

  it('should detect out of stock through regex matching on the message string', () => {
    const error = { message: 'We have insufficient stock for this request' };
    expect(getCartErrorMessage(error)).toBe('This item is out of stock right now.');
  });

  it('should fallback to the error message if no matches', () => {
    const error = { message: 'Something weird happened' };
    expect(getCartErrorMessage(error)).toBe('Something weird happened');
  });

  it('should use the provided fallback string if completely empty', () => {
    expect(getCartErrorMessage(null, 'Custom Fallback')).toBe('Custom Fallback');
  });

  it('should use the default fallback if no error is given', () => {
    expect(getCartErrorMessage(null)).toBe('Something went wrong with your cart.');
  });
});
