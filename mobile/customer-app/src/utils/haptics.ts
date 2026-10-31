import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Micro-vibrations and tactile haptic feedback service.
 * Safely guards against web and unsupported hardware platforms.
 */
export const hapticFeedback = {
  /**
   * Micro-vibration when adding an item to the shopping cart (medium impact).
   */
  cartAdd: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignored silently on unsupported platforms
    }
  },

  /**
   * Tactile micro-vibration when toggling wishlist state.
   * Distinct feels for active (added) vs inactive (removed).
   */
  wishlistToggle: async (isActive?: boolean) => {
    if (Platform.OS === 'web') return;
    try {
      if (isActive) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.selectionAsync();
      }
    } catch {
      // Ignored silently
    }
  },

  /**
   * Success notification vibration when an order is confirmed or payment succeeds.
   */
  paymentSuccess: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignored silently
    }
  },

  /**
   * Error notification vibration when a payment, coupon, or critical checkout action fails.
   */
  paymentError: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignored silently
    }
  },

  /**
   * Light tactile tap for selection changes (quantities, variants, tabs).
   */
  selection: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored silently
    }
  },
};

