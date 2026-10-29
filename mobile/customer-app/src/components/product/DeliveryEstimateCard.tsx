import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Banknote,
  RotateCcw,
} from 'lucide-react-native';
import { calculateDeliveryEstimate, DeliveryEstimate } from '../../utils/deliveryEstimator';
import { useAddresses } from '../../hooks/useAddresses';

interface DeliveryEstimateCardProps {
  freeShippingThreshold?: number;
}

export const DeliveryEstimateCard: React.FC<DeliveryEstimateCardProps> = ({
  freeShippingThreshold = 499,
}) => {
  const { data: addresses = [] } = useAddresses();
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  const [pincode, setPincode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [estimate, setEstimate] = useState<DeliveryEstimate>(() => calculateDeliveryEstimate());

  // Auto-fill pincode from default address if customer has one saved
  useEffect(() => {
    const postal = defaultAddress?.pincode || defaultAddress?.postalCode;
    if (postal && !pincode) {
      const clean = postal.replace(/\D/g, '').slice(0, 6);
      if (clean.length === 6) {
        setPincode(clean);
        setEstimate(calculateDeliveryEstimate(clean));
      }
    }
  }, [defaultAddress]);

  const handleCheckPincode = () => {
    const clean = pincode.replace(/\D/g, '').slice(0, 6);
    if (clean.length < 6) return;

    setIsChecking(true);
    setTimeout(() => {
      setEstimate(calculateDeliveryEstimate(clean));
      setIsChecking(false);
    }, 350);
  };

  return (
    <View style={styles.container}>
      {/* Header with Title & Location Pin */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Truck size={17} color="#4f46e5" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Delivery & Services
          </Text>
        </View>
        {estimate.isEligibleForFastDelivery && (
          <View style={styles.fastBadge}>
            <Text style={styles.fastBadgeText} allowFontScaling={false}>
              ⚡ Express
            </Text>
          </View>
        )}
      </View>

      {/* Pincode Input & Check Button */}
      <View style={styles.inputContainer}>
        <MapPin size={16} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit delivery pincode"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          maxLength={6}
          value={pincode}
          onChangeText={(val) => setPincode(val.replace(/\D/g, ''))}
          onSubmitEditing={handleCheckPincode}
          returnKeyType="done"
          allowFontScaling={false}
        />
        <TouchableOpacity
          style={[styles.checkBtn, pincode.length !== 6 && styles.checkBtnDisabled]}
          onPress={handleCheckPincode}
          disabled={pincode.length !== 6 || isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <Text
              style={[
                styles.checkBtnText,
                pincode.length !== 6 && styles.checkBtnTextDisabled,
              ]}
              allowFontScaling={false}
            >
              Check
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dynamic Delivery Date & Countdown Box */}
      <View style={styles.estimateBox}>
        <View style={styles.estimateDateRow}>
          <Text style={styles.estimateLabel} allowFontScaling={false}>
            Estimated Delivery:
          </Text>
          <Text style={styles.estimateDate} allowFontScaling={false}>
            {estimate.formattedDate}
          </Text>
        </View>

        {estimate.cutoffText ? (
          <View style={styles.cutoffRow}>
            <Clock size={12} color="#059669" style={{ marginRight: 5 }} />
            <Text style={styles.cutoffText} allowFontScaling={false}>
              {estimate.cutoffText}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Service Highlights / Trust Badges */}
      <View style={styles.perksList}>
        <View style={styles.perkItem}>
          <CheckCircle2 size={14} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.perkText} allowFontScaling={false}>
            <Text style={{ fontWeight: '700' }}>Free Delivery</Text> on orders above ₹{freeShippingThreshold}
          </Text>
        </View>

        <View style={styles.perkItem}>
          <Banknote size={14} color="#0284c7" style={{ marginRight: 8 }} />
          <Text style={styles.perkText} allowFontScaling={false}>
            <Text style={{ fontWeight: '700' }}>Cash on Delivery</Text> available at this location
          </Text>
        </View>

        <View style={styles.perkItem}>
          <RotateCcw size={14} color="#7c3aed" style={{ marginRight: 8 }} />
          <Text style={styles.perkText} allowFontScaling={false}>
            <Text style={{ fontWeight: '700' }}>7-Day Easy Return & Replacement</Text> guarantee
          </Text>
        </View>

        <View style={styles.perkItem}>
          <ShieldCheck size={14} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.perkText} allowFontScaling={false}>
            Dispatched via <Text style={{ fontWeight: '700' }}>Verified Courier Partners</Text> (Delhivery / Shiprocket)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  fastBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fastBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  checkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e0e7ff',
  },
  checkBtnDisabled: {
    backgroundColor: 'transparent',
  },
  checkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  checkBtnTextDisabled: {
    color: '#94a3b8',
  },
  estimateBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 14,
  },
  estimateDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  estimateLabel: {
    fontSize: 13,
    color: '#475569',
    marginRight: 6,
  },
  estimateDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e40af',
  },
  cutoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cutoffText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  perksList: {
    gap: 8,
    paddingTop: 4,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perkText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 17,
  },
});
