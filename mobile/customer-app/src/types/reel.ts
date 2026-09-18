export interface ReelProduct {
  _id: string;
  id?: string;
  name?: string;
  title?: string;
  slug?: string;
  price?: number;
  salePrice?: number;
  regularPrice?: number;
  images?: Array<{ url: string } | string>;
  image?: string;
  category?: string;
  brand?: string;
  rating?: {
    average?: number;
    count?: number;
  };
  affiliateLink?: string;
}

export interface ReelInfluencer {
  _id: string;
  displayName?: string;
  storeSlug?: string;
  storeName?: string;
  profilePicture?: string;
  profileImage?: string;
  avatarUrl?: string;
  followers?: number;
  verified?: boolean;
  isFollowing?: boolean;
  userId?: {
    _id: string;
    name?: string;
  };
}

export interface ReelEngagementCounts {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  bookmarks?: number;
  clicks?: number;
  revenue?: number;
  commission?: number;
}

export interface ReelEngagement {
  counts: ReelEngagementCounts;
  viewer: {
    liked: boolean;
    saved: boolean;
  };
}

export interface ReelItem {
  _id: string;
  title?: string;
  caption?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  contentType?: 'REEL' | 'POST' | string;
  mediaType?: 'video' | 'image' | string;
  category?: string;
  tags?: string[];
  influencerId?: ReelInfluencer;
  products?: ReelProduct[];
  productIds?: any[];
  campaignBadge?: string;
  brandName?: string;
  sponsored?: boolean;
  engagement?: ReelEngagement;
  publishedAt?: string;
  createdAt?: string;
}

export interface ReelCommentUser {
  _id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface ReelCommentReply {
  _id: string;
  userId: ReelCommentUser;
  text: string;
  createdAt: string;
  likesCount?: number;
}

export interface ReelComment {
  _id: string;
  reelId: string;
  userId: ReelCommentUser;
  text: string;
  likesCount?: number;
  isLiked?: boolean;
  repliesCount?: number;
  replies?: ReelCommentReply[];
  createdAt: string;
}

export interface ReelFeedResponse {
  items: ReelItem[];
  page: number;
  limit: number;
  hasMore: boolean;
}
