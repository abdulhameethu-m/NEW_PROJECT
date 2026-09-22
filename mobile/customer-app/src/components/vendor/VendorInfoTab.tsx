import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Truck,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Store,
} from 'lucide-react-native';
import { VendorStore } from '../../types/vendor';

interface VendorInfoTabProps {
  vendor: VendorStore;
}

export const VendorInfoTab: React.FC<VendorInfoTabProps> = ({ vendor }) => {
  const handleCall = () => {
    if (vendor.supportPhone) {
      Linking.openURL(`tel:${vendor.supportPhone}`).catch(() => {
        Alert.alert('Unable to Call', `Dial number directly: ${vendor.supportPhone}`);
      });
    }
  };

  const handleEmail = () => {
    if (vendor.supportEmail) {
      Linking.openURL(`mailto:${vendor.supportEmail}`).catch(() => {
        Alert.alert('Unable to Email', `Write to: ${vendor.supportEmail}`);
      });
    }
  };

  const addressString =
    typeof vendor.address === 'string'
      ? vendor.address
      : vendor.address
      ? [
          vendor.address.addressLine1,
          vendor.address.addressLine2,
          vendor.address.city,
          vendor.address.state,
          vendor.address.postalCode,
          vendor.address.country,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

  return (
    <View style={styles.container}>
      {/* About Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Store size={18} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            About {vendor.vendorName}
          </Text>
        </View>
        <Text style={styles.aboutText} allowFontScaling={false}>
          {vendor.storeDescription ||
            `${vendor.vendorName} is a verified seller providing authentic products with direct customer dispatch on the Uchooseme marketplace.`}
        </Text>

        {vendor.storeCategories && vendor.storeCategories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionSublabel} allowFontScaling={false}>
              Specialties & Categories:
            </Text>
            <View style={styles.chipsRow}>
              {vendor.storeCategories.map((cat, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText} allowFontScaling={false}>
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Customer Support Contact */}
      {(vendor.supportEmail || vendor.supportPhone) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Mail size={18} color="#0284c7" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Store Customer Care
            </Text>
          </View>

          {vendor.supportEmail ? (
            <TouchableOpacity
              onPress={handleEmail}
              style={styles.contactRow}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconWrap, { backgroundColor: '#f0f9ff' }]}>
                <Mail size={16} color="#0284c7" />
              </View>
              <View style={styles.contactCol}>
                <Text style={styles.contactLabel} allowFontScaling={false}>
                  Email Support
                </Text>
                <Text style={styles.contactValue} allowFontScaling={false}>
                  {vendor.supportEmail}
                </Text>
              </View>
              <ExternalLink size={14} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}

          {vendor.supportPhone ? (
            <TouchableOpacity
              onPress={handleCall}
              style={styles.contactRow}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconWrap, { backgroundColor: '#ecfdf5' }]}>
                <Phone size={16} color="#059669" />
              </View>
              <View style={styles.contactCol}>
                <Text style={styles.contactLabel} allowFontScaling={false}>
                  Direct Phone Support
                </Text>
                <Text style={styles.contactValue} allowFontScaling={false}>
                  {vendor.supportPhone}
                </Text>
              </View>
              <ExternalLink size={14} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Business & Location Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 size={18} color="#475569" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle} allowFontScaling={false}>
            Business Details
          </Text>
        </View>

        {vendor.companyName ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoKey} allowFontScaling={false}>
              Registered Entity
            </Text>
            <Text style={styles.infoVal} allowFontScaling={false}>
              {vendor.companyName}
            </Text>
          </View>
        ) : null}

        {vendor.vendorCode ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoKey} allowFontScaling={false}>
              Merchant ID
            </Text>
            <Text style={styles.infoVal} allowFontScaling={false}>
              {vendor.vendorCode}
            </Text>
          </View>
        ) : null}

        {addressString ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoKey} allowFontScaling={false}>
              Dispatch Address
            </Text>
            <Text style={styles.infoVal} allowFontScaling={false}>
              {addressString}
            </Text>
          </View>
        ) : null}

        {vendor.defaultCourier ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoKey} allowFontScaling={false}>
              Primary Logistics
            </Text>
            <Text style={styles.infoVal} allowFontScaling={false}>
              {vendor.defaultCourier}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Text style={styles.infoKey} allowFontScaling={false}>
            Verification
          </Text>
          <View style={styles.verifiedRow}>
            <ShieldCheck size={14} color="#059669" />
            <Text style={styles.verifiedVal} allowFontScaling={false}>
              Marketplace Approved Merchant
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  aboutText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
  },
  categoriesSection: {
    marginTop: 12,
  },
  sectionSublabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  contactValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 1,
  },
  infoRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoKey: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  verifiedVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
