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
import {
  ChevronLeft,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useChangePassword } from '../../hooks/useUserProfile';

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
        [{ text: 'OK', onPress: () => router.back() }]
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
          onPress={() => router.back()}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});
