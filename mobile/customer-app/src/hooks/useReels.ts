import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reelsApi } from '../api/reels';
import { ReelFeedResponse, ReelItem } from '../types/reel';

export function useReelFeed(params: { category?: string; sort?: 'newest' | 'views' | 'trending' } = {}) {
  return useInfiniteQuery<ReelFeedResponse>({
    queryKey: ['reels', 'feed', params.category, params.sort || 'newest'],
    queryFn: ({ pageParam = 1 }) =>
      reelsApi.getFeed({
        page: pageParam as number,
        limit: 8,
        category: params.category,
        sort: params.sort || 'newest',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useToggleReelLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reelId: string) => reelsApi.toggleLike(reelId),
    onMutate: async (reelId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reels', 'feed'] });

      // Optimistically update all feed queries containing this reel
      queryClient.setQueriesData<any>({ queryKey: ['reels', 'feed'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ReelFeedResponse) => ({
            ...page,
            items: page.items.map((item: ReelItem) => {
              if (item._id === reelId) {
                const currentLiked = item.engagement?.viewer?.liked || false;
                const currentCount = item.engagement?.counts?.likes || 0;
                return {
                  ...item,
                  engagement: {
                    ...item.engagement,
                    viewer: {
                      ...item.engagement?.viewer,
                      liked: !currentLiked,
                    },
                    counts: {
                      ...item.engagement?.counts,
                      likes: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
                    },
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
    },
    onError: (_err, _reelId, _context) => {
      queryClient.invalidateQueries({ queryKey: ['reels', 'feed'] });
    },
  });
}

export function useToggleReelSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reelId: string) => reelsApi.toggleSave(reelId),
    onMutate: async (reelId) => {
      await queryClient.cancelQueries({ queryKey: ['reels', 'feed'] });

      queryClient.setQueriesData<any>({ queryKey: ['reels', 'feed'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ReelFeedResponse) => ({
            ...page,
            items: page.items.map((item: ReelItem) => {
              if (item._id === reelId) {
                const currentSaved = item.engagement?.viewer?.saved || false;
                const currentCount = item.engagement?.counts?.saves || 0;
                return {
                  ...item,
                  engagement: {
                    ...item.engagement,
                    viewer: {
                      ...item.engagement?.viewer,
                      saved: !currentSaved,
                    },
                    counts: {
                      ...item.engagement?.counts,
                      saves: currentSaved ? Math.max(0, currentCount - 1) : currentCount + 1,
                    },
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['reels', 'feed'] });
    },
  });
}

export function useReelComments(reelId?: string) {
  return useQuery({
    queryKey: ['reels', reelId, 'comments'],
    queryFn: () => (reelId ? reelsApi.getComments(reelId) : Promise.resolve({ items: [], total: 0, hasMore: false })),
    enabled: Boolean(reelId),
  });
}

export function useAddReelComment(reelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => reelsApi.addComment(reelId, text),
    onSuccess: (newComment) => {
      queryClient.setQueryData(['reels', reelId, 'comments'], (oldData: any) => {
        if (!oldData) return { items: [newComment], total: 1, hasMore: false };
        return {
          ...oldData,
          total: (oldData.total || 0) + 1,
          items: [newComment, ...(oldData.items || [])],
        };
      });

      // Also increment comment count in feed
      queryClient.setQueriesData<any>({ queryKey: ['reels', 'feed'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ReelFeedResponse) => ({
            ...page,
            items: page.items.map((item: ReelItem) => {
              if (item._id === reelId) {
                const currentComments = item.engagement?.counts?.comments || 0;
                return {
                  ...item,
                  engagement: {
                    ...item.engagement,
                    counts: {
                      ...item.engagement?.counts,
                      comments: currentComments + 1,
                    },
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
    },
  });
}

export function useFollowCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId, following }: { reelId: string; following: boolean }) =>
      reelsApi.followCreator(reelId, following),
    onSuccess: (data, { reelId }) => {
      queryClient.setQueriesData<any>({ queryKey: ['reels', 'feed'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ReelFeedResponse) => ({
            ...page,
            items: page.items.map((item: ReelItem) => {
              if (item._id === reelId && item.influencerId) {
                return {
                  ...item,
                  influencerId: {
                    ...item.influencerId,
                    isFollowing: data.following,
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
    },
  });
}
