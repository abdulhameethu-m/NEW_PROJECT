import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, ShieldCheck, UserX } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { safeGoBack } from '../../utils/safeNavigation';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeRow}>
          <Lock size={16} color="#059669" />
          <Text style={styles.badgeText}>Compliant with GDPR & Apple App Store Guidelines</Text>
        </View>

        <Text style={styles.paragraph}>
          At <Text style={styles.bold}>UChooseMe</Text>, we believe customer privacy and data security are fundamental rights. This Privacy Policy outlines what information we collect, how it is used to fulfill your shopping experience, and your legal rights to manage, export, or permanently delete your data.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect personal information necessary to deliver orders and maintain your account:
        </Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Contact Information:</Text> Name, email address, phone number, and delivery addresses.</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Order & Payment Details:</Text> Items purchased, order tracking history, invoice details, and secure transaction identifiers processed by Razorpay (we never store raw credit card numbers or CVVs).</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Device & Usage Data:</Text> Push notification tokens, anonymous analytics, and crash reports via Sentry to resolve performance bottlenecks.</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
        <Text style={styles.paragraph}>
          Your data is used strictly to:
        </Text>
        <Text style={styles.bulletPoint}>• Process, pack, ship, and deliver marketplace orders.</Text>
        <Text style={styles.bulletPoint}>• Transmit real-time SMS, WhatsApp, and Push order status updates.</Text>
        <Text style={styles.bulletPoint}>• Provide customer support and manage product returns or refunds.</Text>
        <Text style={styles.bulletPoint}>• Attribute creator commissions for verified referral links.</Text>

        <Text style={styles.sectionTitle}>3. Data Sharing & Third Parties</Text>
        <Text style={styles.paragraph}>
          We do not sell, rent, or trade your personal data. Data is shared exclusively with necessary service partners:
        </Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Couriers (Delhivery, Shadowfax, Shiprocket):</Text> Recipient name, address, and phone number for parcel dispatch.</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Payment Gateways (Razorpay):</Text> Encrypted payment handling.</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Crash Analytics (Sentry):</Text> Anonymized device metrics with automatic PII scrubbing.</Text>

        <Text style={styles.sectionTitle}>4. Apple & Google Compliance: Account Deletion</Text>
        <Text style={styles.paragraph}>
          Under Apple App Store Guideline 5.1.1(v), you have complete autonomy over your account. You can trigger permanent account deletion directly from the mobile app:
        </Text>
        <View style={styles.calloutCard}>
          <UserX size={20} color="#dc2626" />
          <Text style={styles.calloutText}>
            Navigate to <Text style={styles.bold}>Profile → Security & Passwords → Delete Account</Text>. All profile records, addresses, wishlists, and active sessions will be permanently purged and anonymized.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>5. Data Retention & Security</Text>
        <Text style={styles.paragraph}>
          All communications use industry-standard TLS 1.3 encryption. Financial invoice records are retained in compliance with applicable statutory tax and accounting laws, while personal tokens and tracking sessions automatically expire after their valid window.
        </Text>

        <Text style={styles.sectionTitle}>6. Updates & Inquiries</Text>
        <Text style={styles.paragraph}>
          We may update this policy periodically to reflect platform enhancements. For any privacy inquiries or data rights requests, email our Data Protection Officer at{' '}
          <Text style={styles.linkText}>privacy@uchooseme.com</Text>.
        </Text>

        <View style={styles.footerNote}>
          <ShieldCheck size={20} color="#059669" />
          <Text style={styles.footerNoteText}>
            Your privacy is protected with enterprise-grade encryption across all UChooseMe platforms.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginLeft: 8,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  linkText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 14,
    borderRadius: 16,
    marginVertical: 10,
  },
  calloutText: {
    fontSize: 13,
    color: '#991b1b',
    flex: 1,
    lineHeight: 18,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 14,
    borderRadius: 16,
    marginTop: 24,
  },
  footerNoteText: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
    lineHeight: 18,
  },
});

