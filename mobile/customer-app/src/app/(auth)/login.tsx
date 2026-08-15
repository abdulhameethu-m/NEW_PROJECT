import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { loginSchema, LoginFormData } from '../../utils/validation';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff, AlertCircle, ChevronLeft, Mail, Lock, ArrowRight, ShieldCheck, Percent, Headphones, Smartphone } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { KeyboardAwareScreen } from '../../components/layout/KeyboardAwareScreen';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { AxiosError } from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore(state => state.setUser);
  
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null);
    try {
      const user = await authApi.login(data);
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err instanceof AxiosError) {
        const errorMsg = err.response?.data?.message || err.response?.data?.error?.message || 'Invalid credentials or network error.';
        setGlobalError(errorMsg);
      } else {
        setGlobalError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Gradient Mesh Background */}
      <View className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden opacity-40" pointerEvents="none">
        <LinearGradient
          colors={['#e0c3fc', '#8ec5fc', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View className="absolute -top-32 -left-20 w-80 h-80 bg-pink-100 rounded-full blur-3xl opacity-50" />
        <View className="absolute top-10 -right-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50" />
      </View>

      <SafeAreaScreen className="flex-1" edges={['top', 'bottom']} backgroundColor="transparent">
        <KeyboardAwareScreen>
          <ResponsiveContainer style={{ paddingBottom: 40, paddingTop: 24 }}>
            
            {/* Header Area */}
            <View className="relative mb-6">
              <TouchableOpacity 
                onPress={() => router.back()}
                className="absolute top-0 left-0 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 z-10"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}
              >
                <ChevronLeft size={24} color="#1e293b" />
              </TouchableOpacity>
              
              <View className="items-center mt-2">
                <Image 
                  source={require('../../../assets/images/logo-transparent.png')} 
                  style={{ width: 240, height: 180 }}
                  contentFit="contain"
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-3xl font-bold text-slate-900 mb-1">Welcome Back! 👋</Text>
              <Text className="text-slate-500 text-base">
                Login to <Text className="text-indigo-600 font-semibold">Uchooseme</Text> to continue shopping.
              </Text>
            </View>

            {globalError && (
              <View className="bg-red-50 p-4 rounded-2xl mb-6 flex-row items-center border border-red-100">
                <AlertCircle color="#ef4444" size={20} />
                <Text className="text-red-600 ml-2 flex-1">{globalError}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View>
              <View className="mb-4">
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className={`flex-row items-center w-full bg-white border ${errors.identifier ? 'border-red-500' : focusedInput === 'identifier' ? 'border-[#8b5cf6]' : 'border-slate-200'} rounded-2xl px-4 h-14`}
                      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}
                    >
                      <Mail color={focusedInput === 'identifier' ? '#8b5cf6' : '#94a3b8'} size={20} className="mr-3" />
                      <TextInput
                        className="flex-1 text-slate-900 text-base h-full"
                        style={{ outlineStyle: 'none' } as any}
                        placeholder="Email or Phone Number"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFocus={() => setFocusedInput('identifier')}
                        onBlur={() => { onBlur(); setFocusedInput(null); }}
                        onChangeText={onChange}
                        value={value}
                        editable={!isSubmitting}
                      />
                    </View>
                  )}
                />
                {errors.identifier && <Text className="text-red-500 text-xs mt-1 ml-4">{errors.identifier.message}</Text>}
              </View>

              <View className="mb-2">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className={`flex-row items-center w-full bg-white border ${errors.password ? 'border-red-500' : focusedInput === 'password' ? 'border-[#8b5cf6]' : 'border-slate-200'} rounded-2xl px-4 h-14`}
                      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}
                    >
                      <Lock color={focusedInput === 'password' ? '#8b5cf6' : '#94a3b8'} size={20} className="mr-3" />
                      <TextInput
                        className="flex-1 text-slate-900 text-base h-full"
                        style={{ outlineStyle: 'none' } as any}
                        placeholder="Password"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => { onBlur(); setFocusedInput(null); }}
                        onChangeText={onChange}
                        value={value}
                        editable={!isSubmitting}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="ml-2"
                      >
                        {showPassword ? <EyeOff color="#94a3b8" size={20} /> : <Eye color="#94a3b8" size={20} />}
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.password && <Text className="text-red-500 text-xs mt-1 ml-4">{errors.password.message}</Text>}
              </View>
            </View>

            {/* Forgot Credentials Options */}
            <View className="flex-row items-center justify-between mt-3 mb-6">
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-indigo-600 font-semibold text-xs">Forgot password?</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/(auth)/forgot-username" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-indigo-600 font-semibold text-xs">Forgot email/phone?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="w-full h-14 rounded-2xl overflow-hidden shadow-md flex-row items-center justify-center"
              style={{ shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={['#4f46e5', '#f97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-semibold text-[17px]">Login</Text>
                  <View className="absolute right-5">
                    <ArrowRight color="white" size={20} strokeWidth={2.5} />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Or Sign Up With */}
            <View className="flex-row items-center mt-8 mb-6">
              <View className="flex-1 h-px bg-slate-200" />
              <Text className="text-slate-400 px-4 text-sm font-medium">or continue with</Text>
              <View className="flex-1 h-px bg-slate-200" />
            </View>

            {/* Social Logins */}
            <View className="flex-row justify-between mb-8">
              <TouchableOpacity className="flex-1 bg-white border border-slate-100 h-14 rounded-2xl flex-row items-center justify-center mr-2 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={{ width: 18, height: 18 }} />
                <Text className="font-semibold text-slate-800 ml-1.5 text-xs" numberOfLines={1} adjustsFontSizeToFit>Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1 bg-white border border-slate-100 h-14 rounded-2xl flex-row items-center justify-center mx-1 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={{ width: 18, height: 18 }} />
                <Text className="font-semibold text-slate-800 ml-1.5 text-xs" numberOfLines={1} adjustsFontSizeToFit>Apple</Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1 bg-white border border-slate-100 h-14 rounded-2xl flex-row items-center justify-center ml-2 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
                <Smartphone color="#7c3aed" size={18} />
                <Text className="font-semibold text-slate-800 ml-1 text-xs" numberOfLines={1} adjustsFontSizeToFit>Mobile</Text>
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View className="flex-row justify-center mb-10">
              <Text className="text-slate-600 font-medium">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-indigo-600 font-bold underline">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
            
            {/* Trust Badges */}
            <View className="flex-row justify-between bg-slate-50 border border-slate-100 rounded-3xl p-4 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}>
              <View className="items-center flex-1 px-1">
                <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mb-1">
                  <ShieldCheck color="#6366f1" size={20} />
                </View>
                <Text className="font-bold text-slate-800 text-[11px] text-center" numberOfLines={1}>Secure</Text>
                <Text className="text-slate-500 text-[9px] text-center mt-0.5" numberOfLines={2}>Safe data</Text>
              </View>
              
              <View className="w-px bg-slate-200 mx-1" />
              
              <View className="items-center flex-1 px-1">
                <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mb-1">
                  <Percent color="#6366f1" size={20} />
                </View>
                <Text className="font-bold text-slate-800 text-[11px] text-center" numberOfLines={1}>Offers</Text>
                <Text className="text-slate-500 text-[9px] text-center mt-0.5" numberOfLines={2}>Best deals</Text>
              </View>
              
              <View className="w-px bg-slate-200 mx-1" />
              
              <View className="items-center flex-1 px-1">
                <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mb-1">
                  <Headphones color="#6366f1" size={20} />
                </View>
                <Text className="font-bold text-slate-800 text-[11px] text-center" numberOfLines={1}>Support</Text>
                <Text className="text-slate-500 text-[9px] text-center mt-0.5" numberOfLines={2}>24/7 help</Text>
              </View>
            </View>

          </ResponsiveContainer>
        </KeyboardAwareScreen>
      </SafeAreaScreen>
    </View>
  );
}
