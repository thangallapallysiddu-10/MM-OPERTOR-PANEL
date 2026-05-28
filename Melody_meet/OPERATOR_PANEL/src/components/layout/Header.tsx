import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function Header({ onMenuPress, title }: { onMenuPress: () => void; title: string }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-black">
      <TouchableOpacity onPress={onMenuPress} className="p-2">
        <Feather name="menu" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text className="text-base font-semibold text-white">{title}</Text>
      <View className="w-10" />
    </View>
  );
}
