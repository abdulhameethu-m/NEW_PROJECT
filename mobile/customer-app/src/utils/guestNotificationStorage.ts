import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerNotification, NotificationResponse } from '../types/notification';

const GUEST_NOTIFICATIONS_STORAGE_KEY = '@uchooz_guest_notifications';

const DEFAULT_GUEST_NOTIFICATIONS: CustomerNotification[] = [
  {
    _id: 'guest_notif_welcome',
    type: 'SYSTEM',
    title: 'Welcome to UChooseMe! 🎉',
    message: 'Explore millions of trending products, viral video reels, and verified local stores.',
    data: { screen: 'home' },
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'guest_notif_promo',
    type: 'PROMOTION',
    title: 'Special First Order Discount! 🎁',
    message: 'Use promo code WELCOME10 at checkout to get 10% off your entire order.',
    data: { screen: 'shop' },
    isRead: false,
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    _id: 'guest_notif_freeship',
    type: 'PROMOTION',
    title: 'Free Shipping Available 🚚',
    message: 'Enjoy free delivery across India on orders over ₹499 with code FREESHIP.',
    data: { screen: 'cart' },
    isRead: true,
    createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
];

export const guestNotificationStorage = {
  /**
   * Retrieve guest notifications list
   */
  async getNotifications(filterType?: string): Promise<NotificationResponse> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_NOTIFICATIONS_STORAGE_KEY);
      let list: CustomerNotification[] = raw ? JSON.parse(raw) : DEFAULT_GUEST_NOTIFICATIONS;

      // Filter by type if not ALL
      let filtered = list;
      if (filterType && filterType !== 'ALL') {
        filtered = list.filter((n) => n.type === filterType.toUpperCase());
      }

      const unreadCount = list.filter((n) => !n.isRead).length;

      return {
        notifications: filtered,
        total: filtered.length,
        unreadCount,
        page: 1,
        limit: filtered.length,
        pages: 1,
      };
    } catch (e) {
      console.warn('[guestNotificationStorage] Read error:', e);
      return {
        notifications: DEFAULT_GUEST_NOTIFICATIONS,
        total: DEFAULT_GUEST_NOTIFICATIONS.length,
        unreadCount: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };
    }
  },

  /**
   * Mark a single guest notification as read
   */
  async markAsRead(id: string): Promise<CustomerNotification | null> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_NOTIFICATIONS_STORAGE_KEY);
      let list: CustomerNotification[] = raw ? JSON.parse(raw) : [...DEFAULT_GUEST_NOTIFICATIONS];
      let updated: CustomerNotification | null = null;

      list = list.map((item) => {
        if (item._id === id) {
          updated = { ...item, isRead: true, readAt: new Date().toISOString() };
          return updated;
        }
        return item;
      });

      await AsyncStorage.setItem(GUEST_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      return updated;
    } catch {
      return null;
    }
  },

  /**
   * Mark all guest notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_NOTIFICATIONS_STORAGE_KEY);
      let list: CustomerNotification[] = raw ? JSON.parse(raw) : [...DEFAULT_GUEST_NOTIFICATIONS];

      list = list.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() }));
      await AsyncStorage.setItem(GUEST_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete a guest notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_NOTIFICATIONS_STORAGE_KEY);
      let list: CustomerNotification[] = raw ? JSON.parse(raw) : [...DEFAULT_GUEST_NOTIFICATIONS];

      list = list.filter((item) => item._id !== id);
      await AsyncStorage.setItem(GUEST_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  },
};
