import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { User as UserIcon, Phone, Mail } from 'lucide-react-native';

export interface ProfileDetailsFormProps {
  name: string;
  phone: string;
  email: string;
  errors: Record<string, string>;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onEmailChange: (val: string) => void;
}

export const ProfileDetailsForm: React.FC<ProfileDetailsFormProps> = ({
  name,
  phone,
  email,
  errors,
  onNameChange,
  onPhoneChange,
  onEmailChange,
}) => {
  return (
    <View style={styles.formCard}>
      <Text style={styles.cardHeaderTitle} allowFontScaling={false}>
        PERSONAL INFORMATION
      </Text>

      {/* Full Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel} allowFontScaling={false}>
          Full Name *
        </Text>
        <View style={[styles.inputWrapper, errors.name ? styles.inputError : null]}>
          <UserIcon size={18} color="#64748b" style={styles.inputIcon} />
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Enter your full name"
            placeholderTextColor="#94a3b8"
            style={styles.textInput}
            autoCapitalize="words"
          />
        </View>
        {errors.name ? (
          <Text style={styles.errorHelper} allowFontScaling={false}>
            {errors.name}
          </Text>
        ) : null}
      </View>

      {/* Mobile Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel} allowFontScaling={false}>
          Phone Number *
        </Text>
        <View style={[styles.inputWrapper, errors.phone ? styles.inputError : null]}>
          <Phone size={18} color="#64748b" style={styles.inputIcon} />
          <Text style={styles.phonePrefix} allowFontScaling={false}>
            +91
          </Text>
          <TextInput
            value={phone}
            onChangeText={onPhoneChange}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94a3b8"
            style={styles.textInput}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
        {errors.phone ? (
          <Text style={styles.errorHelper} allowFontScaling={false}>
            {errors.phone}
          </Text>
        ) : null}
      </View>

      {/* Email Address */}
      <View style={[styles.inputGroup, { marginBottom: 0 }]}>
        <Text style={styles.inputLabel} allowFontScaling={false}>
          Email Address
        </Text>
        <View style={[styles.inputWrapper, errors.email ? styles.inputError : null]}>
          <Mail size={18} color="#64748b" style={styles.inputIcon} />
          <TextInput
            value={email}
            onChangeText={onEmailChange}
            placeholder="your.email@example.com"
            placeholderTextColor="#94a3b8"
            style={styles.textInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {errors.email ? (
          <Text style={styles.errorHelper} allowFontScaling={false}>
            {errors.email}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardHeaderTitle: {
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
  phonePrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 6,
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
});
