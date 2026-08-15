import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { KeyboardAwareScreen } from '../../components/layout/KeyboardAwareScreen';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { authApi } from '../../api/auth';
import { AxiosError } from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotUsernameScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name?: string; email?: string; phone?: string } | null>(null);

  const onSubmit = async () => {
    if (!identifier.trim()) {
      setError('Please enter a valid phone number or email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.findUserForRecovery(identifier.trim());
      setResult(data);
    } catch (err: any) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || err.response?.data?.error?.message || 'Account not found.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Gradient Mesh Background */}
      <View className="absolute top-0 left-0 right-0 h-[400px] overflow-hidden opacity-40" pointerEvents="none">
        <LinearGradient
          colors={['#e0c3fc', '#8ec5fc', 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaScreen className="flex-1" edges={['top', 'bottom']} backgroundColor="transparent">
        <KeyboardAwareScreen>
          <ResponsiveContainer style={{ paddingBottom: 40, paddingTop: 24 }}>
            
            {/* Header Area */}
            <View className="relative mb-8">
              <TouchableOpacity 
                onPress={() => router.back()}
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 z-10 mb-6"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}
              >
                <ChevronLeft size={24} color="#1e293b" />
              </TouchableOpacity>
              
              <Text className="text-3xl font-bold text-slate-900 mb-2">Find Account</Text>
              <Text className="text-slate-500 text-base">
                Enter your secondary email or phone to find your account details.
              </Text>
            </View>

            {error && (
              <View className="bg-red-50 p-4 rounded-2xl mb-6 flex-row items-center border border-red-100">
                <AlertCircle color="#ef4444" size={20} />
                <Text className="text-red-600 ml-2 flex-1">{error}</Text>
              </View>
            )}

            {result ? (
              <View className="bg-green-50 p-6 rounded-3xl border border-green-100 items-center">
                <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                  <CheckCircle color="#16a34a" size={32} />
                </View>
                <Text className="text-xl font-bold text-slate-900 mb-4">Account Found</Text>
                
                <View className="w-full bg-white rounded-2xl p-4 border border-green-100 mb-4 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                  {result.name && (
                    <View className="flex-row items-center justify-between py-2 border-b border-slate-50">
                      <Text className="text-slate-500 text-sm">Name</Text>
                      <Text className="text-slate-900 font-semibold text-sm">{result.name}</Text>
                    </View>
                  )}
                  {result.email && (
                    <View className="flex-row items-center justify-between py-2 border-b border-slate-50">
                      <Text className="text-slate-500 text-sm">Email</Text>
                      <Text className="text-slate-900 font-semibold text-sm">{result.email}</Text>
                    </View>
                  )}
                  {result.phone && (
                    <View className="flex-row items-center justify-between py-2">
                      <Text className="text-slate-500 text-sm">Phone</Text>
                      <Text className="text-slate-900 font-semibold text-sm">{result.phone}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  className="w-full h-12 bg-white rounded-xl border border-green-200 items-center justify-center mt-2"
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text className="text-green-700 font-semibold">Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-4">
                <View className="mb-6">
                  <View className={`flex-row items-center w-full bg-white border border-slate-200 rounded-2xl px-4 h-14`}
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}
                  >
                    <Mail color={'#94a3b8'} size={20} className="mr-3" />
                    <TextInput
                      className="flex-1 text-slate-900 text-base h-full"
                      style={{ outlineStyle: 'none' } as any}
                      placeholder="Email or Phone Number"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onChangeText={setIdentifier}
                      value={identifier}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  className="w-full h-14 rounded-2xl overflow-hidden shadow-md flex-row items-center justify-center"
                  style={{ shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                  onPress={onSubmit}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#4f46e5', '#f97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text className="text-white font-semibold text-[17px]">Find Account</Text>
                      <View className="absolute right-5">
                        <ArrowRight color="white" size={20} strokeWidth={2.5} />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ResponsiveContainer>
        </KeyboardAwareScreen>
      </SafeAreaScreen>
    </View>
  );
}
