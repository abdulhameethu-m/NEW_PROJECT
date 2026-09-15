import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Clapperboard, ShoppingCart, User } from 'lucide-react-native';
import { useCart } from '../../hooks/useCart';
import { Text, Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { data: cart } = useCart();
  const cartBadgeCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5', // Indigo-600
        tabBarInactiveTintColor: '#9ca3af', // Gray-400
        tabBarAllowFontScaling: false, // Prevents Android accessibility font scaling from clipping tab labels
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          backgroundColor: '#ffffff',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 8 : 6,
          height: Platform.OS === 'android' ? 66 : 62,
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
