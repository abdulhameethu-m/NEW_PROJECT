import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/safeNavigation';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useChangePassword } from '../../hooks/useUserProfile';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import { PasswordChangeForm } from '../../components/profile/PasswordChangeForm';
import { DeleteAccountModal } from '../../components/profile/DeleteAccountModal';
import {
  AccountSecurityGuidelines,
  SecurityTipsBanner,
} from '../../components/profile/AccountSecurityGuidelines';

export default function SecurityScreen() {
  const router = useRouter();
  const changePasswordMutation = useChangePassword();
  const clearSession = useAuthStore((state) => state.clearSession);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Account Deletion Modal State
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const clearFieldError = (field: string) => {
    if (errors[field] || errors.form) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.form;
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Enter your current password';
    }

    if (!newPassword || newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must include uppercase and lowercase letters';
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Password must include at least one number';
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
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to change password. Please check your current password.';
      setErrors({ form: message });
    }
  };

  const handleDeleteAccount = async (reason: string) => {
    setIsDeleting(true);
    try {
      await userApi.deleteAccount(reason || 'Customer requested account deletion in app');
      setIsDeleteModalVisible(false);
      clearSession();
      Alert.alert(
        'Account Deleted',
        'Your account and all personal data have been permanently purged.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete account. Please try again later.';
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Security Banner */}
          <SecurityTipsBanner />

          {/* Form Fields & Dynamic Criteria Checklist */}
          <PasswordChangeForm
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            onChangeCurrentPassword={setCurrentPassword}
            onChangeNewPassword={setNewPassword}
            onChangeConfirmPassword={setConfirmPassword}
            onSubmit={handleUpdatePassword}
            isPending={changePasswordMutation.isPending}
            errors={errors}
            onClearError={clearFieldError}
          />

          {/* 2FA Status, Session Safety, Legal Links, and Danger Zone */}
          <AccountSecurityGuidelines
            onOpenDeleteModal={() => setIsDeleteModalVisible(true)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* App Store / Google Play Compliant Account Deletion Modal */}
      <DeleteAccountModal
        visible={isDeleteModalVisible}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={handleDeleteAccount}
      />
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
});
