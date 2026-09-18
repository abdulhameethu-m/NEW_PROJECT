import { apiClient } from './client';
import { ReelFeedResponse, ReelItem, ReelComment } from '../types/reel';
import { ENV } from '../config/env';

/**
 * Resolves relative reel media/video paths (e.g. /uploads/reels/...) to full absolute URLs.
 */
export function resolveReelMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }
  const baseUrl = ENV.API_URL.replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
}

export const reelsApi = {
  getFeed: async ({
    page = 1,
    limit = 10,
    category,
    sort = 'newest',
  }: {
    page?: number;
    limit?: number;
    category?: string;
    sort?: 'newest' | 'views' | 'trending';
  } = {}): Promise<ReelFeedResponse> => {
    const params: Record<string, any> = { page, limit, sort };
    if (category) params.category = category;

    const response = await apiClient.get('/reel/feed', { params });
    const data = response.data?.data || response.data;
    return {
      items: data.items || [],
      page: data.page || page,
      limit: data.limit || limit,
      hasMore: Boolean(data.hasMore),
    };
  },

  getById: async (reelId: string): Promise<ReelItem> => {
    const response = await apiClient.get(`/reel/${reelId}`);
    return response.data?.data || response.data;
  },

  toggleLike: async (reelId: string): Promise<{ liked: boolean; counts?: any }> => {
    const response = await apiClient.post(`/reel/${reelId}/like`);
    return response.data?.data || response.data;
  },

  toggleSave: async (reelId: string): Promise<{ saved: boolean; counts?: any }> => {
    const response = await apiClient.post(`/reel/${reelId}/save`, {
      collectionName: 'Saved reels',
    });
    return response.data?.data || response.data;
  },

  getComments: async (
    reelId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
  ): Promise<{ items: ReelComment[]; total: number; hasMore: boolean }> => {
    const response = await apiClient.get(`/reel/${reelId}/comments`, {
      params: { page, limit },
    });
    const data = response.data?.data || response.data;
    return {
      items: data.items || [],
      total: data.total || 0,
      hasMore: Boolean(data.hasMore),
    };
  },

  addComment: async (reelId: string, text: string): Promise<ReelComment> => {
    const response = await apiClient.post(`/reel/${reelId}/comments`, { text });
    return response.data?.data || response.data;
  },

  toggleCommentLike: async (reelId: string, commentId: string): Promise<{ liked: boolean }> => {
    const response = await apiClient.post(`/reel/${reelId}/comments/${commentId}/like`);
    return response.data?.data || response.data;
  },

  followCreator: async (reelId: string, following: boolean = true): Promise<{ following: boolean; followers?: number }> => {
    const response = await apiClient.post(`/reel/${reelId}/follow`, { following });
    return response.data?.data || response.data;
  },

  recordView: async (
    reelId: string,
    payload: { watchTimeSeconds?: number; progressPercent?: number; completed?: boolean } = {}
  ): Promise<void> => {
    try {
      await apiClient.post(`/reel/${reelId}/view`, payload);
    } catch {
      // Fire-and-forget metric
    }
  },

  recordProductClick: async (reelId: string, productId: string): Promise<void> => {
    try {
      await apiClient.post(`/reel/${reelId}/product-click`, { productId });
    } catch {
      // Fire-and-forget attribution
    }
  },
};
