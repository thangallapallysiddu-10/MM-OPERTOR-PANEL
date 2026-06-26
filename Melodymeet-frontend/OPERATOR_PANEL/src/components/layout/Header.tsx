import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface HeaderProps {
  onMenuPress: () => void;
  title: string;
  isDarkMode?: boolean;
}

export default function Header({ onMenuPress, title, isDarkMode = false }: HeaderProps) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#E2E8F0',
    }}>
      <TouchableOpacity
        onPress={onMenuPress}
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          backgroundColor: isDarkMode ? '#263347' : '#F1F5F9',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Feather name="menu" size={18} color={isDarkMode ? '#94A3B8' : '#475569'} />
      </TouchableOpacity>

      <Text style={{
        fontSize: 15,
        fontWeight: '600',
        color: isDarkMode ? '#F1F5F9' : '#0F172A',
        letterSpacing: -0.2,
      }}>
        {title}
      </Text>

      {/* Right spacer to center the title */}
      <View style={{ width: 36 }} />
    </View>
  );
}
