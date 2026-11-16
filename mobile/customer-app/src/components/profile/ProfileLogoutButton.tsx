import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';

export interface ProfileLogoutButtonProps {
  onLogout: () => void;
}

export const ProfileLogoutButton: React.FC<ProfileLogoutButtonProps> = ({ onLogout }) => {
  return (
    <TouchableOpacity
      style={styles.logoutBtn}
      onPress={onLogout}
      activeOpacity={0.8}
    >
      <LogOut color="#ef4444" size={18} style={{ marginRight: 8 }} />
      <Text style={styles.logoutBtnText} allowFontScaling={false}>
        Log Out
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 16,
    height: 50,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
