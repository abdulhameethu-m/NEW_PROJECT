import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Clapperboard, ShoppingCart, User } from 'lucide-react-native';
import { useCart } from '../../hooks/useCart';

export default function TabLayout() {
  const { data: cart } = useCart();
  const cartBadgeCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5', // Indigo-600
        tabBarInactiveTintColor: '#9ca3af', // Gray-400
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6', // Gray-100
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color, size }) => <Clapperboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          tabBarBadge: cartBadgeCount > 0 ? cartBadgeCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444' }
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
