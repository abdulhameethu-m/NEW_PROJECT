import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldCheck, Copy, Check, Lock, AlertCircle, Banknote } from 'lucide-react-native';
import { copyToClipboard } from '../../utils/clipboardHelper';

interface DeliveryVerificationOtpCardProps {
  otp?: string;
  orderStatus: string;
  paymentMethod?: string;
  totalAmount?: number;
}

export const DeliveryVerificationOtpCard: React.FC<DeliveryVerificationOtpCardProps> = ({
  otp,
  orderStatus,
  paymentMethod,
  totalAmount,
}) => {
  const [copied, setCopied] = useState(false);

  const isDelivered = (orderStatus || '').toLowerCase() === 'delivered';
  const isCancelled = (orderStatus || '').toLowerCase() === 'cancelled';
  const isCOD = paymentMethod === 'COD';

  if (isCancelled || !otp) {
    return null;
  }

  // If already delivered, show verified state
  if (isDelivered) {
    return (
      <View style={styles.verifiedCard}>
        <View style={styles.verifiedIconBg}>
          <ShieldCheck size={20} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.verifiedTitle} allowFontScaling={false}>
            Delivery Verified & Completed
          </Text>
          <Text style={styles.verifiedSubtitle} allowFontScaling={false}>
            Your package was securely handed over using delivery OTP verification.
          </Text>
        </View>
      </View>
    );
  }

  const handleCopy = async () => {
    if (!otp) return;
    const success = await copyToClipboard(otp);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const otpDigits = otp.split('');

  return (
    <View style={styles.card}>
      {/* Top Security Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldIconBg}>
            <Lock size={15} color="#4f46e5" />
          </View>
          <View>
            <Text style={styles.headerTitle} allowFontScaling={false}>
              DELIVERY VERIFICATION OTP
            </Text>
            <Text style={styles.headerSubtitle} allowFontScaling={false}>
              Required for courier package handover
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
          onPress={handleCopy}
          activeOpacity={0.75}
        >
          {copied ? (
            <>
              <Check size={13} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.copyBtnTextSuccess} allowFontScaling={false}>
                Copied
              </Text>
            </>
          ) : (
            <>
              <Copy size={13} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.copyBtnText} allowFontScaling={false}>
                Copy OTP
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Large Digit Display */}
      <View style={styles.digitsContainer}>
        {otpDigits.map((digit, index) => (
          <View key={`otp-${index}`} style={styles.digitBox}>
            <Text style={styles.digitText} allowFontScaling={false}>
              {digit}
            </Text>
          </View>
        ))}
      </View>

      {/* COD Payment instruction banner if applicable */}
      {isCOD && totalAmount ? (
        <View style={styles.codAlert}>
          <Banknote size={15} color="#d97706" style={{ marginRight: 6 }} />
          <Text style={styles.codAlertText} allowFontScaling={false}>
            Please pay <Text style={{ fontWeight: '800' }}>₹{totalAmount.toLocaleString('en-IN')}</Text> cash
            to the delivery agent upon receiving your order.
          </Text>
        </View>
      ) : null}

      {/* Security Disclaimer */}
      <View style={styles.disclaimerRow}>
        <AlertCircle size={14} color="#64748b" style={{ marginRight: 6, marginTop: 1 }} />
        <Text style={styles.disclaimerText} allowFontScaling={false}>
          Share this OTP <Text style={{ fontWeight: '700' }}>only in person</Text> with the delivery driver
          after physically receiving the package. Do not share over call or SMS.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#ecfdf5',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  copyBtnTextSuccess: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  digitsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  digitBox: {
    width: 38,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  digitText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  codAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  codAlertText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
    lineHeight: 16,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    lineHeight: 16,
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16,
  },
  verifiedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  verifiedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  verifiedSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
});

