import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { ShippingAddress } from '../../types/checkout';

export interface OrderDeliveryDetailsCardProps {
  address?: Partial<ShippingAddress>;
}

export const OrderDeliveryDetailsCard: React.FC<OrderDeliveryDetailsCardProps> = ({
  address = {},
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MapPin size={16} color="#4f46e5" style={{ marginRight: 6 }} />
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Delivery Address
        </Text>
      </View>

      <View style={styles.addressBody}>
        <Text style={styles.addressName} allowFontScaling={false}>
          {address.fullName || 'Customer'}
        </Text>
        {address.phone ? (
          <Text style={styles.addressPhone} allowFontScaling={false}>
            Phone: {address.phone}
          </Text>
        ) : null}
        <Text style={styles.addressStreet} allowFontScaling={false}>
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}
        </Text>
        <Text style={styles.addressCityState} allowFontScaling={false}>
          {address.city ? `${address.city}, ` : ''}
          {address.state ? `${address.state} - ` : ''}
          {address.postalCode}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressBody: {
    paddingVertical: 2,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 6,
  },
  addressStreet: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  addressCityState: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
});
