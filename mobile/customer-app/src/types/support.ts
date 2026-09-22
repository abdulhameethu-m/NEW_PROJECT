export type SupportPriority = 'low' | 'medium' | 'high';

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type SupportSenderType = 'USER' | 'SUPPORT';

export interface SupportMessage {
  senderType: SupportSenderType;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  userId: string;
  subject: string;
  category?: string;
  priority: SupportPriority;
  status: SupportStatus;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  subject: string;
  category?: string;
  priority?: SupportPriority;
  message: string;
}

export interface ReplyTicketPayload {
  message: string;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  iconName?: string;
}

export const SUPPORT_CATEGORIES = [
  { id: 'Orders & Delivery', label: 'Orders & Delivery', icon: 'Package' },
  { id: 'Returns & Refunds', label: 'Returns & Refunds', icon: 'RotateCcw' },
  { id: 'Payment & Billing', label: 'Payment & Billing', icon: 'CreditCard' },
  { id: 'Damaged / Wrong Item', label: 'Damaged / Wrong Item', icon: 'AlertTriangle' },
  { id: 'Account & Security', label: 'Account & Security', icon: 'ShieldCheck' },
  { id: 'General Inquiries', label: 'General Inquiries', icon: 'HelpCircle' },
] as const;
