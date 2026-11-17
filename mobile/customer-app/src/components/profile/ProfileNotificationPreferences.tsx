import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';

export interface ProfileNotificationPreferencesProps {
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  promotions: boolean;
  onOrderUpdatesChange: (val: boolean) => void;
  onDeliveryAlertsChange: (val: boolean) => void;
  onPromotionsChange: (val: boolean) => void;
}

export const ProfileNotificationPreferences: React.FC<ProfileNotificationPreferencesProps> = ({
  orderUpdates,
  deliveryAlerts,
  promotions,
  onOrderUpdatesChange,
  onDeliveryAlertsChange,
  onPromotionsChange,
}) => {
  return (
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
          onValueChange={onOrderUpdatesChange}
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
          onValueChange={onDeliveryAlertsChange}
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
          onValueChange={onPromotionsChange}
          trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
          thumbColor={promotions ? '#4f46e5' : '#ffffff'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
