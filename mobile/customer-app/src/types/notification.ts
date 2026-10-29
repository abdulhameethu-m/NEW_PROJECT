export type NotificationType =
  | 'ALL'
  | 'ORDER'
  | 'DELIVERY'
  | 'PROMOTION'
  | 'SYSTEM'
  | 'SUPPORT'
  | 'PAYMENT'
  | 'ACCOUNT';

export interface CustomerNotification {
  _id: string;
  userId?: string;
  type: 'ORDER' | 'DELIVERY' | 'PROMOTION' | 'SYSTEM' | 'SUPPORT' | 'PAYMENT' | 'ACCOUNT';
  title: string;
  message: string;
  data?: {
    orderId?: string;
    orderNumber?: string;
    productId?: string;
    slug?: string;
    screen?: string;
    url?: string;
    ticketId?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: CustomerNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  pages: number;
}
