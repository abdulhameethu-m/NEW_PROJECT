import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Package,
  Heart,
  ShieldCheck,
  HelpCircle,
  Store,
  Bell,
  FileText,
  ChevronRight,
  User as UserIcon,
  LogIn,
  ArrowRight,
} from 'lucide-react-native';

export interface ProfileGuestViewProps {
  unreadNotificationsCount: number;
  onNavigate: (route: string) => void;
}

export const ProfileGuestView: React.FC<ProfileGuestViewProps> = ({
  unreadNotificationsCount,
  onNavigate,
}) => {
  return (
    <>
      <Text style={styles.pageTitle} allowFontScaling={false}>
        My Account
      </Text>

      {/* Guest Hero Card */}
      <View style={styles.guestCard}>
        <View style={styles.guestAvatar}>
          <UserIcon size={32} color="#4f46e5" />
        </View>
        <Text style={styles.guestTitle} allowFontScaling={false}>
          Welcome, Shopper!
        </Text>
        <Text style={styles.guestSubtitle} allowFontScaling={false}>
          Sign in or create an account to track orders, save wishlist favorites, and checkout faster.
        </Text>

        <TouchableOpacity
          style={styles.guestPrimaryBtn}
          onPress={() => onNavigate('/(auth)/login')}
          activeOpacity={0.85}
        >
          <LogIn size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.guestPrimaryBtnText} allowFontScaling={false}>
            Sign In or Register
          </Text>
          <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Member Benefits */}
      <Text style={styles.sectionHeading} allowFontScaling={false}>
        Why Join UChooseMe?
      </Text>

      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <View style={[styles.benefitIconBg, { backgroundColor: '#eff6ff' }]}>
            <Package size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.benefitTitle} allowFontScaling={false}>
              Live Order Tracking
            </Text>
            <Text style={styles.benefitDesc} allowFontScaling={false}>
              Real-time status updates from vendor packing to your doorstep.
            </Text>
          </View>
        </View>

        <View style={styles.benefitDivider} />

        <View style={styles.benefitItem}>
          <View style={[styles.benefitIconBg, { backgroundColor: '#fdf2f8' }]}>
            <Heart size={20} color="#db2777" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.benefitTitle} allowFontScaling={false}>
              Synced Wishlist
            </Text>
            <Text style={styles.benefitDesc} allowFontScaling={false}>
              Save your favorite products and access them across all your devices.
            </Text>
          </View>
        </View>

        <View style={styles.benefitDivider} />

        <View style={styles.benefitItem}>
          <View style={[styles.benefitIconBg, { backgroundColor: '#f0fdf4' }]}>
            <ShieldCheck size={20} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.benefitTitle} allowFontScaling={false}>
              Hassle-Free Returns
            </Text>
            <Text style={styles.benefitDesc} allowFontScaling={false}>
              7-day return guarantee with direct door pickup.
            </Text>
          </View>
        </View>
      </View>

      {/* Public Navigation Links */}
      <Text style={styles.sectionHeading} allowFontScaling={false}>
        Help & Discovery
      </Text>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/support')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#eff6ff' }]}>
            <HelpCircle size={18} color="#2563eb" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Help Center & FAQs
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              Find answers to common questions
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/(tabs)/shop')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#f5f3ff' }]}>
            <Store size={18} color="#7c3aed" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Explore Stores & Catalog
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              Browse thousands of verified sellers
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/notifications')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#e0e7ff' }]}>
            <Bell size={18} color="#4f46e5" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Activity & Notifications
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              Special offers, store announcements & updates
            </Text>
          </View>
          {unreadNotificationsCount > 0 && (
            <View style={[styles.hubBadge, { backgroundColor: '#ede9fe', marginRight: 8 }]}>
              <Text style={[styles.hubBadgeText, { color: '#4f46e5' }]} allowFontScaling={false}>
                {unreadNotificationsCount} new
              </Text>
            </View>
          )}
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/legal/terms')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#f1f5f9' }]}>
            <FileText size={18} color="#475569" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Terms of Service
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              User agreement and platform guidelines
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/legal/privacy')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#f0fdf4' }]}>
            <ShieldCheck size={18} color="#16a34a" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Privacy Policy & Data Rights
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              How we protect and manage your data
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.appVersion} allowFontScaling={false}>
          UChooseMe Customer App • Version 1.0.0
        </Text>
        <Text style={styles.appCopyright} allowFontScaling={false}>
          Secure multi-vendor commerce platform
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
  },
  guestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  guestAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  guestPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
  },
  guestPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  benefitsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 8,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  benefitIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  benefitDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
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
  hubBadge: {
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
  appInfo: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 11,
    color: '#cbd5e1',
  },
});
