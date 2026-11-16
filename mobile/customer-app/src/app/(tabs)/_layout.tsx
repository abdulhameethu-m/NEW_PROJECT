import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Clapperboard, ShoppingCart, User } from 'lucide-react-native';
import { useCart } from '../../hooks/useCart';
import { Text, Platform, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { data: cart } = useCart();
  const cartBadgeCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);
  const tabHeight = (Platform.OS === 'android' ? 56 : 52) + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#818cf8' : '#4f46e5', // High-contrast active tint
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#9ca3af',
        tabBarAllowFontScaling: false, // Prevents Android accessibility font scaling from clipping tab labels
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: tabHeight,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: ({ color, focused }) => (
            <Text
              allowFontScaling={false}
              style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}
            >
              Home
            </Text>
          ),
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarLabel: ({ color, focused }) => (
            <Text
              allowFontScaling={false}
              style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}
            >
              Shop
            </Text>
          ),
          tabBarIcon: ({ color }) => <ShoppingBag color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarLabel: ({ color, focused }) => (
            <Text
              allowFontScaling={false}
              style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}
            >
              Reels
            </Text>
          ),
          tabBarIcon: ({ color }) => <Clapperboard color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarLabel: ({ color, focused }) => (
            <Text
              allowFontScaling={false}
              style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}
            >
              Cart
            </Text>
          ),
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={22} />,
          tabBarBadge: cartBadgeCount > 0 ? cartBadgeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            fontSize: 10,
            fontWeight: '700',
            lineHeight: 14,
            height: 16,
            minWidth: 16,
            borderRadius: 8,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ color, focused }) => (
            <Text
              allowFontScaling={false}
              style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}
            >
              Profile
            </Text>
          ),
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});
