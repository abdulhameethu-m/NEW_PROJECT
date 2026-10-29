export interface DeliveryEstimate {
  estimatedDate: Date;
  formattedDate: string;
  dayName: string;
  isEligibleForFastDelivery: boolean;
  transitDays: number;
  cutoffText: string;
  codAvailable: boolean;
  freeDeliveryThreshold: number;
}

/**
 * Common Metro Pincode 2-digit prefixes across India
 */
const METRO_PINCODE_PREFIXES = ['11', '40', '56', '60', '70', '50', '38', '41', '12', '20'];

/**
 * Calculates dynamic delivery estimate and cut-off countdown
 */
export function calculateDeliveryEstimate(
  pincode?: string,
  createdDate?: string | Date
): DeliveryEstimate {
  const baseDate = createdDate ? new Date(createdDate) : new Date();
  const cleanPincode = (pincode || '').replace(/\D/g, '').slice(0, 6);

  let transitDays = 3; // Default 3 days

  if (cleanPincode.length === 6) {
    const prefix = cleanPincode.slice(0, 2);
    if (METRO_PINCODE_PREFIXES.includes(prefix)) {
      transitDays = 2; // Metro delivery in 2 days
    } else if (cleanPincode.startsWith('19') || cleanPincode.startsWith('79')) {
      transitDays = 5; // Hill / remote region
    } else {
      transitDays = 3; // Standard tier 2/3
    }
  }

  // Calculate cutoff time (5:00 PM / 17:00 local time)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isBeforeCutoff = currentHour < 17;
  let cutoffText = '';

  if (isBeforeCutoff) {
    const hoursRemaining = 16 - currentHour;
    const minsRemaining = 60 - currentMinute;
    cutoffText = `Order within ${hoursRemaining}h ${minsRemaining}m for dispatch today`;
  } else {
    transitDays += 1;
    cutoffText = 'Order now for dispatch tomorrow morning';
  }

  const deliveryDate = new Date(baseDate.getTime() + transitDays * 24 * 60 * 60 * 1000);

  const dayName = deliveryDate.toLocaleDateString('en-IN', { weekday: 'long' });
  const formattedDate = deliveryDate.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });

  return {
    estimatedDate: deliveryDate,
    formattedDate: `${dayName}, ${formattedDate}`,
    dayName,
    isEligibleForFastDelivery: transitDays <= 2,
    transitDays,
    cutoffText,
    codAvailable: true,
    freeDeliveryThreshold: 499,
  };
}

/**
 * Formats order estimated delivery date for tracking and timeline
 */
export function formatDeliveryWindow(dateOrIso?: string | Date): string {
  if (!dateOrIso) return 'Within 2-4 business days';

  try {
    const d = new Date(dateOrIso);
    const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    const diffDays = Math.ceil((d.getTime() - Date.now()) / (24 * 3600 * 1000));
    if (diffDays === 0) return 'Arriving Today before 8:00 PM';
    if (diffDays === 1) return `Tomorrow (${day}, ${dateStr}) by 2:00 PM`;

    return `By ${day}, ${dateStr}`;
  } catch {
    return 'Within 2-4 business days';
  }
}

