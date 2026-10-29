import { apiClient } from './client';
import { CustomerNotification, NotificationResponse } from '../types/notification';

export const notificationsApi = {
  /**
   * Register device push token with backend user profile
   */
  registerPushToken: async (token: string, platform = 'android', deviceId = '') => {
    try {
      const response = await apiClient.post('/users/push-token', {
        token,
        platform,
        deviceId,
      });
      return response.data?.data || response.data;
    } catch (e) {
      console.warn('[notificationsApi] Push token registration skipped:', e);
      return null;
    }
  },

  /**
   * Unregister device push token upon logout
   */
  unregisterPushToken: async (token: string) => {
    try {
      const response = await apiClient.delete('/users/push-token', {
        data: { token },
      });
      return response.data?.data || response.data;
    } catch (e) {
      console.warn('[notificationsApi] Push token unregistration skipped:', e);
      return null;
    }
  },

  /**
   * Fetch customer notifications with pagination & filter
   */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    unreadOnly?: boolean;
  }): Promise<NotificationResponse> => {
    const response = await apiClient.get('/users/notifications', { params });
    return response.data?.data || response.data;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<{ notification: CustomerNotification; unreadCount: number }> => {
    const response = await apiClient.patch(`/users/notifications/${id}/read`);
    return response.data?.data || response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean; unreadCount: number }> => {
    const response = await apiClient.post('/users/notifications/read-all');
    return response.data?.data || response.data;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id: string): Promise<{ success: boolean; unreadCount: number }> => {
    const response = await apiClient.delete(`/users/notifications/${id}`);
    return response.data?.data || response.data;
  },
};
