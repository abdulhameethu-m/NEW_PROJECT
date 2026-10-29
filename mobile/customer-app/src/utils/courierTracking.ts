import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export interface CourierInfo {
  name: string;
  code: string;
  trackingNumber: string;
  trackingUrl: string;
  badgeColor: string;
  badgeBg: string;
  customerCarePhone?: string;
  website: string;
}

/**
 * Resolves standard Indian courier partners (Delhivery, Shadowfax, Shiprocket, Blue Dart, DTDC, Ekart)
 * and generates live tracking links using the AWB tracking number.
 */
export function resolveCourierTracking(
  courierName?: string,
  trackingId?: string,
  explicitUrl?: string
): CourierInfo {
  const awb = (trackingId || '').trim();
  const rawName = (courierName || '').trim();
  const lowerName = rawName.toLowerCase();

  // If a valid direct URL is provided by backend, use it
  if (explicitUrl && explicitUrl.startsWith('http')) {
    return {
      name: rawName || 'Express Courier',
      code: 'DIRECT',
      trackingNumber: awb,
      trackingUrl: explicitUrl,
      badgeColor: '#4f46e5',
      badgeBg: '#e0e7ff',
      website: explicitUrl,
    };
  }

  // Delhivery
  if (lowerName.includes('delhivery')) {
    return {
      name: 'Delhivery',
      code: 'DELHIVERY',
      trackingNumber: awb,
      trackingUrl: awb
        ? `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`
        : 'https://www.delhivery.com',
      badgeColor: '#dc2626',
      badgeBg: '#fee2e2',
      customerCarePhone: '0124-6719500',
      website: 'https://www.delhivery.com',
    };
  }

  // Shadowfax
  if (lowerName.includes('shadowfax')) {
    return {
      name: 'Shadowfax',
      code: 'SHADOWFAX',
      trackingNumber: awb,
      trackingUrl: awb
        ? `https://tracker.shadowfax.in/#/track?awb=${encodeURIComponent(awb)}`
        : 'https://www.shadowfax.in',
      badgeColor: '#ea580c',
      badgeBg: '#ffedd5',
      customerCarePhone: '080-68172500',
      website: 'https://www.shadowfax.in',
    };
  }

  // Shiprocket
  if (lowerName.includes('shiprocket')) {
    return {
      name: 'Shiprocket',
      code: 'SHIPROCKET',
      trackingNumber: awb,
      trackingUrl: awb
        ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`
        : 'https://www.shiprocket.in',
      badgeColor: '#7c3aed',
      badgeBg: '#ede9fe',
      customerCarePhone: '011-40540555',
      website: 'https://www.shiprocket.in',
    };
  }

  // Blue Dart
  if (lowerName.includes('blue dart') || lowerName.includes('bluedart')) {
    return {
      name: 'Blue Dart',
      code: 'BLUEDART',
      trackingNumber: awb,
      trackingUrl: awb
        ? `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(awb)}`
        : 'https://www.bluedart.com',
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
      customerCarePhone: '1860-233-1234',
      website: 'https://www.bluedart.com',
    };
  }

  // DTDC
  if (lowerName.includes('dtdc')) {
    return {
      name: 'DTDC Express',
      code: 'DTDC',
      trackingNumber: awb,
      trackingUrl: awb
        ? `https://www.dtdc.in/tracking/tracking_results.asp?action=search&Ttype=awb&strCnno=${encodeURIComponent(awb)}`
        : 'https://www.dtdc.in',
      badgeColor: '#b91c1c',
      badgeBg: '#fef2f2',
      customerCarePhone: '080-25365032',
      website: 'https://www.dtdc.in',
    };
  }

  // Ekart Logistics
  if (lowerName.includes('ekart')) {
    return {
      name: 'Ekart Logistics',
      code: 'EKART',
      trackingNumber: awb,
      trackingUrl: awb
        ? `https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(awb)}`
        : 'https://ekartlogistics.com',
      badgeColor: '#059669',
      badgeBg: '#d1fae5',
      customerCarePhone: '1800-420-1111',
      website: 'https://ekartlogistics.com',
    };
  }

  // Default / Partner fallback
  return {
    name: rawName || 'Express Courier',
    code: 'STANDARD',
    trackingNumber: awb,
    trackingUrl: awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : '',
    badgeColor: '#4f46e5',
    badgeBg: '#e0e7ff',
    website: 'https://www.shiprocket.in',
  };
}

/**
 * Open courier tracking in an in-app browser with fallback to system browser
 */
export async function openCourierTrackingUrl(url: string): Promise<void> {
  if (!url) return;

  try {
    if (typeof WebBrowser.openBrowserAsync === 'function') {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#4f46e5',
      });
      return;
    }
  } catch {
    // Fallback to Linking
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch (err) {
    console.warn('[courierTracking] Failed to open tracking url:', err);
  }
}

