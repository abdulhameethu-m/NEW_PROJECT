import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Circle, MapPin, Phone, Trash2 } from 'lucide-react-native';
import { UserAddress } from '../../types/checkout';

interface AddressCardProps {
  address: UserAddress;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  isSelected,
  onSelect,
  onDelete,
}) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.85}
      style={[
        styles.card,
        isSelected ? styles.cardSelected : styles.cardUnselected,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.nameRow}>
          {isSelected ? (
            <CheckCircle2 size={20} color="#0f172a" />
          ) : (
            <Circle size={20} color="#94a3b8" />
          )}
          <Text style={styles.nameText} numberOfLines={1}>
            {address.name}
          </Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Trash2 size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <MapPin size={13} color="#64748b" style={styles.detailIcon} />
          <Text style={styles.addressText} numberOfLines={2}>
            {address.addressLine}, {address.city}, {address.state} - {address.pincode}
          </Text>
        </View>

        <View style={[styles.detailRow, { marginTop: 4 }]}>
          <Phone size={12} color="#64748b" style={styles.detailIcon} />
          <Text style={styles.phoneText}>+91 {address.phone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  cardUnselected: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  nameText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#0f172a',
    marginLeft: 8,
  },
  defaultBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e0e7ff',
    borderRadius: 999,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  deleteBtn: {
    padding: 4,
    borderRadius: 999,
  },
  detailsContainer: {
    marginLeft: 28,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginTop: 2,
    marginRight: 6,
    flexShrink: 0,
  },
  addressText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  phoneText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
});
