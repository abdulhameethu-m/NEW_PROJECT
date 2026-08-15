import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, AlertCircle, ArrowRight, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { KeyboardAwareScreen } from '../../components/layout/KeyboardAwareScreen';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { authApi } from '../../api/auth';
import { AxiosError } from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'RESET'>('REQUEST');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestOTP = async () => {
    if (!identifier.trim()) {
      setError('Please enter a valid phone number or email.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.requestPasswordResetOTP(identifier.trim());
      setMessage('OTP sent successfully. Please check your messages.');
      setStep('VERIFY');
      setTimer(60);
    } catch (err: any) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to send OTP.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'VERIFY' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.verifyPasswordResetOTP(identifier.trim(), otp.trim());
      if (data?.resetToken) {
        setResetToken(data.resetToken);
        setMessage('OTP Verified. Please enter your new password.');
        setStep('RESET');
      } else {
        setError('Invalid verification response from server.');
      }
    } catch (err: any) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || err.response?.data?.error?.message || 'Invalid OTP.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setMessage('Password reset successful! You can now login.');
      // Optional: wait a moment before going back
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to reset password.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
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
                onPress={() => {
                  if (step === 'VERIFY') setStep('REQUEST');
                  else if (step === 'RESET') setStep('VERIFY');
                  else router.back();
                }}
                className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 z-10 mb-6"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}
              >
                <ChevronLeft size={24} color="#1e293b" />
              </TouchableOpacity>
              
              <Text className="text-3xl font-bold text-slate-900 mb-2">Reset Password</Text>
              <Text className="text-slate-500 text-base">
                {step === 'REQUEST' && 'Enter your email or phone number to receive an OTP.'}
                {step === 'VERIFY' && `Enter the OTP sent to ${identifier}.`}
                {step === 'RESET' && 'Create a new secure password.'}
              </Text>
            </View>

            {error && (
              <View className="bg-red-50 p-4 rounded-2xl mb-6 flex-row items-center border border-red-100">
                <AlertCircle color="#ef4444" size={20} />
                <Text className="text-red-600 ml-2 flex-1">{error}</Text>
              </View>
            )}

            {message && !error && (
              <View className="bg-green-50 p-4 rounded-2xl mb-6 flex-row items-center border border-green-100">
                <CheckCircle color="#16a34a" size={20} />
                <Text className="text-green-700 ml-2 flex-1">{message}</Text>
              </View>
            )}

            <View className="space-y-4">
              {step === 'REQUEST' && (
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
              )}

              {step === 'VERIFY' && (
                <View className="mb-6">
                  <View className={`flex-row items-center w-full bg-white border border-slate-200 rounded-2xl px-4 h-14`}
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}
                  >
                    <CheckCircle color={'#94a3b8'} size={20} className="mr-3" />
                    <TextInput
                      className="flex-1 text-slate-900 text-base h-full"
                      style={{ outlineStyle: 'none' } as any}
                      placeholder="6-digit OTP code"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      onChangeText={setOtp}
                      value={otp}
                      editable={!loading}
                    />
                  </View>
                  <View className="mt-4 flex-row justify-between items-center px-1">
                    <Text className="text-slate-500 text-sm">
                      {timer > 0 ? `Resend code in ${timer}s` : "Didn't receive the code?"}
                    </Text>
                    <TouchableOpacity 
                      disabled={timer > 0 || loading}
                      onPress={handleRequestOTP}
                    >
                      <Text className={`font-semibold ${timer > 0 ? 'text-slate-400' : 'text-indigo-600'}`}>
                        Resend OTP
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 'RESET' && (
                <View className="mb-6">
                  <View className={`flex-row items-center w-full bg-white border border-slate-200 rounded-2xl px-4 h-14`}
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}
                  >
                    <Lock color={'#94a3b8'} size={20} className="mr-3" />
                    <TextInput
                      className="flex-1 text-slate-900 text-base h-full"
                      style={{ outlineStyle: 'none' } as any}
                      placeholder="New Password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onChangeText={setNewPassword}
                      value={newPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="ml-2"
                    >
                      {showPassword ? <EyeOff color="#94a3b8" size={20} /> : <Eye color="#94a3b8" size={20} />}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                className="w-full h-14 rounded-2xl overflow-hidden shadow-md flex-row items-center justify-center"
                style={{ shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                onPress={() => {
                  if (step === 'REQUEST') handleRequestOTP();
                  else if (step === 'VERIFY') handleVerifyOTP();
                  else handleResetPassword();
                }}
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
                    <Text className="text-white font-semibold text-[17px]">
                      {step === 'REQUEST' && 'Send OTP'}
                      {step === 'VERIFY' && 'Verify OTP'}
                      {step === 'RESET' && 'Update Password'}
                    </Text>
                    <View className="absolute right-5">
                      <ArrowRight color="white" size={20} strokeWidth={2.5} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ResponsiveContainer>
        </KeyboardAwareScreen>
      </SafeAreaScreen>
    </View>
  );
}
