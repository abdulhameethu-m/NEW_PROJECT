import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notifications';

// Safely configure foreground notification presentation
try {
  if (typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.log('[notificationService] setNotificationHandler skipped:', e);
}

let cachedPushToken: string | null = null;

export const notificationService = {
  /**
   * Request push permissions, setup Android notification channel,
   * acquire Expo push token, and register it with the backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // 1. Guard against Expo Go on Android where remote notifications were removed in SDK 53
      const isExpoGo =
        Constants.appOwnership === 'expo' ||
        (Constants.executionEnvironment as string) === 'storeClient';

      if (isExpoGo && Platform.OS === 'android') {
        console.log(
          '[notificationService] Push notifications (remote notifications) are unavailable in Expo Go on Android since SDK 53. Development build required for remote push tokens. In-App Activity Center is fully operational.'
        );
        return null;
      }

      // 2. Setup Android notification channel
      if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Order & Account Updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4f46e5',
            sound: 'default',
          });
        } catch (channelErr) {
          console.warn('[notificationService] Notification channel setup note:', channelErr);
        }
      }

      // 3. Check physical device (push notifications require a real device)
      if (!Device.isDevice) {
        console.log('[notificationService] Push notifications require a physical device.');
        return null;
      }

      // 4. Check / request permissions
      if (typeof Notifications.getPermissionsAsync !== 'function') {
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[notificationService] Push notification permissions denied.');
        return null;
      }

      // 5. Resolve EAS project ID
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        'fe41d304-3aeb-4a6e-8361-6d64c3466a8b';

      if (typeof Notifications.getExpoPushTokenAsync !== 'function') {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenData?.data;
      if (!pushToken) return null;

      cachedPushToken = pushToken;
      console.log('[notificationService] Registered Expo Push Token:', pushToken);

      // 6. Send token to backend
      const deviceModel = Device.modelName || (Platform.OS === 'android' ? 'Android Device' : 'iOS Device');
      await notificationsApi.registerPushToken(pushToken, Platform.OS, deviceModel);

      return pushToken;
    } catch (error: any) {
      console.warn('[notificationService] Failed to register push token:', error?.message || error);
      return null;
    }
  },

  /**
   * Unregister token on logout
   */
  async unregisterPushTokenAsync(): Promise<void> {
    try {
      if (cachedPushToken) {
        await notificationsApi.unregisterPushToken(cachedPushToken);
        cachedPushToken = null;
      }
    } catch (err: any) {
      console.warn('[notificationService] Failed to unregister push token:', err?.message || err);
    }
  },

  /**
   * Return cached device push token if available
   */
  getCachedToken(): string | null {
    return cachedPushToken;
  },

  /**
   * Attach response listener when user taps a push notification
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): { remove: () => void } {
    try {
      if (typeof Notifications.addNotificationResponseReceivedListener === 'function') {
        return Notifications.addNotificationResponseReceivedListener(callback);
      }
    } catch (e) {
      console.log('[notificationService] Notification tap listener skipped:', e);
    }
    return { remove: () => {} };
  },

  /**
   * Attach listener for foreground notifications
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): { remove: () => void } {
    try {
      if (typeof Notifications.addNotificationReceivedListener === 'function') {
        return Notifications.addNotificationReceivedListener(callback);
      }
    } catch (e) {
      console.log('[notificationService] Notification receive listener skipped:', e);
    }
    return { remove: () => {} };
  },
};
