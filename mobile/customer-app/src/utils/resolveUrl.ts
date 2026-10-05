import { ENV } from '../config/env';

/**
 * Resolves relative and absolute asset URLs for images, logos, banners
 */
export function resolveUrl(url?: string | null | { url?: string; secureUrl?: string; path?: string }): string | undefined {
  if (!url) return undefined;
  
  let stringUrl: string;
  if (typeof url === 'object') {
    stringUrl = url.secureUrl || url.url || url.path || '';
  } else {
    stringUrl = String(url).trim();
  }

  if (!stringUrl) return undefined;

  // Already a full HTTP, Data, Blob, or local device URI
  if (
    stringUrl.startsWith('http://') ||
    stringUrl.startsWith('https://') ||
    stringUrl.startsWith('data:') ||
    stringUrl.startsWith('blob:') ||
    stringUrl.startsWith('file:') ||
    stringUrl.startsWith('content:') ||
    stringUrl.startsWith('ph:')
  ) {
    return stringUrl;
  }

  // Strip trailing /api from API_URL to get host base
  const hostBase = ENV.API_URL.replace(/\/api\/?$/, '');
  const cleanPath = stringUrl.startsWith('/') ? stringUrl : `/${stringUrl}`;

  return `${hostBase}${cleanPath}`;
}
