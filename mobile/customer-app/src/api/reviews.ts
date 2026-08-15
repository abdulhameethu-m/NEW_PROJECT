import { apiClient } from './client';
import { Pagination } from '../types/catalog';

export type ReviewRecommendation = 'yes' | 'no' | null;
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'deleted';

export interface ReviewMedia {
  url: string;
  publicId?: string | null;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

export interface ReviewAuthor {
  _id: string;
  name?: string;
  avatarUrl?: string;
}

export interface ProductReview {
  _id: string;
  productId: string;
  vendorId: any;
  customerId: ReviewAuthor | string;
  orderId: string;
  rating: number;
  title?: string;
  review?: string;
  images?: ReviewMedia[];
  videos?: ReviewMedia[];
  wouldRecommend?: ReviewRecommendation;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  helpfulCount: number;
  notHelpfulCount: number;
  vendorReply?: string | null;
  vendorReplyDate?: string | null;
  createdAt: string;
}

export interface ProductReviewListResponse {
  summary?: any; // the summary payload if provided
  reviews: ProductReview[];
  pagination: Pagination;
}

export const getProductReviews = async (
  productId: string,
  page: number = 1,
  limit: number = 10
): Promise<ProductReviewListResponse> => {
  const { data } = await apiClient.get(`/reviews/product/${productId}`, {
    params: { page, limit },
  });
  return data?.data || data;
};

export interface SubmitReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  review?: string;
  wouldRecommend?: 'yes' | 'no';
  // media[] is attached as FormData
}

export const submitProductReview = async (payload: SubmitReviewPayload, mediaFiles: any[] = []): Promise<ProductReview> => {
  const formData = new FormData();
  
  formData.append('productId', payload.productId);
  formData.append('rating', String(payload.rating));
  
  if (payload.title) {
    formData.append('title', payload.title);
  }
  
  if (payload.review) {
    formData.append('review', payload.review);
  }
  
  if (payload.wouldRecommend) {
    formData.append('wouldRecommend', payload.wouldRecommend);
  }
  
  if (mediaFiles && mediaFiles.length > 0) {
    mediaFiles.forEach((file) => {
      formData.append('media', file);
    });
  }
  
  const { data } = await apiClient.post('/reviews', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Required to keep Axios cookies/CSRF if configured in client.ts
    withCredentials: true,
  });
  
  return data?.data || data;
};
