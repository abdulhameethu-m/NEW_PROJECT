import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/safeNavigation';
import {
  ChevronLeft,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Trash2,
  UserX,
  FileText,
  ExternalLink,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useChangePassword } from '../../hooks/useUserProfile';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import { Modal, Pressable } from 'react-native';

export default function SecurityScreen() {
  const router = useRouter();
  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Compliance Account Deletion State
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await userApi.deleteAccount(deleteReason || 'Customer requested account deletion in app');
      setIsDeleteModalVisible(false);
      clearSession();
      Alert.alert(
        'Account Deleted',
        'Your account and all personal data have been permanently purged.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete account. Please try again later.';
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Enter your current password';
    }

    if (!newPassword || newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }

    if (newPassword && currentPassword && newPassword === currentPassword) {
      newErrors.newPassword = 'New password must be different from your current password';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validate()) return;

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });

      Alert.alert(
        'Password Changed',
        'Your password has been changed successfully. You can now use your new password for future sign-ins.',
        [{ text: 'OK', onPress: () => safeGoBack(router, '/(tabs)/profile') }]
      );
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to change password. Please check your current password.';
      setErrors({ form: message });
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Account Security
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Security Banner */}
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

          {/* Form Error Message */}
          {errors.form ? (
            <View style={styles.formErrorBanner}>
              <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.formErrorText} allowFontScaling={false}>
                {errors.form}
              </Text>
            </View>
          ) : null}

          {/* Form Fields Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel} allowFontScaling={false}>
              CHANGE PASSWORD
            </Text>

            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} allowFontScaling={false}>
                Current Password *
              </Text>
              <View style={[styles.inputWrapper, errors.currentPassword && styles.inputError]}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: '' }));
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showCurrentPassword}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.currentPassword ? (
                <Text style={styles.errorHelper} allowFontScaling={false}>
                  {errors.currentPassword}
                </Text>
              ) : null}
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} allowFontScaling={false}>
                New Password *
              </Text>
              <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
                <KeyRound size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                  }}
                  placeholder="Enter new password (min. 6 characters)"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNewPassword}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showNewPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.newPassword ? (
                <Text style={styles.errorHelper} allowFontScaling={false}>
                  {errors.newPassword}
                </Text>
              ) : null}
            </View>

            {/* Confirm New Password */}
            <View style={[styles.inputGroup, { marginBottom: 4 }]}>
              <Text style={styles.inputLabel} allowFontScaling={false}>
                Confirm New Password *
              </Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorHelper} allowFontScaling={false}>
                  {errors.confirmPassword}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Password Strength Requirements */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle} allowFontScaling={false}>
              Password Guidelines
            </Text>
            <View style={styles.reqRow}>
              <CheckCircle2
                size={14}
                color={isMinLength ? '#047857' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.reqText, isMinLength && styles.reqTextActive]}
                allowFontScaling={false}
              >
                Minimum 6 characters
              </Text>
            </View>

            <View style={styles.reqRow}>
              <CheckCircle2
                size={14}
                color={isMatching ? '#047857' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.reqText, isMatching && styles.reqTextActive]}
                allowFontScaling={false}
              >
                Passwords match
              </Text>
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            onPress={handleUpdatePassword}
            disabled={changePasswordMutation.isPending}
            style={styles.submitBtn}
            activeOpacity={0.85}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText} allowFontScaling={false}>
                Update Password
              </Text>
            )}
          </TouchableOpacity>

          {/* Legal & Compliance Section */}
          <View style={styles.complianceCard}>
            <Text style={styles.complianceSectionTitle} allowFontScaling={false}>
              Legal & Compliance
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/legal/terms' as any)}
              style={styles.complianceRow}
              activeOpacity={0.7}
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

          {/* Danger Zone: Account Deletion (Apple App Store Guideline 5.1.1(v) & Google Play) */}
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
              onPress={() => setIsDeleteModalVisible(true)}
              style={styles.deleteAccountBtn}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={styles.deleteAccountBtnText} allowFontScaling={false}>
                Delete Account & Data
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDeleteModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalWarningIcon}>
                <UserX size={28} color="#dc2626" />
              </View>
              <TouchableOpacity
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle} allowFontScaling={false}>
              Delete Your Account?
            </Text>
            <Text style={styles.modalBody} allowFontScaling={false}>
              Are you sure you want to permanently delete your account? All your personal information, profile data, saved delivery addresses, and wishlists will be completely purged and anonymized.
            </Text>

            <Text style={styles.modalInputLabel} allowFontScaling={false}>
              Optional reason for leaving:
            </Text>
            <TextInput
              value={deleteReason}
              onChangeText={setDeleteReason}
              placeholder="Tell us how we can improve..."
              placeholderTextColor="#94a3b8"
              style={styles.reasonInput}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText} allowFontScaling={false}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                style={styles.confirmDeleteBtn}
                activeOpacity={0.85}
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
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
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
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  formErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#e11d48',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff1f2',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    paddingVertical: 0,
  },
  errorHelper: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 2,
  },
  requirementsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  reqTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  complianceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 24,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalWarningIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  modalBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    height: 64,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
  confirmDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
