import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import { guestNotificationStorage } from '../utils/guestNotificationStorage';
import { useAuthStore } from '../stores/authStore';
import { CustomerNotification, NotificationResponse } from '../types/notification';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useNotifications(filterType: string = 'ALL') {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<NotificationResponse, Error>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, filterType],
    queryFn: async () => {
      if (isAuthenticated) {
        return await notificationsApi.getNotifications({
          type: filterType === 'ALL' ? undefined : filterType,
          limit: 50,
        });
      }
      return await guestNotificationStorage.getNotifications(filterType);
    },
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useUnreadNotificationsCount() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  const { data } = useQuery<number, Error>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, 'unreadCount'],
    queryFn: async () => {
      if (isAuthenticated) {
        const res = await notificationsApi.getNotifications({ limit: 1 });
        return res?.unreadCount || 0;
      }
      const res = await guestNotificationStorage.getNotifications();
      return res?.unreadCount || 0;
    },
    refetchInterval: 60 * 1000, // Poll every 60s
    staleTime: 20 * 1000,
  });

  return data || 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation({
    mutationFn: async (id: string) => {
      if (isAuthenticated) {
        return await notificationsApi.markAsRead(id);
      }
      const notif = await guestNotificationStorage.markAsRead(id);
      return { notification: notif, unreadCount: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation({
    mutationFn: async () => {
      if (isAuthenticated) {
        return await notificationsApi.markAllAsRead();
      }
      await guestNotificationStorage.markAllAsRead();
      return { success: true, unreadCount: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation({
    mutationFn: async (id: string) => {
      if (isAuthenticated) {
        return await notificationsApi.deleteNotification(id);
      }
      await guestNotificationStorage.deleteNotification(id);
      return { success: true, unreadCount: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
