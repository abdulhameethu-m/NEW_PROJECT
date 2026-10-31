import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Camera,
  Smartphone,
  Gift,
  ExternalLink,
} from 'lucide-react-native';
import {
  shareToWhatsApp,
  shareToTelegram,
  shareToSMS,
  shareToInstagram,
  copyToClipboard,
  shareViaNativeSheet,
} from '../../utils/socialShare';

export interface SocialShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
  shareText?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  referralCode?: string;
  type?: 'product' | 'reel' | 'store';
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isVisible,
  onClose,
  title,
  shareUrl,
  shareText,
  imageUrl,
  price,
  originalPrice,
  referralCode,
  type = 'product',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const fullMessage =
    shareText ||
    `🔥 Check this out on UChooseMe!\n${title}\n${price ? `₹${price.toLocaleString('en-IN')}` : ''}\n👉 ${shareUrl}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = async () => {
    setActiveChannel('whatsapp');
    try {
      await shareToWhatsApp(fullMessage);
    } finally {
      setActiveChannel(null);
    }
  };

  const handleShareTelegram = async () => {
    setActiveChannel('telegram');
    try {
      await shareToTelegram(fullMessage, shareUrl);
    } finally {
      setActiveChannel(null);
    }
  };

  const handleShareSMS = async () => {
    setActiveChannel('sms');
    try {
      await shareToSMS(fullMessage);
    } finally {
      setActiveChannel(null);
    }
  };

  const handleShareInstagram = async () => {
    setActiveChannel('instagram');
    try {
      await shareToInstagram(fullMessage, shareUrl);
    } finally {
      setActiveChannel(null);
    }
  };

  const handleShareNative = async () => {
    await shareViaNativeSheet({
      title,
      message: fullMessage,
      url: shareUrl,
    });
  };

  const discountPercentage =
    originalPrice && price && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Top handle bar */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerTitle}>
                {type === 'product' ? 'Share Product' : type === 'reel' ? 'Share Reel' : 'Share Store'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              accessibilityLabel="Close share modal"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Item Preview Card */}
          <View style={styles.previewCard}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.previewFallbackImage}>
                <Share2 size={24} color="#6366f1" />
              </View>
            )}

            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {title}
              </Text>
              {price !== undefined && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>₹{price.toLocaleString('en-IN')}</Text>
                  {originalPrice && originalPrice > price ? (
                    <Text style={styles.originalPriceText}>
                      ₹{originalPrice.toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                  {discountPercentage ? (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discountPercentage}% OFF</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* Referral / Attribution Callout */}
          {referralCode ? (
            <View style={styles.referralBanner}>
              <Gift size={16} color="#059669" />
              <Text style={styles.referralBannerText}>
                Referral code <Text style={styles.referralCodeText}>{referralCode}</Text> attached. Purchases will be credited!
              </Text>
            </View>
          ) : (
            <View style={styles.referralBanner}>
              <Gift size={16} color="#4f46e5" />
              <Text style={styles.referralBannerText}>
                Share this link with friends to open directly in the UChooseMe app!
              </Text>
            </View>
          )}

          {/* One-Tap Social Channel Row */}
          <Text style={styles.sectionLabel}>Share directly via</Text>
          <View style={styles.channelsGrid}>
            {/* WhatsApp */}
            <TouchableOpacity
              onPress={handleShareWhatsApp}
              style={styles.channelButton}
              activeOpacity={0.8}
            >
              <View style={[styles.channelIconCircle, { backgroundColor: '#25D366' }]}>
                {activeChannel === 'whatsapp' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MessageCircle size={24} color="#ffffff" />
                )}
              </View>
              <Text style={styles.channelLabel}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Telegram */}
            <TouchableOpacity
              onPress={handleShareTelegram}
              style={styles.channelButton}
              activeOpacity={0.8}
            >
              <View style={[styles.channelIconCircle, { backgroundColor: '#229ED9' }]}>
                {activeChannel === 'telegram' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={22} color="#ffffff" />
                )}
              </View>
              <Text style={styles.channelLabel}>Telegram</Text>
            </TouchableOpacity>

            {/* Instagram */}
            <TouchableOpacity
              onPress={handleShareInstagram}
              style={styles.channelButton}
              activeOpacity={0.8}
            >
              <View style={[styles.channelIconCircle, { backgroundColor: '#E1306C' }]}>
                {activeChannel === 'instagram' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={22} color="#ffffff" />
                )}
              </View>
              <Text style={styles.channelLabel}>Instagram</Text>
            </TouchableOpacity>

            {/* SMS */}
            <TouchableOpacity
              onPress={handleShareSMS}
              style={styles.channelButton}
              activeOpacity={0.8}
            >
              <View style={[styles.channelIconCircle, { backgroundColor: '#3b82f6' }]}>
                {activeChannel === 'sms' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Smartphone size={22} color="#ffffff" />
                )}
              </View>
              <Text style={styles.channelLabel}>SMS</Text>
            </TouchableOpacity>
          </View>

          {/* Copy Link Bar */}
          <View style={styles.copyLinkContainer}>
            <View style={styles.copyLinkInput}>
              <Text style={styles.copyLinkUrlText} numberOfLines={1}>
                {shareUrl}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCopyLink}
              style={[
                styles.copyButton,
                copied ? styles.copyButtonSuccess : styles.copyButtonDefault,
              ]}
              activeOpacity={0.85}
            >
              {copied ? (
                <>
                  <Check size={16} color="#ffffff" />
                  <Text style={styles.copyButtonText}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={16} color="#ffffff" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Native OS Share Sheet Button */}
          <TouchableOpacity
            onPress={handleShareNative}
            style={styles.moreOptionsButton}
            activeOpacity={0.7}
          >
            <ExternalLink size={16} color="#64748b" />
            <Text style={styles.moreOptionsText}>More sharing options</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 14,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  previewFallbackImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 18,
  },
  referralBannerText: {
    fontSize: 12,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
  },
  referralCodeText: {
    fontWeight: '700',
    color: '#047857',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  channelsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  channelButton: {
    alignItems: 'center',
    gap: 6,
  },
  channelIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  channelLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  copyLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyLinkInput: {
    flex: 1,
    paddingHorizontal: 10,
  },
  copyLinkUrlText: {
    fontSize: 13,
    color: '#475569',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  copyButtonDefault: {
    backgroundColor: '#0f172a',
  },
  copyButtonSuccess: {
    backgroundColor: '#059669',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  moreOptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  moreOptionsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
