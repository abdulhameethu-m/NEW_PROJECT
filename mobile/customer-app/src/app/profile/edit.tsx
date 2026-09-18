import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Camera,
  User as UserIcon,
  Phone,
  Mail,
  Bell,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Image as GalleryIcon,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useAuthStore } from '../../stores/authStore';
import { useUserProfile, useUpdateProfile } from '../../hooks/useUserProfile';
import { takePhoto, pickFromGallery, getPendingImage, clearPendingPhoto } from '../../utils/imagePickerService';

// Curated stylish avatars available out of the box
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { pendingPhotoUri } = useLocalSearchParams<{ pendingPhotoUri?: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const updateMutation = useUpdateProfile();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

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
      // A photo was recovered from AsyncStorage after Android process death
      setAvatarUri(pendingPhotoUri as string);
      // Clear the stored URI so we don't re-apply it on the next app launch
      clearPendingPhoto();
      return;
    }

    const restorePendingPhoto = async () => {
      const pendingUri = await getPendingImage();
      if (pendingUri) {
        setAvatarUri(pendingUri);
        // Consume it so it doesn't replay next time
        await clearPendingPhoto();
      }
    };
    restorePendingPhoto();
  }, [pendingPhotoUri]);

  const handlePickAvatar = () => {
    setShowAvatarPickerModal(true);
  };

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      setAvatarUri(uri);
      setShowAvatarPickerModal(false);
    }
  };

  const handleChooseFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      setAvatarUri(uri);
      setShowAvatarPickerModal(false);
    }
  };

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
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update profile.';
      setErrors({ form: message });
    }
  };

  const currentAvatar = avatarUri || profile?.avatarUrl || user?.avatarUrl;

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
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
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {currentAvatar ? (
                <Image
                  source={{ uri: currentAvatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial} allowFontScaling={false}>
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handlePickAvatar}
                style={styles.cameraBadge}
                activeOpacity={0.85}
              >
                <Camera size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
              <Text style={styles.changePhotoText} allowFontScaling={false}>
                Change Profile Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Error Banner */}
          {errors.form && (
            <View style={styles.formErrorBanner}>
              <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.formErrorText} allowFontScaling={false}>
                {errors.form}
              </Text>
            </View>
          )}

          {/* Input Fields */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle} allowFontScaling={false}>
              PERSONAL INFORMATION
            </Text>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} allowFontScaling={false}>
                Full Name *
              </Text>
              <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                <UserIcon size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
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
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Phone size={18} color="#64748b" style={styles.inputIcon} />
                <Text style={styles.phonePrefix} allowFontScaling={false}>
                  +91
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
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
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
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

          {/* Notification Preferences */}
          <View style={styles.formCard}>
            <View style={styles.prefHeaderRow}>
              <Bell size={16} color="#4f46e5" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeaderTitle} allowFontScaling={false}>
                NOTIFICATION PREFERENCES
              </Text>
            </View>

            {/* Order Updates */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle} allowFontScaling={false}>
                  Order Updates
                </Text>
                <Text style={styles.switchSubtitle} allowFontScaling={false}>
                  Notifications when your order status changes
                </Text>
              </View>
              <Switch
                value={orderUpdates}
                onValueChange={setOrderUpdates}
                trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                thumbColor={orderUpdates ? '#4f46e5' : '#ffffff'}
              />
            </View>

            <View style={styles.switchDivider} />

            {/* Delivery Alerts */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle} allowFontScaling={false}>
                  Delivery Alerts
                </Text>
                <Text style={styles.switchSubtitle} allowFontScaling={false}>
                  SMS and push alerts when courier is near
                </Text>
              </View>
              <Switch
                value={deliveryAlerts}
                onValueChange={setDeliveryAlerts}
                trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                thumbColor={deliveryAlerts ? '#4f46e5' : '#ffffff'}
              />
            </View>

            <View style={styles.switchDivider} />

            {/* Promotions */}
            <View style={[styles.switchRow, { marginBottom: 0 }]}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle} allowFontScaling={false}>
                  Promotions & Deals
                </Text>
                <Text style={styles.switchSubtitle} allowFontScaling={false}>
                  Exclusive seasonal offers and price drops
                </Text>
              </View>
              <Switch
                value={promotions}
                onValueChange={setPromotions}
                trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                thumbColor={promotions ? '#4f46e5' : '#ffffff'}
              />
            </View>
          </View>

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

      {/* Curated Avatar Selection Modal */}
      <Modal
        visible={showAvatarPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={18} color="#4f46e5" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle} allowFontScaling={false}>
                  Choose an Avatar
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAvatarPickerModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle} allowFontScaling={false}>
              Take a photo, choose from your gallery, or pick a curated avatar.
            </Text>

            {/* Quick Actions: Take Photo or Choose from Gallery */}
            <View style={styles.actionCardRow}>
              <TouchableOpacity
                onPress={handleTakePhoto}
                style={styles.actionCard}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#eff6ff' }]}>
                  <Camera size={24} color="#2563eb" />
                </View>
                <Text style={styles.actionCardTitle} allowFontScaling={false}>
                  Take Photo
                </Text>
                <Text style={styles.actionCardSubtitle} allowFontScaling={false}>
                  Open Camera
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChooseFromGallery}
                style={styles.actionCard}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#f5f3ff' }]}>
                  <GalleryIcon size={24} color="#7c3aed" />
                </View>
                <Text style={styles.actionCardTitle} allowFontScaling={false}>
                  From Gallery
                </Text>
                <Text style={styles.actionCardSubtitle} allowFontScaling={false}>
                  Select Photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Curated Presets Section */}
            <Text style={styles.sectionDividerLabel} allowFontScaling={false}>
              OR SELECT A CURATED AVATAR
            </Text>

            <View style={styles.presetGrid}>
              {PRESET_AVATARS.map((url, idx) => (
                <TouchableOpacity
                  key={`preset-${idx}`}
                  onPress={() => {
                    setAvatarUri(url);
                    setShowAvatarPickerModal(false);
                  }}
                  style={[
                    styles.presetOption,
                    currentAvatar === url && styles.presetOptionActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: url }} style={styles.presetImage} contentFit="cover" />
                  {currentAvatar === url && (
                    <View style={styles.presetCheckBadge}>
                      <Check size={12} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom URL Input */}
            <View style={styles.customUrlContainer}>
              <Text style={styles.customUrlLabel} allowFontScaling={false}>
                Or paste image web link
              </Text>
              <View style={styles.customUrlRow}>
                <TextInput
                  value={customUrlInput}
                  onChangeText={setCustomUrlInput}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor="#94a3b8"
                  style={styles.customUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (customUrlInput.trim()) {
                      setAvatarUri(customUrlInput.trim());
                      setCustomUrlInput('');
                      setShowAvatarPickerModal(false);
                    }
                  }}
                  style={styles.customUrlBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.customUrlBtnText} allowFontScaling={false}>
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remove photo option if avatar exists */}
            {currentAvatar ? (
              <TouchableOpacity
                onPress={() => {
                  setAvatarUri('');
                  setShowAvatarPickerModal(false);
                }}
                style={styles.removeAvatarBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.removeAvatarText} allowFontScaling={false}>
                  Remove Current Photo
                </Text>
              </TouchableOpacity>
            ) : null}
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  changePhotoText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
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
  prefHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  switchDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  presetOption: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  presetOptionActive: {
    borderColor: '#4f46e5',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#4f46e5',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  customUrlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customUrlInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  customUrlBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  removeAvatarBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  removeAvatarText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  actionCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionDividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
});
