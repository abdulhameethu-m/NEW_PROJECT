import { Linking, Platform, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export const APP_WEB_BASE_URL = 'https://uchooseme.com';

export interface ShareContentOptions {
  title: string;
  message?: string;
  url: string;
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  referralCode?: string;
}

/**
 * Builds universal web link for a product with optional referral code.
 */
export function buildProductShareUrl(slug: string, referralCode?: string): string {
  const query = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '';
  return `${APP_WEB_BASE_URL}/product/${slug}${query}`;
}

/**
 * Builds universal web link for a reel with optional referral code.
 */
export function buildReelShareUrl(reelId: string, referralCode?: string): string {
  const query = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '';
  return `${APP_WEB_BASE_URL}/reels/${reelId}${query}`;
}

/**
 * Builds universal web link for a merchant storefront with optional referral code.
 */
export function buildStoreShareUrl(slug: string, referralCode?: string): string {
  const query = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '';
  return `${APP_WEB_BASE_URL}/stores/${slug}${query}`;
}

/**
 * Generates an attractive, high-converting promotional message.
 */
export function formatProductShareText(options: {
  name: string;
  price?: number;
  originalPrice?: number;
  url: string;
}): string {
  const { name, price, originalPrice, url } = options;

  let priceLine = '';
  if (price !== undefined) {
    if (originalPrice && originalPrice > price) {
      const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      priceLine = `\n💰 ₹${price.toLocaleString('en-IN')} (🔥 ${discount}% OFF, MRP ₹${originalPrice.toLocaleString('en-IN')})`;
    } else {
      priceLine = `\n💰 Special Price: ₹${price.toLocaleString('en-IN')}`;
    }
  }

  return `🔥 Found this on UChooseMe!\n\n✨ ${name}${priceLine}\n\n👉 Shop now before deals end:\n${url}`;
}

/**
 * Share directly to WhatsApp.
 */
export async function shareToWhatsApp(text: string): Promise<boolean> {
  const encoded = encodeURIComponent(text);
  const nativeUrl = `whatsapp://send?text=${encoded}`;
  const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch (error) {
    console.warn('[SocialShare] WhatsApp share failed, opening fallback:', error);
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Share directly to Telegram.
 */
export async function shareToTelegram(text: string, url?: string): Promise<boolean> {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = url ? encodeURIComponent(url) : '';
  const nativeUrl = `tg://msg?text=${encodedText}`;
  const webUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch (error) {
    console.warn('[SocialShare] Telegram share failed, opening fallback:', error);
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Share via SMS / Messages app.
 */
export async function shareToSMS(text: string): Promise<boolean> {
  const encoded = encodeURIComponent(text);
  // iOS uses '&body=' while Android uses '?body='
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const smsUrl = `sms:${separator}body=${encoded}`;

  try {
    await Linking.openURL(smsUrl);
    return true;
  } catch (error) {
    console.warn('[SocialShare] SMS share failed:', error);
    return false;
  }
}

/**
 * Share to Instagram:
 * Copies caption & link to clipboard, then opens Instagram app so user can paste into Story or DM.
 */
export async function shareToInstagram(text: string, url: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(`${text}\n\n${url}`);
    
    const nativeUrl = 'instagram://app';
    const webUrl = 'https://instagram.com';

    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }

    Alert.alert(
      'Link Copied for Instagram',
      'The product link and description have been copied to your clipboard. You can now paste it directly into your Instagram Story, Post, or DM!'
    );
    return true;
  } catch (error) {
    console.warn('[SocialShare] Instagram share failed:', error);
    return false;
  }
}

/**
 * Copies a link to clipboard and returns success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.warn('[SocialShare] Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Opens system standard Share sheet.
 */
export async function shareViaNativeSheet(options: {
  title: string;
  message: string;
  url?: string;
}): Promise<boolean> {
  try {
    const content = {
      title: options.title,
      message: Platform.OS === 'ios' ? options.message : `${options.message}${options.url ? `\n\n${options.url}` : ''}`,
      url: options.url,
    };
    const result = await Share.share(content, {
      dialogTitle: options.title,
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.warn('[SocialShare] Native share sheet failed:', error);
    return false;
  }
}

