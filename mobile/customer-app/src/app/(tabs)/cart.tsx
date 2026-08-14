import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';

export default function CartScreen() {
  return (
    <SafeAreaScreen className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Shopping Cart</Text>
        <Text className="text-gray-500">Cart Screen (Phase 6)</Text>
      </View>
    </SafeAreaScreen>
  );
}
