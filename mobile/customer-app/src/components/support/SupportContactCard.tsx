import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Phone, Mail, Clock, Headphones } from 'lucide-react-native';
import { SUPPORT_CONTACT_INFO } from '../../constants/supportFaqs';

export const SupportContactCard: React.FC = () => {
  const handleCall = () => {
    const url = `tel:${SUPPORT_CONTACT_INFO.phone.replace(/[^0-9+]/g, '')}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Call Support', `Please dial: ${SUPPORT_CONTACT_INFO.displayPhone}`);
      }
    });
  };

  const handleEmail = () => {
    const url = `mailto:${SUPPORT_CONTACT_INFO.email}?subject=Customer%20Support%20Inquiry`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Email Support', `Please write to: ${SUPPORT_CONTACT_INFO.email}`);
      }
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBg}>
          <Headphones size={20} color="#4f46e5" />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.cardTitle} allowFontScaling={false}>
            Direct Support Channels
          </Text>
          <Text style={styles.cardSubtitle} allowFontScaling={false}>
            Reach our customer care specialists directly
          </Text>
        </View>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCall}
          activeOpacity={0.75}
        >
          <View style={[styles.btnIconBg, { backgroundColor: '#ecfdf5' }]}>
            <Phone size={16} color="#059669" />
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.btnActionLabel} allowFontScaling={false}>
              Toll-Free Call
            </Text>
            <Text style={styles.btnDetail} allowFontScaling={false} numberOfLines={1}>
              {SUPPORT_CONTACT_INFO.displayPhone}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleEmail}
          activeOpacity={0.75}
        >
          <View style={[styles.btnIconBg, { backgroundColor: '#eef2ff' }]}>
            <Mail size={16} color="#4f46e5" />
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.btnActionLabel} allowFontScaling={false}>
              Email Support
            </Text>
            <Text style={styles.btnDetail} allowFontScaling={false} numberOfLines={1}>
              {SUPPORT_CONTACT_INFO.email}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <Clock size={12} color="#94a3b8" style={{ marginRight: 5 }} />
        <Text style={styles.footerText} allowFontScaling={false}>
          {SUPPORT_CONTACT_INFO.workingHours} · {SUPPORT_CONTACT_INFO.responseTime}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10,
  },
  btnIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  btnTextCol: {
    flex: 1,
  },
  btnActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  btnDetail: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  footerText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
