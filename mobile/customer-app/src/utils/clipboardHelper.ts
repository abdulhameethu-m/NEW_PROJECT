import { Platform } from 'react-native';

/**
 * Universal clipboard utility that works safely across Native and Web
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    try {
      // Dynamically load expo-clipboard if present
      const ExpoClipboard = require('expo-clipboard');
      if (ExpoClipboard && typeof ExpoClipboard.setStringAsync === 'function') {
        await ExpoClipboard.setStringAsync(text);
        return true;
      }
    } catch {
      // Fallback
    }

    return true;
  } catch (err) {
    console.warn('[clipboardHelper] Failed to copy text:', err);
    return false;
  }
}

