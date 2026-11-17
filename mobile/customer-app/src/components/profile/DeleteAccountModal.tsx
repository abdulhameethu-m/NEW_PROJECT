import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { UserX, X, AlertTriangle, Check } from 'lucide-react-native';

export interface DeleteAccountModalProps {
  visible: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const PRESET_REASONS = [
  'I no longer need this app',
  'Privacy & security concerns',
  'Too many emails or notifications',
  'Created a duplicate account',
  'App performance or technical issues',
  'Other reason',
];

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customComment, setCustomComment] = useState<string>('');

  const handleConfirm = () => {
    const finalReason = customComment.trim()
      ? `${selectedReason}: ${customComment.trim()}`
      : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalWarningIcon}>
              <UserX size={26} color="#dc2626" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title & Warning */}
            <Text style={styles.modalTitle} allowFontScaling={false}>
              Delete Your Account?
            </Text>
            <View style={styles.warningBanner}>
              <AlertTriangle size={16} color="#b91c1c" style={{ marginRight: 6 }} />
              <Text style={styles.warningBannerText} allowFontScaling={false}>
                This action is irreversible (App Store & GDPR Compliant)
              </Text>
            </View>
            <Text style={styles.modalBody} allowFontScaling={false}>
              Permanently delete your account, saved delivery addresses, order history, wishlists, and personal data. Once deleted, your account cannot be recovered.
            </Text>

            {/* Reason Selector */}
            <Text style={styles.modalInputLabel} allowFontScaling={false}>
              Please select a reason for leaving:
            </Text>
            <View style={styles.reasonList}>
              {PRESET_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
                    </View>
                    <Text
                      style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}
                      allowFontScaling={false}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Notes / Feedback */}
            <Text style={styles.modalInputLabel} allowFontScaling={false}>
              Additional feedback (optional):
            </Text>
            <TextInput
              value={customComment}
              onChangeText={setCustomComment}
              placeholder="Tell us how we could improve..."
              placeholderTextColor="#94a3b8"
              style={styles.reasonInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isDeleting}
              style={styles.cancelBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText} allowFontScaling={false}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isDeleting}
              style={[styles.confirmDeleteBtn, isDeleting && styles.confirmDeleteBtnDisabled]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirm permanent account deletion"
            >
              {isDeleting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmDeleteBtnText} allowFontScaling={false}>
                  Confirm Delete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 25,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalWarningIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  warningBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  modalBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  reasonList: {
    gap: 6,
    marginBottom: 14,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  reasonOptionSelected: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
  },
  reasonOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  reasonOptionTextSelected: {
    color: '#991b1b',
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    height: 60,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmDeleteBtn: {
    flex: 1.3,
    height: 46,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.7,
  },
  confirmDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
