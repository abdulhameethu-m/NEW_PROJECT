import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '../../utils/safeNavigation';
import {
  ChevronLeft,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useAuthStore } from '../../stores/authStore';
import { useUserProfile, useUpdateProfile } from '../../hooks/useUserProfile';
import { getPendingImage, clearPendingPhoto } from '../../utils/imagePickerService';
import { ProfileAvatarUploader } from '../../components/profile/ProfileAvatarUploader';
import { ProfileDetailsForm } from '../../components/profile/ProfileDetailsForm';
import { ProfileNotificationPreferences } from '../../components/profile/ProfileNotificationPreferences';

export default function EditProfileScreen() {
  const router = useRouter();
  const { pendingPhotoUri } = useLocalSearchParams<{ pendingPhotoUri?: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: profile } = useUserProfile();
  const updateMutation = useUpdateProfile();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Notification Preferences
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [deliveryAlerts, setDeliveryAlerts] = useState(true);
  const [promotions, setPromotions] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form from profile or user state
  useEffect(() => {
    const source = profile || user;
    if (source) {
      setName(source.name || '');
      setPhone(source.phone || '');
      setEmail(source.email || '');
      if (source.preferences?.notificationPreferences) {
        setOrderUpdates(!!source.preferences.notificationPreferences.orderUpdates);
        setDeliveryAlerts(!!source.preferences.notificationPreferences.deliveryAlerts);
        setPromotions(!!source.preferences.notificationPreferences.promotions);
      }
    }
  }, [profile, user]);

  // Check if a photo was captured before an activity restart on Android
  useEffect(() => {
    if (pendingPhotoUri) {
      setAvatarUri(pendingPhotoUri as string);
      clearPendingPhoto();
      return;
    }

    const restorePendingPhoto = async () => {
      const pendingUri = await getPendingImage();
      if (pendingUri) {
        setAvatarUri(pendingUri);
        await clearPendingPhoto();
      }
    };
    restorePendingPhoto();
  }, [pendingPhotoUri]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit mobile number';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        email: email.trim().toLowerCase(),
        avatarUri: avatarUri || undefined,
        notificationPreferences: {
          orderUpdates,
          deliveryAlerts,
          promotions,
        },
      });

      Alert.alert('Profile Updated', 'Your profile details have been successfully updated.', [
        { text: 'OK', onPress: () => safeGoBack(router, '/(tabs)/profile') },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update profile.';
      setErrors({ form: message });
    }
  };

  const currentAvatar = avatarUri || profile?.avatarUrl || user?.avatarUrl || null;

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Edit Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={updateMutation.isPending}
          style={styles.saveHeaderBtn}
          activeOpacity={0.8}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <Text style={styles.saveHeaderBtnText} allowFontScaling={false}>
              Save
            </Text>
          )}
        </TouchableOpacity>
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
          {/* Avatar Section */}
          <ProfileAvatarUploader
            currentAvatar={currentAvatar}
            name={name}
            onAvatarChange={(uri) => setAvatarUri(uri)}
            onRemoveAvatar={() => setAvatarUri('')}
          />

          {/* Form Error Banner */}
          {errors.form ? (
            <View style={styles.formErrorBanner}>
              <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.formErrorText} allowFontScaling={false}>
                {errors.form}
              </Text>
            </View>
          ) : null}

          {/* Input Fields */}
          <ProfileDetailsForm
            name={name}
            phone={phone}
            email={email}
            errors={errors}
            onNameChange={(val) => {
              setName(val);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            onPhoneChange={(val) => {
              setPhone(val);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            onEmailChange={(val) => {
              setEmail(val);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
          />

          {/* Notification Preferences */}
          <ProfileNotificationPreferences
            orderUpdates={orderUpdates}
            deliveryAlerts={deliveryAlerts}
            promotions={promotions}
            onOrderUpdatesChange={setOrderUpdates}
            onDeliveryAlertsChange={setDeliveryAlerts}
            onPromotionsChange={setPromotions}
          />

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending}
            style={styles.saveBtn}
            activeOpacity={0.85}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Check size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText} allowFontScaling={false}>
                  Save Changes
                </Text>
              </View>
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
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
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
  saveBtn: {
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
    marginTop: 8,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
