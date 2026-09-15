import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  MapPin,
  Plus,
  Phone,
  Trash2,
  Edit2,
  CheckCircle2,
  Building,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useSetDefaultAddress,
  useDeleteAddress,
} from '../../hooks/useAddresses';
import { AddressFormModal } from '../../components/checkout/AddressFormModal';
import { UserAddress } from '../../types/checkout';

export default function AddressesScreen() {
  const router = useRouter();
  const { data: addresses = [], isLoading, isRefetching, refetch } = useAddresses();

  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const setDefaultMutation = useSetDefaultAddress();
  const deleteMutation = useDeleteAddress();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (addr: UserAddress) => {
    setEditingAddress(addr);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingAddress(null);
  };

  const handleSaveAddress = async (formData: Omit<UserAddress, '_id'>) => {
    if (editingAddress?._id) {
      await updateMutation.mutateAsync({
        id: editingAddress._id,
        payload: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
    handleCloseModal();
  };

  const handleSetDefault = async (addr: UserAddress) => {
    if (!addr._id) return;
    try {
      await setDefaultMutation.mutateAsync(addr._id);
    } catch {
      Alert.alert('Error', 'Failed to set default address. Please try again.');
    }
  };

  const handleDelete = (addr: UserAddress) => {
    if (!addr._id) return;
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete the address for "${addr.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!addr._id) return;
            try {
              await deleteMutation.mutateAsync(addr._id);
            } catch {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} allowFontScaling={false}>
          Delivery Addresses
        </Text>

        <TouchableOpacity
          onPress={handleOpenAdd}
          style={styles.addHeaderBtn}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading your addresses...
          </Text>
        </View>
      ) : addresses.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#4f46e5']}
            />
          }
        >
          <View style={styles.emptyIconCircle}>
            <MapPin size={40} color="#6366f1" />
          </View>
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            No Saved Addresses
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            You haven't added any delivery addresses yet. Add an address now to enjoy quick checkout!
          </Text>
          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={handleOpenAdd}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.addFirstBtnText} allowFontScaling={false}>
              Add New Address
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.listContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={['#4f46e5']}
              />
            }
          >
            <Text style={styles.sectionHeader} allowFontScaling={false}>
              SAVED LOCATIONS ({addresses.length})
            </Text>

            {addresses.map((addr, idx) => (
              <View
                key={addr._id || String(idx)}
                style={[
                  styles.addressCard,
                  addr.isDefault && styles.addressCardDefault,
                ]}
              >
                {/* Card Top: Name & Badges */}
                <View style={styles.cardTopRow}>
                  <View style={styles.nameBlock}>
                    <Text style={styles.nameText} allowFontScaling={false}>
                      {addr.name}
                    </Text>
                    {addr.isDefault ? (
                      <View style={styles.defaultPill}>
                        <CheckCircle2 size={11} color="#047857" style={{ marginRight: 3 }} />
                        <Text style={styles.defaultPillText} allowFontScaling={false}>
                          DEFAULT
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Card Body: Address Details */}
                <View style={styles.addressBody}>
                  <View style={styles.detailRow}>
                    <Building size={14} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.streetText} allowFontScaling={false}>
                      {addr.addressLine}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MapPin size={14} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.cityText} allowFontScaling={false}>
                      {addr.city}, {addr.state} - {addr.pincode}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Phone size={14} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.phoneText} allowFontScaling={false}>
                      +91 {addr.phone}
                    </Text>
                  </View>
                </View>

                {/* Card Footer: Action Buttons */}
                <View style={styles.cardFooter}>
                  {!addr.isDefault ? (
                    <TouchableOpacity
                      onPress={() => handleSetDefault(addr)}
                      style={styles.setDefaultBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.setDefaultBtnText} allowFontScaling={false}>
                        Set as Default
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}

                  <View style={styles.rightActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(addr)}
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={15} color="#4f46e5" style={{ marginRight: 4 }} />
                      <Text style={styles.editBtnText} allowFontScaling={false}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(addr)}
                      style={[styles.actionBtn, styles.deleteBtn]}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={15} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={styles.deleteBtnText} allowFontScaling={false}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Bottom Fixed Add Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.bottomAddBtn}
              onPress={handleOpenAdd}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.bottomAddBtnText} allowFontScaling={false}>
                Add New Delivery Address
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Address Form Modal */}
      <AddressFormModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveAddress}
        initialData={editingAddress}
        isLoading={createMutation.isPending || updateMutation.isPending}
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
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addFirstBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  addressCardDefault: {
    borderColor: '#c7d2fe',
    backgroundColor: '#ffffff',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 8,
  },
  defaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  addressBody: {
    paddingVertical: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  streetText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  setDefaultBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  setDefaultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deleteBtn: {
    borderColor: '#fee2e2',
    backgroundColor: '#fff1f2',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomAddBtn: {
    height: 50,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomAddBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
