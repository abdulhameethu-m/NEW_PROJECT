import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Package, Heart } from 'lucide-react-native';

export interface AccountStatisticsCardsProps {
  ordersCount: number;
  wishlistCount: number;
  onOrdersPress: () => void;
  onWishlistPress: () => void;
}

export const AccountStatisticsCards: React.FC<AccountStatisticsCardsProps> = ({
  ordersCount,
  wishlistCount,
  onOrdersPress,
  onWishlistPress,
}) => {
  return (
    <>
      <Text style={styles.sectionHeading} allowFontScaling={false}>
        Shopping Activity
      </Text>

      <View style={styles.hubGrid}>
        {/* My Orders Card */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onOrdersPress}
          activeOpacity={0.82}
        >
          <View style={[styles.hubIconBg, { backgroundColor: '#eef2ff' }]}>
            <Package size={22} color="#4f46e5" />
          </View>
          <Text style={styles.hubCardTitle} allowFontScaling={false}>
            My Orders
          </Text>
          <Text style={styles.hubCardSubtitle} allowFontScaling={false}>
            {ordersCount > 0 ? `${ordersCount} order${ordersCount > 1 ? 's' : ''}` : 'Track & manage'}
          </Text>
          {ordersCount > 0 && (
            <View style={styles.hubBadge}>
              <Text style={styles.hubBadgeText} allowFontScaling={false}>
                {ordersCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Wishlist Card */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={onWishlistPress}
          activeOpacity={0.82}
        >
          <View style={[styles.hubIconBg, { backgroundColor: '#fff1f2' }]}>
            <Heart size={22} color="#e11d48" />
          </View>
          <Text style={styles.hubCardTitle} allowFontScaling={false}>
            Wishlist
          </Text>
          <Text style={styles.hubCardSubtitle} allowFontScaling={false}>
            {wishlistCount > 0 ? `${wishlistCount} saved` : 'Favorite items'}
          </Text>
          {wishlistCount > 0 && (
            <View style={[styles.hubBadge, { backgroundColor: '#ffe4e6' }]}>
              <Text style={[styles.hubBadgeText, { color: '#e11d48' }]} allowFontScaling={false}>
                {wishlistCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  hubGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  hubCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  hubIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hubCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  hubCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  hubBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  hubBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
});
