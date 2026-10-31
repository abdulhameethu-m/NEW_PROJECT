import { apiClient } from './client';
import { updateAttributionToken, getAttribution, StoredAttribution } from '../utils/attributionStorage';

export interface TrackingClickPayload {
  productId: string;
  reelId?: string;
  storefrontId?: string;
  collectionId?: string;
  postId?: string;
  influencerId?: string;
  trackingCode?: string;
  anonymousId?: string;
  surface?: string;
  utmParameters?: Record<string, any>;
}

export interface TrackingClickResponse {
  tracked: boolean;
  counted: boolean;
  trackingToken?: string;
  expiresAt?: string;
  reason?: string;
  anonymousId?: string;
}

export interface TrackingEventPayload {
  trackingToken: string;
  eventType:
    | 'product_view'
    | 'add_to_cart'
    | 'wishlist'
    | 'checkout_started'
    | 'order_completed'
    | 'order_cancelled';
  metadata?: Record<string, any>;
}

/**
 * Records an attribution click event to generate a secure trackingToken for checkout commission.
 */
export async function recordTrackingClick(
  payload: TrackingClickPayload
): Promise<TrackingClickResponse | null> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: TrackingClickResponse;
    }>('/tracking/click', payload);

    const result = response.data.data;
    if (result?.trackingToken) {
      await updateAttributionToken(result.trackingToken);
    }
    return result;
  } catch (error: any) {
    // Non-blocking: fail quietly if influencer tracking is unavailable or self-attribution is blocked
    console.warn('[TrackingApi] Click recording skipped or failed:', error?.response?.data?.message || error?.message);
    return null;
  }
}

/**
 * Emits intermediate milestone tracking events (add_to_cart, checkout_started, etc.)
 */
export async function recordTrackingEvent(payload: TrackingEventPayload): Promise<boolean> {
  try {
    await apiClient.post('/tracking/event', payload);
    return true;
  } catch (error) {
    console.warn('[TrackingApi] Event recording skipped:', error);
    return false;
  }
}

/**
 * Checks if stored attribution exists for the given product, and ensures
 * a cryptographic trackingToken is registered and available for checkout.
 */
export async function ensureProductAttributionToken(productId: string): Promise<string | null> {
  try {
    const attribution = await getAttribution();
    if (!attribution) return null;

    // If we already have a valid tracking token, return it
    if (attribution.trackingToken) {
      return attribution.trackingToken;
    }

    // If we have referral code or influencer details, register a click with the backend
    if (attribution.referralCode || attribution.influencerId || attribution.reelId) {
      const clickResult = await recordTrackingClick({
        productId,
        trackingCode: attribution.referralCode,
        influencerId: attribution.influencerId,
        reelId: attribution.reelId,
        storefrontId: attribution.storefrontId,
        surface: 'product_deep_link',
      });

      if (clickResult?.trackingToken) {
        return clickResult.trackingToken;
      }
    }

    return null;
  } catch (e) {
    console.warn('[TrackingApi] Failed to ensure attribution token:', e);
    return null;
  }
}

