import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MapPin, Plus, Truck } from 'lucide-react-native';
import { UserAddress } from '../../types/checkout';
import { AddressCard } from './AddressCard';

export interface AddressSelectionStepProps {
  addresses: UserAddress[];
  selectedAddressId: string;
  activeAddress: UserAddress | null;
  showAddressList: boolean;
  isAddressesLoading: boolean;
  deliveryEstimate: {
    formattedDate: string;
    daysMin?: number;
    daysMax?: number;
  };
  onToggleShowList: () => void;
  onSelectAddress: (addressId: string) => void;
  onDeleteAddress: (addressId: string) => void;
  onOpenAddAddressModal: () => void;
}

export const AddressSelectionStep: React.FC<AddressSelectionStepProps> = ({
  addresses,
  selectedAddressId,
  activeAddress,
  showAddressList,
  isAddressesLoading,
  deliveryEstimate,
  onToggleShowList,
  onSelectAddress,
  onDeleteAddress,
  onOpenAddAddressModal,
}) => {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MapPin size={18} className="text-slate-900 dark:text-white" />
          <Text style={styles.sectionTitle} className="text-slate-900 dark:text-white">
            Delivery Address
          </Text>
        </View>

        {addresses.length > 0 && (
          <TouchableOpacity
            onPress={onToggleShowList}
            activeOpacity={0.7}
            style={styles.changeBtn}
          >
            <Text style={styles.changeText}>
              {showAddressList ? 'Done' : 'Change'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isAddressesLoading ? (
        <View
          style={styles.loadingBox}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          <ActivityIndicator color="#4f46e5" size="small" />
        </View>
      ) : addresses.length === 0 ? (
        <View
          style={styles.emptyAddressBox}
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
        >
          <MapPin size={24} color="#94a3b8" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>No addresses saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your delivery address to proceed with checkout.
          </Text>
          <TouchableOpacity
            onPress={onOpenAddAddressModal}
            activeOpacity={0.8}
            style={styles.emptyAddBtn}
          >
            <Plus size={15} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.emptyAddText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Show all addresses when expanded */}
          {showAddressList ? (
            <View style={{ gap: 10 }}>
              {addresses.map((address) => (
                <AddressCard
                  key={address._id}
                  address={address}
                  isSelected={address._id === selectedAddressId}
                  onSelect={() => {
                    if (address._id) {
                      onSelectAddress(address._id);
                    }
                  }}
                  onDelete={() => {
                    if (address._id) {
                      onDeleteAddress(address._id);
                    }
                  }}
                />
              ))}
              <TouchableOpacity
                onPress={onOpenAddAddressModal}
                activeOpacity={0.7}
                style={styles.addAddressBtn}
              >
                <Plus size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                <Text style={styles.addAddressText}>
                  Add New Delivery Address
                </Text>
              </TouchableOpacity>

              {/* Estimated Delivery Promise Card */}
              <View
                style={styles.deliveryEstimateCard}
                className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 mt-2.5 flex-row items-center"
              >
                <View style={styles.deliveryEstimateIconBg} className="bg-white dark:bg-slate-800">
                  <Truck size={17} color="#4f46e5" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.deliveryEstimateTitle}>Estimated Delivery</Text>
                    <View style={styles.expressPill}>
                      <Text style={styles.expressPillText}>Fast Logistics</Text>
                    </View>
                  </View>
                  <Text style={styles.deliveryEstimateDate}>
                    {deliveryEstimate.formattedDate}
                  </Text>
                  <Text style={styles.deliveryEstimateSub}>
                    Shipped via verified courier partners (Delhivery, Shiprocket, Shadowfax)
                  </Text>
                </View>
              </View>
            </View>
          ) : activeAddress ? (
            /* Selected Address Card + Add New Address Box below it */
            <View>
              <AddressCard
                address={activeAddress}
                isSelected={true}
                onSelect={() => {}}
              />
              <TouchableOpacity
                onPress={onOpenAddAddressModal}
                activeOpacity={0.7}
                style={styles.addAddressBtn}
              >
                <Plus size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                <Text style={styles.addAddressText}>
                  Add New Delivery Address
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  changeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  changeText: {
    color: '#4f46e5',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingBox: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyAddressBox: {
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c7d2fe',
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 10,
  },
  addAddressText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
  },
  deliveryEstimateCard: {},
  deliveryEstimateIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deliveryEstimateTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expressPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expressPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  deliveryEstimateDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  deliveryEstimateSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
