import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Package,
  Upload,
} from 'lucide-react-native';
import { Order, OrderItem } from '../../types/order';
import { ReturnReasonCode } from '../../types/return';
import { useCreateReturn } from '../../hooks/useReturns';

interface ReturnRequestModalProps {
  visible: boolean;
  order: Order | null;
  initialItemIndex?: number;
  onClose: () => void;
  onSuccess: (returnId: string) => void;
}

const REASON_OPTIONS: Array<{ code: ReturnReasonCode; label: string; desc: string }> = [
  { code: 'DEFECTIVE', label: 'Defective or Damaged', desc: 'Item arrived broken, torn, or non-functional' },
  { code: 'WRONG_ITEM', label: 'Wrong Item Delivered', desc: 'Received a different product entirely' },
  { code: 'SIZE_ISSUE', label: 'Size or Fit Issue', desc: 'Size is too large, small, or improper fit' },
  { code: 'NOT_AS_DESCRIBED', label: 'Not as Described', desc: 'Color, material, or specifications differ' },
  { code: 'QUALITY_ISSUE', label: 'Quality Not as Expected', desc: 'Fabric, build, or finish is unsatisfactory' },
  { code: 'MISSING_ITEM', label: 'Missing Accessories', desc: 'Parts, accessories, or manual was missing' },
  { code: 'OTHER', label: 'Other Reason', desc: 'Any other reason not listed above' },
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  visible,
  order,
  initialItemIndex = 0,
  onClose,
  onSuccess,
}) => {
  const items = useMemo(() => order?.items || [], [order]);
  const [selectedIndex, setSelectedIndex] = useState(initialItemIndex);
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState<ReturnReasonCode>('DEFECTIVE');
  const [description, setDescription] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [validationError, setValidationError] = useState('');

  const createReturnMutation = useCreateReturn();

  const selectedItem: OrderItem | undefined = items[selectedIndex] || items[0];
  const maxQuantity = selectedItem?.quantity || 1;

  const handlePickImages = async () => {
    if (evidenceImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 evidence photos.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera roll access is needed to attach return photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - evidenceImages.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri);
        setEvidenceImages((prev) => [...prev, ...newUris].slice(0, 5));
      }
    } catch {
      Alert.alert('Error', 'Could not access image picker. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setEvidenceImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setValidationError('');

    if (!selectedItem) {
      setValidationError('Please select an item to return.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setValidationError('Please provide a brief description of the issue (at least 5 characters).');
      return;
    }

    if (!order?._id) {
      setValidationError('Missing order reference.');
      return;
    }

    const productId =
      typeof selectedItem.productId === 'object'
        ? selectedItem.productId._id
        : selectedItem.productId;

    const subCategoryId =
      typeof selectedItem.productId === 'object'
        ? selectedItem.productId.subCategoryId
        : '';

    const formData = new FormData();
    formData.append('orderId', order._id);
    formData.append('productId', productId);
    formData.append('variantSku', selectedItem.variantSku || '');
    formData.append('quantity', String(quantity));
    formData.append('reasonCode', reasonCode);
    formData.append('customerDescription', description.trim());
    if (subCategoryId) {
      formData.append('subCategoryId', subCategoryId);
    }

    // Attach evidence photos
    evidenceImages.forEach((uri, idx) => {
      const filename = uri.split('/').pop() || `evidence_${idx}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('evidence', {
        uri,
        name: filename,
        type,
      } as any);
    });

    try {
      const result = await createReturnMutation.mutateAsync(formData);
      Alert.alert(
        'Return Requested',
        'Your return request has been submitted successfully. Our team will review it within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onSuccess(result._id);
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit return request.';
      setValidationError(msg);
    }
  };

  if (!visible || !order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle} allowFontScaling={false}>
                Request Return or Replacement
              </Text>
              <Text style={styles.headerSubtitle} allowFontScaling={false}>
                Order #{order.orderNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Validation Banner */}
            {validationError ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText} allowFontScaling={false}>
                  {validationError}
                </Text>
              </View>
            ) : null}

            {/* 1. Select Item */}
            <Text style={styles.sectionHeading} allowFontScaling={false}>
              1. Select Item to Return
            </Text>
            <View style={styles.itemsContainer}>
              {items.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                let imgUrl = item.image || '';
                if (!imgUrl && typeof item.productId === 'object' && item.productId?.images?.[0]) {
                  imgUrl = item.productId.images[0].url;
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => {
                      setSelectedIndex(idx);
                      setQuantity(1);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemImageWrapper}>
                      {imgUrl ? (
                        <Image source={{ uri: imgUrl }} style={styles.itemImage} contentFit="cover" />
                      ) : (
                        <Package size={20} color="#94a3b8" />
                      )}
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1} allowFontScaling={false}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemMeta} allowFontScaling={false}>
                        ₹{(item.price || 0).toLocaleString('en-IN')} • Purchased: {item.quantity}
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Quantity Selector */}
            {maxQuantity > 1 && (
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel} allowFontScaling={false}>
                  Quantity to return:
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnDisabled]}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={14} color={quantity <= 1 ? '#cbd5e1' : '#0f172a'} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue} allowFontScaling={false}>
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, quantity >= maxQuantity && styles.stepperBtnDisabled]}
                    onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    disabled={quantity >= maxQuantity}
                  >
                    <Plus size={14} color={quantity >= maxQuantity ? '#cbd5e1' : '#0f172a'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 3. Reason for Return */}
            <Text style={styles.sectionHeading} allowFontScaling={false}>
              2. Reason for Return
            </Text>
            <View style={styles.reasonsList}>
              {REASON_OPTIONS.map((opt) => {
                const isSelected = reasonCode === opt.code;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                    onPress={() => setReasonCode(opt.code)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.reasonLabel} allowFontScaling={false}>
                        {opt.label}
                      </Text>
                      <Text style={styles.reasonDesc} allowFontScaling={false}>
                        {opt.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Issue Details & Explanation */}
            <Text style={styles.sectionHeading} allowFontScaling={false}>
              3. Describe the Issue
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Provide details about the fault, damage, or discrepancy..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />

            {/* 5. Photographic Evidence Upload */}
            <Text style={styles.sectionHeading} allowFontScaling={false}>
              4. Upload Photo Evidence ({evidenceImages.length}/5)
            </Text>
            <Text style={styles.evidenceHint} allowFontScaling={false}>
              Add photos of defective parts, tags, or damage to speed up approval.
            </Text>

            <View style={styles.evidenceGallery}>
              {evidenceImages.map((uri, idx) => (
                <View key={idx} style={styles.evidenceThumbWrapper}>
                  <Image source={{ uri }} style={styles.evidenceThumb} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeThumbBtn}
                    onPress={() => handleRemoveImage(idx)}
                  >
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}

              {evidenceImages.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={handlePickImages}
                  activeOpacity={0.7}
                >
                  <Camera size={22} color="#6366f1" />
                  <Text style={styles.addPhotoText} allowFontScaling={false}>
                    Add Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, createReturnMutation.isPending && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={createReturnMutation.isPending}
              activeOpacity={0.8}
            >
              {createReturnMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText} allowFontScaling={false}>
                  Submit Return Request
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemsContainer: {
    gap: 8,
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  itemCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#4f46e5',
  },
  itemImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#4f46e5',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4f46e5',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  stepperBtnDisabled: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  stepperValue: {
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  reasonsList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonRowSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  reasonDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  evidenceHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  evidenceGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  evidenceThumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  evidenceThumb: {
    width: '100%',
    height: '100%',
  },
  removeThumbBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4f46e5',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
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
