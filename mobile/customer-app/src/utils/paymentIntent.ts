/**
 * Normalizes Android intent URLs (e.g. intent://pay?...#Intent;scheme=upi;package=...;end)
 * and deep links into standard executable URI schemes (upi://, phonepe://, gpay://, etc.)
 */
export const resolvePaymentIntentUrl = (url: string): string => {
  if (!url) return '';

  // Convert Android intent:// URIs to standard upi:// scheme
  if (url.startsWith('intent://')) {
    const match = url.match(/scheme=([^;]+)/);
    const scheme = match ? match[1] : 'upi';
    const cleanUri = url
      .replace(/^intent:\/\//, `${scheme}://`)
      .replace(/#Intent;.*$/, '');
    return cleanUri;
  }

  // Handle intent format with explicit data param (e.g. intent:#Intent;data=upi%3A%2F%2Fpay...;end)
  if (url.startsWith('intent:')) {
    const dataMatch = url.match(/data=([^;]+)/);
    if (dataMatch && dataMatch[1]) {
      try {
        const decoded = decodeURIComponent(dataMatch[1]);
        if (
          decoded.startsWith('upi://') ||
          decoded.startsWith('gpay://') ||
          decoded.startsWith('phonepe://') ||
          decoded.startsWith('paytmmp://')
        ) {
          return decoded;
        }
      } catch {
        // Fall back to regex parsing below
      }
    }

    const schemeMatch = url.match(/scheme=([^;]+)/);
    const scheme = schemeMatch ? schemeMatch[1] : 'upi';

    let resolved = url.replace(/^intent:\/\//, `${scheme}://`).replace(/^intent:/, `${scheme}:`);
    resolved = resolved.replace(/#Intent;.*$/, '');
    return resolved;
  }

  return url;
};
