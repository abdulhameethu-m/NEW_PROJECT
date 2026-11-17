import {
  calculateDeliveryEstimate,
  formatDeliveryWindow,
} from '../deliveryEstimator';

describe('Delivery Estimator Logic', () => {
  describe('calculateDeliveryEstimate', () => {
    it('calculates 2-day delivery for Metro pincodes (e.g. 11xxxx, 40xxxx, 56xxxx)', () => {
      // Pin fixed morning time before 17:00 cutoff: 10:00 AM
      const morningDate = new Date('2026-11-20T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(morningDate);

      const delhiEstimate = calculateDeliveryEstimate('110001', morningDate);
      expect(delhiEstimate.transitDays).toBe(2);
      expect(delhiEstimate.isEligibleForFastDelivery).toBe(true);

      const mumbaiEstimate = calculateDeliveryEstimate('400001', morningDate);
      expect(mumbaiEstimate.transitDays).toBe(2);
      expect(mumbaiEstimate.isEligibleForFastDelivery).toBe(true);

      const bangaloreEstimate = calculateDeliveryEstimate('560001', morningDate);
      expect(bangaloreEstimate.transitDays).toBe(2);
      expect(bangaloreEstimate.isEligibleForFastDelivery).toBe(true);

      jest.useRealTimers();
    });

    it('calculates 5-day delivery for remote/hill region pincodes (starting with 19 or 79)', () => {
      const morningDate = new Date('2026-11-20T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(morningDate);

      const kashmirEstimate = calculateDeliveryEstimate('190001', morningDate);
      expect(kashmirEstimate.transitDays).toBe(5);
      expect(kashmirEstimate.isEligibleForFastDelivery).toBe(false);

      const arunachalEstimate = calculateDeliveryEstimate('791111', morningDate);
      expect(arunachalEstimate.transitDays).toBe(5);
      expect(arunachalEstimate.isEligibleForFastDelivery).toBe(false);

      jest.useRealTimers();
    });

    it('calculates 3-day delivery for standard Tier-2/3 pincodes', () => {
      const morningDate = new Date('2026-11-20T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(morningDate);

      const jaipurEstimate = calculateDeliveryEstimate('302001', morningDate);
      expect(jaipurEstimate.transitDays).toBe(3);
      expect(jaipurEstimate.isEligibleForFastDelivery).toBe(false);

      const patnaEstimate = calculateDeliveryEstimate('800001', morningDate);
      expect(patnaEstimate.transitDays).toBe(3);
      expect(patnaEstimate.isEligibleForFastDelivery).toBe(false);

      jest.useRealTimers();
    });

    it('adds 1 extra transit day when ordering after the 5:00 PM (17:00) cutoff', () => {
      // 6:30 PM local time
      const eveningDate = new Date('2026-11-20T18:30:00');
      jest.useFakeTimers().setSystemTime(eveningDate);

      const estimate = calculateDeliveryEstimate('110001', eveningDate);
      // Metro normal is 2 days + 1 extra day for next morning dispatch = 3 days
      expect(estimate.transitDays).toBe(3);
      expect(estimate.cutoffText).toBe('Order now for dispatch tomorrow morning');

      jest.useRealTimers();
    });

    it('handles empty, non-numeric, or malformed pincodes gracefully with 3 days default', () => {
      const morningDate = new Date('2026-11-20T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(morningDate);

      const emptyEstimate = calculateDeliveryEstimate(undefined, morningDate);
      expect(emptyEstimate.transitDays).toBe(3);

      const malformedEstimate = calculateDeliveryEstimate('ABC-XYZ', morningDate);
      expect(malformedEstimate.transitDays).toBe(3);

      jest.useRealTimers();
    });

    it('returns formatted date strings, free delivery threshold, and COD availability flags', () => {
      const estimate = calculateDeliveryEstimate('560001');
      expect(estimate.formattedDate).toBeDefined();
      expect(typeof estimate.formattedDate).toBe('string');
      expect(estimate.dayName).toBeDefined();
      expect(estimate.codAvailable).toBe(true);
      expect(estimate.freeDeliveryThreshold).toBe(499);
    });

    it('honors custom createdDate when calculating delivery estimate for past orders', () => {
      const pastDate = new Date('2026-01-10T08:00:00.000Z');
      const estimate = calculateDeliveryEstimate('110001', pastDate);

      // Delhi is 2 transit days from pastDate (Jan 10 -> Jan 12)
      expect(estimate.estimatedDate.getDate()).toBe(12);
      expect(estimate.estimatedDate.getMonth()).toBe(0); // January
    });
  });

  describe('formatDeliveryWindow', () => {
    it('returns default fallback window for undefined or null inputs', () => {
      expect(formatDeliveryWindow(undefined)).toBe('Within 2-4 business days');
      expect(formatDeliveryWindow('')).toBe('Within 2-4 business days');
    });

    it('returns fallback for invalid date strings', () => {
      expect(formatDeliveryWindow('INVALID_DATE_STRING')).toBe('Within 2-4 business days');
    });

    it('formats delivery window for today', () => {
      const now = new Date();
      expect(formatDeliveryWindow(now.toISOString())).toBe('Arriving Today before 8:00 PM');
    });

    it('formats delivery window for tomorrow', () => {
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      const formatted = formatDeliveryWindow(tomorrow.toISOString());
      expect(formatted).toContain('Tomorrow');
      expect(formatted).toContain('by 2:00 PM');
    });

    it('formats delivery window for future dates beyond tomorrow', () => {
      const future = new Date(Date.now() + 4 * 24 * 3600 * 1000);
      const formatted = formatDeliveryWindow(future.toISOString());
      expect(formatted).toMatch(/^By [A-Z][a-z]{2},/);
    });
  });
});
