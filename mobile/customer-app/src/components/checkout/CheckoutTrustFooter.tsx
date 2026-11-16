import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Package, RotateCcw } from 'lucide-react-native';

export interface CheckoutTrustFooterProps {
  onTermsPress: () => void;
  onPrivacyPress: () => void;
}

export const CheckoutTrustFooter: React.FC<CheckoutTrustFooterProps> = ({
  onTermsPress,
  onPrivacyPress,
}) => {
  return (
    <>
      {/* Trust Badges - 3 Columns with Vertical Dividers */}
      <View style={styles.trustRow}>
        <View style={styles.trustCol}>
          <ShieldCheck size={22} color="#0f172a" />
          <Text style={styles.trustText}>100% Secure</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustCol}>
          <Package size={22} color="#b45309" />
          <Text style={styles.trustText}>Fast Delivery</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustCol}>
          <RotateCcw size={22} color="#0369a1" />
          <Text style={styles.trustText}>Easy Returns</Text>
        </View>
      </View>

      {/* Legal & App Store Compliance Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          By placing this order, you agree to UChooseMe's{' '}
          <Text onPress={onTermsPress} style={styles.linkText}>
            Terms of Service
          </Text>
          {' and '}
          <Text onPress={onPrivacyPress} style={styles.linkText}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 8,
  },
  trustCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  trustDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#cbd5e1',
  },
  disclaimerContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: '#4f46e5',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
