import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Camera,
  Check,
  X,
  Sparkles,
  Image as GalleryIcon,
} from 'lucide-react-native';
import { takePhoto, pickFromGallery } from '../../utils/imagePickerService';

// Curated stylish avatars available out of the box
export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
];

export interface ProfileAvatarUploaderProps {
  currentAvatar: string | null;
  name: string;
  onAvatarChange: (uri: string) => void;
  onRemoveAvatar: () => void;
}

export const ProfileAvatarUploader: React.FC<ProfileAvatarUploaderProps> = ({
  currentAvatar,
  name,
  onAvatarChange,
  onRemoveAvatar,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      onAvatarChange(uri);
      setShowModal(false);
    }
  };

  const handleChooseFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      onAvatarChange(uri);
      setShowModal(false);
    }
  };

  const handleApplyPreset = (url: string) => {
    onAvatarChange(url);
    setShowModal(false);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      onAvatarChange(customUrlInput.trim());
      setCustomUrlInput('');
      setShowModal(false);
    }
  };

  return (
    <>
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
            onPress={() => setShowModal(true)}
            style={styles.cameraBadge}
            activeOpacity={0.85}
          >
            <Camera size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.7}>
          <Text style={styles.changePhotoText} allowFontScaling={false}>
            Change Profile Photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
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
                onPress={() => setShowModal(false)}
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
                  onPress={() => handleApplyPreset(url)}
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
                  onPress={handleApplyCustomUrl}
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
                  onRemoveAvatar();
                  setShowModal(false);
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
    </>
  );
};

const styles = StyleSheet.create({
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
});
