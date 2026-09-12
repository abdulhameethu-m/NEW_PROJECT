import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Banknote, MapPin, ShieldCheck, CheckCircle2, X } from 'lucide-react-native';
import { ShippingAddress } from '../../types/checkout';

interface CodConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalAmount: number;
  shippingAddress?: ShippingAddress | null;
  isLoading?: boolean;
}

export const CodConfirmationModal: React.FC<CodConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  totalAmount,
  shippingAddress,
  isLoading = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <Banknote size={26} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Confirm Cash on Delivery</Text>
                    <Text style={styles.headerSubtitle}>
                      Are you sure you want to place this order?
                    </Text>
                  </View>
                </View>

                {!isLoading && (
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <X size={16} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Order Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Pay on Delivery</Text>
                    <Text style={styles.amountHint}>Pay when delivered to your door</Text>
                  </View>
                  <Text style={styles.amountValue}>
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </Text>
                </View>

                {shippingAddress && (
                  <View style={styles.addressRow}>
                    <MapPin size={16} color="#4f46e5" style={{ marginTop: 2, marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipientName}>
                        Deliver to: {shippingAddress.fullName}
                      </Text>
                      <Text style={styles.fullAddress} numberOfLines={2}>
                        {shippingAddress.line1}, {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}
                      </Text>
                      {shippingAddress.phone && (
                        <Text style={styles.phoneText}>
                          Phone: +91 {shippingAddress.phone}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.noteRow}>
                  <ShieldCheck size={14} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.noteText}>
                    Keep exact cash ready for smooth and fast handover.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  style={styles.confirmBtn}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmBtnText}>Confirm Order</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 12,
  },
  dragHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  amountHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4f46e5',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  recipientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  fullAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  noteText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  actionsContainer: {
    gap: 10,
  },
  confirmBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  cancelBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
});
