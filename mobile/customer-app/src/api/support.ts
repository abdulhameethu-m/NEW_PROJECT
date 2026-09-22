import { apiClient } from './client';
import { SupportTicket, CreateTicketPayload, ReplyTicketPayload } from '../types/support';

export const supportApi = {
  /**
   * List all support tickets for the current authenticated user
   */
  getTickets: async (): Promise<SupportTicket[]> => {
    const response = await apiClient.get<{
      success: boolean;
      data: SupportTicket[];
      message?: string;
    }>('/user/support');

    const data = response.data;
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  /**
   * Create a new support inquiry or dispute ticket
   */
  createTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    const response = await apiClient.post<{
      success: boolean;
      data: SupportTicket;
      message?: string;
    }>('/user/support', payload);

    return response.data.data;
  },

  /**
   * Append a customer reply to an existing support ticket thread
   */
  replyTicket: async (ticketId: string, payload: ReplyTicketPayload): Promise<SupportTicket> => {
    const response = await apiClient.post<{
      success: boolean;
      data: SupportTicket;
      message?: string;
    }>(`/user/support/${ticketId}/reply`, payload);

    return response.data.data;
  },
};
