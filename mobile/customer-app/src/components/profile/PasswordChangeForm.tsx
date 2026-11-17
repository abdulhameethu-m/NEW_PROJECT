import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react-native';

export interface PasswordChangeFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onChangeCurrentPassword: (val: string) => void;
  onChangeNewPassword: (val: string) => void;
  onChangeConfirmPassword: (val: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  errors: Record<string, string>;
  onClearError?: (field: string) => void;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onSubmit,
  isPending,
  errors,
  onClearError,
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic Password Strength Criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  const criteria = [
    { label: 'Minimum 8 characters', met: hasMinLength },
    { label: 'Uppercase letter (A-Z)', met: hasUppercase },
    { label: 'Lowercase letter (a-z)', met: hasLowercase },
    { label: 'At least one number (0-9)', met: hasNumber },
    { label: 'Special character (!@#$%...)', met: hasSpecialChar },
    { label: 'Passwords match', met: isMatching },
  ];

  return (
    <View style={styles.container}>
      {/* Form Error Message */}
      {errors.form ? (
        <View style={styles.formErrorBanner}>
          <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.formErrorText} allowFontScaling={false}>
            {errors.form}
          </Text>
        </View>
      ) : null}

      {/* Inputs Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionLabel} allowFontScaling={false}>
          CHANGE PASSWORD
        </Text>

        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel} allowFontScaling={false}>
            Current Password *
          </Text>
          <View style={[styles.inputWrapper, errors.currentPassword ? styles.inputError : undefined]}>
            <Lock size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              value={currentPassword}
              onChangeText={(val) => {
                onChangeCurrentPassword(val);
                if (onClearError) onClearError('currentPassword');
              }}
              placeholder="Enter current password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showCurrentPassword}
              style={styles.textInput}
              autoCapitalize="none"
              accessibilityLabel="Current Password"
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword((prev) => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
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
          <View style={[styles.inputWrapper, errors.newPassword ? styles.inputError : undefined]}>
            <KeyRound size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              value={newPassword}
              onChangeText={(val) => {
                onChangeNewPassword(val);
                if (onClearError) onClearError('newPassword');
              }}
              placeholder="Enter new password (min. 8 characters)"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showNewPassword}
              style={styles.textInput}
              autoCapitalize="none"
              accessibilityLabel="New Password"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword((prev) => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
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
          <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputError : undefined]}>
            <Lock size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              value={confirmPassword}
              onChangeText={(val) => {
                onChangeConfirmPassword(val);
                if (onClearError) onClearError('confirmPassword');
              }}
              placeholder="Re-enter new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showConfirmPassword}
              style={styles.textInput}
              autoCapitalize="none"
              accessibilityLabel="Confirm New Password"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
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

      {/* Dynamic Password Strength Checklist */}
      <View style={styles.requirementsCard}>
        <Text style={styles.requirementsTitle} allowFontScaling={false}>
          Password Security Guidelines
        </Text>
        <View style={styles.criteriaGrid}>
          {criteria.map((item, index) => (
            <View key={index} style={styles.reqRow}>
              <CheckCircle2
                size={14}
                color={item.met ? '#047857' : '#94a3b8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.reqText, item.met && styles.reqTextActive]}
                allowFontScaling={false}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={isPending}
        style={[styles.submitBtn, isPending && styles.submitBtnDisabled]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Update Password"
      >
        {isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitBtnText} allowFontScaling={false}>
            Update Password
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
    marginBottom: 4,
  },
  criteriaGrid: {
    gap: 8,
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
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
