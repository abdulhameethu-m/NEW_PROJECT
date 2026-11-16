import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Bell,
  Package,
  RotateCcw,
  Heart,
  MapPin,
  Store,
  User as UserIcon,
  Lock,
  HelpCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';

export interface ProfileMenuItemsProps {
  unreadNotificationsCount: number;
  returnsCount: number;
  followedCount: number;
  openTicketsCount: number;
  onNavigate: (route: string) => void;
}

export const ProfileMenuItems: React.FC<ProfileMenuItemsProps> = ({
  unreadNotificationsCount,
  returnsCount,
  followedCount,
  openTicketsCount,
  onNavigate,
}) => {
  return (
    <>
      <Text style={styles.sectionHeading} allowFontScaling={false}>
        Settings & Support
      </Text>

      <View style={styles.menuContainer}>
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
              Order milestones, alerts & promotional offers
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
          onPress={() => onNavigate('/orders')}
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
          onPress={() => onNavigate('/returns')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#f0f9ff' }]}>
            <RotateCcw size={18} color="#0284c7" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Returns & Refunds
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              Track pickup status and refund progress
            </Text>
          </View>
          {returnsCount > 0 && (
            <View style={[styles.hubBadge, { backgroundColor: '#e0f2fe', marginRight: 8 }]}>
              <Text style={[styles.hubBadgeText, { color: '#0284c7' }]} allowFontScaling={false}>
                {returnsCount}
              </Text>
            </View>
          )}
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/wishlist')}
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
          onPress={() => onNavigate('/addresses')}
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
          onPress={() => onNavigate('/stores/followed')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#e0e7ff' }]}>
            <Store size={18} color="#4338ca" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Followed Stores
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              Updates & releases from favorite sellers
            </Text>
          </View>
          {followedCount > 0 && (
            <View style={[styles.hubBadge, { backgroundColor: '#e0e7ff', marginRight: 8 }]}>
              <Text style={[styles.hubBadgeText, { color: '#4338ca' }]} allowFontScaling={false}>
                {followedCount}
              </Text>
            </View>
          )}
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/stores')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#fdf2f8' }]}>
            <Store size={18} color="#db2777" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Stores Directory
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              Explore verified merchant storefronts
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/profile/edit')}
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
          onPress={() => onNavigate('/profile/security')}
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

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onNavigate('/support')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuItemIconBg, { backgroundColor: '#f0fdf4' }]}>
            <HelpCircle size={18} color="#16a34a" />
          </View>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemTitle} allowFontScaling={false}>
              Help & Support Center
            </Text>
            <Text style={styles.menuItemSubtitle} allowFontScaling={false}>
              FAQs, contact channels & dispute tickets
            </Text>
          </View>
          {openTicketsCount > 0 && (
            <View style={[styles.hubBadge, { backgroundColor: '#fef3c7', marginRight: 8 }]}>
              <Text style={[styles.hubBadgeText, { color: '#d97706' }]} allowFontScaling={false}>
                {openTicketsCount} active
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
});
