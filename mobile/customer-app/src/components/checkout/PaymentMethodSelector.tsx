import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Circle, Banknote, CreditCard, AlertCircle, ShieldCheck } from 'lucide-react-native';

interface PaymentMethodSelectorProps {
  selectedMethod: 'COD' | 'ONLINE';
  onSelectMethod: (method: 'COD' | 'ONLINE') => void;
  codAvailability?: {
    codAvailable: boolean;
    reasons?: string[];
  };
  codAdvance?: {
    enabled: boolean;
    advanceAmount: number;
    remainingCODAmount: number;
  };
  isAddressSelected: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  codAvailability,
  codAdvance,
  isAddressSelected,
}) => {
  const isCodDisabled = isAddressSelected && codAvailability && !codAvailability.codAvailable;
  const isCodSelected = selectedMethod === 'COD' && !isCodDisabled;
  const isOnlineSelected = selectedMethod === 'ONLINE';

  return (
    <View style={{ gap: 12 }}>
      {/* Cash on Delivery */}
      <TouchableOpacity
        onPress={() => {
          if (!isCodDisabled) {
            onSelectMethod('COD');
          }
        }}
        disabled={isCodDisabled}
        activeOpacity={0.8}
        style={[
          styles.methodCard,
          isCodSelected ? styles.cardSelected : styles.cardUnselected,
          isCodDisabled && styles.cardDisabled,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={styles.codIconBox}>
              <Banknote size={22} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.methodTitle}>Cash on Delivery</Text>
                {codAvailability?.codAvailable && (
                  <View style={styles.eligibleBadge}>
                    <Text style={styles.eligibleBadgeText}>Eligible</Text>
                  </View>
                )}
              </View>
              <Text style={styles.methodSubtitle} numberOfLines={1}>
                Pay in cash when order is delivered to your door
              </Text>
            </View>
          </View>

          {isCodSelected ? (
            <CheckCircle2 size={20} color="#0f172a" />
          ) : (
            <Circle size={20} color="#94a3b8" />
          )}
        </View>

        {isCodDisabled && (
          <View style={styles.warningRow}>
            <AlertCircle size={13} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={styles.warningText}>
              {codAvailability?.reasons?.[0] || 'Cash on Delivery is unavailable for this delivery pincode'}
            </Text>
          </View>
        )}

        {codAdvance?.enabled && Number(codAdvance?.advanceAmount || 0) > 0 && (
          <View style={styles.advanceRow}>
            <ShieldCheck size={13} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.advanceText}>
              ₹{codAdvance.advanceAmount} advance online, ₹{codAdvance.remainingCODAmount} on delivery
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Online Payment */}
      <TouchableOpacity
        onPress={() => onSelectMethod('ONLINE')}
        activeOpacity={0.8}
        style={[
          styles.methodCard,
          isOnlineSelected ? styles.cardSelected : styles.cardUnselected,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={styles.onlineIconBox}>
              <CreditCard size={22} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>Online Payment</Text>
              <Text style={styles.methodSubtitle} numberOfLines={1}>
                Credit/Debit Cards, UPI, NetBanking & Wallets
              </Text>
            </View>
          </View>

          {isOnlineSelected ? (
            <CheckCircle2 size={20} color="#0f172a" />
          ) : (
            <Circle size={20} color="#94a3b8" />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  methodCard: {
    padding: 14,
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
  cardDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  codIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  onlineIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 8,
  },
  eligibleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#d1fae5',
    borderRadius: 6,
  },
  eligibleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  methodSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  warningText: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '500',
    flex: 1,
  },
  advanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e7ff',
  },
  advanceText: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '500',
    flex: 1,
  },
});
