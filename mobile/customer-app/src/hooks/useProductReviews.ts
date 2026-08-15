import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductReviews, submitProductReview, SubmitReviewPayload } from '../api/reviews';

export const useProductReviews = (productId?: string) => {
  return useInfiniteQuery({
    queryKey: ['productReviews', productId],
    queryFn: ({ pageParam = 1 }) => getProductReviews(productId!, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    enabled: !!productId,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, files }: { payload: SubmitReviewPayload; files: any[] }) =>
      submitProductReview(payload, files),
    onSuccess: (newReview, variables) => {
      // Invalidate both product and reviews so the summary and list reset natively
      // The implementation plan mandates finding the product *slug*.
      // We know productId to invalidate reviews:
      queryClient.invalidateQueries({ queryKey: ['productReviews', variables.payload.productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
};
