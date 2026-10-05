import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Star, ShieldCheck, MessageSquare, CornerDownRight } from 'lucide-react-native';
import { useVendorReviews } from '../../hooks/useVendor';
import { resolveUrl } from '../../utils/resolveUrl';

interface VendorReviewsListProps {
  storeSlug: string;
}

export const VendorReviewsList: React.FC<VendorReviewsListProps> = ({ storeSlug }) => {
  const { data, isLoading, error } = useVendorReviews(storeSlug);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text style={styles.loadingText} allowFontScaling={false}>
          Loading store reviews...
        </Text>
      </View>
    );
  }

  const reviews = data?.reviews || [];
  const averageRating = data?.averageRating || 0;
  const totalReviews = data?.totalReviews || 0;
  const distribution = data?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MessageSquare size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyTitle} allowFontScaling={false}>
          No Reviews Yet
        </Text>
        <Text style={styles.emptySubtitle} allowFontScaling={false}>
          This seller has not received any product reviews yet.
        </Text>
      </View>
    );
  }

  const stars = [5, 4, 3, 2, 1];

  return (
    <View style={styles.container}>
      {/* Rating Breakdown Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreNumber} allowFontScaling={false}>
            {averageRating.toFixed(1)}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={14}
                color="#f59e0b"
                fill={i <= Math.round(averageRating) ? '#f59e0b' : 'transparent'}
              />
            ))}
          </View>
          <Text style={styles.scoreReviewsCount} allowFontScaling={false}>
            Based on {totalReviews} review{totalReviews > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.barsCol}>
          {stars.map((star) => {
            const count = distribution[star] || 0;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <View key={star} style={styles.barRow}>
                <Text style={styles.starLabel} allowFontScaling={false}>
                  {star}★
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.barCount} allowFontScaling={false}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Reviews List */}
      <Text style={styles.sectionHeading} allowFontScaling={false}>
        Customer Feedback ({reviews.length})
      </Text>

      {reviews.map((rev) => {
        const avatarUri = resolveUrl(rev.customerId?.avatarUrl);
        const customerName = rev.customerId?.name || 'Verified Buyer';
        const formattedDate = new Date(rev.createdAt).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return (
          <View key={rev._id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.avatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.fallbackAvatar}>
                    <Text style={styles.avatarLetter} allowFontScaling={false}>
                      {customerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.reviewerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.reviewerName} allowFontScaling={false}>
                    {customerName}
                  </Text>
                  {rev.verifiedPurchase && (
                    <View style={styles.verifiedTag}>
                      <ShieldCheck size={11} color="#059669" />
                      <Text style={styles.verifiedTagText} allowFontScaling={false}>
                        Verified Purchase
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.reviewDate} allowFontScaling={false}>
                  {formattedDate}
                </Text>
              </View>

              {/* Star Rating Badge */}
              <View style={styles.ratingBadge}>
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.ratingBadgeText} allowFontScaling={false}>
                  {rev.rating}
                </Text>
              </View>
            </View>

            {rev.title ? (
              <Text style={styles.reviewTitle} allowFontScaling={false}>
                {rev.title}
              </Text>
            ) : null}

            {rev.review ? (
              <Text style={styles.reviewBody} allowFontScaling={false}>
                {rev.review}
              </Text>
            ) : null}

            {/* Customer Attached Photos */}
            {rev.images && rev.images.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 4 }}>
                {rev.images.map((img: any, idx: number) => {
                  const imgUri = resolveUrl(img.url) || img.url;
                  return (
                    <Image
                      key={`vendor-rev-img-${rev._id}-${idx}`}
                      source={{ uri: imgUri }}
                      style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#f1f5f9' }}
                      contentFit="cover"
                    />
                  );
                })}
              </View>
            ) : null}

            {/* Vendor Reply */}
            {rev.vendorReply ? (
              <View style={styles.vendorReplyBox}>
                <View style={styles.replyHeader}>
                  <CornerDownRight size={13} color="#4f46e5" style={{ marginRight: 4 }} />
                  <Text style={styles.replyAuthor} allowFontScaling={false}>
                    Seller Response
                  </Text>
                </View>
                <Text style={styles.replyText} allowFontScaling={false}>
                  {rev.vendorReply}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  scoreCol: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    minWidth: 110,
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 38,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  scoreReviewsCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  barsCol: {
    flex: 1,
    paddingLeft: 16,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    width: 20,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: '#94a3b8',
    width: 24,
    textAlign: 'right',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338ca',
  },
  reviewerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  verifiedTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  reviewTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  vendorReplyBox: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
    padding: 10,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  replyAuthor: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4f46e5',
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#475569',
  },
});
