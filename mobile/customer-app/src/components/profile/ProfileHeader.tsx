import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Mail, Phone, Edit3 } from 'lucide-react-native';
import { User } from '../../stores/authStore';

export interface ProfileHeaderProps {
  user: User;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  onEditPress,
}) => {
  return (
    <View style={styles.userCard}>
      <View style={styles.userInfoRow}>
        <View style={styles.avatar}>
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text style={styles.avatarText} allowFontScaling={false}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
        </View>

        <View style={styles.userDetails}>
          <Text style={styles.userName} allowFontScaling={false}>
            {user.name || 'Valued Customer'}
          </Text>
          {user.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText} allowFontScaling={false}>
                {user.role}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.editCardBtn}
          onPress={onEditPress}
          activeOpacity={0.7}
        >
          <Edit3 size={14} color="#4f46e5" style={{ marginRight: 4 }} />
          <Text style={styles.editCardBtnText} allowFontScaling={false}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contactDivider} />

      <View style={styles.contactRows}>
        {user.email ? (
          <View style={styles.contactRow}>
            <View style={styles.contactIconBg}>
              <Mail color="#64748b" size={15} />
            </View>
            <Text style={styles.contactText} allowFontScaling={false}>
              {user.email}
            </Text>
          </View>
        ) : null}

        {user.phone ? (
          <View style={styles.contactRow}>
            <View style={styles.contactIconBg}>
              <Phone color="#64748b" size={15} />
            </View>
            <Text style={styles.contactText} allowFontScaling={false}>
              {user.phone}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'capitalize',
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
  },
  editCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 14,
  },
  contactRows: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
});
