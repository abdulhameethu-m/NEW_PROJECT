import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';

export default function ReelsScreen() {
  return (
    <SafeAreaScreen className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-white mb-2">Reels</Text>
        <Text className="text-gray-400">Coming Soon</Text>
      </View>
    </SafeAreaScreen>
  );
}
