import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { ChevronDown, X, Check } from 'lucide-react-native';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  options: DropdownOption[];
  selectedValue?: string;
  onSelect: (value: string | undefined) => void;
  placeholder?: string;
}

export const DropdownSelect = ({
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option'
}: DropdownSelectProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(o => o.value === selectedValue);

  const handleSelect = (val?: string) => {
    onSelect(val);
    setModalVisible(false);
  };

  return (
    <View>
      <Pressable
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-between border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2.5 w-full"
      >
        <Text className="text-slate-700 dark:text-slate-200 text-sm flex-1" numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={16} className="text-slate-500" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          className="flex-1 justify-center bg-black/40 px-4" 
          onPress={() => setModalVisible(false)}
        >
          <Pressable 
            className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden max-h-[70%]"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <Text className="font-bold text-lg text-slate-800 dark:text-white">{placeholder}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} className="text-slate-500" />
              </Pressable>
            </View>

            <FlatList
              data={[{ value: undefined as any, label: placeholder }, ...options]}
              keyExtractor={(item, index) => item.value ? String(item.value) : `placeholder-${index}`}
              renderItem={({ item }) => {
                const isActive = item.value === selectedValue;
                return (
                  <Pressable
                    onPress={() => handleSelect(item.value)}
                    className={`flex-row items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800 ${
                      isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <Text className={`text-base ${isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.label}
                    </Text>
                    {isActive && <Check size={18} className="text-blue-600 dark:text-blue-400" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
