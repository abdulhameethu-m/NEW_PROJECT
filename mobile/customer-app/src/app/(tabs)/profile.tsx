import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import {
  Mail,
  Phone,
  LogOut,
  Package,
  Heart,
  MapPin,
  ShieldCheck,
  HelpCircle,
  ChevronRight,
  User as UserIcon,
  Lock,
  Edit3,
} from 'lucide-react-native';
import { useOrders } from '../../hooks/useOrders';
import { useWishlist } from '../../hooks/useWishlist';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { data: ordersData } = useOrders(undefined, 1, 10);
  const { data: wishlistItems = [] } = useWishlist();

  const ordersCount = ordersData?.orders?.length || 0;
  const wishlistCount = wishlistItems.length;

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

  if (!user) return null;

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
        <View style={styles.userCard}>
          <View style={styles.userInfoRow}>
            <View style={styles.avatar}>
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={styles.avatarText} allowFontScaling={false}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>

            <View style={styles.userDetails}>
              <Text style={styles.userName} allowFontScaling={false}>
                {user.name || 'Valued Customer'}
              </Text>
              {user.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText} allowFontScaling={false}>
                    {user.role}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.editCardBtn}
              onPress={() => router.push('/profile/edit' as any)}
              activeOpacity={0.7}
            >
              <Edit3 size={14} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.editCardBtnText} allowFontScaling={false}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactDivider} />

          <View style={styles.contactRows}>
            {user.email ? (
              <View style={styles.contactRow}>
                <View style={styles.contactIconBg}>
                  <Mail color="#64748b" size={15} />
                </View>
                <Text style={styles.contactText} allowFontScaling={false}>
                  {user.email}
                </Text>
              </View>
            ) : null}

            {user.phone ? (
              <View style={styles.contactRow}>
                <View style={styles.contactIconBg}>
                  <Phone color="#64748b" size={15} />
                </View>
                <Text style={styles.contactText} allowFontScaling={false}>
                  {user.phone}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick Hub: Orders & Wishlist Highlights */}
        <Text style={styles.sectionHeading} allowFontScaling={false}>
          Shopping Activity
        </Text>

        <View style={styles.hubGrid}>
          {/* My Orders Card */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/orders' as any)}
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
            onPress={() => router.push('/wishlist')}
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

        {/* Account Menu Options */}
        <Text style={styles.sectionHeading} allowFontScaling={false}>
          Settings & Support
        </Text>

        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/orders' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIconBg, { backgroundColor: '#f1f5f9' }]}>
              <Package size={18} color="#475569" />
            </View>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemTitle} allowFontScaling={false}>
                All Orders & Tracking
              </Text>
              <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
                Check delivery status and order history
              </Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/wishlist')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIconBg, { backgroundColor: '#f1f5f9' }]}>
              <Heart size={18} color="#475569" />
            </View>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemTitle} allowFontScaling={false}>
                My Wishlist
              </Text>
              <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
                View and manage saved products
              </Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/addresses' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIconBg, { backgroundColor: '#f1f5f9' }]}>
              <MapPin size={18} color="#475569" />
            </View>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemTitle} allowFontScaling={false}>
                Delivery Addresses
              </Text>
              <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
                Manage your saved delivery locations
              </Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profile/edit' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIconBg, { backgroundColor: '#eef2ff' }]}>
              <UserIcon size={18} color="#4f46e5" />
            </View>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemTitle} allowFontScaling={false}>
                Edit Profile
              </Text>
              <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
                Name, phone, photo & notification settings
              </Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profile/security' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIconBg, { backgroundColor: '#fdf4ff' }]}>
              <Lock size={18} color="#9333ea" />
            </View>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemTitle} allowFontScaling={false}>
                Account Security
              </Text>
              <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
                Change password and protect account
              </Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut color="#ef4444" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText} allowFontScaling={false}>
            Log Out
          </Text>
        </TouchableOpacity>
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
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
  },
  editCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  userDetails: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'capitalize',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 14,
  },
  contactRows: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
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
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 6,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 1,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 16,
    height: 50,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
