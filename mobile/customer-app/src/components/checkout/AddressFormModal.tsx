import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { UserAddress } from '../../types/checkout';

interface AddressFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (address: Omit<UserAddress, '_id'>) => Promise<void>;
  isLoading?: boolean;
}

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  visible,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit mobile number';
    }

    if (!addressLine.trim() || addressLine.trim().length < 5) {
      newErrors.addressLine = 'Street address must be at least 5 characters';
    }

    if (!city.trim() || city.trim().length < 2) {
      newErrors.city = 'City is required';
    }

    if (!state.trim() || state.trim().length < 2) {
      newErrors.state = 'State is required';
    }

    const cleanPincode = pincode.replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await onSave({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.replace(/\D/g, ''),
        country: 'India',
        isDefault,
      });
      // Reset form
      setName('');
      setPhone('');
      setAddressLine('');
      setCity('');
      setState('');
      setPincode('');
      setIsDefault(false);
      setErrors({});
      onClose();
    } catch (e: any) {
      setErrors({ form: e.response?.data?.message || e.message || 'Failed to save address' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] shadow-2xl border-t border-slate-100 dark:border-slate-800">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              Add Delivery Address
            </Text>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
            >
              <X size={18} className="text-slate-600 dark:text-slate-300" />
            </Pressable>
          </View>

          {/* Form Scroll Area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          >
            {errors.form && (
              <View className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                <Text className="text-red-600 dark:text-red-400 text-sm font-medium">
                  {errors.form}
                </Text>
              </View>
            )}

            {/* Name */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Full Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                placeholderTextColor="#94a3b8"
                className={`h-12 px-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium ${
                  errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.name && <Text className="text-xs text-red-500 mt-1">{errors.name}</Text>}
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Mobile Number (10 digits) *
              </Text>
              <View
                className={`h-12 flex-row items-center rounded-xl border bg-slate-50 dark:bg-slate-800/60 ${
                  errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Text className="pl-4 pr-2 font-semibold text-slate-500 dark:text-slate-400">
                  +91
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  placeholder="9876543210"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 h-full pr-4 text-slate-900 dark:text-white font-medium"
                />
              </View>
              {errors.phone && <Text className="text-xs text-red-500 mt-1">{errors.phone}</Text>}
            </View>

            {/* Street Address */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Street Address / House No. *
              </Text>
              <TextInput
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="Flat / Building / Road / Area"
                placeholderTextColor="#94a3b8"
                className={`h-12 px-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium ${
                  errors.addressLine ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.addressLine && (
                <Text className="text-xs text-red-500 mt-1">{errors.addressLine}</Text>
              )}
            </View>

            {/* City & State (Two column) */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  City *
                </Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Chennai"
                  placeholderTextColor="#94a3b8"
                  className={`h-12 px-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium ${
                    errors.city ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {errors.city && <Text className="text-xs text-red-500 mt-1">{errors.city}</Text>}
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  State *
                </Text>
                <TextInput
                  value={state}
                  onChangeText={setState}
                  placeholder="e.g. Tamil Nadu"
                  placeholderTextColor="#94a3b8"
                  className={`h-12 px-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium ${
                    errors.state ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {errors.state && <Text className="text-xs text-red-500 mt-1">{errors.state}</Text>}
              </View>
            </View>

            {/* Pincode & Country */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Pincode (6 digits) *
                </Text>
                <TextInput
                  value={pincode}
                  onChangeText={(val) => setPincode(val.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  placeholder="600001"
                  placeholderTextColor="#94a3b8"
                  className={`h-12 px-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium ${
                    errors.pincode ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {errors.pincode && (
                  <Text className="text-xs text-red-500 mt-1">{errors.pincode}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Country
                </Text>
                <View className="h-12 px-4 justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <Text className="text-slate-600 dark:text-slate-300 font-medium">India</Text>
                </View>
              </View>
            </View>

            {/* Set as Default Switch */}
            <Pressable
              onPress={() => setIsDefault(!isDefault)}
              className="flex-row items-center mb-8"
            >
              <View
                className={`w-6 h-6 rounded-md items-center justify-center mr-3 border ${
                  isDefault
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                {isDefault && <Check size={14} color="white" />}
              </View>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Set as default delivery address
              </Text>
            </Pressable>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={isLoading}
              className="w-full h-14 bg-indigo-600 rounded-2xl items-center justify-center active:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Save Address</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
