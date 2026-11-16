import React from 'react';
import {
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useOrders } from '../../hooks/useOrders';
import { useWishlist } from '../../hooks/useWishlist';
import { useCustomerReturns } from '../../hooks/useReturns';
import { useFollowedStores } from '../../hooks/useVendor';
import { useSupportTickets } from '../../hooks/useSupport';
import { useUnreadNotificationsCount } from '../../hooks/useNotifications';
import { ProfileGuestView } from '../../components/profile/ProfileGuestView';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { AccountStatisticsCards } from '../../components/profile/AccountStatisticsCards';
import { ProfileMenuItems } from '../../components/profile/ProfileMenuItems';
import { ProfileLogoutButton } from '../../components/profile/ProfileLogoutButton';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const unreadNotificationsCount = useUnreadNotificationsCount();

  const { data: ordersData } = useOrders(undefined, 1, 10);
  const { data: wishlistItems = [] } = useWishlist();
  const { data: returnsData } = useCustomerReturns({ limit: 20 });
  const { data: followedStoresData } = useFollowedStores();
  const { data: supportTickets = [] } = useSupportTickets();

  const ordersCount = ordersData?.orders?.length || 0;
  const wishlistCount = wishlistItems.length;
  const returnsCount = returnsData?.returns?.length || 0;
  const followedCount = followedStoresData?.pagination?.total ?? (followedStoresData?.stores?.length || 0);
  const openTicketsCount = supportTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await authApi.logout();
          },
        },
      ]
    );
  };

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  if (!user) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <ProfileGuestView
            unreadNotificationsCount={unreadNotificationsCount}
            onNavigate={handleNavigate}
          />
        </ScrollView>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle} allowFontScaling={false}>
          My Account
        </Text>

        {/* User Card */}
        <ProfileHeader
          user={user}
          onEditPress={() => handleNavigate('/profile/edit')}
        />

        {/* Quick Hub: Orders & Wishlist Highlights */}
        <AccountStatisticsCards
          ordersCount={ordersCount}
          wishlistCount={wishlistCount}
          onOrdersPress={() => handleNavigate('/orders')}
          onWishlistPress={() => handleNavigate('/wishlist')}
        />

        {/* Account Menu Options */}
        <ProfileMenuItems
          unreadNotificationsCount={unreadNotificationsCount}
          returnsCount={returnsCount}
          followedCount={followedCount}
          openTicketsCount={openTicketsCount}
          onNavigate={handleNavigate}
        />

        {/* Log Out Button */}
        <ProfileLogoutButton onLogout={handleLogout} />
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
  },
});
