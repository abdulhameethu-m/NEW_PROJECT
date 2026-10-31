import * as Linking from 'expo-linking';
import { saveAttributionFromUrl } from './attributionStorage';

export interface ParsedRouteTarget {
  pathname: string;
  params?: Record<string, any>;
}

/**
 * Normalizes an incoming deep link URL or universal link into an Expo Router destination.
 */
export function resolveDeepLinkRoute(rawUrl: string): ParsedRouteTarget | null {
  if (!rawUrl) return null;

  try {
    const parsed = Linking.parse(rawUrl);
    const rawPath = parsed.path || '';
    const cleanPath = rawPath.replace(/^\/+|\/+$/g, '');
    const segments = cleanPath ? cleanPath.split('/') : [];
    const query = (parsed.queryParams || {}) as Record<string, any>;

    if (segments.length === 0) {
      // Only return root tab if specifically using the customerapp scheme
      if (parsed.scheme === 'customerapp' || parsed.scheme === 'uchooz') {
        return { pathname: '/(tabs)' };
      }
      return null;
    }

    const first = segments[0].toLowerCase();
    const second = segments[1];
    const third = segments[2];

    switch (first) {
      case 'product':
      case 'p':
        if (second) {
          return {
            pathname: '/product/[slug]',
            params: { slug: second, ...query },
          };
        }
        return { pathname: '/(tabs)/shop' };

      case 'reels':
      case 'reel':
        return {
          pathname: '/(tabs)/reels',
          params: { ...(second ? { reelId: second } : {}), ...query },
        };

      case 'orders':
      case 'order':
        if (second) {
          if (third === 'invoice') {
            return {
              pathname: '/orders/[id]/invoice',
              params: { id: second, ...query },
            };
          }
          return {
            pathname: '/orders/[id]',
            params: { id: second, ...query },
          };
        }
        return { pathname: '/orders' };

      case 'stores':
      case 'store':
      case 'vendor':
        if (second) {
          return {
            pathname: '/stores/[slug]',
            params: { slug: second, ...query },
          };
        }
        return { pathname: '/stores' };

      case 'search':
        return {
          pathname: '/search',
          params: { ...query },
        };

      case 'cart':
        return {
          pathname: '/(tabs)/cart',
          params: { ...query },
        };

      case 'wishlist':
        return {
          pathname: '/wishlist',
          params: { ...query },
        };

      case 'profile':
        return {
          pathname: '/(tabs)/profile',
          params: { ...query },
        };

      case 'notifications':
        return {
          pathname: '/notifications',
          params: { ...query },
        };

      case 'checkout':
        return {
          pathname: '/checkout',
          params: { ...query },
        };

      default:
        return null;
    }
  } catch (error) {
    console.warn('[DeepLinking] Failed to parse deep link route:', error);
    return null;
  }
}

/**
 * Global deep link ingestor:
 * 1. Saves influencer / referral attribution into local storage
 * 2. Resolves route and executes navigation in Expo Router
 */
export async function handleIncomingDeepLink(rawUrl: string, router: any): Promise<boolean> {
  if (!rawUrl) return false;

  // Ignore development bundler connection URLs (e.g. exp://192.168.1.39:8081, exp+abdul-hameethu://...)
  if (
    rawUrl.startsWith('exp://') ||
    rawUrl.startsWith('exp+') ||
    rawUrl.includes('expo-development-client')
  ) {
    const parsed = Linking.parse(rawUrl);
    if (!parsed.path || parsed.path === '/' || parsed.path === '') {
      return false;
    }
  }

  console.log('[DeepLinking] Ingesting deep link URL:', rawUrl);

  try {
    // 1. Capture influencer / affiliate attribution tokens
    await saveAttributionFromUrl(rawUrl);

    // 2. Resolve destination route
    const target = resolveDeepLinkRoute(rawUrl);
    if (!target) {
      console.log('[DeepLinking] No dedicated screen mapped for URL, ignoring');
      return false;
    }

    // 3. Navigate to target
    if (target.params && Object.keys(target.params).length > 0) {
      router.push({
        pathname: target.pathname as any,
        params: target.params,
      });
    } else {
      router.push(target.pathname as any);
    }

    return true;
  } catch (error) {
    console.warn('[DeepLinking] Error executing deep link navigation:', error);
    return false;
  }
}

