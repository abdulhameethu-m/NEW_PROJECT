import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveAttribution,
  getAttribution,
  getActiveTrackingToken,
  getActiveReferralCode,
  updateAttributionToken,
  saveAttributionFromUrl,
  clearAttribution,
} from '../attributionStorage';

describe('Attribution Storage & Referral Tracking', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('persists and retrieves attribution metadata from AsyncStorage', async () => {
    const saved = await saveAttribution({
      trackingToken: 'token_affiliate_123',
      referralCode: 'CREATOR50',
      influencerId: 'inf_987',
    });

    expect(saved.trackingToken).toBe('token_affiliate_123');
    expect(saved.referralCode).toBe('CREATOR50');
    expect(saved.expiresAt).toBeGreaterThan(Date.now());

    const retrieved = await getAttribution();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.trackingToken).toBe('token_affiliate_123');
    expect(retrieved?.influencerId).toBe('inf_987');
  });

  it('returns active tracking token and referral code when valid and not expired', async () => {
    await saveAttribution({
      trackingToken: 'tok_active_xyz',
      referralCode: 'DISCOUNT10',
    });

    const token = await getActiveTrackingToken();
    expect(token).toBe('tok_active_xyz');

    const code = await getActiveReferralCode();
    expect(code).toBe('DISCOUNT10');
  });

  it('ignores expired attribution records and returns null', async () => {
    const expiredTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const expiredData = {
      trackingToken: 'tok_expired_999',
      referralCode: 'OLDCODE',
      timestamp: expiredTimestamp - 1000,
      expiresAt: expiredTimestamp,
    };

    await AsyncStorage.setItem('@uchooz_attribution_data', JSON.stringify(expiredData));

    const token = await getActiveTrackingToken();
    expect(token).toBeNull();

    const code = await getActiveReferralCode();
    expect(code).toBeNull();

    const active = await getAttribution();
    expect(active).toBeNull();
  });

  it('clears attribution storage after successful checkout', async () => {
    await saveAttribution({
      trackingToken: 'token_to_purge',
      referralCode: 'SAVE20',
    });

    await clearAttribution();

    const retrieved = await getAttribution();
    expect(retrieved).toBeNull();
    const token = await getActiveTrackingToken();
    expect(token).toBeNull();
  });

  it('updates attribution token via updateAttributionToken', async () => {
    await saveAttribution({
      referralCode: 'PROMO15',
    });

    await updateAttributionToken('backend_jwt_tracking_token_abc');

    const token = await getActiveTrackingToken();
    expect(token).toBe('backend_jwt_tracking_token_abc');
    const code = await getActiveReferralCode();
    expect(code).toBe('PROMO15');
  });

  it('extracts referral and UTM parameters from deep link URLs', async () => {
    const deepLinkUrl =
      'https://uchooz.me/product/nike-air-max?ref=SARAH10&utm_source=instagram&utm_medium=reel&token=tok_deep_link_456';

    const attribution = await saveAttributionFromUrl(deepLinkUrl);
    expect(attribution).not.toBeNull();
    expect(attribution?.referralCode).toBe('SARAH10');
    expect(attribution?.utmSource).toBe('instagram');
    expect(attribution?.utmMedium).toBe('reel');
    expect(attribution?.trackingToken).toBe('tok_deep_link_456');
    expect(attribution?.productId).toBe('nike-air-max');
  });

  it('returns null when URL has no attribution parameters', async () => {
    const plainUrl = 'https://uchooz.me/home';
    const attribution = await saveAttributionFromUrl(plainUrl);
    expect(attribution).toBeNull();
  });
});
