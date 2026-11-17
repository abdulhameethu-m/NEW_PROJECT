import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  FileText,
  ChevronRight,
  UserX,
  Trash2,
} from 'lucide-react-native';

export interface AccountSecurityGuidelinesProps {
  onOpenDeleteModal: () => void;
}

export const SecurityTipsBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerIconCircle}>
        <ShieldCheck size={24} color="#4f46e5" />
      </View>
      <View style={styles.bannerTextCol}>
        <Text style={styles.bannerTitle} allowFontScaling={false}>
          Protect Your Account
        </Text>
        <Text style={styles.bannerSubtitle} allowFontScaling={false}>
          Ensure your account uses a secure password to protect your delivery information and order history.
        </Text>
      </View>
    </View>
  );
};

export const AccountSecurityGuidelines: React.FC<AccountSecurityGuidelinesProps> = ({
  onOpenDeleteModal,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* 2FA Status Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.infoIconCircle}>
            <Smartphone size={20} color="#4f46e5" />
          </View>
          <View style={styles.infoTitleCol}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.infoTitle} allowFontScaling={false}>
                Two-Factor Authentication
              </Text>
              <View style={styles.badgeActive}>
                <Text style={styles.badgeActiveText} allowFontScaling={false}>
                  ACTIVE
                </Text>
              </View>
            </View>
            <Text style={styles.infoSubtitle} allowFontScaling={false}>
              SMS & Phone OTP verification is enabled for sensitive order and account updates.
            </Text>
          </View>
        </View>
      </View>

      {/* Session Safety Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={[styles.infoIconCircle, { backgroundColor: '#f0fdf4' }]}>
            <KeyRound size={20} color="#16a34a" />
          </View>
          <View style={styles.infoTitleCol}>
            <Text style={styles.infoTitle} allowFontScaling={false}>
              Session Safety & Token Encryption
            </Text>
            <Text style={styles.infoSubtitle} allowFontScaling={false}>
              Your sessions use encrypted refresh tokens. Signing out immediately terminates active tokens on this device.
            </Text>
          </View>
        </View>
      </View>

      {/* Legal & Compliance Section */}
      <View style={styles.complianceCard}>
        <Text style={styles.complianceSectionTitle} allowFontScaling={false}>
          Legal & Compliance
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/legal/terms' as any)}
          style={styles.complianceRow}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open Terms of Service"
        >
          <View style={styles.complianceRowLeft}>
            <FileText size={18} color="#475569" />
            <Text style={styles.complianceLinkText} allowFontScaling={false}>
              Terms of Service
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.complianceDivider} />

        <TouchableOpacity
          onPress={() => router.push('/legal/privacy' as any)}
          style={styles.complianceRow}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open Privacy Policy and Data Rights"
        >
          <View style={styles.complianceRowLeft}>
            <ShieldCheck size={18} color="#475569" />
            <Text style={styles.complianceLinkText} allowFontScaling={false}>
              Privacy Policy & Data Rights
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Danger Zone: Account Deletion */}
      <View style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <UserX size={20} color="#dc2626" />
          <Text style={styles.dangerTitle} allowFontScaling={false}>
            Delete Account
          </Text>
        </View>
        <Text style={styles.dangerDescription} allowFontScaling={false}>
          Permanently delete your UChooseMe account, saved addresses, wishlists, and personal data. This action is irreversible.
        </Text>
        <TouchableOpacity
          onPress={onOpenDeleteModal}
          style={styles.deleteAccountBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Delete Account and Data"
        >
          <Trash2 size={16} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={styles.deleteAccountBtnText} allowFontScaling={false}>
            Delete Account & Data
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    marginBottom: 16,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e1b4b',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#4338ca',
    marginTop: 2,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTitleCol: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 17,
  },
  complianceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    marginBottom: 16,
  },
  complianceSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  complianceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  complianceDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  dangerCard: {
    backgroundColor: '#fff1f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 24,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9f1239',
  },
  dangerDescription: {
    fontSize: 13,
    color: '#881337',
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f43f5e',
    borderRadius: 12,
    paddingVertical: 12,
  },
  deleteAccountBtnText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '700',
  },
});
