import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, LogOut } from 'lucide-react-native';

export default function ProfileScreen() {
  const user = useAuthStore(state => state.user);

  const handleLogout = async () => {
    // Calling authApi.logout() handles the backend request, clears cookies, and resets UI state.
    await authApi.logout();
  };

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-bold text-gray-900 mb-8">Profile</Text>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <View className="items-center mb-6">
            <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-3">
              <Text className="text-3xl font-bold text-indigo-600">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text className="text-xl font-bold text-gray-900">{user.name || 'User'}</Text>
            {user.role && (
              <Text className="text-sm font-medium text-indigo-600 capitalize mt-1 px-3 py-1 bg-indigo-50 rounded-full">
                {user.role}
              </Text>
            )}
          </View>

          <View className="space-y-4">
            {user.email && (
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3">
                  <Mail color="#6b7280" size={20} />
                </View>
                <View>
                  <Text className="text-xs text-gray-500 font-medium">Email</Text>
                  <Text className="text-base text-gray-900">{user.email}</Text>
                </View>
              </View>
            )}
            
            {user.phone && (
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3">
                  <Phone color="#6b7280" size={20} />
                </View>
                <View>
                  <Text className="text-xs text-gray-500 font-medium">Phone</Text>
                  <Text className="text-base text-gray-900">{user.phone}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          className="w-full bg-white border border-red-200 rounded-xl py-4 flex-row items-center justify-center"
          onPress={handleLogout}
        >
          <LogOut color="#ef4444" size={20} />
          <Text className="text-red-500 font-semibold text-lg ml-2">Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
