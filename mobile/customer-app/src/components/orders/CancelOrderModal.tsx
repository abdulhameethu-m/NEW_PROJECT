import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react-native';

interface CancelOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes?: string) => Promise<void>;
  isSubmitting: boolean;
  paymentMethod?: 'ONLINE' | 'COD';
}

const REASONS = [
  'I found a better price elsewhere',
  'I placed the order by mistake',
  'Estimated delivery time is too long',
  'Need to change delivery address or phone number',
  'Changed my mind / No longer needed',
  'Other reasons',
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isSubmitting,
  paymentMethod,
}) => {
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCancelSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a cancellation reason.');
      return;
    }
    setError(null);
    try {
      await onConfirm(selectedReason, notes.trim() || undefined);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to cancel order. Please try again.';
      setError(msg);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title} allowFontScaling={false}>
                Cancel Order
              </Text>
              <Text style={styles.subtitle} allowFontScaling={false}>
                Please tell us why you want to cancel
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Warning / Refund note */}
            <View style={styles.infoBanner}>
              <AlertCircle size={16} color="#4f46e5" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.infoBannerText} allowFontScaling={false}>
                {paymentMethod === 'ONLINE'
                  ? 'Since you paid online, an automatic refund will be triggered back to your bank account / card within 5-7 business days.'
                  : 'Since this is a Cash on Delivery order, no payment was taken and your order will simply be cancelled.'}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText} allowFontScaling={false}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Reasons List */}
            <Text style={styles.sectionLabel} allowFontScaling={false}>
              Reason for Cancellation
            </Text>
            <View style={styles.reasonsList}>
              {REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedReason(reason);
                      setError(null);
                    }}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextSelected,
                      ]}
                      allowFontScaling={false}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Additional notes */}
            <Text style={styles.sectionLabel} allowFontScaling={false}>
              Additional Notes (Optional)
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any extra feedback..."
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!isSubmitting}
            />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={handleCancelSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.cancelActionBtnText} allowFontScaling={false}>
                  Confirm Cancellation
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepOrderBtn}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.keepOrderBtnText} allowFontScaling={false}>
                Nevermind, Keep Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#3730a3',
    lineHeight: 16,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorBannerText: {
    fontSize: 12,
    color: '#be123c',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  reasonsList: {
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: '#4f46e5',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#4f46e5',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#1e1b4b',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelActionBtn: {
    backgroundColor: '#ef4444',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  keepOrderBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  keepOrderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
