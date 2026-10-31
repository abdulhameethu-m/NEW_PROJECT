import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const ATTRIBUTION_STORAGE_KEY = '@uchooz_attribution_data';
// Standard 30-day affiliate / referral attribution window
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoredAttribution {
  trackingToken?: string;
  referralCode?: string; // from ref, affiliate, or trackingCode
  influencerId?: string;
  campaignId?: string;
  reelId?: string;
  productId?: string;
  storefrontId?: string;
  sourceUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Persists attribution metadata in AsyncStorage with an expiry window.
 */
export async function saveAttribution(data: Partial<StoredAttribution>): Promise<StoredAttribution> {
  try {
    const existing = await getAttribution();
    const now = Date.now();
    const expiresAt = now + ATTRIBUTION_WINDOW_MS;

    const updated: StoredAttribution = {
      ...existing,
      ...data,
      timestamp: existing?.timestamp || now,
      expiresAt: existing?.expiresAt && existing.expiresAt > now ? existing.expiresAt : expiresAt,
    };

    await AsyncStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[AttributionStorage] Failed to save attribution:', error);
    return {
      ...data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ATTRIBUTION_WINDOW_MS,
    };
  }
}

/**
 * Extracts referral & attribution parameters from a deep link or universal URL
 * and persists them into AsyncStorage.
 */
export async function saveAttributionFromUrl(
  rawUrl: string,
  contextProductId?: string
): Promise<StoredAttribution | null> {
  if (!rawUrl) return null;

  try {
    const parsed = Linking.parse(rawUrl);
    const query = (parsed.queryParams || {}) as Record<string, string | undefined>;

    const referralCode = query.ref || query.referral || query.affiliate || query.trackingCode || query.code;
    const influencerId = query.influencerId || query.influencer;
    const campaignId = query.campaignId || query.campaign;
    const reelId = query.reelId;
    const storefrontId = query.storefrontId || query.store;
    const trackingToken = query.trackingToken || query.token;
    const utmSource = query.utm_source;
    const utmMedium = query.utm_medium;
    const utmCampaign = query.utm_campaign;

    // Determine product slug or ID if path is /product/:slug
    let productId = contextProductId || query.productId;
    if (!productId && parsed.path) {
      const segments = parsed.path.replace(/^\/+|\/+$/g, '').split('/');
      if (segments[0] === 'product' && segments[1]) {
        productId = segments[1];
      }
    }

    // Only save if there is relevant attribution or tracking data in the URL
    if (referralCode || influencerId || campaignId || trackingToken || utmSource || reelId) {
      const attribution = await saveAttribution({
        referralCode: referralCode || undefined,
        influencerId: influencerId || undefined,
        campaignId: campaignId || undefined,
        reelId: reelId || undefined,
        productId: productId || undefined,
        storefrontId: storefrontId || undefined,
        trackingToken: trackingToken || undefined,
        sourceUrl: rawUrl,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
      });

      console.log('[AttributionStorage] Saved attribution from link:', {
        referralCode,
        influencerId,
        productId,
        trackingToken: Boolean(trackingToken),
      });

      return attribution;
    }

    return null;
  } catch (error) {
    console.warn('[AttributionStorage] Failed to parse URL attribution:', error);
    return null;
  }
}

/**
 * Updates or stores the cryptographic backend tracking token.
 */
export async function updateAttributionToken(trackingToken: string): Promise<void> {
  if (!trackingToken) return;
  await saveAttribution({ trackingToken });
}

/**
 * Retrieves the currently active attribution payload if not expired.
 * Automatically clears stale attribution if expired.
 */
export async function getAttribution(): Promise<StoredAttribution | null> {
  try {
    const raw = await AsyncStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;

    const data: StoredAttribution = JSON.parse(raw);
    const now = Date.now();

    if (data.expiresAt && data.expiresAt < now) {
      await clearAttribution();
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[AttributionStorage] Failed to read attribution:', error);
    return null;
  }
}

/**
 * Returns the active cryptographic tracking token if available and valid.
 */
export async function getActiveTrackingToken(): Promise<string | null> {
  const attribution = await getAttribution();
  return attribution?.trackingToken || null;
}

/**
 * Returns the active referral code if available.
 */
export async function getActiveReferralCode(): Promise<string | null> {
  const attribution = await getAttribution();
  return attribution?.referralCode || null;
}

/**
 * Clears stored attribution (e.g. after successful order completion or manual reset).
 */
export async function clearAttribution(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch (error) {
    console.warn('[AttributionStorage] Failed to clear attribution:', error);
  }
}

