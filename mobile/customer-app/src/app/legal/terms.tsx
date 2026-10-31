import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText, ShieldCheck } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { safeGoBack } from '../../utils/safeNavigation';

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeRow}>
          <FileText size={18} color="#4f46e5" />
          <Text style={styles.badgeText}>Last updated: October 2026</Text>
        </View>

        <Text style={styles.paragraph}>
          Welcome to <Text style={styles.bold}>UChooseMe</Text>. These Terms of Service ("Terms") govern your use of the UChooseMe mobile application, website, and related services (collectively, the "Platform"). By creating an account or accessing our marketplace, you agree to comply with and be bound by these Terms.
        </Text>

        <Text style={styles.sectionTitle}>1. Account Registration & Eligibility</Text>
        <Text style={styles.paragraph}>
          To place orders, follow stores, and access personalized features, you must create an account. You agree to provide accurate, current, and complete registration information and to keep your credentials confidential. You are solely responsible for all activities conducted under your account.
        </Text>

        <Text style={styles.sectionTitle}>2. Product Listings & Pricing</Text>
        <Text style={styles.paragraph}>
          UChooseMe operates as a multi-vendor marketplace connecting verified merchants and creators with customers. While we strive for accuracy, product descriptions, pricing, variant availability, and estimated delivery dates are provided by vendors and subject to real-time inventory adjustments.
        </Text>

        <Text style={styles.sectionTitle}>3. Orders & Payment</Text>
        <Text style={styles.paragraph}>
          We support multiple payment methods including online payments via Razorpay (UPI, Credit/Debit cards, Net Banking) and Cash on Delivery (COD) for eligible pincodes. Order confirmation occurs upon successful payment verification or COD order dispatch.
        </Text>

        <Text style={styles.sectionTitle}>4. Shipping & Logistics</Text>
        <Text style={styles.paragraph}>
          Shipments are fulfilled through trusted logistics partners (Delhivery, Shadowfax, Shiprocket). You will receive real-time Air Waybill (AWB) tracking numbers. High-value and select deliveries may require a secure Delivery Verification OTP provided in your Order Details screen.
        </Text>

        <Text style={styles.sectionTitle}>5. Returns, Cancellations & Refunds</Text>
        <Text style={styles.paragraph}>
          Customers can request order cancellations prior to dispatch. Return requests are accepted within the vendor's specified return window for eligible products. Approved refunds are processed back to the original payment source within 5–7 business days.
        </Text>

        <Text style={styles.sectionTitle}>6. Influencer Commerce & Attribution</Text>
        <Text style={styles.paragraph}>
          Our platform includes creator reels and storefront links. When you purchase via an affiliate link or reel, commission attribution is credited to the respective creator in accordance with our transparent commerce guidelines.
        </Text>

        <Text style={styles.sectionTitle}>7. Account Deletion & Data Privacy</Text>
        <Text style={styles.paragraph}>
          In full compliance with Apple App Store Guideline 5.1.1(v) and global data privacy standards, you have the right to delete your account at any time via Profile → Security & Passwords → Delete Account. Personal identifiers and saved data will be permanently purged.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions regarding these Terms, contact our customer support team at{' '}
          <Text style={styles.linkText}>support@uchooseme.com</Text> or via the in-app Help & Support desk.
        </Text>

        <View style={styles.footerNote}>
          <ShieldCheck size={20} color="#059669" />
          <Text style={styles.footerNoteText}>
            Thank you for being a valued member of the UChooseMe shopping community.
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
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
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
  bold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  linkText: {
    color: '#4f46e5',
    fontWeight: '600',
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

