import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../api/support';
import { SupportTicket, CreateTicketPayload, ReplyTicketPayload } from '../types/support';

export const SUPPORT_KEYS = {
  all: ['support-tickets'] as const,
  detail: (id: string) => ['support-tickets', id] as const,
};

/**
 * Hook to retrieve all support tickets for the authenticated customer
 */
export function useSupportTickets() {
  return useQuery<SupportTicket[], Error>({
    queryKey: SUPPORT_KEYS.all,
    queryFn: () => supportApi.getTickets(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to retrieve a specific support ticket by ID
 */
export function useSupportTicket(id?: string) {
  const queryClient = useQueryClient();

  return useQuery<SupportTicket | null, Error>({
    queryKey: SUPPORT_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      // First attempt to find in cached list of tickets
      const cachedList = queryClient.getQueryData<SupportTicket[]>(SUPPORT_KEYS.all);
      const found = cachedList?.find((t) => t._id === id);
      if (found) return found;

      // If not in cache, refetch all tickets and find
      const all = await supportApi.getTickets();
      return all.find((t) => t._id === id) || null;
    },
    enabled: Boolean(id && id.trim().length > 0),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to create a new customer support ticket
 */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<SupportTicket, Error, CreateTicketPayload>({
    mutationFn: (payload: CreateTicketPayload) => supportApi.createTicket(payload),
    onSuccess: (newTicket) => {
      // Prepend to ticket list in cache
      queryClient.setQueryData<SupportTicket[]>(SUPPORT_KEYS.all, (prev) => {
        if (!prev) return [newTicket];
        return [newTicket, ...prev.filter((t) => t._id !== newTicket._id)];
      });
      queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.all });
    },
  });
}

/**
 * Hook to reply to an ongoing support ticket thread
 */
export function useReplySupportTicket() {
  const queryClient = useQueryClient();

  return useMutation<SupportTicket, Error, { ticketId: string; payload: ReplyTicketPayload }>({
    mutationFn: ({ ticketId, payload }) => supportApi.replyTicket(ticketId, payload),
    onSuccess: (updatedTicket) => {
      // Update specific ticket query
      queryClient.setQueryData(SUPPORT_KEYS.detail(updatedTicket._id), updatedTicket);

      // Update in ticket list cache
      queryClient.setQueryData<SupportTicket[]>(SUPPORT_KEYS.all, (prev) => {
        if (!prev) return [updatedTicket];
        return prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t));
      });

      queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.all });
    },
  });
}
